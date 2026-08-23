import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResumenClient from "./resumen-client";
import type { Fijo, Meta, Movimiento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [movRes, fijoRes, metaRes] = await Promise.all([
    supabase.from("movimientos").select("*"),
    supabase.from("fijos").select("*"),
    supabase.from("metas").select("*"),
  ]);

  return (
    <ResumenClient
      movimientos={(movRes.data ?? []) as Movimiento[]}
      fijos={(fijoRes.data ?? []) as Fijo[]}
      metas={(metaRes.data ?? []) as Meta[]}
    />
  );
}
