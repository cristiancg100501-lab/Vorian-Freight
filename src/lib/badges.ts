export interface BadgeConfig {
  key: "BRONZE" | "SILVER" | "GOLD" | "BLACK_DIAMOND" | "NONE";
  name: string;
  className: string;
  glowClass: string;
  nextThreshold: number | null;
  prevThreshold: number;
}

export const CUSTOMER_BADGES = {
  NONE: {
    key: "NONE" as const,
    name: "Sin Rango",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
    glowClass: "",
    nextThreshold: 1,
    prevThreshold: 0,
  },
  BRONZE: {
    key: "BRONZE" as const,
    name: "Socio Bronce",
    className: "bg-gradient-to-br from-amber-600 to-orange-700 text-amber-100 border-amber-800/40",
    glowClass: "shadow-[0_0_8px_rgba(217,119,6,0.3)]",
    nextThreshold: 6,
    prevThreshold: 1,
  },
  SILVER: {
    key: "SILVER" as const,
    name: "Socio Plata",
    className: "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-400 text-slate-800 border-slate-300/50",
    glowClass: "shadow-[0_0_8px_rgba(148,163,184,0.3)]",
    nextThreshold: 21,
    prevThreshold: 6,
  },
  GOLD: {
    key: "GOLD" as const,
    name: "Socio Oro",
    className: "bg-gradient-to-br from-yellow-400 via-amber-300 to-yellow-600 text-amber-950 border-yellow-500/40 animate-pulse",
    glowClass: "shadow-[0_0_12px_rgba(234,179,8,0.45)]",
    nextThreshold: 101,
    prevThreshold: 21,
  },
  BLACK_DIAMOND: {
    key: "BLACK_DIAMOND" as const,
    name: "Socio Diamante Negro",
    className: "bg-gradient-to-br from-neutral-950 via-indigo-950 to-neutral-900 text-purple-200 border-purple-500/30 font-bold",
    glowClass: "shadow-[0_0_15px_rgba(99,102,241,0.55)] border-indigo-500/40",
    nextThreshold: null,
    prevThreshold: 101,
  },
};

export const COMPANY_BADGES = {
  NONE: {
    key: "NONE" as const,
    name: "Sin Rango",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
    glowClass: "",
    nextThreshold: 1,
    prevThreshold: 0,
  },
  BRONZE: {
    key: "BRONZE" as const,
    name: "Flota Bronce",
    className: "bg-gradient-to-br from-amber-700 to-yellow-800 text-amber-100 border-amber-900/40",
    glowClass: "shadow-[0_0_8px_rgba(180,83,9,0.3)]",
    nextThreshold: 11,
    prevThreshold: 1,
  },
  SILVER: {
    key: "SILVER" as const,
    name: "Flota Plata",
    className: "bg-gradient-to-br from-zinc-400 via-zinc-200 to-zinc-600 text-zinc-800 border-zinc-500/30",
    glowClass: "shadow-[0_0_8px_rgba(113,113,122,0.3)]",
    nextThreshold: 51,
    prevThreshold: 11,
  },
  GOLD: {
    key: "GOLD" as const,
    name: "Flota Oro",
    className: "bg-gradient-to-br from-yellow-500 via-yellow-300 to-amber-600 text-amber-950 border-yellow-500/40 animate-pulse",
    glowClass: "shadow-[0_0_12px_rgba(234,179,8,0.45)]",
    nextThreshold: 201,
    prevThreshold: 51,
  },
  BLACK_DIAMOND: {
    key: "BLACK_DIAMOND" as const,
    name: "Flota Diamante Negro",
    className: "bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-purple-200 border-purple-500/30 font-bold",
    glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.55)] border-purple-500/40",
    nextThreshold: null,
    prevThreshold: 201,
  },
};

export function getCustomerBadge(trips: number): BadgeConfig {
  if (trips <= 0) return CUSTOMER_BADGES.NONE;
  if (trips >= 1 && trips <= 5) return CUSTOMER_BADGES.BRONZE;
  if (trips >= 6 && trips <= 20) return CUSTOMER_BADGES.SILVER;
  if (trips >= 21 && trips <= 100) return CUSTOMER_BADGES.GOLD;
  return CUSTOMER_BADGES.BLACK_DIAMOND;
}

export function getCompanyBadge(trips: number): BadgeConfig {
  if (trips <= 0) return COMPANY_BADGES.NONE;
  if (trips >= 1 && trips <= 10) return COMPANY_BADGES.BRONZE;
  if (trips >= 11 && trips <= 50) return COMPANY_BADGES.SILVER;
  if (trips >= 51 && trips <= 200) return COMPANY_BADGES.GOLD;
  return COMPANY_BADGES.BLACK_DIAMOND;
}
