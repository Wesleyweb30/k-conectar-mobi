import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ParadaFilters from "@/components/parada/parada-filters";
import ParadaTable from "@/components/parada/parada-table";

type SearchParams = {
  codigo?: string;
  status?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  novaTipologia?: string;
  page?: string;
};

type Props = {
  searchParams?: SearchParams;
  routeMode?: boolean;
};

const PAGE_SIZE = 20;

function normalizeParam(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildHref(params: SearchParams, page: number) {
  const sp = new URLSearchParams();

  if (params.codigo) sp.set("codigo", params.codigo);
  if (params.status) sp.set("status", params.status);
  if (params.municipio) sp.set("municipio", params.municipio);
  if (params.bairro) sp.set("bairro", params.bairro);
  if (params.logradouro) sp.set("logradouro", params.logradouro);
  if (params.novaTipologia) sp.set("novaTipologia", params.novaTipologia);
  sp.set("page", String(page));

  return `?${sp.toString()}`;
}

async function getDistinctValues() {
  const [statusRows, municipioRows, bairroRows, logradouroRows, novaTipologiaRows] = await Promise.all([
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
    status: statusRows
      .map((item) => item.status)
      .filter((value): value is string => Boolean(value && value.trim())),
    municipio: municipioRows
      .map((item) => item.municipio)
      .filter((value): value is string => Boolean(value && value.trim())),
    bairro: bairroRows
      .map((item) => item.bairro)
      .filter((value): value is string => Boolean(value && value.trim())),
    logradouro: logradouroRows
      .map((item) => item.logradouro)
      .filter((value): value is string => Boolean(value && value.trim())),
    novaTipologia: novaTipologiaRows
      .map((item) => item.novaTipologia)
      .filter((value): value is string => Boolean(value && value.trim())),
  };
}

export default async function ParadaList({ searchParams, routeMode = false }: Props) {
  const codigoRaw = normalizeParam(searchParams?.codigo);
  const status = normalizeParam(searchParams?.status);
  const municipio = normalizeParam(searchParams?.municipio);
  const bairro = normalizeParam(searchParams?.bairro);
  const logradouro = normalizeParam(searchParams?.logradouro);
  const novaTipologia = normalizeParam(searchParams?.novaTipologia);

  const pageRaw = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const andFilters: Array<Record<string, unknown>> = [];

  if (codigoRaw) {
    andFilters.push({
      codigo: { startsWith: codigoRaw },
    });
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

  const where = andFilters.length > 0 ? { AND: andFilters } : {};

  const [distinctValues, total, paradas] = await Promise.all([
    getDistinctValues(),
    prisma.parada.count({ where }),
    prisma.parada.findMany({
      where,
      orderBy: [{ municipio: "asc" }, { bairro: "asc" }, { codigo: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const hasPrev = safeCurrentPage > 1;
  const hasNext = safeCurrentPage < totalPages;

  const activeParams: SearchParams = {
    ...(codigoRaw ? { codigo: codigoRaw } : {}),
    ...(status ? { status } : {}),
    ...(municipio ? { municipio } : {}),
    ...(bairro ? { bairro } : {}),
    ...(logradouro ? { logradouro } : {}),
    ...(novaTipologia ? { novaTipologia } : {}),
  };

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              {routeMode ? "Roteirizacao" : "Consulta"}
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {routeMode ? "Montagem de rota" : "Paradas"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {routeMode
                ? "Filtre, selecione e monte sua rota sem perder a seleção ao navegar entre filtros e páginas."
                : "Use os filtros para encontrar rapidamente as paradas desejadas."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">Registros</div>
            <div className="text-xl font-semibold text-slate-900">{total}</div>
            <Link
              href={routeMode ? "/paradas" : "/paradas/rotas"}
              className="mt-2 inline-flex h-9 items-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              {routeMode ? "Voltar para consulta de paradas" : "Abrir página de rotas"}
            </Link>
          </div>
        </div>

        <ParadaFilters
          initialFilters={{
            codigo: codigoRaw ?? "",
            status: status ?? "",
            municipio: municipio ?? "",
            bairro: bairro ?? "",
            logradouro: logradouro ?? "",
            novaTipologia: novaTipologia ?? "",
          }}
          distinctValues={distinctValues}
        />
      </div>

      <ParadaTable paradas={paradas} routeMode={routeMode} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-700">
          Página {safeCurrentPage} de {totalPages}
        </span>

        <div className="flex gap-2">
          <Link
            href={buildHref(activeParams, Math.max(1, safeCurrentPage - 1))}
            aria-disabled={!hasPrev}
            className={`px-3 py-2 rounded-lg border transition ${
              hasPrev
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "border-slate-200 text-slate-400 pointer-events-none"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildHref(activeParams, Math.min(totalPages, safeCurrentPage + 1))}
            aria-disabled={!hasNext}
            className={`px-3 py-2 rounded-lg border transition ${
              hasNext
                ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                : "border-slate-200 text-slate-400 pointer-events-none"
            }`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  );
}