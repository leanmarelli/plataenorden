import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EstadisticasClient from "./estadisticas-client";
import type { Fijo, Movimiento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [movRes, fijosRes] = await Promise.all([
    supabase.from("movimientos").select("*"),
    supabase.from("fijos").select("*"),
  ]);

  return (
    <EstadisticasClient
      movimientos={(movRes.data ?? []) as Movimiento[]}
      fijos={(fijosRes.data ?? []) as Fijo[]}
    />
  );
}
