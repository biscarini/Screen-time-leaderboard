"use client";

import { useActionState, useRef, useState } from "react";
import { saveProfile, type ActionState } from "@/lib/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { downscale } from "@/lib/image";
import { Avatar } from "@/components/Avatar";
import { ErrorNote, SubmitButton } from "@/components/ui";

export function ProfileForm({
  userId,
  initialName,
  initialAvatar,
  next,
}: {
  userId: string;
  initialName: string;
  initialAvatar: string | null;
  next: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, {});
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(undefined);
    setUploading(true);
    try {
      const supabase = supabaseBrowser();
      const blob = await downscale(file, 512, 0.85);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      setUploadError("That photo didn't upload. Try another one.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
      <input type="hidden" name="next" value={next} />

      <div className="flex items-center gap-4">
        <Avatar
          profile={{ id: userId, display_name: name || "?", avatar_url: avatarUrl }}
          size={64}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="self-start font-display font-semibold text-[14px] text-brassInk disabled:opacity-60"
          >
            {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Add a photo"}
          </button>
          <span className="font-mono text-[11px] text-ink3">
            Optional — your initials work fine.
          </span>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pickAvatar}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Name</span>
        <input
          className="field"
          name="display_name"
          required
          maxLength={40}
          autoComplete="given-name"
          placeholder="Marco"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <ErrorNote message={state.error ?? uploadError} />
      <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
    </form>
  );
}
