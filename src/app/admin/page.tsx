import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShelterStatusDonut from "@/components/dashboard/shelter-status-donut";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [ativoAgg, semInfoAgg, reativadoAgg, totalParadas, tipologiaAtualGroups, novaTipologiaGroups] = await Promise.all([
    prisma.parada.aggregate({
      where: {
        AND: [
          { status: { contains: "ativo", mode: "insensitive" } },
          { NOT: { status: { contains: "reativ", mode: "insensitive" } } },
        ],
      },
      _sum: { quantidadeAbrigosTotens: true },
    }),
    prisma.parada.aggregate({
      where: {
        OR: [
          { status: null },
          { status: "" },
          { status: { contains: "sem inform", mode: "insensitive" } },
        ],
      },
      _sum: { quantidadeAbrigosTotens: true },
    }),
    prisma.parada.aggregate({
      where: { status: { contains: "reativ", mode: "insensitive" } },
      _sum: { quantidadeAbrigosTotens: true },
    }),
    prisma.parada.count(),
    prisma.parada.groupBy({
      by: ["tipologiaAtual"],
      _count: { _all: true },
      _sum: { quantidadeAbrigosTotens: true },
    }),
    prisma.parada.groupBy({
      by: ["novaTipologia"],
      _count: { _all: true },
      _sum: { quantidadeAbrigosTotens: true },
    }),
  ]);

  const ativoCount = ativoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const semInfoCount = semInfoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const reativadoCount = reativadoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const total = ativoCount + semInfoCount + reativadoCount;

  const tipologiaAtualResumo = tipologiaAtualGroups
    .map((item) => ({
      nome: item.tipologiaAtual?.trim() || "Sem tipologia atual",
      quantidadeParadas: item._count._all,
      quantidadeAbrigos: item._sum.quantidadeAbrigosTotens ?? 0,
    }))
    .sort((a, b) => b.quantidadeParadas - a.quantidadeParadas);

  const novaTipologiaResumo = novaTipologiaGroups
    .map((item) => ({
      nome: item.novaTipologia?.trim() || "Sem nova tipologia",
      quantidadeParadas: item._count._all,
      quantidadeAbrigos: item._sum.quantidadeAbrigosTotens ?? 0,
    }))
    .sort((a, b) => b.quantidadeParadas - a.quantidadeParadas);

  const maxTipologiaAtualParadas = Math.max(...tipologiaAtualResumo.map((item) => item.quantidadeParadas), 1);
  const maxNovaTipologiaParadas = Math.max(...novaTipologiaResumo.map((item) => item.quantidadeParadas), 1);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Admin Analytics
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Analytics de paradas</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bem-vindo, {session?.user.name}. Este painel concentra os indicadores analíticos.
              Por enquanto, os gráficos são de paradas.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/paradas"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
              >
                Abrir paradas
              </Link>
              <Link
                href="/paradas/rotas"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Abrir roteirização
              </Link>
              <Link
                href="/admin/usuarios"
                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                Abrir dados de usuários
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total de abrigos</p>
            <p className="text-2xl font-semibold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">base para este painel</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total de abrigos</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-indigo-700">Total de paradas</p>
            <p className="mt-1 text-xl font-semibold text-indigo-900">{totalParadas}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Ativo</p>
            <p className="mt-1 text-xl font-semibold text-emerald-900">{ativoCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-700">Sem informação</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">{semInfoCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-blue-700">Reativado</p>
            <p className="mt-1 text-xl font-semibold text-blue-900">{reativadoCount}</p>
          </div>
        </div>
      </div>

      <ShelterStatusDonut
        title="Status dos abrigos"
        items={[
          { label: "Ativo", value: ativoCount, color: "#10b981" },
          { label: "Sem informação", value: semInfoCount, color: "#f59e0b" },
          { label: "Reativado", value: reativadoCount, color: "#3b82f6" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Tipos de parada (tipologia atual)</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {tipologiaAtualResumo.length} tipos
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Quantidade de paradas e de abrigos por tipologia atual.</p>

          <div className="mt-4 space-y-2">
            {tipologiaAtualResumo.map((item) => {
              const percent = (item.quantidadeParadas / maxTipologiaAtualParadas) * 100;

              return (
                <div
                  key={item.nome}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="pr-2">
                      <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                      <p className="text-xs text-slate-500">{item.quantidadeParadas} paradas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{item.quantidadeAbrigos}</p>
                      <p className="text-[11px] text-slate-500">abrigos</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`Proporção da tipologia ${item.nome}`}>
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${percent.toFixed(1)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-500">{percent.toFixed(1)}% do maior volume</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Tipos de parada (nova tipologia)</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {novaTipologiaResumo.length} tipos
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Distribuição da nova tipologia para acompanhar evolução da base.</p>

          <div className="mt-4 space-y-2">
            {novaTipologiaResumo.map((item) => {
              const percent = (item.quantidadeParadas / maxNovaTipologiaParadas) * 100;

              return (
                <div
                  key={item.nome}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="pr-2">
                      <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                      <p className="text-xs text-slate-500">{item.quantidadeParadas} paradas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{item.quantidadeAbrigos}</p>
                      <p className="text-[11px] text-slate-500">abrigos</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`Proporção da nova tipologia ${item.nome}`}>
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${percent.toFixed(1)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-500">{percent.toFixed(1)}% do maior volume</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Evolução futura do analytics</h2>
        <p className="mt-1 text-sm text-slate-600">
          Este painel está preparado para receber novos blocos analíticos de tipologia, município,
          cobertura e produtividade operacional.
        </p>
      </div>
    </div>
  );
}
