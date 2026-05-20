import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import {
  criarProjetoAction,
  excluirProjetoAction,
} from "./actions";

type ProjetoItem = {
  id: string;
  nome: string;
  descricao: string | null;
  criadoPorId: string;
  papelAtual: "participante" | "visualizador" | "editor" | "owner";
  totais: {
    tarefas: number;
    participantes: number;
    tarefasAFazer?: number;
    tarefasEmAndamento?: number;
    tarefasFinalizadas?: number;
  };
};

function papelLabel(papel: ProjetoItem["papelAtual"]) {
  if (papel === "visualizador") return "Visualizador";
  if (papel === "editor") return "Editor";

  if (papel === "owner") return "Owner";
  return papel;
}

async function fetchProjetos() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? null;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie") ?? "";

  if (!host) {
    return { error: "Nao foi possivel resolver host da requisicao", items: [] as ProjetoItem[] };
  }

  const response = await fetch(`${protocol}://${host}/api/projetos`, {
    cache: "no-store",
    headers: {
      cookie,
    },
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? "Falha ao carregar projetos.", items: [] as ProjetoItem[] };
  }

  const body = (await response.json()) as { items?: ProjetoItem[] };
  return { error: null, items: body.items ?? [] };
}

type ProjetosPageProps = {
  searchParams?: Promise<{ msg?: string }>;
};

export default async function ProjetosPage({ searchParams }: ProjetosPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const { error, items: projetos } = await fetchProjetos();
  const projetosCriados = projetos.filter((projeto) => projeto.criadoPorId === userId);
  const projetosParticipando = projetos.filter((projeto) => projeto.criadoPorId !== userId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className={`${isAdmin ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 py-8 md:py-10 space-y-6`}>
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projetos e Tarefas</h1>
              <p className="mt-1 text-sm text-slate-600">
                Lista de projetos para consulta rapida. A edicao e o gerenciamento de participantes ficam no detalhe do projeto.
              </p>
            </div>
            <Link
              href="/projetos/novo"
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Novo projeto
            </Link>
          </div>
          {resolvedSearchParams.msg ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              {resolvedSearchParams.msg}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="space-y-6">
          {projetos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              Nenhum projeto encontrado para seu usuario.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Projetos criados por mim</h2>
                {projetosCriados.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
                    Voce ainda nao criou projetos.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projetosCriados.map((projeto) => {
                      const podeExcluir = projeto.criadoPorId === userId || isAdmin;
                      return (
                        <article
                          key={projeto.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex h-full flex-col">
                            <div>
                              <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{projeto.nome}</h3>
                              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{projeto.descricao || "Sem descricao"}</p>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                                Tarefas: {projeto.totais.tarefas}
                              </span>
                              <span className="rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-700">
                                Participantes: {projeto.totais.participantes}
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                              <span className="rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                                A fazer: {projeto.totais.tarefasAFazer ?? 0}
                              </span>
                              <span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                Em andamento: {projeto.totais.tarefasEmAndamento ?? 0}
                              </span>
                              <span className="rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                                Finalizadas: {projeto.totais.tarefasFinalizadas ?? 0}
                              </span>
                            </div>

                            <div className="mt-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                Papel: {papelLabel(projeto.papelAtual)}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                href={`/projetos/${projeto.id}`}
                                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                              >
                                Abrir
                              </Link>
                              {podeExcluir ? (
                                <form action={excluirProjetoAction}>
                                  <input type="hidden" name="projetoId" value={projeto.id} />
                                  <button
                                    type="submit"
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                  >
                                    Excluir
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Projetos que participo</h2>
                {projetosParticipando.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
                    Voce nao participa de outros projetos no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projetosParticipando.map((projeto) => (
                      <article
                        key={projeto.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex h-full flex-col">
                          <div>
                            <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{projeto.nome}</h3>
                            <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{projeto.descricao || "Sem descricao"}</p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                              Tarefas: {projeto.totais.tarefas}
                            </span>
                            <span className="rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-700">
                              Participantes: {projeto.totais.participantes}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            <span className="rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                              A fazer: {projeto.totais.tarefasAFazer ?? 0}
                            </span>
                            <span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                              Em andamento: {projeto.totais.tarefasEmAndamento ?? 0}
                            </span>
                            <span className="rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                              Finalizadas: {projeto.totais.tarefasFinalizadas ?? 0}
                            </span>
                          </div>

                          <div className="mt-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              Papel: {papelLabel(projeto.papelAtual)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={`/projetos/${projeto.id}`}
                              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              Abrir
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
