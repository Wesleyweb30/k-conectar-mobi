"use client";

import { formatDateTimeSeparate, formatElapsedTime } from "@/lib/datetime-formatting";

interface DateTimeFieldProps {
  label: string;
  value?: string | null;
  className?: string;
}

/**
 * Componente para exibir um campo de data/hora de forma agradável
 * Ex: "DATA E HORA - INICIO DE SERVIÇO" com "2026-04-27T13:04:00.000-03:00"
 */
export function DateTimeField({ label, value, className }: DateTimeFieldProps) {
  if (!value) return null;
  
  const { date, time } = formatDateTimeSeparate(value);
  
  if (!date || !time) return null;
  
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-3 ${className || ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium text-slate-900">{date}</p>
        <p className="text-sm text-slate-600">às {time}</p>
      </div>
    </div>
  );
}

interface ServiceIntervalProps {
  startLabel: string;
  startValue?: string | null;
  endLabel: string;
  endValue?: string | null;
  showDuration?: boolean;
  className?: string;
}

/**
 * Componente para exibir intervalo de serviço (início, fim e duração)
 */
export function ServiceInterval({
  startLabel,
  startValue,
  endLabel,
  endValue,
  showDuration = true,
  className,
}: ServiceIntervalProps) {
  if (!startValue && !endValue) return null;
  
  const startFormatted = formatDateTimeSeparate(startValue);
  const endFormatted = formatDateTimeSeparate(endValue);
  const duration = formatElapsedTime(startValue, endValue);
  
  return (
    <div className={`space-y-2 rounded-2xl border border-slate-200 bg-white p-4 ${className || ""}`}>
      {startValue && startFormatted.date && (
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{startLabel}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{startFormatted.date}</p>
            <p className="text-sm text-slate-600">às {startFormatted.time}</p>
          </div>
        </div>
      )}
      
      {endValue && endFormatted.date && (
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{endLabel}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{endFormatted.date}</p>
            <p className="text-sm text-slate-600">às {endFormatted.time}</p>
          </div>
        </div>
      )}
      
      {showDuration && duration && (
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duração</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{duration}</p>
        </div>
      )}
    </div>
  );
}

interface DateTimeDisplayProps {
  value?: string | null;
  label?: string;
  showTime?: boolean;
}

/**
 * Componente simples para exibir uma data/hora em uma linha
 */
export function DateTimeDisplay({ value, label, showTime = true }: DateTimeDisplayProps) {
  if (!value) return null;
  
  const { date, time } = formatDateTimeSeparate(value);
  
  if (!date) return null;
  
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {label && <span className="font-semibold">{label}:</span>}
      <span>
        {date}
        {showTime && time && ` às ${time}`}
      </span>
    </span>
  );
}
