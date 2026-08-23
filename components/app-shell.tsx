"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsProvider, useSettings } from "./settings-context";
import type { Settings } from "@/types/database";

const TABS = [
  { href: "/resumen", label: "Resumen" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/fijos", label: "Fijos" },
  { href: "/metas", label: "Metas" },
  { href: "/viajes", label: "Viajes" },
  { href: "/conversiones", label: "Conversiones" },
] as const;

export default function AppShell({
  settings,
  email,
  children,
}: {
  settings: Omit<Settings, "user_id" | "updated_at">;
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider initial={settings}>
      <Header email={email} />
      <Tabs />
      <div className="mx-auto max-w-[1120px] px-5 pb-20 pt-4">{children}</div>
    </SettingsProvider>
  );
}

function Header({ email }: { email: string | null }) {
  const { settings, updateSettings } = useSettings();

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur"
      style={{
        background: "color-mix(in srgb, var(--paper) 88%, transparent)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="mx-auto max-w-[1120px] px-5 py-3 flex flex-wrap items-center gap-3">
        <Link href="/resumen" className="flex items-baseline gap-2 mr-auto no-underline">
          <span
            className="font-serif text-[22px] font-bold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Plata en Orden
            <span style={{ color: "var(--accent)" }}>.</span>
          </span>
          <span className="hidden sm:inline text-xs" style={{ color: "var(--ink-faint)" }}>
            ARS · USD
          </span>
        </Link>

        <MesSelect
          value={settings.mes}
          onChange={(mes) => updateSettings({ mes })}
        />

        <TcInput
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

        <form action="/auth/signout" method="post">
          <button
            className="btn"
            title={email ?? "Cerrar sesión"}
            type="submit"
          >
            <span aria-hidden>⎋</span>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>
    </header>
  );
}

function Tabs() {
  const pathname = usePathname();
  return (
    <nav
      className="mx-auto max-w-[1120px] px-5 pt-3 flex gap-1 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 text-sm font-semibold whitespace-nowrap no-underline transition"
            style={{
              color: active ? "var(--accent)" : "var(--ink-soft)",
              borderBottom: active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MesSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (mes: string) => void;
}) {
  // Genera 24 meses hacia atrás desde hoy
  const opts: string[] = [];
  const now = new Date();
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(d.toISOString().slice(0, 7));
  }
  return (
    <label
      className="flex items-center gap-2 rounded-[10px] px-3 py-1.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
      }}
    >
      <span
        className="text-[11px] uppercase tracking-wider font-semibold"
        style={{ color: "var(--ink-faint)" }}
      >
        Mes
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-0 outline-none text-sm"
        style={{ color: "var(--ink)" }}
      >
        {opts.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}

function TcInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (tc: number) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 rounded-[10px] px-3 py-1.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow)",
      }}
    >
      <span
        className="text-[11px] uppercase tracking-wider font-semibold"
        style={{ color: "var(--ink-faint)" }}
      >
        USD $
      </span>
      <input
        type="number"
        min={1}
        step={1}
        defaultValue={value}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n > 0 && n !== value) onChange(n);
        }}
        className="mono bg-transparent border-0 outline-none text-sm w-[70px]"
        style={{ color: "var(--ink)" }}
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
      className="inline-flex rounded-[10px] p-[3px]"
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
    >
      {(["ARS", "USD"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className="px-3 py-1 text-xs font-bold rounded-[7px] transition"
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

function ThemeToggle({
  value,
  onChange,
}: {
  value: "light" | "dark" | "system";
  onChange: (v: "light" | "dark" | "system") => void;
}) {
  const next = value === "light" ? "dark" : value === "dark" ? "system" : "light";
  const icon = value === "light" ? "☀︎" : value === "dark" ? "☾" : "◐";
  return (
    <button
      onClick={() => onChange(next)}
      title={`Tema: ${value} → ${next}`}
      className="grid place-items-center rounded-[10px]"
      style={{
        width: 38,
        height: 38,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        color: "var(--ink-soft)",
        boxShadow: "var(--shadow)",
      }}
    >
      {icon}
    </button>
  );
}
