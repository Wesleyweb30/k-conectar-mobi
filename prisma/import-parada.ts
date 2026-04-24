import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import xlsx from "xlsx";

const EXCEL_PATH = "doc/Parque.xlsx";
const SHEET_NAME = "Parque";
const BATCH_SIZE = 200;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type ParadaRow = {
  c: unknown;
  "Codigo": unknown;
  "Gestao": unknown;
  "Classe": unknown;
  "Municipio": unknown;
  "Bairro": unknown;
  "Logradouro": unknown;
  "Referencia": unknown;
  "Sentido": unknown;
  "Tipologia Atual": unknown;
  "Quantidade de Abrigos/Totens": unknown;
  "Nova Tipologia": unknown;
  "Coordenada Decimal (Lat)": unknown;
  "Coordenada Decimal (Long)": unknown;
  "Area": unknown;
};

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

async function main() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const worksheet = workbook.Sheets[SHEET_NAME];

  if (!worksheet) {
    throw new Error(`Planilha '${SHEET_NAME}' nao encontrada em ${EXCEL_PATH}.`);
  }

  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
  });

  console.log(`Linhas encontradas no Excel: ${rows.length}`);

  let processed = 0;
  let ignored = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const chunk = rows.slice(start, start + BATCH_SIZE);

    const operations = chunk.flatMap((rawRow) => {
      const row = rawRow as ParadaRow;
      const codigo = toNullableInt(rawRow["Codigo"] ?? rawRow["Código"]);

      if (!codigo) {
        ignored += 1;
        return [];
      }

      return [
        prisma.parada.upsert({
          where: { codigo },
          create: {
            codigo,
            status: toNullableString(row.c),
            gestao: toNullableString(rawRow["Gestao"] ?? rawRow["Gestão"]),
            classe: toNullableString(row.Classe),
            municipio: toNullableString(rawRow["Municipio"] ?? rawRow["Município"]),
            bairro: toNullableString(row.Bairro),
            logradouro: toNullableString(row.Logradouro),
            referencia: toNullableString(rawRow["Referencia"] ?? rawRow["Referência"]),
            sentido: toNullableString(row.Sentido),
            tipologiaAtual: toNullableString(row["Tipologia Atual"]),
            quantidadeAbrigosTotens: toNullableInt(row["Quantidade de Abrigos/Totens"]),
            novaTipologia: toNullableString(row["Nova Tipologia"]),
            latitude: toNullableFloat(rawRow["Coordenada Decimal (Lat)"]),
            longitude: toNullableFloat(rawRow["Coordenada Decimal (Long)"]),
            area: toNullableString(rawRow["Area"] ?? rawRow["Área"]),
          },
          update: {
            status: toNullableString(row.c),
            gestao: toNullableString(rawRow["Gestao"] ?? rawRow["Gestão"]),
            classe: toNullableString(row.Classe),
            municipio: toNullableString(rawRow["Municipio"] ?? rawRow["Município"]),
            bairro: toNullableString(row.Bairro),
            logradouro: toNullableString(row.Logradouro),
            referencia: toNullableString(rawRow["Referencia"] ?? rawRow["Referência"]),
            sentido: toNullableString(row.Sentido),
            tipologiaAtual: toNullableString(row["Tipologia Atual"]),
            quantidadeAbrigosTotens: toNullableInt(row["Quantidade de Abrigos/Totens"]),
            novaTipologia: toNullableString(row["Nova Tipologia"]),
            latitude: toNullableFloat(rawRow["Coordenada Decimal (Lat)"]),
            longitude: toNullableFloat(rawRow["Coordenada Decimal (Long)"]),
            area: toNullableString(rawRow["Area"] ?? rawRow["Área"]),
          },
        }),
      ];
    });

    if (operations.length > 0) {
      await Promise.all(operations);
      processed += operations.length;
    }

    console.log(`Processadas ${Math.min(start + BATCH_SIZE, rows.length)} de ${rows.length} linhas...`);
  }

  console.log(`Importacao concluida. Registros importados/atualizados: ${processed}. Linhas ignoradas: ${ignored}.`);
}

main()
  .catch((error) => {
    console.error("Falha ao importar paradas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
