"use client";

import { useEffect, useMemo, useRef } from "react";
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

export default function ParadaEquipmentMap({
  points,
  heightClassName = "h-[600px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const equipmentSummary = useMemo<EquipmentSummaryItem[]>(() => {
    const countByType = new Map<string, number>();

    points.forEach((point) => {
      const type = normalizeEquipmentType(point);
      countByType.set(type, (countByType.get(type) ?? 0) + 1);
    });

    return Array.from(countByType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type, "pt-BR"));
  }, [points]);

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
    const map = mapRef.current;
    const layerGroup = layerRef.current;

    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (points.length === 0) {
      map.setView(FORTALEZA_CENTER, 11);
      return;
    }

    const latLngs: L.LatLngExpression[] = [];

    points.forEach((point) => {
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
        void fetch(`/api/produttivo/parada-activity?ped=${encodeURIComponent(point.codigo)}`)
          .then((res) => res.json())
          .then((data: {
            items?: Array<{ id: number; tipo: string; date: string; url: string }>;
          }) => {
            const items = data.items ?? [];

            const activityLine = items.length > 0
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
  }, [colorByType, points]);

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
          {equipmentSummary.length} tipos encontrados em {points.length} paradas georreferenciadas.
        </p>

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