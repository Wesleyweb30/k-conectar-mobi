"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

type RoutePoint = {
  id: string;
  codigo: string;
  latitude: number;
  longitude: number;
};

type Props = {
  points: RoutePoint[];
  heightClassName?: string;
};

const FORTALEZA_CENTER: [number, number] = [-3.7319, -38.5267];

export default function ParadaRouteMap({ points, heightClassName = "h-[360px]" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

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

    const latLngs: L.LatLngExpression[] = points.map((point) => [point.latitude, point.longitude]);

    points.forEach((point, index) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 7,
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#60a5fa",
        fillOpacity: 0.95,
      });

      marker.bindPopup(`Ordem ${index + 1} - Parada ${point.codigo}`);
      marker.bindTooltip(`${index + 1}`, {
        direction: "top",
      });
      marker.addTo(layerGroup);
    });

    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: "#0f766e",
        weight: 4,
        opacity: 0.85,
      }).addTo(layerGroup);
    }

    map.fitBounds(L.latLngBounds(latLngs), {
      padding: [40, 40],
      maxZoom: 16,
    });
  }, [points]);

  return (
    <div
      ref={containerRef}
      className={`${heightClassName} w-full rounded-xl border border-gray-200`}
    />
  );
}