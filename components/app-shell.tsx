"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Monitor,
  Plus,
  LayoutDashboard,
  Receipt,
  RefreshCcw,
  Target,
  Plane,
  ArrowLeftRight,
} from "lucide-react";
import { SettingsProvider, useSettings } from "./settings-context";
import { ToastProvider } from "./toast-provider";
import MovimientoDialog, {
  emptyMovForm,
  type MovForm,
} from "./movimiento-dialog";
import { labelMes } from "@/lib/format";
import type { Settings } from "@/types/database";

const TABS = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: Receipt },
  { href: "/fijos", label: "Fijos", icon: RefreshCcw },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/viajes", label: "Viajes", icon: Plane },
  { href: "/conversiones", label: "Conversiones", icon: ArrowLeftRight },
] as const;

export default function AppShell({
  settings,
  children,
}: {
  settings: Omit<Settings, "user_id" | "updated_at">;
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <SettingsProvider initial={settings}>
        <Header />
        <Tabs />
        <div
          className="mx-auto max-w-[1120px] px-4 sm:px-5 pt-4"
          style={{
            paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
        <FAB />
      </SettingsProvider>
    </ToastProvider>
  );
}

function Header() {
  const { settings, updateSettings } = useSettings();
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--paper) 88%, transparent)",
        borderBottom: "1px solid var(--line)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto max-w-[1120px] px-3 sm:px-5 py-3 flex items-center gap-1.5 sm:gap-3">
        <Link
          href="/resumen"
          className="flex items-baseline gap-2 no-underline shrink-0"
        >
          <span
            className="font-serif text-[18px] sm:text-[22px] font-bold tracking-tight whitespace-nowrap"
            style={{ color: "var(--ink)" }}
          >
            <span className="sm:hidden">Plata</span>
            <span className="hidden sm:inline">Plata en Orden</span>
            <span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

        <MesPopover
          value={settings.mes}
          onChange={(mes) => updateSettings({ mes })}
        />
        <TcPopover
          value={settings.tc_ref}
          onChange={(tc_ref) => updateSettings({ tc_ref })}
        />
        <CurToggle
          value={settings.cur_pref}
          onChange={(cur_pref) => updateSettings({ cur_pref })}
        />
        <ThemeToggle
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
        />
        </div>
      </div>
    </header>
  );
}

function Tabs() {
  const pathname = usePathname();
  return (
    <nav
      className="mx-auto max-w-[1120px] px-4 sm:px-5 flex gap-1 no-scrollbar"
      style={{
        borderBottom: "1px solid var(--line)",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap no-underline transition"
            style={{
              color: active ? "var(--accent)" : "var(--ink-soft)",
              borderBottom: active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─────────── Popover base ─────────── */
function Popover({
  trigger,
  children,
  align = "right",
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="h-9 flex items-center gap-1.5 rounded-[10px] px-2.5 sm:px-3 text-[13px] sm:text-sm font-medium transition whitespace-nowrap"
        style={{
          background: open ? "var(--accent-soft)" : "var(--surface)",
          border: `1px solid ${open ? "var(--accent)" : "var(--line)"}`,
          color: open ? "var(--accent-ink)" : "var(--ink)",
          boxShadow: "var(--shadow)",
        }}
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          className="absolute z-40 mt-2 card p-3"
          style={{
            minWidth: 240,
            [align === "right" ? "right" : "left"]: 0,
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Mes popover ─────────── */
function MesPopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (mes: string) => void;
}) {
  const [year, month] = value.split("-").map(Number);
  const nombreCorto = labelMes(value).slice(0, 3);
  const short = `${nombreCorto} '${String(year).slice(2)}`;

  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <Popover
      trigger={() => (
        <>
          <Calendar size={14} />
          <span className="hidden sm:inline">{labelMes(value)}</span>
          <span className="sm:hidden">{short}</span>
        </>
      )}
    >
      {(close) => (
        <YearMonthGrid
          year={year}
          selected={value}
          today={currentYm}
          onPick={(mes) => {
            onChange(mes);
            close();
          }}
          onYearChange={(y) =>
            onChange(`${y}-${String(month).padStart(2, "0")}`)
          }
        />
      )}
    </Popover>
  );
}

function YearMonthGrid({
  year,
  selected,
  today,
  onPick,
  onYearChange,
}: {
  year: number;
  selected: string;
  today: string;
  onPick: (mes: string) => void;
  onYearChange: (y: number) => void;
}) {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          className="w-8 h-8 grid place-items-center rounded-lg"
          style={{ color: "var(--ink-soft)" }}
          aria-label="Año anterior"
        >
          ‹
        </button>
        <div className="font-serif font-semibold">{year}</div>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          className="w-8 h-8 grid place-items-center rounded-lg"
          style={{ color: "var(--ink-soft)" }}
          aria-label="Año siguiente"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {months.map((m, i) => {
          const key = `${year}-${String(i + 1).padStart(2, "0")}`;
          const isSel = key === selected;
          const isNow = key === today;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPick(key)}
              className="px-2 py-1.5 text-sm rounded-lg transition"
              style={{
                background: isSel ? "var(--accent)" : "transparent",
                color: isSel
                  ? "white"
                  : isNow
                    ? "var(--accent)"
                    : "var(--ink)",
                fontWeight: isSel || isNow ? 600 : 400,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── TC popover ─────────── */
function TcPopover({
  value,
  onChange,
}: {
  value: number;
  onChange: (tc: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  return (
    <Popover
      trigger={() => (
        <>
          <DollarSign size={14} />
          <span className="mono">{value}</span>
        </>
      )}
    >
      {(close) => (
        <div>
          <div
            className="text-xs uppercase tracking-wider mb-2 font-semibold"
            style={{ color: "var(--ink-faint)" }}
          >
            Tipo de cambio de referencia
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-9 h-9 grid place-items-center rounded-lg"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              <DollarSign size={16} />
            </div>
            <input
              type="number"
              inputMode="numeric"
              className="input mono flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number(draft);
                  if (Number.isFinite(n) && n > 0) onChange(n);
                  close();
                }
              }}
            />
          </div>
          <div
            className="text-xs mb-3"
            style={{ color: "var(--ink-faint)" }}
          >
            1 USD = {draft || "?"} ARS
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={close}
              style={{ padding: "6px 12px" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const n = Number(draft);
                if (Number.isFinite(n) && n > 0) onChange(n);
                close();
              }}
              style={{ padding: "6px 12px" }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/* ─────────── ARS/USD toggle ─────────── */
function CurToggle({
  value,
  onChange,
}: {
  value: "ARS" | "USD";
  onChange: (v: "ARS" | "USD") => void;
}) {
  return (
    <div
      className="inline-flex rounded-[10px] p-[3px]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
        height: 36,
      }}
    >
      {(["ARS", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className="px-3 text-xs font-bold rounded-[7px] transition"
          style={{
            background: value === c ? "var(--surface)" : "transparent",
            color: value === c ? "var(--ink)" : "var(--ink-soft)",
            boxShadow: value === c ? "var(--shadow)" : "none",
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ─────────── Theme toggle ─────────── */
function ThemeToggle({
  value,
  onChange,
}: {
  value: "light" | "dark" | "system";
  onChange: (v: "light" | "dark" | "system") => void;
}) {
  const next = value === "light" ? "dark" : value === "dark" ? "system" : "light";
  const Icon = value === "light" ? Sun : value === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={() => onChange(next)}
      title={`Tema: ${value} → ${next}`}
      aria-label="Cambiar tema"
      className="grid place-items-center rounded-[10px]"
      style={{
        width: 36,
        height: 36,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        color: "var(--ink-soft)",
        boxShadow: "var(--shadow)",
      }}
    >
      <Icon size={16} />
    </button>
  );
}

/* ─────────── Floating Action Button ─────────── */
function FAB() {
  const { settings } = useSettings();
  const [form, setForm] = useState<MovForm | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setForm(
            emptyMovForm(new Date().toISOString().slice(0, 10), settings.tc_ref),
          )
        }
        aria-label="Nuevo movimiento"
        className="fixed z-40 grid place-items-center rounded-full transition active:scale-95"
        style={{
          right: 20,
          bottom: "calc(24px + env(safe-area-inset-bottom))",
          width: 56,
          height: 56,
          background: "var(--accent)",
          color: "white",
          boxShadow:
            "0 4px 12px rgba(14,110,92,.35), 0 2px 4px rgba(14,110,92,.2)",
        }}
      >
        <Plus size={26} strokeWidth={2.4} />
      </button>
      <MovimientoDialog form={form} onClose={() => setForm(null)} />
    </>
  );
}
