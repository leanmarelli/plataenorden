"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const DRAG_CLOSE_THRESHOLD = 100;

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
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const isMobile = useIsMobile();

  // Escape + bloquear scroll del body
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setMounted(true), 10);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      setMounted(false);
      setDragY(0);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Handlers de drag — solo activos en mobile
  function onTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  const sheetTransform = mounted
    ? `translateY(${dragY}px)`
    : "translateY(28px)";

  // Opacidad del overlay disminuye a medida que arrastrás
  const dragProgress = Math.min(1, dragY / 300);
  const overlayOpacity = mounted ? 1 - dragProgress * 0.6 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4"
      style={{
        background: `rgba(0,0,0,${0.5 * overlayOpacity})`,
        transition: dragging.current ? "none" : "background 0.2s",
      }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg card overflow-hidden flex flex-col"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: isMobile ? 0 : 20,
          borderBottomRightRadius: isMobile ? 0 : 20,
          transform: sheetTransform,
          transition: dragging.current
            ? "none"
            : "transform 0.22s cubic-bezier(.2,.7,.3,1)",
          maxHeight: isMobile ? "88dvh" : "calc(100dvh - 24px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle superior: drag zone en mobile */}
        <div
          className="sm:hidden pt-2 pb-1 grid place-items-center touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <span
            className="block rounded-full transition-colors"
            style={{
              width: 44,
              height: 5,
              background: dragging.current
                ? "var(--ink-soft)"
                : "var(--line)",
            }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 pt-2 pb-3 sm:pt-5"
          style={{ borderBottom: "1px solid var(--line)" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
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
        <div
          className="px-5 py-4 overflow-y-auto flex-1"
          style={{
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Devuelve true si el viewport es menor que el breakpoint `sm` de Tailwind (640px). */
function useIsMobile() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIs(mq.matches);
    const on = (e: MediaQueryListEvent) => setIs(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return is;
}
