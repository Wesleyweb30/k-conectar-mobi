"use client";

import Link from "next/link";
import { useState } from "react";
import GoToRoutesButton from "@/components/parada/go-to-routes-button";

type RiskTone = "red" | "orange" | "yellow" | "green";
type MaintenanceFilter = "all" | "with" | "without";

type RouteSelectionPayloadItem = {
  id: string;
  codigo: string;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number;
  longitude: number;
};

type Props = {
  codigo: string;
  municipio: string;
  bairro: string;
  municipios: string[];
  bairros: string[];
  legendas: RiskTone[];
  maintenanceFilter: MaintenanceFilter;
  rotasHref: string;
  routeSelectionItems: RouteSelectionPayloadItem[];
  basePath: string;
};

export default function RadarSearchFilters({
  codigo,
  municipio,
  bairro,
  municipios,
  bairros,
  legendas,
  maintenanceFilter,
  rotasHref,
  routeSelectionItems,
  basePath,
}: Props) {
  const [isSearching, setIsSearching] = useState(false);

  function handleSubmit() {
    setIsSearching(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 md:grid-cols-5">
      <div>
        <label htmlFor="codigo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Codigo da parada
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          defaultValue={codigo}
          placeholder="Ex.: 160444"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        />
      </div>

      <div>
        <label htmlFor="municipio" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Municipio
        </label>
        <select
          id="municipio"
          name="municipio"
          defaultValue={municipio}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        >
          <option value="">Todos</option>
          {municipios.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bairro" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bairro
        </label>
        <select
          id="bairro"
          name="bairro"
          defaultValue={bairro}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        >
          <option value="">Todos</option>
          {bairros.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Legendas
        </span>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="legenda" value="red" defaultChecked={legendas.includes("red")} className="h-4 w-4 rounded border-slate-300 text-red-600" />
            Vermelho
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="legenda" value="orange" defaultChecked={legendas.includes("orange")} className="h-4 w-4 rounded border-slate-300 text-orange-600" />
            Laranja
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="legenda" value="yellow" defaultChecked={legendas.includes("yellow")} className="h-4 w-4 rounded border-slate-300 text-amber-600" />
            Amarelo
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="legenda" value="green" defaultChecked={legendas.includes("green")} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
            Verde
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="manutencao" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Situacao manutencao
        </label>
        <select
          id="manutencao"
          name="manutencao"
          defaultValue={maintenanceFilter}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        >
          <option value="all">Todos</option>
          <option value="with">Com ultima manutencao</option>
          <option value="without">Sem manutencao</option>
        </select>
      </div>

      <div className="md:col-span-5 flex flex-wrap items-end justify-end gap-2">
        <GoToRoutesButton href={rotasHref} items={routeSelectionItems} />
        <Link
          href={basePath}
          className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Limpar
        </Link>
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex h-10 items-center rounded-xl border border-cyan-600 bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSearching ? "Buscando..." : "Ver avisos"}
        </button>
        <input type="hidden" name="run" value="1" />
      </div>

      {isSearching && (
        <div className="md:col-span-5 text-right text-xs font-semibold text-cyan-700">
          Consultando dados no Produttivo. Aguarde...
        </div>
      )}
    </form>
  );
}
