/**
 * Formata uma data ISO 8601 para um formato mais legível
 * Ex: "2026-04-27T13:04:00.000-03:00" → "27 de abril de 2026 · 13:04"
 */
export function formatDateTimeReadable(isoDate?: string | null): string {
  if (!isoDate) return "";
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    
    const day = date.getDate();
    const month = date.toLocaleString("pt-BR", { month: "long" });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    return `${day} de ${month} de ${year} · ${time}`;
  } catch {
    return isoDate;
  }
}

/**
 * Formata uma data ISO 8601 para dd/mm/yyyy HH:mm
 * Ex: "2026-04-27T13:04:00.000-03:00" → "27/04/2026 13:04"
 */
export function formatDateTimeSimple(isoDate?: string | null): string {
  if (!isoDate) return "";
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    return `${day}/${month}/${year} ${time}`;
  } catch {
    return isoDate;
  }
}

/**
 * Formata uma data ISO 8601 para formato data + hora em duas linhas
 * Ex: "2026-04-27T13:04:00.000-03:00" → 
 * { date: "27 de abril de 2026", time: "13:04" }
 */
export function formatDateTimeSeparate(isoDate?: string | null): { date: string; time: string } {
  if (!isoDate) return { date: "", time: "" };
  
  try {
    const dateObj = new Date(isoDate);
    if (isNaN(dateObj.getTime())) return { date: isoDate, time: "" };
    
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString("pt-BR", { month: "long" });
    const year = dateObj.getFullYear();
    const time = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    return {
      date: `${day} de ${month} de ${year}`,
      time: time,
    };
  } catch {
    return { date: isoDate, time: "" };
  }
}

/**
 * Calcula o tempo decorrido entre duas datas ISO 8601
 * Ex: "2026-04-27T13:04:00" e "2026-04-27T14:02:00" → "58 minutos"
 */
export function formatElapsedTime(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) return "";
  
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
    
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "";
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${minutes} minuto${minutes !== 1 ? "s" : ""}`;
    }
    
    if (remainingMinutes === 0) {
      return `${hours} hora${hours !== 1 ? "s" : ""}`;
    }
    
    return `${hours}h${remainingMinutes}m`;
  } catch {
    return "";
  }
}

/**
 * Formata intervalo de tempo com três linhas de visualização
 * Útil para mostrar início, fim e duração do serviço
 */
export function formatServiceInterval(startIso?: string | null, endIso?: string | null): {
  startLabel: string;
  endLabel: string;
  durationLabel: string;
} {
  const startFormatted = formatDateTimeSeparate(startIso);
  const endFormatted = formatDateTimeSeparate(endIso);
  const duration = formatElapsedTime(startIso, endIso);
  
  return {
    startLabel: `${startFormatted.date} às ${startFormatted.time}`,
    endLabel: `${endFormatted.date} às ${endFormatted.time}`,
    durationLabel: `Duração: ${duration}`,
  };
}
