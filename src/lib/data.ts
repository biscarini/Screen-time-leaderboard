import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Group, GroupData, HistoryRow, Member, Profile, Week } from "@/lib/types";

/** The signed-in user, or a redirect to sign-in. */
export const requireUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
});

export const requireProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) redirect("/welcome");
  return data as Profile;
});

/** Every group the viewer belongs to. */
export async function myGroups(): Promise<{ id: string; name: string }[]> {
  const user = await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", user.id);

  return (data ?? []).flatMap((r) => {
    // PostgREST embeds arrive typed as arrays; a to-one relation is a single row.
    const g = (r as unknown as { groups: { id: string; name: string } | null }).groups;
    return g ? [g] : [];
  });
}

/**
 * Everything one group's screens need, in one place.
 *
 * The first thing it does is roll the group's weeks. That makes every page
 * load a repair opportunity: if the cron missed an hour, the leaderboard is
 * still correct the moment someone opens it.
 */
export const loadGroup = cache(async (groupId: string): Promise<GroupData> => {
  const profile = await requireProfile();
  const supabase = await supabaseServer();

  const { error: rollError } = await supabase.rpc("roll_group_weeks", {
    p_group_id: groupId,
  });
  if (rollError) redirect("/groups");

  const [groupRes, memberRes, weekRes, historyRes, windowRes] = await Promise.all([
    supabase
      .from("groups")
      .select(
        "id, name, invite_code, timezone, opens_dow, opens_hour, closes_dow, closes_hour, created_by",
      )
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("role, profiles(id, display_name, avatar_url)")
      .eq("group_id", groupId),
    supabase
      .from("weeks")
      .select("id, group_id, starts_on, ends_on, status")
      .eq("group_id", groupId)
      .order("starts_on", { ascending: false }),
    supabase
      .from("member_week_history")
      .select("*")
      .eq("group_id", groupId)
      .order("starts_on", { ascending: false }),
    supabase.rpc("submission_window_open", { p_group_id: groupId }),
  ]);

  if (!groupRes.data) redirect("/groups");

  const members: Member[] = (memberRes.data ?? [])
    .flatMap((r) => {
      const row = r as unknown as { role: "member" | "admin"; profiles: Profile | null };
      return row.profiles ? [{ ...row.profiles, role: row.role }] : [];
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const weeks = (weekRes.data ?? []) as Week[];

  return {
    group: groupRes.data as Group,
    members,
    weeks,
    history: (historyRes.data ?? []) as HistoryRow[],
    currentWeek: weeks[0] ?? null,
    windowOpen: windowRes.data === true,
    viewerId: profile.id,
  };
});

/** Short-lived signed URLs for screenshots, keyed by storage path. */
export async function signScreenshots(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};

  const supabase = await supabaseServer();
  const { data } = await supabase.storage
    .from("screenshots")
    .createSignedUrls(unique, 60 * 10);

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
