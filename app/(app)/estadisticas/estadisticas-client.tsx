"use client";

import { useMemo, useState } from "react";
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
import { useSettings } from "@/components/settings-context";
import PageHeader from "@/components/page-header";
import { arsOf, converter, sumBy, usdOf } from "@/lib/calc";
import { fmtARS, fmtUSD, money, pct } from "@/lib/format";
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
  const mes = settings.mes; // "YYYY-MM"
  const [year, month] = mes.split("-").map(Number);

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

  /* ─────────── KPIs mes actual ─────────── */
  const kpis = useMemo(() => {
    const ingA = sumBy(
      mmActual,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => arsOf(x, tcRef),
    );
    const ingU = sumBy(
      mmActual,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => usdOf(x, tcRef),
    );
    const gasA = sumBy(mmActual, (x) => x.tipo === "Gasto", (x) => arsOf(x, tcRef));
    const gasU = sumBy(mmActual, (x) => x.tipo === "Gasto", (x) => usdOf(x, tcRef));
    const ahoA = sumBy(mmActual, (x) => x.tipo === "Ahorro", (x) => arsOf(x, tcRef));
    const ahoU = sumBy(mmActual, (x) => x.tipo === "Ahorro", (x) => usdOf(x, tcRef));
    const balA = ingA - gasA - ahoA;
    const balU = ingU - gasU - ahoU;
    const tasa = ingA > 0 ? ahoA / ingA : 0;

    const ingPrevA = sumBy(
      mmPrev,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => arsOf(x, tcRef),
    );
    const gasPrevA = sumBy(
      mmPrev,
      (x) => x.tipo === "Gasto",
      (x) => arsOf(x, tcRef),
    );
    const ahoPrevA = sumBy(
      mmPrev,
      (x) => x.tipo === "Ahorro",
      (x) => arsOf(x, tcRef),
    );

    return {
      ingA, ingU, gasA, gasU, ahoA, ahoU, balA, balU, tasa,
      ingDelta: ingPrevA > 0 ? (ingA - ingPrevA) / ingPrevA : null,
      gasDelta: gasPrevA > 0 ? (gasA - gasPrevA) / gasPrevA : null,
      ahoDelta: ahoPrevA > 0 ? (ahoA - ahoPrevA) / ahoPrevA : null,
    };
  }, [mmActual, mmPrev, tcRef]);

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

  /* ─────────── Comparativa vs mes anterior por categoría (top 6 gastos) ─────────── */
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
    const rows = [...cats].map((c) => ({
      cat: c,
      actual: a[c] || 0,
      prev: p[c] || 0,
    }));
    return rows.sort((x, y) => Math.max(y.actual, y.prev) - Math.max(x.actual, x.prev)).slice(0, 6);
  }, [mmActual, mmPrev, conv]);

  /* ─────────── Fijo vs Variable ─────────── */
  const fvSplit = useMemo(() => {
    const fijA = sumBy(
      mmActual,
      (x) => x.tipo === "Gasto" && x.fv === "Fijo",
      conv,
    );
    const varA = sumBy(
      mmActual,
      (x) => x.tipo === "Gasto" && x.fv === "Variable",
      conv,
    );
    return { fijA, varA, tot: fijA + varA || 1 };
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
      mes: string;
      label: string;
      ing: number;
      gas: number;
      aho: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mv = movimientos.filter((m) => m.fecha.slice(0, 7) === mk);
      arr.push({
        mes: mk,
        label: MESES_CORTO[d.getMonth()],
        ing: sumBy(
          mv,
          (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
          conv,
        ),
        gas: sumBy(mv, (x) => x.tipo === "Gasto", conv),
        aho: sumBy(mv, (x) => x.tipo === "Ahorro", conv),
      });
    }
    return arr;
  }, [movimientos, year, month, conv]);

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={`${MESES_LARGO[month - 1]} ${year} · comparado con ${MESES_LARGO[new Date(year, month - 2).getMonth()]}`}
      />

      <div className="flex flex-col gap-6">
        {/* KPIs del mes con delta vs mes anterior */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Kpi
            Icon={Wallet}
            label="Ingresos"
            value={money(cur, kpis.ingA, kpis.ingU)}
            delta={kpis.ingDelta}
            color="pos"
          />
          <Kpi
            Icon={Receipt}
            label="Gastos"
            value={money(cur, kpis.gasA, kpis.gasU)}
            delta={kpis.gasDelta}
            color="neg"
            deltaInverted
          />
          <Kpi
            Icon={PiggyBank}
            label="Ahorro"
            value={money(cur, kpis.ahoA, kpis.ahoU)}
            sub={`tasa ${pct(kpis.tasa)}`}
            delta={kpis.ahoDelta}
            color="save"
          />
          <Kpi
            Icon={Scale}
            label="Balance"
            value={money(cur, kpis.balA, kpis.balU)}
            sub={kpis.balA >= 0 ? "positivo" : "gastaste de más"}
            color={kpis.balA >= 0 ? "blue" : "neg"}
          />
        </section>

        {/* Fijos vs Variables del mes */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Fijos vs Variables
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            distribución de tus gastos del mes
          </p>
          <div className="flex flex-col gap-3">
            <SplitBar
              label="Fijos"
              value={fvSplit.fijA}
              total={fvSplit.tot}
              color="var(--ars)"
              format={fmt}
            />
            <SplitBar
              label="Variables"
              value={fvSplit.varA}
              total={fvSplit.tot}
              color="var(--accent)"
              format={fmt}
            />
          </div>
        </section>

        {/* Gastos por categoría del mes */}
        <section className="card p-5">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-lg font-serif font-semibold mr-auto">
              Gastos por categoría
            </h2>
            <span
              className="mono text-sm"
              style={{ color: "var(--neg)" }}
            >
              {fmt(kpis.gasA)}
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            {gastosPorCat.length} categoría{gastosPorCat.length === 1 ? "" : "s"} este mes
          </p>
          <CategoryList items={gastosPorCat} total={kpis.gasA} color="var(--neg)" format={fmt} />
        </section>

        {/* Ingresos por categoría */}
        {ingresosPorCat.length > 0 && (
          <section className="card p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-lg font-serif font-semibold mr-auto">
                Ingresos por categoría
              </h2>
              <span className="mono text-sm" style={{ color: "var(--pos)" }}>
                {fmt(kpis.ingA)}
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
              del mes
            </p>
            <CategoryList
              items={ingresosPorCat}
              total={kpis.ingA}
              color="var(--pos)"
              format={fmt}
              tipo="Ingreso"
            />
          </section>
        )}

        {/* Ahorro por categoría */}
        {ahorroPorCat.length > 0 && (
          <section className="card p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-lg font-serif font-semibold mr-auto">
                Ahorro por categoría
              </h2>
              <span
                className="mono text-sm"
                style={{ color: "var(--accent-ink)" }}
              >
                {fmt(kpis.ahoA)}
              </span>
            </div>
            <CategoryList
              items={ahorroPorCat}
              total={kpis.ahoA}
              color="var(--accent)"
              format={fmt}
              tipo="Ahorro"
            />
          </section>
        )}

        {/* Comparativa este mes vs anterior */}
        {compara.length > 0 && (
          <section className="card p-5">
            <h2 className="text-lg font-serif font-semibold mb-1">
              Este mes vs {MESES_LARGO[new Date(year, month - 2).getMonth()]}
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
              top categorías de gasto
            </p>
            <div className="flex flex-col gap-3">
              {compara.map((r) => (
                <CompareRow key={r.cat} row={r} format={fmt} />
              ))}
            </div>
          </section>
        )}

        {/* Top 5 movimientos del mes */}
        {topMovs.length > 0 && (
          <section className="card p-5">
            <h2 className="text-lg font-serif font-semibold mb-1">
              Los 5 gastos más grandes
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
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

        {/* Últimos 6 meses */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Últimos 6 meses
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            tendencia en {cur}
          </p>
          <Sparkles6 data={ult6} format={fmt} />
        </section>
      </div>
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

/* ─────────── Components ─────────── */
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
      className="card p-4 flex flex-col gap-1.5"
      style={{ borderLeft: `3px solid ${styles.ring}` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold"
          style={{ color: "var(--ink-faint)" }}
        >
          {label}
        </span>
        <span
          className="grid place-items-center rounded-lg"
          style={{
            width: 28,
            height: 28,
            background: styles.bg,
            color: styles.fg,
          }}
        >
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>
      <div
        className="mono font-serif text-xl sm:text-2xl font-bold"
        style={{ color: styles.fg }}
      >
        {value}
      </div>
      {delta !== null && delta !== undefined && (
        <div
          className="text-xs flex items-center gap-1"
          style={{ color: goodDelta ? "var(--pos)" : "var(--neg)" }}
        >
          {deltaPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {pct(Math.abs(delta))} vs mes anterior
        </div>
      )}
      {sub && !delta && (
        <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SplitBar({
  label,
  value,
  total,
  color,
  format,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  format: (n: number) => string;
}) {
  const w = Math.max(3, (value / total) * 100);
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-baseline gap-3">
        <span className="flex-1" style={{ color: "var(--ink-soft)" }}>
          {label}
        </span>
        <span className="mono" style={{ color: "var(--ink)" }}>
          {format(value)}
          <span className="ml-2 text-xs" style={{ color: "var(--ink-faint)" }}>
            {pct(value / total)}
          </span>
        </span>
      </div>
      <span
        className="block w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <span
          className="block h-full transition-all"
          style={{ width: `${w}%`, background: color }}
        />
      </span>
    </div>
  );
}

function CategoryList({
  items,
  total,
  color,
  format,
  tipo = "Gasto",
}: {
  items: { cat: string; val: number }[];
  total: number;
  color: string;
  format: (n: number) => string;
  tipo?: MovTipo;
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
      {items.map((r) => {
        const Icon = iconForCategory(r.cat, tipo);
        const w = Math.max(3, (r.val / max) * 100);
        return (
          <div key={r.cat} className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-baseline gap-3">
              <span
                className="inline-flex items-center gap-2 truncate flex-1 min-w-0"
                style={{ color: "var(--ink-soft)" }}
              >
                <Icon size={14} style={{ color, flexShrink: 0 }} />
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
                style={{ width: `${w}%`, background: color }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CompareRow({
  row,
  format,
}: {
  row: { cat: string; actual: number; prev: number };
  format: (n: number) => string;
}) {
  const max = Math.max(row.actual, row.prev, 1);
  const delta = row.prev > 0 ? (row.actual - row.prev) / row.prev : null;
  const subio = row.actual > row.prev;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium truncate flex-1">{row.cat}</span>
        {delta !== null && (
          <span
            className="text-xs inline-flex items-center gap-0.5"
            style={{ color: subio ? "var(--neg)" : "var(--pos)" }}
          >
            {subio ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {pct(Math.abs(delta))}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <MiniBar
          label="Este mes"
          value={row.actual}
          max={max}
          color="var(--neg)"
          format={format}
        />
        <MiniBar
          label="Anterior"
          value={row.prev}
          max={max}
          color="var(--ink-faint)"
          format={format}
        />
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  color,
  format,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  format: (n: number) => string;
}) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="w-16 shrink-0"
        style={{ color: "var(--ink-faint)" }}
      >
        {label}
      </span>
      <span
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <span
          className="block h-full"
          style={{ width: `${w}%`, background: color }}
        />
      </span>
      <span
        className="mono w-24 text-right"
        style={{ color: "var(--ink-soft)" }}
      >
        {format(value)}
      </span>
    </div>
  );
}

type BarKey = "ing" | "gas" | "aho";
type BarHover = { i: number; k: BarKey } | null;

function Sparkles6({
  data,
  format,
}: {
  data: { mes: string; label: string; ing: number; gas: number; aho: number }[];
  format: (n: number) => string;
}) {
  const [hover, setHover] = useState<BarHover>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.ing, d.gas, d.aho)));
  const H = 120;
  const W = 400;
  const barGroupW = W / data.length;
  const barW = barGroupW / 4;

  const labels: Record<BarKey, string> = {
    ing: "Ingresos",
    gas: "Gastos",
    aho: "Ahorro",
  };
  const colors: Record<BarKey, string> = {
    ing: "var(--pos)",
    gas: "var(--neg)",
    aho: "var(--accent)",
  };

  const tooltipLeftPct = hover
    ? ((hover.i * barGroupW +
        barGroupW * 0.15 +
        { ing: 0, gas: 1, aho: 2 }[hover.k] * barW +
        (barW * 0.85) / 2) /
        W) *
      100
    : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        style={{ width: "100%", height: "auto" }}
        onMouseLeave={() => setHover(null)}
      >
        {data.map((d, i) => {
          const x0 = i * barGroupW + barGroupW * 0.15;
          const activo = hover?.i === i;
          const bars: { k: BarKey; v: number }[] = [
            { k: "ing", v: d.ing },
            { k: "gas", v: d.gas },
            { k: "aho", v: d.aho },
          ];
          return (
            <g key={i}>
              {bars.map((b, j) => {
                const h = b.v > 0 ? Math.max(2, (b.v / max) * H) : 0;
                const isHover =
                  hover?.i === i && hover?.k === b.k;
                const bx = x0 + j * barW;
                const bw = barW * 0.85;
                return (
                  <g key={b.k}>
                    <rect
                      x={bx}
                      y={0}
                      width={bw}
                      height={H}
                      fill="transparent"
                      onMouseEnter={() => setHover({ i, k: b.k })}
                      style={{ cursor: b.v > 0 ? "pointer" : "default" }}
                    />
                    {b.v > 0 && (
                      <rect
                        x={bx}
                        y={H - h}
                        width={bw}
                        height={h}
                        fill={colors[b.k]}
                        rx={2}
                        opacity={hover && !isHover ? 0.35 : 1}
                        style={{
                          pointerEvents: "none",
                          transition: "opacity .15s",
                        }}
                      />
                    )}
                  </g>
                );
              })}
              <text
                x={x0 + (barW * 3) / 2}
                y={H + 14}
                textAnchor="middle"
                fontSize="10"
                fill={activo ? "var(--ink)" : "var(--ink-faint)"}
                fontWeight={activo ? 600 : 400}
                style={{ pointerEvents: "none" }}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="absolute top-0 pointer-events-none card px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: "translateX(-50%)",
            minWidth: 120,
            zIndex: 5,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider mb-0.5"
            style={{ color: "var(--ink-faint)" }}
          >
            {data[hover.i].mes}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: colors[hover.k] }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: colors[hover.k] }}
            >
              {labels[hover.k]}
            </span>
          </div>
          <div
            className="mono font-serif text-base font-bold mt-0.5"
            style={{ color: "var(--ink)" }}
          >
            {format(data[hover.i][hover.k])}
          </div>
        </div>
      )}
      <div className="flex gap-4 text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
        <LegendDot color="var(--pos)" label="Ingresos" />
        <LegendDot color="var(--neg)" label="Gastos" />
        <LegendDot color="var(--accent)" label="Ahorro" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{ width: 10, height: 10, background: color }}
      />
      {label}
    </span>
  );
}
