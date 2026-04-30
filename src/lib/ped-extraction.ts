import type { ProduttivoFieldValue } from "@/types/produttivo";

/**
 * Remove caracteres não numéricos e zeros à esquerda do valor PED.
 * Retorna null para valores vazios.
 */
export function normalizePed(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return digits.replace(/^0+(?=\d)/, "");
}

/**
 * Tenta extrair o número PED de um texto qualquer usando as regras:
 * 1. Captura o número após o último ">" (ex.: "... > 160444")
 * 2. Se for somente dígitos, retorna diretamente
 * 3. Se não houver letras mas houver dígitos, retorna apenas os dígitos
 */
function extractPedFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fromArrow = trimmed.match(/>\s*(\d+)\s*$/);
  if (fromArrow) return fromArrow[1];

  if (/^\d+$/.test(trimmed)) return trimmed;

  if (!/[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed)) {
    const digitsOnly = trimmed.replace(/\D/g, "");
    return digitsOnly || null;
  }

  return null;
}

/**
 * Extrai o número PED do título de um work do Produttivo.
 * Exemplo: "Manutenção de parada > 160444" → "160444"
 */
export function extractPedFromTitle(title?: string | null): string | null {
  if (!title) return null;
  return extractPedFromText(String(title));
}

/**
 * Extrai o número PED a partir dos field_values de um item do Produttivo,
 * buscando nos campos cujo nome contenha "atividade".
 */
export function extractPedFromFieldValues(fieldValues: ProduttivoFieldValue[]): string | null {
  const candidates = fieldValues
    .filter((field) => field.name?.toLowerCase().includes("atividade"))
    .map((field) => (Array.isArray(field.value) ? field.value[0] : field.value))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const candidate of candidates) {
    const result = extractPedFromText(candidate);
    if (result) return result;
  }

  return null;
}
