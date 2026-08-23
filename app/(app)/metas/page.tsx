import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MetasClient from "./metas-client";
import type { Meta } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("metas")
    .select("*")
    .order("created_at", { ascending: true });

  return <MetasClient initial={(data ?? []) as Meta[]} />;
}
