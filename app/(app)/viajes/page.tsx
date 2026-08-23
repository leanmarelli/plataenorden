import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ViajesClient from "./viajes-client";
import type { Viaje } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("viajes")
    .select("*")
    .order("viaje", { ascending: true });

  return <ViajesClient initial={(data ?? []) as Viaje[]} />;
}
