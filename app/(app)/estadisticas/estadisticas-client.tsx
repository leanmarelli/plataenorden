"use client";

import { useMemo } from "react";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Scale,
  TrendingUp,
  TrendingDown,
  ArrowDown,
  ArrowUp,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import { useSettings } from "@/components/settings-context";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import { converter, sumBy } from "@/lib/calc";
import { fmtARS, fmtUSD, pct } from "@/lib/format";
import { iconForCategory } from "@/lib/mov-icons";
import type { Fijo, Movimiento, MovTipo } from "@/types/database";

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];
const MESES_LARGO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Paleta rotativa para gráficos multi-serie. */
const CAT_COLORS = [
  "var(--neg)",
  "var(--accent)",
  "var(--ars)",
  "var(--warn)",
  "var(--pos)",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function EstadisticasClient({
  movimientos,
  fijos: _fijos,
}: {
  movimientos: Movimiento[];
  fijos: Fijo[];
}) {
  const { settings } = useSettings();
  const cur = settings.cur_pref;
  const tcRef = settings.tc_ref;
  const mes = settings.mes;
  const [year, month] = mes.split("-").map(Number);

  /** Convierte cualquier mov a la moneda preferida (ya en la unidad que se muestra). */
  const conv = useMemo(() => converter(cur, tcRef), [cur, tcRef]);
  const fmt = cur === "USD" ? fmtUSD.format : fmtARS.format;

  const prevMes = useMemo(() => {
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [year, month]);

  const mmActual = useMemo(
    () => movimientos.filter((m) => m.fecha.slice(0, 7) === mes),
    [movimientos, mes],
  );
  const mmPrev = useMemo(
    () => movimientos.filter((m) => m.fecha.slice(0, 7) === prevMes),
    [movimientos, prevMes],
  );

  /* ─────────── KPIs del mes en moneda preferida ─────────── */
  const kpis = useMemo(() => {
    const ing = sumBy(
      mmActual,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      conv,
    );
    const gas = sumBy(mmActual, (x) => x.tipo === "Gasto", conv);
    const aho = sumBy(mmActual, (x) => x.tipo === "Ahorro", conv);
    const bal = ing - gas - aho;
    const tasa = ing > 0 ? aho / ing : 0;

    const ingPrev = sumBy(
      mmPrev,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      conv,
    );
    const gasPrev = sumBy(mmPrev, (x) => x.tipo === "Gasto", conv);
    const ahoPrev = sumBy(mmPrev, (x) => x.tipo === "Ahorro", conv);

    return {
      ing, gas, aho, bal, tasa,
      ingDelta: ingPrev > 0 ? (ing - ingPrev) / ingPrev : null,
      gasDelta: gasPrev > 0 ? (gas - gasPrev) / gasPrev : null,
      ahoDelta: ahoPrev > 0 ? (aho - ahoPrev) / ahoPrev : null,
    };
  }, [mmActual, mmPrev, conv]);

  /* ─────────── Categorías del mes por tipo ─────────── */
  const gastosPorCat = useMemo(
    () => desglosarPorCategoria(mmActual, "Gasto", conv),
    [mmActual, conv],
  );
  const ingresosPorCat = useMemo(
    () => desglosarPorCategoria(mmActual, "Ingreso", conv),
    [mmActual, conv],
  );
  const ahorroPorCat = useMemo(
    () => desglosarPorCategoria(mmActual, "Ahorro", conv),
    [mmActual, conv],
  );

  /* ─────────── Comparativa vs mes anterior ─────────── */
  const compara = useMemo(() => {
    const gCat = (mv: Movimiento[]) => {
      const map: Record<string, number> = {};
      mv.filter((x) => x.tipo === "Gasto").forEach((x) => {
        map[x.cat] = (map[x.cat] || 0) + conv(x);
      });
      return map;
    };
    const a = gCat(mmActual);
    const p = gCat(mmPrev);
    const cats = new Set<string>([...Object.keys(a), ...Object.keys(p)]);
    return [...cats]
      .map((c) => ({ cat: c, actual: a[c] || 0, prev: p[c] || 0 }))
      .sort((x, y) => Math.max(y.actual, y.prev) - Math.max(x.actual, x.prev))
      .slice(0, 6);
  }, [mmActual, mmPrev, conv]);

  /* ─────────── Fijo vs Variable ─────────── */
  const fvSplit = useMemo(() => {
    const fij = sumBy(
      mmActual,
      (x) => x.tipo === "Gasto" && x.fv === "Fijo",
      conv,
    );
    const vari = sumBy(
      mmActual,
      (x) => x.tipo === "Gasto" && x.fv === "Variable",
      conv,
    );
    return { fij, vari, tot: fij + vari || 1 };
  }, [mmActual, conv]);

  /* ─────────── Top 5 movimientos ─────────── */
  const topMovs = useMemo(() => {
    return [...mmActual]
      .filter((x) => x.tipo === "Gasto")
      .map((x) => ({ ...x, val: conv(x) }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 5);
  }, [mmActual, conv]);

  /* ─────────── Últimos 6 meses ─────────── */
  const ult6 = useMemo(() => {
    const arr: {
      key: string;
      mes: string;
      label: string;
      Ingresos: number;
      Gastos: number;
      Ahorro: number;
      Balance: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mv = movimientos.filter((m) => m.fecha.slice(0, 7) === mk);
      const ing = sumBy(
        mv,
        (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
        conv,
      );
      const gas = sumBy(mv, (x) => x.tipo === "Gasto", conv);
      const aho = sumBy(mv, (x) => x.tipo === "Ahorro", conv);
      arr.push({
        key: mk,
        mes: `${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}`,
        label: MESES_CORTO[d.getMonth()],
        Ingresos: ing,
        Gastos: gas,
        Ahorro: aho,
        Balance: ing - gas - aho,
      });
    }
    return arr;
  }, [movimientos, year, month, conv]);

  const hayDatosMes =
    kpis.ing > 0 || kpis.gas > 0 || kpis.aho > 0;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={`${MESES_LARGO[month - 1]} ${year} · comparado con ${MESES_LARGO[new Date(year, month - 2).getMonth()]}`}
      />

      {!hayDatosMes && ult6.every((m) => m.Balance === 0) ? (
        <div className="card">
          <EmptyState
            icon={Scale}
            title="Sin datos para analizar"
            description="Cargá algunos movimientos y volvé — las estadísticas se arman solas."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPIs */}
          <section className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <Kpi
              Icon={Wallet}
              label="Ingresos"
              value={fmt(kpis.ing)}
              delta={kpis.ingDelta}
              color="pos"
            />
            <Kpi
              Icon={Receipt}
              label="Gastos"
              value={fmt(kpis.gas)}
              delta={kpis.gasDelta}
              color="neg"
              deltaInverted
            />
            <Kpi
              Icon={PiggyBank}
              label="Ahorro"
              value={fmt(kpis.aho)}
              sub={`tasa ${pct(kpis.tasa)}`}
              delta={kpis.ahoDelta}
              color="save"
            />
            <Kpi
              Icon={Scale}
              label="Balance"
              value={fmt(kpis.bal)}
              sub={kpis.bal >= 0 ? "positivo" : "en rojo"}
              color={kpis.bal >= 0 ? "blue" : "neg"}
            />
          </section>

          {/* Tendencia últimos 6 meses (área) */}
          <section className="card card-pad">
            <h2 className="text-base sm:text-lg font-serif font-semibold mb-1">
              Últimos 6 meses
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
              ingresos, gastos y ahorro · valores en {cur}
            </p>
            <div className="chart-h w-full">
              <ResponsiveContainer>
                <AreaChart
                  data={ult6}
                  margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--pos)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--neg)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--neg)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAho" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--line)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--ink-faint)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v) => compactFmt(v, cur)}
                  />
                  <Tooltip
                    content={<ChartTooltip fmt={fmt} />}
                    cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="Ingresos"
                    stroke="var(--pos)"
                    strokeWidth={2}
                    fill="url(#gIng)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Gastos"
                    stroke="var(--neg)"
                    strokeWidth={2}
                    fill="url(#gGas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Ahorro"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#gAho)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Fijos vs Variables (Pie) */}
          {fvSplit.tot > 1 && (
            <section className="card card-pad">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-semibold mr-auto">
                  Fijos vs Variables
                </h2>
                <span
                  className="mono text-sm"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {fmt(kpis.gas)}
                </span>
              </div>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                distribución de gastos del mes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-center gap-4 sm:gap-6">
                <div className="chart-h-sm w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Fijos", value: fvSplit.fij, color: "var(--ars)" },
                          { name: "Variables", value: fvSplit.vari, color: "var(--accent)" },
                        ]}
                        dataKey="value"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="var(--surface)"
                      >
                        <Cell fill="var(--ars)" />
                        <Cell fill="var(--accent)" />
                      </Pie>
                      <Tooltip
                        content={<ChartTooltip fmt={fmt} single />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3">
                  <LegendItem
                    color="var(--ars)"
                    label="Fijos"
                    value={fmt(fvSplit.fij)}
                    pctv={fvSplit.fij / fvSplit.tot}
                  />
                  <LegendItem
                    color="var(--accent)"
                    label="Variables"
                    value={fmt(fvSplit.vari)}
                    pctv={fvSplit.vari / fvSplit.tot}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Gastos por categoría (donut + lista) */}
          {gastosPorCat.length > 0 && (
            <section className="card card-pad">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-semibold mr-auto">
                  Gastos por categoría
                </h2>
                <span className="mono text-sm" style={{ color: "var(--neg)" }}>
                  {fmt(kpis.gas)}
                </span>
              </div>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                {gastosPorCat.length} categoría{gastosPorCat.length === 1 ? "" : "s"} este mes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 sm:gap-6 items-center">
                <div className="chart-h w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={gastosPorCat.map((c, i) => ({
                          name: c.cat,
                          value: c.val,
                          color: CAT_COLORS[i % CAT_COLORS.length],
                        }))}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="var(--surface)"
                      >
                        {gastosPorCat.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CAT_COLORS[i % CAT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip fmt={fmt} single />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <CategoryList
                  items={gastosPorCat}
                  total={kpis.gas}
                  format={fmt}
                  tipo="Gasto"
                  colored
                />
              </div>
            </section>
          )}

          {/* Ingresos por categoría (bar horizontal) */}
          {ingresosPorCat.length > 0 && (
            <section className="card card-pad">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-semibold mr-auto">
                  Ingresos por categoría
                </h2>
                <span className="mono text-sm" style={{ color: "var(--pos)" }}>
                  {fmt(kpis.ing)}
                </span>
              </div>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                del mes
              </p>
              <CategoryList
                items={ingresosPorCat}
                total={kpis.ing}
                format={fmt}
                tipo="Ingreso"
                color="var(--pos)"
              />
            </section>
          )}

          {/* Ahorro por categoría */}
          {ahorroPorCat.length > 0 && (
            <section className="card card-pad">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-semibold mr-auto">
                  Ahorro por categoría
                </h2>
                <span
                  className="mono text-sm"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {fmt(kpis.aho)}
                </span>
              </div>
              <CategoryList
                items={ahorroPorCat}
                total={kpis.aho}
                format={fmt}
                tipo="Ahorro"
                color="var(--accent)"
              />
            </section>
          )}

          {/* Comparativa mes vs anterior */}
          {compara.length > 0 && (
            <section className="card card-pad overflow-hidden">
              <h2 className="text-base sm:text-lg font-serif font-semibold mb-1">
                Este mes vs {MESES_LARGO[new Date(year, month - 2).getMonth()]}
              </h2>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                top categorías de gasto
              </p>
              <div
                className="w-full"
                style={{ height: 44 * compara.length + 60 }}
              >
                <ResponsiveContainer>
                  <BarChart
                    data={compara}
                    layout="vertical"
                    margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--line)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => compactFmt(v, cur)}
                    />
                    <YAxis
                      type="category"
                      dataKey="cat"
                      tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tickFormatter={(v: string) =>
                        v.length > 12 ? v.slice(0, 11) + "…" : v
                      }
                    />
                    <Tooltip
                      content={<ChartTooltip fmt={fmt} />}
                      cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="prev"
                      name="Anterior"
                      fill="var(--ink-faint)"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="actual"
                      name="Este mes"
                      fill="var(--neg)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {compara.map((r) => {
                  const delta =
                    r.prev > 0 ? (r.actual - r.prev) / r.prev : null;
                  if (delta === null) return null;
                  const subio = r.actual > r.prev;
                  return (
                    <div
                      key={r.cat}
                      className="flex items-center justify-between text-xs"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      <span className="truncate">{r.cat}</span>
                      <span
                        className="inline-flex items-center gap-0.5 mono"
                        style={{ color: subio ? "var(--neg)" : "var(--pos)" }}
                      >
                        {subio ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        {pct(Math.abs(delta))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top 5 movimientos */}
          {topMovs.length > 0 && (
            <section className="card card-pad">
              <h2 className="text-base sm:text-lg font-serif font-semibold mb-1">
                Los 5 gastos más grandes
              </h2>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                de este mes
              </p>
              <div className="flex flex-col">
                {topMovs.map((r) => {
                  const Icon = iconForCategory(r.cat, "Gasto");
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderTop: "1px solid var(--line)" }}
                    >
                      <div
                        className="grid place-items-center rounded-lg"
                        style={{
                          width: 36,
                          height: 36,
                          background: "var(--neg-soft)",
                          color: "var(--neg)",
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.descripcion || r.cat}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {r.cat} · {r.fecha.slice(8)}/{r.fecha.slice(5, 7)}
                        </div>
                      </div>
                      <div
                        className="mono font-medium"
                        style={{ color: "var(--neg)" }}
                      >
                        {fmt(r.val)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/* ─────────── Helpers ─────────── */
function desglosarPorCategoria(
  mvs: Movimiento[],
  tipo: MovTipo,
  conv: (m: Movimiento) => number,
) {
  const map: Record<string, number> = {};
  mvs.filter((x) => x.tipo === tipo).forEach((x) => {
    map[x.cat] = (map[x.cat] || 0) + conv(x);
  });
  return Object.entries(map)
    .map(([cat, val]) => ({ cat, val }))
    .sort((a, b) => b.val - a.val);
}

/** Formato compacto: 12k / 1.2M para labels de eje. */
function compactFmt(v: number, cur: "ARS" | "USD"): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const symbol = cur === "USD" ? "US$" : "$";
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

/* ─────────── Componentes visuales ─────────── */
function Kpi({
  Icon,
  label,
  value,
  sub,
  delta,
  color,
  deltaInverted = false,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  color: "pos" | "neg" | "save" | "blue";
  deltaInverted?: boolean;
}) {
  const styles = {
    pos: { bg: "var(--pos-soft)", fg: "var(--pos)", ring: "var(--pos)" },
    neg: { bg: "var(--neg-soft)", fg: "var(--neg)", ring: "var(--neg)" },
    save: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", ring: "var(--accent)" },
    blue: { bg: "var(--ars-soft)", fg: "var(--ars)", ring: "var(--ars)" },
  }[color];

  const deltaPos = delta !== null && delta !== undefined ? delta >= 0 : null;
  const goodDelta =
    deltaPos === null ? null : deltaInverted ? !deltaPos : deltaPos;

  return (
    <div
      className="card p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5"
      style={{ borderLeft: `3px solid ${styles.ring}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold leading-tight"
          style={{ color: "var(--ink-faint)" }}
        >
          {label}
        </span>
        <span
          className="grid place-items-center rounded-lg shrink-0"
          style={{
            width: 26,
            height: 26,
            background: styles.bg,
            color: styles.fg,
          }}
        >
          <Icon size={14} strokeWidth={2.2} />
        </span>
      </div>
      <div
        className="mono font-serif text-lg sm:text-2xl font-bold leading-tight"
        style={{ color: styles.fg }}
      >
        {value}
      </div>
      {delta !== null && delta !== undefined ? (
        <div
          className="text-[11px] sm:text-xs flex items-center gap-1"
          style={{ color: goodDelta ? "var(--pos)" : "var(--neg)" }}
        >
          {deltaPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {pct(Math.abs(delta))}
          <span className="hidden sm:inline">vs mes anterior</span>
        </div>
      ) : sub ? (
        <div className="text-[11px] sm:text-xs" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function CategoryList({
  items,
  total,
  format,
  tipo = "Gasto",
  color,
  colored = false,
}: {
  items: { cat: string; val: number }[];
  total: number;
  format: (n: number) => string;
  tipo?: MovTipo;
  color?: string;
  colored?: boolean;
}) {
  if (items.length === 0)
    return (
      <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
        Sin datos este mes.
      </p>
    );
  const max = items[0]?.val || 1;
  return (
    <div className="flex flex-col gap-3">
      {items.map((r, i) => {
        const Icon = iconForCategory(r.cat, tipo);
        const w = Math.max(3, (r.val / max) * 100);
        const barColor = colored
          ? CAT_COLORS[i % CAT_COLORS.length]
          : color ?? "var(--accent)";
        return (
          <div key={r.cat} className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-baseline gap-3">
              <span
                className="inline-flex items-center gap-2 truncate flex-1 min-w-0"
                style={{ color: "var(--ink-soft)" }}
              >
                <Icon
                  size={14}
                  style={{ color: barColor, flexShrink: 0 }}
                />
                <span className="truncate">{r.cat}</span>
              </span>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {format(r.val)}
                <span
                  className="ml-2 text-xs"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {pct(r.val / (total || 1))}
                </span>
              </span>
            </div>
            <span
              className="block w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--surface-2)" }}
            >
              <span
                className="block h-full transition-all"
                style={{ width: `${w}%`, background: barColor }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
  pctv,
}: {
  color: string;
  label: string;
  value: string;
  pctv: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-block rounded"
        style={{ width: 12, height: 12, background: color }}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {pct(pctv)}
        </div>
      </div>
      <div className="mono text-sm font-medium">{value}</div>
    </div>
  );
}

/* ─────────── Tooltip custom para Recharts ─────────── */
type TooltipPayload = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: { name?: string; color?: string };
};
function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  single = false,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  fmt: (n: number) => string;
  single?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="card px-3 py-2 text-xs shadow-lg"
      style={{ minWidth: 130 }}
    >
      {label !== undefined && !single && (
        <div
          className="text-[10px] uppercase tracking-wider mb-1 font-semibold"
          style={{ color: "var(--ink-faint)" }}
        >
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => {
          if (p.value === 0 || p.value == null) return null;
          const name = p.name || p.payload?.name || p.dataKey || "";
          const color = p.color || p.payload?.color || "var(--ink)";
          return (
            <div key={i} className="flex items-center gap-2 justify-between">
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: "var(--ink-soft)" }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: color }}
                />
                {name}
              </span>
              <span
                className="mono font-medium"
                style={{ color: "var(--ink)" }}
              >
                {fmt(p.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
