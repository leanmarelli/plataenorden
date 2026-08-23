"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Target } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
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
  const { toast } = useToast();
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
    if (!modal.nombre.trim()) return toast("Falta el nombre", "error");
    if (!Number.isFinite(objetivo) || objetivo <= 0)
      return toast("Objetivo debe ser mayor a 0", "error");
    if (!Number.isFinite(ahorrado) || ahorrado < 0)
      return toast("Ahorrado inválido", "error");
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
      if (error) return toast(error.message, "error");
      setRows((rs) => rs.map((r) => (r.id === modal.id ? (data as Meta) : r)));
      toast("Meta actualizada", "success");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return toast("Sesión expirada", "error");
      }
      const { data, error } = await supabase
        .from("metas")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      setRows((rs) => [...rs, data as Meta]);
      toast("Meta agregada", "success");
    }
    setModal(null);
    router.refresh();
  }

  async function remove(m: Meta) {
    if (!confirm(`¿Borrar "${m.nombre}"?`)) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== m.id));
    const { error } = await supabase.from("metas").delete().eq("id", m.id);
    if (error) {
      toast(error.message, "error");
      setRows(prev);
    } else {
      toast("Meta borrada", "success");
    }
  }

  return (
    <>
      <PageHeader
        title="Metas de ahorro"
        subtitle="objetivos y progreso"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            <Plus size={16} /> Nueva meta
          </button>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Target}
            title="Sin metas todavía"
            description="Definí tus objetivos de ahorro y vas viendo cómo avanzás mes a mes."
            action={
              <button className="btn btn-primary" onClick={() => setModal(empty)}>
                <Plus size={16} /> Nueva meta
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => {
            const p = m.objetivo > 0 ? Math.min(1, m.ahorrado / m.objetivo) : 0;
            const fmt = m.mon === "USD" ? fmtUSD2.format : fmtARS.format;
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold flex-1">{m.nombre}</div>
                  <button
                    onClick={() => openEdit(m)}
                    aria-label="Editar"
                    className="p-1 rounded"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(m)}
                    aria-label="Borrar"
                    className="p-1 rounded"
                    style={{ color: "var(--neg)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div
                  className="text-xs mb-2"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {m.mon} · objetivo {fmt(m.objetivo)}
                  {m.fecha && <> · para {m.fecha}</>}
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
                <div
                  className="text-xs mt-2"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {pct(p)} — {fmt(m.ahorrado)} de {fmt(m.objetivo)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar meta" : "Nueva meta"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Field label="Nombre">
              <input
                className="input"
                value={modal.nombre}
                onChange={(e) => setModal({ ...modal, nombre: e.target.value })}
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
              <Field label="Objetivo">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.objetivo}
                  onChange={(e) =>
                    setModal({ ...modal, objetivo: e.target.value })
                  }
                />
              </Field>
              <Field label="Ahorrado">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.ahorrado}
                  onChange={(e) =>
                    setModal({ ...modal, ahorrado: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Fecha objetivo (opcional)">
              <input
                className="input"
                type="date"
                value={modal.fecha}
                onChange={(e) => setModal({ ...modal, fecha: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 mt-2">
              <button className="btn" onClick={() => setModal(null)} type="button">
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
