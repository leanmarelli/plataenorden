"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";
import type { Conversion, Moneda } from "@/types/database";
import { fmtARS, fmtNum, fmtUSD2 } from "@/lib/format";

type Form = {
  id: string | null;
  fecha: string;
  de: Moneda;
  monto_de: string;
  a: Moneda;
  monto_a: string;
};

const empty: Form = {
  id: null,
  fecha: new Date().toISOString().slice(0, 10),
  de: "ARS",
  monto_de: "",
  a: "USD",
  monto_a: "",
};

export default function ConversionesClient({
  initial,
}: {
  initial: Conversion[];
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Conversion[]>(initial);
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(c: Conversion) {
    setModal({
      id: c.id,
      fecha: c.fecha,
      de: c.de,
      monto_de: String(c.monto_de),
      a: c.a,
      monto_a: String(c.monto_a),
    });
  }

  async function save() {
    if (!modal) return;
    const md = Number(modal.monto_de);
    const ma = Number(modal.monto_a);
    if (modal.de === modal.a)
      return alert("Las monedas de origen y destino deben ser diferentes");
    if (!Number.isFinite(md) || md <= 0)
      return alert("Monto de origen inválido");
    if (!Number.isFinite(ma) || ma <= 0)
      return alert("Monto de destino inválido");
    setSaving(true);
    const payload = {
      fecha: modal.fecha,
      de: modal.de,
      monto_de: md,
      a: modal.a,
      monto_a: ma,
    };
    if (modal.id) {
      const { data, error } = await supabase
        .from("conversiones")
        .update(payload)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) =>
        rs.map((r) => (r.id === modal.id ? (data as Conversion) : r)),
      );
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return alert("Sesión expirada");
      const { data, error } = await supabase
        .from("conversiones")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => [data as Conversion, ...rs]);
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta conversión?")) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("conversiones").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setRows(prev);
    }
  }

  function fmt(mon: Moneda, val: number) {
    return mon === "USD" ? fmtUSD2.format(val) : fmtARS.format(val);
  }

  return (
    <>
      <PageHeader
        title="Conversiones"
        subtitle="compra/venta de dólares y otros cambios"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            + Nueva conversión
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
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="text-left px-3 py-2">De</th>
              <th className="text-right px-3 py-2">Monto origen</th>
              <th className="text-left px-3 py-2">A</th>
              <th className="text-right px-3 py-2">Monto destino</th>
              <th className="text-right px-3 py-2">Tipo de cambio implícito</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Sin conversiones cargadas.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const tc =
                r.de === "ARS"
                  ? r.monto_de / r.monto_a
                  : r.monto_a / r.monto_de;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-3 py-2 mono">{r.fecha}</td>
                  <td className="px-3 py-2">{r.de}</td>
                  <td className="px-3 py-2 mono text-right whitespace-nowrap">
                    {fmt(r.de, r.monto_de)}
                  </td>
                  <td className="px-3 py-2">{r.a}</td>
                  <td className="px-3 py-2 mono text-right whitespace-nowrap">
                    {fmt(r.a, r.monto_a)}
                  </td>
                  <td className="px-3 py-2 mono text-right">
                    {fmtNum.format(tc)}
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
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar conversión" : "Nueva conversión"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col">
              <span className="label">Fecha</span>
              <input
                className="input"
                type="date"
                value={modal.fecha}
                onChange={(e) => setModal({ ...modal, fecha: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col">
                <span className="label">De</span>
                <select
                  className="input"
                  value={modal.de}
                  onChange={(e) =>
                    setModal({ ...modal, de: e.target.value as Moneda })
                  }
                >
                  <option>ARS</option>
                  <option>USD</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="label">Monto origen</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.monto_de}
                  onChange={(e) =>
                    setModal({ ...modal, monto_de: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col">
                <span className="label">A</span>
                <select
                  className="input"
                  value={modal.a}
                  onChange={(e) =>
                    setModal({ ...modal, a: e.target.value as Moneda })
                  }
                >
                  <option>USD</option>
                  <option>ARS</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="label">Monto destino</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.monto_a}
                  onChange={(e) =>
                    setModal({ ...modal, monto_a: e.target.value })
                  }
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
