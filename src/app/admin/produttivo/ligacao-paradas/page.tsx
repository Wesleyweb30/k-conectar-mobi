import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  extractPedFromTitle,
  FORM_ID_MANUTENCAO,
  getProduttivoFormFills,
  getProduttivoWork,
} from "@/service/produttivo.service";
import GoToRoutesButton from "@/components/parada/go-to-routes-button";
import type { ProduttivoFieldValue, ProduttivoManutencaoItem } from "@/types/produttivo";

type PageProps = {
  searchParams?: Promise<{
    codigo?: string;
    municipio?: string;
    bairro?: string;
    legenda?: string | string[];
    manutencao?: string;
    run?: string;
    refresh?: string;
    page?: string;
  }>;
};

type ParadaAtiva = {
  id: string;
  codigo: string;
  municipio: string;
  bairro: string;
  status: string;
  tipologia: string;
  ultimaAtividadeEm: string | null;
  logradouro: string | null;
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  latitude: number | null;
  longitude: number | null;
};

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

type RiskTone = "red" | "orange" | "yellow" | "green";

type RiskInfo = {
  tone: RiskTone;
  label: string;
};

type MaintenanceFilter = "all" | "with" | "without";

const PAGE_SIZE = 25;
const PRODUTTIVO_PER_PAGE = 100;
const ACTIVITY_SCAN_MAX_PAGES = 40;
const WORK_BATCH_SIZE = 20;

let workPedCache = new Map<number, string | null>();
let latestActivityCache = new Map<string, string | null>();

function normalizeInput(value?: string) {
  if (!value) return "";
  return value.trim();
}

function normalizePed(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return digits.replace(/^0+(?=\d)/, "");
}

function normalizeLegendas(value: string | string[] | undefined): RiskTone[] {
  if (!value) return [];

  const raw = Array.isArray(value) ? value : [value];
  const allowed: RiskTone[] = ["red", "orange", "yellow", "green"];

  return [...new Set(raw)].filter((item): item is RiskTone =>
    allowed.includes(item as RiskTone)
  );
}

function normalizeMaintenanceFilter(value?: string): MaintenanceFilter {
  if (value === "with") return "with";
  if (value === "without") return "without";
  return "all";
}

function hasLatestMaintenance(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime());
}

function matchesMaintenanceFilter(
  iso: string | null,
  maintenanceFilter: MaintenanceFilter
): boolean {
  if (maintenanceFilter === "all") return true;
  const hasMaintenance = hasLatestMaintenance(iso);
  return maintenanceFilter === "with" ? hasMaintenance : !hasMaintenance;
}

function extractPedFromFieldValues(fieldValues: ProduttivoFieldValue[]): string | null {
  const candidates = fieldValues
    .filter((field) => field.name?.toLowerCase().includes("atividade"))
    .map((field) => (Array.isArray(field.value) ? field.value[0] : field.value))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const candidate of candidates) {
    const fromArrow = candidate.match(/>\s*(\d+)\s*$/);
    if (fromArrow) return fromArrow[1];

    if (/^\d+$/.test(candidate)) return candidate;

    if (!/[a-zA-Z]/.test(candidate) && /\d/.test(candidate)) {
      const digitsOnly = candidate.replace(/\D/g, "");
      if (digitsOnly) return digitsOnly;
    }
  }

  return null;
}

function buildHref(params: Record<string, string | string[]>, page: number) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) sp.append(key, item);
      }
    } else if (value) {
      sp.set(key, value);
    }
  }
  sp.set("page", String(page));
  return `/admin/produttivo/ligacao-paradas?${sp.toString()}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sem historico";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sem historico";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRiskInfo(iso: string | null): RiskInfo {
  if (!iso) {
    return { tone: "red", label: "Sem manutencao" };
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { tone: "red", label: "Sem manutencao" };
  }

  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 90) return { tone: "red", label: `${diffDays} dias` };
  if (diffDays >= 60) return { tone: "orange", label: `${diffDays} dias` };
  if (diffDays >= 30) return { tone: "yellow", label: `${diffDays} dias` };
  return { tone: "green", label: `${diffDays} dias` };
}

function toneBadgeClass(tone: RiskTone): string {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700";
  if (tone === "orange") return "border-orange-200 bg-orange-50 text-orange-700";
  if (tone === "yellow") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function matchesLegendFilter(tone: RiskTone, legendas: RiskTone[]): boolean {
  if (legendas.length === 0) return true;
  return legendas.includes(tone);
}

async function resolvePedFromWorkId(workId: number): Promise<string | null> {
  if (workPedCache.has(workId)) {
    return workPedCache.get(workId) ?? null;
  }

  const work = await getProduttivoWork(workId).catch(() => null);
  const pedFromTitle = normalizePed(extractPedFromTitle(work?.title));
  const pedFromWorkNumber = normalizePed(work?.work_number ? String(work.work_number) : null);
  const ped = pedFromTitle ?? pedFromWorkNumber ?? null;

  workPedCache.set(workId, ped);
  return ped;
}

async function getLatestActivityByPeds(
  peds: string[],
  forceRefresh: boolean
): Promise<Map<string, string | null>> {
  const normalized = [
    ...new Set(
      peds
        .map((ped) => normalizePed(ped))
        .filter((ped): ped is string => Boolean(ped))
    ),
  ];

  const pending = new Set(
    normalized.filter((ped) => forceRefresh || !latestActivityCache.has(ped))
  );

  for (let page = 1; page <= ACTIVITY_SCAN_MAX_PAGES && pending.size > 0; page += 1) {
    const response = await getProduttivoFormFills({
      formId: FORM_ID_MANUTENCAO,
      page,
      perPage: PRODUTTIVO_PER_PAGE,
    }).catch(() => ({ results: [] }));

    const items: ProduttivoManutencaoItem[] = response.results ?? [];
    if (items.length === 0) break;

    const workIds = items
      .map((item) => item.work_id)
      .filter((workId): workId is number => Boolean(workId));

    const uniqueWorkIds = [...new Set(workIds)];
    for (let i = 0; i < uniqueWorkIds.length; i += WORK_BATCH_SIZE) {
      const batch = uniqueWorkIds.slice(i, i + WORK_BATCH_SIZE);
      await Promise.all(batch.map((id) => resolvePedFromWorkId(id)));
    }

    for (const item of items) {
      const fromField = normalizePed(extractPedFromFieldValues(item.field_values));
      const fromWork = item.work_id ? (workPedCache.get(item.work_id) ?? null) : null;
      const ped = fromField ?? fromWork;

      if (!ped || !pending.has(ped)) continue;

      latestActivityCache.set(ped, item.created_at);
      pending.delete(ped);
    }
  }

  for (const ped of pending) {
    latestActivityCache.set(ped, null);
  }

  const result = new Map<string, string | null>();
  for (const ped of normalized) {
    result.set(ped, latestActivityCache.get(ped) ?? null);
  }

  return result;
}

export default async function LigacaoParadasPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const codigo = normalizeInput(params.codigo);
  const municipio = normalizeInput(params.municipio);
  const bairro = normalizeInput(params.bairro);
  const legendas = normalizeLegendas(params.legenda);
  const maintenanceFilter = normalizeMaintenanceFilter(params.manutencao);
  const shouldRun = params.run === "1";
  const shouldRefresh = params.refresh === "1";

  const pageRaw = Number(params.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const activeWhere = {
    status: {
      equals: "ativo",
      mode: "insensitive" as const,
    },
    ...(codigo ? { codigo: { startsWith: codigo } } : {}),
    ...(municipio
      ? {
          municipio: {
            equals: municipio,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(bairro
      ? {
          bairro: {
            equals: bairro,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [municipiosRows, bairrosRows] = await Promise.all([
    prisma.parada.findMany({
      distinct: ["municipio"],
      where: {
        status: {
          equals: "ativo",
          mode: "insensitive",
        },
        municipio: { not: null },
      },
      select: { municipio: true },
      orderBy: { municipio: "asc" },
    }),
    prisma.parada.findMany({
      distinct: ["bairro"],
      where: {
        status: {
          equals: "ativo",
          mode: "insensitive",
        },
        bairro: { not: null },
      },
      select: { bairro: true },
      orderBy: { bairro: "asc" },
    }),
  ]);

  let total = 0;
  let pageItems: ParadaAtiva[] = [];
  let routeSelectionItems: RouteSelectionPayloadItem[] = [];
  let redCount = 0;
  let orangeCount = 0;
  let yellowCount = 0;
  let greenCount = 0;

  if (shouldRun) {
    const allParadas = await prisma.parada.findMany({
      where: activeWhere,
      select: {
        id: true,
        codigo: true,
        municipio: true,
        bairro: true,
        logradouro: true,
        status: true,
        tipologiaAtual: true,
        quantidadeAbrigosTotens: true,
        novaTipologia: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ municipio: "asc" }, { bairro: "asc" }, { codigo: "asc" }],
    });

    const allPeds = allParadas
      .map((item) => normalizePed(item.codigo))
      .filter((ped): ped is string => Boolean(ped));

    const latestByPed = allPeds.length > 0
      ? await getLatestActivityByPeds(allPeds, shouldRefresh)
      : new Map<string, string | null>();

    const allItems: ParadaAtiva[] = allParadas.map((parada) => {
      const ped = normalizePed(parada.codigo);
      const latest = ped ? latestByPed.get(ped) ?? null : null;
      return {
        id: parada.id,
        codigo: parada.codigo,
        municipio: parada.municipio ?? "Nao informado",
        bairro: parada.bairro ?? "Nao informado",
        status: parada.status ?? "Ativo",
        tipologia: parada.novaTipologia ?? "Nao informada",
        ultimaAtividadeEm: latest,
        logradouro: parada.logradouro,
        quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens,
        tipologiaAtual: parada.tipologiaAtual,
        latitude: parada.latitude,
        longitude: parada.longitude,
      };
    });

    const maintenanceFilteredItems = allItems.filter((item) =>
      matchesMaintenanceFilter(item.ultimaAtividadeEm, maintenanceFilter)
    );

    for (const item of maintenanceFilteredItems) {
      const tone = getRiskInfo(item.ultimaAtividadeEm).tone;
      if (tone === "red") redCount += 1;
      else if (tone === "orange") orangeCount += 1;
      else if (tone === "yellow") yellowCount += 1;
      else greenCount += 1;
    }

    const legendFilteredItems = maintenanceFilteredItems.filter((item) => {
      const tone = getRiskInfo(item.ultimaAtividadeEm).tone;
      return matchesLegendFilter(tone, legendas);
    });

    routeSelectionItems = legendFilteredItems
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item) => ({
        id: item.id,
        codigo: item.codigo,
        municipio: item.municipio,
        bairro: item.bairro,
        logradouro: item.logradouro,
        quantidadeAbrigosTotens: item.quantidadeAbrigosTotens,
        tipologiaAtual: item.tipologiaAtual,
        novaTipologia: item.tipologia,
        latitude: item.latitude as number,
        longitude: item.longitude as number,
      }));

    total = legendFilteredItems.length;
    const totalPagesForSlice = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePageForSlice = Math.min(page, totalPagesForSlice);
    const skip = (safePageForSlice - 1) * PAGE_SIZE;
    pageItems = legendFilteredItems.slice(skip, skip + PAGE_SIZE);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);

  const preserveParams: Record<string, string | string[]> = {};
  if (codigo) preserveParams.codigo = codigo;
  if (municipio) preserveParams.municipio = municipio;
  if (bairro) preserveParams.bairro = bairro;
  if (maintenanceFilter !== "all") preserveParams.manutencao = maintenanceFilter;
  if (legendas.length > 0) preserveParams.legenda = legendas;
  if (shouldRun) preserveParams.run = "1";

  const municipios = municipiosRows
    .map((item) => item.municipio)
    .filter((value): value is string => Boolean(value && value.trim()));

  const bairros = bairrosRows
    .map((item) => item.bairro)
    .filter((value): value is string => Boolean(value && value.trim()));

  const rotasParams = new URLSearchParams();
  rotasParams.set("status", "Ativo");
  if (codigo) rotasParams.set("codigo", codigo);
  if (municipio) rotasParams.set("municipio", municipio);
  if (bairro) rotasParams.set("bairro", bairro);
  if (maintenanceFilter !== "all") rotasParams.set("manutencao", maintenanceFilter);
  rotasParams.set("page", "1");
  const rotasHref = `/paradas/rotas?${rotasParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/50 to-emerald-50/30 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Link href="/admin/produttivo" className="text-xs font-medium text-slate-500 hover:text-slate-700">
                ← Analytics Produttivo
              </Link>
            </div>
            <span className="mt-2 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Radar de Ativos
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">PEDs Ativos e Ultimas Manutencoes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Lista somente paradas com status ativo e classifica por criticidade de tempo sem manutencao.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-cyan-700">Paradas ativas</p>
            <p className="text-2xl font-bold text-cyan-900">{total}</p>
            <p className="text-xs text-cyan-700">Com filtros atuais</p>
          </div>
        </div>

        <form className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 md:grid-cols-5">
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
              href="/admin/produttivo/ligacao-paradas"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-xl border border-cyan-600 bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Ver avisos
            </button>
            <input type="hidden" name="run" value="1" />
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Legenda de criticidade para paradas ativas: vermelho (3 meses ou mais), laranja (2 meses), amarelo (1 mes), verde (menos de 1 mes).
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${toneBadgeClass("red")}`}>
            Vermelho: 3+ meses ({redCount})
          </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${toneBadgeClass("orange")}`}>
            Laranja: 2+ meses ({orangeCount})
          </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${toneBadgeClass("yellow")}`}>
            Amarelo: 1+ mes ({yellowCount})
          </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${toneBadgeClass("green")}`}>
            Verde: menor que 1 mes ({greenCount})
          </span>
        </div>
        {shouldRun && (
          <div className="mt-3">
            {(() => {
              const refreshParams = new URLSearchParams();
              refreshParams.set("run", "1");
              refreshParams.set("refresh", "1");
              if (codigo) refreshParams.set("codigo", codigo);
              if (municipio) refreshParams.set("municipio", municipio);
              if (bairro) refreshParams.set("bairro", bairro);
              if (maintenanceFilter !== "all") refreshParams.set("manutencao", maintenanceFilter);
              for (const legenda of legendas) {
                refreshParams.append("legenda", legenda);
              }
              return (
                <Link
                  href={`/admin/produttivo/ligacao-paradas?${refreshParams.toString()}`}
                  className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                >
                  Atualizar datas da manutencao
                </Link>
              );
            })()}
          </div>
        )}
      </div>

      {!shouldRun ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          Clique em <strong>Ver avisos</strong> para listar os PEDs ativos e suas ultimas manutencoes.
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center text-sm text-emerald-800">
          Nenhuma parada ativa encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              PEDs ativos com ultima manutencao
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Codigo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Municipio</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Bairro</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Ultima manutencao</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Criticidade</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipologia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((item) => {
                  const risk = getRiskInfo(item.ultimaAtividadeEm);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.codigo}</td>
                      <td className="px-4 py-3 text-slate-700">{item.municipio}</td>
                      <td className="px-4 py-3 text-slate-700">{item.bairro}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(item.ultimaAtividadeEm)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneBadgeClass(risk.tone)}`}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.tipologia}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shouldRun && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span>
            Pagina <strong>{safeCurrentPage}</strong> de <strong>{totalPages}</strong> · {total} paradas ativas
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref(preserveParams, Math.max(1, safeCurrentPage - 1))}
              aria-disabled={safeCurrentPage <= 1}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                safeCurrentPage > 1
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "pointer-events-none border-slate-200 text-slate-400"
              }`}
            >
              Anterior
            </Link>
            <Link
              href={buildHref(preserveParams, Math.min(totalPages, safeCurrentPage + 1))}
              aria-disabled={safeCurrentPage >= totalPages}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                safeCurrentPage < totalPages
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "pointer-events-none border-slate-200 text-slate-400"
              }`}
            >
              Proxima
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
