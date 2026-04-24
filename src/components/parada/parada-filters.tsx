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

  sp.set("page", "1");
  return sp.toString();
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
    const timeoutId = setTimeout(() => {
      const currentQuery = searchParams.toString();
      if (currentQuery !== nextQuery) {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
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
    <input
      type="text"
      inputMode="numeric"
      value={filters.codigo}
      onChange={(event) => {
        const digitsOnly = event.target.value.replace(/\D/g, "");
        setFilters((prev) => ({ ...prev, codigo: digitsOnly }));
      }}
      placeholder="Código"
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    />
  );

  const statusField = (
    <select
      value={filters.status}
      onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">Status (todos)</option>
      <option value="__EMPTY__">Status vazio</option>
      {distinctValues.status.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  const municipioField = (
    <select
      value={filters.municipio}
      onChange={(event) => setFilters((prev) => ({ ...prev, municipio: event.target.value }))}
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">Município (todos)</option>
      {distinctValues.municipio.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  const bairroField = (
    <select
      value={filters.bairro}
      onChange={(event) => setFilters((prev) => ({ ...prev, bairro: event.target.value }))}
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">Bairro (todos)</option>
      {distinctValues.bairro.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  const logradouroField = (
    <select
      value={filters.logradouro}
      onChange={(event) => setFilters((prev) => ({ ...prev, logradouro: event.target.value }))}
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">Logradouro (todos)</option>
      {distinctValues.logradouro.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  const tipologiaField = (
    <select
      value={filters.novaTipologia}
      onChange={(event) =>
        setFilters((prev) => ({ ...prev, novaTipologia: event.target.value }))
      }
      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <option value="">Nova tipologia (todas)</option>
      {distinctValues.novaTipologia.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div className="mt-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Filtros
          {activeFiltersCount > 0 ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="mt-4 hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 xl:grid-cols-7">
        {codigoField}
        {statusField}
        {municipioField}
        {bairroField}
        {logradouroField}
        {tipologiaField}

        <button
          type="button"
          onClick={clearFilters}
          className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Limpar
        </button>
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
          className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Filtros</h3>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {codigoField}

              <section className="rounded-xl border border-slate-200 bg-slate-50">
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

              <section className="rounded-xl border border-slate-200 bg-slate-50">
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

              <section className="rounded-xl border border-slate-200 bg-slate-50">
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

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="h-10 rounded-lg border border-blue-300 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
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