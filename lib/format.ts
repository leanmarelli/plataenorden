import type { Moneda } from "@/types/database";

export const fmtARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const fmtUSD = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const fmtUSD2 = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const fmtNum = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

export function money(cur: Moneda, ars: number, usd: number) {
  return cur === "USD" ? fmtUSD.format(usd) : fmtARS.format(ars);
}

export function moneyCur(val: number, cur: Moneda) {
  return cur === "USD" ? fmtUSD2.format(val) : fmtARS.format(val);
}

export function pct(x: number) {
  if (!Number.isFinite(x)) return "0%";
  return (x * 100).toFixed(x < 0.1 && x > 0 ? 1 : 0) + "%";
}

export function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** "2026-08" → "Agosto 2026" */
export function labelMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const nombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${nombres[m - 1]} ${y}`;
}
