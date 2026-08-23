"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-context";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";
import { CATS_GASTO } from "@/lib/constants";
import type { Fijo, Moneda } from "@/types/database";
import { fmtARS, fmtUSD2 } from "@/lib/format";
import { fixedArs } from "@/lib/calc";

type Form = {
  id: string | null;
  concepto: string;
  cat: string;
  mon: Moneda;
  monto: string;
  dia: string;
};

const empty: Form = {
  id: null,
  concepto: "",
  cat: CATS_GASTO[0],
  mon: "ARS",
  monto: "",
  dia: "1",
};

export default function FijosClient({ initial }: { initial: Fijo[] }) {
  const router = useRouter();
  const { settings } = useSettings();
  const supabase = createSupabaseBrowserClient();

  const [rows, setRows] = useState<Fijo[]>(initial);
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const totalArs = rows.reduce((a, f) => a + fixedArs(f, settings.tc_ref), 0);

  function openEdit(f: Fijo) {
    setModal({
      id: f.id,
      concepto: f.concepto,
      cat: f.cat,
      mon: f.mon,
      monto: String(f.monto),
      dia: String(f.dia),
    });
  }

  async function save() {
    if (!modal) return;
    const monto = Number(modal.monto);
    const dia = Number(modal.dia);
    if (!modal.concepto.trim()) return alert("Falta el concepto");
    if (!Number.isFinite(monto) || monto < 0) return alert("Monto inválido");
    if (!Number.isFinite(dia) || dia < 1 || dia > 31)
      return alert("Día debe estar entre 1 y 31");
    setSaving(true);

    const payload = {
      concepto: modal.concepto,
      cat: modal.cat,
      mon: modal.mon,
      monto,
      dia,
    };

    if (modal.id) {
      const { data, error } = await supabase
        .from("fijos")
        .update(payload)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Fijo) : r)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return alert("Sesión expirada");
      const { data, error } = await supabase
        .from("fijos")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) =>
        [...rs, data as Fijo].sort((a, b) => a.dia - b.dia),
      );
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este gasto fijo?")) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("fijos").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setRows(prev);
    }
  }

  return (
    <>
      <PageHeader
        title="Gastos fijos"
        subtitle={`compromiso mensual estimado: ${fmtARS.format(totalArs)}`}
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            + Nuevo fijo
          </button>
        }
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--ink-faint)" }}
            >
              <th className="text-left px-3 py-2">Día</th>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2">Categoría</th>
              <th className="text-right px-3 py-2">Monto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Todavía no cargaste gastos fijos.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-3 py-2 mono">{r.dia}</td>
                <td className="px-3 py-2 font-medium">{r.concepto}</td>
                <td className="px-3 py-2">{r.cat}</td>
                <td className="px-3 py-2 mono text-right whitespace-nowrap">
                  {r.mon === "USD"
                    ? fmtUSD2.format(r.monto)
                    : fmtARS.format(r.monto)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    className="text-sm mr-2"
                    onClick={() => openEdit(r)}
                    style={{ color: "var(--accent)" }}
                  >
                    Editar
                  </button>
                  <button
                    className="text-sm"
                    onClick={() => remove(r.id)}
                    style={{ color: "var(--neg)" }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar fijo" : "Nuevo fijo"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col">
              <span className="label">Concepto</span>
              <input
                className="input"
                value={modal.concepto}
                onChange={(e) =>
                  setModal({ ...modal, concepto: e.target.value })
                }
              />
            </label>
            <label className="flex flex-col">
              <span className="label">Categoría</span>
              <select
                className="input"
                value={modal.cat}
                onChange={(e) => setModal({ ...modal, cat: e.target.value })}
              >
                {CATS_GASTO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col">
                <span className="label">Moneda</span>
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
              </label>
              <label className="flex flex-col">
                <span className="label">Monto</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.monto}
                  onChange={(e) =>
                    setModal({ ...modal, monto: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col">
                <span className="label">Día del mes</span>
                <input
                  className="input mono"
                  type="number"
                  min={1}
                  max={31}
                  value={modal.dia}
                  onChange={(e) => setModal({ ...modal, dia: e.target.value })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
