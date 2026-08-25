"use client";

import { formatMinutes } from "@/lib/time";

/**
 * The moment the whole upload flow exists for. Split out of UploadFlow so it
 * can be rendered on its own — in /preview, and anywhere else worth looking at
 * it without walking through an upload first.
 */
export function ConfirmCard({
  minutes,
  saving = false,
  onAccept,
  onEdit,
}: {
  minutes: number;
  saving?: boolean;
  onAccept: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="card px-6 py-8 flex flex-col items-center gap-1 text-center">
      <span className="eyebrow">Detected screen time</span>
      <span className="font-display font-bold text-[46px] leading-[1.1] tracking-[-0.03em] tnum">
        {formatMinutes(minutes)}
      </span>
      <span className="font-mono text-[11px] text-ink3 pb-5">
        read from &ldquo;Daily Average&rdquo;
      </span>
      <div className="flex gap-2.5 w-full">
        <button
          type="button"
          disabled={saving}
          onClick={onAccept}
          className="flex-1 rounded-[10px] bg-ink text-ground py-3 font-display font-semibold text-[14px] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Looks right"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onEdit}
          className="flex-1 rounded-[10px] bg-surface2 border border-rule py-3 font-display font-semibold text-[14px] disabled:opacity-60"
        >
          Fix it
        </button>
      </div>
    </div>
  );
}
