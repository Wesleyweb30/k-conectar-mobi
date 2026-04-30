/**
 * Estilos de destaque (accent) usados nos componentes de listagem do Produttivo.
 * Cada chave corresponde a uma cor de tema, com classes Tailwind para cada elemento visual.
 */
export const accentStyles = {
  amber: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(245,158,11,0.45)]",
    feedBorder: "before:from-amber-300 before:to-orange-300",
    photoLabel: "bg-amber-900/75",
    pagActive: "bg-amber-500 text-white border-amber-500",
    pagHover: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700",
  },
  sky: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-400",
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(14,165,233,0.45)]",
    feedBorder: "before:from-sky-300 before:to-cyan-300",
    photoLabel: "bg-sky-900/75",
    pagActive: "bg-sky-500 text-white border-sky-500",
    pagHover: "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
  },
  emerald: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
    feedGlow: "shadow-[0_24px_44px_-34px_rgba(16,185,129,0.45)]",
    feedBorder: "before:from-emerald-300 before:to-teal-300",
    photoLabel: "bg-emerald-900/75",
    pagActive: "bg-emerald-500 text-white border-emerald-500",
    pagHover: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
  },
} as const;

export type AccentColor = keyof typeof accentStyles;
