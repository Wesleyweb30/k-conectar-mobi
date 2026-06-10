"use client";

import { useState } from "react";

type Props = {
  href: string;
  label: string;
  loadingLabel?: string;
  className?: string;
};

function readFileNameFromHeaders(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i);
  if (basicMatch?.[1]) return basicMatch[1];

  return fallback;
}

export default function ExcelExportButton({
  href,
  label,
  loadingLabel = "Gerando relatório...",
  className,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(href, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Falha ao exportar (status ${response.status})`);
      }

      const blob = await response.blob();
      const fileName = readFileNameFromHeaders(
        response.headers.get("content-disposition"),
        `relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("Não foi possível gerar o relatório agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={className}
      title={isLoading ? "Aguarde, o relatório está sendo gerado" : "Exportar relatório"}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
