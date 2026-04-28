"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

type EquipmentPoint = {
  id: string;
  codigo: string;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number;
  longitude: number;
};

type Props = {
  points: EquipmentPoint[];
  heightClassName?: string;
};

type EquipmentSummaryItem = {
  type: string;
  count: number;
};

type OsFilter = "none" | "without-os" | "with-open-os";

type ActivityApiItem = {
  id: number;
  tipo: string;
  date: string;
  url: string;
};

type ActivityApiResponse = {
  items?: ActivityApiItem[];
  hasAnyOs?: boolean;
  hasOpenOs?: boolean;
};

const FORTALEZA_CENTER: [number, number] = [-3.7319, -38.5267];

const PALETTE = [
  "#2563eb",
  "#0d9488",
  "#ea580c",
  "#7c3aed",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#e11d48",
];

function normalizeEquipmentType(point: EquipmentPoint) {
  const rawType = point.novaTipologia ?? point.tipologiaAtual;
  const normalized = rawType?.trim();
  return normalized && normalized.length > 0 ? normalized : "Nao informado";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function ParadaEquipmentMap({ points, heightClassName = "h-[600px]" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const activityCacheRef = useRef(new Map<string, Promise<ActivityApiResponse>>());
  const cancelOsLoadingRef = useRef(false);
  const osLoadingRunRef = useRef(0);

  const [osFilter, setOsFilter] = useState<OsFilter>("none");
  const [isLoadingOsFilter, setIsLoadingOsFilter] = useState(false);
  const [osLoadingProgress, setOsLoadingProgress] = useState({ processed: 0, total: 0 });
  const [osFlagsByCodigo, setOsFlagsByCodigo] = useState<
    Record<string, { hasAnyOs: boolean; hasOpenOs: boolean }>
  >({});

  const osLoadingPercent = useMemo(() => {
    if (osLoadingProgress.total <= 0) return 0;
    return Math.min(100, Math.round((osLoadingProgress.processed / osLoadingProgress.total) * 100));
  }, [osLoadingProgress]);

  const filteredPoints = useMemo(() => {
    if (osFilter === "none") return points;

    return points.filter((point) => {
      const flags = osFlagsByCodigo[point.codigo];
      if (!flags) return false;
      if (osFilter === "without-os") return !flags.hasAnyOs;
      return flags.hasOpenOs;
    });
  }, [osFilter, osFlagsByCodigo, points]);

  const fetchActivity = useCallback((codigo: string): Promise<ActivityApiResponse> => {
    const cached = activityCacheRef.current.get(codigo);
    if (cached) return cached;

    const promise = fetch(`/api/produttivo/parada-activity?ped=${encodeURIComponent(codigo)}`)
      .then((res) => res.json() as Promise<ActivityApiResponse>)
      .catch(() => ({ items: [], hasAnyOs: false, hasOpenOs: false }));

    activityCacheRef.current.set(codigo, promise);
    return promise;
  }, []);

  const stopOsFilterLoading = useCallback(() => {
    cancelOsLoadingRef.current = true;
    osLoadingRunRef.current += 1;
    setIsLoadingOsFilter(false);
    setOsLoadingProgress({ processed: 0, total: 0 });
    setOsFilter("none");
  }, []);

  const equipmentSummary = useMemo<EquipmentSummaryItem[]>(() => {
    const countByType = new Map<string, number>();

    filteredPoints.forEach((point) => {
      const type = normalizeEquipmentType(point);
      countByType.set(type, (countByType.get(type) ?? 0) + 1);
    });

    return Array.from(countByType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type, "pt-BR"));
  }, [filteredPoints]);

  const colorByType = useMemo(() => {
    const entries = equipmentSummary.map((summary, index) => [
      summary.type,
      PALETTE[index % PALETTE.length],
    ] as const);

    return new Map(entries);
  }, [equipmentSummary]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView(FORTALEZA_CENTER, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (osFilter === "none") {
      cancelOsLoadingRef.current = false;
      setIsLoadingOsFilter(false);
      setOsLoadingProgress({ processed: 0, total: 0 });
      return;
    }

    const missingCodes = points
      .map((point) => point.codigo)
      .filter((codigo) => !osFlagsByCodigo[codigo]);

    if (missingCodes.length === 0) {
      setIsLoadingOsFilter(false);
      setOsLoadingProgress({ processed: 0, total: 0 });
      return;
    }

    let active = true;
    cancelOsLoadingRef.current = false;
    const runId = osLoadingRunRef.current + 1;
    osLoadingRunRef.current = runId;
    setIsLoadingOsFilter(true);
    setOsLoadingProgress({ processed: 0, total: missingCodes.length });

    void (async () => {
      const collected: Record<string, { hasAnyOs: boolean; hasOpenOs: boolean }> = {};
      const chunkSize = 12;
      let processed = 0;

      try {
        for (let i = 0; i < missingCodes.length; i += chunkSize) {
          if (!active || cancelOsLoadingRef.current || runId !== osLoadingRunRef.current) {
            break;
          }

          const chunk = missingCodes.slice(i, i + chunkSize);
          const responses = await Promise.all(chunk.map((codigo) => fetchActivity(codigo)));

          if (!active || cancelOsLoadingRef.current || runId !== osLoadingRunRef.current) {
            break;
          }

          chunk.forEach((codigo, index) => {
            const response = responses[index];
            collected[codigo] = {
              hasAnyOs: Boolean(response.hasAnyOs),
              hasOpenOs: Boolean(response.hasOpenOs),
            };
          });

          processed += chunk.length;
          if (active) {
            setOsLoadingProgress({ processed, total: missingCodes.length });
          }
        }

        if (!active || cancelOsLoadingRef.current || runId !== osLoadingRunRef.current) return;
        setOsFlagsByCodigo((prev) => ({ ...prev, ...collected }));
      } finally {
        if (active && runId === osLoadingRunRef.current) {
          setIsLoadingOsFilter(false);
          if (cancelOsLoadingRef.current) {
            setOsLoadingProgress({ processed: 0, total: 0 });
          } else {
            setOsLoadingProgress({ processed: missingCodes.length, total: missingCodes.length });
          }
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchActivity, osFilter, osFlagsByCodigo, points]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerRef.current;

    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (filteredPoints.length === 0) {
      map.setView(FORTALEZA_CENTER, 11);
      return;
    }

    const latLngs: L.LatLngExpression[] = [];

    filteredPoints.forEach((point) => {
      const type = normalizeEquipmentType(point);
      const color = colorByType.get(type) ?? "#2563eb";

      latLngs.push([point.latitude, point.longitude]);

      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 6,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.75,
      });

      const endereco = [point.logradouro, point.bairro, point.municipio]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(", ");

      const makePopupContent = (activityLine: string) =>
        `<div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.6;max-width:260px;">
          <strong>Parada ${escapeHtml(point.codigo)}</strong><br/>
          Tipo: ${escapeHtml(type)}<br/>
          ${endereco ? `Endereco: ${escapeHtml(endereco)}<br/>` : ""}
          Lat/Lng: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}
          <hr style="margin:5px 0;border-color:#e2e8f0"/>
          ${activityLine}
        </div>`;

      marker.bindPopup(
        makePopupContent('<span style="color:#94a3b8">&#9203; Carregando atividade...</span>'),
        { minWidth: 210 },
      );

      let fetched = false;
      marker.on("popupopen", () => {
        if (fetched) return;
        fetched = true;

        void fetchActivity(point.codigo)
          .then((data: ActivityApiResponse) => {
            setOsFlagsByCodigo((prev) => {
              const current = prev[point.codigo];
              if (current) return prev;
              return {
                ...prev,
                [point.codigo]: {
                  hasAnyOs: Boolean(data.hasAnyOs),
                  hasOpenOs: Boolean(data.hasOpenOs),
                },
              };
            });

            const items = data.items ?? [];
            const activityLine =
              items.length > 0
                ? `<span style="color:#64748b">&#x1F4CB; &Uacute;ltimas OS:</span><br/>${items
                    .map(
                      (item, index) =>
                        `<div style="margin-top:${index === 0 ? "4" : "8"}px;">` +
                        `<strong>${escapeHtml(item.tipo)}</strong><br/>` +
                        `<span style="color:#64748b">Data:</span> ${escapeHtml(item.date)}<br/>` +
                        `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">Abrir OS #${item.id}</a>` +
                        `</div>`,
                    )
                    .join("")}`
                : `<span style="color:#94a3b8">Sem atividade encontrada</span>`;

            marker.setPopupContent(makePopupContent(activityLine));
          })
          .catch(() => {
            marker.setPopupContent(
              makePopupContent('<span style="color:#ef4444">Erro ao carregar</span>'),
            );
          });
      });

      marker.addTo(layerGroup);
    });

    map.fitBounds(L.latLngBounds(latLngs), {
      padding: [36, 36],
      maxZoom: 16,
    });
  }, [colorByType, fetchActivity, filteredPoints]);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div
        ref={containerRef}
        className={`${heightClassName} w-full rounded-2xl border border-slate-200 bg-white shadow-sm`}
      />

      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Legenda</div>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Tipo de equipamento</h3>
        <p className="mt-1 text-sm text-slate-600">
          {equipmentSummary.length} tipos encontrados em {filteredPoints.length} paradas georreferenciadas.
        </p>

        <div className="mt-4 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filtro de OS</span>
          <select
            value={osFilter}
            onChange={(event) => setOsFilter(event.target.value as OsFilter)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
          >
            <option value="none">Nao aplicar filtro de OS</option>
            <option value="without-os">Sem nenhuma OS</option>
            <option value="with-open-os">Com OS aberta</option>
          </select>
          {osFilter !== "none" ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {isLoadingOsFilter
                  ? `Carregando status de OS... ${osLoadingPercent}% (${osLoadingProgress.processed}/${osLoadingProgress.total})`
                  : `Filtro aplicado: ${filteredPoints.length} paradas encontradas.`}
              </p>
              {isLoadingOsFilter ? (
                <button
                  type="button"
                  onClick={stopOsFilterLoading}
                  className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Interromper filtragem
                </button>
              ) : null}
              {isLoadingOsFilter ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-200"
                    style={{ width: `${osLoadingPercent}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <ul className="mt-4 max-h-[480px] space-y-2 overflow-auto pr-1">
          {equipmentSummary.map((item) => {
            const color = colorByType.get(item.type) ?? "#2563eb";

            return (
              <li
                key={item.type}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-slate-700">{item.type}</span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {item.count}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>
    </section>
  );
}
