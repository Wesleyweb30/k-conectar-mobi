import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ParadaFilters from "@/components/parada/parada-filters";

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

export default async function ParadaList({ searchParams }: Props) {
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
    <section className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Paradas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Use os filtros para encontrar rapidamente as paradas desejadas.
            </p>
          </div>
          <div className="text-sm text-gray-500">Total: {total}</div>
        </div>

        <ParadaFilters
          key={`${codigoRaw ?? ""}|${status ?? ""}|${municipio ?? ""}|${bairro ?? ""}|${logradouro ?? ""}|${novaTipologia ?? ""}`}
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

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Código</th>
              <th className="px-4 py-3 text-left font-semibold">Município</th>
              <th className="px-4 py-3 text-left font-semibold">Bairro</th>
              <th className="px-4 py-3 text-left font-semibold">Logradouro</th>
              <th className="px-4 py-3 text-left font-semibold">Quantidade</th>
              <th className="px-4 py-3 text-left font-semibold">Nova tipologia</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {paradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma parada encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              paradas.map((parada) => (
                <tr key={parada.id} className="border-t border-gray-100 text-gray-700">
                  <td className="px-4 py-3">{parada.codigo}</td>
                  <td className="px-4 py-3">{parada.municipio ?? "-"}</td>
                  <td className="px-4 py-3">{parada.bairro ?? "-"}</td>
                  <td className="px-4 py-3">{parada.logradouro ?? "-"}</td>
                  <td className="px-4 py-3">{parada.quantidadeAbrigosTotens ?? "-"}</td>
                  <td className="px-4 py-3">{parada.novaTipologia ?? "-"}</td>
                  <td className="px-4 py-3">{parada.status ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Página {safeCurrentPage} de {totalPages}
        </span>

        <div className="flex gap-2">
          <Link
            href={buildHref(activeParams, Math.max(1, safeCurrentPage - 1))}
            aria-disabled={!hasPrev}
            className={`px-3 py-2 rounded-lg border ${
              hasPrev
                ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                : "border-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            Anterior
          </Link>
          <Link
            href={buildHref(activeParams, Math.min(totalPages, safeCurrentPage + 1))}
            aria-disabled={!hasNext}
            className={`px-3 py-2 rounded-lg border ${
              hasNext
                ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                : "border-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  );
}