import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
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
  ]);

  const paradasComCoordenada = Math.max(totalParadas - paradasSemCoordenada, 0);
  const coberturaMapaPercent =
    totalParadas > 0 ? ((paradasComCoordenada / totalParadas) * 100).toFixed(1) : "0.0";

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
