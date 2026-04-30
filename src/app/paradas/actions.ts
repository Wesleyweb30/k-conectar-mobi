"use server";

import { prisma } from "@/lib/prisma";

export type ParadaRouteResult = {
  id: string;
  codigo: string;
  status: string | null;
  gestao: string | null;
  classe: string | null;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  referencia: string | null;
  sentido: string | null;
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
};

export type ParadaFiltersInput = {
  codigo?: string;
  status?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  novaTipologia?: string;
};

function normalizeParam(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildParadaWhere(filters?: ParadaFiltersInput) {
  const codigo = normalizeParam(filters?.codigo);
  const status = normalizeParam(filters?.status);
  const municipio = normalizeParam(filters?.municipio);
  const bairro = normalizeParam(filters?.bairro);
  const logradouro = normalizeParam(filters?.logradouro);
  const novaTipologia = normalizeParam(filters?.novaTipologia);

  const andFilters: Array<Record<string, unknown>> = [];

  if (codigo) {
    andFilters.push({ codigo: { startsWith: codigo } });
  }

  if (status === "__EMPTY__") {
    andFilters.push({ OR: [{ status: null }, { status: "" }] });
  } else if (status) {
    andFilters.push({ status: { equals: status, mode: "insensitive" as const } });
  }

  if (municipio) {
    andFilters.push({ municipio: { equals: municipio, mode: "insensitive" as const } });
  }

  if (bairro) {
    andFilters.push({ bairro: { equals: bairro, mode: "insensitive" as const } });
  }

  if (logradouro) {
    andFilters.push({ logradouro: { equals: logradouro, mode: "insensitive" as const } });
  }

  if (novaTipologia) {
    andFilters.push({ novaTipologia: { equals: novaTipologia, mode: "insensitive" as const } });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}

export async function findParadasByCodigos(
  codigos: string[],
): Promise<ParadaRouteResult[]> {
  if (codigos.length === 0) return [];

  const normalized = Array.from(new Set(codigos.map((c) => c.trim()).filter(Boolean)));
  if (normalized.length === 0) return [];

  return prisma.parada.findMany({
    where: {
      codigo: { in: normalized },
    },
    select: {
      id: true,
      codigo: true,
      status: true,
      gestao: true,
      classe: true,
      municipio: true,
      bairro: true,
      logradouro: true,
      referencia: true,
      sentido: true,
      quantidadeAbrigosTotens: true,
      tipologiaAtual: true,
      novaTipologia: true,
      latitude: true,
      longitude: true,
      area: true,
    },
  });
}

export async function findParadasByFilters(
  filters?: ParadaFiltersInput,
): Promise<ParadaRouteResult[]> {
  const where = buildParadaWhere(filters);

  return prisma.parada.findMany({
    where,
    select: {
      id: true,
      codigo: true,
      status: true,
      gestao: true,
      classe: true,
      municipio: true,
      bairro: true,
      logradouro: true,
      referencia: true,
      sentido: true,
      quantidadeAbrigosTotens: true,
      tipologiaAtual: true,
      novaTipologia: true,
      latitude: true,
      longitude: true,
      area: true,
    },
    orderBy: [{ municipio: "asc" }, { bairro: "asc" }, { codigo: "asc" }],
  });
}
