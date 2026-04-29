import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProduttivoAppBaseUrl,
  getProduttivoAuthHeaders,
} from "@/service/produttivo.service";

function resolveAttachmentUrl(fileUrl: string): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const appUrl = new URL(getProduttivoAppBaseUrl());
      if (url.origin !== appUrl.origin) return null;
      if (!url.pathname.startsWith("/attachments/")) return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  if (!trimmed.startsWith("/attachments/")) return null;
  return `${getProduttivoAppBaseUrl()}${trimmed}`;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get("fileUrl") ?? "";
  const targetUrl = resolveAttachmentUrl(fileUrl);

  if (!targetUrl) {
    return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: getProduttivoAuthHeaders(),
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Attachment fetch failed" }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment proxy failed" }, { status: 500 });
  }
}
