export type TicketPriorityKey =
  | "urgent24"
  | "immediate48"
  | "preventive20"
  | "maintenance30"
  | "medium60"
  | "low90"
  | "all";

export function normalizeCategoryText(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getPriorityFromCategory(category?: string | null): TicketPriorityKey {
  const text = normalizeCategoryText(category);

  if (text.includes("urg")) return "urgent24";
  if (text.includes("corret") || text.includes("imediat")) return "immediate48";
  if (text.includes("prevent")) return "preventive20";
  if (text.includes("manut")) return "maintenance30";
  if (text.includes("media")) return "medium60";
  if (text.includes("baixa")) return "low90";

  return "all";
}

export function getPriorityDeadlineDays(priority: TicketPriorityKey) {
  if (priority === "urgent24") return 1;
  if (priority === "immediate48") return 2;
  if (priority === "preventive20") return 20;
  if (priority === "maintenance30") return 30;
  if (priority === "medium60") return 60;
  if (priority === "low90") return 90;
  return null;
}

export function getPriorityDeadlineLabel(priority: TicketPriorityKey) {
  if (priority === "urgent24") return "24h";
  if (priority === "immediate48") return "48h";
  if (priority === "preventive20") return "20 dias";
  if (priority === "maintenance30") return "30 dias";
  if (priority === "medium60") return "60 dias";
  if (priority === "low90") return "90 dias";
  return null;
}

export function getTicketAgeDays(value?: string | null) {
  if (!value) return null;
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return null;
  return (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
}

export function categoryBadgeClass(category?: string | null) {
  const text = (category ?? "").toLocaleLowerCase("pt-BR");

  if (text.includes("urg")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (text.includes("corret") || text.includes("imediat")) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (text.includes("prevent")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (text.includes("manut")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (text.includes("media")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (text.includes("baixa")) return "border-slate-200 bg-slate-100 text-slate-700";

  return "border-violet-200 bg-violet-50 text-violet-700";
}

export function statusBadge(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "in_progress") return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "denied") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function statusLabel(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "pending") return "Pendente";
  if (normalized === "in_progress") return "Em andamento";
  if (normalized === "done") return "Concluido";
  if (normalized === "denied") return "Negado";
  return status || "Sem status";
}
