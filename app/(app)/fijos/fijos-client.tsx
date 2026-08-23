"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, RefreshCcw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import Modal from "@/components/modal";
import { CATS_GASTO } from "@/lib/constants";
import { fixedArs } from "@/lib/calc";
import { fmtARS, fmtUSD2 } from "@/lib/format";
import { iconForCategory } from "@/lib/mov-icons";
import type { Fijo, Moneda } from "@/types/database";

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
  const { toast } = useToast();

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
    if (!modal.concepto.trim()) return toast("Falta el concepto", "error");
    if (!Number.isFinite(monto) || monto < 0)
      return toast("Monto inválido", "error");
    if (!Number.isFinite(dia) || dia < 1 || dia > 31)
      return toast("Día debe estar entre 1 y 31", "error");
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
    if (!confirm(`¿Borrar "${f.concepto}"?`)) return;
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

  return (
    <>
      <PageHeader
        title="Gastos fijos"
        subtitle={`compromiso mensual estimado · ${fmtARS.format(totalArs)}`}
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            <Plus size={16} /> Nuevo fijo
          </button>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={RefreshCcw}
            title="Todavía no cargaste fijos"
            description="Alquiler, expensas, servicios, suscripciones… todo lo que se repite mes a mes."
            action={
              <button className="btn btn-primary" onClick={() => setModal(empty)}>
                <Plus size={16} /> Nuevo fijo
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="card sm:hidden">
            {rows.map((r) => {
              const Icon = iconForCategory(r.cat, "Gasto");
              return (
                <button
                  key={r.id}
                  className="data-row w-full text-left active:opacity-70"
                  onClick={() => openEdit(r)}
                  type="button"
                >
                  <div
                    className="data-row-icon"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink-soft)",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="data-row-body">
                    <div className="data-row-title">{r.concepto}</div>
                    <div className="data-row-sub">
                      día {r.dia} · {r.cat}
                    </div>
                  </div>
                  <div className="data-row-amount">
                    {r.mon === "USD"
                      ? fmtUSD2.format(r.monto)
                      : fmtARS.format(r.monto)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="card overflow-x-auto hidden sm:block">
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
                {rows.map((r) => {
                  const Icon = iconForCategory(r.cat, "Gasto");
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="px-3 py-2 mono">{r.dia}</td>
                      <td className="px-3 py-2 font-medium">{r.concepto}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2" style={{ color: "var(--ink-soft)" }}>
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
                        <IconBtn onClick={() => openEdit(r)} label="Editar">
                          <Pencil size={15} />
                        </IconBtn>
                        <IconBtn onClick={() => remove(r)} label="Borrar" danger>
                          <Trash2 size={15} />
                        </IconBtn>
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
        title={modal?.id ? "Editar fijo" : "Nuevo fijo"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Field label="Concepto">
              <input
                className="input"
                value={modal.concepto}
                onChange={(e) =>
                  setModal({ ...modal, concepto: e.target.value })
                }
              />
            </Field>
            <Field label="Categoría">
              <select
                className="input"
                value={modal.cat}
                onChange={(e) => setModal({ ...modal, cat: e.target.value })}
              >
                {CATS_GASTO.map((c) => (
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
              <Field label="Monto">
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

function IconBtn({
  children,
  onClick,
  label,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-1.5 rounded-md ml-1 transition"
      style={{ color: danger ? "var(--neg)" : "var(--ink-soft)" }}
    >
      {children}
    </button>
  );
}
