import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import { getLatestProduttivoFormFillByWorkId, getProduttivoWork } from "@/service/produttivo.service";
import { iniciarPreenchimentoAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Params = Promise<{ id: string }>;

function pickFirst(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function toPositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveReturnToPath(rawValue: string | undefined): string {
  if (!rawValue) return "/atividades";
  if (!rawValue.startsWith("/")) return "/atividades";
  if (rawValue.startsWith("//")) return "/atividades";
  return rawValue;
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "started":
      return "Iniciada";
    case "finished":
      return "Finalizada";
    case "canceled":
      return "Cancelada";
    case "reviewed":
      return "Revisada";
    case "not_started":
    default:
      return "Nao iniciada";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function AtividadeDetalhePage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = (session.user.role ?? "") === "admin";
  const returnToDefault = isAdmin ? "/admin/atividades" : "/dashboard/atividades";

  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);

  const workId = toPositiveInt(params.id);
  if (!workId) {
    notFound();
  }

  const returnTo = resolveReturnToPath(pickFirst(searchParams.returnTo) || returnToDefault);
  const msg = pickFirst(searchParams.msg);

  const [work, latestFormFill] = await Promise.all([
    getProduttivoWork(workId).catch(() => null),
    getLatestProduttivoFormFillByWorkId(workId).catch(() => null),
  ]);

  if (!work) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Atividade #{work.id}</h1>
              <p className="mt-1 text-sm text-slate-500">Detalhes da atividade criada no Produttivo.</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-none sm:auto-cols-max sm:grid-flow-col sm:items-center">
              <form action={iniciarPreenchimentoAction} className="w-full sm:w-auto">
                <input type="hidden" name="workId" value={work.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                >
                  Preencher atividade
                </button>
              </form>
              <Link
                href={returnTo}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Voltar
              </Link>
            </div>
          </div>

          {msg ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>
          ) : null}

          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titulo</dt>
              <dd className="mt-1 text-sm text-slate-800">{work.title || "-"}</dd>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-1 text-sm text-slate-800">{statusLabel(work.status)}</dd>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formulario (ID)</dt>
              <dd className="mt-1 text-sm text-slate-800">{work.form_id ?? "-"}</dd>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conta (ID)</dt>
              <dd className="mt-1 text-sm text-slate-800">{work.account_id ?? "-"}</dd>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local (resource_place_id)</dt>
              <dd className="mt-1 text-sm text-slate-800">{work.resource_place_id ?? "-"}</dd>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Atualizada em</dt>
              <dd className="mt-1 text-sm text-slate-800">{formatDate(work.updated_at)}</dd>
            </div>
          </dl>

          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Formulario de preenchimento</h2>
            <p className="mt-1 text-xs text-slate-600">
              Se ja existir preenchimento, voce pode abrir para editar. Se nao existir, o sistema cria automaticamente e abre a tela.
            </p>

            {latestFormFill?.id ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Preenchimento encontrado</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Form fill #{latestFormFill.id} - atualizado em {formatDate(latestFormFill.updated_at)}
                </p>
                <Link
                  href={`/atividades/${work.id}/preenchimento/${latestFormFill.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className="mt-2 inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Ver preenchimento
                </Link>
              </div>
            ) : null}

            <form action={iniciarPreenchimentoAction} className="mt-3 w-full sm:w-auto">
              <input type="hidden" name="workId" value={work.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                {latestFormFill?.id ? "Editar preenchimento" : "Criar e preencher"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
