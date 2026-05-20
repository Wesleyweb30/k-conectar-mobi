import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import { AutoHideMessage } from "@/components/auto-hide-message";
import { KanbanWrapper } from "@/components/projetos/kanban-wrapper";
import {
  adicionarParticipanteAction,
  atualizarPapelParticipanteAction,
  criarTarefaAction,
  editarProjetoAction,
  editarTarefaAction,
  removerParticipanteAction,
} from "../actions";

type ProjetoItem = {
  id: string;
  nome: string;
  descricao: string | null;
  criadoPorId: string;
  papelAtual: "visualizador" | "editor" | "owner";
};

type ParticipanteItem = {
  id: string;
  usuarioId: string;
  papel: "visualizador" | "editor" | "owner";
  usuario: {
    id: string;
    name: string;
    email: string;
  };
};

type TarefaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  criadoEm: string;
  responsavel: {
    id: string;
    name: string;
    email: string;
  } | null;
  parada: {
    codigo: string;
    municipio: string | null;
    bairro: string | null;
    novaTipologia: string | null;
  } | null;
};

type ProjetoContext = {
  error: string | null;
  projeto: ProjetoItem | null;
  participantes: ParticipanteItem[];
  tarefas: TarefaItem[];
  tarefasTotal: number;
  tarefasPage: number;
  tarefasPerPage: number;
};

type ParadaPedOption = {
  codigo: string;
  municipio: string | null;
  bairro: string | null;
};

function papelLabel(papel: ProjetoItem["papelAtual"] | ParticipanteItem["papel"]) {
  if (papel === "visualizador") return "Visualizador";
  if (papel === "editor") return "Editor";

  if (papel === "owner") return "Responsavel";
  return papel;
}

async function fetchProjetoContext(projetoId: string, page = 1, perPage = 10): Promise<ProjetoContext> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? null;
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie") ?? "";

  const emptyResponse: ProjetoContext = {
    error: null,
    projeto: null,
    participantes: [],
    tarefas: [],
    tarefasTotal: 0,
    tarefasPage: 1,
    tarefasPerPage: 10,
  };

  if (!host) {
    return { ...emptyResponse, error: "Nao foi possivel resolver host da requisicao" };
  }

  const baseUrl = `${protocol}://${host}`;

  const [projetosRes, participantesRes, tarefasRes] = await Promise.all([
    fetch(`${baseUrl}/api/projetos`, { cache: "no-store", headers: { cookie } }),
    fetch(`${baseUrl}/api/projetos/${projetoId}/participantes`, { cache: "no-store", headers: { cookie } }),
    fetch(`${baseUrl}/api/projetos/${projetoId}/tarefas?page=${page}&perPage=${perPage}`, {
      cache: "no-store",
      headers: { cookie },
    }),
  ]);

  if (projetosRes.status === 401 || participantesRes.status === 401 || tarefasRes.status === 401) {
    redirect("/login");
  }

  if (projetosRes.status === 403 || participantesRes.status === 403 || tarefasRes.status === 403) {
    return { ...emptyResponse, error: "Sem acesso a este projeto." };
  }

  if (projetosRes.status === 404 || participantesRes.status === 404 || tarefasRes.status === 404) {
    return { ...emptyResponse, error: "Projeto nao encontrado." };
  }

  if (!projetosRes.ok || !participantesRes.ok || !tarefasRes.ok) {
    return { ...emptyResponse, error: "Falha ao carregar os dados do projeto." };
  }

  const projetosBody = (await projetosRes.json()) as { items?: ProjetoItem[] };
  const participantesBody = (await participantesRes.json()) as { items?: ParticipanteItem[] };
  const tarefasBody = (await tarefasRes.json()) as {
    items?: TarefaItem[];
    total?: number;
    page?: number;
    perPage?: number;
  };

  const projeto = (projetosBody.items ?? []).find((item) => item.id === projetoId) ?? null;

  return {
    error: null,
    projeto,
    participantes: participantesBody.items ?? [],
    tarefas: tarefasBody.items ?? [],
    tarefasTotal: tarefasBody.total ?? 0,
    tarefasPage: tarefasBody.page ?? page,
    tarefasPerPage: tarefasBody.perPage ?? perPage,
  };
}

async function fetchParadasPedOptions(): Promise<ParadaPedOption[]> {
  try {
    const paradas = await prisma.parada.findMany({
      select: {
        codigo: true,
        municipio: true,
        bairro: true,
      },
      orderBy: { codigo: "asc" },
    });

    return paradas;
  } catch {
    return [];
  }
}

type ProjetoDetalheProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    msg?: string;
    page?: string;
    perPage?: string;
    view?: string;
    editProjeto?: string;
    editTarefa?: string;
    novaTarefa?: string;
  }>;
};

function buildProjetoHref(
  projetoId: string,
  query: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `/projetos/${projetoId}?${qs}` : `/projetos/${projetoId}`;
}

export default async function ProjetoDetalhePage({ params, searchParams }: ProjetoDetalheProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const isAdmin = session.user.role === "admin";

  const tarefasPage = Math.max(Number(resolvedSearchParams.page) || 1, 1);
  const tarefasPerPage = Math.max(Number(resolvedSearchParams.perPage) || 10, 1);

  const {
    error,
    projeto,
    participantes,
    tarefas,
    tarefasTotal,
    tarefasPage: tarefasPaginaAtual,
    tarefasPerPage: tarefasPorPagina,
  } = await fetchProjetoContext(id, tarefasPage, tarefasPerPage);
  const paradasPed = await fetchParadasPedOptions();

  if (error || !projeto) {
    redirect(`/projetos?msg=${encodeURIComponent(error ?? "Projeto nao encontrado.")}`);
  }

  const papelAtual = projeto.papelAtual;
  const isCriadorProjeto = projeto.criadoPorId === session.user.id;
  const podeGerenciarParticipantes = isCriadorProjeto;
  const podeEditarTarefas =
    isAdmin || papelAtual === "editor" || papelAtual === "owner";
  const podeEditarProjeto = isAdmin || isCriadorProjeto;

  const totalPaginas = Math.max(1, Math.ceil(tarefasTotal / tarefasPorPagina));
  const paginaAnterior = Math.max(1, tarefasPaginaAtual - 1);
  const proximaPagina = Math.min(totalPaginas, tarefasPaginaAtual + 1);
  const viewParam = resolvedSearchParams.view;
  const activeView =
    viewParam === "participantes" || viewParam === "tarefas" || viewParam === "configuracao"
      ? viewParam
      : "tarefas";
  const mostrandoEdicaoProjeto = podeEditarProjeto && resolvedSearchParams.editProjeto === "1";
  const tarefaEmEdicaoId = resolvedSearchParams.editTarefa ?? "";
  const criadoNovaTarefa = podeEditarTarefas && resolvedSearchParams.novaTarefa === "1";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className={`${isAdmin ? "max-w-6xl" : "max-w-5xl"} mx-auto px-2 sm:px-4 py-6 md:py-10 space-y-8`}>
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projeto</p>
              <h1 className="text-2xl font-bold text-slate-900">{projeto.nome}</h1>
              <p className="mt-1 text-sm text-slate-600">{projeto.descricao || "Sem descricao"}</p>
            </div>
            <Link
              href="/projetos"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              Seu papel: {papelLabel(papelAtual)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={buildProjetoHref(id, { view: "tarefas", page: tarefasPaginaAtual, perPage: tarefasPorPagina })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                activeView === "tarefas"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Tarefas
            </Link>
            <Link
              href={buildProjetoHref(id, { view: "configuracao" })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                activeView === "configuracao"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Configuração
            </Link>
          </div>

          {resolvedSearchParams.msg ? (
            <AutoHideMessage message={resolvedSearchParams.msg} />
          ) : null}
        </section>

        {activeView === "configuracao" ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Participantes</h2>
            <p className="text-xs text-slate-500 mb-4">
              {podeGerenciarParticipantes 
                ? "Você pode adicionar, remover e editar papéis dos participantes." 
                : "Você pode sair do projeto se desejar."}
            </p>

            {podeGerenciarParticipantes ? (
              <form action={adicionarParticipanteAction} className="space-y-4 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <input type="hidden" name="projetoId" value={projeto.id} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    name="email"
                    type="email"
                    placeholder="email@dominio.com"
                    className="sm:col-span-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    required
                  />
                  <select
                    name="papel"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    defaultValue="visualizador"
                  >
                    <option value="visualizador">Visualizador</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Adicionar participante
                </button>
              </form>
            ) : null}

            <div className="space-y-2 flex-1">
              {participantes.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">Sem participantes cadastrados.</p>
              ) : (
                participantes.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.usuario.name}</p>
                      <p className="text-xs text-slate-600 truncate">{item.usuario.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                      {isCriadorProjeto && item.usuarioId !== projeto.criadoPorId ? (
                        <form action={atualizarPapelParticipanteAction} className="flex items-center gap-2">
                          <input type="hidden" name="projetoId" value={projeto.id} />
                          <input type="hidden" name="usuarioId" value={item.usuarioId} />
                          <select
                            name="papel"
                            defaultValue={item.papel}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
                          >
                            <option value="visualizador">Visualizador</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          >
                            Atualizar
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {papelLabel(item.papel)}
                        </span>
                      )}

                      {isCriadorProjeto && item.usuarioId !== projeto.criadoPorId ? (
                        <form action={removerParticipanteAction} className="inline">
                          <input type="hidden" name="projetoId" value={projeto.id} />
                          <input type="hidden" name="usuarioId" value={item.usuarioId} />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Remover
                          </button>
                        </form>
                      ) : null}

                      {!isCriadorProjeto && item.usuarioId === session.user.id ? (
                        <form action={removerParticipanteAction} className="inline">
                          <input type="hidden" name="projetoId" value={projeto.id} />
                          <input type="hidden" name="usuarioId" value={item.usuarioId} />
                          <button
                            type="submit"
                            className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                          >
                            Sair do projeto
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md flex flex-col">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Informações do projeto</h2>

              {podeEditarProjeto && !mostrandoEdicaoProjeto ? (
                <Link
                  href={buildProjetoHref(id, { view: "configuracao", editProjeto: 1 })}
                  className="inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  Editar informações do projeto
                </Link>
              ) : null}
            </div>

            {mostrandoEdicaoProjeto ? (
              <form action={editarProjetoAction} className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <input type="hidden" name="projetoId" value={projeto.id} />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Nome do projeto</label>
                  <input
                    name="nome"
                    defaultValue={projeto.nome}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Descrição</label>
                  <textarea
                    name="descricao"
                    defaultValue={projeto.descricao ?? ""}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Salvar alterações
                  </button>
                  <Link
                    href={buildProjetoHref(id, { view: "configuracao" })}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Nome</p>
                  <p className="text-base font-semibold text-slate-900">{projeto.nome}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Descrição</p>
                  <p className="text-sm text-slate-900">{projeto.descricao || "Sem descrição definida"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Criado por</p>
                  <p className="text-sm text-slate-900">{isCriadorProjeto ? "Você" : "Outro usuário"}</p>
                </div>
              </div>
            )}
          </div>
        </section>
        ) : null}

        {activeView === "tarefas" ? (
        <>
          {podeEditarTarefas && !criadoNovaTarefa ? (
            <div className="flex justify-end">
              <Link
                href={buildProjetoHref(id, { view: "tarefas", page: tarefasPaginaAtual, perPage: tarefasPorPagina, novaTarefa: 1 })}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                + Adicionar tarefa
              </Link>
            </div>
          ) : null}

          {podeEditarTarefas && criadoNovaTarefa ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <form action={criarTarefaAction} className="space-y-4">
                <input type="hidden" name="projetoId" value={projeto.id} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Título *</label>
                    <input
                      name="titulo"
                      placeholder="Título da tarefa"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      name="status"
                      defaultValue="pendente"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Código da parada</label>
                    <input
                      name="paradaCodigo"
                      list="paradas-ped-list"
                      placeholder="Ex: 001"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    />
                    <datalist id="paradas-ped-list">
                      {paradasPed.map((parada) => (
                        <option
                          key={parada.codigo}
                          value={parada.codigo}
                        >
                          {`${parada.codigo} - ${parada.municipio ?? "Sem municipio"}${parada.bairro ? ` / ${parada.bairro}` : ""}`}
                        </option>
                      ))}
                    </datalist>
                    <p className="mt-1 text-[11px] text-slate-500">
                      PEDs disponiveis: {paradasPed.length}. Digite para filtrar e selecionar.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email do responsável</label>
                    <input
                      name="responsavelEmail"
                      type="email"
                      placeholder="usuario@dominio.com"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                  <textarea
                    name="descricao"
                    placeholder="Descreva os detalhes da tarefa"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Criar tarefa
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </>
        ) : null}

        {activeView === "tarefas" ? (
        <>
          <section>
            <KanbanWrapper
              tarefas={tarefas}
              projetoId={id}
              podeEditarTarefas={podeEditarTarefas}
              tarefaEmEdicaoId={tarefaEmEdicaoId}
              tarefaDetalheLink={`/projetos/${id}/tarefas/:tarefaId`}
            />
          </section>

          {podeEditarTarefas && tarefaEmEdicaoId && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Editar tarefa</h2>
              {(() => {
                const tarefa = tarefas.find((t) => t.id === tarefaEmEdicaoId);
                if (!tarefa) return null;

                return (
                  <form action={editarTarefaAction} className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <input type="hidden" name="projetoId" value={id} />
                    <input type="hidden" name="tarefaId" value={tarefa.id} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
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
                          <option value="concluida">Concluída</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Código da parada</label>
                        <input
                          name="paradaCodigo"
                          defaultValue={tarefa.parada?.codigo ?? ""}
                          placeholder="Ex: 001"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email do responsável</label>
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                      <textarea
                        name="descricao"
                        defaultValue={tarefa.descricao ?? ""}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                      />
                    </div>
                    <div className="flex gap-3 pt-3">
                      <button
                        type="submit"
                        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        Salvar
                      </button>
                      <Link
                        href={buildProjetoHref(id, { view: "tarefas" })}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancelar
                      </Link>
                    </div>
                  </form>
                );
              })()}
            </section>
          )}
        </>
        ) : null}
      </main>
    </div>
  );
}
