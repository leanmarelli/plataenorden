"use client";

import { useMemo, useState } from "react";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Scale,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "@/components/settings-context";
import PageHeader from "@/components/page-header";
import { arsOf, converter, sumBy, usdOf } from "@/lib/calc";
import { fmtARS, fmtUSD, money, pct } from "@/lib/format";
import type { Fijo, Movimiento } from "@/types/database";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    movimientos.forEach((m) => set.add(Number(m.fecha.slice(0, 4))));
    set.add(currentYear);
    return [...set].sort((a, b) => a - b);
  }, [movimientos, currentYear]);

  const conv = useMemo(() => converter(cur, tcRef), [cur, tcRef]);
  const fmt = cur === "USD" ? fmtUSD.format : fmtARS.format;

  const delAño = useMemo(() => {
    return movimientos.filter(
      (m) => Number(m.fecha.slice(0, 4)) === year,
    );
  }, [movimientos, year]);

  const delAñoAnterior = useMemo(() => {
    return movimientos.filter(
      (m) => Number(m.fecha.slice(0, 4)) === year - 1,
    );
  }, [movimientos, year]);

  const kpis = useMemo(() => {
    const ingA = sumBy(
      delAño,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => arsOf(x, tcRef),
    );
    const ingU = sumBy(
      delAño,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => usdOf(x, tcRef),
    );
    const gasA = sumBy(delAño, (x) => x.tipo === "Gasto", (x) =>
      arsOf(x, tcRef),
    );
    const gasU = sumBy(delAño, (x) => x.tipo === "Gasto", (x) =>
      usdOf(x, tcRef),
    );
    const ahoA = sumBy(delAño, (x) => x.tipo === "Ahorro", (x) =>
      arsOf(x, tcRef),
    );
    const ahoU = sumBy(delAño, (x) => x.tipo === "Ahorro", (x) =>
      usdOf(x, tcRef),
    );
    const balA = ingA - gasA - ahoA;
    const balU = ingU - gasU - ahoU;

    // Año anterior — para comparar
    const ingPrevA = sumBy(
      delAñoAnterior,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => arsOf(x, tcRef),
    );
    const gasPrevA = sumBy(
      delAñoAnterior,
      (x) => x.tipo === "Gasto",
      (x) => arsOf(x, tcRef),
    );

    return {
      ingA,
      ingU,
      gasA,
      gasU,
      ahoA,
      ahoU,
      balA,
      balU,
      ingDelta: ingPrevA > 0 ? (ingA - ingPrevA) / ingPrevA : null,
      gasDelta: gasPrevA > 0 ? (gasA - gasPrevA) / gasPrevA : null,
      tasa: ingA > 0 ? ahoA / ingA : 0,
    };
  }, [delAño, delAñoAnterior, tcRef]);

  const mesesData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mv = delAño.filter(
        (m) => Number(m.fecha.slice(5, 7)) === i + 1,
      );
      return {
        m: MESES[i],
        ing: sumBy(
          mv,
          (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
          conv,
        ),
        gas: sumBy(mv, (x) => x.tipo === "Gasto", conv),
        aho: sumBy(mv, (x) => x.tipo === "Ahorro", conv),
      };
    });
  }, [delAño, conv]);

  const categorias = useMemo(() => {
    const map: Record<string, number> = {};
    delAño
      .filter((x) => x.tipo === "Gasto")
      .forEach((x) => {
        map[x.cat] = (map[x.cat] || 0) + conv(x);
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [delAño, conv]);

  const promedios = useMemo(() => {
    const mesesConData = mesesData.filter(
      (m) => m.ing > 0 || m.gas > 0 || m.aho > 0,
    ).length;
    if (mesesConData === 0)
      return { promIng: 0, promGas: 0, promAho: 0, tasa: 0 };
    const ing = mesesData.reduce((a, b) => a + b.ing, 0) / mesesConData;
    const gas = mesesData.reduce((a, b) => a + b.gas, 0) / mesesConData;
    const aho = mesesData.reduce((a, b) => a + b.aho, 0) / mesesConData;
    const tasa = ing > 0 ? aho / ing : 0;
    return { promIng: ing, promGas: gas, promAho: aho, tasa };
  }, [mesesData]);

  const maxCat = categorias.length ? categorias[0][1] : 1;
  const maxMes = Math.max(
    1,
    ...mesesData.map((d) => Math.max(d.ing, d.gas, d.aho)),
  );

  const canPrev = availableYears[0] < year;
  const canNext = year < currentYear;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle="tu año en números"
        action={
          <div
            className="inline-flex items-center rounded-[10px] gap-1 p-1"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow)",
            }}
          >
            <button
              disabled={!canPrev}
              onClick={() => setYear((y) => y - 1)}
              className="grid place-items-center w-8 h-8 rounded-md disabled:opacity-30"
              style={{ color: "var(--ink-soft)" }}
              aria-label="Año anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="mono font-serif font-bold text-lg px-2"
              style={{ color: "var(--ink)" }}
            >
              {year}
            </span>
            <button
              disabled={!canNext}
              onClick={() => setYear((y) => y + 1)}
              className="grid place-items-center w-8 h-8 rounded-md disabled:opacity-30"
              style={{ color: "var(--ink-soft)" }}
              aria-label="Año siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {/* KPIs anuales */}
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
            color="save"
          />
          <Kpi
            Icon={Scale}
            label="Balance"
            value={money(cur, kpis.balA, kpis.balU)}
            color={kpis.balA >= 0 ? "blue" : "neg"}
          />
        </section>

        {/* Promedio mensual */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Promedio mensual
          </h2>
          <p
            className="text-xs mb-4"
            style={{ color: "var(--ink-faint)" }}
          >
            calculado sobre los meses del año que tienen movimientos
          </p>
          <div className="grid grid-cols-3 gap-3">
            <PromCard label="Ingresos" value={fmt(promedios.promIng)} />
            <PromCard label="Gastos" value={fmt(promedios.promGas)} />
            <PromCard label="Ahorro" value={fmt(promedios.promAho)} />
          </div>
        </section>

        {/* Gráfico de barras por mes */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Ingresos, gastos y ahorro por mes
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            {year} en {cur}
          </p>
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 640 200"
              style={{ minWidth: 560, width: "100%", height: "auto" }}
            >
              {mesesData.map((d, i) => {
                const H = 160;
                const barGroupW = 640 / 12;
                const barW = barGroupW / 4;
                const x0 = i * barGroupW + barGroupW * 0.15;
                const bars = [
                  { k: "ing", v: d.ing, color: "var(--pos)" },
                  { k: "gas", v: d.gas, color: "var(--neg)" },
                  { k: "aho", v: d.aho, color: "var(--accent)" },
                ];
                return (
                  <g key={i}>
                    {bars.map((b, j) => {
                      const h = (b.v / maxMes) * H;
                      return (
                        <rect
                          key={b.k}
                          x={x0 + j * barW}
                          y={H - h}
                          width={barW * 0.85}
                          height={h}
                          fill={b.color}
                          rx={2}
                        >
                          <title>{`${d.m} · ${b.k}: ${fmt(b.v)}`}</title>
                        </rect>
                      );
                    })}
                    <text
                      x={x0 + (barW * 3) / 2}
                      y={H + 18}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--ink-faint)"
                    >
                      {d.m}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex gap-4 text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
            <Dot color="var(--pos)" label="Ingresos" />
            <Dot color="var(--neg)" label="Gastos" />
            <Dot color="var(--accent)" label="Ahorro" />
          </div>
        </section>

        {/* Top categorías */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Top gastos por categoría
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            en {year}
          </p>
          {categorias.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
              Sin gastos cargados en {year}.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {categorias.map(([cat, val]) => {
                const w = Math.max(3, (val / maxCat) * 100);
                return (
                  <div key={cat} className="flex flex-col gap-1 text-sm">
                    <div className="flex items-baseline gap-3">
                      <span
                        className="truncate flex-1"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        {cat}
                      </span>
                      <span
                        className="mono text-right whitespace-nowrap"
                        style={{ color: "var(--ink)" }}
                      >
                        {fmt(val)}
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {pct(val / (kpis.gasA || 1))}
                        </span>
                      </span>
                    </div>
                    <span
                      className="block w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span
                        className="block h-full"
                        style={{ width: `${w}%`, background: "var(--neg)" }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Balance acumulado (línea) */}
        <section className="card p-5">
          <h2 className="text-lg font-serif font-semibold mb-1">
            Balance acumulado
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            (ingresos − gastos − ahorro) mes a mes en {year}
          </p>
          <BalanceLine data={mesesData} format={fmt} />
        </section>
      </div>
    </>
  );
}

/* ─────────── KPI Card ─────────── */
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
  // deltaInverted: para gastos, subir es malo
  const goodDelta =
    deltaPos === null
      ? null
      : deltaInverted
        ? !deltaPos
        : deltaPos;

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
          style={{
            color: goodDelta ? "var(--pos)" : "var(--neg)",
          }}
        >
          {deltaPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {pct(Math.abs(delta))} vs año anterior
        </div>
      )}
      {sub && (
        <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function PromCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-semibold mb-1"
        style={{ color: "var(--ink-faint)" }}
      >
        {label}
      </div>
      <div className="mono font-serif text-base font-bold">{value}</div>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
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

/* ─────────── Balance line chart ─────────── */
function BalanceLine({
  data,
  format,
}: {
  data: { m: string; ing: number; gas: number; aho: number }[];
  format: (n: number) => string;
}) {
  const W = 640;
  const H = 160;
  let acc = 0;
  const points = data.map((d, i) => {
    acc += d.ing - d.gas - d.aho;
    return { x: (i / 11) * (W - 40) + 20, val: acc, mes: d.m };
  });
  const vals = points.map((p) => p.val);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(0, ...vals);
  const range = maxV - minV || 1;

  function y(v: number) {
    return H - 20 - ((v - minV) / range) * (H - 40);
  }
  const zeroY = y(0);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${y(p.val)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        style={{ minWidth: 560, width: "100%", height: "auto" }}
      >
        {/* línea del cero */}
        <line
          x1={20}
          x2={W - 20}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--line)"
          strokeDasharray="3 3"
        />
        {/* trazado */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={y(p.val)}
              r={3.5}
              fill="var(--accent)"
            >
              <title>{`${p.mes}: ${format(p.val)}`}</title>
            </circle>
            <text
              x={p.x}
              y={H + 16}
              textAnchor="middle"
              fontSize="11"
              fill="var(--ink-faint)"
            >
              {p.mes}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
