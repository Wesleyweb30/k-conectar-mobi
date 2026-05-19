"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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

type UpdateParadaInput = {
  id: string;
  status?: string;
  novaTipologia?: string;
  quantidadeAbrigosTotens?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  referencia?: string;
  sentido?: string;
  latitude?: string;
  longitude?: string;
  area?: string;
};

function normalizeNullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNullableInt(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableFloat(value?: string) {
  const trimmed = value?.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateParadaAction(input: UpdateParadaInput) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false as const, error: "Sessao invalida. Faca login novamente." };
  }

  if (session.user.role !== "admin") {
    return { ok: false as const, error: "Apenas administradores podem atualizar paradas." };
  }

  if (!input.id?.trim()) {
    return { ok: false as const, error: "Parada invalida para atualizacao." };
  }

  await prisma.parada.update({
    where: { id: input.id },
    data: {
      status: normalizeNullable(input.status),
      novaTipologia: normalizeNullable(input.novaTipologia),
      quantidadeAbrigosTotens: parseNullableInt(input.quantidadeAbrigosTotens),
      municipio: normalizeNullable(input.municipio),
      bairro: normalizeNullable(input.bairro),
      logradouro: normalizeNullable(input.logradouro),
      referencia: normalizeNullable(input.referencia),
      sentido: normalizeNullable(input.sentido),
      latitude: parseNullableFloat(input.latitude),
      longitude: parseNullableFloat(input.longitude),
      area: normalizeNullable(input.area),
    },
  });

  revalidatePath("/paradas");
  revalidatePath("/paradas/rotas");

  return { ok: true as const };
}
