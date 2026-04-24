import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShelterStatusDonut from "@/components/dashboard/shelter-status-donut";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [ativoAgg, semInfoAgg, reativadoAgg] = await Promise.all([
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
  ]);

  const ativoCount = ativoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const semInfoCount = semInfoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const reativadoCount = reativadoAgg._sum.quantidadeAbrigosTotens ?? 0;
  const total = ativoCount + semInfoCount + reativadoCount;

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
                href="/admin/dados-usuarios"
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{total}</p>
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
