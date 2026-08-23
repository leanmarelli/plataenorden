"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PageHeader from "@/components/page-header";
import Modal from "@/components/modal";
import type { Meta, Moneda } from "@/types/database";
import { fmtARS, fmtUSD2, pct } from "@/lib/format";

type Form = {
  id: string | null;
  nombre: string;
  mon: Moneda;
  objetivo: string;
  ahorrado: string;
  fecha: string;
};

const empty: Form = {
  id: null,
  nombre: "",
  mon: "USD",
  objetivo: "",
  ahorrado: "0",
  fecha: "",
};

export default function MetasClient({ initial }: { initial: Meta[] }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Meta[]>(initial);
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit(m: Meta) {
    setModal({
      id: m.id,
      nombre: m.nombre,
      mon: m.mon,
      objetivo: String(m.objetivo),
      ahorrado: String(m.ahorrado),
      fecha: m.fecha ?? "",
    });
  }

  async function save() {
    if (!modal) return;
    const objetivo = Number(modal.objetivo);
    const ahorrado = Number(modal.ahorrado);
    if (!modal.nombre.trim()) return alert("Falta el nombre");
    if (!Number.isFinite(objetivo) || objetivo <= 0)
      return alert("Objetivo debe ser mayor a 0");
    if (!Number.isFinite(ahorrado) || ahorrado < 0)
      return alert("Ahorrado inválido");
    setSaving(true);
    const payload = {
      nombre: modal.nombre,
      mon: modal.mon,
      objetivo,
      ahorrado,
      fecha: modal.fecha || null,
    };
    if (modal.id) {
      const { data, error } = await supabase
        .from("metas")
        .update(payload)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Meta) : r)));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return alert("Sesión expirada");
      const { data, error } = await supabase
        .from("metas")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return alert(error.message);
      setRows((rs) => [...rs, data as Meta]);
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta meta?")) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (error) {
      alert(error.message);
      setRows(prev);
    }
  }

  return (
    <>
      <PageHeader
        title="Metas de ahorro"
        subtitle="objetivos y progreso"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            + Nueva meta
          </button>
        }
      />
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <div
            className="card p-6 text-center col-span-full"
            style={{ color: "var(--ink-faint)" }}
          >
            Todavía no cargaste metas.
          </div>
        )}
        {rows.map((m) => {
          const p = m.objetivo > 0 ? Math.min(1, m.ahorrado / m.objetivo) : 0;
          const fmt = m.mon === "USD" ? fmtUSD2.format : fmtARS.format;
          return (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-semibold">{m.nombre}</div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => openEdit(m)}
                    style={{ color: "var(--accent)" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    style={{ color: "var(--neg)" }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
              <div className="text-xs mb-2" style={{ color: "var(--ink-faint)" }}>
                {m.mon} · objetivo {fmt(m.objetivo)}
                {m.fecha && <> · para {m.fecha}</>}
              </div>
              <div
                className="w-full rounded-full h-2 overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${p * 100}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--ink-soft)" }}>
                {pct(p)} — {fmt(m.ahorrado)} de {fmt(m.objetivo)}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar meta" : "Nueva meta"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col">
              <span className="label">Nombre</span>
              <input
                className="input"
                value={modal.nombre}
                onChange={(e) =>
                  setModal({ ...modal, nombre: e.target.value })
                }
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
                <span className="label">Objetivo</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.objetivo}
                  onChange={(e) =>
                    setModal({ ...modal, objetivo: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col">
                <span className="label">Ahorrado</span>
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step="0.01"
                  value={modal.ahorrado}
                  onChange={(e) =>
                    setModal({ ...modal, ahorrado: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="flex flex-col">
              <span className="label">Fecha objetivo (opcional)</span>
              <input
                className="input"
                type="date"
                value={modal.fecha}
                onChange={(e) => setModal({ ...modal, fecha: e.target.value })}
              />
            </label>
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
