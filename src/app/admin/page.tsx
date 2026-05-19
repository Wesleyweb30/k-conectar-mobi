import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FORM_ID_INSPECAO,
  FORM_ID_IMPLANTACAO,
  FORM_ID_INSTALACAO_ELETRICA,
  FORM_ID_MANUTENCAO,
  getAllProduttivoTickets,
  getProduttivoFormFillCount,
} from "@/service/produttivo.service";
import {
  getPriorityDeadlineDays,
  getPriorityFromCategory,
  getTicketAgeDays,
  type TicketPriorityKey,
} from "@/lib/ticket-priority";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function toApiDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function getDeadlineStatus(createdAt?: string | null, priority?: TicketPriorityKey) {
  if (!priority || priority === "all") return null;
  const limitDays = getPriorityDeadlineDays(priority);
  if (!limitDays) return null;

  const ageDays = getTicketAgeDays(createdAt);
  if (ageDays === null) return null;

  const daysLeft = limitDays - ageDays;

  if (daysLeft < 0) {
    return {
      state: "overdue" as const,
      daysLeft: 0,
    };
  }

  return {
    state: "open" as const,
    daysLeft: Math.ceil(daysLeft),
  };
}

export default async function AdminHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const now = new Date();
  const todayApiDate = toApiDate(now);

  const [
    manutencaoDiaria,
    implantacaoDiaria,
    eletricaDiaria,
    inspecaoDiaria,
    pendingTickets,
    totalParadas,
    paradasSemStatus,
    ultimoUpdateParada,
  ] = await Promise.all([
    getProduttivoFormFillCount({
      startDate: todayApiDate,
      endDate: todayApiDate,
      formId: FORM_ID_MANUTENCAO,
    }).catch(() => 0),
    getProduttivoFormFillCount({
      startDate: todayApiDate,
      endDate: todayApiDate,
      formId: FORM_ID_IMPLANTACAO,
    }).catch(() => 0),
    getProduttivoFormFillCount({
      startDate: todayApiDate,
      endDate: todayApiDate,
      formId: FORM_ID_INSTALACAO_ELETRICA,
    }).catch(() => 0),
    getProduttivoFormFillCount({
      startDate: todayApiDate,
      endDate: todayApiDate,
      formId: FORM_ID_INSPECAO,
    }).catch(() => 0),
    getAllProduttivoTickets(100, "pending").catch(() => []),
    prisma.parada.count(),
    prisma.parada.count({
      where: {
        OR: [
          { status: null },
          { status: "" },
          { status: { contains: "sem inform", mode: "insensitive" } },
        ],
      },
    }),
    prisma.parada.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const totalAtividadesDiarias = manutencaoDiaria + implantacaoDiaria + eletricaDiaria + inspecaoDiaria;

  const ticketWithDeadline = pendingTickets
    .map((ticket) => {
      const priority = getPriorityFromCategory(ticket.ticket_category_name);
      const deadline = getDeadlineStatus(ticket.created_at, priority);
      return { deadline };
    })
    .filter((item) => item.deadline !== null);

  const overdueCount = ticketWithDeadline.filter((item) => item.deadline?.state === "overdue").length;
  const dueSoonCount = ticketWithDeadline.filter(
    (item) => item.deadline?.state === "open" && (item.deadline.daysLeft ?? 999) <= 3
  ).length;
  const onTrackCount = Math.max(pendingTickets.length - overdueCount - dueSoonCount, 0);

  const overduePercent = pendingTickets.length > 0 ? (overdueCount / pendingTickets.length) * 100 : 0;
  const dueSoonPercent = pendingTickets.length > 0 ? (dueSoonCount / pendingTickets.length) * 100 : 0;
  const onTrackPercent = pendingTickets.length > 0 ? (onTrackCount / pendingTickets.length) * 100 : 0;

  const paradasComStatus = Math.max(totalParadas - paradasSemStatus, 0);
  const statusCompletoPercent = totalParadas > 0 ? (paradasComStatus / totalParadas) * 100 : 0;
  const riskScore = Math.round(overduePercent * 0.7 + dueSoonPercent * 0.3);

  return (
    <div className="space-y-6 rounded-3xl bg-gradient-to-b from-slate-50 via-white to-cyan-50/30 p-2">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-slate-100 shadow-[0_20px_45px_-30px_rgba(6,182,212,0.65)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
              Operacao diaria
            </span>
            <h1 className="mt-3 text-3xl font-bold text-white">Painel principal</h1>
            <p className="mt-2 text-sm text-slate-200">
              Bem-vindo, {session?.user.name}. Esta tela mostra somente o essencial do dia para
              acompanhar execucao e chamados.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Ultima atualizacao de paradas</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {ultimoUpdateParada?.updatedAt
                ? ultimoUpdateParada.updatedAt.toLocaleString("pt-BR")
                : "Sem registros"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
        <Link
          href="/admin/produttivo/chamados"
          className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md xl:col-span-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-rose-700">Chamados diarios</p>
            <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              prioridade
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold leading-none text-rose-900">{formatNumber(pendingTickets.length)}</p>
          <p className="mt-2 text-xs font-medium text-rose-800">Pendentes no backlog atual</p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-lg border border-rose-200 bg-rose-100/70 px-2 py-1 font-semibold text-rose-800">
              {formatNumber(overdueCount)} atrasados
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-100/70 px-2 py-1 font-semibold text-amber-800">
              {formatNumber(dueSoonCount)} vencendo em ate 3 dias
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100">
            <div className="flex h-full overflow-hidden rounded-full">
              <div className="h-full bg-rose-500" style={{ width: `${overduePercent}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${dueSoonPercent}%` }} />
              <div className="h-full bg-emerald-500" style={{ width: `${onTrackPercent}%` }} />
            </div>
          </div>
        </Link>

        <Link
          href="/admin/produttivo/manutencao"
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100/80 xl:col-span-2"
        >
          <p className="text-xs uppercase tracking-wide text-amber-700">Manutencao diaria</p>
          <p className="mt-2 text-3xl font-bold leading-none text-amber-900">{formatNumber(manutencaoDiaria)}</p>
        </Link>

        <Link
          href="/admin/produttivo/implantacao"
          className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100/80 xl:col-span-2"
        >
          <p className="text-xs uppercase tracking-wide text-sky-700">Implantacao diaria</p>
          <p className="mt-2 text-3xl font-bold leading-none text-sky-900">{formatNumber(implantacaoDiaria)}</p>
        </Link>

        <Link
          href="/admin/produttivo/instalacao-eletrica"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100/80 xl:col-span-2"
        >
          <p className="text-xs uppercase tracking-wide text-emerald-700">Eletrica diaria</p>
          <p className="mt-2 text-3xl font-bold leading-none text-emerald-900">{formatNumber(eletricaDiaria)}</p>
        </Link>

        <Link
          href="/admin/produttivo/inspecao"
          className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-100/80 xl:col-span-2"
        >
          <p className="text-xs uppercase tracking-wide text-indigo-700">Inspecao diaria</p>
          <p className="mt-2 text-3xl font-bold leading-none text-indigo-900">{formatNumber(inspecaoDiaria)}</p>
        </Link>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-5 shadow-sm xl:col-span-12">
          <p className="text-xs uppercase tracking-wide text-violet-700">Total de operacoes do dia</p>
          <p className="mt-2 text-3xl font-bold leading-none text-violet-900">{formatNumber(totalAtividadesDiarias)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Paradas</h2>
            <p className="mt-1 text-sm text-slate-600">Resumo rapido de qualidade cadastral.</p>
          </div>
          <Link
            href="/paradas"
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Abrir paradas
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Paradas totais</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{formatNumber(totalParadas)}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-rose-700">Sem status</p>
            <p className="mt-1 text-xl font-semibold text-rose-900">{formatNumber(paradasSemStatus)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Com status</p>
            <p className="mt-1 text-xl font-semibold text-emerald-900">{formatNumber(paradasComStatus)}</p>
            <p className="mt-1 text-xs text-emerald-800">{formatPercent(statusCompletoPercent)} preenchido</p>
          </div>
        </div>
      </section>
    </div>
  );
}
