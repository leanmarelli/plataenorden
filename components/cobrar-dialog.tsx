"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Split } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import Modal from "@/components/modal";
import { fmtARS, fmtUSD2 } from "@/lib/format";
import type { Movimiento } from "@/types/database";

type Modo = "total" | "parcial";

/**
 * Modal para marcar un movimiento Pendiente como cobrado.
 *
 * - Cobro total: el movimiento pasa a Confirmado con el mismo monto.
 * - Cobro parcial: se crea un movimiento nuevo Confirmado con el monto que
 *   entró y el original queda Pendiente con el monto restante. Así queda
 *   registro de cuánto se cobró y cuánto falta.
 */
export default function CobrarDialog({
  mov,
  onClose,
  onDone,
}: {
  mov: Movimiento | null;
  onClose: () => void;
  onDone?: (rows: { updated?: Movimiento; created?: Movimiento }) => void;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [modo, setModo] = useState<Modo>("total");
  const [monto, setMonto] = useState("");
  const [saving, setSaving] = useState(false);

  if (!mov) return null;

  const fmt = mov.mon === "USD" ? fmtUSD2.format : fmtARS.format;

  async function submit() {
    if (!mov) return;
    setSaving(true);

    if (modo === "total") {
      const { data, error } = await supabase
        .from("movimientos")
        .update({ estado: "Confirmado" })
        .eq("id", mov.id)
        .select()
        .single();
      setSaving(false);
      if (error) return toast(error.message, "error");
      onDone?.({ updated: data as Movimiento });
      toast(`Cobrado ${fmt(mov.monto)}`, "success");
      onClose();
      router.refresh();
      return;
    }

    // Parcial: crear nuevo Confirmado con el monto cobrado, dejar el original
    // con lo que resta.
    const cobrado = Number(monto);
    if (!Number.isFinite(cobrado) || cobrado <= 0) {
      setSaving(false);
      return toast("Ingresá un monto válido", "error");
    }
    if (cobrado >= mov.monto) {
      setSaving(false);
      return toast(
        `El monto es igual o mayor que el pendiente (${fmt(mov.monto)}). Usá "Cobro total".`,
        "error",
      );
    }

    const resto = mov.monto - cobrado;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return toast("Sesión expirada", "error");
    }

    // Crear el confirmado
    const { data: nuevo, error: errNuevo } = await supabase
      .from("movimientos")
      .insert({
        user_id: user.id,
        fecha: new Date().toISOString().slice(0, 10),
        tipo: mov.tipo,
        cat: mov.cat,
        descripcion:
          (mov.descripcion ? mov.descripcion + " — " : "") + "cobro parcial",
        mon: mov.mon,
        monto: cobrado,
        tc: mov.tc,
        medio: mov.medio,
        fv: mov.fv,
        estado: "Confirmado",
        from_fijo: mov.from_fijo,
      })
      .select()
      .single();
    if (errNuevo) {
      setSaving(false);
      return toast(errNuevo.message, "error");
    }

    // Reducir el original
    const { data: reducido, error: errUpd } = await supabase
      .from("movimientos")
      .update({ monto: resto })
      .eq("id", mov.id)
      .select()
      .single();
    setSaving(false);
    if (errUpd) return toast(errUpd.message, "error");

    onDone?.({
      updated: reducido as Movimiento,
      created: nuevo as Movimiento,
    });
    toast(
      `Cobrado ${fmt(cobrado)}, quedan pendientes ${fmt(resto)}`,
      "success",
    );
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={!!mov}
      onClose={onClose}
      title={`Cobrar "${mov.descripcion || mov.cat}"`}
    >
      <div className="flex flex-col gap-4">
        <div
          className="rounded-xl px-4 py-3 flex items-baseline justify-between"
          style={{ background: "var(--surface-2)" }}
        >
          <span className="text-sm" style={{ color: "var(--ink-faint)" }}>
            Pendiente
          </span>
          <span
            className="mono text-lg font-bold"
            style={{ color: "var(--warn)" }}
          >
            {fmt(mov.monto)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <OptionCard
            active={modo === "total"}
            onClick={() => setModo("total")}
            icon={<CheckCircle2 size={20} />}
            title="Cobro total"
            subtitle={`Se cobra todo (${fmt(mov.monto)})`}
          />
          <OptionCard
            active={modo === "parcial"}
            onClick={() => setModo("parcial")}
            icon={<Split size={20} />}
            title="Cobro parcial"
            subtitle="Se cobra un monto; el resto queda pendiente"
          />
        </div>

        {modo === "parcial" && (
          <label className="flex flex-col">
            <span className="label">Monto cobrado ({mov.mon})</span>
            <input
              className="input mono"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              autoFocus
            />
            {monto && Number.isFinite(Number(monto)) && Number(monto) > 0 && Number(monto) < mov.monto && (
              <span
                className="text-xs mt-2"
                style={{ color: "var(--ink-faint)" }}
              >
                Quedarían pendientes {fmt(mov.monto - Number(monto))}
              </span>
            )}
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving || (modo === "parcial" && !monto)}
            type="button"
          >
            {saving ? "Confirmando…" : "Confirmar cobro"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function OptionCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-3 rounded-xl text-left transition"
      style={{
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        color: active ? "var(--accent-ink)" : "var(--ink)",
      }}
    >
      <div
        className="mb-1.5"
        style={{ color: active ? "var(--accent)" : "var(--ink-soft)" }}
      >
        {icon}
      </div>
      <div className="text-sm font-semibold mb-0.5">{title}</div>
      <div
        className="text-xs"
        style={{ color: active ? "var(--accent-ink)" : "var(--ink-faint)" }}
      >
        {subtitle}
      </div>
    </button>
  );
}
