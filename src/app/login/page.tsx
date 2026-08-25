import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Shell } from "@/components/Shell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/groups");

  return (
    <Shell>
      <div className="pt-16 pb-8 flex flex-col gap-3">
        <span className="eyebrow">Weekly, with your friends</span>
        <h1 className="font-display font-bold text-[38px] leading-[0.98] tracking-[-0.025em] text-balance">
          Screen Time Leaderboard
        </h1>
        <p className="text-[17px] text-ink2 leading-relaxed">
          Lowest average daily screen time wins. Everyone posts their Saturday
          screenshot, the app reads the number, the group gets ranked.
        </p>
      </div>
      <LoginForm />
    </Shell>
  );
}
