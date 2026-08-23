"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import Modal from "@/components/modal";
import {
  CATS_AHORRO,
  CATS_GASTO,
  CATS_INGRESO,
  MEDIOS,
} from "@/lib/constants";
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
  };
}

function catsFor(tipo: MovTipo): readonly string[] {
  if (tipo === "Ingreso") return CATS_INGRESO;
  if (tipo === "Ahorro") return CATS_AHORRO;
  return CATS_GASTO;
}

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

  // Sync when caller opens a new form
  if (form !== local && form?.id !== local?.id) {
    setLocal(form);
  }

  async function save() {
    if (!local) return;
    const monto = Number(local.monto);
    if (!Number.isFinite(monto) || monto < 0) {
      toast("Monto inválido", "error");
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
      const { data, error } = await supabase
        .from("movimientos")
        .insert({ ...row, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast("Error al guardar: " + error.message, "error");
        return;
      }
      onSaved?.(data as Movimiento);
      toast("Movimiento agregado", "success");
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={!!local}
      onClose={onClose}
      title={local?.id ? "Editar movimiento" : "Nuevo movimiento"}
    >
      {local && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 grid-cols-2">
            <Field label="Fecha">
              <input
                type="date"
                className="input"
                value={local.fecha}
                onChange={(e) => setLocal({ ...local, fecha: e.target.value })}
              />
            </Field>
            <Field label="Tipo">
              <select
                className="input"
                value={local.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as MovTipo;
                  setLocal({ ...local, tipo, cat: catsFor(tipo)[0] });
                }}
              >
                <option>Gasto</option>
                <option>Ingreso</option>
                <option>Ahorro</option>
              </select>
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
              placeholder="ej. sueldo agosto, alquiler depto…"
            />
          </Field>
          <div className="grid gap-3 grid-cols-3">
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
            <Field label="TC">
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
          </div>
          <div className="grid gap-3 grid-cols-3">
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

          <div className="flex justify-end gap-2 mt-2">
            <button className="btn" onClick={onClose} type="button">
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
              type="button"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </Modal>
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
