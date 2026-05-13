"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";

type RoutePoint = {
  id: string;
  codigo: string;
  latitude: number;
  longitude: number;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

type Props = {
  points: RoutePoint[];
  currentLocation?: CurrentLocation | null;
  heightClassName?: string;
  onLocationRequest?: (location: CurrentLocation) => void;
};

const FORTALEZA_CENTER: [number, number] = [-3.7319, -38.5267];

export default function ParadaRouteMap({
  points,
  currentLocation: initialLocation,
  heightClassName = "h-[360px]",
  onLocationRequest,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(initialLocation ?? null);

  useEffect(() => {
    setCurrentLocation(initialLocation ?? null);
  }, [initialLocation]);

  const requestCurrentLocation = useCallback(() => {
    setIsRequestingLocation(true);
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocalizacao nao disponivel neste navegador.");
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(newLocation);
        setLocationError(null);
        setIsRequestingLocation(false);
        onLocationRequest?.(newLocation);
      },
      (error) => {
        let errorMsg = "Erro ao obter localizacao.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Permissao de localizacao negada.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Posicao indisponivel.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Requisicao de localizacao expirou.";
        }
        setLocationError(errorMsg);
        setIsRequestingLocation(false);
      },
    );
  }, [onLocationRequest]);

  // Centralizar o mapa quando a localização mudar
  useEffect(() => {
    const map = mapRef.current;
    if (map && currentLocation) {
      // Usar setTimeout para garantir que o mapa está pronto
      const timeoutId = setTimeout(() => {
        map.setView([currentLocation.latitude, currentLocation.longitude], 19, {
          animate: true,
          duration: 1,
        });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentLocation]);

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

    if (currentLocation) {
      const currentMarker = L.circleMarker([currentLocation.latitude, currentLocation.longitude], {
        radius: 8,
        color: "#1d4ed8",
        weight: 3,
        fillColor: "#93c5fd",
        fillOpacity: 0.95,
      });

      currentMarker.bindPopup("Localizacao atual");
      currentMarker.addTo(layerGroup);
    }

    if (points.length === 0) {
      if (currentLocation) {
        map.setView([currentLocation.latitude, currentLocation.longitude], 19);
      } else {
        map.setView(FORTALEZA_CENTER, 11);
      }
      return;
    }

    const latLngs: L.LatLngExpression[] = points.map((point) => [point.latitude, point.longitude]);

    if (currentLocation) {
      latLngs.unshift([currentLocation.latitude, currentLocation.longitude]);
    }

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
  }, [currentLocation, points]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={requestCurrentLocation}
          disabled={isRequestingLocation}
          className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingLocation ? "Obtendo localizacao..." : "Mostrar minha localizacao"}
        </button>
        {currentLocation && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: "#93c5fd" }}
            />
            <span className="text-xs font-medium text-slate-700">Localizado</span>
          </div>
        )}
      </div>

      {locationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{locationError}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`${heightClassName} w-full rounded-xl border border-gray-200`}
      />
    </div>
  );
}