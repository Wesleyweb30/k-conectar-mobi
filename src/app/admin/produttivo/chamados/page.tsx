import Link from "next/link";
import Image from "next/image";
import {
  getAllProduttivoTickets,
  getProduttivoAttachmentProxyUrl,
  getProduttivoTicketAppUrl,
} from "@/service/produttivo.service";
import { formatShortDate, normalizeDateKey } from "@/lib/date-formatting";
import {
  categoryBadgeClass,
  getPriorityFromCategory,
  getTicketAgeDays,
  statusBadge,
  statusLabel,
} from "@/lib/ticket-priority";
import { buildHref } from "@/lib/url-search-params";
import GoToRoutesButton from "@/components/parada/go-to-routes-button";
import {
  classifyTicketIssueSignal,
  extractTicketPed,
  filterProduttivoTickets,
  formatCategoryWithDeadline,
  getDeadlineStatus,
  isIssueSignalKey,
  ISSUE_SIGNAL_DEFINITIONS,
  normalizePedInput,
  OTHER_ISSUE_SIGNAL,
} from "@/lib/produttivo-ticket-filters";

const BASE_PATH = "/admin/produttivo/chamados";
const PER_PAGE = 12;

function formatIssuePercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value > 0 && value < 1 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value);
}

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    title?: string;
    ped?: string;
    category?: string;
    issue?: string;
    onlyDuplicated?: string;
    onlyOverdue?: string;
    parada?: string;
    date?: string;
  }>;
};

export default async function ProduttivoChamadosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedPage = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const selectedTitle = params.title?.trim() ?? "";
  const selectedPed = normalizePedInput(params.ped);
  const selectedCategory = params.category ?? "";
  const selectedIssue = isIssueSignalKey(params.issue) ? params.issue : "";
  const onlyDuplicated = params.onlyDuplicated === "1";
  const onlyOverdue = params.onlyOverdue === "1";
  const selectedParada = params.parada?.trim() ?? "";
  const selectedDate = params.date ?? "";

  const allTickets = await getAllProduttivoTickets(100, "pending");
  const sortedTickets = [...allTickets].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const categories = [...new Set(
    sortedTickets
      .map((ticket) => ticket.ticket_category_name?.trim())
      .filter((value): value is string => Boolean(value))
  )].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const { filteredTickets, paradaCount } = filterProduttivoTickets(sortedTickets, {
    title: selectedTitle,
    ped: selectedPed,
    category: selectedCategory,
    issue: selectedIssue,
    onlyDuplicated,
    onlyOverdue,
    parada: selectedParada,
    date: selectedDate,
  });

  const duplicatedParadas = Object.entries(paradaCount)
    .filter(([, count]) => count > 1)
    .map(([parada]) => parada)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const routePedCodes = Array.from(
    new Set(
      filteredTickets
        .map((ticket) => extractTicketPed(ticket))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const routeSelectionItems = routePedCodes.map((codigo) => ({ codigo }));
  const routeButtonHref = "/paradas/rotas?page=1";

  const overdueInList = filteredTickets.filter((ticket) => {
    const ticketPriority = getPriorityFromCategory(ticket.ticket_category_name);
    const ds = getDeadlineStatus(ticket.created_at, ticketPriority);
    const status = (ticket.status ?? "").toLowerCase();
    const isFinalized = status === "done" || status === "denied";
    return ds?.state === "overdue" && !isFinalized;
  }).length;

  const warningInList = filteredTickets.filter((ticket) => {
    const ticketPriority = getPriorityFromCategory(ticket.ticket_category_name);
    const ds = getDeadlineStatus(ticket.created_at, ticketPriority);
    const status = (ticket.status ?? "").toLowerCase();
    const isFinalized = status === "done" || status === "denied";
    return ds?.state === "warning" && !isFinalized;
  }).length;

  const categoryCountMap = filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
    const cat = ticket.ticket_category_name?.trim() ?? "Sem categoria";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const issueCountMap = ISSUE_SIGNAL_DEFINITIONS.reduce<Record<string, number>>((acc, definition) => {
    acc[definition.key] = 0;
    return acc;
  }, {});
  let otherIssuesCount = 0;

  filteredTickets.forEach((ticket) => {
    const issueKey = classifyTicketIssueSignal(ticket);

    if (issueKey !== OTHER_ISSUE_SIGNAL.key) {
      issueCountMap[issueKey] += 1;
      return;
    }

    otherIssuesCount += 1;
  });

  const classifiedIssueSummaries = ISSUE_SIGNAL_DEFINITIONS.map((definition) => ({
    ...definition,
    count: issueCountMap[definition.key] ?? 0,
  }));

  if (otherIssuesCount > 0) {
    classifiedIssueSummaries.push({
      ...OTHER_ISSUE_SIGNAL,
      count: otherIssuesCount,
    });
  }

  const topIssueSummaries = classifiedIssueSummaries
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"))
    .filter((item) => item.count > 0)
    .slice(0, 5);

  const topCategories = Object.entries(categoryCountMap)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 5);

  const totalFiltered = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const pagedTickets = filteredTickets.slice(start, start + PER_PAGE);

  const preserveParams: Record<string, string> = {};
  if (selectedTitle) preserveParams.title = selectedTitle;
  if (selectedPed) preserveParams.ped = selectedPed;
  if (selectedCategory) preserveParams.category = selectedCategory;
  if (selectedIssue) preserveParams.issue = selectedIssue;
  if (onlyDuplicated) preserveParams.onlyDuplicated = "1";
  if (onlyOverdue) preserveParams.onlyOverdue = "1";
  if (selectedParada) preserveParams.parada = selectedParada;
  if (selectedDate) preserveParams.date = selectedDate;
  const exportHref = buildHref("/api/admin/produttivo/chamados/export", preserveParams);

  const activeFilterCount = [selectedTitle, selectedPed, selectedCategory, selectedIssue, selectedParada, selectedDate, onlyDuplicated ? "1" : "", onlyOverdue ? "1" : ""]
    .filter(Boolean)
    .length;
  const showCompactDuplicatedPanel = duplicatedParadas.length > 9;
  const usePostGrid = onlyDuplicated || Boolean(selectedParada);
  const compactCards = !usePostGrid;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/admin/produttivo"
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Analytics Produttivo
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Chamados do Produttivo
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Acompanhe os chamados pendentes e encontre rapidamente o que precisa de atencao.
              </p>
            </div>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Filtrados</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalFiltered}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{allTickets.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-1 col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Duplicadas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{duplicatedParadas.length}</p>
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
                <p className="mt-0.5 text-sm text-slate-500">Use os campos abaixo para refinar a lista.</p>
              </div>
              {selectedParada && (
                <Link
                  href={buildHref(BASE_PATH, {
                    ...(selectedTitle ? { title: selectedTitle } : {}),
                    ...(selectedPed ? { ped: selectedPed } : {}),
                    ...(selectedCategory ? { category: selectedCategory } : {}),
                    ...(onlyDuplicated ? { onlyDuplicated: "1" } : {}),
                    ...(onlyOverdue ? { onlyOverdue: "1" } : {}),
                    ...(selectedDate ? { date: selectedDate } : {}),
                  })}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Limpar parada
                </Link>
              )}
            </div>

            <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" method="get">
              <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titulo</span>
                <input
                  type="text"
                  name="title"
                  defaultValue={selectedTitle}
                  placeholder="Ex.: sem equipamento"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">PED</span>
                <input
                  type="text"
                  name="ped"
                  defaultValue={selectedPed}
                  inputMode="numeric"
                  placeholder="Ex.: 110246"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300"
                />
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</span>
                <select
                  name="category"
                  defaultValue={selectedCategory}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-300"
                >
                  <option value="">Todas</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{formatCategoryWithDeadline(category)}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data</span>
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-rose-300"
                />
              </label>

              <div className="sm:col-span-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="onlyDuplicated"
                    value="1"
                    defaultChecked={onlyDuplicated}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                  />
                  Exibir somente paradas com chamados duplicados
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="onlyOverdue"
                    value="1"
                    defaultChecked={onlyOverdue}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                  />
                  Exibir somente chamados atrasados
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {routePedCodes.length > 0 ? (
                    <GoToRoutesButton
                      href={routeButtonHref}
                      items={routeSelectionItems}
                      label="Enviar PEDs para rotas"
                    />
                  ) : (
                    <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400">
                      Nenhum PED encontrado para enviar a rotas
                    </span>
                  )}
                  <Link
                    href={exportHref}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Exportar Chamado Para Excel
                  </Link>
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
                  {routePedCodes.length > 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      {routePedCodes.length} PED(s) enviado(s) para processamento em rotas
                    </span>
                  )}
                </div>
              </div>
            </form>

            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {activeFilterCount} filtro(s) ativo(s)
                </span>
                {selectedTitle && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                    &ldquo;{selectedTitle}&rdquo;
                  </span>
                )}
                {selectedCategory && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryBadgeClass(selectedCategory)}`}>
                    {formatCategoryWithDeadline(selectedCategory)}
                  </span>
                )}
                {selectedPed && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                    PED: {selectedPed}
                  </span>
                )}
                {selectedDate && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                    {formatShortDate(selectedDate)}
                  </span>
                )}
                {selectedIssue && (
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                    {classifiedIssueSummaries.find((item) => item.key === selectedIssue)?.label ?? "Informativo"}
                  </span>
                )}
                {selectedParada && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {selectedParada}
                  </span>
                )}
                {onlyOverdue && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
                    Somente atrasados
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Atalhos rapidos</h2>
              <p className="mt-0.5 text-sm text-slate-500">Clique em uma categoria ou faixa de prazo para filtrar a listagem.</p>
            </div>

            <div className="mt-4 space-y-4">
              {Object.keys(categoryCountMap).length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Categorias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(categoryCountMap)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => {
                        const isActive = selectedCategory === cat;
                        return (
                          <Link
                            key={cat}
                            href={buildHref(BASE_PATH, {
                              ...(selectedTitle ? { title: selectedTitle } : {}),
                              ...(selectedPed ? { ped: selectedPed } : {}),
                              ...(onlyDuplicated ? { onlyDuplicated: "1" } : {}),
                              ...(onlyOverdue ? { onlyOverdue: "1" } : {}),
                              ...(selectedParada ? { parada: selectedParada } : {}),
                              ...(selectedDate ? { date: selectedDate } : {}),
                              ...(!isActive ? { category: cat } : {}),
                            })}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 ${categoryBadgeClass(cat)} ${isActive ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                          >
                            {formatCategoryWithDeadline(cat)}
                            <span className="rounded-full bg-black/10 px-1 py-0.5 text-[10px] font-bold">{count}</span>
                            {isActive && <span className="text-[10px] opacity-60">✕</span>}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(overdueInList > 0 || warningInList > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap gap-2 text-sm">
            {overdueInList > 0 && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-800">
                {overdueInList} com atraso
              </span>
            )}
            {warningInList > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-800">
                {warningInList} vencendo em ate 7 dias
              </span>
            )}
          </div>
        </section>
      )}

      {filteredTickets.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Informativos da lista</h2>
              <p className="mt-1 text-sm text-slate-500">
                Leitura rapida dos principais problemas encontrados nos chamados filtrados.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Base atual: {filteredTickets.length} chamado(s)
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {topIssueSummaries.length > 0 ? topIssueSummaries.map((issue) => {
                const percent = totalFiltered > 0 ? (issue.count / totalFiltered) * 100 : 0;
                const isActive = selectedIssue === issue.key;
                return (
                  <Link
                    key={issue.key}
                    href={buildHref(BASE_PATH, {
                      ...(selectedTitle ? { title: selectedTitle } : {}),
                      ...(selectedPed ? { ped: selectedPed } : {}),
                      ...(selectedCategory ? { category: selectedCategory } : {}),
                      ...(onlyDuplicated ? { onlyDuplicated: "1" } : {}),
                      ...(onlyOverdue ? { onlyOverdue: "1" } : {}),
                      ...(selectedParada ? { parada: selectedParada } : {}),
                      ...(selectedDate ? { date: selectedDate } : {}),
                      ...(!isActive ? { issue: issue.key } : {}),
                    })}
                    className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${isActive ? "border-slate-900 bg-slate-100 ring-2 ring-slate-300" : "border-slate-200 bg-slate-50"}`}
                  >
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${issue.accentClass}`}>
                      {issue.label}
                    </span>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{issue.count}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatIssuePercent(percent)}% da lista atual</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isActive ? "Clique para remover o filtro" : "Clique para filtrar os chamados"}
                    </p>
                  </Link>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2 2xl:col-span-4">
                  Nenhum problema recorrente foi detectado automaticamente pelos textos dos chamados atuais.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,0.9))] p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Categorias mais frequentes</h3>
                <div className="flex items-center gap-2">
                  {selectedIssue && (
                    <Link
                      href={buildHref(BASE_PATH, {
                        ...(selectedTitle ? { title: selectedTitle } : {}),
                        ...(selectedPed ? { ped: selectedPed } : {}),
                        ...(selectedCategory ? { category: selectedCategory } : {}),
                        ...(onlyDuplicated ? { onlyDuplicated: "1" } : {}),
                        ...(onlyOverdue ? { onlyOverdue: "1" } : {}),
                        ...(selectedParada ? { parada: selectedParada } : {}),
                        ...(selectedDate ? { date: selectedDate } : {}),
                      })}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Limpar informativo
                    </Link>
                  )}
                  <span className="text-xs font-medium text-slate-500">Top 5</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {topCategories.map(([category, count]) => {
                  const width = totalFiltered > 0 ? Math.max(10, Math.round((count / totalFiltered) * 100)) : 0;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{formatCategoryWithDeadline(category)}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-slate-700" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {onlyDuplicated && duplicatedParadas.length > 0 && (
        <section className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,247,237,0.92))] p-5 shadow-[0_18px_40px_-34px_rgba(245,158,11,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-amber-900">Paradas duplicadas encontradas</h2>
              <p className="mt-1 text-sm text-amber-800">Clique em uma parada para ver apenas os chamados duplicados dela.</p>
            </div>
            <span className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800">
              {duplicatedParadas.length} parada(s)
            </span>
          </div>

          <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${showCompactDuplicatedPanel ? "max-h-[340px] overflow-y-auto pr-1" : ""}`}>
            {duplicatedParadas.map((parada) => (
              <Link
                key={parada}
                href={buildHref(BASE_PATH, {
                  ...(selectedTitle ? { title: selectedTitle } : {}),
                  ...(selectedPed ? { ped: selectedPed } : {}),
                  ...(selectedCategory ? { category: selectedCategory } : {}),
                  onlyDuplicated: "1",
                  ...(onlyOverdue ? { onlyOverdue: "1" } : {}),
                  parada,
                  ...(selectedDate ? { date: selectedDate } : {}),
                })}
                className={`rounded-2xl border px-4 py-3 transition ${
                  selectedParada === parada
                    ? "border-amber-300 bg-amber-100"
                    : "border-amber-200 bg-white/80 hover:bg-amber-100/60"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Parada</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{parada}</p>
                <p className="mt-2 text-sm text-slate-600">{paradaCount[parada]} chamado(s) duplicado(s)</p>
              </Link>
            ))}
          </div>

          {showCompactDuplicatedPanel && (
            <p className="mt-3 text-xs font-medium text-amber-800">
              Lista compactada para reduzir a altura da página. Role esta área para ver todas as paradas duplicadas.
            </p>
          )}
        </section>
      )}

      <div className={usePostGrid ? "grid grid-cols-1 gap-6 xl:grid-cols-2" : "mx-auto max-w-4xl space-y-4"}>
        {pagedTickets.map((ticket) => {
          const fileUrl = ticket.attachments?.[0]?.file_url;
          const imageHref = getProduttivoAttachmentProxyUrl(fileUrl);
          const ticketAppUrl = getProduttivoTicketAppUrl(ticket.id);
          const paradaTotal = ticket.resource_place_name ? paradaCount[ticket.resource_place_name] ?? 0 : 0;
          const ticketPriority = getPriorityFromCategory(ticket.ticket_category_name);
          const deadlineStatus = getDeadlineStatus(ticket.created_at, ticketPriority);
          const ticketStatus = (ticket.status ?? "").toLowerCase();
          const isFinalized = ticketStatus === "done" || ticketStatus === "denied";
          const showDeadlineBadge = Boolean(deadlineStatus) && !isFinalized;
          const ticketLabel = ticket.ticket_number ? `Chamado #${ticket.ticket_number}` : `Chamado #${ticket.id}`;
          const rawAgeDays = getTicketAgeDays(ticket.created_at);
          const ageLabel = rawAgeDays !== null
            ? rawAgeDays < 1 ? "ha menos de 1 dia"
            : rawAgeDays < 2 ? "ha 1 dia"
            : `ha ${Math.floor(rawAgeDays)} dias`
            : null;

          return (
            <article
              key={ticket.id}
              className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-38px_rgba(15,23,42,0.45)]"
            >
              {showDeadlineBadge && (
                <div className={`h-1 ${
                  deadlineStatus?.state === "overdue" ? "bg-gradient-to-r from-rose-500 to-rose-400" :
                  deadlineStatus?.state === "warning" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                  "bg-gradient-to-r from-sky-400 to-sky-300"
                }`} />
              )}
              <div className={compactCards ? "p-3.5 sm:p-4" : "p-4 sm:p-5 md:p-6"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Ticket #{ticket.ticket_number ?? ticket.id}
                    </p>
                    <h3
                      className={`mt-2 block max-w-3xl font-semibold leading-tight text-slate-900 ${compactCards ? "text-base sm:text-lg" : "text-lg sm:text-xl md:text-2xl"}`}
                    >
                      {ticket.title || "Sem titulo"}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(ticket.status)}`}>
                      {statusLabel(ticket.status)}
                    </span>
                    {showDeadlineBadge && deadlineStatus?.state === "info" && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${deadlineStatus.badgeClass}`}>
                        {deadlineStatus.label}
                      </span>
                    )}
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryBadgeClass(ticket.ticket_category_name)}`}>
                      {ticket.ticket_category_name || "Sem categoria"}
                    </span>
                    {showDeadlineBadge && deadlineStatus?.state !== "info" && (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${deadlineStatus?.badgeClass}`}>
                        {deadlineStatus?.label}
                      </span>
                    )}
                    {paradaTotal > 1 && ticket.resource_place_name && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Duplicada em {paradaTotal} chamados
                      </span>
                    )}
                  </div>
                </div>

                {showDeadlineBadge && (
                  <div className={`mt-3 flex items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm font-medium ${deadlineStatus?.bannerClass}`}>
                    <span className="mt-0.5 shrink-0 text-base leading-none">
                      {deadlineStatus?.state === "overdue" ? "🔴" : deadlineStatus?.state === "warning" ? "🟠" : "🔵"}
                    </span>
                    <span>
                      <strong>{ticketLabel}</strong> — {deadlineStatus?.bannerLabel}
                    </span>
                  </div>
                )}

                {compactCards ? (
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,rgba(251,113,133,0.12),rgba(251,146,60,0.12))]">
                      <div className="relative min-h-[130px] sm:min-h-[170px]">
                        {imageHref ? (
                          <>
                            <Image
                              src={imageHref}
                              alt={ticket.title || `Chamado ${ticket.id}`}
                              fill
                              sizes="(max-width: 768px) 100vw, 220px"
                              unoptimized
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/40 to-transparent" />
                          </>
                        ) : (
                          <div className="flex h-full min-h-[130px] items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_35%),linear-gradient(160deg,rgba(255,241,242,1),rgba(255,247,237,1))] p-4 text-center sm:min-h-[170px]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Sem imagem</p>
                              <p className="mt-2 text-xs text-slate-500">Sem anexo visual.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/65 px-3.5 py-3">
                        <p className="text-[13px] leading-5.5 text-slate-700 sm:text-sm sm:leading-6">
                          {ticket.description || "Sem descricao informada."}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                          {ticket.resource_place_name || "Sem parada"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                          {ticket.author_name || "Sem autor"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                          {formatShortDate(ticket.created_at)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 sm:text-xs">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                          {ticket.attachments?.length ?? 0} anexo(s)
                        </span>
                        {ageLabel && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                            {ageLabel}
                          </span>
                        )}
                        <Link
                          href={ticketAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Abrir no Produttivo
                        </Link>
                        {imageHref && (
                          <a
                            href={imageHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Abrir foto
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(251,113,133,0.12),rgba(251,146,60,0.12))]">
                      <div className="relative min-h-[220px] sm:min-h-[280px]">
                        {imageHref ? (
                          <>
                            <Image
                              src={imageHref}
                              alt={ticket.title || `Chamado ${ticket.id}`}
                              fill
                              sizes="(max-width: 768px) 100vw, 1200px"
                              unoptimized
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/50 to-transparent" />
                          </>
                        ) : (
                          <div className="flex h-full min-h-[220px] items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_35%),linear-gradient(160deg,rgba(255,241,242,1),rgba(255,247,237,1))] p-6 text-center sm:min-h-[280px]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Sem imagem</p>
                              <p className="mt-3 text-sm text-slate-500">Esse chamado nao possui anexo visual no primeiro arquivo.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/65 px-4 py-4">
                      <p className="text-sm leading-6 text-slate-700 sm:leading-7">
                        {ticket.description || "Sem descricao informada."}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                        {ticket.resource_place_name || "Sem parada"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                        {ticket.author_name || "Sem autor"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
                        {formatShortDate(ticket.created_at)}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 sm:text-xs">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                        {ticket.attachments?.length ?? 0} anexo(s)
                      </span>
                      {ageLabel && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                          {ageLabel}
                        </span>
                      )}
                      <Link
                        href={ticketAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Abrir no Produttivo
                      </Link>
                      {imageHref && (
                        <a
                          href={imageHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-100"
                        >
                          Abrir foto
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}

        {pagedTickets.length === 0 && (
          <div className={`rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm ${usePostGrid ? "xl:col-span-2" : ""}`}>
            Nenhum chamado encontrado para os filtros escolhidos.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-600">
          Pagina {currentPage} de {totalPages} · {totalFiltered} item(ns) no total
        </p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Exibindo {pagedTickets.length} de {totalFiltered}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={buildHref(BASE_PATH, preserveParams, Math.max(1, currentPage - 1))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              currentPage <= 1
                ? "pointer-events-none border-slate-200 text-slate-400"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildHref(BASE_PATH, preserveParams, Math.min(totalPages, currentPage + 1))}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              currentPage >= totalPages
                ? "pointer-events-none border-slate-200 text-slate-400"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Proxima
          </Link>
        </div>
      </div>
    </div>
  );
}
