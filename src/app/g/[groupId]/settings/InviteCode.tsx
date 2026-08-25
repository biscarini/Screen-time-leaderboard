"use client";

import { useState } from "react";

export function InviteCode({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Join ${groupName} on Screen Time Leaderboard — invite code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the user dismissed the sheet — nothing to report */
    }
  }

  return (
    <div className="card px-4 py-4 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Invite code</span>
        <span className="font-mono font-semibold text-[22px] tracking-[0.22em]">
          {code}
        </span>
      </div>
      <button
        type="button"
        onClick={share}
        className="rounded-[10px] bg-ink text-ground px-4 py-2.5 font-display font-semibold text-[14px] whitespace-nowrap"
      >
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
