import { Suspense } from "react";
import Link from "next/link";
import {
  FORM_ID_IMPLANTACAO,
  getProduttivoAccountMembers,
  getProduttivoFormFillCount,
  getProduttivoFormFills,
  getWorkMetaMapForItems,
} from "@/service/produttivo.service";
import ProduttivoListFilters from "@/components/admin/produttivo-list-filters";
import ProduttivoFillList from "@/components/admin/produttivo-fill-list";

const BASE_PATH = "/admin/produttivo/implantacao";
const PER_PAGE = 20;

type PageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    page?: string;
    pedSearch?: string;
    executorSearch?: string;
    workStatus?: string;
    quickMissingSignature?: string;
    quickAdesivoIrregular?: string;
  }>;
};

/** Converte YYYY-MM-DD → DD/MM/YYYY */
function toApiDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function normalizeWorkStatus(value?: string | null): string {
  return (value ?? "").toLowerCase().trim();
}

/** Retorna intervalo DD/MM/YYYY + label para um mês relativo ao mês atual */
function getMonthRange(now: Date, offset: number) {
  const year = now.getFullYear();
  const month = now.getMonth() - offset;
  const date = new Date(year, month, 1);
  const y = date.getFullYear();
  const mo = date.getMonth();
  const lastDay = new Date(y, mo + 1, 0).getDate();
  const mm = String(mo + 1).padStart(2, "0");
  return {
    start: `01/${mm}/${y}`,
    end: `${lastDay}/${mm}/${y}`,
    label: date.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export default async function ImplantacaoPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawStart = params.startDate ?? "";
  const rawEnd = params.endDate ?? "";
  const userId = params.userId ? parseInt(params.userId, 10) : undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const pedSearch = params.pedSearch ?? "";
  const executorSearch = params.executorSearch ?? "";
  const workStatusFilter =
    params.workStatus === "finished" || params.workStatus === "started"
      ? params.workStatus
      : "all";
  const quickMissingSignature = params.quickMissingSignature === "1";
  const quickAdesivoIrregular = params.quickAdesivoIrregular === "1";
  const hasGlobalFilters = !!(
    pedSearch
    || executorSearch
    || workStatusFilter !== "all"
    || quickMissingSignature
    || quickAdesivoIrregular
  );

  const apiStart = rawStart ? toApiDate(rawStart) : undefined;
  const apiEnd = rawEnd ? toApiDate(rawEnd) : undefined;

  const now = new Date();
  const monthRanges = [0, 1, 2].map((offset) => getMonthRange(now, offset));

  const [response, membersResponse, ...monthCounts] = await Promise.all([
    getProduttivoFormFills({
      formId: FORM_ID_IMPLANTACAO,
      startDate: apiStart,
      endDate: apiEnd,
      userId,
      page: hasGlobalFilters ? 1 : page,
      perPage: hasGlobalFilters ? 200 : PER_PAGE,
    }),
    getProduttivoAccountMembers().catch(() => ({ results: [] })),
    ...monthRanges.map((m) =>
      getProduttivoFormFillCount({
        formId: FORM_ID_IMPLANTACAO,
        startDate: m.start,
        endDate: m.end,
        userId,
      })
    ),
  ]);

  const totalPagesFromApi = response.meta?.total_pages ?? 1;
  const extraPages =
    hasGlobalFilters && totalPagesFromApi > 1
      ? await Promise.all(
        Array.from({ length: totalPagesFromApi - 1 }, (_, index) => index + 2).map((apiPage) =>
          getProduttivoFormFills({
            formId: FORM_ID_IMPLANTACAO,
            startDate: apiStart,
            endDate: apiEnd,
            userId,
            page: apiPage,
            perPage: 200,
          }).catch(() => ({ results: [] })),
        ),
      )
      : [];

  let items = hasGlobalFilters
    ? [
      ...(response.results ?? []),
      ...extraPages.flatMap((pageResponse) => pageResponse.results ?? []),
    ]
    : (response.results ?? []);
  const total = response.meta?.count ?? 0;
  const members = membersResponse.results ?? [];

  const workMetaMap = await getWorkMetaMapForItems(items);
  const pedMap = Object.fromEntries(
    Object.entries(workMetaMap).map(([workId, meta]) => [Number(workId), meta.ped]),
  );
  const workStatusMap = Object.fromEntries(
    Object.entries(workMetaMap).map(([workId, meta]) => [Number(workId), meta.status ?? null]),
  ) as Record<number, string | null>;

  // Filtragem server-side para buscas globais (opera sobre todos os registros buscados)
  if (pedSearch) {
    const q = pedSearch.toLowerCase();
    items = items.filter((item) => {
      if (String(item.document_number ?? "").toLowerCase().includes(q)) return true;
      if (item.work_id && (pedMap[item.work_id] ?? "").toLowerCase().includes(q)) return true;
      const atividade = item.field_values.find((fv) => fv.name?.toLowerCase().includes("atividade"));
      const raw = Array.isArray(atividade?.value) ? atividade.value[0] : atividade?.value;
      if (String(raw ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }

  if (executorSearch) {
    const q = executorSearch.toLowerCase();
    items = items.filter((item) => {
      const executorField = item.field_values.find((fv) => fv.name?.toLowerCase().includes("executor"));
      const raw = Array.isArray(executorField?.value) ? executorField.value[0] : executorField?.value;
      return String(raw ?? "").toLowerCase().includes(q);
    });
  }

  if (workStatusFilter !== "all") {
    const normalizedFilter = normalizeWorkStatus(workStatusFilter);
    items = items.filter((item) => {
      const status = item.work_id ? normalizeWorkStatus(workStatusMap[item.work_id]) : "";
      return status === normalizedFilter;
    });
  }

  const filteredTotal = items.length;
  const filteredTotalPages = Math.max(1, Math.ceil(filteredTotal / PER_PAGE));
  const filteredPage = Math.min(page, filteredTotalPages);
  const filteredStart = (filteredPage - 1) * PER_PAGE;
  const pagedFilteredItems = items.slice(filteredStart, filteredStart + PER_PAGE);
  const showAllForQuickOrStatus =
    workStatusFilter !== "all"
    || quickMissingSignature
    || quickAdesivoIrregular;

  const listItems = showAllForQuickOrStatus
    ? items
    : hasGlobalFilters
      ? pagedFilteredItems
      : items;
  const displayTotal = hasGlobalFilters ? filteredTotal : total;
  const listPage = showAllForQuickOrStatus
    ? 1
    : hasGlobalFilters
      ? filteredPage
      : page;

  const monthData = monthRanges.map((m, i) => ({
    label: m.label,
    count: monthCounts[i] as number,
  }));
  const maxCount = Math.max(...monthData.map((d) => d.count), 1);

  // Params para preservar na paginação
  const preserveParams: Record<string, string> = {};
  if (rawStart) preserveParams.startDate = rawStart;
  if (rawEnd) preserveParams.endDate = rawEnd;
  if (params.userId) preserveParams.userId = params.userId;
  if (pedSearch) preserveParams.pedSearch = pedSearch;
  if (executorSearch) preserveParams.executorSearch = executorSearch;
  if (workStatusFilter !== "all") preserveParams.workStatus = workStatusFilter;
  if (quickMissingSignature) preserveParams.quickMissingSignature = "1";
  if (quickAdesivoIrregular) preserveParams.quickAdesivoIrregular = "1";

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/40 to-blue-50/20 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/produttivo"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                ← Analytics Produttivo
              </Link>
            </div>
            <span className="mt-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              Implantação
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Registros de Implantação</h1>
            <p className="mt-1 text-sm text-slate-600">
              Lista completa dos formulários de implantação preenchidos no Produttivo.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-sky-700">Total de registros</p>
            <p className="text-2xl font-bold text-sky-900">{total}</p>
          </div>
        </div>
      </div>

      {/* Comparativo 3 meses */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Comparativo mensal — Implantação</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            3 meses
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {monthData.map((item, idx) => {
            const percent = (item.count / maxCount) * 100;
            return (
              <div
                key={item.label}
                className={`rounded-xl border px-4 py-3 ${
                  idx === 0 ? "border-sky-200 bg-sky-50/40" : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-800">{item.label}</p>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                        mês atual
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-slate-900">{item.count}</p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${percent.toFixed(1)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[11px] text-slate-500">
                  {percent.toFixed(1)}% do maior volume
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <Suspense>
        <ProduttivoListFilters basePath={BASE_PATH} members={members} showSearchFields />
      </Suspense>

      {/* Aviso de filtro ativo */}
      {(rawStart || rawEnd || userId || pedSearch || executorSearch || workStatusFilter !== "all") && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-2 text-sm text-sky-700">
          Filtrando por:{" "}
          {rawStart && rawEnd && (
            <strong>{rawStart.split("-").reverse().join("/")} → {rawEnd.split("-").reverse().join("/")}</strong>
          )}
          {userId && (
            <>
              {" · "}
              <strong>Técnico #{userId}</strong>
            </>
          )}
          {pedSearch && (
            <>
              {" · "}
              <strong>PED: &quot;{pedSearch}&quot;</strong>
            </>
          )}
          {executorSearch && (
            <>
              {" · "}
              <strong>Executor: &quot;{executorSearch}&quot;</strong>
            </>
          )}
          {workStatusFilter !== "all" && (
            <>
              {" · "}
              <strong>Work: {workStatusFilter === "finished" ? "Finalizada" : "Em andamento"}</strong>
            </>
          )}
          {hasGlobalFilters && (
            <span className="ml-2 rounded-full bg-sky-200 px-2 py-0.5 text-[11px] font-semibold">
              {displayTotal} resultado{displayTotal !== 1 ? "s" : ""} encontrado{displayTotal !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      <ProduttivoFillList
        items={listItems}
        total={displayTotal}
        page={listPage}
        basePath={BASE_PATH}
        preserveParams={preserveParams}
        accentColor="sky"
        pedMap={pedMap}
        workStatusMap={workStatusMap}
        initialWorkStatusFilter={workStatusFilter}
        initialMissingSignature={quickMissingSignature}
        initialMissingAdesivo={quickAdesivoIrregular}
        disablePagination={showAllForQuickOrStatus}
        idLabel="PED"
        preferFieldActivityId
        useLabelOnFallback
        variant="feed"
        showImages
      />
    </div>
  );
}
