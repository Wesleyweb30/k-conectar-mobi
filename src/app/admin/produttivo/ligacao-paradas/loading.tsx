export default function LigacaoParadasLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/50 to-emerald-50/30 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Radar de Ativos
            </span>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Buscando dados no Produttivo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Estamos consultando as manutencoes para montar os avisos. Isso pode levar alguns segundos.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-cyan-700">Paradas ativas</p>
            <div className="mt-1 h-7 w-16 animate-pulse rounded bg-cyan-200/70" />
            <p className="mt-1 text-xs text-cyan-700">Com filtros atuais</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="mt-3 flex justify-end">
            <div className="h-10 w-28 animate-pulse rounded-xl bg-cyan-200/70" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-500" />
        </div>
        <p className="mt-3 text-sm text-slate-600">Carregando resultados do radar...</p>

        <div className="mt-4 space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
