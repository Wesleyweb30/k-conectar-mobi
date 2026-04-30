import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAllProduttivoTickets,
  getProduttivoTicketAppUrl,
} from "@/service/produttivo.service";
import type { ProduttivoTicket } from "@/types/produttivo";
import {
  getPriorityDeadlineDays,
  getPriorityFromCategory,
  getTicketAgeDays,
  type TicketPriorityKey,
} from "@/lib/ticket-priority";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
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
      overdueDays: Math.floor(Math.abs(daysLeft)),
    };
  }

  return {
    state: "open" as const,
    daysLeft: Math.ceil(daysLeft),
    overdueDays: 0,
  };
}

function getTicketHeadline(ticket: ProduttivoTicket) {
  const number = ticket.ticket_number ? `#${ticket.ticket_number}` : `#${ticket.id}`;
  const title = ticket.title?.trim() || "Sem título";
  return `${number} - ${title}`;
}

export default async function AdminHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [
    totalParadas,
    paradasSemCoordenada,
    paradasSemStatus,
    totalUsuarios,
    totalAdmins,
    ultimoUpdateParada,
    pendingTickets,
  ] = await Promise.all([
    prisma.parada.count(),
    prisma.parada.count({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
    }),
    prisma.parada.count({
      where: {
        OR: [
          { status: null },
          { status: "" },
          { status: { contains: "sem inform", mode: "insensitive" } },
        ],
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.parada.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    getAllProduttivoTickets(100, "pending").catch(() => []),
  ]);

  const paradasComCoordenada = Math.max(totalParadas - paradasSemCoordenada, 0);
  const coberturaMapaPercent =
    totalParadas > 0 ? ((paradasComCoordenada / totalParadas) * 100).toFixed(1) : "0.0";

  const ticketWithStatus = pendingTickets
    .map((ticket) => {
      const priority = getPriorityFromCategory(ticket.ticket_category_name);
      const deadline = getDeadlineStatus(ticket.created_at, priority);
      return { ticket, priority, deadline };
    })
    .filter((item) => item.deadline !== null);

  const overdueCount = ticketWithStatus.filter((item) => item.deadline?.state === "overdue").length;
  const dueSoonCount = ticketWithStatus.filter(
    (item) => item.deadline?.state === "open" && (item.deadline.daysLeft ?? 999) <= 3
  ).length;
  const urgentAndImmediateCount = pendingTickets.filter((ticket) => {
    const priority = getPriorityFromCategory(ticket.ticket_category_name);
    return priority === "urgent24" || priority === "immediate48";
  }).length;

  const criticalTickets = ticketWithStatus
    .filter(
      (item) =>
        item.deadline?.state === "overdue" ||
        (item.deadline?.state === "open" && (item.deadline.daysLeft ?? 999) <= 3)
    )
    .sort((a, b) => {
      if (a.deadline?.state === "overdue" && b.deadline?.state !== "overdue") return -1;
      if (a.deadline?.state !== "overdue" && b.deadline?.state === "overdue") return 1;

      if (a.deadline?.state === "overdue" && b.deadline?.state === "overdue") {
        return (b.deadline.overdueDays ?? 0) - (a.deadline.overdueDays ?? 0);
      }

      return (a.deadline?.daysLeft ?? 999) - (b.deadline?.daysLeft ?? 999);
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50/70 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Centro Administrativo
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Home do admin</h1>
            <p className="mt-2 text-sm text-slate-600">
              Bem-vindo, {session?.user.name}. Aqui você centraliza a gestão da operação,
              acessa os relatórios e acompanha a saúde da base de dados.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/analytics"
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
              >
                Abrir analytics de paradas
              </Link>
              <Link
                href="/admin/produttivo"
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
              >
                Abrir analytics produttivo
              </Link>
              <Link
                href="/admin/usuarios"
                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                Gerenciar usuários
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Última atualização de paradas</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {ultimoUpdateParada?.updatedAt
                ? ultimoUpdateParada.updatedAt.toLocaleString("pt-BR")
                : "Sem registros"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Paradas totais</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(totalParadas)}</p>
          <p className="mt-1 text-xs text-slate-500">Registros cadastrados na base.</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Cobertura de mapa</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{coberturaMapaPercent}%</p>
          <p className="mt-1 text-xs text-emerald-800">
            {formatNumber(paradasComCoordenada)} com coordenadas válidas.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-700">Paradas sem status</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{formatNumber(paradasSemStatus)}</p>
          <p className="mt-1 text-xs text-amber-800">Prioridade para revisão cadastral.</p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-700">Usuários ativos</p>
          <p className="mt-1 text-2xl font-semibold text-sky-900">{formatNumber(totalUsuarios)}</p>
          <p className="mt-1 text-xs text-sky-800">
            {formatNumber(totalAdmins)} administradores com acesso.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Atenção da equipe: chamados</h2>
            <p className="mt-1 text-sm text-slate-600">
              Visão rápida para priorizar respostas e evitar estouro de prazo.
            </p>
          </div>

          <Link
            href="/admin/produttivo/chamados"
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Abrir feed de chamados
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pendentes</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(pendingTickets.length)}</p>
            <p className="mt-1 text-xs text-slate-600">Chamados aguardando tratativa da equipe.</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-rose-700">Atrasados</p>
            <p className="mt-1 text-2xl font-semibold text-rose-900">{formatNumber(overdueCount)}</p>
            <p className="mt-1 text-xs text-rose-800">Prioridade máxima para retorno imediato.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-700">Vencem em até 3 dias</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">{formatNumber(dueSoonCount)}</p>
            <p className="mt-1 text-xs text-amber-800">
              {formatNumber(urgentAndImmediateCount)} em categorias Urgente/Imediato.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Chamados críticos para ação</p>
            <Link
              href="/admin/produttivo/chamados?onlyOverdue=1"
              className="text-xs font-semibold text-rose-700 hover:text-rose-800"
            >
              Ver somente atrasados
            </Link>
          </div>

          {criticalTickets.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhum chamado crítico no momento.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {criticalTickets.map(({ ticket, deadline }) => {
                const deadlineText =
                  deadline?.state === "overdue"
                    ? `Atrasado há ${deadline.overdueDays} dia(s)`
                    : `Vence em ${deadline?.daysLeft ?? 0} dia(s)`;

                return (
                  <li key={ticket.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{getTicketHeadline(ticket)}</p>
                        <p className="text-xs text-slate-600">
                          {ticket.ticket_category_name || "Sem categoria"} • {deadlineText}
                        </p>
                      </div>
                      <a
                        href={getProduttivoTicketAppUrl(ticket.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Abrir chamado
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Módulos da administração</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Acesso rápido
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/analytics"
            className="rounded-xl border border-violet-200 bg-violet-50 p-4 transition hover:bg-violet-100"
          >
            <p className="text-sm font-semibold text-violet-900">Analytics de paradas</p>
            <p className="mt-1 text-xs text-violet-800">Indicadores e distribuição de tipologias.</p>
          </Link>

          <Link
            href="/paradas"
            className="rounded-xl border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
          >
            <p className="text-sm font-semibold text-blue-900">Paradas</p>
            <p className="mt-1 text-xs text-blue-800">Consulta operacional com filtros completos.</p>
          </Link>

          <Link
            href="/paradas/rotas"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition hover:bg-emerald-100"
          >
            <p className="text-sm font-semibold text-emerald-900">Rotas</p>
            <p className="mt-1 text-xs text-emerald-800">Visualização geográfica das paradas.</p>
          </Link>

          <Link
            href="/admin/produttivo"
            className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 transition hover:bg-cyan-100"
          >
            <p className="text-sm font-semibold text-cyan-900">Analytics Produttivo</p>
            <p className="mt-1 text-xs text-cyan-800">Acompanhamento de atividades e execução.</p>
          </Link>

          <Link
            href="/admin/produttivo/ligacao-paradas"
            className="rounded-xl border border-teal-200 bg-teal-50 p-4 transition hover:bg-teal-100"
          >
            <p className="text-sm font-semibold text-teal-900">Radar sem manutenção</p>
            <p className="mt-1 text-xs text-teal-800">Identifique paradas com risco de desatualização.</p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="rounded-xl border border-sky-200 bg-sky-50 p-4 transition hover:bg-sky-100"
          >
            <p className="text-sm font-semibold text-sky-900">Usuários</p>
            <p className="mt-1 text-xs text-sky-800">Gestão de acessos e permissões.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Prioridades sugeridas</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qualidade de dados</p>
            <p className="mt-1 text-sm text-slate-700">
              Revisar {formatNumber(paradasSemStatus)} paradas sem status para elevar a confiabilidade dos indicadores.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cobertura geográfica</p>
            <p className="mt-1 text-sm text-slate-700">
              Completar coordenadas em {formatNumber(paradasSemCoordenada)} registros para ampliar suporte à roteirização.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Governança</p>
            <p className="mt-1 text-sm text-slate-700">
              Manter perfis de acesso atualizados e revisar permissões administrativas com frequência.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
