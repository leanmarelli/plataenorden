"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";
import type { Moneda, Viaje } from "@/types/database";
import { fmtARS, fmtUSD2, pct } from "@/lib/format";

type Form = {
  id: string | null;
  viaje: string;
  concepto: string;
  mon: Moneda;
  presupuesto: string;
  gastado: string;
};

const empty: Form = {
  id: null,
  viaje: "",
  concepto: "",
  mon: "USD",
  presupuesto: "",
  gastado: "0",
};

export default function ViajesClient({ initial }: { initial: Viaje[] }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Viaje[]>(initial);
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<string, Viaje[]> = {};
    for (const r of rows) (g[r.viaje] ||= []).push(r);
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  function openEdit(v: Viaje) {
    setModal({
      id: v.id,
      viaje: v.viaje,
      concepto: v.concepto,
      mon: v.mon,
      presupuesto: String(v.presupuesto),
      gastado: String(v.gastado),
    });
  }

  function openNewIn(viaje: string) {
    setModal({ ...empty, viaje });
  }

  async function save() {
    if (!modal) return;
    if (!modal.viaje.trim()) return alert("Falta el nombre del viaje");
    if (!modal.concepto.trim()) return alert("Falta el concepto");
    const pres = Number(modal.presupuesto);
    const gas = Number(modal.gastado);
    if (!Number.isFinite(pres) || pres < 0) return alert("Presupuesto inválido");
    if (!Number.isFinite(gas) || gas < 0) return alert("Gastado inválido");
    setSaving(true);
    const payload = {
      viaje: modal.viaje.trim(),
      concepto: modal.concepto.trim(),
      mon: modal.mon,
      presupuesto: pres,
      gastado: gas,
    };
    if (modal.id) {
      const { data, error } = await supabase
        .from("viajes")
        .update(payload)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Viaje) : r)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return alert("Sesión expirada");
      const { data, error } = await supabase
        .from("viajes")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => [...rs, data as Viaje]);
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este rubro?")) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("viajes").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setRows(prev);
    }
  }

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle="presupuesto y gastado por rubro"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            + Nuevo rubro
          </button>
        }
      />
      <div className="flex flex-col gap-6">
        {grouped.length === 0 && (
          <div
            className="card p-6 text-center"
            style={{ color: "var(--ink-faint)" }}
          >
            No cargaste viajes todavía.
          </div>
        )}
        {grouped.map(([nombre, items]) => {
          const pres = items.reduce((a, x) => a + x.presupuesto, 0);
          const gas = items.reduce((a, x) => a + x.gastado, 0);
          const mon = items[0]?.mon ?? "USD";
          const fmt = mon === "USD" ? fmtUSD2.format : fmtARS.format;
          const p = pres > 0 ? Math.min(1, gas / pres) : 0;
          return (
            <section key={nombre} className="card p-5">
              <div className="flex flex-wrap items-baseline gap-3 mb-1">
                <h2 className="text-lg font-serif font-semibold mr-auto">
                  {nombre}
                </h2>
                <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  {fmt(gas)} <span style={{ color: "var(--ink-faint)" }}>de</span>{" "}
                  {fmt(pres)}
                  <span
                    className="ml-2 text-xs"
                    style={{ color: p > 1 ? "var(--neg)" : "var(--ink-faint)" }}
                  >
                    ({pct(p)})
                  </span>
                </div>
                <button
                  className="text-sm"
                  onClick={() => openNewIn(nombre)}
                  style={{ color: "var(--accent)" }}
                >
                  + rubro
                </button>
              </div>
              <div
                className="w-full rounded-full h-2 overflow-hidden mb-3"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${p * 100}%`,
                    background: p > 1 ? "var(--neg)" : "var(--accent)",
                  }}
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-xs uppercase tracking-wider"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    <th className="text-left px-2 py-1">Concepto</th>
                    <th className="text-right px-2 py-1">Presupuesto</th>
                    <th className="text-right px-2 py-1">Gastado</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="px-2 py-1.5">{r.concepto}</td>
                      <td className="px-2 py-1.5 mono text-right">
                        {fmt(r.presupuesto)}
                      </td>
                      <td className="px-2 py-1.5 mono text-right">
                        {fmt(r.gastado)}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        <button
                          className="text-xs mr-2"
                          onClick={() => openEdit(r)}
                          style={{ color: "var(--accent)" }}
                        >
                          Editar
                        </button>
                        <button
                          className="text-xs"
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
            </section>
          );
        })}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar rubro" : "Nuevo rubro de viaje"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col">
              <span className="label">Viaje</span>
              <input
                className="input"
                value={modal.viaje}
                onChange={(e) =>
                  setModal({ ...modal, viaje: e.target.value })
                }
                placeholder="Europa 2027"
              />
            </label>
            <label className="flex flex-col">
              <span className="label">Concepto</span>
              <input
                className="input"
                value={modal.concepto}
                onChange={(e) =>
                  setModal({ ...modal, concepto: e.target.value })
                }
                placeholder="Pasajes, Alojamiento, Comida…"
              />
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
                <span className="label">Presupuesto</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.presupuesto}
                  onChange={(e) =>
                    setModal({ ...modal, presupuesto: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col">
                <span className="label">Gastado</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.gastado}
                  onChange={(e) =>
                    setModal({ ...modal, gastado: e.target.value })
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
