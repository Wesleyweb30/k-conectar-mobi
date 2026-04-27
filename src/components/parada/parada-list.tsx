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
  const paradasOnPage = paradas.length;
  const paradasWithCoordinatesOnPage = paradas.filter(
    (parada) => parada.latitude !== null && parada.longitude !== null,
  ).length;
  const distinctMunicipiosOnPage = new Set(
    paradas.map((parada) => parada.municipio).filter((value): value is string => Boolean(value)),
  ).size;
  const summaryCards = routeMode
    ? [
        {
          label: "Pontos nesta pagina",
          value: String(paradasOnPage),
          tone: "from-teal-500/20 via-teal-500/10 to-transparent border-teal-200/70 text-teal-950",
        },
        {
          label: "Com geolocalizacao",
          value: String(paradasWithCoordinatesOnPage),
          tone: "from-sky-500/20 via-sky-500/10 to-transparent border-sky-200/70 text-sky-950",
        },
        {
          label: "Municipios visiveis",
          value: String(distinctMunicipiosOnPage),
          tone: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-200/70 text-amber-950",
        },
      ]
    : [
        {
          label: "Registros encontrados",
          value: String(total),
          tone: "from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-200/70 text-cyan-950",
        },
        {
          label: "Pagina atual",
          value: `${safeCurrentPage}/${totalPages}`,
          tone: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-200/70 text-indigo-950",
        },
        {
          label: "Municipios visiveis",
          value: String(distinctMunicipiosOnPage),
          tone: "from-orange-500/20 via-orange-500/10 to-transparent border-orange-200/70 text-orange-950",
        },
      ];

  const activeParams: SearchParams = {
    ...(codigoRaw ? { codigo: codigoRaw } : {}),
    ...(status ? { status } : {}),
    ...(municipio ? { municipio } : {}),
    ...(bairro ? { bairro } : {}),
    ...(logradouro ? { logradouro } : {}),
    ...(novaTipologia ? { novaTipologia } : {}),
  };

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(248,250,252,0.94))] p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] backdrop-blur md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(15,23,42,0.03)_35%,transparent_70%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-800 shadow-sm">
              {routeMode ? "Roteirizacao" : "Consulta"}
            </span>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              {routeMode ? "Montagem de rota" : "Paradas"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
              {routeMode
                ? "Monte roteiros em campo com foco nas paradas georreferenciadas, mantendo a leitura clara da selecao, do mapa e da exportacao operacional."
                : "Explore a base de paradas com um painel mais limpo, leitura rapida dos filtros ativos e navegação mais clara entre consulta e planejamento."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 shadow-sm">
                Atualizacao visual orientada para operacao
              </span>
              <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 shadow-sm">
                {routeMode ? "Selecao persistida por 10 minutos" : "Filtros com resposta rapida"}
              </span>
            </div>
          </div>
          <div className="w-full rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_20px_35px_-25px_rgba(15,23,42,0.5)] md:max-w-xs">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Resumo rapido</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{total}</div>
            <div className="mt-1 text-sm text-slate-600">
              {routeMode ? "paradas filtradas prontas para compor a rota" : "registros encontrados com os filtros atuais"}
            </div>
            <Link
              href={routeMode ? "/paradas" : "/paradas/rotas"}
              className="mt-4 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              {routeMode ? "Voltar para consulta de paradas" : "Abrir página de rotas"}
            </Link>
          </div>
        </div>

        <div className="relative mt-6 -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`min-w-[180px] shrink-0 rounded-[1.5rem] border bg-gradient-to-br p-4 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)] md:min-w-0 md:shrink ${card.tone}`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</div>
            </div>
          ))}
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

      <ParadaTable
        paradas={paradas}
        routeMode={routeMode}
        pagination={
          routeMode
            ? {
                currentPage: safeCurrentPage,
                totalPages,
                hasPrev,
                hasNext,
                prevHref: buildHref(activeParams, Math.max(1, safeCurrentPage - 1)),
                nextHref: buildHref(activeParams, Math.min(totalPages, safeCurrentPage + 1)),
              }
            : undefined
        }
      />

      {!routeMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
          <span className="font-medium text-slate-700">
            Página {safeCurrentPage} de {totalPages}
          </span>

          <div className="flex gap-2">
            <Link
              href={buildHref(activeParams, Math.max(1, safeCurrentPage - 1))}
              aria-disabled={!hasPrev}
              className={`rounded-xl px-4 py-2.5 transition ${
                hasPrev
                  ? "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                  : "border border-slate-200 text-slate-400 pointer-events-none"
              }`}
            >
              Anterior
            </Link>
            <Link
              href={buildHref(activeParams, Math.min(totalPages, safeCurrentPage + 1))}
              aria-disabled={!hasNext}
              className={`rounded-xl px-4 py-2.5 transition ${
                hasNext
                  ? "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                  : "border border-slate-200 text-slate-400 pointer-events-none"
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}