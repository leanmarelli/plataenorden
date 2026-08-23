import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import type { Settings } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fallback por si el trigger no creó settings todavía
  const s: Omit<Settings, "user_id" | "updated_at"> = settings
    ? {
        tc_ref: settings.tc_ref,
        cur_pref: settings.cur_pref,
        mes: settings.mes,
        theme: settings.theme,
      }
    : {
        tc_ref: 1450,
        cur_pref: "ARS",
        mes: new Date().toISOString().slice(0, 7),
        theme: "system",
      };

  return (
    <AppShell settings={s} email={user.email ?? null}>
      {children}
    </AppShell>
  );
}
