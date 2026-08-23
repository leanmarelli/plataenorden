import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MovimientosClient from "./movimientos-client";
import type { Movimiento } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("movimientos")
    .select("*")
    .order("fecha", { ascending: false });

  return <MovimientosClient initial={(data ?? []) as Movimiento[]} />;
}
