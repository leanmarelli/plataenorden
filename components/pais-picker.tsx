"use client";

import { useMemo, useState } from "react";
import { PAISES } from "@/lib/paises";

export default function PaisPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PAISES;
    return PAISES.filter(
      (p) => p.nombre.toLowerCase().includes(s) || p.emoji === q,
    );
  }, [q]);

  return (
    <div>
      <input
        className="input mb-2"
        placeholder="Buscar país…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div
        className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[220px] overflow-y-auto p-1 rounded-lg"
        style={{ background: "var(--surface-2)" }}
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Sin país"
          title="Sin país"
          className="grid place-items-center rounded transition"
          style={{
            width: 40,
            height: 40,
            background: value === null ? "var(--accent)" : "transparent",
            color: value === null ? "white" : "var(--ink-soft)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          —
        </button>
        {filtrados.map((p) => (
          <button
            key={p.emoji}
            type="button"
            onClick={() => onChange(p.emoji)}
            title={p.nombre}
            aria-label={p.nombre}
            className="grid place-items-center rounded transition text-2xl"
            style={{
              width: 40,
              height: 40,
              background:
                value === p.emoji ? "var(--accent-soft)" : "transparent",
              boxShadow:
                value === p.emoji
                  ? "inset 0 0 0 2px var(--accent)"
                  : "none",
            }}
          >
            {p.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
