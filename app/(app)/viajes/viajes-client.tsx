"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Plane } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
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
  const { toast } = useToast();
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
    if (!modal.viaje.trim())
      return toast("Falta el nombre del viaje", "error");
    if (!modal.concepto.trim()) return toast("Falta el concepto", "error");
    const pres = Number(modal.presupuesto);
    const gas = Number(modal.gastado);
    if (!Number.isFinite(pres) || pres < 0)
      return toast("Presupuesto inválido", "error");
    if (!Number.isFinite(gas) || gas < 0)
      return toast("Gastado inválido", "error");
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
      if (error) return toast(error.message, "error");
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Viaje) : r)));
      toast("Rubro actualizado", "success");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return toast("Sesión expirada", "error");
      }
      const { data, error } = await supabase
        .from("viajes")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      setRows((rs) => [...rs, data as Viaje]);
      toast("Rubro agregado", "success");
    }
    setModal(null);
    router.refresh();
  }

  async function remove(v: Viaje) {
    if (!confirm(`¿Borrar "${v.concepto}" de ${v.viaje}?`)) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== v.id));
    const { error } = await supabase.from("viajes").delete().eq("id", v.id);
    if (error) {
      toast(error.message, "error");
      setRows(prev);
    } else {
      toast("Rubro borrado", "success");
    }
  }

  return (
    <>
      <PageHeader
        title="Viajes"
        subtitle="presupuesto y gastado por rubro"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            <Plus size={16} /> Nuevo rubro
          </button>
        }
      />

      {grouped.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Plane}
            title="Sin viajes cargados"
            description="Armá el presupuesto de tu próximo viaje y llevá el control por rubro."
            action={
              <button className="btn btn-primary" onClick={() => setModal(empty)}>
                <Plus size={16} /> Nuevo rubro
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([nombre, items]) => {
            const pres = items.reduce((a, x) => a + x.presupuesto, 0);
            const gas = items.reduce((a, x) => a + x.gastado, 0);
            const mon = items[0]?.mon ?? "USD";
            const fmt = mon === "USD" ? fmtUSD2.format : fmtARS.format;
            const p = pres > 0 ? Math.min(1, gas / pres) : 0;
            const excedido = gas > pres;
            return (
              <section key={nombre} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <h2 className="text-lg font-serif font-semibold mr-auto">
                    {nombre}
                  </h2>
                  <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
                    <span
                      className="mono"
                      style={{
                        color: excedido ? "var(--neg)" : "var(--ink)",
                      }}
                    >
                      {fmt(gas)}
                    </span>{" "}
                    <span style={{ color: "var(--ink-faint)" }}>
                      de {fmt(pres)} ({pct(p)})
                    </span>
                  </div>
                  <button
                    className="text-sm inline-flex items-center gap-1"
                    onClick={() => openNewIn(nombre)}
                    style={{ color: "var(--accent)" }}
                  >
                    <Plus size={14} /> rubro
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
                      background: excedido ? "var(--neg)" : "var(--accent)",
                    }}
                  />
                </div>
                <div className="hidden sm:block">
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
                        <tr
                          key={r.id}
                          style={{ borderTop: "1px solid var(--line)" }}
                        >
                          <td className="px-2 py-1.5">{r.concepto}</td>
                          <td className="px-2 py-1.5 mono text-right">
                            {fmt(r.presupuesto)}
                          </td>
                          <td className="px-2 py-1.5 mono text-right">
                            {fmt(r.gastado)}
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEdit(r)}
                              aria-label="Editar"
                              className="p-1"
                              style={{ color: "var(--ink-soft)" }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => remove(r)}
                              aria-label="Borrar"
                              className="p-1 ml-1"
                              style={{ color: "var(--neg)" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <div className="sm:hidden -mx-4 sm:-mx-5">
                  {items.map((r) => {
                    const pRow = r.presupuesto > 0
                      ? Math.min(1, r.gastado / r.presupuesto)
                      : 0;
                    const over = r.gastado > r.presupuesto;
                    return (
                      <button
                        key={r.id}
                        className="w-full text-left active:opacity-70 px-4 py-3"
                        onClick={() => openEdit(r)}
                        type="button"
                        style={{ borderTop: "1px solid var(--line)" }}
                      >
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                          <span className="font-medium text-sm">
                            {r.concepto}
                          </span>
                          <span
                            className="mono text-sm"
                            style={{
                              color: over ? "var(--neg)" : "var(--ink)",
                            }}
                          >
                            {fmt(r.gastado)}
                            <span style={{ color: "var(--ink-faint)" }}>
                              {" / "}
                              {fmt(r.presupuesto)}
                            </span>
                          </span>
                        </div>
                        <div
                          className="w-full rounded-full h-1 overflow-hidden"
                          style={{ background: "var(--surface-2)" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${pRow * 100}%`,
                              background: over ? "var(--neg)" : "var(--accent)",
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar rubro" : "Nuevo rubro"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Field label="Viaje">
              <input
                className="input"
                value={modal.viaje}
                onChange={(e) => setModal({ ...modal, viaje: e.target.value })}
                placeholder="Europa 2027"
              />
            </Field>
            <Field label="Concepto">
              <input
                className="input"
                value={modal.concepto}
                onChange={(e) =>
                  setModal({ ...modal, concepto: e.target.value })
                }
                placeholder="Pasajes, Alojamiento, Comida…"
              />
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
              <Field label="Presupuesto">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.presupuesto}
                  onChange={(e) =>
                    setModal({ ...modal, presupuesto: e.target.value })
                  }
                />
              </Field>
              <Field label="Gastado">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.gastado}
                  onChange={(e) =>
                    setModal({ ...modal, gastado: e.target.value })
                  }
                />
              </Field>
            </div>
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
                {saving ? "Guardando…" : "Guardar"}
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
