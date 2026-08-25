"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Plus,
  RefreshCcw,
  Zap,
  Check,
  CreditCard,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import Modal from "@/components/modal";
import { CATS_AHORRO, CATS_GASTO, CATS_INGRESO } from "@/lib/constants";
import { fixedArs } from "@/lib/calc";
import { fmtARS, fmtUSD2 } from "@/lib/format";
import { iconForCategory } from "@/lib/mov-icons";
import type { Fijo, Moneda, MovTipo } from "@/types/database";

type Form = {
  id: string | null;
  concepto: string;
  cat: string;
  mon: Moneda;
  monto: string;
  dia: string;
  tipo: MovTipo;
  esCuota: boolean;
  cuotas_totales: string;
  cuotas_pagas: string;
};

function catsFor(tipo: MovTipo): readonly string[] {
  if (tipo === "Ingreso") return CATS_INGRESO;
  if (tipo === "Ahorro") return CATS_AHORRO;
  return CATS_GASTO;
}

const empty: Form = {
  id: null,
  concepto: "",
  cat: CATS_GASTO[0],
  mon: "ARS",
  monto: "",
  dia: "1",
  tipo: "Gasto",
  esCuota: false,
  cuotas_totales: "6",
  cuotas_pagas: "0",
};

function esCompleta(f: Fijo) {
  return (
    f.cuotas_totales !== null && f.cuotas_pagas >= f.cuotas_totales
  );
}

export default function FijosClient({ initial }: { initial: Fijo[] }) {
  const router = useRouter();
  const { settings } = useSettings();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState<Fijo[]>(initial);
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [materializing, setMaterializing] = useState<string | null>(null);

  const totales = useMemo(() => {
    const g = { gasto: 0, ingreso: 0, ahorro: 0 };
    for (const f of rows) {
      if (esCompleta(f)) continue;
      const ars = fixedArs(f, settings.tc_ref);
      if (f.tipo === "Ingreso") g.ingreso += ars;
      else if (f.tipo === "Ahorro") g.ahorro += ars;
      else g.gasto += ars;
    }
    return g;
  }, [rows, settings.tc_ref]);

  function openEdit(f: Fijo) {
    setModal({
      id: f.id,
      concepto: f.concepto,
      cat: f.cat,
      mon: f.mon,
      monto: String(f.monto),
      dia: String(f.dia),
      tipo: f.tipo,
      esCuota: f.cuotas_totales !== null,
      cuotas_totales: String(f.cuotas_totales ?? "6"),
      cuotas_pagas: String(f.cuotas_pagas ?? 0),
    });
  }

  async function save() {
    if (!modal) return;
    const monto = Number(modal.monto);
    const dia = Number(modal.dia);
    if (!modal.concepto.trim()) return toast("Falta el concepto", "error");
    if (!Number.isFinite(monto) || monto < 0)
      return toast("Monto inválido", "error");
    if (!Number.isFinite(dia) || dia < 1 || dia > 31)
      return toast("Día debe estar entre 1 y 31", "error");
    setSaving(true);

    let cuotas_totales: number | null = null;
    let cuotas_pagas = 0;
    if (modal.esCuota) {
      cuotas_totales = Number(modal.cuotas_totales);
      cuotas_pagas = Number(modal.cuotas_pagas);
      if (!Number.isInteger(cuotas_totales) || cuotas_totales < 1)
        return toast("Cuotas totales inválido", "error");
      if (
        !Number.isInteger(cuotas_pagas) ||
        cuotas_pagas < 0 ||
        cuotas_pagas > cuotas_totales
      )
        return toast(
          `Cuotas pagas debe estar entre 0 y ${cuotas_totales}`,
          "error",
        );
    }

    const payload = {
      concepto: modal.concepto,
      cat: modal.cat,
      mon: modal.mon,
      monto,
      dia,
      tipo: modal.tipo,
      cuotas_totales,
      cuotas_pagas,
    };

    if (modal.id) {
      const { data, error } = await supabase
        .from("fijos")
        .update(payload)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Fijo) : r)));
      toast("Fijo actualizado", "success");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return toast("Sesión expirada", "error");
      }
      const { data, error } = await supabase
        .from("fijos")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      setRows((rs) => [...rs, data as Fijo].sort((a, b) => a.dia - b.dia));
      toast("Fijo agregado", "success");
    }
    setModal(null);
    router.refresh();
  }

  async function remove(f: Fijo) {
    const ok = await confirm({
      title: "Borrar recurrente",
      description: `¿Seguro que querés borrar "${f.concepto}"? Los movimientos ya generados no se borran.`,
      confirmText: "Borrar",
      danger: true,
    });
    if (!ok) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== f.id));
    const { error } = await supabase.from("fijos").delete().eq("id", f.id);
    if (error) {
      toast(error.message, "error");
      setRows(prev);
    } else {
      toast("Fijo borrado", "success");
    }
  }

  /** Genera el movimiento del mes activo para este fijo (si aún no existe). */
  async function materializar(f: Fijo) {
    if (esCompleta(f)) {
      return toast(
        `"${f.concepto}" ya terminó (${f.cuotas_totales} cuotas)`,
        "info",
      );
    }
    setMaterializing(f.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMaterializing(null);
      return toast("Sesión expirada", "error");
    }

    // Chequear si ya hay uno de este fijo en el mes actual
    const { data: existente } = await supabase
      .from("movimientos")
      .select("id")
      .eq("from_fijo", f.id)
      .gte("fecha", `${settings.mes}-01`)
      .lt("fecha", nextMonthDate(settings.mes))
      .limit(1);
    if (existente && existente.length > 0) {
      setMaterializing(null);
      return toast(
        `Ya existe un movimiento de "${f.concepto}" en ${settings.mes}`,
        "info",
      );
    }

    const dia = String(Math.min(f.dia, daysInMonth(settings.mes))).padStart(
      2,
      "0",
    );
    const fecha = `${settings.mes}-${dia}`;
    // Sufijo con número de cuota
    const desc =
      f.cuotas_totales !== null
        ? `${f.concepto} · cuota ${f.cuotas_pagas + 1}/${f.cuotas_totales}`
        : f.concepto;

    const { error } = await supabase.from("movimientos").insert({
      user_id: user.id,
      fecha,
      tipo: f.tipo,
      cat: f.cat,
      descripcion: desc,
      mon: f.mon,
      monto: f.monto,
      tc: settings.tc_ref,
      medio: null,
      fv: "Fijo",
      estado: "Confirmado",
      from_fijo: f.id,
    });
    if (error) {
      setMaterializing(null);
      return toast(error.message, "error");
    }

    // Si es cuota, incrementar el contador
    if (f.cuotas_totales !== null) {
      const nuevoPagas = f.cuotas_pagas + 1;
      const { data: upd } = await supabase
        .from("fijos")
        .update({ cuotas_pagas: nuevoPagas })
        .eq("id", f.id)
        .select()
        .single();
      if (upd) {
        setRows((rs) => rs.map((r) => (r.id === f.id ? (upd as Fijo) : r)));
      }
    }

    setMaterializing(null);
    toast(
      f.cuotas_totales !== null
        ? `Cuota ${f.cuotas_pagas + 1}/${f.cuotas_totales} cargada`
        : `"${f.concepto}" cargado en ${settings.mes}`,
      "success",
    );
    router.refresh();
  }

  const tipoColor = (t: MovTipo) =>
    t === "Ingreso"
      ? { bg: "var(--pos-soft)", fg: "var(--pos)" }
      : t === "Ahorro"
        ? { bg: "var(--accent-soft)", fg: "var(--accent-ink)" }
        : { bg: "var(--neg-soft)", fg: "var(--neg)" };

  return (
    <>
      <PageHeader
        title="Recurrentes"
        subtitle={
          totales.gasto || totales.ingreso || totales.ahorro
            ? `mensual: ${fmtARS.format(totales.ingreso)} ingresos · ${fmtARS.format(totales.gasto)} gastos · ${fmtARS.format(totales.ahorro)} ahorro`
            : "gastos, ingresos y ahorros que se repiten cada mes"
        }
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            <Plus size={16} /> Nuevo
          </button>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={RefreshCcw}
            title="Todavía no cargaste recurrentes"
            description="Alquiler, sueldo, expensas, servicios, suscripciones… todo lo que se repite mes a mes."
            action={
              <button className="btn btn-primary" onClick={() => setModal(empty)}>
                <Plus size={16} /> Nuevo recurrente
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="card sm:hidden">
            {rows.map((r) => {
              const Icon = iconForCategory(r.cat, r.tipo);
              const col = tipoColor(r.tipo);
              const completa = esCompleta(r);
              const esCuota = r.cuotas_totales !== null;
              return (
                <div
                  key={r.id}
                  className="data-row items-start"
                  style={{
                    paddingTop: 14,
                    paddingBottom: 14,
                    opacity: completa ? 0.55 : 1,
                  }}
                >
                  <button
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                    onClick={() => openEdit(r)}
                    type="button"
                  >
                    <div
                      className="data-row-icon"
                      style={{ background: col.bg, color: col.fg }}
                    >
                      {esCuota ? <CreditCard size={18} /> : <Icon size={18} />}
                    </div>
                    <div className="data-row-body">
                      <div className="data-row-title flex items-center gap-1.5">
                        {r.concepto}
                        {esCuota && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "var(--surface-2)",
                              color: "var(--ink-soft)",
                            }}
                          >
                            {r.cuotas_pagas}/{r.cuotas_totales}
                          </span>
                        )}
                      </div>
                      <div className="data-row-sub">
                        {completa
                          ? "completado ✓"
                          : `día ${r.dia} · ${r.tipo.toLowerCase()} · ${r.cat}`}
                      </div>
                    </div>
                    <div className="data-row-amount" style={{ color: col.fg }}>
                      {r.mon === "USD"
                        ? fmtUSD2.format(r.monto)
                        : fmtARS.format(r.monto)}
                    </div>
                  </button>
                  {!completa && (
                    <button
                      onClick={() => materializar(r)}
                      disabled={materializing === r.id}
                      className="ml-2 self-center p-2 rounded-lg"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-ink)",
                      }}
                      aria-label={`Cargar en ${settings.mes}`}
                      title={`Cargar en ${settings.mes}`}
                    >
                      {materializing === r.id ? "…" : <Zap size={16} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="card overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "var(--ink-faint)" }}
                >
                  <th className="text-left px-3 py-2">Día</th>
                  <th className="text-left px-3 py-2">Concepto</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Categoría</th>
                  <th className="text-right px-3 py-2">Monto</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const Icon = iconForCategory(r.cat, r.tipo);
                  const col = tipoColor(r.tipo);
                  const completa = esCompleta(r);
                  const esCuota = r.cuotas_totales !== null;
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderTop: "1px solid var(--line)",
                        opacity: completa ? 0.5 : 1,
                      }}
                    >
                      <td className="px-3 py-2 mono">{r.dia}</td>
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-2">
                          {esCuota && (
                            <CreditCard
                              size={13}
                              style={{ color: "var(--ink-soft)" }}
                            />
                          )}
                          {r.concepto}
                          {esCuota && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: completa
                                  ? "var(--pos-soft)"
                                  : "var(--surface-2)",
                                color: completa
                                  ? "var(--pos)"
                                  : "var(--ink-soft)",
                              }}
                            >
                              {completa
                                ? `${r.cuotas_totales} ✓`
                                : `${r.cuotas_pagas}/${r.cuotas_totales}`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: col.bg, color: col.fg }}
                        >
                          {r.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          <Icon size={14} />
                          {r.cat}
                        </span>
                      </td>
                      <td className="px-3 py-2 mono text-right whitespace-nowrap">
                        {r.mon === "USD"
                          ? fmtUSD2.format(r.monto)
                          : fmtARS.format(r.monto)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {!completa && (
                          <button
                            onClick={() => materializar(r)}
                            disabled={materializing === r.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md mr-2"
                            style={{
                              background: "var(--accent-soft)",
                              color: "var(--accent-ink)",
                            }}
                            title={`Cargar en ${settings.mes}`}
                          >
                            {materializing === r.id ? (
                              "…"
                            ) : (
                              <>
                                <Zap size={13} /> Cargar
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(r)}
                          aria-label="Editar"
                          className="p-1.5"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(r)}
                          aria-label="Borrar"
                          className="p-1.5 ml-1"
                          style={{ color: "var(--neg)" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar recurrente" : "Nuevo recurrente"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Field label="Tipo">
              <div
                className="grid grid-cols-3 rounded-[10px] p-[3px] gap-[2px]"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                }}
              >
                {(["Gasto", "Ingreso", "Ahorro"] as MovTipo[]).map((t) => {
                  const active = modal.tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setModal({ ...modal, tipo: t, cat: catsFor(t)[0] })
                      }
                      className="py-2 text-sm font-semibold rounded-[7px] transition"
                      style={{
                        background: active ? "var(--surface)" : "transparent",
                        color: active ? "var(--ink)" : "var(--ink-soft)",
                        boxShadow: active ? "var(--shadow)" : "none",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Concepto">
              <input
                className="input"
                value={modal.concepto}
                onChange={(e) =>
                  setModal({ ...modal, concepto: e.target.value })
                }
                placeholder="ej. Alquiler, Sueldo, Netflix…"
              />
            </Field>
            <Field label="Categoría">
              <select
                className="input"
                value={modal.cat}
                onChange={(e) => setModal({ ...modal, cat: e.target.value })}
              >
                {catsFor(modal.tipo).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Moneda">
                <select
                  className="input"
                  value={modal.mon}
                  onChange={(e) =>
                    setModal({ ...modal, mon: e.target.value as Moneda })
                  }
                >
                  <option>ARS</option>
                  <option>USD</option>
                </select>
              </Field>
              <Field label={modal.esCuota ? "Monto por cuota" : "Monto"}>
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.monto}
                  onChange={(e) =>
                    setModal({ ...modal, monto: e.target.value })
                  }
                />
              </Field>
              <Field label="Día">
                <input
                  className="input mono"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={modal.dia}
                  onChange={(e) => setModal({ ...modal, dia: e.target.value })}
                />
              </Field>
            </div>

            {/* Toggle: es cuota */}
            <label
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition"
              style={{
                background: modal.esCuota
                  ? "var(--accent-soft)"
                  : "var(--surface-2)",
                border: `1px solid ${modal.esCuota ? "var(--accent)" : "var(--line)"}`,
              }}
            >
              <input
                type="checkbox"
                checked={modal.esCuota}
                onChange={(e) =>
                  setModal({ ...modal, esCuota: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 accent-[var(--accent)]"
              />
              <div className="flex-1">
                <div
                  className="text-sm font-semibold inline-flex items-center gap-1.5"
                  style={{
                    color: modal.esCuota ? "var(--accent-ink)" : "var(--ink)",
                  }}
                >
                  <CreditCard size={14} />
                  Es un plan de cuotas
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{
                    color: modal.esCuota
                      ? "var(--accent-ink)"
                      : "var(--ink-faint)",
                  }}
                >
                  Se paga en N meses. Cuando cumple las cuotas se completa.
                </div>
              </div>
            </label>

            {modal.esCuota && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cuotas totales">
                  <input
                    className="input mono"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={modal.cuotas_totales}
                    onChange={(e) =>
                      setModal({ ...modal, cuotas_totales: e.target.value })
                    }
                  />
                </Field>
                <Field label="Cuotas ya pagadas">
                  <input
                    className="input mono"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={Number(modal.cuotas_totales) || undefined}
                    value={modal.cuotas_pagas}
                    onChange={(e) =>
                      setModal({ ...modal, cuotas_pagas: e.target.value })
                    }
                  />
                </Field>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                className="btn"
                onClick={() => setModal(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving}
                type="button"
              >
                {saving ? (
                  "Guardando…"
                ) : (
                  <>
                    <Check size={15} /> Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** "2026-08" → días del mes. */
function daysInMonth(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** "2026-08" → "2026-09-01" (útil para queries < próximo mes). */
function nextMonthDate(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
