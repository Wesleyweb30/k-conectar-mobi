import { Suspense } from "react";
import Link from "next/link";
import {
  FORM_ID_MANUTENCAO,
  getProduttivoAccountMembers,
  getProduttivoFormFillCount,
  getProduttivoFormFills,
} from "@/service/produttivo.service";
import { getPedMapForItems } from "@/service/produttivo.service";
import ProduttivoListFilters from "@/components/admin/produttivo-list-filters";
import ProduttivoFillList from "@/components/admin/produttivo-fill-list";

const BASE_PATH = "/admin/produttivo/manutencao";
const PER_PAGE = 20;

type PageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    page?: string;
  }>;
};

/** Converte YYYY-MM-DD → DD/MM/YYYY */
function toApiDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Retorna intervalo DD/MM/YYYY + label para um mês relativo ao mês atual */
function getMonthRange(now: Date, offset: number) {
  const year = now.getFullYear();
  const month = now.getMonth() - offset;
  const date = new Date(year, month, 1);
  const y = date.getFullYear();
  const mo = date.getMonth();
  const lastDay = new Date(y, mo + 1, 0).getDate();
  const mm = String(mo + 1).padStart(2, "0");
  return {
    start: `01/${mm}/${y}`,
    end: `${lastDay}/${mm}/${y}`,
    label: date.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export default async function ManutencaoPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawStart = params.startDate ?? "";
  const rawEnd = params.endDate ?? "";
  const userId = params.userId ? parseInt(params.userId, 10) : undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;

  const apiStart = rawStart ? toApiDate(rawStart) : undefined;
  const apiEnd = rawEnd ? toApiDate(rawEnd) : undefined;

  const now = new Date();
  const monthRanges = [0, 1, 2].map((offset) => getMonthRange(now, offset));

  const [response, membersResponse, ...monthCounts] = await Promise.all([
    getProduttivoFormFills({
      formId: FORM_ID_MANUTENCAO,
      startDate: apiStart,
      endDate: apiEnd,
      userId,
      page,
      perPage: PER_PAGE,
    }),
    getProduttivoAccountMembers().catch(() => ({ results: [] })),
    ...monthRanges.map((m) =>
      getProduttivoFormFillCount({
        formId: FORM_ID_MANUTENCAO,
        startDate: m.start,
        endDate: m.end,
        userId,
      })
    ),
  ]);

  const items = response.results ?? [];
  const total = response.meta?.count ?? 0;
  const members = membersResponse.results ?? [];

  const pedMap = await getPedMapForItems(items);

  const monthData = monthRanges.map((m, i) => ({
    label: m.label,
    count: monthCounts[i] as number,
  }));
  const maxCount = Math.max(...monthData.map((d) => d.count), 1);

  // Params para preservar na paginação
  const preserveParams: Record<string, string> = {};
  if (rawStart) preserveParams.startDate = rawStart;
  if (rawEnd) preserveParams.endDate = rawEnd;
  if (params.userId) preserveParams.userId = params.userId;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/20 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/produttivo"
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                ← Analytics Produttivo
              </Link>
            </div>
            <span className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Manutenção
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Registros de Manutenção</h1>
            <p className="mt-1 text-sm text-slate-600">
              Lista completa dos formulários de manutenção preenchidos no Produttivo.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-amber-700">Total de registros</p>
            <p className="text-2xl font-bold text-amber-900">{total}</p>
          </div>
        </div>
      </div>

      {/* Comparativo 3 meses */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Comparativo mensal — Manutenção</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            3 meses
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {monthData.map((item, idx) => {
            const percent = (item.count / maxCount) * 100;
            return (
              <div
                key={item.label}
                className={`rounded-xl border px-4 py-3 ${
                  idx === 0 ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-800">{item.label}</p>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        mês atual
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-slate-900">{item.count}</p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${percent.toFixed(1)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[11px] text-slate-500">
                  {percent.toFixed(1)}% do maior volume
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <Suspense>
        <ProduttivoListFilters basePath={BASE_PATH} members={members} />
      </Suspense>

      {/* Aviso de filtro ativo */}
      {(rawStart || rawEnd || userId) && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-2 text-sm text-amber-700">
          Filtrando por:{" "}
          {rawStart && rawEnd && (
            <strong>{rawStart.split("-").reverse().join("/")} → {rawEnd.split("-").reverse().join("/")}</strong>
          )}
          {userId && (
            <>
              {" · "}
              <strong>Técnico #{userId}</strong>
            </>
          )}
        </div>
      )}

      {/* Lista */}
      <ProduttivoFillList
        items={items}
        total={total}
        page={page}
        basePath={BASE_PATH}
        preserveParams={preserveParams}
        accentColor="amber"
        pedMap={pedMap}
      />
    </div>
  );
}
