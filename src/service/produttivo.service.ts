import type {
    ProduttivoAccountMember,
    ProduttivoInspectionFill,
    ProduttivoListResponse,
    ProduttivoManutencaoItem,
    ProduttivoTicket,
    ProduttivoWork,
} from "@/types/produttivo";

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

    try {
        const res = await fetch(url, {
            headers: getProduttivoAuthHeaders(),
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error("Erro ao buscar dados do produttivo");
        }

        const data = (await res.json()) as T;
        return data;
    } catch (error) {
        console.error("Erro inesperado:", error);
        throw error;
    }
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

/** Extrai o número PED do título de um work (ex.: "... > 160444" → "160444") */
export function extractPedFromTitle(title?: string | null): string | null {
    if (!title) return null;
    const text = String(title).trim();
    if (!text) return null;

    const fromArrow = text.match(/>\s*(\d+)\s*$/);
    if (fromArrow) return fromArrow[1];

    if (/^\d+$/.test(text)) return text;

    if (!/[a-zA-Z]/.test(text) && /\d/.test(text)) {
        const digitsOnly = text.replace(/\D/g, "");
        return digitsOnly || null;
    }

    return null;
}

/** Busca works de uma lista de IDs e retorna mapa work_id → PED */
export async function getPedMapForItems(
    items: { work_id?: number | null }[]
): Promise<Record<number, string>> {
    const ids = [...new Set(items.map((i) => i.work_id).filter((id): id is number => !!id))];
    if (ids.length === 0) return {};
    const works = await Promise.all(ids.map((id) => getProduttivoWork(id).catch(() => null)));
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

    const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            getProduttivoTickets({ page: index + 2, perPage, status }).catch(() => ({ results: [] }))
        )
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
