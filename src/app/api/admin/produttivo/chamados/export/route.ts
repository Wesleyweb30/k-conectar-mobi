import * as XLSX from "xlsx";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatShortDate } from "@/lib/date-formatting";
import {
  extractTicketPed,
  filterProduttivoTickets,
  formatCategoryWithDeadline,
  getDeadlineStatus,
} from "@/lib/produttivo-ticket-filters";
import { getPriorityFromCategory, statusLabel } from "@/lib/ticket-priority";
import {
  getAllProduttivoTickets,
  getProduttivoTicketAppUrl,
} from "@/service/produttivo.service";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const allTickets = await getAllProduttivoTickets(100, "pending");
  const sortedTickets = [...allTickets].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const { filteredTickets, paradaCount } = filterProduttivoTickets(sortedTickets, {
    title: searchParams.get("title") ?? undefined,
    ped: searchParams.get("ped") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    issue: searchParams.get("issue") ?? undefined,
    onlyDuplicated: searchParams.get("onlyDuplicated") === "1",
    onlyOverdue: searchParams.get("onlyOverdue") === "1",
    parada: searchParams.get("parada") ?? undefined,
    date: searchParams.get("date") ?? undefined,
  });

  const rows = filteredTickets.map((ticket) => {
    const priority = getPriorityFromCategory(ticket.ticket_category_name);
    const deadlineStatus = getDeadlineStatus(ticket.created_at, priority);
    const parada = ticket.resource_place_name?.trim() ?? "-";
    const duplicatedCount = parada !== "-" ? paradaCount[parada] ?? 0 : 0;

    return {
      id: ticket.id,
      numero: ticket.ticket_number ?? ticket.id,
      titulo: ticket.title ?? "-",
      descricao: ticket.description ?? "-",
      parada,
      ped: extractTicketPed(ticket) || "-",
      categoria: formatCategoryWithDeadline(ticket.ticket_category_name),
      prioridade: priority === "all" ? "-" : priority,
      status: statusLabel(ticket.status),
      prazo: deadlineStatus?.label ?? "-",
      duplicado: duplicatedCount > 1 ? "Sim" : "Nao",
      quantidadeDuplicados: duplicatedCount,
      autor: ticket.author_name ?? "-",
      emailAutor: ticket.author_email ?? "-",
      telefoneAutor: ticket.author_phone ?? "-",
      dataCriacao: formatShortDate(ticket.created_at),
      dataAtualizacao: formatShortDate(ticket.updated_at),
      linkProduttivo: getProduttivoTicketAppUrl(ticket.id),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: false });
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 38 },
    { wch: 48 },
    { wch: 24 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 30 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 48 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chamados-produttivo-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}