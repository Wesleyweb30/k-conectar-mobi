"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useReducer, useState } from "react";
import * as XLSX from "xlsx";
import ParadaRouteMap from "@/components/parada/parada-route-map";
import { ROUTE_SELECTION_TTL_MS, ROUTE_STORAGE_KEY } from "@/lib/session-policy";
import { findParadasByCodigos, findParadasByFilters } from "@/app/paradas/actions";

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
  routeFilters?: {
    codigo?: string;
    status?: string;
    municipio?: string;
    bairro?: string;
    logradouro?: string;
    novaTipologia?: string;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
    prevHref: string;
    nextHref: string;
  };
};

type RouteSelectionItem = {
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
  quantidadeAbrigosTotens: number | null;
  tipologiaAtual: string | null;
  novaTipologia: string | null;
  latitude: number;
  longitude: number;
  area: string | null;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

type RouteSelectionState = {
  items: RouteSelectionItem[];
  expiresAt: number | null;
};

type StoredRouteSelectionSnapshot = {
  items: RouteSelectionItem[];
  expiresAt: number | null;
  pendingCodigos: string[];
};

type GeolocationPositionErrorLike = {
  code?: number;
  message?: string;
};

type PedImportFeedback = {
  fileName: string;
  totalLidos: number;
  selecionados: number;
  ignoradosSemCoordenada: number;
  naoEncontrados: string[];
};

function sanitizeRouteSelection(input: unknown): RouteSelectionItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (item) =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.codigo === "string" &&
            typeof item.latitude === "number" &&
            typeof item.longitude === "number",
        ),
    )
    .map((item) => {
      const routeItem = item as Record<string, unknown>;

      return {
        id: routeItem.id as string,
        codigo: routeItem.codigo as string,
        status: typeof routeItem.status === "string" ? routeItem.status : null,
        gestao: typeof routeItem.gestao === "string" ? routeItem.gestao : null,
        classe: typeof routeItem.classe === "string" ? routeItem.classe : null,
        municipio: typeof routeItem.municipio === "string" ? routeItem.municipio : null,
        bairro: typeof routeItem.bairro === "string" ? routeItem.bairro : null,
        logradouro: typeof routeItem.logradouro === "string" ? routeItem.logradouro : null,
        referencia: typeof routeItem.referencia === "string" ? routeItem.referencia : null,
        sentido: typeof routeItem.sentido === "string" ? routeItem.sentido : null,
        quantidadeAbrigosTotens:
          typeof routeItem.quantidadeAbrigosTotens === "number"
            ? routeItem.quantidadeAbrigosTotens
            : null,
        tipologiaAtual:
          typeof routeItem.tipologiaAtual === "string" ? routeItem.tipologiaAtual : null,
        novaTipologia:
          typeof routeItem.novaTipologia === "string" ? routeItem.novaTipologia : null,
        latitude: routeItem.latitude as number,
        longitude: routeItem.longitude as number,
        area: typeof routeItem.area === "string" ? routeItem.area : null,
      };
    });
}

function buildRouteSelectionState(items: RouteSelectionItem[]): RouteSelectionState {
  return {
    items,
    expiresAt: items.length > 0 ? Date.now() + ROUTE_SELECTION_TTL_MS : null,
  };
}

function sanitizeCodigos(input: unknown) {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function readStoredSelectionState(): StoredRouteSelectionSnapshot {
  if (typeof window === "undefined") {
    return { items: [], expiresAt: null, pendingCodigos: [] };
  }

  const raw = window.localStorage.getItem(ROUTE_STORAGE_KEY);
  if (!raw) return { items: [], expiresAt: null, pendingCodigos: [] };

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      window.localStorage.removeItem(ROUTE_STORAGE_KEY);
      return { items: [], expiresAt: null, pendingCodigos: [] };
    }

    if (!parsed || typeof parsed !== "object") {
      window.localStorage.removeItem(ROUTE_STORAGE_KEY);
      return { items: [], expiresAt: null, pendingCodigos: [] };
    }

    const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : null;
    const items = sanitizeRouteSelection((parsed as { items?: unknown }).items);
    const pendingCodigos = sanitizeCodigos((parsed as { codigos?: unknown }).codigos);

    if (!expiresAt || expiresAt <= Date.now() || (items.length === 0 && pendingCodigos.length === 0)) {
      window.localStorage.removeItem(ROUTE_STORAGE_KEY);
      return { items: [], expiresAt: null, pendingCodigos: [] };
    }

    return { items, expiresAt, pendingCodigos };
  } catch {
    window.localStorage.removeItem(ROUTE_STORAGE_KEY);
    return { items: [], expiresAt: null, pendingCodigos: [] };
  }
}

type RouteSelectionAction =
  | { type: "set"; items: RouteSelectionItem[] }
  | { type: "update"; updater: (items: RouteSelectionItem[]) => RouteSelectionItem[] }
  | { type: "clear" };

function routeSelectionReducer(
  state: RouteSelectionState,
  action: RouteSelectionAction,
): RouteSelectionState {
  if (action.type === "clear") {
    return { items: [], expiresAt: null };
  }

  if (action.type === "set") {
    return buildRouteSelectionState(action.items);
  }

  return buildRouteSelectionState(action.updater(state.items));
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function toRouteSelectionItem(parada: ParadaRow): RouteSelectionItem | null {
  if (parada.latitude === null || parada.longitude === null) return null;

  return {
    id: parada.id,
    codigo: parada.codigo,
    status: parada.status,
    gestao: parada.gestao,
    classe: parada.classe,
    municipio: parada.municipio,
    bairro: parada.bairro,
    logradouro: parada.logradouro,
    referencia: parada.referencia,
    sentido: parada.sentido,
    quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens,
    tipologiaAtual: parada.tipologiaAtual,
    novaTipologia: parada.novaTipologia,
    latitude: parada.latitude,
    longitude: parada.longitude,
    area: parada.area,
  };
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

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim();
}

function promptFileName(defaultBaseName: string, extension: ".xlsx" | ".kml") {
  if (typeof window === "undefined") return null;

  const response = window.prompt("Informe o nome do arquivo:", defaultBaseName);
  if (response === null) return null;

  const normalized = sanitizeFileName(response.replace(new RegExp(`${extension}$`, "i"), ""));
  const finalBaseName = normalized || defaultBaseName;
  return `${finalBaseName}${extension}`;
}

function openExternalPage(url: string, targetWindow?: Window | null) {
  if (typeof window === "undefined") return false;

  if (targetWindow && !targetWindow.closed) {
    try {
      targetWindow.location.href = url;
      return true;
    } catch {
      // continua para os proximos fallbacks
    }
  }

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (popup) {
    return true;
  }

  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    return false;
  }
}

function formatCoordinate(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(6) : "";
}

function resolveGeolocationErrorMessage(error: GeolocationPositionErrorLike | null | undefined) {
  if (!error) return "Nao foi possivel obter a localizacao atual.";

  if (error.code === 1) {
    return "Permissao de localizacao negada. Ative a localizacao no navegador do celular.";
  }

  if (error.code === 2) {
    return "Localizacao indisponivel no momento. Verifique GPS/rede e tente novamente.";
  }

  if (error.code === 3) {
    return "Tempo esgotado ao obter localizacao. Tente novamente em local aberto.";
  }

  return error.message || "Nao foi possivel obter a localizacao atual.";
}

function getCurrentPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function getCurrentPositionWithFallback() {
  try {
    return await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    });
  } catch {
    return getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 120000,
    });
  }
}

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

export default function ParadaTable({
  paradas,
  routeMode = false,
  routeFilters,
  pagination,
}: Props) {
  const [initialStoredSelection] = useState<StoredRouteSelectionSnapshot>(() =>
    routeMode ? readStoredSelectionState() : { items: [], expiresAt: null, pendingCodigos: [] },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeSelectionState, dispatchRouteSelection] = useReducer(
    routeSelectionReducer,
    {
      items: initialStoredSelection.items,
      expiresAt: initialStoredSelection.expiresAt,
    },
  );
  const [pendingStoredCodigos, setPendingStoredCodigos] = useState<string[]>(
    initialStoredSelection.pendingCodigos,
  );
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [pedImportFeedback, setPedImportFeedback] = useState<PedImportFeedback | null>(null);
  const [pedModalOpen, setPedModalOpen] = useState(false);
  const [pedModalText, setPedModalText] = useState("");
  const [isProcessingPeds, setIsProcessingPeds] = useState(false);
  const [isSelectingAllFromFilters, setIsSelectingAllFromFilters] = useState(false);
  const [isResolvingStoredCodigos, setIsResolvingStoredCodigos] = useState(false);
  const routeSelection = routeSelectionState.items;

  useEffect(() => {
    if (!routeMode || typeof window === "undefined") return;
    if (routeSelectionState.items.length === 0 || !routeSelectionState.expiresAt) {
      window.localStorage.removeItem(ROUTE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      ROUTE_STORAGE_KEY,
      JSON.stringify({
        items: routeSelectionState.items,
        expiresAt: routeSelectionState.expiresAt,
      }),
    );
  }, [routeMode, routeSelectionState]);

  useEffect(() => {
    if (!routeMode || !routeSelectionState.expiresAt) return;

    const timeoutMs = Math.max(routeSelectionState.expiresAt - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      dispatchRouteSelection({ type: "clear" });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [routeMode, routeSelectionState.expiresAt]);

  useEffect(() => {
    if (!routeMode || typeof window === "undefined" || !("geolocation" in navigator)) return;

    void requestCurrentLocation({ silent: true });
  }, [routeMode]);

  useEffect(() => {
    if (!routeMode || pendingStoredCodigos.length === 0) return;

    let cancelled = false;
    setIsResolvingStoredCodigos(true);

    void findParadasByCodigos(pendingStoredCodigos)
      .then((found) => {
        if (cancelled) return;

        const foundByCodigo = new Map(found.map((parada) => [parada.codigo.trim().toLowerCase(), parada]));
        const matchedWithCoordinates: RouteSelectionItem[] = [];
        const naoEncontrados: string[] = [];
        let ignoradosSemCoordenada = 0;

        pendingStoredCodigos.forEach((codigo) => {
          const parada = foundByCodigo.get(codigo.toLowerCase());

          if (!parada) {
            naoEncontrados.push(codigo);
            return;
          }

          if (parada.latitude === null || parada.longitude === null) {
            ignoradosSemCoordenada += 1;
            return;
          }

          matchedWithCoordinates.push({
            id: parada.id,
            codigo: parada.codigo,
            status: parada.status,
            gestao: parada.gestao,
            classe: parada.classe,
            municipio: parada.municipio,
            bairro: parada.bairro,
            logradouro: parada.logradouro,
            referencia: parada.referencia,
            sentido: parada.sentido,
            quantidadeAbrigosTotens: parada.quantidadeAbrigosTotens,
            tipologiaAtual: parada.tipologiaAtual,
            novaTipologia: parada.novaTipologia,
            latitude: parada.latitude,
            longitude: parada.longitude,
            area: parada.area,
          });
        });

        dispatchRouteSelection({
          type: "update",
          updater: (prev) => {
            const existingIdSet = new Set(prev.map((item) => item.id));
            const toAdd = matchedWithCoordinates.filter((item) => !existingIdSet.has(item.id));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          },
        });

        setPedImportFeedback({
          fileName: "atalho-chamados",
          totalLidos: pendingStoredCodigos.length,
          selecionados: matchedWithCoordinates.length,
          ignoradosSemCoordenada,
          naoEncontrados,
        });
        setPendingStoredCodigos([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingStoredCodigos(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pendingStoredCodigos, routeMode]);

  const selectedRouteIdSet = useMemo(
    () => new Set(routeSelection.map((item) => item.id)),
    [routeSelection],
  );

  const selectableParadasOnPage = useMemo(
    () => paradas.map(toRouteSelectionItem).filter((item): item is RouteSelectionItem => item !== null),
    [paradas],
  );

  const selectedParadasOnPageCount = useMemo(
    () => selectableParadasOnPage.filter((parada) => selectedRouteIdSet.has(parada.id)).length,
    [selectableParadasOnPage, selectedRouteIdSet],
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

  function requestCurrentLocation(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (typeof window === "undefined") {
      return Promise.resolve<CurrentLocation | null>(null);
    }

    if (!("geolocation" in navigator)) {
      const errorMessage = "Geolocalizacao nao disponivel neste navegador.";
      if (!silent) {
        setLocationError(errorMessage);
      }
      return Promise.resolve<CurrentLocation | null>(null);
    }

    if (!window.isSecureContext) {
      const errorMessage = "Localizacao exige HTTPS no mobile. Abra o sistema em conexao segura.";
      if (!silent) {
        setLocationError(errorMessage);
      }
      return Promise.resolve<CurrentLocation | null>(null);
    }

    setIsRequestingLocation(true);

    return new Promise<CurrentLocation | null>((resolve) => {
      void getCurrentPositionWithFallback()
        .then((position) => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            capturedAt: new Date().toISOString(),
          };

          setCurrentLocation(nextLocation);
          setLocationError(null);
          resolve(nextLocation);
        })
        .catch((error: GeolocationPositionErrorLike) => {
          if (!silent) {
            setLocationError(resolveGeolocationErrorMessage(error));
          }
          resolve(null);
        })
        .finally(() => {
          setIsRequestingLocation(false);
        });
    });
  }

  function buildAddress(point: RouteSelectionItem, paradaAtual?: ParadaRow) {
    return [
      point.logradouro ?? paradaAtual?.logradouro ?? "",
      point.bairro ?? paradaAtual?.bairro ?? "",
      point.municipio ?? paradaAtual?.municipio ?? "",
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ");
  }

  function buildKmlDescription(fields: Array<[string, string]>) {
    const rows = fields
      .map(
        ([label, value]) =>
          `<tr><th align="left">${escapeXml(label)}</th><td>${escapeXml(value || "-")}</td></tr>`,
      )
      .join("");

    return `<![CDATA[<table border="1" cellpadding="6" cellspacing="0">${rows}</table>]]>`;
  }

  function toggleRouteSelection(parada: ParadaRow) {
    const routeItem = toRouteSelectionItem(parada);
    if (!routeItem) return;

    dispatchRouteSelection({
      type: "update",
      updater: (prev) => {
        if (prev.some((item) => item.id === parada.id)) {
          return prev.filter((item) => item.id !== parada.id);
        }

        return [...prev, routeItem];
      },
    });
  }

  function selectCurrentPage() {
    if (selectableParadasOnPage.length === 0) return;

    dispatchRouteSelection({
      type: "update",
      updater: (prev) => {
        const existingIdSet = new Set(prev.map((item) => item.id));
        const toAdd = selectableParadasOnPage.filter((item) => !existingIdSet.has(item.id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      },
    });
  }

  async function selectAllFromFilters() {
    if (isSelectingAllFromFilters) return;

    setIsSelectingAllFromFilters(true);

    try {
      const filteredParadas = await findParadasByFilters(routeFilters);
      const withCoordinates = filteredParadas.filter(
        (parada) => parada.latitude !== null && parada.longitude !== null,
      );

      dispatchRouteSelection({
        type: "update",
        updater: (prev) => {
          const idSet = new Set(prev.map((item) => item.id));
          const next = [...prev];

          withCoordinates.forEach((parada) => {
            const routeItem = toRouteSelectionItem(parada);
            if (!routeItem || idSet.has(routeItem.id)) return;

            next.push(routeItem);
          });

          return next;
        },
      });
    } finally {
      setIsSelectingAllFromFilters(false);
    }
  }

  function removeFromRoute(id: string) {
    dispatchRouteSelection({
      type: "update",
      updater: (prev) => prev.filter((item) => item.id !== id),
    });
  }

  async function processPedText(text: string) {
    const pedList = Array.from(
      new Set(
        text
          .split(/[\n\r\u2028\u2029,;\t ]+/g)
          .map((token) => token.trim())
          .filter(Boolean),
      ),
    );

    if (pedList.length === 0) return;

    setIsProcessingPeds(true);

    try {
      const found = await findParadasByCodigos(pedList);

      const foundByCodigo = new Map(
        found.map((p) => [p.codigo.trim().toLowerCase(), p]),
      );

      const matchedWithCoordinates: RouteSelectionItem[] = [];
      const naoEncontrados: string[] = [];
      let ignoradosSemCoordenada = 0;

      pedList.forEach((ped) => {
        const p = foundByCodigo.get(ped.toLowerCase());

        if (!p) {
          naoEncontrados.push(ped);
          return;
        }

        if (p.latitude === null || p.longitude === null) {
          ignoradosSemCoordenada += 1;
          return;
        }

        matchedWithCoordinates.push({
          id: p.id,
          codigo: p.codigo,
          status: p.status,
          gestao: p.gestao,
          classe: p.classe,
          municipio: p.municipio,
          bairro: p.bairro,
          logradouro: p.logradouro,
          referencia: p.referencia,
          sentido: p.sentido,
          quantidadeAbrigosTotens: p.quantidadeAbrigosTotens,
          tipologiaAtual: p.tipologiaAtual,
          novaTipologia: p.novaTipologia,
          latitude: p.latitude,
          longitude: p.longitude,
          area: p.area,
        });
      });

      dispatchRouteSelection({
        type: "update",
        updater: (prev) => {
          const existingIdSet = new Set(prev.map((item) => item.id));
          const toAdd = matchedWithCoordinates.filter((item) => !existingIdSet.has(item.id));
          return [...prev, ...toAdd];
        },
      });

      setPedImportFeedback({
        fileName: "colagem",
        totalLidos: pedList.length,
        selecionados: matchedWithCoordinates.length,
        ignoradosSemCoordenada,
        naoEncontrados,
      });

      setPedModalOpen(false);
      setPedModalText("");
    } finally {
      setIsProcessingPeds(false);
    }
  }

  function openInGoogleMaps() {
    if (routePoints.length === 0 || typeof window === "undefined") return;

    const originLocation = currentLocation;
    // Atualiza a localizacao em segundo plano para as proximas aberturas sem bloquear o clique.
    if (!originLocation) {
      void requestCurrentLocation({ silent: true });
    }

    if (routePoints.length === 1) {
      const [point] = routePoints;
      if (originLocation) {
        const params = new URLSearchParams({
          api: "1",
          travelmode: "driving",
          origin: `${originLocation.latitude},${originLocation.longitude}`,
          destination: `${point.latitude},${point.longitude}`,
        });
        const url = `https://www.google.com/maps/dir/?${params.toString()}`;
        if (!openExternalPage(url)) {
          setLocationError("Nao foi possivel abrir nova aba. Permita pop-ups para este site.");
        }
        return;
      }

      const query = `${point.latitude},${point.longitude}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      if (!openExternalPage(url)) {
        setLocationError("Nao foi possivel abrir nova aba. Permita pop-ups para este site.");
      }
      return;
    }

    const origin = originLocation
      ? `${originLocation.latitude},${originLocation.longitude}`
      : `${routePoints[0].latitude},${routePoints[0].longitude}`;
    const destination = `${routePoints[routePoints.length - 1].latitude},${routePoints[routePoints.length - 1].longitude}`;
    const waypointPoints = originLocation
      ? routePoints.slice(0, -1)
      : routePoints.slice(1, -1);
    const waypoints = waypointPoints
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
    if (!openExternalPage(url)) {
      setLocationError("Nao foi possivel abrir nova aba. Permita pop-ups para este site.");
    }
  }

  function downloadRouteExcel() {
    if (routePoints.length === 0) return;

    const fileName = promptFileName("rota-paradas", ".xlsx");
    if (!fileName) return;

    const exportRows: ExportAllRow[] = routePoints.map((point) => {
      const paradaAtual = paradaById.get(point.id);
      const quantidadeAbrigosTotens = point.quantidadeAbrigosTotens ?? paradaAtual?.quantidadeAbrigosTotens ?? null;
      const latitude = point.latitude ?? paradaAtual?.latitude ?? null;
      const longitude = point.longitude ?? paradaAtual?.longitude ?? null;

      return {
        id: point.id,
        codigo: point.codigo,
        status: point.status ?? paradaAtual?.status ?? "",
        gestao: point.gestao ?? paradaAtual?.gestao ?? "",
        classe: point.classe ?? paradaAtual?.classe ?? "",
        municipio: point.municipio ?? paradaAtual?.municipio ?? "",
        bairro: point.bairro ?? paradaAtual?.bairro ?? "",
        logradouro: point.logradouro ?? paradaAtual?.logradouro ?? "",
        referencia: point.referencia ?? paradaAtual?.referencia ?? "",
        sentido: point.sentido ?? paradaAtual?.sentido ?? "",
        "tipologia atual": point.tipologiaAtual ?? paradaAtual?.tipologiaAtual ?? "",
        quantidade: quantidadeAbrigosTotens === null ? "" : String(quantidadeAbrigosTotens),
        "nova tipologia": point.novaTipologia ?? paradaAtual?.novaTipologia ?? "",
        latitude: typeof latitude === "number" ? String(latitude) : "",
        longitude: typeof longitude === "number" ? String(longitude) : "",
        area: point.area ?? paradaAtual?.area ?? "",
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
    XLSX.writeFile(workbook, fileName);
  }

  async function downloadRouteKml() {
    if (routePoints.length === 0) return;

    const fileName = promptFileName("rota-paradas", ".kml");
    if (!fileName) return;

    const myMapsPage = window.open("", "_blank", "noopener,noreferrer");

    const routePlacemarks = routePoints
      .map((point, index) => {
        const paradaAtual = paradaById.get(point.id);
        const endereco = buildAddress(point, paradaAtual);
        const quantidade = point.quantidadeAbrigosTotens ?? paradaAtual?.quantidadeAbrigosTotens;
        const tipologiaAtual = point.tipologiaAtual ?? paradaAtual?.tipologiaAtual ?? "";
        const novaTipologia = point.novaTipologia ?? paradaAtual?.novaTipologia ?? "";
        const description = buildKmlDescription([
          ["Ordem", String(index + 1)],
          ["PED", point.codigo],
          ["Endereco", endereco],
          ["Quantidade", quantidade === null || quantidade === undefined ? "-" : String(quantidade)],
          ["Tipologia atual", tipologiaAtual],
          ["Nova tipologia", novaTipologia],
          ["Latitude", formatCoordinate(point.latitude)],
          ["Longitude", formatCoordinate(point.longitude)],
        ]);

        return `
    <Placemark>
      <name>${escapeXml(point.codigo)}</name>
      <styleUrl>#route-stop</styleUrl>
      <description>${description}</description>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`;
      })
      .join("");

    const lineCoordinates = routePoints
      .map((point) => `${point.longitude},${point.latitude},0`)
      .join(" ");

    const routeLinePlacemark = routePoints.length >= 2
      ? `
    <Placemark>
      <name>Trajeto da rota</name>
      <styleUrl>#route-line</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${lineCoordinates}</coordinates>
      </LineString>
    </Placemark>`
      : "";

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Rota de paradas</name>
    <Style id="route-stop">
      <IconStyle>
        <color>ff0f766e</color>
        <scale>1.2</scale>
      </IconStyle>
      <LabelStyle>
        <scale>0.9</scale>
      </LabelStyle>
    </Style>
    <Style id="route-line">
      <LineStyle>
        <color>ff2563eb</color>
        <width>4</width>
      </LineStyle>
    </Style>${routeLinePlacemark}${routePlacemarks}
  </Document>
</kml>`;

    downloadTextFile(
      kml,
      fileName,
      "application/vnd.google-earth.kml+xml;charset=utf-8;",
    );

    openExternalPage("https://www.google.com/maps/d/u/0/", myMapsPage);
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
                      className="h-5 w-5 accent-blue-600 disabled:cursor-not-allowed"
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

      {routeMode && pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-600 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)]">
          <span className="font-medium text-slate-700">
            Página {pagination.currentPage} de {pagination.totalPages}
          </span>

          <div className="flex gap-2">
            <Link
              href={pagination.prevHref}
              aria-disabled={!pagination.hasPrev}
              className={`rounded-xl px-4 py-2.5 transition ${
                pagination.hasPrev
                  ? "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                  : "border border-slate-200 text-slate-400 pointer-events-none"
              }`}
            >
              Anterior
            </Link>
            <Link
              href={pagination.nextHref}
              aria-disabled={!pagination.hasNext}
              className={`rounded-xl px-4 py-2.5 transition ${
                pagination.hasNext
                  ? "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50"
                  : "border border-slate-200 text-slate-400 pointer-events-none"
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      ) : null}

      {routeMode ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 md:text-lg">Rota no mapa</h3>
              <p className="mt-1 text-sm text-slate-600">
                Filtre e selecione paradas. As selecionadas continuam salvas mesmo mudando os filtros.
              </p>
              {!currentLocation ? (
                <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-3 md:hidden">
                  <p className="text-sm font-medium text-sky-900">
                    Toque para usar a localizacao atual do smartphone como origem da rota.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void requestCurrentLocation();
                    }}
                    disabled={isRequestingLocation}
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRequestingLocation ? "Solicitando localizacao..." : "Usar localizacao do smartphone"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  void requestCurrentLocation();
                }}
                disabled={isRequestingLocation}
                className="col-span-2 h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-1 md:h-9 md:rounded-lg"
              >
                {isRequestingLocation
                  ? "Solicitando..."
                  : currentLocation
                    ? "Atualizar localização"
                    : "Usar localização"}
              </button>
              <button
                type="button"
                onClick={selectCurrentPage}
                disabled={selectableParadasOnPage.length === 0 || selectedParadasOnPageCount === selectableParadasOnPage.length}
                className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:rounded-lg"
              >
                {selectableParadasOnPage.length === 0
                  ? "Pagina atual sem coordenadas"
                  : selectedParadasOnPageCount === selectableParadasOnPage.length
                    ? "Pagina atual selecionada"
                    : "Selecionar pagina atual"}
              </button>
              <button
                type="button"
                onClick={selectAllFromFilters}
                disabled={isSelectingAllFromFilters}
                className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 md:h-9 md:rounded-lg"
              >
                {isSelectingAllFromFilters ? "Selecionando..." : "Selecionar todos do filtro"}
              </button>
              <button
                type="button"
                onClick={() => dispatchRouteSelection({ type: "clear" })}
                className="h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 md:h-9 md:rounded-lg"
              >
                Limpar rota
              </button>
              <button
                type="button"
                onClick={openInGoogleMaps}
                disabled={routePoints.length === 0}
                className="col-span-2 h-11 rounded-xl border border-blue-300 bg-blue-50/50 px-3 text-sm font-medium text-blue-700 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-1 md:h-9 md:rounded-lg md:bg-transparent md:font-normal"
              >
                Abrir no Google Maps
              </button>
              <button
                type="button"
                onClick={downloadRouteExcel}
                disabled={routePoints.length === 0}
                className="h-11 rounded-xl border border-violet-300 px-3 text-sm text-violet-700 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:rounded-lg"
              >
                Exportar Excel
              </button>
              <button
                type="button"
                onClick={downloadRouteKml}
                disabled={routePoints.length === 0}
                className="h-11 rounded-xl border border-amber-300 px-3 text-sm text-amber-700 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:rounded-lg"
              >
                Exportar KML
              </button>
              <button
                type="button"
                onClick={() => setPedModalOpen(true)}
                className="col-span-2 h-11 rounded-xl border border-teal-300 bg-teal-50 px-3 text-sm font-medium text-teal-700 transition duration-200 hover:-translate-y-0.5 hover:bg-teal-100 md:col-span-1 md:h-9 md:rounded-lg"
              >
                Selecionar por PEDs
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
            <span className={`rounded-full px-3 py-1 font-medium ${currentLocation ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
              {currentLocation
                ? `Local atual: ${formatCoordinate(currentLocation.latitude)}, ${formatCoordinate(currentLocation.longitude)}`
                : "Local atual indisponivel"}
            </span>
            {locationError ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
                {locationError}
              </span>
            ) : null}
            {pedImportFeedback ? (
              <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-teal-700">
                {pedImportFeedback.selecionados}/{pedImportFeedback.totalLidos} PED(s) selecionados
              </span>
            ) : null}
            {isResolvingStoredCodigos ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                Carregando PED(s) recebidos...
              </span>
            ) : null}
            {pedImportFeedback && (pedImportFeedback.naoEncontrados.length > 0 || pedImportFeedback.ignoradosSemCoordenada > 0) ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                Nao encontrados: {pedImportFeedback.naoEncontrados.length} • sem coordenada: {pedImportFeedback.ignoradosSemCoordenada}
              </span>
            ) : null}
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
            currentLocation={currentLocation}
            heightClassName="h-[420px] md:h-[64vh]"
          />
        </div>
      ) : null}

      {pedModalOpen ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => { setPedModalOpen(false); setPedModalText(""); }}
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Selecionar por PEDs</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cole os códigos PED abaixo, um por linha ou separados por vírgula/espaço.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPedModalOpen(false); setPedModalText(""); }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <textarea
              value={pedModalText}
              onChange={(e) => setPedModalText(e.target.value)}
              placeholder={"140421\n150408\n150445\n150109\n150110"}
              rows={10}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPedModalOpen(false); setPedModalText(""); }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pedModalText.trim().length === 0 || isProcessingPeds}
                onClick={() => void processPedText(pedModalText)}
                className="rounded-xl border border-teal-300 bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessingPeds ? "Buscando..." : "Selecionar paradas"}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
          className={`absolute right-0 top-0 z-10 h-full w-full max-w-xl bg-white shadow-2xl transition-transform duration-300 ${
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
                  aria-label="Fechar detalhes"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
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