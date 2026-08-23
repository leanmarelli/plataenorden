"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Settings } from "@/types/database";

type PublicSettings = Omit<Settings, "user_id" | "updated_at">;

interface Ctx {
  settings: PublicSettings;
  updateSettings: (patch: Partial<PublicSettings>) => Promise<void>;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({
  initial,
  children,
}: {
  initial: PublicSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<PublicSettings>(initial);
  const supabase = createSupabaseBrowserClient();

  // Aplicar tema al <html>
  useEffect(() => {
    const el = document.documentElement;
    if (settings.theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback(
    async (patch: Partial<PublicSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next); // optimista
      const { error } = await supabase.from("settings").update(patch).eq(
        "user_id",
        (await supabase.auth.getUser()).data.user?.id ?? "",
      );
      if (error) {
        console.error("Error guardando settings:", error);
        setSettings(settings); // revertir
      }
    },
    [settings, supabase],
  );

  return (
    <SettingsCtx.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings fuera de SettingsProvider");
  return ctx;
}
