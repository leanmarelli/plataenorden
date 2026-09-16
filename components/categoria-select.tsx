"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useCategorias } from "./categorias-context";
import { useToast } from "./toast-provider";
import Modal from "./modal";
import { colorForCategory, iconForCategory } from "@/lib/mov-icons";
import type { MovTipo } from "@/types/database";

/**
 * Selector visual de categoría — se ve como los items de "Gastos por
 * categoría" (ícono en su color + nombre). Al tocarlo, abre un bottom
 * sheet con la lista completa y la opción de crear una nueva.
 */
export default function CategoriaSelect({
  tipo,
  value,
  onChange,
}: {
  tipo: MovTipo;
  value: string;
  onChange: (cat: string) => void;
}) {
  const { getCategorias, addCategoria } = useCategorias();
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const cats = getCategorias(tipo);
  const ActiveIcon = iconForCategory(value, tipo);
  const activeColor = colorForCategory(value, cats);

  async function saveNueva() {
    setSaving(true);
    const created = await addCategoria(draft, tipo);
    setSaving(false);
    if (!created) {
      toast(
        `Ya existe una categoría "${draft.trim()}" o el nombre está vacío.`,
        "error",
      );
      return;
    }
    onChange(created.nombre);
    setShowCreate(false);
    setShowPicker(false);
    setDraft("");
    toast(`Categoría "${created.nombre}" creada`, "success");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="input flex items-center gap-2 text-left"
        style={{ paddingRight: 34 }}
      >
        <span
          className="grid place-items-center rounded-lg shrink-0"
          style={{
            width: 28,
            height: 28,
            background: `color-mix(in srgb, ${activeColor} 18%, transparent)`,
            color: activeColor,
          }}
        >
          <ActiveIcon size={15} />
        </span>
        <span className="flex-1 truncate">{value}</span>
        <ChevronDown
          size={16}
          style={{ color: "var(--ink-soft)", marginRight: -22 }}
        />
      </button>

      <Modal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        title="Elegir categoría"
      >
        <div className="flex flex-col">
          {cats.map((c) => {
            const Icon = iconForCategory(c, tipo);
            const color = colorForCategory(c, cats);
            const active = c === value;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setShowPicker(false);
                }}
                className="flex items-center gap-3 py-2.5 text-left transition"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <span
                  className="grid place-items-center rounded-lg shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color,
                  }}
                >
                  <Icon size={16} />
                </span>
                <span
                  className="flex-1 truncate text-sm"
                  style={{
                    color: active ? "var(--accent-ink)" : "var(--ink)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {c}
                </span>
                {active && (
                  <Check size={16} style={{ color: "var(--accent)" }} />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setDraft("");
              setShowCreate(true);
            }}
            className="flex items-center gap-3 py-2.5 text-left"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <span
              className="grid place-items-center rounded-lg shrink-0"
              style={{
                width: 36,
                height: 36,
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              <Plus size={16} />
            </span>
            <span
              className="flex-1 text-sm font-medium"
              style={{ color: "var(--accent-ink)" }}
            >
              Nueva categoría…
            </span>
          </button>
        </div>
      </Modal>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva categoría"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Se guarda para tu cuenta y aparece en el listado de{" "}
            <strong>{tipo.toLowerCase()}s</strong>.
          </p>
          <label className="flex flex-col">
            <span className="label">Nombre</span>
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ej. Peluquería, Mascotas…"
              autoFocus
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) saveNueva();
              }}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              className="btn"
              onClick={() => setShowCreate(false)}
              type="button"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={saveNueva}
              disabled={saving || !draft.trim()}
              type="button"
            >
              <Plus size={14} /> {saving ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
