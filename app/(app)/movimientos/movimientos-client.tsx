"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Receipt, Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/settings-context";
import { useToast } from "@/components/toast-provider";
import PageHeader from "@/components/page-header";
import EmptyState from "@/components/empty-state";
import MovimientoDialog, {
  emptyMovForm,
  movFormFrom,
  type MovForm,
} from "@/components/movimiento-dialog";
import { iconForCategory } from "@/lib/mov-icons";
import { fmtARS, fmtUSD2, labelMes } from "@/lib/format";
import type { Movimiento, MovTipo } from "@/types/database";

export default function MovimientosClient({
  initial,
}: {
  initial: Movimiento[];
}) {
  const router = useRouter();
  const { settings } = useSettings();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [rows, setRows] = useState<Movimiento[]>(initial);
  const [filtro, setFiltro] = useState<"" | MovTipo>("");
  const [busq, setBusq] = useState("");
  const [form, setForm] = useState<MovForm | null>(null);

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
    setForm(
      emptyMovForm(new Date().toISOString().slice(0, 10), settings.tc_ref),
    );
  }
  function openEdit(r: Movimiento) {
    setForm(movFormFrom(r, settings.tc_ref));
  }

  async function remove(r: Movimiento) {
    if (!confirm(`¿Borrar "${r.cat}${r.descripcion ? " · " + r.descripcion : ""}"?`))
      return;
    const prev = rows;
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    const { error } = await supabase.from("movimientos").delete().eq("id", r.id);
    if (error) {
      toast("No se pudo borrar: " + error.message, "error");
      setRows(prev);
    } else {
      toast("Movimiento borrado", "success");
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle={`${labelMes(settings.mes)} · ${shown.length} resultado${shown.length === 1 ? "" : "s"}`}
        action={
          <button className="btn btn-primary hidden sm:inline-flex" onClick={openNew}>
            <Plus size={16} /> Nuevo
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div
          className="flex items-center gap-2 input"
          style={{ padding: "0 12px", flex: "1 1 240px", minWidth: 180 }}
        >
          <Search size={16} style={{ color: "var(--ink-faint)" }} />
          <input
            type="search"
            placeholder="Buscar…"
            value={busq}
            onChange={(e) => setBusq(e.target.value)}
            className="w-full bg-transparent border-0 outline-none py-2"
            style={{ color: "var(--ink)" }}
          />
        </div>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Todos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Gasto">Gastos</option>
          <option value="Ahorro">Ahorro</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title={busq || filtro ? "Sin resultados" : "Sin movimientos este mes"}
            description={
              busq || filtro
                ? "Probá cambiando los filtros."
                : "Cargá tu primer movimiento del mes con el botón +."
            }
            action={
              !busq && !filtro ? (
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={16} /> Nuevo movimiento
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          {/* Vista mobile: cards */}
          <div className="card sm:hidden">
            {shown.map((r) => (
              <MovRowMobile
                key={r.id}
                row={r}
                onEdit={() => openEdit(r)}
                onDelete={() => remove(r)}
              />
            ))}
          </div>

          {/* Vista desktop: tabla */}
          <div className="card overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "var(--ink-faint)" }}
                >
                  <Th>Fecha</Th>
                  <Th>Categoría</Th>
                  <Th>Descripción</Th>
                  <Th className="text-right">Monto</Th>
                  <Th>Medio</Th>
                  <Th>Estado</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <MovRowDesktop
                    key={r.id}
                    row={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => remove(r)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <MovimientoDialog
        form={form}
        onClose={() => setForm(null)}
        onSaved={(saved) => {
          setRows((rs) => {
            const exists = rs.some((r) => r.id === saved.id);
            if (exists) return rs.map((r) => (r.id === saved.id ? saved : r));
            return [saved, ...rs];
          });
        }}
      />
    </>
  );
}

function MovRowMobile({
  row,
  onEdit,
  onDelete,
}: {
  row: Movimiento;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = iconForCategory(row.cat, row.tipo);
  const color =
    row.tipo === "Ingreso"
      ? { bg: "var(--pos-soft)", fg: "var(--pos)" }
      : row.tipo === "Ahorro"
        ? { bg: "var(--accent-soft)", fg: "var(--accent-ink)" }
        : { bg: "var(--neg-soft)", fg: "var(--neg)" };
  const monto =
    row.mon === "USD" ? fmtUSD2.format(row.monto) : fmtARS.format(row.monto);
  return (
    <button
      className="data-row w-full text-left active:opacity-70"
      onClick={onEdit}
      onContextMenu={(e) => {
        e.preventDefault();
        onDelete();
      }}
      type="button"
    >
      <div
        className="data-row-icon"
        style={{ background: color.bg, color: color.fg }}
      >
        <Icon size={18} />
      </div>
      <div className="data-row-body">
        <div className="data-row-title">
          {row.descripcion || row.cat}
        </div>
        <div className="data-row-sub">
          {row.cat} · {row.fecha.slice(8)}/{row.fecha.slice(5, 7)}
          {row.estado === "Pendiente" && (
            <span
              className="ml-1.5 text-[10px] uppercase font-semibold"
              style={{ color: "var(--warn)" }}
            >
              · pendiente
            </span>
          )}
        </div>
      </div>
      <div className="data-row-amount" style={{ color: color.fg }}>
        {row.tipo === "Ingreso" ? "+" : ""}
        {monto}
      </div>
    </button>
  );
}

function MovRowDesktop({
  row,
  onEdit,
  onDelete,
}: {
  row: Movimiento;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = iconForCategory(row.cat, row.tipo);
  const color =
    row.tipo === "Ingreso"
      ? { fg: "var(--pos)" }
      : row.tipo === "Ahorro"
        ? { fg: "var(--accent-ink)" }
        : { fg: "var(--neg)" };
  return (
    <tr style={{ borderTop: "1px solid var(--line)" }}>
      <Td className="mono whitespace-nowrap">{row.fecha}</Td>
      <Td>
        <span className="inline-flex items-center gap-2">
          <Icon size={14} style={{ color: color.fg }} />
          {row.cat}
        </span>
      </Td>
      <Td className="max-w-[260px] truncate">{row.descripcion}</Td>
      <Td
        className="mono text-right whitespace-nowrap font-medium"
        style={{ color: color.fg }}
      >
        {row.tipo === "Ingreso" ? "+" : ""}
        {row.mon === "USD" ? fmtUSD2.format(row.monto) : fmtARS.format(row.monto)}
      </Td>
      <Td className="whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
        {row.medio}
      </Td>
      <Td>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background:
              row.estado === "Confirmado"
                ? "var(--pos-soft)"
                : "var(--warn-soft)",
            color: row.estado === "Confirmado" ? "var(--pos)" : "var(--warn)",
          }}
        >
          {row.estado}
        </span>
      </Td>
      <Td className="text-right whitespace-nowrap">
        <button
          onClick={onEdit}
          aria-label="Editar"
          className="p-1.5 rounded-md hover:bg-[var(--surface-2)]"
          style={{ color: "var(--ink-soft)" }}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Borrar"
          className="p-1.5 rounded-md hover:bg-[var(--neg-soft)] ml-1"
          style={{ color: "var(--neg)" }}
        >
          <Trash2 size={15} />
        </button>
      </Td>
    </tr>
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
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={`px-3 py-2 align-middle ${className}`} style={style}>
      {children}
    </td>
  );
}
