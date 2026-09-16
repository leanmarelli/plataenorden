"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useCategorias } from "./categorias-context";
import { useToast } from "./toast-provider";
import Modal from "./modal";
import type { MovTipo } from "@/types/database";

const NUEVA_MARKER = "__NUEVA__";

/**
 * Select de categoría con opción "+ Nueva…" al final.
 * Merge de categorías hardcoded + custom del usuario.
 */
export default function CategoriaSelect({
  tipo,
  value,
  onChange,
  className,
}: {
  tipo: MovTipo;
  value: string;
  onChange: (cat: string) => void;
  className?: string;
}) {
  const { getCategorias, addCategoria } = useCategorias();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const cats = getCategorias(tipo);

  function onSelectChange(v: string) {
    if (v === NUEVA_MARKER) {
      setDraft("");
      setShowModal(true);
      return;
    }
    onChange(v);
  }

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
    setShowModal(false);
    toast(`Categoría "${created.nombre}" creada`, "success");
  }

  return (
    <>
      <select
        className={className ?? "input"}
        value={value}
        onChange={(e) => onSelectChange(e.target.value)}
      >
        {cats.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option disabled>──────────</option>
        <option value={NUEVA_MARKER}>+ Nueva categoría…</option>
      </select>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
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
              onClick={() => setShowModal(false)}
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
