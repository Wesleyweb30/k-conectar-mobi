"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { ProduttivoAccountMember } from "@/types/produttivo";

type Props = {
  basePath: string;
  members: ProduttivoAccountMember[];
  showSearchFields?: boolean;
};

export default function ProduttivoListFilters({ basePath, members, showSearchFields = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [userId, setUserId] = useState(searchParams.get("userId") ?? "");
  const [pedSearch, setPedSearch] = useState(searchParams.get("pedSearch") ?? "");
  const [executorSearch, setExecutorSearch] = useState(searchParams.get("executorSearch") ?? "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (userId) params.set("userId", userId);
    if (pedSearch) params.set("pedSearch", pedSearch);
    if (executorSearch) params.set("executorSearch", executorSearch);
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }, [router, basePath, startDate, endDate, userId, pedSearch, executorSearch]);

  const clearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setUserId("");
    setPedSearch("");
    setExecutorSearch("");
    router.push(basePath);
  }, [router, basePath]);

  const hasActiveFilters =
    searchParams.has("startDate") ||
    searchParams.has("endDate") ||
    searchParams.has("userId") ||
    searchParams.has("pedSearch") ||
    searchParams.has("executorSearch");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>

      {showSearchFields && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Buscar por PED</label>
            <input
              type="text"
              value={pedSearch}
              onChange={(e) => setPedSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Ex: 160444"
              className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Buscar por Executor</label>
            <input
              type="text"
              value={executorSearch}
              onChange={(e) => setExecutorSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Nome do executor..."
              className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Data inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Data final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
          />
        </div>

        {members.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Técnico</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email ?? `ID ${m.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={applyFilters}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Aplicar
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
