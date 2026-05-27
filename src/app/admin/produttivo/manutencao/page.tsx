import Link from "next/link";
import {
  FORM_ID_MANUTENCAO,
  getProduttivoAccountMembers,
  getProduttivoFormFillCount,
  getProduttivoFormFills,
  getWorkMetaMapForItems,
} from "@/service/produttivo.service";
import ProduttivoFillList from "@/components/admin/produttivo-fill-list";
import { buildHref } from "@/lib/url-search-params";
import GoToRoutesButton from "@/components/parada/go-to-routes-button";
import { extractPedFromFieldValues } from "@/lib/ped-extraction";

const BASE_PATH = "/admin/produttivo/manutencao";
const PER_PAGE = 20;

type PageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    page?: string;
    todayOnly?: string;
    pedSearch?: string;
    serviceSearch?: string;
    executorSearch?: string;
    workStatus?: string;
    quickMissingSignature?: string;
    quickAdesivoIrregular?: string;
  }>;
};

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizePedSearch(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "").trim();
}

function normalizeWorkStatus(value?: string | null): string {
  return (value ?? "").toLowerCase().trim();
}

function getTodayInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFieldTextByNameIncludes(
  fieldValues: { name?: string | null; value?: string | string[] | null }[],
  nameIncludes: string,
): string {
  const needle = normalizeText(nameIncludes);
  const field = fieldValues.find((fieldValue) => normalizeText(fieldValue.name).includes(needle));
  if (!field) return "";
  if (Array.isArray(field.value)) return field.value.join(" ");
  return String(field.value ?? "");
}

function toApiDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function toInputDate(date: string): string {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

function getMonthRange(now: Date, offset: number) {
  const year = now.getFullYear();
  const month = now.getMonth() - offset;
  const date = new Date(year, month, 1);
  const y = date.getFullYear();
  const m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const mm = String(m + 1).padStart(2, "0");

  return {
    start: `01/${mm}/${y}`,
    end: `${lastDay}/${mm}/${y}`,
    label: date.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export default async function ManutencaoPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawStart = params.startDate ?? "";
  const rawEnd = params.endDate ?? "";
  const userId = params.userId ? parseInt(params.userId, 10) : undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const todayOnly = params.todayOnly === "1";
  const pedSearch = params.pedSearch?.trim() ?? "";
  const serviceSearch = params.serviceSearch?.trim() ?? "";
  const executorSearch = params.executorSearch?.trim() ?? "";
  const workStatusFilter =
    params.workStatus === "finished" || params.workStatus === "started"
      ? params.workStatus
      : "all";
  const quickMissingSignature = params.quickMissingSignature === "1";
  const quickAdesivoIrregular = params.quickAdesivoIrregular === "1";

  const todayDate = getTodayInputDate();
  const effectiveStart = todayOnly ? todayDate : rawStart;
  const effectiveEnd = todayOnly ? todayDate : rawEnd;

  const apiStart = effectiveStart ? toApiDate(effectiveStart) : undefined;
  const apiEnd = effectiveEnd ? toApiDate(effectiveEnd) : undefined;
  const hasTextFilters = Boolean(
    pedSearch
    || serviceSearch
    || executorSearch
    || workStatusFilter !== "all"
    || quickMissingSignature
    || quickAdesivoIrregular,
  );
  const queryPage = hasTextFilters ? 1 : page;
  const queryPerPage = hasTextFilters ? 200 : PER_PAGE;

  const now = new Date();
  const monthRanges = [0, 1, 2].map((offset) => getMonthRange(now, offset));

  const [response, membersResponse, ...monthCounts] = await Promise.all([
    getProduttivoFormFills({
      formId: FORM_ID_MANUTENCAO,
      startDate: apiStart,
      endDate: apiEnd,
      userId,
      page: queryPage,
      perPage: queryPerPage,
    }),
    getProduttivoAccountMembers().catch(() => ({ results: [] })),
    ...monthRanges.map((month) =>
      getProduttivoFormFillCount({
        formId: FORM_ID_MANUTENCAO,
        startDate: month.start,
        endDate: month.end,
        userId,
      }),
    ),
  ]);

  const total = response.meta?.count ?? 0;
  const members = membersResponse.results ?? [];

  const totalPagesFromApi = response.meta?.total_pages ?? 1;
  const extraPages =
    hasTextFilters && totalPagesFromApi > 1
      ? await Promise.all(
        Array.from({ length: totalPagesFromApi - 1 }, (_, index) => index + 2).map((apiPage) =>
          getProduttivoFormFills({
            formId: FORM_ID_MANUTENCAO,
            startDate: apiStart,
            endDate: apiEnd,
            userId,
            page: apiPage,
            perPage: queryPerPage,
          }).catch(() => ({ results: [] })),
        ),
      )
      : [];

  const allFetchedItems = [
    ...(response.results ?? []),
    ...extraPages.flatMap((pageResponse) => pageResponse.results ?? []),
  ];
  const items = hasTextFilters ? allFetchedItems : (response.results ?? []);

  const normalizedPedSearch = normalizePedSearch(pedSearch);
  const normalizedServiceSearch = normalizeText(serviceSearch);
  const normalizedExecutorSearch = normalizeText(executorSearch);
  const normalizedWorkStatusFilter = normalizeWorkStatus(workStatusFilter);
  const hasLocalTextFilters = Boolean(
    normalizedPedSearch || normalizedServiceSearch || normalizedExecutorSearch || normalizedWorkStatusFilter,
  );
  const workMetaMapForFiltering = hasLocalTextFilters ? await getWorkMetaMapForItems(items) : {};
  const pedMapForFiltering = Object.fromEntries(
    Object.entries(workMetaMapForFiltering).map(([workId, meta]) => [Number(workId), meta.ped]),
  );

  const filteredItems = items.filter((item) => {
    if (normalizedPedSearch) {
      const pedFromWork = item.work_id ? pedMapForFiltering[item.work_id] ?? "" : "";
      const pedFromField = extractPedFromFieldValues(item.field_values) ?? "";
      const pedFromDocument = String(item.document_number ?? "");
      const combinedPed = `${pedFromWork} ${pedFromField} ${pedFromDocument}`;
      if (!normalizePedSearch(combinedPed).includes(normalizedPedSearch)) return false;
    }

    if (normalizedServiceSearch) {
      const serviceValue = normalizeText(
        getFieldTextByNameIncludes(item.field_values, "SERVICO EXECUTADO"),
      );
      if (!serviceValue.includes(normalizedServiceSearch)) return false;
    }

    if (normalizedExecutorSearch) {
      const executorValue = normalizeText(
        getFieldTextByNameIncludes(item.field_values, "EXECUTOR DO SERVICO"),
      );
      if (!executorValue.includes(normalizedExecutorSearch)) return false;
    }

    if (normalizedWorkStatusFilter && normalizedWorkStatusFilter !== "all") {
      const workStatus = item.work_id
        ? normalizeWorkStatus(workMetaMapForFiltering[item.work_id]?.status)
        : "";
      if (workStatus !== normalizedWorkStatusFilter) return false;
    }

    return true;
  });

  const filteredTotal = filteredItems.length;
  const filteredTotalPages = Math.max(1, Math.ceil(filteredTotal / PER_PAGE));
  const filteredPage = Math.min(page, filteredTotalPages);
  const filteredStart = (filteredPage - 1) * PER_PAGE;
  const pagedFilteredItems = filteredItems.slice(filteredStart, filteredStart + PER_PAGE);
  const showAllForQuickOrStatus =
    workStatusFilter !== "all"
    || quickMissingSignature
    || quickAdesivoIrregular;

  const listItems = showAllForQuickOrStatus
    ? filteredItems
    : hasLocalTextFilters
      ? pagedFilteredItems
      : items;
  const listTotal = showAllForQuickOrStatus
    ? filteredTotal
    : hasLocalTextFilters
      ? filteredTotal
      : total;
  const listPage = showAllForQuickOrStatus
    ? 1
    : hasLocalTextFilters
      ? filteredPage
      : page;

  const workMetaMap = hasLocalTextFilters ? workMetaMapForFiltering : await getWorkMetaMapForItems(listItems);
  const pedMap = Object.fromEntries(
    Object.entries(workMetaMap).map(([workId, meta]) => [Number(workId), meta.ped]),
  );
  const workStatusMap = Object.fromEntries(
    Object.entries(workMetaMap).map(([workId, meta]) => [Number(workId), meta.status ?? null]),
  ) as Record<number, string | null>;
  const routePedCodes = Array.from(
    new Set(
      listItems
        .map((item) => {
          const pedFromWork = item.work_id ? pedMap[item.work_id] ?? null : null;
          const pedFromField = extractPedFromFieldValues(item.field_values);
          return (pedFromWork ?? pedFromField ?? "").trim();
        })
        .filter((codigo): codigo is string => Boolean(codigo)),
    ),
  );
  const routeSelectionItems = routePedCodes.map((codigo) => ({ codigo }));
  const routeButtonHref = "/paradas/rotas?page=1";

  const monthData = monthRanges.map((month, index) => ({
    label: month.label,
    count: monthCounts[index] as number,
  }));
  const maxCount = Math.max(...monthData.map((item) => item.count), 1);

  const selectedMember = userId
    ? members.find((member) => member.id === userId)
    : undefined;
  const selectedMemberLabel = selectedMember?.name?.trim()
    || selectedMember?.email?.trim()
    || (userId ? `Tecnico #${userId}` : "");

  const activeFilterCount = [
    effectiveStart,
    effectiveEnd,
    userId ? String(userId) : "",
    todayOnly ? "1" : "",
    pedSearch,
    serviceSearch,
    executorSearch,
  ]
    .filter(Boolean)
    .length;

  const preserveParams: Record<string, string> = {};
  if (rawStart && !todayOnly) preserveParams.startDate = rawStart;
  if (rawEnd && !todayOnly) preserveParams.endDate = rawEnd;
  if (params.userId) preserveParams.userId = params.userId;
  if (todayOnly) preserveParams.todayOnly = "1";
  if (pedSearch) preserveParams.pedSearch = pedSearch;
  if (serviceSearch) preserveParams.serviceSearch = serviceSearch;
  if (executorSearch) preserveParams.executorSearch = executorSearch;
  if (workStatusFilter !== "all") preserveParams.workStatus = workStatusFilter;
  if (quickMissingSignature) preserveParams.quickMissingSignature = "1";
  if (quickAdesivoIrregular) preserveParams.quickAdesivoIrregular = "1";

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/admin/produttivo"
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {"<-"} Analytics Produttivo
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Registros de Manutencao
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Acompanhe os formularios de manutencao com os mesmos atalhos e filtros do painel de chamados.
              </p>
            </div>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Filtrados</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Nesta pagina</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{items.length}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tecnicos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{members.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Filtros principais</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Refine por periodo e tecnico para localizar os registros.
                </p>
              </div>
              {(effectiveStart || effectiveEnd || userId || todayOnly || pedSearch || serviceSearch || executorSearch) && (
                <Link
                  href={BASE_PATH}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Limpar filtros
                </Link>
              )}
            </div>

            <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" method="get">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data inicial</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={effectiveStart}
                  disabled={todayOnly}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data final</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={effectiveEnd}
                  disabled={todayOnly}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tecnico</span>
                <select
                  name="userId"
                  defaultValue={userId ? String(userId) : ""}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-300"
                >
                  <option value="">Todos</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name ?? member.email ?? `ID ${member.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">PED</span>
                <input
                  type="text"
                  name="pedSearch"
                  defaultValue={pedSearch}
                  placeholder="Ex.: 160444"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Servico executado</span>
                <input
                  type="text"
                  name="serviceSearch"
                  defaultValue={serviceSearch}
                  placeholder="Ex.: troca de lampada"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Executor do servico</span>
                <input
                  type="text"
                  name="executorSearch"
                  defaultValue={executorSearch}
                  placeholder="Ex.: joao"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300"
                />
              </label>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="todayOnly"
                    value="1"
                    defaultChecked={todayOnly}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                  />
                  Somente hoje
                </label>
                {routePedCodes.length > 0 ? (
                  <GoToRoutesButton
                    href={routeButtonHref}
                    items={routeSelectionItems}
                    label="Enviar para rotas"
                  />
                ) : (
                  <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400">
                    Nenhum abrigo encontrado para enviar a rotas
                  </span>
                )}
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Filtrar
                </button>
                <Link
                  href={BASE_PATH}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Limpar tudo
                </Link>
                <span className="text-xs font-medium text-slate-500">
                  {listTotal} registro(s) encontrado(s)
                </span>
                {routePedCodes.length > 0 && (
                  <span className="text-xs font-medium text-slate-500">
                    {routePedCodes.length} abrigo(s) enviado(s) para processamento em rotas
                  </span>
                )}
              </div>
            </form>

            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {activeFilterCount} filtro(s) ativo(s)
                </span>
                {effectiveStart && effectiveEnd && !todayOnly && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                    {effectiveStart.split("-").reverse().join("/")} ate {effectiveEnd.split("-").reverse().join("/")}
                  </span>
                )}
                {todayOnly && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Somente registros de hoje
                  </span>
                )}
                {selectedMemberLabel && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {selectedMemberLabel}
                  </span>
                )}
                {pedSearch && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
                    PED: {pedSearch}
                  </span>
                )}
                {serviceSearch && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                    Servico: {serviceSearch}
                  </span>
                )}
                {executorSearch && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                    Executor: {executorSearch}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Atalhos rapidos</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Clique no mes para aplicar o periodo automaticamente.
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {monthData.map((item, idx) => {
                const startDate = toInputDate(monthRanges[idx].start);
                const endDate = toInputDate(monthRanges[idx].end);
                const isActive = rawStart === startDate && rawEnd === endDate;
                const percent = (item.count / maxCount) * 100;

                return (
                  <Link
                    key={item.label}
                    href={buildHref(
                      BASE_PATH,
                      {
                        ...(userId ? { userId: String(userId) } : {}),
                        ...(pedSearch ? { pedSearch } : {}),
                        ...(serviceSearch ? { serviceSearch } : {}),
                        ...(executorSearch ? { executorSearch } : {}),
                        ...(!isActive ? { startDate, endDate } : {}),
                      },
                      1,
                    )}
                    className={`block rounded-xl border px-3 py-2.5 transition ${
                      isActive
                        ? "border-amber-300 bg-amber-50 ring-2 ring-amber-200"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold capitalize text-slate-800">{item.label}</p>
                      <p className="text-base font-bold text-slate-900">{item.count}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percent.toFixed(1)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>

            {(effectiveStart || effectiveEnd) && (
              <Link
                href={buildHref(
                  BASE_PATH,
                  {
                    ...(userId ? { userId: String(userId) } : {}),
                    ...(pedSearch ? { pedSearch } : {}),
                    ...(serviceSearch ? { serviceSearch } : {}),
                    ...(executorSearch ? { executorSearch } : {}),
                  },
                  1,
                )}
                className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Remover periodo
              </Link>
            )}
          </div>
        </div>
      </section>

      {(effectiveStart || effectiveEnd || userId || pedSearch || serviceSearch || executorSearch || todayOnly) && (
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap gap-2 text-sm">
            {(effectiveStart || effectiveEnd) && !todayOnly && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-medium text-indigo-800">
                Periodo personalizado ativo
              </span>
            )}
            {todayOnly && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
                Filtro de hoje ativo
              </span>
            )}
            {selectedMemberLabel && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
                Tecnico filtrado: {selectedMemberLabel}
              </span>
            )}
            {pedSearch && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-800">
                PED filtrado: {pedSearch}
              </span>
            )}
            {serviceSearch && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-800">
                Servico filtrado: {serviceSearch}
              </span>
            )}
            {executorSearch && (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-800">
                Executor filtrado: {executorSearch}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Lista de registros</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {showAllForQuickOrStatus ? "Todos os resultados" : `Pagina ${listPage}`}
          </span>
        </div>

        <ProduttivoFillList
          items={listItems}
          total={listTotal}
          page={listPage}
          basePath={BASE_PATH}
          preserveParams={preserveParams}
          accentColor="amber"
          pedMap={pedMap}
          workStatusMap={workStatusMap}
          initialWorkStatusFilter={workStatusFilter}
          initialMissingSignature={quickMissingSignature}
          initialMissingAdesivo={quickAdesivoIrregular}
          disablePagination={showAllForQuickOrStatus}
          variant="feed"
          showImages
        />
      </section>
    </div>
  );
}
