"use client";

import { formatMinutes } from "@/lib/time";
import { AppBreakdown, Pickups } from "@/components/Breakdown";
import type { TopApp } from "@/lib/types";

/**
 * The moment the whole upload flow exists for. Split out of UploadFlow so it
 * can be rendered on its own — in /preview, and anywhere else worth looking at
 * it without walking through an upload first.
 *
 * The daily average is the only value being confirmed; everything under it is
 * shown so the reading can be sanity-checked at a glance, not so it can be
 * argued with.
 */
export function ConfirmCard({
  minutes,
  topApps = [],
  pickupsTotal = null,
  pickupsDailyAvg = null,
  looksLikeCurrentWeek = false,
  saving = false,
  onAccept,
  onEdit,
  onAddPickups,
  addingPickups = false,
}: {
  minutes: number;
  topApps?: TopApp[];
  pickupsTotal?: number | null;
  pickupsDailyAvg?: number | null;
  /** The report appears to be the week in progress rather than a finished one. */
  looksLikeCurrentWeek?: boolean;
  saving?: boolean;
  onAccept: () => void;
  onEdit: () => void;
  /** Offers a second screenshot for the Pickups card, which sits further down. */
  onAddPickups?: () => void;
  addingPickups?: boolean;
}) {
  const hasPickups = pickupsTotal != null || pickupsDailyAvg != null;

  return (
    <div className="flex flex-col gap-5">
      {looksLikeCurrentWeek && (
        <p className="rounded-[10px] bg-brassSoft border-l-[3px] border-brass px-4 py-3 text-[15px] leading-snug">
          This looks like the week in progress, not a finished one. Tap{" "}
          <strong>‹</strong> in Screen Time to go back to{" "}
          <strong>Last Week</strong>, then shoot it again — otherwise your average
          covers fewer days than everyone else&rsquo;s. Submit anyway if you&rsquo;re sure.
        </p>
      )}

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

      <AppBreakdown apps={topApps} />

      {hasPickups ? (
        <Pickups total={pickupsTotal} dailyAverage={pickupsDailyAvg} />
      ) : (
        onAddPickups && (
          <section className="flex flex-col gap-2">
            <span className="eyebrow">Pickups</span>
            <button
              type="button"
              onClick={onAddPickups}
              disabled={addingPickups || saving}
              className="card px-4 py-3.5 text-left flex items-center justify-between gap-3 disabled:opacity-60"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-display font-semibold text-[14.5px]">
                  {addingPickups ? "Reading…" : "Add the Pickups card"}
                </span>
                <span className="font-mono text-[11px] text-ink3">
                  Scroll down in Screen Time and shoot it — optional
                </span>
              </span>
              <span aria-hidden className="text-ink3">
                +
              </span>
            </button>
          </section>
        )
      )}
    </div>
  );
}
