export function normalizeTextParam(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function buildSearchParams(
  filters: Record<string, string | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    params.set(key, value);
  }

  return params;
}

/**
 * Constrói uma URL de href com parâmetros de busca e paginação opcional.
 * Suporta valores únicos (string), múltiplos (string[]) e ignora valores vazios.
 *
 * @param basePath - caminho base (ex.: "/admin/produttivo/chamados")
 * @param params   - mapa de parâmetros; arrays geram múltiplos `key=value`
 * @param page     - se fornecido, adiciona `page=<n>` aos parâmetros
 */
export function buildHref(
  basePath: string,
  params: Record<string, string | string[] | undefined>,
  page?: number,
): string {
  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) sp.append(key, item);
      }
    } else if (value) {
      sp.set(key, value);
    }
  }

  if (page !== undefined) {
    sp.set("page", String(page));
  }

  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
