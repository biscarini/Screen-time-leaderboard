"use client";

import { useActionState, useState } from "react";
import { updateGroupSettings, type ActionState } from "@/lib/actions";
import { ErrorNote, SubmitButton } from "@/components/ui";
import { formatHour } from "@/lib/time";
import type { Group } from "@/lib/types";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function SettingsForm({ group }: { group: Group }) {
  const [state, action] = useActionState<ActionState, FormData>(updateGroupSettings, {});
  const [timezone, setTimezone] = useState(group.timezone);
  const [saved, setSaved] = useState(false);

  function useDeviceTimezone() {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setSaved(false);
    } catch {
      /* leave it */
    }
  }

  return (
    <form
      action={async (formData) => {
        setSaved(false);
        await action(formData);
        setSaved(true);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="group_id" value={group.id} />
      <input type="hidden" name="timezone" value={timezone} />

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Group name</span>
        <input
          className="field"
          name="name"
          required
          maxLength={60}
          defaultValue={group.name}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Upload window · Sunday to Monday</span>
        <div className="flex items-center gap-2">
          <select name="opens_hour" defaultValue={group.opens_hour} className="field flex-1">
            {HOURS.map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
          <span className="font-mono text-[12px] text-ink3">to</span>
          <select name="closes_hour" defaultValue={group.closes_hour} className="field flex-1">
            {HOURS.map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
        </div>
        <p className="font-mono text-[11px] text-ink3 leading-relaxed">
          Uploads run from Sunday morning to Monday night, once the week has finished.
          Everyone reports the same seven days, so the window can be generous.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Timezone</span>
        <div className="flex items-center justify-between gap-3 card px-4 py-3">
          <span className="font-mono text-[12.5px] truncate">
            {timezone.replace(/_/g, " ")}
          </span>
          <button
            type="button"
            onClick={useDeviceTimezone}
            className="font-display font-semibold text-[13px] text-brassInk whitespace-nowrap"
          >
            Use this device
          </button>
        </div>
      </div>

      <ErrorNote message={state.error} />
      {saved && !state.error && (
        <p className="font-mono text-[11.5px] text-down">Saved.</p>
      )}
      <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
    </form>
  );
}
