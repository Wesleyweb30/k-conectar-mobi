import Link from "next/link";
import {
  getAllProduttivoTickets,
  getProduttivoAttachmentProxyUrl,
  getProduttivoTicketAppUrl,
} from "@/service/produttivo.service";

const BASE_PATH = "/admin/produttivo/chamados";
const PER_PAGE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    title?: string;
    category?: string;
    onlyDuplicated?: string;
    onlyOverdue?: string;
    parada?: string;
    date?: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function normalizeDateKey(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalTodayKey() {
  return normalizeDateKey(new Date()) ?? "";
}

type PriorityKey =
  | "urgent24"
  | "immediate48"
  | "preventive20"
  | "maintenance30"
  | "medium60"
  | "low90"
  | "all";

const PRIORITY_OPTIONS: Array<{ key: PriorityKey; label: string }> = [
  { key: "urgent24", label: "Urgente (24h)" },
  { key: "immediate48", label: "Imediato/Corretiva (48h)" },
  { key: "preventive20", label: "Preventivo (20 Dias)" },
  { key: "maintenance30", label: "Manutenção (30 dias)" },
  { key: "medium60", label: "Prioridade Média (60 dias)" },
  { key: "low90", label: "Prioridade Baixa (90 dias)" },
  { key: "all", label: "Todas as prioridades" },
];

function normalizePriority(value?: string): PriorityKey {
  const valid: PriorityKey[] = ["urgent24", "immediate48", "preventive20", "maintenance30", "medium60", "low90", "all"];
  return valid.includes(value as PriorityKey) ? (value as PriorityKey) : "all";
}

function getTicketAgeDays(value?: string | null) {
  if (!value) return null;
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return null;
  const now = Date.now();
  return (now - createdAt) / (1000 * 60 * 60 * 24);
}

function matchesPriority(ageDays: number | null, priority: PriorityKey) {
  if (priority === "all") return true;
  if (ageDays === null) return false;

  if (priority === "urgent24") return ageDays <= 1;
  if (priority === "immediate48") return ageDays > 1 && ageDays <= 2;
  if (priority === "preventive20") return ageDays > 2 && ageDays <= 20;
  if (priority === "maintenance30") return ageDays > 20 && ageDays <= 30;
  if (priority === "medium60") return ageDays > 30 && ageDays <= 60;
  if (priority === "low90") return ageDays > 60 && ageDays <= 90;

  return true;
}

function getPriorityDeadlineDays(priority: PriorityKey) {
  if (priority === "urgent24") return 1;
  if (priority === "immediate48") return 2;
  if (priority === "preventive20") return 20;
  if (priority === "maintenance30") return 30;
  if (priority === "medium60") return 60;
  if (priority === "low90") return 90;
  return null;
}

function getPriorityDeadlineLabel(priority: PriorityKey) {
  if (priority === "urgent24") return "24h";
  if (priority === "immediate48") return "48h";
  if (priority === "preventive20") return "20 dias";
  if (priority === "maintenance30") return "30 dias";
  if (priority === "medium60") return "60 dias";
  if (priority === "low90") return "90 dias";
  return null;
}

function normalizeCategoryText(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPriorityFromCategory(category?: string | null): PriorityKey {
  const text = normalizeCategoryText(category);

  if (text.includes("urg")) return "urgent24";
  if (text.includes("corret") || text.includes("imediat")) return "immediate48";
  if (text.includes("prevent")) return "preventive20";
  if (text.includes("manut")) return "maintenance30";
  if (text.includes("media")) return "medium60";
  if (text.includes("baixa")) return "low90";

  return "all";
}

function formatCategoryWithDeadline(category?: string | null) {
  const value = category?.trim() ?? "";
  if (!value) return "Sem categoria";

  const priority = getPriorityFromCategory(value);
  const suffix = getPriorityDeadlineLabel(priority);
  if (!suffix) return value;

  return `${value} (${suffix})`;
}

function getDeadlineStatus(createdAt?: string | null, priority?: PriorityKey) {
  if (!priority || priority === "all") return null;
  const limitDays = getPriorityDeadlineDays(priority);
  if (!limitDays) return null;

  const ageDays = getTicketAgeDays(createdAt);
  if (ageDays === null) return null;

  const daysLeft = limitDays - ageDays;

  if (daysLeft < 0) {
    const overdueDays = Math.floor(Math.abs(daysLeft));
    return {
      state: "overdue" as const,
      daysLeft: 0,
      overdueDays,
      label: `Atrasado ha ${overdueDays} dia(s)`,
      bannerLabel: `Este chamado esta com atraso de ${overdueDays} dia(s) - solicite resposta da equipe de campo`,
      badgeClass: "border-rose-300 bg-rose-100 text-rose-800",
      bannerClass: "border-rose-200 bg-rose-50 text-rose-800",
    };
  }

  const remaining = Math.ceil(daysLeft);

  if (remaining <= 7) {
    return {
      state: "warning" as const,
      daysLeft: remaining,
      overdueDays: 0,
      label: remaining <= 0 ? "Prazo no limite hoje" : `Vence em ${remaining} dia(s)`,
      bannerLabel: remaining <= 0
        ? "Prazo no limite hoje - acione a equipe de campo imediatamente"
        : `Falta ${remaining} dia(s) para encerrar o prazo - atencao redobrada`,
      badgeClass: "border-amber-300 bg-amber-100 text-amber-800",
      bannerClass: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    state: "info" as const,
    daysLeft: remaining,
    overdueDays: 0,
    label: `Falta ${remaining} dia(s)`,
    bannerLabel: `Falta ${remaining} dia(s) para encerrar o prazo`,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    bannerClass: "border-sky-200 bg-sky-50 text-sky-700",
  };
}

function categoryBadgeClass(category?: string | null) {
  const text = (category ?? "").toLocaleLowerCase("pt-BR");

  if (text.includes("urg")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (text.includes("corret") || text.includes("imediat")) return "border-orange-200 bg-orange-50 text-orange-700";
  if (text.includes("prevent")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (text.includes("manut")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (text.includes("media")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (text.includes("baixa")) return "border-slate-200 bg-slate-100 text-slate-700";

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function statusBadge(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "in_progress") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "denied") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "pending") return "Pendente";
  if (normalized === "in_progress") return "Em andamento";
  if (normalized === "done") return "Concluido";
  if (normalized === "denied") return "Negado";
  return status || "Sem status";
}

function buildHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const result = query.toString();
  return result ? `${BASE_PATH}?${result}` : BASE_PATH;
}

function buildPageHref(page: number, params: Record<string, string>) {
  return buildHref({ ...params, page: String(page) });
}

export default async function ProduttivoChamadosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedPage = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const selectedTitle = params.title?.trim() ?? "";
  const selectedCategory = params.category ?? "";
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

  let filteredTickets = sortedTickets;

  if (selectedTitle) {
    const normalizedTitle = selectedTitle.toLocaleLowerCase("pt-BR");
    filteredTickets = filteredTickets.filter((ticket) => {
      const title = ticket.title?.toLocaleLowerCase("pt-BR") ?? "";
      const description = ticket.description?.toLocaleLowerCase("pt-BR") ?? "";
      return title.includes(normalizedTitle) || description.includes(normalizedTitle);
    });
  }

  if (selectedCategory) {
    filteredTickets = filteredTickets.filter(
      (ticket) => ticket.ticket_category_name === selectedCategory
    );
  }

  if (selectedDate) {
    filteredTickets = filteredTickets.filter(
      (ticket) => normalizeDateKey(ticket.created_at) === selectedDate
    );
  }

  const paradaCount = filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
    const parada = ticket.resource_place_name?.trim();
    if (!parada) return acc;
    acc[parada] = (acc[parada] ?? 0) + 1;
    return acc;
  }, {});

  const duplicatedParadas = Object.entries(paradaCount)
    .filter(([, count]) => count > 1)
    .map(([parada]) => parada)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (onlyDuplicated) {
    filteredTickets = filteredTickets.filter((ticket) => {
      const parada = ticket.resource_place_name?.trim();
      return parada ? paradaCount[parada] > 1 : false;
    });
  }

  if (selectedParada) {
    filteredTickets = filteredTickets.filter((ticket) => {
      const parada = ticket.resource_place_name?.trim() ?? "";
      return parada === selectedParada;
    });
  }

  if (onlyOverdue) {
    filteredTickets = filteredTickets.filter((ticket) => {
      const ticketPriority = getPriorityFromCategory(ticket.ticket_category_name);
      const deadlineStatus = getDeadlineStatus(ticket.created_at, ticketPriority);
      const status = (ticket.status ?? "").toLowerCase();
      const isFinalized = status === "done" || status === "denied";
      return deadlineStatus?.state === "overdue" && !isFinalized;
    });
  }

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

  const totalFiltered = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const pagedTickets = filteredTickets.slice(start, start + PER_PAGE);

  const preserveParams: Record<string, string> = {};
  if (selectedTitle) preserveParams.title = selectedTitle;
  if (selectedCategory) preserveParams.category = selectedCategory;
  if (onlyDuplicated) preserveParams.onlyDuplicated = "1";
  if (onlyOverdue) preserveParams.onlyOverdue = "1";
  if (selectedParada) preserveParams.parada = selectedParada;
  if (selectedDate) preserveParams.date = selectedDate;

  const activeFilterCount = [selectedTitle, selectedCategory, selectedParada, selectedDate, onlyDuplicated ? "1" : "", onlyOverdue ? "1" : ""]
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
                  href={buildHref({
                    ...(selectedTitle ? { title: selectedTitle } : {}),
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
                {selectedDate && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                    {formatShortDate(selectedDate)}
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
                            href={buildHref({
                              ...(selectedTitle ? { title: selectedTitle } : {}),
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
                href={buildHref({
                  ...(selectedTitle ? { title: selectedTitle } : {}),
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
                            <img
                              src={imageHref}
                              alt={ticket.title || `Chamado ${ticket.id}`}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
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
                            <img
                              src={imageHref}
                              alt={ticket.title || `Chamado ${ticket.id}`}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
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
            href={buildPageHref(Math.max(1, currentPage - 1), preserveParams)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              currentPage <= 1
                ? "pointer-events-none border-slate-200 text-slate-400"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildPageHref(Math.min(totalPages, currentPage + 1), preserveParams)}
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
