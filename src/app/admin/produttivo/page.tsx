import { Suspense } from "react";
import Link from "next/link";
import {
  FORM_ID_IMPLANTACAO,
  FORM_ID_INSTALACAO_ELETRICA,
  FORM_ID_MANUTENCAO,
  getProduttivoAccountMembers,
  getProduttivoFormFillCount,
} from "@/service/produttivo.service";
import ProduttivoFilters from "@/components/admin/produttivo-filters";

type PageProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
  }>;
};

/** Converte YYYY-MM-DD para DD/MM/YYYY (formato aceito pela API) */
function toApiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/** Retorna { start, end } no formato DD/MM/YYYY para um determinado mês */
function getMonthRange(year: number, month: number): { start: string; end: string; label: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return {
    start: `01/${mm}/${year}`,
    end: `${lastDay}/${mm}/${year}`,
    label: new Date(year, month, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export default async function AdminProduttivoPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawStart = params.startDate ?? "";
  const rawEnd = params.endDate ?? "";
  const rawUserId = params.userId ? parseInt(params.userId, 10) : undefined;

  const isFiltered = Boolean(rawStart && rawEnd);

  // Busca membros para o dropdown de filtro
  const membersResponse = await getProduttivoAccountMembers().catch(() => ({ results: [] }));
  const members = membersResponse.results ?? [];

  const now = new Date();

  if (isFiltered) {
    // ── Modo filtrado: exibe contagem no período selecionado ──────────────────
    const apiStart = toApiDate(rawStart);
    const apiEnd = toApiDate(rawEnd);

    const [manuCount, implCount, eletricaCount] = await Promise.all([
      getProduttivoFormFillCount({ startDate: apiStart, endDate: apiEnd, formId: FORM_ID_MANUTENCAO, userId: rawUserId }),
      getProduttivoFormFillCount({ startDate: apiStart, endDate: apiEnd, formId: FORM_ID_IMPLANTACAO, userId: rawUserId }),
      getProduttivoFormFillCount({ startDate: apiStart, endDate: apiEnd, formId: FORM_ID_INSTALACAO_ELETRICA, userId: rawUserId }),
    ]);

    const total = manuCount + implCount + eletricaCount;
    const memberName = rawUserId
      ? (members.find((m) => m.id === rawUserId)?.name ?? `ID ${rawUserId}`)
      : "Todos";

    return (
      <div className="space-y-6">
        <PageHeader />

        <Suspense>
          <ProduttivoFilters members={members} />
        </Suspense>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-3 text-sm text-violet-700">
          Mostrando resultados de{" "}
          <strong>{rawStart.split("-").reverse().join("/")}</strong> a{" "}
          <strong>{rawEnd.split("-").reverse().join("/")}</strong> · Técnico:{" "}
          <strong>{memberName}</strong>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Manutenção"
            value={manuCount}
            color="amber"
            description="Formulários de manutenção no período"
            href="/admin/produttivo/manutencao"
          />
          <MetricCard
            label="Implantação"
            value={implCount}
            color="sky"
            description="Formulários de implantação no período"
            href="/admin/produttivo/implantacao"
          />
          <MetricCard
            label="Instalação Elétrica"
            value={eletricaCount}
            color="emerald"
            description="Formulários de instalação elétrica no período"
            href="/admin/produttivo/instalacao-eletrica"
          />
          <MetricCard
            label="Total"
            value={total}
            color="violet"
            description="Soma de todos os registros"
          />
        </div>
      </div>
    );
  }

  // ── Modo padrão: comparação dos 3 últimos meses ───────────────────────────
  const monthRanges = [0, 1, 2].map((offset) =>
    getMonthRange(now.getFullYear(), now.getMonth() - offset)
  );

  const [manuCounts, implCounts, eletricaCounts] = await Promise.all([
    Promise.all(
      monthRanges.map((m) =>
        getProduttivoFormFillCount({
          startDate: m.start,
          endDate: m.end,
          formId: FORM_ID_MANUTENCAO,
          userId: rawUserId,
        })
      )
    ),
    Promise.all(
      monthRanges.map((m) =>
        getProduttivoFormFillCount({
          startDate: m.start,
          endDate: m.end,
          formId: FORM_ID_IMPLANTACAO,
          userId: rawUserId,
        })
      )
    ),
    Promise.all(
      monthRanges.map((m) =>
        getProduttivoFormFillCount({
          startDate: m.start,
          endDate: m.end,
          formId: FORM_ID_INSTALACAO_ELETRICA,
          userId: rawUserId,
        })
      )
    ),
  ]);

  const monthData = monthRanges.map((m, i) => ({
    label: m.label,
    manutencao: manuCounts[i],
    implantacao: implCounts[i],
    eletrica: eletricaCounts[i],
    total: manuCounts[i] + implCounts[i] + eletricaCounts[i],
  }));

  const maxTotal = Math.max(...monthData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <PageHeader />

      <Suspense>
        <ProduttivoFilters members={members} />
      </Suspense>

      {/* Cards resumo do mês atual */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Manutenção — mês atual"
          value={monthData[0].manutencao}
          color="amber"
          description={monthData[0].label}
          href="/admin/produttivo/manutencao"
        />
        <MetricCard
          label="Implantação — mês atual"
          value={monthData[0].implantacao}
          color="sky"
          description={monthData[0].label}
          href="/admin/produttivo/implantacao"
        />
        <MetricCard
          label="Inst. Elétrica — mês atual"
          value={monthData[0].eletrica}
          color="emerald"
          description={monthData[0].label}
          href="/admin/produttivo/instalacao-eletrica"
        />
        <MetricCard
          label="Total — mês atual"
          value={monthData[0].total}
          color="violet"
          description={monthData[0].label}
        />
      </div>

      {/* Comparativo 3 meses */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Comparativo mensal</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            3 meses
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Contagem de registros de manutenção e implantação por mês.
        </p>

        <div className="mt-5 space-y-4">
          {monthData.map((item, idx) => {
            const barPercent = (item.total / maxTotal) * 100;
            const manuPercent = item.total > 0 ? (item.manutencao / item.total) * 100 : 0;
            const implPercent = item.total > 0 ? (item.implantacao / item.total) * 100 : 0;
            const eletricaPercent = item.total > 0 ? (item.eletrica / item.total) * 100 : 0;

            return (
              <div
                key={item.label}
                className={`rounded-xl border px-4 py-3 ${idx === 0 ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-slate-50/60"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-800">{item.label}</p>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                        mês atual
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-slate-900">{item.total}</p>
                </div>

                {/* Barra empilhada */}
                <div
                  className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"
                  role="img"
                  aria-label={`Total ${item.total} registros em ${item.label}`}
                >
                  <div
                    className="flex h-full rounded-full overflow-hidden"
                    style={{ width: `${barPercent.toFixed(1)}%` }}
                  >
                    <div className="h-full bg-amber-400" style={{ width: `${manuPercent.toFixed(1)}%` }} />
                    <div className="h-full bg-sky-400" style={{ width: `${implPercent.toFixed(1)}%` }} />
                    <div className="h-full bg-emerald-400" style={{ width: `${eletricaPercent.toFixed(1)}%` }} />
                  </div>
                </div>

                {/* Legenda */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    Manutenção: <strong>{item.manutencao}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                    Implantação: <strong>{item.implantacao}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Inst. Elétrica: <strong>{item.eletrica}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-violet-50/40 to-sky-50/30 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
      <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
        Analytics · Produttivo
      </span>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Manutenção, Implantação &amp; Elétrica</h1>
      <p className="mt-1 text-sm text-slate-600">
        Contagem de registros por mês e por tipo de serviço com base nos formulários do Produttivo.
      </p>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  color: "amber" | "sky" | "violet" | "emerald";
  description?: string;
  href?: string;
};

const colorMap: Record<MetricCardProps["color"], string> = {
  amber: "border-amber-200 bg-amber-50/60 text-amber-700 [&_strong]:text-amber-900",
  sky: "border-sky-200 bg-sky-50/60 text-sky-700 [&_strong]:text-sky-900",
  violet: "border-violet-200 bg-violet-50/60 text-violet-700 [&_strong]:text-violet-900",
  emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-700 [&_strong]:text-emerald-900",
};

const hoverMap: Record<MetricCardProps["color"], string> = {
  amber: "hover:bg-amber-100/80",
  sky: "hover:bg-sky-100/80",
  violet: "hover:bg-violet-100/80",
  emerald: "hover:bg-emerald-100/80",
};

function MetricCard({ label, value, color, description, href }: MetricCardProps) {
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-3xl font-bold">
        <strong>{value}</strong>
      </p>
      {description && <p className="mt-1 text-xs capitalize opacity-70">{description}</p>}
      {href && (
        <p className="mt-2 text-[11px] font-semibold opacity-60">Ver registros →</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block rounded-xl border px-4 py-4 transition ${colorMap[color]} ${hoverMap[color]}`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-4 ${colorMap[color]}`}>
      {inner}
    </div>
  );
}
