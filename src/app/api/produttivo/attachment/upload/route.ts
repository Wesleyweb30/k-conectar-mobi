import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProduttivoAuthHeaders } from "@/service/produttivo.service";

type UploadedAttachment = {
  id: number;
  file_url?: string | null;
};

type UploadContext = {
  source: string;
  accountId?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  const mimeType = file.type || "application/octet-stream";
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function uploadAttachmentAsJson(file: File, context: UploadContext): Promise<Response> {
  const dataUrl = await fileToDataUrl(file);
  const nowIso = new Date().toISOString();

  const payload = {
    attachment: {
      uuid: crypto.randomUUID(),
      title: file.name || "attachment",
      file: dataUrl,
      removed: false,
      attachment_source: context.source,
      device_created_at: nowIso,
      device_updated_at: nowIso,
      ...(typeof context.accountId === "number" ? { account_id: context.accountId } : {}),
      ...(typeof context.latitude === "number" ? { latitude: context.latitude } : {}),
      ...(typeof context.longitude === "number" ? { longitude: context.longitude } : {}),
      ...(typeof context.accuracy === "number" ? { accuracy: context.accuracy } : {}),
    },
  };

  return fetch(`${process.env.PRODUTTIVO_BASE_URL}/attachments`, {
    method: "POST",
    headers: {
      ...getProduttivoAuthHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

function pickAttachmentFromPayload(payload: unknown): UploadedAttachment | null {
  if (!payload || typeof payload !== "object") return null;

  const direct = payload as { id?: unknown; file_url?: unknown };
  if (typeof direct.id === "number") {
    return {
      id: direct.id,
      file_url: typeof direct.file_url === "string" ? direct.file_url : null,
    };
  }

  const nested = (payload as { attachment?: { id?: unknown; file_url?: unknown } }).attachment;
  if (nested && typeof nested.id === "number") {
    return {
      id: nested.id,
      file_url: typeof nested.file_url === "string" ? nested.file_url : null,
    };
  }

  return null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = await request.formData().catch(() => null);
  if (!incoming) {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const files = incoming
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const sourceRaw = String(incoming.get("source") ?? "").trim().toLowerCase();
  const source = sourceRaw === "touch" ? "touch" : "camera";

  const accountIdRaw = Number(String(incoming.get("accountId") ?? ""));

  const latitudeRaw = Number(String(incoming.get("latitude") ?? ""));
  const longitudeRaw = Number(String(incoming.get("longitude") ?? ""));
  const accuracyRaw = Number(String(incoming.get("accuracy") ?? ""));

  const uploadContext: UploadContext = {
    source,
    ...(Number.isFinite(accountIdRaw) && accountIdRaw > 0 ? { accountId: accountIdRaw } : {}),
    ...(Number.isFinite(latitudeRaw) ? { latitude: latitudeRaw } : {}),
    ...(Number.isFinite(longitudeRaw) ? { longitude: longitudeRaw } : {}),
    ...(Number.isFinite(accuracyRaw) ? { accuracy: accuracyRaw } : {}),
  };

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded: UploadedAttachment[] = [];

  for (const file of files) {
    const response = await uploadAttachmentAsJson(file, uploadContext);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Attachment upload failed (status ${response.status})` },
        { status: response.status },
      );
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const attachment = pickAttachmentFromPayload(payload);

    if (!attachment) {
      return NextResponse.json(
        { error: "Upload succeeded but attachment payload is unknown" },
        { status: 502 },
      );
    }

    uploaded.push(attachment);
  }

  return NextResponse.json({ attachments: uploaded });
}
