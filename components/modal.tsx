"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const DRAG_CLOSE_THRESHOLD = 100;

/**
 * Bottom sheet / modal. Se monta en un Portal al <body> para evitar
 * problemas de stacking y para que iOS no lo asocie con ningún scroll
 * container del árbol de React.
 *
 * Contrato de gestos:
 * - Backdrop y sheet: touch-action:none (iOS nunca inicia pan/zoom desde
 *   ahí, así nada rebota).
 * - Área de scroll interna: touch-action:pan-y + overscroll-behavior:contain
 *   (solo scroll vertical dentro del sheet, sin rubber-band que se propague).
 * - Drag para cerrar: se dispara solo en el handle superior, nunca en el
 *   header ni en el contenido — así tocar un botón no puede ser interpretado
 *   como el inicio de un drag.
 */
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
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Scroll lock + escape + entrada
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    // Entra al siguiente frame — evita que el translateY inicial se
    // aplique en el mismo tick del mount y se salte la animación.
    const raf = requestAnimationFrame(() => setMounted(true));

    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.touchAction = prev.bodyTouchAction;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      window.scrollTo(0, scrollY);
      setMounted(false);
      setDragY(0);
    };
  }, [open, onClose]);

  if (!open || !portalTarget) return null;

  // Drag para cerrar — solo se registra en el handle superior.
  function onHandleTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }
  function onHandleTouchEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  // Entrada: en mobile viene desde abajo, en desktop hace un pequeño
  // fade+lift. Después del mount, la transformación estática es 0.
  const enterFrom = isMobile ? "translateY(100%)" : "translateY(20px)";
  const sheetTransform = mounted ? `translateY(${dragY}px)` : enterFrom;

  const dragProgress = Math.min(1, dragY / 300);
  const overlayOpacity = mounted ? 1 - dragProgress * 0.6 : 0;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4"
      style={{
        background: `rgba(0,0,0,${0.5 * overlayOpacity})`,
        transition: dragging.current ? "none" : "background 0.2s",
        // El backdrop nunca es scrolleable ni pinch-zoomeable.
        touchAction: "none",
      }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg card flex flex-col"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: isMobile ? 0 : 20,
          borderBottomRightRadius: isMobile ? 0 : 20,
          transform: sheetTransform,
          transition: dragging.current
            ? "none"
            : "transform 0.28s cubic-bezier(.2,.7,.3,1)",
          maxHeight: isMobile ? "88dvh" : "calc(100dvh - 24px)",
          paddingBottom: "env(safe-area-inset-bottom)",
          overflow: "hidden",
          // El sheet en sí no acepta gestos — solo la zona de scroll
          // interna sí (definida abajo).
          touchAction: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle superior — única zona de drag-to-close */}
        <div
          className="sm:hidden pt-2 pb-1 grid place-items-center shrink-0"
          style={{ touchAction: "none" }}
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onTouchCancel={onHandleTouchEnd}
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
        {/* Header — sin drag, solo botón X */}
        <div
          className="flex items-center justify-between px-5 pt-1 pb-3 sm:pt-5 shrink-0"
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
        {/* Contenido — únicamente aquí se permite scroll vertical */}
        <div
          className="px-5 py-4 flex-1"
          style={{
            overflowY: "auto",
            overscrollBehavior: "contain",
            touchAction: "pan-y",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, portalTarget);
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
