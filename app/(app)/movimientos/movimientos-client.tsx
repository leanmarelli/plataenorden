"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-context";
import PageHeader from "@/components/page-header";
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
import { fmtARS, fmtUSD2 } from "@/lib/format";

type FormState = {
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

function emptyForm(fecha: string, tc: number): FormState {
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

function catsFor(tipo: MovTipo): readonly string[] {
  if (tipo === "Ingreso") return CATS_INGRESO;
  if (tipo === "Ahorro") return CATS_AHORRO;
  return CATS_GASTO;
}

export default function MovimientosClient({
  initial,
}: {
  initial: Movimiento[];
}) {
  const router = useRouter();
  const { settings } = useSettings();
  const supabase = createSupabaseBrowserClient();

  const [rows, setRows] = useState<Movimiento[]>(initial);
  const [filtro, setFiltro] = useState<"" | MovTipo>("");
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState<null | FormState>(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const b = busq.trim().toLowerCase();
    return rows
      .filter((r) => r.fecha.slice(0, 7) === settings.mes)
      .filter((r) => (filtro ? r.tipo === filtro : true))
      .filter((r) =>
        b
          ? [r.cat, r.descripcion ?? "", r.medio ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(b)
          : true,
      );
  }, [rows, filtro, busq, settings.mes]);

  function openNew() {
    setModal(emptyForm(new Date().toISOString().slice(0, 10), settings.tc_ref));
  }

  function openEdit(r: Movimiento) {
    setModal({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      cat: r.cat,
      descripcion: r.descripcion ?? "",
      mon: r.mon,
      monto: String(r.monto),
      tc: r.tc ? String(r.tc) : String(settings.tc_ref),
      medio: r.medio ?? "",
      fv: r.fv,
      estado: r.estado,
    });
  }

  async function save() {
    if (!modal) return;
    const monto = Number(modal.monto);
    if (!Number.isFinite(monto) || monto < 0) {
      alert("Monto inválido");
      return;
    }
    setSaving(true);
    const row = {
      fecha: modal.fecha,
      tipo: modal.tipo,
      cat: modal.cat,
      descripcion: modal.descripcion || null,
      mon: modal.mon,
      monto,
      tc: modal.tc ? Number(modal.tc) : null,
      medio: modal.medio || null,
      fv: modal.fv,
      estado: modal.estado,
    };

    if (modal.id) {
      const { data, error } = await supabase
        .from("movimientos")
        .update(row)
        .eq("id", modal.id)
        .select()
        .single();
      setSaving(false);
      if (error) {
        alert("Error al guardar: " + error.message);
        return;
      }
      setRows((rs) =>
        rs.map((r) => (r.id === modal.id ? (data as Movimiento) : r)),
      );
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        alert("Sesión expirada");
        return;
      }
      const { data, error } = await supabase
        .from("movimientos")
        .insert({ ...row, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (error) {
        alert("Error al guardar: " + error.message);
        return;
      }
      setRows((rs) => [data as Movimiento, ...rs]);
    }
    setModal(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este movimiento?")) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const { error } = await supabase.from("movimientos").delete().eq("id", id);
    if (error) {
      alert("No se pudo borrar: " + error.message);
      setRows(prev);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle={`del mes ${settings.mes} · ${shown.length} resultado(s)`}
        action={
          <button className="btn btn-primary" onClick={openNew}>
            + Nuevo
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Todos los tipos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Gasto">Gastos</option>
          <option value="Ahorro">Ahorro</option>
        </select>
        <input
          type="search"
          placeholder="Buscar por categoría, descripción o medio…"
          value={busq}
          onChange={(e) => setBusq(e.target.value)}
          className="input"
          style={{ minWidth: 260, flex: 1 }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--ink-faint)" }}
            >
              <Th>Fecha</Th>
              <Th>Tipo</Th>
              <Th>Categoría</Th>
              <Th>Descripción</Th>
              <Th className="text-right">Monto</Th>
              <Th>Medio</Th>
              <Th>Estado</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Sin movimientos en este mes.
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr
                key={r.id}
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <Td className="mono whitespace-nowrap">{r.fecha}</Td>
                <Td>
                  <TipoBadge tipo={r.tipo} />
                </Td>
                <Td>{r.cat}</Td>
                <Td className="max-w-[240px] truncate">{r.descripcion}</Td>
                <Td className="mono text-right whitespace-nowrap">
                  {r.mon === "USD"
                    ? fmtUSD2.format(r.monto)
                    : fmtARS.format(r.monto)}
                </Td>
                <Td className="whitespace-nowrap">{r.medio}</Td>
                <Td>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        r.estado === "Confirmado"
                          ? "var(--pos-soft)"
                          : "var(--warn-soft)",
                      color:
                        r.estado === "Confirmado"
                          ? "var(--pos)"
                          : "var(--warn)",
                    }}
                  >
                    {r.estado}
                  </span>
                </Td>
                <Td className="text-right whitespace-nowrap">
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
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.id ? "Editar movimiento" : "Nuevo movimiento"}
      >
        {modal && (
          <div className="flex flex-col gap-3">
            <Row>
              <Field label="Fecha">
                <input
                  type="date"
                  className="input"
                  value={modal.fecha}
                  onChange={(e) =>
                    setModal({ ...modal, fecha: e.target.value })
                  }
                />
              </Field>
              <Field label="Tipo">
                <select
                  className="input"
                  value={modal.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as MovTipo;
                    setModal({ ...modal, tipo, cat: catsFor(tipo)[0] });
                  }}
                >
                  <option>Gasto</option>
                  <option>Ingreso</option>
                  <option>Ahorro</option>
                </select>
              </Field>
            </Row>
            <Field label="Categoría">
              <select
                className="input"
                value={modal.cat}
                onChange={(e) => setModal({ ...modal, cat: e.target.value })}
              >
                {catsFor(modal.tipo).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción">
              <input
                className="input"
                value={modal.descripcion}
                onChange={(e) =>
                  setModal({ ...modal, descripcion: e.target.value })
                }
                placeholder="ej. sueldo agosto, alquiler depto…"
              />
            </Field>
            <Row>
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
                  min={0}
                  step="0.01"
                  value={modal.monto}
                  onChange={(e) =>
                    setModal({ ...modal, monto: e.target.value })
                  }
                />
              </Field>
              <Field label="TC (ARS por USD)">
                <input
                  className="input mono"
                  type="number"
                  min={0}
                  step={1}
                  value={modal.tc}
                  onChange={(e) => setModal({ ...modal, tc: e.target.value })}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Medio">
                <select
                  className="input"
                  value={modal.medio}
                  onChange={(e) =>
                    setModal({ ...modal, medio: e.target.value })
                  }
                >
                  {MEDIOS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fijo / Variable">
                <select
                  className="input"
                  value={modal.fv}
                  onChange={(e) =>
                    setModal({ ...modal, fv: e.target.value as FijoVar })
                  }
                >
                  <option>Variable</option>
                  <option>Fijo</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  className="input"
                  value={modal.estado}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      estado: e.target.value as MovEstado,
                    })
                  }
                >
                  <option>Confirmado</option>
                  <option>Pendiente</option>
                </select>
              </Field>
            </Row>

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

function TipoBadge({ tipo }: { tipo: MovTipo }) {
  const map = {
    Ingreso: { bg: "var(--pos-soft)", fg: "var(--pos)" },
    Gasto: { bg: "var(--neg-soft)", fg: "var(--neg)" },
    Ahorro: { bg: "var(--accent-soft)", fg: "var(--accent-ink)" },
  } as const;
  const s = map[tipo];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.fg }}
    >
      {tipo}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`text-left px-3 py-2 font-semibold ${className}`}>
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 grid-cols-2 md:grid-cols-3">{children}</div>;
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
