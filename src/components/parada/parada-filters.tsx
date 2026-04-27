"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FiltersState = {
  codigo: string;
  status: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  novaTipologia: string;
};

type DistinctValues = {
  status: string[];
  municipio: string[];
  bairro: string[];
  logradouro: string[];
  novaTipologia: string[];
};

type Props = {
  initialFilters: FiltersState;
  distinctValues: DistinctValues;
};

function normalize(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function buildQuery(filters: FiltersState) {
  const sp = new URLSearchParams();

  const codigo = normalize(filters.codigo);
  if (codigo) sp.set("codigo", codigo);

  if (filters.status) sp.set("status", filters.status);
  if (filters.municipio) sp.set("municipio", filters.municipio);
  if (filters.bairro) sp.set("bairro", filters.bairro);
  if (filters.logradouro) sp.set("logradouro", filters.logradouro);
  if (filters.novaTipologia) sp.set("novaTipologia", filters.novaTipologia);

  return sp;
}

export default function ParadaFilters({ initialFilters, distinctValues }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSections, setDrawerSections] = useState({
    status: true,
    localizacao: true,
    tipologia: true,
  });

  const nextQuery = useMemo(() => buildQuery(filters), [filters]);
  const activeFiltersCount = useMemo(
    () =>
      [
        normalize(filters.codigo),
        filters.status,
        filters.municipio,
        filters.bairro,
        filters.logradouro,
        filters.novaTipologia,
      ].filter(Boolean).length,
    [filters],
  );
  const filterPills = [
    normalize(filters.codigo) ? `Codigo: ${normalize(filters.codigo)}` : null,
    filters.status ? `Status: ${filters.status === "__EMPTY__" ? "Vazio" : filters.status}` : null,
    filters.municipio ? `Municipio: ${filters.municipio}` : null,
    filters.bairro ? `Bairro: ${filters.bairro}` : null,
    filters.logradouro ? `Logradouro: ${filters.logradouro}` : null,
    filters.novaTipologia ? `Tipologia: ${filters.novaTipologia}` : null,
  ].filter(Boolean) as string[];

  function clearFilters() {
    setFilters({
      codigo: "",
      status: "",
      municipio: "",
      bairro: "",
      logradouro: "",
      novaTipologia: "",
    });
  }

  function toggleDrawerSection(section: keyof typeof drawerSections) {
    setDrawerSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.delete("page");

      const currentFilterQuery = currentParams.toString();
      const nextFilterQuery = nextQuery.toString();

      if (currentFilterQuery !== nextFilterQuery) {
        const finalQuery = new URLSearchParams(nextFilterQuery);
        finalQuery.set("page", "1");
        router.replace(`${pathname}?${finalQuery.toString()}`, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nextQuery, pathname, router, searchParams]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  const codigoField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Codigo</span>
      <input
        type="text"
        inputMode="numeric"
        value={filters.codigo}
        onChange={(event) => {
          const digitsOnly = event.target.value.replace(/\D/g, "");
          setFilters((prev) => ({ ...prev, codigo: digitsOnly }));
        }}
        placeholder="Ex.: 150685"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );

  const statusField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
      <select
        value={filters.status}
        onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      >
        <option value="">Todos</option>
        <option value="__EMPTY__">Status vazio</option>
        {distinctValues.status.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );

  const municipioField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Municipio</span>
      <select
        value={filters.municipio}
        onChange={(event) => setFilters((prev) => ({ ...prev, municipio: event.target.value }))}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      >
        <option value="">Todos</option>
        {distinctValues.municipio.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );

  const bairroField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bairro</span>
      <select
        value={filters.bairro}
        onChange={(event) => setFilters((prev) => ({ ...prev, bairro: event.target.value }))}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      >
        <option value="">Todos</option>
        {distinctValues.bairro.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );

  const logradouroField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Logradouro</span>
      <select
        value={filters.logradouro}
        onChange={(event) => setFilters((prev) => ({ ...prev, logradouro: event.target.value }))}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      >
        <option value="">Todos</option>
        {distinctValues.logradouro.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );

  const tipologiaField = (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nova tipologia</span>
      <select
        value={filters.novaTipologia}
        onChange={(event) =>
          setFilters((prev) => ({ ...prev, novaTipologia: event.target.value }))
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
      >
        <option value="">Todas</option>
        {distinctValues.novaTipologia.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="mt-5 md:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)] transition active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
            Filtros
          </span>
          {activeFiltersCount > 0 ? (
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
              {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Nenhum ativo</span>
          )}
        </button>
      </div>

      <div className="mt-5 hidden rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.4)] md:block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Painel de filtros
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Combine codigo, localizacao e tipologia para reduzir rapidamente a base exibida.
            </p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {codigoField}
          {statusField}
          {municipioField}
          {bairroField}
          {logradouroField}
          {tipologiaField}
        </div>

        <div className="mt-4 flex min-h-8 flex-wrap gap-2">
          {filterPills.length > 0 ? (
            filterPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
              >
                {pill}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
              Nenhum filtro ativo
            </span>
          )}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition md:hidden ${
          isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isDrawerOpen}
      >
        <button
          type="button"
          onClick={() => setIsDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
            isDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Fechar painel de filtros"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Filtros de paradas"
          className={`absolute right-0 top-0 z-10 h-full w-full max-w-sm bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.98))] shadow-2xl transition-transform duration-300 ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Filtros</h3>
                  <p className="mt-1 text-xs text-slate-500">Ajuste a busca antes de navegar pela tabela.</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Fechar painel de filtros"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {codigoField}

              <section className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleDrawerSection("status")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">Status</span>
                  <span className="text-xs text-slate-500">
                    {drawerSections.status ? "Ocultar" : "Mostrar"}
                  </span>
                </button>
                {drawerSections.status ? <div className="p-3 pt-0">{statusField}</div> : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleDrawerSection("localizacao")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">Localização</span>
                  <span className="text-xs text-slate-500">
                    {drawerSections.localizacao ? "Ocultar" : "Mostrar"}
                  </span>
                </button>
                {drawerSections.localizacao ? (
                  <div className="space-y-3 p-3 pt-0">
                    {municipioField}
                    {bairroField}
                    {logradouroField}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleDrawerSection("tipologia")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">Tipologia</span>
                  <span className="text-xs text-slate-500">
                    {drawerSections.tipologia ? "Ocultar" : "Mostrar"}
                  </span>
                </button>
                {drawerSections.tipologia ? <div className="p-3 pt-0">{tipologiaField}</div> : null}
              </section>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/90 p-4 pb-[max(1rem,_env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={clearFilters}
                className="h-12 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 transition active:scale-95 hover:bg-slate-50"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="h-12 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition active:scale-95 hover:bg-slate-800"
              >
                Aplicar
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}