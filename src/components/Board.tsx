import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatDelta, formatMinutes } from "@/lib/time";
import type { Entry } from "@/lib/stats";
import type { Member } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Board({
  groupId,
  entries,
  awaiting,
  awaitingLabel,
  viewerId,
  signedUrls = {},
}: {
  groupId: string;
  entries: Entry[];
  awaiting: Member[];
  /** "Pending" while the week is live, "Missed" once it's closed. */
  awaitingLabel: string;
  viewerId: string;
  signedUrls?: Record<string, string>;
}) {
  if (entries.length === 0 && awaiting.length === 0) {
    return (
      <p className="card px-4 py-6 text-[15px] text-ink3 text-center">
        Nobody here yet. Share the invite code from settings.
      </p>
    );
  }

  return (
    <ol className="card overflow-hidden">
      {entries.map((entry, index) => (
        <li
          key={entry.member.id}
          className={[
            "grid grid-cols-[26px_34px_1fr_auto] items-center gap-3 px-4 py-3",
            index > 0 || awaiting.length ? "border-b border-ruleSoft" : "",
            entry.member.id === viewerId ? "bg-surface2" : "",
          ].join(" ")}
        >
          <span className="text-center font-mono text-[13px] text-ink3 tnum">
            {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
          </span>
          <Avatar profile={entry.member} />
          <Link
            href={`/g/${groupId}/member/${entry.member.id}`}
            className="font-display font-medium text-[15.5px] truncate"
          >
            {entry.member.display_name}
          </Link>
          <span className="flex items-baseline gap-2 justify-self-end">
            {signedUrls[entry.screenshotPath] && (
              <a
                href={signedUrls[entry.screenshotPath]}
                target="_blank"
                rel="noopener noreferrer"
                title={`See ${entry.member.display_name}'s screenshot`}
                className="text-ink3 text-[13px] leading-none"
              >
                <span aria-hidden>◱</span>
                <span className="sr-only">
                  See {entry.member.display_name}&rsquo;s screenshot
                </span>
              </a>
            )}
            <span className="font-mono font-medium text-[14px] tnum">
              {formatMinutes(entry.minutes)}
            </span>
            {entry.change && entry.change.direction !== "flat" && (
              <span
                className={[
                  "font-mono text-[11.5px] tnum px-1.5 py-0.5 rounded",
                  entry.change.direction === "down"
                    ? "text-down bg-downSoft"
                    : "text-up bg-upSoft",
                ].join(" ")}
              >
                {formatDelta(entry.change)}
              </span>
            )}
          </span>
        </li>
      ))}

      {awaiting.map((member, index) => (
        <li
          key={member.id}
          className={[
            "grid grid-cols-[26px_34px_1fr_auto] items-center gap-3 px-4 py-3",
            index < awaiting.length - 1 ? "border-b border-ruleSoft" : "",
            member.id === viewerId ? "bg-surface2" : "",
          ].join(" ")}
        >
          <span className="text-center font-mono text-[13px] text-ink3 tnum">
            {entries.length + index + 1}
          </span>
          <Avatar profile={member} />
          <Link
            href={`/g/${groupId}/member/${member.id}`}
            className="font-display font-medium text-[15.5px] truncate text-ink2"
          >
            {member.display_name}
          </Link>
          <span className="justify-self-end font-mono text-[12px] text-ink3">
            {awaitingLabel}
          </span>
        </li>
      ))}
    </ol>
  );
}
