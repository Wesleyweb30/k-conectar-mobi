"use server";

import { prisma } from "@/lib/prisma";

export type ParadaRouteResult = {
  id: string;
  codigo: string;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number | null;
  longitude: number | null;
};

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
      municipio: true,
      bairro: true,
      logradouro: true,
      quantidadeAbrigosTotens: true,
      tipologiaAtual: true,
      novaTipologia: true,
      latitude: true,
      longitude: true,
    },
  });
}
