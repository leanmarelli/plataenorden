import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";
import type { Categoria, Settings } from "@/types/database";

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

  const [{ data: settings }, { data: categorias }] = await Promise.all([
    supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("categorias").select("*"),
  ]);

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
    <AppShell
      settings={s}
      email={user.email ?? null}
      categorias={(categorias ?? []) as Categoria[]}
    >
      {children}
    </AppShell>
  );
}
