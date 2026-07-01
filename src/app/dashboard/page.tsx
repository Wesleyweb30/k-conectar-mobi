import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id;

  const projetos = userId
    ? await prisma.projeto.findMany({
        where: {
          OR: [
            { criadoPorId: userId },
            { participantes: { some: { usuarioId: userId } } },
          ],
        },
        include: {
          _count: {
            select: {
              tarefas: true,
            },
          },
        },
      })
    : [];

  const projetoIds = projetos.map((projeto) => projeto.id);
  const tarefasPorStatus =
    projetoIds.length > 0
      ? await prisma.tarefa.groupBy({
          by: ["status"],
          where: { projetoId: { in: projetoIds } },
          _count: { _all: true },
        })
      : [];

  const totaisStatus = {
    pendente: 0,
    em_andamento: 0,
    concluida: 0,
  };

  for (const item of tarefasPorStatus) {
    if (item.status === "pendente") totaisStatus.pendente = item._count._all;
    if (item.status === "em_andamento") totaisStatus.em_andamento = item._count._all;
    if (item.status === "concluida") totaisStatus.concluida = item._count._all;
  }

  const projetosCriados = projetos.filter((projeto) => projeto.criadoPorId === userId).length;
  const totalProjetos = projetos.length;
  const totalTarefas = projetos.reduce((acc, projeto) => acc + projeto._count.tarefas, 0);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Dashboard
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Painel do Usuário</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bem-vindo, {session?.user.name}. Acompanhe seu perfil e acesse rapidamente as áreas
              principais da plataforma.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Perfil atual</p>
            <p className="text-lg font-semibold text-slate-900">Usuário</p>
            <p className="text-xs text-slate-500">Acesso padrão da plataforma</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Seu perfil</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-800">{session?.user.name ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">E-mail</dt>
              <dd className="font-medium text-slate-800">{session?.user.email ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Perfil</dt>
              <dd className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                usuário
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-violet-900">Projetos e tarefas</h2>
              <p className="mt-1 text-sm text-violet-700">Visao geral das suas entregas.</p>
            </div>
            <Link
              href="/projetos"
              className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
            >
              Abrir tarefas
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-violet-200 bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-violet-600">Projetos</p>
              <p className="mt-1 text-lg font-bold text-violet-900">{totalProjetos}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-white px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-violet-600">Criados por voce</p>
              <p className="mt-1 text-lg font-bold text-violet-900">{projetosCriados}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-amber-700">A fazer</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{totaisStatus.pendente}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-sky-700">Em andamento</p>
              <p className="mt-1 text-lg font-bold text-sky-900">{totaisStatus.em_andamento}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Concluidas / Total</p>
            <p className="mt-1 text-base font-bold text-emerald-900">
              {totaisStatus.concluida} / {totalTarefas}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
          <p className="mt-2 text-sm text-slate-600">
            Entre nas áreas de consulta e roteirização com um clique.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <Link
              href="/dashboard/atividades"
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Consultar atividades manutenção (Produttivo)
            </Link>
            <Link
              href="/projetos"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
            >
              Abrir projetos e tarefas
            </Link>
            <Link
              href="/paradas"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              Consultar paradas
            </Link>
            <Link
              href="/paradas/mapa"
              className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Abrir mapa geral de paradas
            </Link>
            <Link
              href="/paradas/rotas"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Montar rota no mapa
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}