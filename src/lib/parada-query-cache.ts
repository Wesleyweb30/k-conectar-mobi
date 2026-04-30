import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ParadaDistinctValues = {
  status: string[];
  municipio: string[];
  bairro: string[];
  logradouro: string[];
  novaTipologia: string[];
};

export type ParadaCoverageSummary = {
  totalParadas: number;
  paradasComCoordenada: number;
};

function toNonEmptyStringArray(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

const getParadaDistinctValuesCached = unstable_cache(
  async (): Promise<ParadaDistinctValues> => {
    const [statusRows, municipioRows, bairroRows, logradouroRows, novaTipologiaRows] =
      await Promise.all([
        prisma.parada.findMany({
          distinct: ["status"],
          where: { status: { not: null } },
          select: { status: true },
          orderBy: { status: "asc" },
        }),
        prisma.parada.findMany({
          distinct: ["municipio"],
          where: { municipio: { not: null } },
          select: { municipio: true },
          orderBy: { municipio: "asc" },
        }),
        prisma.parada.findMany({
          distinct: ["bairro"],
          where: { bairro: { not: null } },
          select: { bairro: true },
          orderBy: { bairro: "asc" },
        }),
        prisma.parada.findMany({
          distinct: ["logradouro"],
          where: { logradouro: { not: null } },
          select: { logradouro: true },
          orderBy: { logradouro: "asc" },
        }),
        prisma.parada.findMany({
          distinct: ["novaTipologia"],
          where: { novaTipologia: { not: null } },
          select: { novaTipologia: true },
          orderBy: { novaTipologia: "asc" },
        }),
      ]);

    return {
      status: toNonEmptyStringArray(statusRows.map((item) => item.status)),
      municipio: toNonEmptyStringArray(municipioRows.map((item) => item.municipio)),
      bairro: toNonEmptyStringArray(bairroRows.map((item) => item.bairro)),
      logradouro: toNonEmptyStringArray(logradouroRows.map((item) => item.logradouro)),
      novaTipologia: toNonEmptyStringArray(novaTipologiaRows.map((item) => item.novaTipologia)),
    };
  },
  ["parada-distinct-values-v1"],
  { revalidate: 300, tags: ["parada:distinct-values"] },
);

const getParadaCoverageSummaryCached = unstable_cache(
  async (): Promise<ParadaCoverageSummary> => {
    const [totalParadas, paradasComCoordenada] = await Promise.all([
      prisma.parada.count(),
      prisma.parada.count({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
      }),
    ]);

    return { totalParadas, paradasComCoordenada };
  },
  ["parada-coverage-summary-v1"],
  { revalidate: 300, tags: ["parada:coverage"] },
);

export async function getParadaDistinctValues() {
  return getParadaDistinctValuesCached();
}

export async function getParadaCoverageSummary() {
  return getParadaCoverageSummaryCached();
}
