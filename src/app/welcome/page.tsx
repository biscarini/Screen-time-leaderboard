import { Shell, PageHeader } from "@/components/Shell";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { ProfileForm } from "./ProfileForm";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireUser();
  const { next } = await searchParams;

  const supabase = await supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Shell>
      <PageHeader
        eyebrow={profile ? "Your profile" : "One quick thing"}
        title={profile ? "Edit your profile" : "Who are you?"}
      />
      <ProfileForm
        userId={user.id}
        initialName={profile?.display_name ?? ""}
        initialAvatar={profile?.avatar_url ?? null}
        next={next ?? "/groups"}
      />
    </Shell>
  );
}
