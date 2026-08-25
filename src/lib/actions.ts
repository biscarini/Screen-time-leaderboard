"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type ActionState = { error?: string };

const TZ_FALLBACK = "America/New_York";

export async function saveProfile(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sign in first." };

  const name = String(form.get("display_name") ?? "").trim();
  if (!name) return { error: "Add a name so your friends know who you are." };
  if (name.length > 40) return { error: "That name is a little long — 40 characters max." };

  const avatarUrl = String(form.get("avatar_url") ?? "").trim() || null;

  const { error } = await supabase.from("profiles").upsert({
    id: auth.user.id,
    display_name: name,
    avatar_url: avatarUrl,
  });
  if (error) return { error: error.message };

  const next = String(form.get("next") ?? "/groups");
  revalidatePath("/", "layout");
  redirect(next);
}

export async function createGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await supabaseServer();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Give the group a name." };

  const timezone = String(form.get("timezone") ?? "").trim() || TZ_FALLBACK;

  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_timezone: timezone,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(`/g/${data}`);
}

export async function joinGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await supabaseServer();
  const code = String(form.get("code") ?? "").trim();
  if (!code) return { error: "Enter the invite code your friend sent you." };

  const { data, error } = await supabase.rpc("join_group", { p_code: code });
  if (error) {
    return {
      error: error.message.includes("no group with that code")
        ? "No group with that code. Check it and try again."
        : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(`/g/${data}`);
}

export async function submitScreenTime(input: {
  groupId: string;
  weekId: string;
  minutes: number;
  detectedMinutes: number | null;
  screenshotPath: string;
  extraction: unknown;
}): Promise<ActionState> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sign in first." };

  if (!Number.isInteger(input.minutes) || input.minutes < 0 || input.minutes > 1440) {
    return { error: "That doesn't look like a daily average. Try again." };
  }

  const { error } = await supabase.from("submissions").upsert(
    {
      week_id: input.weekId,
      user_id: auth.user.id,
      minutes: input.minutes,
      detected_minutes: input.detectedMinutes,
      screenshot_path: input.screenshotPath,
      extraction: input.extraction as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "week_id,user_id" },
  );

  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "The upload window is closed for this week."
        : error.message,
    };
  }

  revalidatePath(`/g/${input.groupId}`, "layout");
  return {};
}

export async function updateGroupSettings(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await supabaseServer();
  const groupId = String(form.get("group_id") ?? "");
  const opensHour = Number(form.get("opens_hour"));
  const closesHour = Number(form.get("closes_hour"));

  if (!Number.isInteger(opensHour) || !Number.isInteger(closesHour)) {
    return { error: "Pick both an opening and a closing hour." };
  }
  if (closesHour <= opensHour) {
    return { error: "The window has to close after it opens." };
  }

  const { error } = await supabase
    .from("groups")
    .update({
      name: String(form.get("name") ?? "").trim(),
      timezone: String(form.get("timezone") ?? "").trim() || TZ_FALLBACK,
      opens_hour: opensHour,
      closes_hour: closesHour,
    })
    .eq("id", groupId);

  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`, "layout");
  return {};
}

export async function leaveGroup(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", String(form.get("group_id") ?? ""))
    .eq("user_id", auth.user.id);

  revalidatePath("/", "layout");
  redirect("/groups");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
