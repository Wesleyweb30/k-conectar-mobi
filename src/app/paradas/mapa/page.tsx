import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/admin-nav";
import UserNav from "@/components/user/user-nav";
import ParadaEquipmentMap from "@/components/parada/parada-equipment-map-client";
import ParadaFilters from "@/components/parada/parada-filters";

type MapaPageProps = {
  searchParams?: Promise<{
    codigo?: string;
    status?: string;
    municipio?: string;
    bairro?: string;
    logradouro?: string;
    novaTipologia?: string;
  }>;
};

function normalizeParam(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

export default async function ParadasMapaPage({ searchParams }: MapaPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";
  const resolvedSearchParams = (await searchParams) ?? {};
  const codigo = normalizeParam(resolvedSearchParams.codigo);
  const status = normalizeParam(resolvedSearchParams.status);
  const municipio = normalizeParam(resolvedSearchParams.municipio);
  const bairro = normalizeParam(resolvedSearchParams.bairro);
  const logradouro = normalizeParam(resolvedSearchParams.logradouro);
  const novaTipologia = normalizeParam(resolvedSearchParams.novaTipologia);

  const andFilters: Array<Record<string, unknown>> = [
    { latitude: { not: null } },
    { longitude: { not: null } },
  ];

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

  const filteredWhere = { AND: andFilters };

  const [distinctValues, totalParadas, paradasComCoordenada, points] = await Promise.all([
    getDistinctValues(),
    prisma.parada.count(),
    prisma.parada.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    }),
    prisma.parada.findMany({
      where: filteredWhere,
      select: {
        id: true,
        codigo: true,
        municipio: true,
        bairro: true,
        logradouro: true,
        tipologiaAtual: true,
        novaTipologia: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ novaTipologia: "asc" }, { codigo: "asc" }],
    }),
  ]);

  const coberturaBase = totalParadas > 0 ? ((paradasComCoordenada / totalParadas) * 100).toFixed(1) : "0.0";
  const coberturaFiltrada = paradasComCoordenada > 0
    ? ((points.length / paradasComCoordenada) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.1),_transparent_28%),linear-gradient(180deg,_#f8fafc,_#eef2f7)]">
      {isAdmin ? (
        <AdminNav userName={session.user.name} />
      ) : (
        <UserNav userName={session.user.name} />
      )}

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:py-10">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            Mapa geral
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Paradas por tipo de equipamento</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Visualize todas as paradas com coordenadas em um unico mapa. A legenda mostra a distribuicao por tipo de equipamento para apoiar analise e planejamento operacional.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Paradas totais</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalParadas}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">No filtro atual</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{points.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-cyan-700">Cobertura base</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-900">{coberturaBase}%</p>
            </div>
          </div>

          <ParadaFilters
            initialFilters={{
              codigo: codigo ?? "",
              status: status ?? "",
              municipio: municipio ?? "",
              bairro: bairro ?? "",
              logradouro: logradouro ?? "",
              novaTipologia: novaTipologia ?? "",
            }}
            distinctValues={distinctValues}
            includePageParam={false}
          />

          <p className="mt-3 text-xs text-slate-500">
            {points.length} paradas no filtro atual, cobrindo {coberturaFiltrada}% das paradas georreferenciadas da base.
          </p>
        </section>

        <ParadaEquipmentMap
          points={points.map((point) => ({
            ...point,
            latitude: point.latitude as number,
            longitude: point.longitude as number,
          }))}
        />
      </main>
    </div>
  );
}