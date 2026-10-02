"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Plus,
  LayoutDashboard,
  Receipt,
  RefreshCcw,
  Target,
  Plane,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  User,
} from "lucide-react";
import { SettingsProvider, useSettings } from "./settings-context";
import { ToastProvider } from "./toast-provider";
import { ConfirmProvider } from "./confirm-provider";
import { CategoriasProvider } from "./categorias-context";
import Modal from "./modal";
import type { Categoria } from "@/types/database";
import MovimientoDialog, {
  emptyMovForm,
  type MovForm,
} from "./movimiento-dialog";
import { labelMes } from "@/lib/format";
import type { Settings } from "@/types/database";

const TABS = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: Receipt },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/fijos", label: "Fijos", icon: RefreshCcw },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/viajes", label: "Viajes", icon: Plane },
] as const;

export default function AppShell({
  settings,
  email,
  categorias,
  children,
}: {
  settings: Omit<Settings, "user_id" | "updated_at">;
  email: string | null;
  categorias: Categoria[];
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SettingsProvider initial={settings}>
          <CategoriasProvider initial={categorias}>
            <Header email={email} />
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
          </CategoriasProvider>
        </SettingsProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Header({ email }: { email: string | null }) {
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
      <div className="mx-auto max-w-[1120px] px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3">
        <Link
          href="/resumen"
          className="flex items-baseline gap-2 no-underline shrink-0"
        >
          <span
            className="font-serif text-[17px] sm:text-[22px] font-bold tracking-tight whitespace-nowrap"
            style={{ color: "var(--ink)" }}
          >
            <span className="sm:hidden">P.</span>
            <span className="hidden sm:inline">Plata en Orden</span>
            <span style={{ color: "var(--accent)" }} className="hidden sm:inline">.</span>
          </span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2 shrink-0">
          <MesPicker
            value={settings.mes}
            onChange={(mes) => updateSettings({ mes })}
          />
          <UserMenu
            email={email}
            tc={settings.tc_ref}
            cur={settings.cur_pref}
            theme={settings.theme}
            onTc={(tc_ref) => updateSettings({ tc_ref })}
            onCur={(cur_pref) => updateSettings({ cur_pref })}
            onTheme={(theme) => updateSettings({ theme })}
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

/* ─────────── Hook: detectar mobile (sm breakpoint) ─────────── */
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

/* ─────────── Popover desktop + bottom sheet mobile ─────────── */
function Popover({
  trigger,
  title,
  children,
  align = "right",
}: {
  trigger: (open: boolean) => React.ReactNode;
  title: string;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || isMobile) return;
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
  }, [open, isMobile]);

  const close = () => setOpen(false);

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
      {/* Desktop: popover absoluto */}
      {open && !isMobile && (
        <div
          className="absolute z-40 mt-2 card p-3"
          style={{
            minWidth: 260,
            [align === "right" ? "right" : "left"]: 0,
          }}
        >
          {children(close)}
        </div>
      )}
      {/* Mobile: bottom sheet */}
      {isMobile && (
        <Modal open={open} onClose={close} title={title}>
          {children(close)}
        </Modal>
      )}
    </div>
  );
}

/* ─────────── Mes picker ─────────── */
function MesPicker({
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
      title="Elegir mes"
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
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          className="w-9 h-9 grid place-items-center rounded-lg transition"
          style={{
            color: "var(--ink-soft)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}
          aria-label="Año anterior"
        >
          ‹
        </button>
        <div className="font-serif font-semibold text-lg">{year}</div>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          className="w-9 h-9 grid place-items-center rounded-lg transition"
          style={{
            color: "var(--ink-soft)",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}
          aria-label="Año siguiente"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map((m, i) => {
          const key = `${year}-${String(i + 1).padStart(2, "0")}`;
          const isSel = key === selected;
          const isNow = key === today;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onPick(key)}
              className="py-2.5 text-sm rounded-lg transition"
              style={{
                background: isSel ? "var(--accent)" : "var(--surface-2)",
                border: `1px solid ${isSel ? "var(--accent)" : "var(--line)"}`,
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

/* ─────────── User menu (TC + moneda + tema + cerrar sesión) ─────────── */
function UserMenu({
  email,
  tc,
  cur,
  theme,
  onTc,
  onCur,
  onTheme,
}: {
  email: string | null;
  tc: number;
  cur: "ARS" | "USD";
  theme: "light" | "dark" | "system";
  onTc: (tc: number) => void;
  onCur: (c: "ARS" | "USD") => void;
  onTheme: (t: "light" | "dark") => void;
}) {
  return (
    <Popover
      title="Ajustes"
      trigger={(open) => (
        <SettingsIcon size={16} strokeWidth={open ? 2.4 : 2} />
      )}
    >
      {() => (
        <div className="flex flex-col gap-4">
          {email && (
            <div className="flex items-center gap-3 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <span
                className="grid place-items-center rounded-full shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--accent-soft)",
                  color: "var(--accent-ink)",
                }}
              >
                <User size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  Sesión iniciada
                </div>
                <div className="text-sm font-medium truncate">{email}</div>
              </div>
            </div>
          )}

          <section className="flex flex-col gap-2">
            <div className="label">Tipo de cambio (ARS por USD)</div>
            <TcField value={tc} onChange={onTc} />
          </section>

          <section className="flex flex-col gap-2">
            <div className="label">Moneda preferida</div>
            <CurToggle value={cur} onChange={onCur} />
          </section>

          <section className="flex flex-col gap-2">
            <div className="label">Tema</div>
            <ThemePicker value={theme} onChange={onTheme} />
          </section>

          <form action="/auth/signout" method="post" className="pt-3" style={{ borderTop: "1px solid var(--line)" }}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: "var(--neg-soft)",
                color: "var(--neg)",
                border: "1px solid var(--neg-soft)",
              }}
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </Popover>
  );
}

/* ─────────── TC input dentro del menú ─────────── */
function TcField({
  value,
  onChange,
}: {
  value: number;
  onChange: (tc: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => {
      const n = Number(draft);
      if (Number.isFinite(n) && n > 0 && n !== value) onChange(n);
    }, 500);
    return () => clearTimeout(t);
  }, [draft, focused, value, onChange]);

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0 && n !== value) onChange(n);
    else setDraft(String(value));
  }

  return (
    <label
      className="flex items-center gap-2 rounded-[10px] px-3 py-2 transition"
      style={{
        background: focused ? "var(--accent-soft)" : "var(--surface-2)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--line)"}`,
        color: focused ? "var(--accent-ink)" : "var(--ink)",
      }}
    >
      <DollarSign size={15} />
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="mono bg-transparent border-0 outline-none text-sm font-medium flex-1 p-0 m-0"
        style={{ color: "inherit", minWidth: 0 }}
        aria-label="Tipo de cambio de referencia"
      />
    </label>
  );
}

function CurToggle({
  value,
  onChange,
}: {
  value: "ARS" | "USD";
  onChange: (v: "ARS" | "USD") => void;
}) {
  return (
    <div
      className="grid grid-cols-2 rounded-[10px] p-[3px] gap-[2px]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
      }}
    >
      {(["ARS", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className="py-2 text-sm font-bold rounded-[7px] transition"
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

function ThemePicker({
  value,
  onChange,
}: {
  value: "light" | "dark" | "system";
  onChange: (v: "light" | "dark") => void;
}) {
  const current: "light" | "dark" = value === "dark" ? "dark" : "light";
  return (
    <div
      className="grid grid-cols-2 rounded-[10px] p-[3px] gap-[2px]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
      }}
    >
      {([
        { v: "light" as const, Icon: Sun, label: "Claro" },
        { v: "dark" as const, Icon: Moon, label: "Oscuro" },
      ]).map(({ v, Icon, label }) => {
        const active = current === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={active}
            className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-[7px] transition"
            style={{
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-soft)",
              boxShadow: active ? "var(--shadow)" : "none",
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
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
