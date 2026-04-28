import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ações rápidas</h2>
          <p className="mt-2 text-sm text-slate-600">
            Entre nas áreas de consulta e roteirização com um clique.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
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