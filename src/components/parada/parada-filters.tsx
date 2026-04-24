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

  const nextQuery = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentQuery = searchParams.toString();
      if (currentQuery !== nextQuery) {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nextQuery, pathname, router, searchParams]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 mt-4">
      <input
        type="text"
        inputMode="numeric"
        value={filters.codigo}
        onChange={(event) => {
          const digitsOnly = event.target.value.replace(/\D/g, "");
          setFilters((prev) => ({ ...prev, codigo: digitsOnly }));
        }}
        placeholder="Código"
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />

      <select
        value={filters.status}
        onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Status (todos)</option>
        <option value="__EMPTY__">Status vazio</option>
        {distinctValues.status.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={filters.municipio}
        onChange={(event) => setFilters((prev) => ({ ...prev, municipio: event.target.value }))}
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Município (todos)</option>
        {distinctValues.municipio.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={filters.bairro}
        onChange={(event) => setFilters((prev) => ({ ...prev, bairro: event.target.value }))}
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Bairro (todos)</option>
        {distinctValues.bairro.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={filters.logradouro}
        onChange={(event) => setFilters((prev) => ({ ...prev, logradouro: event.target.value }))}
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Logradouro (todos)</option>
        {distinctValues.logradouro.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={filters.novaTipologia}
        onChange={(event) =>
          setFilters((prev) => ({ ...prev, novaTipologia: event.target.value }))
        }
        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Nova tipologia (todas)</option>
        {distinctValues.novaTipologia.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          setFilters({
            codigo: "",
            status: "",
            municipio: "",
            bairro: "",
            logradouro: "",
            novaTipologia: "",
          })
        }
        className="h-10 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
      >
        Limpar
      </button>
    </div>
  );
}