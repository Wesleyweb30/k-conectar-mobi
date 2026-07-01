"use client";

import type { ChangeEvent, PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";

type ExistingMedia = {
  attachmentId?: number;
  url: string;
};

type UploadedMedia = {
  id: number;
  url?: string;
};

type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type Props = {
  fieldIndex: number;
  fieldName: string;
  fieldKind?: string;
  accountId?: number | null;
  existingMedia: ExistingMedia[];
  existingAttachmentIds?: number[];
  inputId?: string;
};

function toProxyUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  return `/api/produttivo/attachment?fileUrl=${encodeURIComponent(fileUrl)}`;
}

export default function FormFillMediaUpload({
  fieldIndex,
  fieldName,
  fieldKind,
  accountId,
  existingMedia,
  existingAttachmentIds = [],
  inputId,
}: Props) {
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const hiddenAttachmentIds = useMemo(() => {
    const existingIdsFromMedia = existingMedia
      .map((item) => item.attachmentId)
      .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0);
    const existingIdsFromField = existingAttachmentIds
      .filter((id): id is number => Number.isInteger(id) && id > 0);
    const uploadedIds = uploadedMedia.map((item) => item.id);
    const all = [...existingIdsFromField, ...existingIdsFromMedia, ...uploadedIds];
    return [...new Set(all)].join(",");
  }, [existingAttachmentIds, existingMedia, uploadedMedia]);

  function appendUploadedMedia(items: Array<{ id: number; file_url?: string | null }>) {
    const next = items.map((item) => ({
      id: item.id,
      url: item.file_url ? toProxyUrl(item.file_url) : undefined,
    }));
    setUploadedMedia((prev) => [...prev, ...next]);
  }

  async function getDeviceLocation(): Promise<DeviceLocation | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async function uploadFiles(list: FileList | null) {
    if (!list || list.length === 0) return;

    setIsUploading(true);
    setError(null);

    const payload = new FormData();
    payload.append("source", fieldKind === "signature" ? "touch" : "camera");
    if (typeof accountId === "number" && accountId > 0) {
      payload.append("accountId", String(accountId));
    }

    const location = await getDeviceLocation();
    if (location) {
      payload.append("latitude", String(location.latitude));
      payload.append("longitude", String(location.longitude));
      payload.append("accuracy", String(location.accuracy));
    }

    Array.from(list).forEach((file) => {
      payload.append("files", file, file.name);
    });

    try {
      const response = await fetch("/api/produttivo/attachment/upload", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Falha no upload (${response.status})`);
      }

      const data = (await response.json()) as {
        attachments?: Array<{ id: number; file_url?: string | null }>;
      };
      appendUploadedMedia(data.attachments ?? []);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nao foi possivel enviar o arquivo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    await uploadFiles(event.target.files);
    event.target.value = "";
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setDrawing(true);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(event);
    if (!point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function onPointerUp() {
    setDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function uploadSignatureFromCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    setError(null);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });

    if (!blob) {
      setIsUploading(false);
      setError("Nao foi possivel gerar a assinatura.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("source", "touch");
      if (typeof accountId === "number" && accountId > 0) {
        payload.append("accountId", String(accountId));
      }

      const location = await getDeviceLocation();
      if (location) {
        payload.append("latitude", String(location.latitude));
        payload.append("longitude", String(location.longitude));
        payload.append("accuracy", String(location.accuracy));
      }

      payload.append("files", blob, "assinatura.png");

      const response = await fetch("/api/produttivo/attachment/upload", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Falha no upload da assinatura (${response.status})`);
      }

      const data = (await response.json()) as {
        attachments?: Array<{ id: number; file_url?: string | null }>;
      };

      appendUploadedMedia(data.attachments ?? []);
      clearSignature();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nao foi possivel enviar assinatura.");
    } finally {
      setIsUploading(false);
    }
  }

  const allMedia = [
    ...existingMedia.map((item) => ({ id: item.attachmentId ?? 0, url: item.url })),
    ...uploadedMedia.map((item) => ({ id: item.id, url: item.url ?? "" })),
  ].filter((item) => item.url);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <input type="hidden" name={`field_uploaded_attachment_ids_${fieldIndex}`} value={hiddenAttachmentIds} />
      <input type="hidden" name={`field_value_${fieldIndex}`} value="" />

      <p className="text-xs text-slate-600">{fieldName}: envie arquivos para este campo.</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          Tirar foto
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Escolher arquivo
        </button>
      </div>

      <input
        ref={cameraInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFileChange}
        className="hidden"
      />

      {fieldKind === "signature" ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-700">Assinatura manual</p>
          <canvas
            ref={canvasRef}
            width={560}
            height={160}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="h-40 w-full touch-none rounded-md border border-slate-300 bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearSignature}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Limpar assinatura
            </button>
            <button
              type="button"
              onClick={uploadSignatureFromCanvas}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
            >
              Enviar assinatura desenhada
            </button>
          </div>
        </div>
      ) : null}

      {isUploading ? <p className="text-xs text-sky-700">Enviando arquivo...</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {allMedia.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {allMedia.map((item, index) => (
            <a
              key={`${item.id}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <img src={item.url} alt={`${fieldName} ${index + 1}`} className="h-24 w-full object-cover" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Sem imagens anexadas.</p>
      )}
    </div>
  );
}
