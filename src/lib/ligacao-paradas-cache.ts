export type LatestMaintenance = {
  id: number;
  createdAt: string;
};

// Cache compartilhado entre a tela e a exportacao para evitar recomputar
// manutencao por PED em chamadas seguidas.
export const workPedCache = new Map<number, string | null>();
export const latestActivityCache = new Map<string, LatestMaintenance | null>();
