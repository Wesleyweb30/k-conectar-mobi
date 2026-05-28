import {
  getPriorityDeadlineLabel,
  getPriorityFromCategory,
  getTicketAgeDays,
  type TicketPriorityKey,
} from "@/lib/ticket-priority";
import type { ProduttivoTicket } from "@/types/produttivo";

export type ProduttivoChamadosFilters = {
  title?: string;
  ped?: string;
  category?: string;
  issue?: string;
  onlyDuplicated?: boolean;
  onlyOverdue?: boolean;
  parada?: string;
  date?: string;
};

export const ISSUE_SIGNAL_DEFINITIONS = [
  {
    key: "sem-equipamento",
    label: "Sem equipamento",
    accentClass: "border-rose-200 bg-rose-50 text-rose-800",
    terms: ["sem equipamento", "sem abrigo", "sem cobertura", "ausencia de equipamento"],
  },
  {
    key: "estrutura-avariada",
    label: "Estrutura avariada",
    accentClass: "border-amber-200 bg-amber-50 text-amber-800",
    terms: ["quebrado", "danificado", "avariado", "estrutura", "vandalismo", "quebra"],
  },
  {
    key: "limpeza-pichacao",
    label: "Limpeza ou pichacao",
    accentClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    terms: ["pichacao", "pixacao", "sujo", "limpeza", "sujeira", "lavagem"],
  },
  {
    key: "iluminacao",
    label: "Iluminacao",
    accentClass: "border-sky-200 bg-sky-50 text-sky-800",
    terms: ["iluminacao", "lampada", "luminaria", "escuro", "energia", "eletrica"],
  },
] as const;

export const OTHER_ISSUE_SIGNAL = {
  key: "outros",
  label: "Outros problemas",
  accentClass: "border-slate-200 bg-slate-100 text-slate-800",
} as const;

export type ProduttivoIssueSignalKey =
  | typeof ISSUE_SIGNAL_DEFINITIONS[number]["key"]
  | typeof OTHER_ISSUE_SIGNAL.key;

export function normalizePedInput(value?: string | null) {
  if (!value) return "";
  return value.replace(/\D/g, "").trim();
}

export function extractTicketPed(ticket: { resource_place_name?: string | null }) {
  return normalizePedInput(ticket.resource_place_name);
}

export function ticketMatchesPed(
  ticket: { resource_place_name?: string | null; title?: string | null; description?: string | null },
  ped: string,
) {
  const sources = [ticket.resource_place_name, ticket.title, ticket.description];
  return sources.some((source) => {
    if (!source) return false;
    return source.replace(/\D/g, "").includes(ped);
  });
}

export function formatCategoryWithDeadline(category?: string | null) {
  const value = category?.trim() ?? "";
  if (!value) return "Sem categoria";

  const priority = getPriorityFromCategory(value);
  const suffix = getPriorityDeadlineLabel(priority);
  if (!suffix) return value;

  return `${value} (${suffix})`;
}

export function getDeadlineStatus(createdAt?: string | null, priority?: TicketPriorityKey) {
  if (!priority || priority === "all") return null;

  const ageDays = getTicketAgeDays(createdAt);
  if (ageDays === null) return null;

  const limitLabel = getPriorityDeadlineLabel(priority);
  const limitDaysByPriority: Record<Exclude<TicketPriorityKey, "all">, number | null> = {
    urgente: 7,
    alta: 15,
    media: 30,
    baixa: 90,
  };
  const limitDays = limitDaysByPriority[priority];
  if (!limitDays) return null;

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
      limitLabel,
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
      limitLabel,
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
    limitLabel,
  };
}

export function classifyTicketIssueSignal(ticket: Pick<ProduttivoTicket, "title" | "description" | "ticket_category_name">): ProduttivoIssueSignalKey {
  const haystack = [ticket.title, ticket.description, ticket.ticket_category_name]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");

  const matchedDefinition = ISSUE_SIGNAL_DEFINITIONS.find((definition) =>
    definition.terms.some((term) => haystack.includes(term)),
  );

  return matchedDefinition?.key ?? OTHER_ISSUE_SIGNAL.key;
}

export function isIssueSignalKey(value?: string | null): value is ProduttivoIssueSignalKey {
  if (!value) return false;
  return value === OTHER_ISSUE_SIGNAL.key || ISSUE_SIGNAL_DEFINITIONS.some((definition) => definition.key === value);
}

export function filterProduttivoTickets(
  tickets: ProduttivoTicket[],
  filters: ProduttivoChamadosFilters,
) {
  const selectedTitle = filters.title?.trim() ?? "";
  const selectedPed = normalizePedInput(filters.ped);
  const selectedCategory = filters.category ?? "";
  const selectedIssue = isIssueSignalKey(filters.issue) ? filters.issue : "";
  const onlyDuplicated = filters.onlyDuplicated === true;
  const onlyOverdue = filters.onlyOverdue === true;
  const selectedParada = filters.parada?.trim() ?? "";
  const selectedDate = filters.date ?? "";

  let filteredTickets = tickets;

  if (selectedTitle) {
    const normalizedTitle = selectedTitle.toLocaleLowerCase("pt-BR");
    filteredTickets = filteredTickets.filter((ticket) => {
      const title = ticket.title?.toLocaleLowerCase("pt-BR") ?? "";
      const description = ticket.description?.toLocaleLowerCase("pt-BR") ?? "";
      return title.includes(normalizedTitle) || description.includes(normalizedTitle);
    });
  }

  if (selectedPed) {
    filteredTickets = filteredTickets.filter((ticket) => ticketMatchesPed(ticket, selectedPed));
  }

  if (selectedCategory) {
    filteredTickets = filteredTickets.filter(
      (ticket) => ticket.ticket_category_name === selectedCategory,
    );
  }

  if (selectedDate) {
    filteredTickets = filteredTickets.filter(
      (ticket) => normalizeTicketDateKey(ticket.created_at) === selectedDate,
    );
  }

  if (selectedIssue) {
    filteredTickets = filteredTickets.filter(
      (ticket) => classifyTicketIssueSignal(ticket) === selectedIssue,
    );
  }

  const paradaCount = filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
    const parada = ticket.resource_place_name?.trim();
    if (!parada) return acc;
    acc[parada] = (acc[parada] ?? 0) + 1;
    return acc;
  }, {});

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

  return { filteredTickets, paradaCount };
}

function normalizeTicketDateKey(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}