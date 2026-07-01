import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProduttivoResourcePlaces } from "@/service/produttivo.service";

function formatLocalLabel(place: {
  hierarchy_name?: string | null;
  name?: string | null;
  address?: string | null;
}) {
  const hierarchyName = (place.hierarchy_name ?? "").trim();
  const name = (place.name ?? "").trim();
  const address = (place.address ?? "").trim();

  const primary = hierarchyName || name || "Local sem nome";
  return address ? `${primary} - ${address}` : primary;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isInteger(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 50))
    : 20;

  try {
    const response = await getProduttivoResourcePlaces({
      ...(q ? { q } : {}),
      viewMode: "Place",
      actives: true,
      perPage: limit,
    });

    const items = (response.results ?? []).map((place) => ({
      id: place.id,
      label: formatLocalLabel(place),
      name: place.name ?? null,
      hierarchyName: place.hierarchy_name ?? null,
      address: place.address ?? null,
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch resource places" }, { status: 500 });
  }
}
