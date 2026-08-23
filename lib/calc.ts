import type { Fijo, Movimiento, Moneda } from "@/types/database";

/** Convierte el monto de un movimiento a ARS usando su TC o el TC de referencia. */
export function arsOf(m: Pick<Movimiento, "mon" | "monto" | "tc">, tcRef: number) {
  return m.mon === "USD" ? m.monto * (m.tc || tcRef) : m.monto;
}

/** Convierte a USD. */
export function usdOf(m: Pick<Movimiento, "mon" | "monto" | "tc">, tcRef: number) {
  return m.mon === "USD" ? m.monto : m.tc ? m.monto / m.tc : m.monto / tcRef;
}

export function fixedArs(f: Pick<Fijo, "mon" | "monto">, tcRef: number) {
  return f.mon === "USD" ? f.monto * tcRef : f.monto;
}

export function fixedUsd(f: Pick<Fijo, "mon" | "monto">, tcRef: number) {
  return f.mon === "USD" ? f.monto : f.monto / tcRef;
}

export function sumBy<T>(list: T[], pred: (x: T) => boolean, fn: (x: T) => number) {
  return list.filter(pred).reduce((a, b) => a + fn(b), 0);
}

/** Devuelve solo los movimientos del mes YYYY-MM. */
export function monthMov(list: Movimiento[], mes: string) {
  return list.filter((x) => x.fecha.slice(0, 7) === mes);
}

/** Selecciona el conversor según la moneda preferida del usuario. */
export function converter(cur: Moneda, tcRef: number) {
  return cur === "USD"
    ? (m: Pick<Movimiento, "mon" | "monto" | "tc">) => usdOf(m, tcRef)
    : (m: Pick<Movimiento, "mon" | "monto" | "tc">) => arsOf(m, tcRef);
}
