"use client";

import { useActionState, useEffect, useState } from "react";
import { createGroup, joinGroup, type ActionState } from "@/lib/actions";
import { ErrorNote, SubmitButton } from "@/components/ui";

export function GroupForms({ hasGroups }: { hasGroups: boolean }) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [joinState, joinAction] = useActionState<ActionState, FormData>(joinGroup, {});
  const [createState, createAction] = useActionState<ActionState, FormData>(createGroup, {});
  const [timezone, setTimezone] = useState("America/New_York");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      /* keep the fallback */
    }
  }, []);

  return (
    <section className="flex flex-col gap-4">
      {hasGroups && <span className="eyebrow">Somewhere else to be</span>}

      <div className="flex gap-1 p-1 rounded-[10px] bg-sunken" role="tablist">
        {(["join", "create"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={[
              "flex-1 rounded-[7px] py-2 font-display font-semibold text-[14px]",
              mode === value ? "bg-surface text-ink shadow-sm" : "text-ink3",
            ].join(" ")}
          >
            {value === "join" ? "Join a group" : "Start one"}
          </button>
        ))}
      </div>

      {mode === "join" ? (
        <form action={joinAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Invite code</span>
            <input
              className="field font-mono tracking-[0.2em] uppercase"
              name="code"
              required
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="K7MRPQ"
            />
          </label>
          <ErrorNote message={joinState.error} />
          <SubmitButton pendingLabel="Joining…">Join</SubmitButton>
        </form>
      ) : (
        <form action={createAction} className="flex flex-col gap-3">
          <input type="hidden" name="timezone" value={timezone} />
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Group name</span>
            <input
              className="field"
              name="name"
              required
              maxLength={60}
              placeholder="Sunday League"
            />
          </label>
          <ErrorNote message={createState.error} />
          <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
          <p className="font-mono text-[11px] text-ink3 leading-relaxed">
            Weeks run Sunday to Saturday in {timezone.replace(/_/g, " ")}. You compete on
            the week just gone, uploading Sunday 6am to Monday 10pm — change it later in
            settings.
          </p>
        </form>
      )}
    </section>
  );
}
