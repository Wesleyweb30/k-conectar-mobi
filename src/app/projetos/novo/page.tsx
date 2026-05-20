import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import { criarProjetoAction } from "../actions";
import ParticipantesDynamicFields from "@/components/projetos/participantes-dynamic-fields";

type NovoProjetoPageProps = {
  searchParams?: Promise<{ msg?: string }>;
};

export default async function NovoProjetoPage({ searchParams }: NovoProjetoPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? <AdminNav userName={session.user.name} /> : <UserNav userName={session.user.name} />}

      <main className={`${isAdmin ? "max-w-4xl" : "max-w-3xl"} mx-auto px-4 py-8 md:py-10 space-y-6`}>
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Criar novo projeto</h1>
              <p className="mt-1 text-sm text-slate-600">
                Defina os dados do projeto e adicione participantes iniciais por e-mail.
              </p>
            </div>
            <Link
              href="/projetos"
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

          <form action={criarProjetoAction} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</span>
                <input
                  name="nome"
                  placeholder="Ex.: Revitalizacao Zona Sul"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descricao</span>
                <input
                  name="descricao"
                  placeholder="Breve descricao do objetivo"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:ring"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Participantes iniciais</h2>
              <p className="text-xs text-slate-500">
                Adicione participantes um a um e defina o papel de cada pessoa.
              </p>

              <ParticipantesDynamicFields />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Criar projeto
              </button>
              <Link
                href="/projetos"
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
