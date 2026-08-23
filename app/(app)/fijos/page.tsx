import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FijosClient from "./fijos-client";
import type { Fijo } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("fijos")
    .select("*")
    .order("dia", { ascending: true });

  return <FijosClient initial={(data ?? []) as Fijo[]} />;
}
