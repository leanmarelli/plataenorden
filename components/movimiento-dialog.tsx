"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, SlidersHorizontal, Check, Delete } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import Modal from "@/components/modal";
import {
  CATS_AHORRO,
  CATS_GASTO,
  CATS_INGRESO,
  MEDIOS,
} from "@/lib/constants";
import { fmtARS, fmtUSD2 } from "@/lib/format";
import type {
  FijoVar,
  Moneda,
  MovEstado,
  Movimiento,
  MovTipo,
} from "@/types/database";

export type MovForm = {
  id: string | null;
  fecha: string;
  tipo: MovTipo;
  cat: string;
  descripcion: string;
  mon: Moneda;
  monto: string;
  tc: string;
  medio: string;
  fv: FijoVar;
  estado: MovEstado;
  repetirMensual: boolean;
};

export function emptyMovForm(fecha: string, tc: number): MovForm {
  return {
    id: null,
    fecha,
    tipo: "Gasto",
    cat: CATS_GASTO[0],
    descripcion: "",
    mon: "ARS",
    monto: "",
    tc: String(tc),
    medio: MEDIOS[1],
    fv: "Variable",
    estado: "Confirmado",
    repetirMensual: false,
  };
}

export function movFormFrom(r: Movimiento, defaultTc: number): MovForm {
  return {
    id: r.id,
    fecha: r.fecha,
    tipo: r.tipo,
    cat: r.cat,
    descripcion: r.descripcion ?? "",
    mon: r.mon,
    monto: String(r.monto),
    tc: r.tc ? String(r.tc) : String(defaultTc),
    medio: r.medio ?? "",
    fv: r.fv,
    estado: r.estado,
    repetirMensual: false,
  };
}

function catsFor(tipo: MovTipo): readonly string[] {
  if (tipo === "Ingreso") return CATS_INGRESO;
  if (tipo === "Ahorro") return CATS_AHORRO;
  return CATS_GASTO;
}

type Step = "monto" | "detalles" | "avanzado";

export default function MovimientoDialog({
  form,
  onClose,
  onSaved,
}: {
  form: MovForm | null;
  onClose: () => void;
  onSaved?: (row: Movimiento) => void;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [local, setLocal] = useState<MovForm | null>(form);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("monto");

  // Reset local + step cuando llega un nuevo form (open)
  useEffect(() => {
    setLocal(form);
    // Si viene con id (edición), saltamos directo a la vista completa
    setStep(form?.id ? "avanzado" : "monto");
  }, [form?.id, form]);

  async function save(desde: Step) {
    if (!local) return;
    const monto = Number(local.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      toast("Ingresá un monto", "error");
      setStep("monto");
      return;
    }
    setSaving(true);
    const row = {
      fecha: local.fecha,
      tipo: local.tipo,
      cat: local.cat,
      descripcion: local.descripcion || null,
      mon: local.mon,
      monto,
      tc: local.tc ? Number(local.tc) : null,
      medio: local.medio || null,
      fv: local.fv,
      estado: local.estado,
    };

    if (local.id) {
      const { data, error } = await supabase
        .from("movimientos")
        .update(row)
        .eq("id", local.id)
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast("Error al guardar: " + error.message, "error");
        return;
      }
      onSaved?.(data as Movimiento);
      toast("Movimiento actualizado", "success");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        toast("Sesión expirada, refrescá la página", "error");
        return;
      }

      let fromFijoId: string | null = null;
      if (local.repetirMensual) {
        const dia = Number(local.fecha.slice(8, 10)) || 1;
        const { data: fijoData, error: fijoErr } = await supabase
          .from("fijos")
          .insert({
            user_id: user.id,
            concepto: local.descripcion || local.cat,
            cat: local.cat,
            mon: local.mon,
            monto,
            dia,
            tipo: local.tipo,
          })
          .select()
          .single();
        if (fijoErr) {
          setSaving(false);
          toast("No se pudo crear el fijo: " + fijoErr.message, "error");
          return;
        }
        fromFijoId = fijoData.id;
      }

      const { data, error } = await supabase
        .from("movimientos")
        .insert({ ...row, user_id: user.id, from_fijo: fromFijoId })
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast("Error al guardar: " + error.message, "error");
        return;
      }
      onSaved?.(data as Movimiento);
      toast(
        local.repetirMensual
          ? "Movimiento agregado y guardado como recurrente"
          : "Movimiento agregado",
        "success",
      );
    }
    // reset a monto para próxima vez
    setStep(desde);
    onClose();
    router.refresh();
  }

  if (!local) return null;

  const title = local.id
    ? "Editar movimiento"
    : step === "monto"
      ? "Nuevo movimiento"
      : step === "detalles"
        ? "Detalles"
        : "Más opciones";

  return (
    <Modal
      open={!!local}
      onClose={() => {
        setStep("monto");
        onClose();
      }}
      title={title}
    >
      {/* Barra de progreso arriba (excepto al editar) */}
      {!local.id && (
        <div className="flex gap-1 mb-4 -mt-1">
          {(["monto", "detalles", "avanzado"] as Step[]).map((s, i) => {
            const active =
              step === s ||
              (step === "detalles" && i === 0) ||
              (step === "avanzado" && i < 2);
            return (
              <span
                key={s}
                className="flex-1 h-1 rounded-full transition"
                style={{
                  background: active ? "var(--accent)" : "var(--surface-2)",
                }}
              />
            );
          })}
        </div>
      )}

      {step === "monto" && (
        <StepMonto
          local={local}
          setLocal={setLocal}
          onNext={() => setStep("detalles")}
        />
      )}

      {step === "detalles" && (
        <StepDetalles
          local={local}
          setLocal={setLocal}
          onBack={() => setStep("monto")}
          onSave={() => save("monto")}
          onMore={() => setStep("avanzado")}
          saving={saving}
        />
      )}

      {step === "avanzado" && (
        <StepAvanzado
          local={local}
          setLocal={setLocal}
          onBack={local.id ? undefined : () => setStep("detalles")}
          onSave={() => save("monto")}
          saving={saving}
        />
      )}
    </Modal>
  );
}

/* ─────────── STEP 1 — MONTO ─────────── */
function StepMonto({
  local,
  setLocal,
  onNext,
}: {
  local: MovForm;
  setLocal: (f: MovForm) => void;
  onNext: () => void;
}) {
  const monto = local.monto;
  const canContinue = Number(monto.replace(",", ".")) > 0;

  function press(k: string) {
    if (k === "back") {
      setLocal({ ...local, monto: monto.slice(0, -1) });
      return;
    }
    if (k === ",") {
      if (monto.includes(",") || monto.includes(".")) return;
      if (monto === "") {
        setLocal({ ...local, monto: "0," });
        return;
      }
      setLocal({ ...local, monto: monto + "," });
      return;
    }
    // dígito
    if (monto === "0") {
      setLocal({ ...local, monto: k });
      return;
    }
    // límite razonable
    if (monto.replace(",", "").replace(".", "").length >= 12) return;
    setLocal({ ...local, monto: monto + k });
  }

  // Soporte de teclado físico (desktop). Los eventos no llegan al NumPad
  // porque no hay input real enfocado — escuchamos a nivel window.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // No interferir si el usuario está escribiendo en otro campo del modal
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "," || e.key === ".") {
        e.preventDefault();
        press(",");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        press("back");
      } else if (e.key === "Enter" && canContinue) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monto, canContinue]);

  const display = formatDisplay(monto, local.mon);

  return (
    <div className="flex flex-col gap-5">
      {/* Tipo — pill toggle */}
      <div
        className="grid grid-cols-3 rounded-[12px] p-[3px] gap-[2px]"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
        }}
      >
        {(["Gasto", "Ingreso", "Ahorro"] as MovTipo[]).map((t) => {
          const active = local.tipo === t;
          const col =
            t === "Ingreso"
              ? "var(--pos)"
              : t === "Ahorro"
                ? "var(--accent-ink)"
                : "var(--neg)";
          return (
            <button
              key={t}
              type="button"
              onClick={() =>
                setLocal({ ...local, tipo: t, cat: catsFor(t)[0] })
              }
              className="py-2.5 text-sm font-semibold rounded-[9px] transition"
              style={{
                background: active ? "var(--surface)" : "transparent",
                color: active ? col : "var(--ink-soft)",
                boxShadow: active ? "var(--shadow)" : "none",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Monto grande centrado */}
      <div className="flex flex-col items-center py-4">
        <div
          className="text-xs uppercase tracking-widest mb-2 font-semibold"
          style={{ color: "var(--ink-faint)" }}
        >
          Monto
        </div>
        <div
          className="mono font-serif font-bold text-center"
          style={{
            fontSize: "clamp(36px, 10vw, 56px)",
            lineHeight: 1.1,
            color: monto ? "var(--ink)" : "var(--ink-faint)",
          }}
        >
          {display}
        </div>

        {/* Moneda toggle abajo del monto */}
        <div
          className="inline-flex mt-4 rounded-[10px] p-[3px]"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}
        >
          {(["ARS", "USD"] as Moneda[]).map((m) => {
            const active = local.mon === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setLocal({ ...local, mon: m })}
                className="px-4 py-1 text-xs font-bold rounded-[7px] transition"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  boxShadow: active ? "var(--shadow)" : "none",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Teclado numérico custom (solo en mobile la usarían mucho, pero se muestra siempre) */}
      <NumPad onPress={press} />

      <button
        type="button"
        className="btn btn-primary w-full justify-center py-3 text-base font-semibold"
        disabled={!canContinue}
        onClick={onNext}
      >
        Continuar
      </button>
    </div>
  );
}

function NumPad({ onPress }: { onPress: (k: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-2 numpad">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onPointerDown={(e) => {
            // Evita que el tap propague a padres (scroll, drag del modal) y
            // no dispare rubber-band de iOS.
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onClick={() => onPress(k)}
          className="rounded-xl text-xl font-medium py-3 numpad-key"
          style={{
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          {k === "back" ? (
            <Delete size={20} style={{ margin: "0 auto" }} />
          ) : (
            k
          )}
        </button>
      ))}
    </div>
  );
}

function formatDisplay(monto: string, cur: Moneda): string {
  const symbol = cur === "USD" ? "US$" : "$";
  if (!monto) return `${symbol} 0`;
  const [ent, dec] = monto.split(",");
  const entNum = Number(ent || "0");
  const entFmt = new Intl.NumberFormat("es-AR").format(entNum);
  if (monto.includes(",")) return `${symbol} ${entFmt},${dec ?? ""}`;
  return `${symbol} ${entFmt}`;
}

/* ─────────── STEP 2 — DETALLES ─────────── */
function StepDetalles({
  local,
  setLocal,
  onBack,
  onSave,
  onMore,
  saving,
}: {
  local: MovForm;
  setLocal: (f: MovForm) => void;
  onBack: () => void;
  onSave: () => void;
  onMore: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm -mt-1"
        style={{ color: "var(--ink-soft)" }}
      >
        <ChevronLeft size={16} /> Atrás
      </button>

      {/* Recap del monto elegido */}
      <div
        className="rounded-xl px-4 py-2 flex items-baseline justify-between"
        style={{ background: "var(--surface-2)" }}
      >
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {local.tipo} · {local.mon}
        </span>
        <span
          className="mono text-lg font-bold"
          style={{
            color:
              local.tipo === "Ingreso"
                ? "var(--pos)"
                : local.tipo === "Ahorro"
                  ? "var(--accent-ink)"
                  : "var(--neg)",
          }}
        >
          {local.mon === "USD"
            ? fmtUSD2.format(Number(local.monto.replace(",", ".")))
            : fmtARS.format(Number(local.monto.replace(",", ".")))}
        </span>
      </div>

      <Field label="Categoría">
        <select
          className="input"
          value={local.cat}
          onChange={(e) => setLocal({ ...local, cat: e.target.value })}
        >
          {catsFor(local.tipo).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Descripción">
        <input
          className="input"
          value={local.descripcion}
          onChange={(e) =>
            setLocal({ ...local, descripcion: e.target.value })
          }
          placeholder="ej. sueldo agosto, alquiler depto…"
        />
      </Field>
      <Field label="Medio">
        <select
          className="input"
          value={local.medio}
          onChange={(e) => setLocal({ ...local, medio: e.target.value })}
        >
          {MEDIOS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-2 mt-2">
        <button
          type="button"
          className="btn btn-primary justify-center py-3 text-base font-semibold"
          onClick={onSave}
          disabled={saving}
        >
          <Check size={16} /> {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          className="btn justify-center text-sm"
          onClick={onMore}
        >
          <SlidersHorizontal size={14} /> Editar más campos
        </button>
      </div>
    </div>
  );
}

/* ─────────── STEP 3 — AVANZADO ─────────── */
function StepAvanzado({
  local,
  setLocal,
  onBack,
  onSave,
  saving,
}: {
  local: MovForm;
  setLocal: (f: MovForm) => void;
  onBack?: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 self-start text-sm -mt-1"
          style={{ color: "var(--ink-soft)" }}
        >
          <ChevronLeft size={16} /> Atrás
        </button>
      )}

      {/* Al editar mostramos el modo completo directo */}
      {local.id && (
        <>
          <div
            className="grid grid-cols-3 rounded-[10px] p-[3px] gap-[2px]"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
            }}
          >
            {(["Gasto", "Ingreso", "Ahorro"] as MovTipo[]).map((t) => {
              const active = local.tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setLocal({ ...local, tipo: t, cat: catsFor(t)[0] })
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
          <div className="grid gap-3 grid-cols-2">
            <Field label="Moneda">
              <select
                className="input"
                value={local.mon}
                onChange={(e) =>
                  setLocal({ ...local, mon: e.target.value as Moneda })
                }
              >
                <option>ARS</option>
                <option>USD</option>
              </select>
            </Field>
            <Field label="Monto">
              <input
                className="input mono"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={local.monto}
                onChange={(e) => setLocal({ ...local, monto: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Categoría">
            <select
              className="input"
              value={local.cat}
              onChange={(e) => setLocal({ ...local, cat: e.target.value })}
            >
              {catsFor(local.tipo).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripción">
            <input
              className="input"
              value={local.descripcion}
              onChange={(e) =>
                setLocal({ ...local, descripcion: e.target.value })
              }
            />
          </Field>
        </>
      )}

      <div className="grid gap-3 grid-cols-2">
        <Field label="Fecha">
          <input
            type="date"
            className="input"
            value={local.fecha}
            onChange={(e) => setLocal({ ...local, fecha: e.target.value })}
          />
        </Field>
        <Field label="Medio">
          <select
            className="input"
            value={local.medio}
            onChange={(e) => setLocal({ ...local, medio: e.target.value })}
          >
            {MEDIOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 grid-cols-2">
        <Field label="Fijo/Variable">
          <select
            className="input"
            value={local.fv}
            onChange={(e) =>
              setLocal({ ...local, fv: e.target.value as FijoVar })
            }
          >
            <option>Variable</option>
            <option>Fijo</option>
          </select>
        </Field>
        <Field label="Estado">
          <select
            className="input"
            value={local.estado}
            onChange={(e) =>
              setLocal({ ...local, estado: e.target.value as MovEstado })
            }
          >
            <option>Confirmado</option>
            <option>Pendiente</option>
          </select>
        </Field>
      </div>

      {local.mon === "USD" && (
        <Field label="Tipo de cambio (ARS por USD)">
          <input
            className="input mono"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={local.tc}
            onChange={(e) => setLocal({ ...local, tc: e.target.value })}
          />
        </Field>
      )}

      {!local.id && (
        <label
          className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition"
          style={{
            background: local.repetirMensual
              ? "var(--accent-soft)"
              : "var(--surface-2)",
            border: `1px solid ${local.repetirMensual ? "var(--accent)" : "var(--line)"}`,
          }}
        >
          <input
            type="checkbox"
            checked={local.repetirMensual}
            onChange={(e) =>
              setLocal({
                ...local,
                repetirMensual: e.target.checked,
                fv: e.target.checked ? "Fijo" : local.fv,
              })
            }
            className="mt-0.5 w-4 h-4 accent-[var(--accent)]"
          />
          <div className="flex-1">
            <div
              className="text-sm font-semibold"
              style={{
                color: local.repetirMensual
                  ? "var(--accent-ink)"
                  : "var(--ink)",
              }}
            >
              Se repite todos los meses
            </div>
            <div
              className="text-xs mt-0.5"
              style={{
                color: local.repetirMensual
                  ? "var(--accent-ink)"
                  : "var(--ink-faint)",
              }}
            >
              Se guarda también en Fijos.
            </div>
          </div>
        </label>
      )}

      <button
        type="button"
        className="btn btn-primary w-full justify-center py-3 text-base font-semibold mt-2"
        onClick={onSave}
        disabled={saving}
      >
        <Check size={16} /> {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
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
