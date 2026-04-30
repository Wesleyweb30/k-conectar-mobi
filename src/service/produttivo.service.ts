import type {
    ProduttivoAccountMember,
    ProduttivoInspectionFill,
    ProduttivoListResponse,
    ProduttivoManutencaoItem,
    ProduttivoTicket,
    ProduttivoWork,
} from "@/types/produttivo";
import { extractPedFromTitle } from "@/lib/ped-extraction";
export { extractPedFromTitle } from "@/lib/ped-extraction";

export const FORM_ID_MANUTENCAO = 356263;
export const FORM_ID_IMPLANTACAO = 485100;
export const FORM_ID_INSTALACAO_ELETRICA = 443660;

type ProduttivoQueryParams = {
    startDate?: string;
    endDate?: string;
    userId?: number;
    formId?: number;
    page?: number;
    perPage?: number;
};

const INSPECAO_ENDPOINT =
    "form_fills?order_type=desc&form_fill%5Bproject_ids%5D%5B%5D=251329&actives=true&account_id=166569";

const PRODUTTIVO_TIMEOUT_MS = 15000;
const PRODUTTIVO_MAX_RETRIES = 2;
const PRODUTTIVO_RETRY_BASE_DELAY_MS = 300;
const TICKETS_PAGE_CONCURRENCY = 4;
const WORK_FETCH_CONCURRENCY = 8;

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

async function runWithConcurrency<TItem, TResult>(
    items: TItem[],
    concurrency: number,
    worker: (item: TItem, index: number) => Promise<TResult>
): Promise<TResult[]> {
    if (items.length === 0) return [];

    const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
    const results = new Array<TResult>(items.length);
    let cursor = 0;

    const runners = Array.from({ length: safeConcurrency }, async () => {
        while (true) {
            const currentIndex = cursor;
            cursor += 1;

            if (currentIndex >= items.length) return;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(runners);
    return results;
}

export function getProduttivoAuthHeaders(): Record<string, string> {
    return {
        accept: "application/json",
        "X-Auth-Login": process.env.PRODUTTIVO_LOGIN || "",
        "X-Auth-Register": process.env.PRODUTTIVO_REGISTER || "",
        "X-Auth-Token": process.env.PRODUTTIVO_TOKEN || "",
    };
}

export async function produttivoGet<T>(endpoint: string): Promise<T> {
    const url = `${process.env.PRODUTTIVO_BASE_URL}/${endpoint}`;

    let lastError: unknown;

    for (let attempt = 0; attempt <= PRODUTTIVO_MAX_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PRODUTTIVO_TIMEOUT_MS);

        try {
            const res = await fetch(url, {
                headers: getProduttivoAuthHeaders(),
                next: { revalidate: 60 },
                signal: controller.signal,
            });

            if (!res.ok) {
                if (attempt < PRODUTTIVO_MAX_RETRIES && shouldRetryStatus(res.status)) {
                    await wait(PRODUTTIVO_RETRY_BASE_DELAY_MS * (attempt + 1));
                    continue;
                }
                throw new Error(`Erro ao buscar dados do produttivo (status ${res.status})`);
            }

            const data = (await res.json()) as T;
            return data;
        } catch (error) {
            lastError = error;
            const isAbortError =
                typeof error === "object" &&
                error !== null &&
                "name" in error &&
                (error as { name?: string }).name === "AbortError";

            if (attempt < PRODUTTIVO_MAX_RETRIES && isAbortError) {
                await wait(PRODUTTIVO_RETRY_BASE_DELAY_MS * (attempt + 1));
                continue;
            }

            if (attempt >= PRODUTTIVO_MAX_RETRIES) {
                break;
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    console.error("Erro inesperado ao consultar o Produttivo:", lastError);
    throw lastError instanceof Error ? lastError : new Error("Falha ao consultar o Produttivo");
}

export async function getProduttivoFormFillsManutencao(
    params?: ProduttivoQueryParams
): Promise<ProduttivoListResponse<ProduttivoManutencaoItem>> {
    const { startDate, endDate, userId, formId, page, perPage } = params || {};
    const range = `${startDate} - ${endDate}`;
    const safePage = page && page > 0 ? page : 1;
    const safePerPage = perPage && perPage > 0 ? perPage : 20;

    return produttivoGet<ProduttivoListResponse<ProduttivoManutencaoItem>>(
        `form_fills?order_type=desc&range_time=${encodeURIComponent(range)}&form_fill[form_ids][]=${formId}&form_fill[user_ids][]=${userId ?? ""}&form_fill[is_valid]=true&page=${safePage}&per_page=${safePerPage}`
    );
}

export function getProduttivoInspectionFills(params?: Pick<ProduttivoQueryParams, "page" | "perPage">) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const perPage = params?.perPage && params.perPage > 0 ? params.perPage : 20;

    return produttivoGet<ProduttivoListResponse<ProduttivoInspectionFill>>(
        `${INSPECAO_ENDPOINT}&page=${page}&per_page=${perPage}`
    );
}

export function getProduttivoWork(id: number) {
    return produttivoGet<ProduttivoWork>(`works/${id}`);
}

export function getProduttivoFormFill(id: number) {
    return produttivoGet<Record<string, unknown>>(`form_fills/${id}`);
}

export async function getProduttivoFormFillCount(params: {
    startDate: string;
    endDate: string;
    formId: number;
    userId?: number;
}): Promise<number> {
    const { startDate, endDate, formId, userId } = params;
    const range = `${startDate} - ${endDate}`;
    const userPart = userId ? `&form_fill[user_ids][]=${userId}` : "";
    const data = await produttivoGet<ProduttivoListResponse<ProduttivoManutencaoItem>>(
        `form_fills?order_type=desc&range_time=${encodeURIComponent(range)}&form_fill[form_ids][]=${formId}${userPart}&page=1&per_page=1`
    );
    return data.meta?.count ?? 0;
}

export function getProduttivoAccountMembers() {
    return produttivoGet<ProduttivoListResponse<ProduttivoAccountMember>>("account_members?per_page=100");
}

/** Busca works de uma lista de IDs e retorna mapa work_id → PED */
export async function getPedMapForItems(
    items: { work_id?: number | null }[]
): Promise<Record<number, string>> {
    const ids = [...new Set(items.map((i) => i.work_id).filter((id): id is number => !!id))];
    if (ids.length === 0) return {};
    const works = await runWithConcurrency(ids, WORK_FETCH_CONCURRENCY, async (id) =>
        getProduttivoWork(id).catch(() => null)
    );
    const map: Record<number, string> = {};
    works.forEach((w) => {
        if (!w) return;
        const ped = extractPedFromTitle(w.title);
        if (ped) map[w.id] = ped;
    });
    return map;
}

export function getProduttivoFormFills(params: {
    formId: number;
    startDate?: string; // DD/MM/YYYY
    endDate?: string;   // DD/MM/YYYY
    userId?: number;
    page?: number;
    perPage?: number;
}): Promise<ProduttivoListResponse<ProduttivoManutencaoItem>> {
    const { formId, startDate, endDate, userId, page = 1, perPage = 20 } = params;
    const safePage = page > 0 ? page : 1;
    const safePerPage = perPage > 0 ? perPage : 20;

    let endpoint = `form_fills?order_type=desc&form_fill[form_ids][]=${formId}&page=${safePage}&per_page=${safePerPage}`;

    if (startDate && endDate) {
        const range = `${startDate} - ${endDate}`;
        endpoint += `&range_time=${encodeURIComponent(range)}`;
    }
    if (userId) {
        endpoint += `&form_fill[user_ids][]=${userId}`;
    }

    return produttivoGet<ProduttivoListResponse<ProduttivoManutencaoItem>>(endpoint);
}

/** Busca works pelo codigo PED (titulo ou numero) */
export function searchWorksByPed(ped: string) {
    return produttivoGet<ProduttivoListResponse<ProduttivoWork>>(
        `works?q=${encodeURIComponent(ped)}&include_team_works=true&per_page=20`,
    );
}

export function getProduttivoTickets(params?: {
    page?: number;
    perPage?: number;
    status?: string;
}): Promise<ProduttivoListResponse<ProduttivoTicket>> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const perPage = params?.perPage && params.perPage > 0 ? params.perPage : 30;

    let endpoint = `tickets?order_type=desc&page=${page}&per_page=${perPage}`;
    if (params?.status) {
        endpoint += `&statuses[]=${encodeURIComponent(params.status)}`;
    }

    return produttivoGet<ProduttivoListResponse<ProduttivoTicket>>(endpoint);
}

export async function getAllProduttivoTickets(perPage = 100, status?: string): Promise<ProduttivoTicket[]> {
    const firstPage = await getProduttivoTickets({ page: 1, perPage, status });
    const totalPages = firstPage.meta?.total_pages ?? 1;
    const firstResults = firstPage.results ?? [];

    if (totalPages <= 1) {
        return firstResults;
    }

    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
    const remainingPages = await runWithConcurrency(
        pageNumbers,
        TICKETS_PAGE_CONCURRENCY,
        async (pageNumber) =>
            getProduttivoTickets({ page: pageNumber, perPage, status }).catch(() => ({ results: [] }))
    );

    return [
        ...firstResults,
        ...remainingPages.flatMap((page) => page.results ?? []),
    ];
}

export function getProduttivoTicket(id: number): Promise<ProduttivoTicket> {
    return produttivoGet<ProduttivoTicket>(`tickets/${id}`);
}

export function getProduttivoAppBaseUrl(): string {
    return process.env.PRODUTTIVO_APP_URL || "https://app.produttivo.com.br";
}

export function getProduttivoTicketAppUrl(id: number): string {
    return `${getProduttivoAppBaseUrl()}/tickets/${id}`;
}

export function getProduttivoAttachmentUrl(fileUrl?: string | null): string | null {
    if (!fileUrl) return null;
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    return `${getProduttivoAppBaseUrl()}${fileUrl}`;
}

export function getProduttivoAttachmentProxyUrl(fileUrl?: string | null): string | null {
    if (!fileUrl) return null;
    return `/api/produttivo/attachment?fileUrl=${encodeURIComponent(fileUrl)}`;
}
