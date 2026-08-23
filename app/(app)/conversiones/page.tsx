import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConversionesClient from "./conversiones-client";
import type { Conversion } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("conversiones")
    .select("*")
    .order("fecha", { ascending: false });

  return <ConversionesClient initial={(data ?? []) as Conversion[]} />;
}
