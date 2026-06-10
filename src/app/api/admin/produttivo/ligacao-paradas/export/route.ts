import * as XLSX from "xlsx";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractPedFromFieldValues,
  extractPedFromTitle,
  normalizePed,
} from "@/lib/ped-extraction";
import {
  latestActivityCache,
  workPedCache,
  type LatestMaintenance,
} from "@/lib/ligacao-paradas-cache";
import {
  FORM_ID_MANUTENCAO,
  getProduttivoAppBaseUrl,
  getProduttivoFormFills,
  getProduttivoWork,
} from "@/service/produttivo.service";
import type { ProduttivoManutencaoItem } from "@/types/produttivo";

type RiskTone = "red" | "orange" | "yellow" | "green";
type MaintenanceFilter = "all" | "with" | "without";

const PRODUTTIVO_PER_PAGE = 100;
const ACTIVITY_SCAN_MAX_PAGES = 40;
const WORK_BATCH_SIZE = 20;
const FORM_FETCH_BATCH_SIZE = 4;

function normalizeInput(value?: string | null): string {
  if (!value) return "";
  return value.trim();
}

function normalizeMaintenanceFilter(value?: string | null): MaintenanceFilter {
  if (value === "with") return "with";
  if (value === "without") return "without";
  return "all";
}

function normalizeLegendas(params: URLSearchParams): RiskTone[] {
  const raw = params.getAll("legenda");
  const allowed: RiskTone[] = ["red", "orange", "yellow", "green"];

  return [...new Set(raw)].filter((item): item is RiskTone =>
    allowed.includes(item as RiskTone)
  );
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

function getRiskInfo(iso: string | null): { tone: RiskTone; label: string } {
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

function matchesLegendFilter(tone: RiskTone, legendas: RiskTone[]): boolean {
  if (legendas.length === 0) return true;
  return legendas.includes(tone);
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
  peds: string[]
): Promise<Map<string, LatestMaintenance | null>> {
  const normalized = [
    ...new Set(
      peds
        .map((ped) => normalizePed(ped))
        .filter((ped): ped is string => Boolean(ped))
    ),
  ];

  const pending = new Set(
    normalized.filter((ped) => !latestActivityCache.has(ped))
  );

  for (let pageStart = 1; pageStart <= ACTIVITY_SCAN_MAX_PAGES && pending.size > 0; pageStart += FORM_FETCH_BATCH_SIZE) {
    const pages = Array.from(
      { length: Math.min(FORM_FETCH_BATCH_SIZE, ACTIVITY_SCAN_MAX_PAGES - pageStart + 1) },
      (_, idx) => pageStart + idx
    );

    const responses = await Promise.all(
      pages.map((page) =>
        getProduttivoFormFills({
          formId: FORM_ID_MANUTENCAO,
          page,
          perPage: PRODUTTIVO_PER_PAGE,
        }).catch(() => ({ results: [], meta: undefined }))
      )
    );

    let reachedEnd = false;

    for (const response of responses) {
      if (pending.size === 0) break;

      const items: ProduttivoManutencaoItem[] = response.results ?? [];
      if (items.length === 0) {
        reachedEnd = true;
        break;
      }

      const unresolvedWorkIds: number[] = [];
      for (const item of items) {
        const fromField = normalizePed(extractPedFromFieldValues(item.field_values));

        if (fromField && pending.has(fromField)) {
          latestActivityCache.set(fromField, {
            id: item.id,
            createdAt: item.created_at,
          });
          pending.delete(fromField);
          continue;
        }

        if (!fromField && item.work_id) {
          unresolvedWorkIds.push(item.work_id);
        }
      }

      const uniqueWorkIds = [...new Set(unresolvedWorkIds)];
      for (let i = 0; i < uniqueWorkIds.length; i += WORK_BATCH_SIZE) {
        const batch = uniqueWorkIds.slice(i, i + WORK_BATCH_SIZE);
        await Promise.all(batch.map((id) => resolvePedFromWorkId(id)));
      }

      for (const item of items) {
        const fromField = normalizePed(extractPedFromFieldValues(item.field_values));
        if (fromField) continue;

        const fromWork = item.work_id ? (workPedCache.get(item.work_id) ?? null) : null;
        const ped = fromWork;

        if (!ped || !pending.has(ped)) continue;

        latestActivityCache.set(ped, {
          id: item.id,
          createdAt: item.created_at,
        });
        pending.delete(ped);
      }
    }

    if (reachedEnd) break;
  }

  for (const ped of pending) {
    latestActivityCache.set(ped, null);
  }

  const result = new Map<string, LatestMaintenance | null>();
  for (const ped of normalized) {
    result.set(ped, latestActivityCache.get(ped) ?? null);
  }

  return result;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = normalizeInput(searchParams.get("codigo"));
  const municipio = normalizeInput(searchParams.get("municipio"));
  const bairro = normalizeInput(searchParams.get("bairro"));
  const maintenanceFilter = normalizeMaintenanceFilter(searchParams.get("manutencao"));
  const legendas = normalizeLegendas(searchParams);

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

  const allParadas = await prisma.parada.findMany({
    where: activeWhere,
    select: {
      id: true,
      codigo: true,
      status: true,
      municipio: true,
      bairro: true,
      logradouro: true,
      referencia: true,
      area: true,
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
    ? await getLatestActivityByPeds(allPeds)
    : new Map<string, LatestMaintenance | null>();

  const filteredItems = allParadas
    .map((parada) => {
      const ped = normalizePed(parada.codigo);
      const latest = ped ? latestByPed.get(ped) : null;
      const ultimaAtividadeEm = latest?.createdAt ?? null;
      const ultimaAtividadeId = latest?.id ?? null;
      const risk = getRiskInfo(ultimaAtividadeEm);

      return {
        id: parada.id,
        codigo: parada.codigo,
        status: parada.status ?? "Ativo",
        municipio: parada.municipio ?? "Nao informado",
        bairro: parada.bairro ?? "Nao informado",
        logradouro: parada.logradouro ?? "Nao informado",
        referencia: parada.referencia ?? "Nao informado",
        area: parada.area ?? "Nao informada",
        tipologiaAtual: parada.tipologiaAtual ?? "Nao informada",
        quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens ?? 0,
        tipologiaNova: parada.novaTipologia ?? "Nao informada",
        latitude: parada.latitude,
        longitude: parada.longitude,
        ultimaAtividadeEm,
        ultimaAtividadeId,
        criticidade: risk.label,
        criticidadeCor: risk.tone,
      };
    })
    .filter((item) => matchesMaintenanceFilter(item.ultimaAtividadeEm, maintenanceFilter))
    .filter((item) => matchesLegendFilter(item.criticidadeCor, legendas));

  const produttivoAppBaseUrl = getProduttivoAppBaseUrl();
  const rows = filteredItems.map((item) => ({
    codigo: item.codigo,
    status: item.status,
    municipio: item.municipio,
    bairro: item.bairro,
    logradouro: item.logradouro,
    referencia: item.referencia,
    area: item.area,
    tipologiaAtual: item.tipologiaAtual,
    tipologiaNova: item.tipologiaNova,
    quantidadeAbrigosTotens: item.quantidadeAbrigosTotens,
    latitude: item.latitude ?? "",
    longitude: item.longitude ?? "",
    ultimaManutencao: formatDateTime(item.ultimaAtividadeEm),
    criticidade: item.criticidade,
    linkUltimaManutencao: item.ultimaAtividadeId
      ? `${produttivoAppBaseUrl}/form_fills/${item.ultimaAtividadeId}`
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: false });
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 },
    { wch: 38 },
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 52 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ligacao Paradas");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ligacao-paradas-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
