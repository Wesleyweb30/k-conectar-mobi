import Link from "next/link";
import {
  FORM_ID_MANUTENCAO,
  getProduttivoAppBaseUrl,
  getProduttivoForms,
  getProduttivoWorks,
  type ProduttivoWorksQueryParams,
} from "@/service/produttivo.service";
import type { ProduttivoForm, ProduttivoWork } from "@/types/produttivo";
import { buildHref } from "@/lib/url-search-params";

type RawSearchParam = string | string[] | undefined;

type PageSearchParams = {
  q?: RawSearchParam;
  page?: RawSearchParam;
  started_range_time?: RawSearchParam;
  started_from?: RawSearchParam;
  started_to?: RawSearchParam;
};

type Props = {
  searchParams?: Promise<PageSearchParams>;
  basePath: string;
  backHref: string;
  backLabel: string;
};

function firstValue(value: RawSearchParam): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  const parsed = value?.trim();
  return parsed || undefined;
}

function toPositiveInt(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDays(baseDate: Date, days: number): Date {
  const next = new Date(baseDate);
  next.setDate(next.getDate() - days);
  return next;
}

function isoToBrDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function brToIsoDate(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseStartedRangeTime(value: string): { from: string; to: string } {
  const [rawFrom = "", rawTo = ""] = value.split("-").map((part) => part.trim());
  return {
    from: brToIsoDate(rawFrom),
    to: brToIsoDate(rawTo),
  };
}

function buildStartedRangeTime(fromIso: string, toIso: string): string {
  if (!fromIso || !toIso) return "";
  const fromBr = isoToBrDate(fromIso);
  const toBr = isoToBrDate(toIso);
  if (!fromBr || !toBr) return "";
  return `${fromBr} - ${toBr}`;
}

function formatDate(date?: string | null): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR");
}

function parseQueryFilters(
  params: Awaited<Props["searchParams"]>,
): {
  filters: ProduttivoWorksQueryParams;
  page: number;
  qValue: string;
  startedFromValue: string;
  startedToValue: string;
} {
  const q = firstValue(params?.q) ?? "";
  const page = toPositiveInt(firstValue(params?.page)) ?? 1;
  const startedRangeTimeRaw = firstValue(params?.started_range_time) ?? "";
  const parsedRange = parseStartedRangeTime(startedRangeTimeRaw);
  const startedFromValue = firstValue(params?.started_from) ?? parsedRange.from;
  const startedToValue = firstValue(params?.started_to) ?? parsedRange.to;
  const startedRangeTime = buildStartedRangeTime(startedFromValue, startedToValue);

  return {
    filters: {
      q: q || undefined,
      page,
      orderType: "desc",
      includeTeamWorks: true,
      formId: FORM_ID_MANUTENCAO,
      formIds: [FORM_ID_MANUTENCAO],
      startedRangeTime: startedRangeTime || undefined,
      perPage: 20,
    },
    page,
    qValue: q,
    startedFromValue,
    startedToValue,
  };
}

function buildPageHref(page: number, currentParams: URLSearchParams, basePath: string): string {
  const nextParams = new URLSearchParams(currentParams.toString());
  nextParams.set("page", String(page));
  return `${basePath}?${nextParams.toString()}`;
}

function statusBadgeClass(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "finished" || normalized === "done" || normalized === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (normalized === "started" || normalized === "in_progress") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (normalized === "canceled" || normalized === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatStatusLabel(status?: string | null): string {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "finished" || normalized === "done" || normalized === "completed") {
    return "Concluída";
  }
  if (normalized === "not_started") {
    return "Não iniciada";
  }
  if (normalized === "started" || normalized === "in_progress") {
    return "Em andamento";
  }
  if (normalized === "canceled" || normalized === "cancelled") {
    return "Cancelada";
  }
  if (normalized === "reviewed") {
    return "Revisada";
  }

  return status?.trim() || "-";
}

function WorkRow({
  work,
  appBaseUrl,
  formNameById,
  basePath,
}: {
  work: ProduttivoWork;
  appBaseUrl: string;
  formNameById: Map<number, string>;
  basePath: string;
}) {
  const formLabel =
    typeof work.form_id === "number"
      ? (formNameById.get(work.form_id) ?? `Formulario #${work.form_id}`)
      : "-";

  return (
    <tr className="border-b border-slate-100 align-top last:border-none">
      <td className="px-4 py-3 text-sm font-semibold text-slate-900">#{work.id}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{work.title || "-"}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{work.work_number ?? "-"}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{formLabel}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{work.account_id ?? "-"}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(work.status)}`}>
          {formatStatusLabel(work.status)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(work.updated_at)}</td>
      <td className="px-4 py-3 text-right text-sm">
        <div className="flex justify-end gap-2">
          <Link
            href={`/atividades/${work.id}?returnTo=${encodeURIComponent(basePath)}`}
            className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Ver detalhe
          </Link>
          <a
            href={`${appBaseUrl}/works/${work.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
          >
            Abrir no Produttivo
          </a>
        </div>
      </td>
    </tr>
  );
}

function formatFormLabel(form: ProduttivoForm): string {
  const name = (form.name ?? "").trim();
  return name || `Formulário #${form.id}`;
}

export default async function WorksListPage({
  searchParams,
  basePath,
  backHref,
  backLabel,
}: Props) {
  const params = (await searchParams) ?? {};
  const {
    filters,
    page,
    qValue,
    startedFromValue,
    startedToValue,
  } = parseQueryFilters(params);

  const [response, formsResponse] = await Promise.all([
    getProduttivoWorks(filters).catch(
      (): Awaited<ReturnType<typeof getProduttivoWorks>> => ({ results: [] }),
    ),
    getProduttivoForms({ actives: true, perPage: 500 }).catch(() => ({ results: [] })),
  ]);

  const works = (response.results ?? [])
    .filter((work) => work.form_id === FORM_ID_MANUTENCAO)
    .slice()
    .sort((a, b) => {
      const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : Number.NaN;
      const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : Number.NaN;

      const aTime = Number.isFinite(aUpdated)
        ? aUpdated
        : new Date(a.created_at ?? a.start_time ?? 0).getTime();
      const bTime = Number.isFinite(bUpdated)
        ? bUpdated
        : new Date(b.created_at ?? b.start_time ?? 0).getTime();

      if (bTime !== aTime) return bTime - aTime;
      return b.id - a.id;
    });
  const formNameById = new Map<number, string>(
    (formsResponse.results ?? []).map((form): [number, string] => [form.id, formatFormLabel(form)]),
  );
  const currentPage = response.meta?.current_page ?? page;
  const totalPages = response.meta?.total_pages ?? 1;
  const appBaseUrl = getProduttivoAppBaseUrl();

  const rawSearch = buildHref(
    basePath,
    {
      ...(qValue ? { q: qValue } : {}),
      ...(startedFromValue ? { started_from: startedFromValue } : {}),
      ...(startedToValue ? { started_to: startedToValue } : {}),
    },
    currentPage,
  );

  const currentParams = new URL(rawSearch, "https://example.local").searchParams;
  const invalidRange = Boolean(
    startedFromValue && startedToValue && startedFromValue > startedToValue,
  );

  const todayIso = toIsoDate(new Date());
  const last7Iso = toIsoDate(subtractDays(new Date(), 6));
  const last30Iso = toIsoDate(subtractDays(new Date(), 29));

  const todayHref = buildHref(basePath, {
    ...(qValue ? { q: qValue } : {}),
    started_from: todayIso,
    started_to: todayIso,
  }, 1);

  const last7Href = buildHref(basePath, {
    ...(qValue ? { q: qValue } : {}),
    started_from: last7Iso,
    started_to: todayIso,
  }, 1);

  const last30Href = buildHref(basePath, {
    ...(qValue ? { q: qValue } : {}),
    started_from: last30Iso,
    started_to: todayIso,
  }, 1);

  const clearRangeHref = buildHref(basePath, {
    ...(qValue ? { q: qValue } : {}),
  }, 1);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Produttivo
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Atividades Manutenção</h1>
            <p className="mt-1 text-sm text-slate-600">
              Consulta de atividades de manutenção com filtros do endpoint /works.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Ordenação: mais recentes para mais antigas por Atualizada em.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/atividades/nova?returnTo=${encodeURIComponent(basePath)}`}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Criar atividade de manutenção
            </Link>
            <Link
              href={backHref}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {backLabel}
            </Link>
          </div>
        </div>
      </div>

      <form method="GET" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pesquisa (q)</span>
            <input
              name="q"
              defaultValue={qValue}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Texto livre (titulo, contato, etc)"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Iniciado de</span>
            <input
              type="date"
              name="started_from"
              defaultValue={startedFromValue}
              max={startedToValue || undefined}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Iniciado até</span>
            <input
              type="date"
              name="started_to"
              defaultValue={startedToValue}
              min={startedFromValue || undefined}
              max={todayIso}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
        </div>

        {invalidRange ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            Intervalo inválido: a data inicial deve ser menor ou igual à data final.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Períodos rápidos</span>
          <Link href={todayHref} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
            Hoje
          </Link>
          <Link href={last7Href} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
            Últimos 7 dias
          </Link>
          <Link href={last30Href} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
            Últimos 30 dias
          </Link>
          <Link href={clearRangeHref} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            Limpar período
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
          >
            Aplicar filtros
          </button>
          <Link
            href={basePath}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Limpar
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-600">
            {response.meta?.count ?? works.length} atividade(s) encontrada(s)
          </p>
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Título</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Form</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Atualizada em</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {works.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhuma atividade encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                works.map((work) => (
                  <WorkRow
                    key={work.id}
                    work={work}
                    appBaseUrl={appBaseUrl}
                    formNameById={formNameById}
                    basePath={basePath}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <Link
            href={buildPageHref(Math.max(currentPage - 1, 1), currentParams, basePath)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              currentPage <= 1
                ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildPageHref(Math.min(currentPage + 1, totalPages), currentParams, basePath)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              currentPage >= totalPages
                ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Proxima
          </Link>
        </div>
      </div>
    </section>
  );
}
