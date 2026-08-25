"use client";

import { ConfirmCard } from "@/components/ConfirmCard";

/** The confirm card with inert handlers, so the server page can render it. */
export function ConfirmPreview({ minutes }: { minutes: number }) {
  return <ConfirmCard minutes={minutes} onAccept={() => {}} onEdit={() => {}} />;
}
