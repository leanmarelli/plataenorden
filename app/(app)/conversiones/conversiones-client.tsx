"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, ArrowLeftRight, ArrowRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
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
  const { toast } = useToast();
  const confirm = useConfirm();
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
      return toast("Elegí monedas de origen y destino distintas", "error");
    if (!Number.isFinite(md) || md <= 0)
      return toast("Monto de origen inválido", "error");
    if (!Number.isFinite(ma) || ma <= 0)
      return toast("Monto de destino inválido", "error");
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
      if (error) return toast(error.message, "error");
      setRows((rs) =>
        rs.map((r) => (r.id === modal.id ? (data as Conversion) : r)),
      );
      toast("Conversión actualizada", "success");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return toast("Sesión expirada", "error");
      }
      const { data, error } = await supabase
        .from("conversiones")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      setRows((rs) => [data as Conversion, ...rs]);
      toast("Conversión agregada", "success");
    }
    setModal(null);
    router.refresh();
  }

  async function remove(c: Conversion) {
    const ok = await confirm({
      title: "Borrar conversión",
      description: "¿Seguro que querés borrar esta conversión?",
      confirmText: "Borrar",
      danger: true,
    });
    if (!ok) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== c.id));
    const { error } = await supabase
      .from("conversiones")
      .delete()
      .eq("id", c.id);
    if (error) {
      toast(error.message, "error");
      setRows(prev);
    } else {
      toast("Conversión borrada", "success");
    }
  }

  function fmt(mon: Moneda, val: number) {
    return mon === "USD" ? fmtUSD2.format(val) : fmtARS.format(val);
  }

  function implicitTc(c: Conversion) {
    return c.de === "ARS" ? c.monto_de / c.monto_a : c.monto_a / c.monto_de;
  }

  return (
    <>
      <PageHeader
        title="Conversiones"
        subtitle="compra/venta de dólares y otros cambios"
        action={
          <button className="btn btn-primary" onClick={() => setModal(empty)}>
            <Plus size={16} /> Nueva
          </button>
        }
      />

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ArrowLeftRight}
            title="Sin conversiones cargadas"
            description="Anotá cada compra/venta de dólares y guardá el tipo de cambio implícito."
            action={
              <button className="btn btn-primary" onClick={() => setModal(empty)}>
                <Plus size={16} /> Nueva conversión
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="card sm:hidden">
            {rows.map((r) => {
              const tc = implicitTc(r);
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
                      background: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    <ArrowLeftRight size={18} />
                  </div>
                  <div className="data-row-body">
                    <div className="data-row-title flex items-center gap-1.5">
                      <span className="mono">{fmt(r.de, r.monto_de)}</span>
                      <ArrowRight size={12} style={{ color: "var(--ink-faint)" }} />
                      <span className="mono">{fmt(r.a, r.monto_a)}</span>
                    </div>
                    <div className="data-row-sub">
                      {r.fecha} · TC {fmtNum.format(tc)}
                    </div>
                  </div>
                </button>
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
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">De</th>
                  <th className="text-right px-3 py-2">Monto origen</th>
                  <th className="text-left px-3 py-2">A</th>
                  <th className="text-right px-3 py-2">Monto destino</th>
                  <th className="text-right px-3 py-2">TC implícito</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                      {fmtNum.format(implicitTc(r))}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar conversión" : "Nueva conversión"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Field label="Fecha">
              <input
                className="input"
                type="date"
                value={modal.fecha}
                onChange={(e) => setModal({ ...modal, fecha: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="De">
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
              </Field>
              <Field label="Monto origen">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.monto_de}
                  onChange={(e) =>
                    setModal({ ...modal, monto_de: e.target.value })
                  }
                />
              </Field>
              <Field label="A">
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
              </Field>
              <Field label="Monto destino">
                <input
                  className="input mono"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={modal.monto_a}
                  onChange={(e) =>
                    setModal({ ...modal, monto_a: e.target.value })
                  }
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
