import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import ResourcePlaceAutocomplete from "@/components/produttivo/resource-place-autocomplete";
import { FORM_ID_MANUTENCAO } from "@/service/produttivo.service";
import { criarAtividadeAction } from "../actions";

type PageProps = {
  searchParams?: Promise<{
    msg?: string;
    returnTo?: string;
    localQ?: string;
    resourcePlaceId?: string;
  }>;
};

function resolveReturnToPath(returnTo?: string) {
  if (returnTo?.startsWith("/dashboard/atividades") || returnTo?.startsWith("/admin/atividades")) {
    return returnTo;
  }
  return "/atividades";
}

export default async function NovaAtividadePage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const resolvedSearchParams = (await searchParams) ?? {};
  const returnTo = resolveReturnToPath(resolvedSearchParams.returnTo);
  const localQ = String(resolvedSearchParams.localQ ?? "").trim();
  const selectedResourcePlaceId = String(resolvedSearchParams.resourcePlaceId ?? "").trim();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className={`${isAdmin ? "max-w-5xl" : "max-w-4xl"} mx-auto px-4 py-8 md:py-10 space-y-6`}>
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Criar atividade</h1>
              <p className="mt-1 text-sm text-slate-600">
                Cadastre uma nova atividade do Produttivo sem sair do app.
              </p>
            </div>
            <Link
              href={returnTo}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>

          {resolvedSearchParams.msg ? (
            <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              {resolvedSearchParams.msg}
            </p>
          ) : null}

          <form action={criarAtividadeAction} className="mt-6 space-y-4">
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Formulario fixo: Ordem de serviço - Manutenção V2 (ID {FORM_ID_MANUTENCAO})
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Titulo</span>
              <input
                name="title"
                placeholder="Ex.: Ordem de Serviço - Manutenção V2 - GRANDE RECIFE - CTM > 160179"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Local (autocomplete)
              </span>
              <ResourcePlaceAutocomplete
                initialQuery={localQ}
                initialSelectedId={selectedResourcePlaceId}
                required
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Criar atividade
              </button>
              <Link
                href={returnTo}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
