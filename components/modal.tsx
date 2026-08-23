"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // Escape para cerrar + bloquear scroll del body
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // trigger enter animation
    const t = setTimeout(() => setMounted(true), 10);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      setMounted(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4 transition-opacity"
      style={{
        background: "rgba(0,0,0,.5)",
        opacity: mounted ? 1 : 0,
      }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg card overflow-hidden transition-transform"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          transform: mounted
            ? "translateY(0)"
            : "translateY(24px)",
          maxHeight: "calc(100dvh - 24px)",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle superior (visible en mobile) */}
        <div className="sm:hidden pt-2 pb-1 grid place-items-center">
          <span
            className="block rounded-full"
            style={{ width: 44, height: 5, background: "var(--line)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 pt-3 pb-2 sm:pt-5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2 className="text-base sm:text-lg font-serif font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid place-items-center rounded-lg"
            style={{
              width: 34,
              height: 34,
              color: "var(--ink-soft)",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
