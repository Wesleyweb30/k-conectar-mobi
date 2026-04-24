"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import ParadaRouteMap from "@/components/parada/parada-route-map";

type ParadaRow = {
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
  tipologiaAtual: string | null;
  quantidadeAbrigosTotens: number | null;
  novaTipologia: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
};

type Props = {
  paradas: ParadaRow[];
  routeMode?: boolean;
};

type RouteSelectionItem = {
  id: string;
  codigo: string;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number;
  longitude: number;
};

const ROUTE_STORAGE_KEY = "kconectar.paradas.routeSelection.v1";

function readStoredSelection(): RouteSelectionItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(ROUTE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          Boolean(
            item &&
              typeof item.id === "string" &&
              typeof item.codigo === "string" &&
              typeof item.latitude === "number" &&
              typeof item.longitude === "number",
          ),
      )
      .map((item) => ({
        id: item.id,
        codigo: item.codigo,
        municipio: typeof item.municipio === "string" ? item.municipio : null,
        bairro: typeof item.bairro === "string" ? item.bairro : null,
        logradouro: typeof item.logradouro === "string" ? item.logradouro : null,
        quantidadeAbrigosTotens:
          typeof item.quantidadeAbrigosTotens === "number" ? item.quantidadeAbrigosTotens : null,
        tipologiaAtual: typeof item.tipologiaAtual === "string" ? item.tipologiaAtual : null,
        novaTipologia: typeof item.novaTipologia === "string" ? item.novaTipologia : null,
        latitude: item.latitude,
        longitude: item.longitude,
      }));
  } catch {
    return [];
  }
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getStatusTone(status: string | null) {
  if (!status || !status.trim()) return "bg-slate-100 text-slate-600";

  const normalized = status.toLowerCase();
  if (normalized.includes("ativo") || normalized.includes("ok")) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (normalized.includes("pend") || normalized.includes("anal")) {
    return "bg-amber-100 text-amber-700";
  }

  if (normalized.includes("inativ") || normalized.includes("erro")) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-blue-100 text-blue-700";
}

function csvEscape(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

type ExportRow = {
  codigo: string;
  logradouro: string;
  bairro: string;
  quantidade: string;
  "tipologia atual": string;
  "nova tipologia": string;
  Latitude: string;
  Longitude: string;
};

type ExportAllRow = {
  id: string;
  codigo: string;
  status: string;
  gestao: string;
  classe: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  referencia: string;
  sentido: string;
  "tipologia atual": string;
  quantidade: string;
  "nova tipologia": string;
  latitude: string;
  longitude: string;
  area: string;
};

export default function ParadaTable({ paradas, routeMode = false }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeSelection, setRouteSelection] = useState<RouteSelectionItem[]>(() =>
    routeMode ? readStoredSelection() : [],
  );

  useEffect(() => {
    if (!routeMode || typeof window === "undefined") return;
    window.localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(routeSelection));
  }, [routeMode, routeSelection]);

  const selectedRouteIdSet = useMemo(
    () => new Set(routeSelection.map((item) => item.id)),
    [routeSelection],
  );

  const paradasWithCoordinates = useMemo(
    () =>
      paradas.filter(
        (parada) => parada.latitude !== null && parada.longitude !== null,
      ),
    [paradas],
  );

  const routePoints = useMemo(
    () => routeSelection,
    [routeSelection],
  );

  const selectedParada = useMemo(
    () => paradas.find((parada) => parada.id === selectedId) ?? null,
    [paradas, selectedId],
  );

  const paradaById = useMemo(
    () => new Map(paradas.map((parada) => [parada.id, parada])),
    [paradas],
  );

  useEffect(() => {
    if (!selectedParada) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedParada]);

  function toggleRouteSelection(parada: ParadaRow) {
    if (parada.latitude === null || parada.longitude === null) return;

    setRouteSelection((prev: any) => {
      if (prev.some((item: any) => item.id === parada.id)) {
        return prev.filter((item: any) => item.id !== parada.id);
      }

      return [
        ...prev,
        {
          id: parada.id,
          codigo: parada.codigo,
          municipio: parada.municipio,
          bairro: parada.bairro,
          logradouro: parada.logradouro,
          quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens,
          tipologiaAtual: parada.tipologiaAtual,
          novaTipologia: parada.novaTipologia,
          latitude: parada.latitude,
          longitude: parada.longitude,
        },
      ];
    });
  }

  function selectAllWithCoordinates() {
    setRouteSelection((prev) => {
      const idSet = new Set(prev.map((item) => item.id));
      const next = [...prev];

      paradasWithCoordinates.forEach((parada) => {
        if (idSet.has(parada.id)) return;

        next.push({
          id: parada.id,
          codigo: parada.codigo,
          municipio: parada.municipio,
          bairro: parada.bairro,
          logradouro: parada.logradouro,
          quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens,
          tipologiaAtual: parada.tipologiaAtual,
          novaTipologia: parada.novaTipologia,
          latitude: parada.latitude as number,
          longitude: parada.longitude as number,
        });
      });

      return next;
    });
  }

  function removeFromRoute(id: string) {
    setRouteSelection((prev) => prev.filter((item) => item.id !== id));
  }

  function openInGoogleMaps() {
    if (routePoints.length === 0 || typeof window === "undefined") return;

    if (routePoints.length === 1) {
      const [point] = routePoints;
      const query = `${point.latitude},${point.longitude}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const origin = `${routePoints[0].latitude},${routePoints[0].longitude}`;
    const destination = `${routePoints[routePoints.length - 1].latitude},${routePoints[routePoints.length - 1].longitude}`;
    const waypoints = routePoints
      .slice(1, -1)
      .map((point) => `${point.latitude},${point.longitude}`)
      .join("|");

    const params = new URLSearchParams({
      api: "1",
      travelmode: "driving",
      origin,
      destination,
    });

    if (waypoints) {
      params.set("waypoints", waypoints);
    }

    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadRouteCsv() {
    if (routePoints.length === 0 || typeof window === "undefined") return;

    const exportRows: ExportRow[] = routePoints.map((point) => {
      const paradaAtual = paradaById.get(point.id);

      const bairro = point.bairro ?? paradaAtual?.bairro ?? "";
      const logradouro = point.logradouro ?? paradaAtual?.logradouro ?? "";
      const quantidade =
        point.quantidadeAbrigosTotens ?? paradaAtual?.quantidadeAbrigosTotens ?? null;
      const tipologiaAtual = point.tipologiaAtual ?? paradaAtual?.tipologiaAtual ?? "";
      const novaTipologia = point.novaTipologia ?? paradaAtual?.novaTipologia ?? "";

      const latitude = point.latitude ?? paradaAtual?.latitude;
      const longitude = point.longitude ?? paradaAtual?.longitude;
      const latitudeValue = typeof latitude === "number" ? String(latitude) : "";
      const longitudeValue = typeof longitude === "number" ? String(longitude) : "";

      return {
        codigo: point.codigo,
        logradouro,
        bairro,
        quantidade: quantidade === null ? "" : String(quantidade),
        "tipologia atual": tipologiaAtual,
        "nova tipologia": novaTipologia,
        Latitude: latitudeValue,
        Longitude: longitudeValue,
      };
    });

    const header = [
      "codigo",
      "logradouro",
      "bairro",
      "quantidade",
      "tipologia atual",
      "nova tipologia",
      "Latitude",
      "Longitude",
    ];

    const rows = exportRows.map((row) => header.map((key) => row[key as keyof ExportRow]));

    const separator = ",";
    const csvBody = [header, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(separator))
      .join("\r\n");

    const csv = csvBody;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rota-paradas.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadRouteExcel() {
    if (routePoints.length === 0) return;

    const exportRows: ExportAllRow[] = routePoints.map((point) => {
      const paradaAtual = paradaById.get(point.id);
      const quantidadeAbrigosTotens =
        point.quantidadeAbrigosTotens ?? paradaAtual?.quantidadeAbrigosTotens ?? null;
      const latitude = point.latitude ?? paradaAtual?.latitude ?? null;
      const longitude = point.longitude ?? paradaAtual?.longitude ?? null;

      return {
        id: point.id,
        codigo: point.codigo,
        status: paradaAtual?.status ?? "",
        gestao: paradaAtual?.gestao ?? "",
        classe: paradaAtual?.classe ?? "",
        municipio: point.municipio ?? paradaAtual?.municipio ?? "",
        bairro: point.bairro ?? paradaAtual?.bairro ?? "",
        logradouro: point.logradouro ?? paradaAtual?.logradouro ?? "",
        referencia: paradaAtual?.referencia ?? "",
        sentido: paradaAtual?.sentido ?? "",
        "tipologia atual": point.tipologiaAtual ?? paradaAtual?.tipologiaAtual ?? "",
        quantidade: quantidadeAbrigosTotens === null ? "" : String(quantidadeAbrigosTotens),
        "nova tipologia": point.novaTipologia ?? paradaAtual?.novaTipologia ?? "",
        latitude: typeof latitude === "number" ? String(latitude) : "",
        longitude: typeof longitude === "number" ? String(longitude) : "",
        area: paradaAtual?.area ?? "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows, {
      header: [
        "id",
        "codigo",
        "status",
        "gestao",
        "classe",
        "municipio",
        "bairro",
        "logradouro",
        "referencia",
        "sentido",
        "tipologia atual",
        "quantidade",
        "nova tipologia",
        "latitude",
        "longitude",
        "area",
      ],
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rota");
    XLSX.writeFile(workbook, "rota-paradas.xlsx");
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {paradas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhuma parada encontrada para os filtros selecionados.
          </div>
        ) : (
          paradas.map((parada, index) => {
            const isSelected = parada.id === selectedId;
            const isRouteSelected = selectedRouteIdSet.has(parada.id);

            return (
              <article
                key={parada.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(parada.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(parada.id);
                  }
                }}
                className={`route-card-enter rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? "border-blue-300 bg-blue-50/60 shadow-[0_12px_24px_-18px_rgba(37,99,235,0.5)]"
                    : "border-slate-200 bg-white shadow-[0_10px_20px_-16px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 hover:shadow-[0_14px_24px_-16px_rgba(15,23,42,0.35)]"
                }`}
                style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Parada</p>
                    <h4 className="text-base font-semibold text-slate-900">{parada.codigo}</h4>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(parada.status)}`}>
                    {displayValue(parada.status)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Município</p>
                    <p className="font-medium text-slate-800">{displayValue(parada.municipio)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Bairro</p>
                    <p className="font-medium text-slate-800">{displayValue(parada.bairro)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Logradouro</p>
                    <p className="font-medium text-slate-800">{displayValue(parada.logradouro)}</p>
                  </div>
                </div>

                {routeMode ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-medium text-slate-600">Incluir na rota</span>
                    <input
                      type="checkbox"
                      checked={isRouteSelected}
                      disabled={parada.latitude === null || parada.longitude === null}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleRouteSelection(parada)}
                      className="h-4 w-4 accent-blue-600 disabled:cursor-not-allowed"
                      aria-label={`Selecionar parada ${parada.codigo} para rota`}
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] md:block">
        <div className={routeMode ? "max-h-[320px] overflow-auto" : "overflow-x-auto"}>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100/95 text-slate-600 backdrop-blur">
              <tr>
                {routeMode ? <th className="px-4 py-3 text-left font-semibold">Rota</th> : null}
                <th className="px-4 py-3 text-left font-semibold">Codigo</th>
                <th className="px-4 py-3 text-left font-semibold">Municipio</th>
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
                  <td colSpan={routeMode ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma parada encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paradas.map((parada) => {
                  const isSelected = parada.id === selectedId;

                  return (
                    <tr
                      key={parada.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(parada.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(parada.id);
                        }
                      }}
                      className={`border-t border-slate-100 text-slate-700 cursor-pointer transition ${
                        isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      {routeMode ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRouteIdSet.has(parada.id)}
                            disabled={parada.latitude === null || parada.longitude === null}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleRouteSelection(parada)}
                            className="h-4 w-4 accent-blue-600 disabled:cursor-not-allowed"
                            aria-label={`Selecionar parada ${parada.codigo} para rota`}
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium">{parada.codigo}</td>
                      <td className="px-4 py-3">{displayValue(parada.municipio)}</td>
                      <td className="px-4 py-3">{displayValue(parada.bairro)}</td>
                      <td className="px-4 py-3">{displayValue(parada.logradouro)}</td>
                      <td className="px-4 py-3">{displayValue(parada.quantidadeAbrigosTotens)}</td>
                      <td className="px-4 py-3">{displayValue(parada.novaTipologia)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(parada.status)}`}>
                          {displayValue(parada.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {routeMode ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 md:text-lg">Rota no mapa</h3>
              <p className="mt-1 text-sm text-slate-600">
                Filtre e selecione paradas. As selecionadas continuam salvas mesmo mudando os filtros.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllWithCoordinates}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Selecionar página
              </button>
              <button
                type="button"
                onClick={() => setRouteSelection([])}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Limpar rota
              </button>
              <button
                type="button"
                onClick={openInGoogleMaps}
                disabled={routePoints.length === 0}
                className="h-9 rounded-lg border border-blue-300 px-3 text-sm text-blue-700 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Abrir no Google Maps
              </button>
              <button
                type="button"
                onClick={downloadRouteCsv}
                disabled={routePoints.length === 0}
                className="h-9 rounded-lg border border-emerald-300 px-3 text-sm text-emerald-700 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={downloadRouteExcel}
                disabled={routePoints.length === 0}
                className="h-9 rounded-lg border border-violet-300 px-3 text-sm text-violet-700 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="mt-4 mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Selecionadas: {routePoints.length}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              {routePoints.length >= 2 ? "Rota desenhada" : "Selecione 2+ para rota"}
            </span>
          </div>

          {routePoints.length > 0 ? (
            <div className="mb-4 max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <ul className="grid grid-cols-2 gap-1.5 text-slate-700 md:grid-cols-3 lg:grid-cols-4">
                {routePoints.map((point, index) => (
                  <li key={point.id} className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <span className="min-w-0 text-[11px] font-semibold leading-tight text-slate-700">
                      <span className="mr-1 text-[10px] text-slate-500">{index + 1}.</span>
                      <span className="truncate">{point.codigo}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromRoute(point.id)}
                      className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-red-600 transition hover:text-red-700"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ParadaRouteMap
            points={routePoints}
            heightClassName="h-[420px] md:h-[64vh]"
          />
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-40 transition ${
          selectedParada ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!selectedParada}
      >
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={`absolute inset-0 bg-black/35 transition-opacity ${
            selectedParada ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Fechar detalhes da parada"
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes da parada"
          className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl transition-transform duration-300 ${
            selectedParada ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedParada ? (
            <div className="h-full overflow-y-auto p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Detalhes da parada {selectedParada.codigo}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em outra linha para trocar a parada exibida.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Fechar
                </button>
              </div>

              <dl className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Codigo</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.codigo)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.status)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gestao</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.gestao)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Classe</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.classe)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Municipio</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.municipio)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Bairro</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.bairro)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Logradouro</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.logradouro)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Referencia</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.referencia)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Sentido</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.sentido)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Tipologia atual</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.tipologiaAtual)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Nova tipologia</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.novaTipologia)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Quantidade abrigos/totens</dt>
                  <dd className="text-gray-800 font-medium">
                    {displayValue(selectedParada.quantidadeAbrigosTotens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Latitude</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.latitude)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Longitude</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.longitude)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Area</dt>
                  <dd className="text-gray-800 font-medium">{displayValue(selectedParada.area)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}