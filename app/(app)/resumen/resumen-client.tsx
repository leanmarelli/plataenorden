"use client";

import { useMemo } from "react";
import {
  Wallet,
  Receipt,
  PiggyBank,
  Scale,
  Clock,
  Lock,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "@/components/settings-context";
import type { Fijo, Meta, Movimiento } from "@/types/database";
import {
  arsOf,
  converter,
  fixedArs,
  monthMov,
  sumBy,
  usdOf,
} from "@/lib/calc";
import { fmtARS, fmtUSD, money, pct } from "@/lib/format";
import EmptyState from "@/components/empty-state";

const KPI_STYLES: Record<
  string,
  { bg: string; fg: string; ring: string }
> = {
  pos: { bg: "var(--pos-soft)", fg: "var(--pos)", ring: "var(--pos)" },
  neg: { bg: "var(--neg-soft)", fg: "var(--neg)", ring: "var(--neg)" },
  save: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", ring: "var(--accent)" },
  blue: { bg: "var(--ars-soft)", fg: "var(--ars)", ring: "var(--ars)" },
  warnk: { bg: "var(--warn-soft)", fg: "var(--warn)", ring: "var(--warn)" },
};

export default function ResumenClient({
  movimientos,
  fijos,
  metas,
}: {
  movimientos: Movimiento[];
  fijos: Fijo[];
  metas: Meta[];
}) {
  const { settings } = useSettings();
  const { mes, cur_pref: cur, tc_ref: tcRef } = settings;

  const kpis = useMemo(() => {
    const mm = monthMov(movimientos, mes);
    const ingConfA = sumBy(
      mm,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => arsOf(x, tcRef),
    );
    const ingConfU = sumBy(
      mm,
      (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
      (x) => usdOf(x, tcRef),
    );
    const pendA = sumBy(
      mm,
      (x) => x.tipo === "Ingreso" && x.estado === "Pendiente",
      (x) => arsOf(x, tcRef),
    );
    const pendU = sumBy(
      mm,
      (x) => x.tipo === "Ingreso" && x.estado === "Pendiente",
      (x) => usdOf(x, tcRef),
    );
    const gasA = sumBy(mm, (x) => x.tipo === "Gasto", (x) => arsOf(x, tcRef));
    const gasU = sumBy(mm, (x) => x.tipo === "Gasto", (x) => usdOf(x, tcRef));
    const ahoA = sumBy(mm, (x) => x.tipo === "Ahorro", (x) => arsOf(x, tcRef));
    const ahoU = sumBy(mm, (x) => x.tipo === "Ahorro", (x) => usdOf(x, tcRef));
    const balA = ingConfA - gasA - ahoA;
    const balU = ingConfU - gasU - ahoU;
    const tasa = ingConfA > 0 ? ahoA / ingConfA : 0;
    const fijMensA = fijos.reduce((a, f) => a + fixedArs(f, tcRef), 0);
    const compromiso = ingConfA > 0 ? fijMensA / ingConfA : 0;
    const nMov = mm.filter((x) => x.tipo === "Gasto").length;

    return [
      {
        c: "pos",
        Icon: Wallet,
        lab: "Ingresos confirmados",
        a: ingConfA,
        u: ingConfU,
        meta:
          pendA > 0
            ? `+ ${money(cur, pendA, pendU)} por cobrar`
            : "todo cobrado",
      },
      {
        c: "neg",
        Icon: Receipt,
        lab: "Gastos",
        a: gasA,
        u: gasU,
        meta: `${nMov} movimiento${nMov === 1 ? "" : "s"}`,
      },
      {
        c: "save",
        Icon: PiggyBank,
        lab: "Ahorro del mes",
        a: ahoA,
        u: ahoU,
        meta: `tasa de ahorro ${pct(tasa)}`,
      },
      {
        c: balA >= 0 ? "blue" : "neg",
        Icon: Scale,
        lab: "Balance del mes",
        a: balA,
        u: balU,
        meta: balA >= 0 ? "te queda a favor" : "gastaste de más",
      },
      {
        c: "warnk",
        Icon: Clock,
        lab: "Por cobrar",
        a: pendA,
        u: pendU,
        meta: "ingresos pendientes",
      },
      {
        c: "save",
        Icon: Lock,
        lab: "Comprometido en fijos",
        a: fijMensA,
        u: fijMensA / tcRef,
        meta: `${pct(compromiso)} de tu ingreso`,
      },
    ] satisfies { c: string; Icon: LucideIcon; lab: string; a: number; u: number; meta: string }[];
  }, [movimientos, fijos, mes, cur, tcRef]);

  const cats = useMemo(() => {
    const mm = monthMov(movimientos, mes);
    const conv = converter(cur, tcRef);
    const map: Record<string, number> = {};
    mm.filter((x) => x.tipo === "Gasto").forEach((x) => {
      map[x.cat] = (map[x.cat] || 0) + conv(x);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movimientos, mes, cur, tcRef]);

  const fv = useMemo(() => {
    const mm = monthMov(movimientos, mes);
    const conv = converter(cur, tcRef);
    const fijA = sumBy(mm, (x) => x.tipo === "Gasto" && x.fv === "Fijo", conv);
    const varA = sumBy(mm, (x) => x.tipo === "Gasto" && x.fv === "Variable", conv);
    return { fijA, varA, tot: fijA + varA || 1 };
  }, [movimientos, mes, cur, tcRef]);

  const trend = useMemo(() => {
    const y = mes.slice(0, 4);
    const conv = converter(cur, tcRef);
    const out = [];
    for (let i = 1; i <= 12; i++) {
      const mk = `${y}-${String(i).padStart(2, "0")}`;
      const mv = movimientos.filter((x) => x.fecha.slice(0, 7) === mk);
      out.push({
        m: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i - 1],
        ing: sumBy(
          mv,
          (x) => x.tipo === "Ingreso" && x.estado === "Confirmado",
          conv,
        ),
        gas: sumBy(mv, (x) => x.tipo === "Gasto", conv),
        aho: sumBy(mv, (x) => x.tipo === "Ahorro", conv),
      });
    }
    return out;
  }, [movimientos, mes, cur, tcRef]);

  const fmt = cur === "USD" ? fmtUSD.format : fmtARS.format;
  const maxCat = cats.length ? cats[0][1] : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {kpis.map((k, i) => {
          const s = KPI_STYLES[k.c];
          const Icon = k.Icon;
          return (
            <div
              key={i}
              className="card p-4 flex flex-col gap-1.5"
              style={{ borderLeft: `3px solid ${s.ring}` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {k.lab}
                </span>
                <span
                  className="grid place-items-center rounded-lg"
                  style={{
                    width: 28,
                    height: 28,
                    background: s.bg,
                    color: s.fg,
                  }}
                >
                  <Icon size={15} strokeWidth={2.2} />
                </span>
              </div>
              <div
                className="mono font-serif text-xl sm:text-2xl font-bold"
                style={{ color: s.fg }}
              >
                {money(cur, k.a, k.u)}
              </div>
              <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {k.meta}
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Categorias */}
        <section className="card p-5">
          <h2 className="text-lg mb-1">Gastos por categoría</h2>
          <div className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            {cats.length ? `en ${mes}` : "sin gastos cargados este mes"}
          </div>
          <div className="flex flex-col gap-2">
            {cats.length === 0 && (
              <div
                className="text-sm text-center py-6"
                style={{ color: "var(--ink-faint)" }}
              >
                Cargá gastos desde <strong>Movimientos</strong>.
              </div>
            )}
            {cats.map(([c, v]) => (
              <Bar key={c} label={c} value={v} max={maxCat} format={fmt} />
            ))}
          </div>
        </section>

        {/* Fijo vs Variable */}
        <section className="card p-5">
          <h2 className="text-lg mb-1">Fijos vs Variables</h2>
          <div className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            del mes {mes}
          </div>
          <div className="flex flex-col gap-2">
            <Bar
              label="Fijos"
              value={fv.fijA}
              max={fv.tot}
              format={fmt}
              suffix={` · ${pct(fv.fijA / fv.tot)}`}
              color="var(--ars)"
            />
            <Bar
              label="Variables"
              value={fv.varA}
              max={fv.tot}
              format={fmt}
              suffix={` · ${pct(fv.varA / fv.tot)}`}
              color="var(--accent)"
            />
          </div>
        </section>

        {/* Trend anual */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-lg mb-1">Tendencia {mes.slice(0, 4)}</h2>
          <div className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            ingresos · gastos · ahorro por mes
          </div>
          <TrendChart data={trend} format={fmt} />
        </section>

        {/* Mini metas */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-lg mb-1">Progreso de metas</h2>
          <div className="text-xs mb-4" style={{ color: "var(--ink-faint)" }}>
            {metas.length ? `${metas.length} meta(s) activa(s)` : "todavía no cargaste metas"}
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {metas.map((m) => {
              const p = m.objetivo > 0 ? Math.min(1, m.ahorrado / m.objetivo) : 0;
              return (
                <div key={m.id} className="card p-4">
                  <div className="text-sm font-semibold mb-1">{m.nombre}</div>
                  <div className="text-xs mb-2" style={{ color: "var(--ink-faint)" }}>
                    {m.mon} · objetivo{" "}
                    {m.mon === "USD"
                      ? fmtUSD.format(m.objetivo)
                      : fmtARS.format(m.objetivo)}
                  </div>
                  <div
                    className="w-full rounded-full h-2 overflow-hidden"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${p * 100}%`, background: "var(--accent)" }}
                    />
                  </div>
                  <div className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                    {pct(p)} — {m.mon === "USD"
                      ? fmtUSD.format(m.ahorrado)
                      : fmtARS.format(m.ahorrado)}
                    {m.fecha && (
                      <span style={{ color: "var(--ink-faint)" }}> · para {m.fecha}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  format,
  suffix = "",
  color = "var(--accent)",
}: {
  label: string;
  value: number;
  max: number;
  format: (n: number) => string;
  suffix?: string;
  color?: string;
}) {
  const w = Math.max(3, (value / (max || 1)) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="w-40 truncate"
        style={{ color: "var(--ink-soft)" }}
        title={label}
      >
        {label}
      </span>
      <span
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <span
          className="block h-full"
          style={{ width: `${w}%`, background: color }}
        />
      </span>
      <span className="mono w-32 text-right" style={{ color: "var(--ink)" }}>
        {format(value)}
        {suffix}
      </span>
    </div>
  );
}

function TrendChart({
  data,
  format,
}: {
  data: { m: string; ing: number; gas: number; aho: number }[];
  format: (n: number) => string;
}) {
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.ing, d.gas, d.aho)),
  );
  const H = 140;
  const W = 640;
  const barGroupW = W / data.length;
  const barW = barGroupW / 4;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        style={{ minWidth: 560, width: "100%", height: "auto" }}
      >
        {data.map((d, i) => {
          const x0 = i * barGroupW + barGroupW * 0.15;
          const bars = [
            { k: "ing", v: d.ing, color: "var(--pos)" },
            { k: "gas", v: d.gas, color: "var(--neg)" },
            { k: "aho", v: d.aho, color: "var(--accent)" },
          ];
          return (
            <g key={i}>
              {bars.map((b, j) => {
                const h = (b.v / max) * H;
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
                    <title>{`${d.m} · ${b.k}: ${format(b.v)}`}</title>
                  </rect>
                );
              })}
              <text
                x={x0 + (barW * 3) / 2}
                y={H + 16}
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
