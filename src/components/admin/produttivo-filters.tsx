"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { ProduttivoAccountMember } from "@/types/produttivo";

type Props = {
  members: ProduttivoAccountMember[];
};

export default function ProduttivoFilters({ members }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [userId, setUserId] = useState(searchParams.get("userId") ?? "");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (userId) params.set("userId", userId);
    router.push(`/admin/produttivo?${params.toString()}`);
  }, [router, startDate, endDate, userId]);

  const clearFilters = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setUserId("");
    router.push("/admin/produttivo");
  }, [router]);

  const hasActiveFilters = searchParams.has("startDate") || searchParams.has("endDate") || searchParams.has("userId");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>
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
