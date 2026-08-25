"use client";

import { ConfirmCard } from "@/components/ConfirmCard";
import type { TopApp } from "@/lib/types";

/** The confirm card with inert handlers, so the server page can render it. */
export function ConfirmPreview({
  minutes,
  topApps = [],
  pickupsTotal = null,
  pickupsDailyAvg = null,
  offerPickups = false,
}: {
  minutes: number;
  topApps?: TopApp[];
  pickupsTotal?: number | null;
  pickupsDailyAvg?: number | null;
  offerPickups?: boolean;
}) {
  return (
    <ConfirmCard
      minutes={minutes}
      topApps={topApps}
      pickupsTotal={pickupsTotal}
      pickupsDailyAvg={pickupsDailyAvg}
      onAccept={() => {}}
      onEdit={() => {}}
      onAddPickups={offerPickups ? () => {} : undefined}
    />
  );
}
