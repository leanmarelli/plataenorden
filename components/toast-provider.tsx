"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; text: string };

interface Ctx {
  toast: (text: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, kind, text }]);
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] flex flex-col gap-2 pointer-events-none"
        style={{
          right: 16,
          bottom: "calc(88px + env(safe-area-inset-bottom))",
          left: 16,
          maxWidth: 420,
          marginLeft: "auto",
        }}
      >
        {items.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={() =>
              setItems((cur) => cur.filter((x) => x.id !== t.id))
            }
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const style = {
    success: { bg: "var(--pos-soft)", fg: "var(--pos)", Icon: CheckCircle2 },
    error: { bg: "var(--neg-soft)", fg: "var(--neg)", Icon: AlertCircle },
    info: { bg: "var(--surface)", fg: "var(--ink)", Icon: Info },
  }[toast.kind];

  const Icon = style.Icon;

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg transition-all"
      style={{
        background: style.bg,
        color: style.fg,
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        opacity: visible ? 1 : 0,
      }}
    >
      <Icon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 text-sm">{toast.text}</div>
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        className="opacity-60 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}
