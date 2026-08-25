import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { myGroups } from "@/lib/data";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // One group is the common case — go straight there.
  const groups = await myGroups();
  redirect(groups.length === 1 ? `/g/${groups[0].id}` : "/groups");
}
