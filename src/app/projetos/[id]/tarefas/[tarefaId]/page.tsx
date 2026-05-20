import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import { AutoHideMessage } from "@/components/auto-hide-message";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editarTarefaAction, excluirTarefaAction } from "@/app/projetos/actions";

type TarefaDetalhePageProps = {
  params: Promise<{ id: string; tarefaId: string }>;
  searchParams?: Promise<{ msg?: string }>;
};

function statusLabel(status: string) {
  if (status === "pendente") return "Pendente";
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluida") return "Concluida";
  return status;
}

export default async function TarefaDetalhePage({ params, searchParams }: TarefaDetalhePageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const { id: projetoId, tarefaId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: {
      id: true,
      nome: true,
      criadoPorId: true,
      participantes: {
        where: { usuarioId: session.user.id },
        select: { papel: true },
        take: 1,
      },
    },
  });

  if (!projeto) {
    redirect("/projetos?msg=Projeto%20nao%20encontrado");
  }

  const papelAtual = projeto.participantes[0]?.papel ?? null;
  const isAdmin = session.user.role === "admin";
  const isCriadorProjeto = projeto.criadoPorId === session.user.id;
  const isParticipante = Boolean(papelAtual);

  if (!isAdmin && !isCriadorProjeto && !isParticipante) {
    redirect("/projetos?msg=Sem%20acesso%20a%20este%20projeto");
  }

  const podeEditarTarefas = isAdmin || isCriadorProjeto || papelAtual === "editor" || papelAtual === "owner";

  const tarefa = await prisma.tarefa.findFirst({
    where: {
      id: tarefaId,
      projetoId,
    },
    include: {
      responsavel: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      parada: {
        select: {
          codigo: true,
          municipio: true,
          bairro: true,
        },
      },
    },
  });

  if (!tarefa) {
    redirect(`/projetos/${projetoId}?msg=Tarefa%20nao%20encontrada`);
  }

  const returnTo = `/projetos/${projetoId}/tarefas/${tarefaId}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className={`${isAdmin ? "max-w-5xl" : "max-w-4xl"} mx-auto px-2 sm:px-4 py-6 md:py-10 space-y-6`}>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Projeto</p>
              <h1 className="text-2xl font-bold text-slate-900">{projeto.nome}</h1>
              <p className="text-sm text-slate-600 mt-1">Detalhe da tarefa</p>
            </div>
            <Link
              href={`/projetos/${projetoId}?view=tarefas`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para tarefas
            </Link>
          </div>

          {resolvedSearchParams.msg ? <AutoHideMessage message={resolvedSearchParams.msg} /> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="text-[11px] uppercase font-semibold text-slate-500">Titulo</p>
              <p className="text-base font-semibold text-slate-900 mt-1">{tarefa.titulo}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="text-[11px] uppercase font-semibold text-slate-500">Status atual</p>
              <p className="text-base text-slate-900 mt-1">{statusLabel(tarefa.status)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="text-[11px] uppercase font-semibold text-slate-500">Parada</p>
              <p className="text-base text-slate-900 mt-1">{tarefa.parada?.codigo ?? "Nao vinculada"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="text-[11px] uppercase font-semibold text-slate-500">Responsavel</p>
              <p className="text-base text-slate-900 mt-1">{tarefa.responsavel?.email ?? "Nao definido"}</p>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <p className="text-[11px] uppercase font-semibold text-slate-500">Descricao</p>
            <p className="text-sm text-slate-900 mt-1">{tarefa.descricao || "Sem descricao"}</p>
          </div>

          {podeEditarTarefas ? (
            <>
              <form action={editarTarefaAction} className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <input type="hidden" name="projetoId" value={projetoId} />
                <input type="hidden" name="tarefaId" value={tarefa.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Titulo</label>
                    <input
                      name="titulo"
                      defaultValue={tarefa.titulo}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      name="status"
                      defaultValue={tarefa.status}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluida">Concluida</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Codigo da parada</label>
                    <input
                      name="paradaCodigo"
                      defaultValue={tarefa.parada?.codigo ?? ""}
                      placeholder="Ex: 001"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email do responsavel</label>
                    <input
                      name="responsavelEmail"
                      type="email"
                      defaultValue={tarefa.responsavel?.email ?? ""}
                      placeholder="usuario@dominio.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Descricao</label>
                  <textarea
                    name="descricao"
                    defaultValue={tarefa.descricao ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Salvar alteracoes
                  </button>
                </div>
              </form>

              <form action={excluirTarefaAction}>
                <input type="hidden" name="projetoId" value={projetoId} />
                <input type="hidden" name="tarefaId" value={tarefa.id} />
                <input type="hidden" name="returnTo" value={`/projetos/${projetoId}`} />
                <button
                  type="submit"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Excluir tarefa
                </button>
              </form>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
