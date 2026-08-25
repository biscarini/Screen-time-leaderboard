import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Board } from "@/components/Board";
import { groupStats, standingsFor, submissionFor } from "@/lib/stats";
import { formatMinutes, isoDayName, formatHour, weekLabel, windowLabel } from "@/lib/time";
import type { GroupData } from "@/lib/types";

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

/**
 * The leaderboard, as a pure function of group data.
 *
 * Kept separate from the route so the same component renders under real data
 * and under fixtures in /preview — a screen you can only see with a populated
 * database is a screen nobody reviews.
 */
export function LeaderboardView({
  data,
  signedUrls,
}: {
  data: GroupData;
  signedUrls: Record<string, string>;
}) {
  const { group, currentWeek, windowOpen, viewerId } = data;
  const groupId = group.id;

  const current = standingsFor(data, currentWeek?.id ?? null);
  const previousWeek =
    data.weeks.find((w) => w.status === "closed" && w.id !== currentWeek?.id) ?? null;
  const previous = standingsFor(data, previousWeek?.id ?? null);

  const closed = currentWeek?.status === "closed";
  const mine = submissionFor(data, currentWeek?.id ?? null, viewerId);
  const stats = groupStats(data);

  // "Jake takes it at 1h 42m — third week running."
  let crown: string | null = null;
  if (closed && current.entries.length > 0) {
    const winner = current.entries[0];
    const tied = current.entries.filter((e) => e.rank === 1).length > 1;
    const run = stats.streak?.member.id === winner.member.id ? stats.streak.weeks : 0;
    crown = tied
      ? `A dead heat at ${formatMinutes(winner.minutes)}.`
      : `${winner.member.display_name} takes it at ${formatMinutes(winner.minutes)}${
          run > 1 ? ` — ${ORDINALS[Math.min(run, 7)] ?? `${run}th`} week running` : ""
        }.`;
  }

  return (
    <Shell>
      <header className="flex items-end justify-between gap-4 pt-7 pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">
            {closed ? "Final" : windowOpen ? "Uploads open" : "This week"}
          </span>
          <h1 className="font-display font-bold text-[26px] leading-[1.1] tracking-[-0.02em]">
            Weekly Screen Time
          </h1>
        </div>
        {currentWeek && (
          <span className="font-mono text-[11px] text-ink3 tnum pb-1 whitespace-nowrap">
            {weekLabel(currentWeek.starts_on, currentWeek.ends_on)}
          </span>
        )}
      </header>

      {crown && (
        <p className="mb-4 rounded-[10px] bg-brassSoft border-l-[3px] border-brass px-4 py-3 text-[16px]">
          {crown}
        </p>
      )}

      <Board
        groupId={groupId}
        entries={current.entries}
        awaiting={current.awaiting}
        awaitingLabel={closed ? "Missed" : "Pending"}
        viewerId={viewerId}
        signedUrls={signedUrls}
      />

      {!closed && !windowOpen && (
        <p className="pt-4 font-mono text-[11.5px] text-ink3 leading-relaxed">
          Uploads open {isoDayName(group.opens_dow)} at {formatHour(group.opens_hour)} and
          close at {formatHour(group.closes_hour)}. Everyone screenshots at the same point
          in the week — that&rsquo;s what makes the numbers comparable.
        </p>
      )}

      {closed && (
        <p className="pt-4 font-mono text-[11.5px] text-ink3 leading-relaxed">
          This week is finished. A fresh one starts Sunday.
        </p>
      )}

      {previousWeek && previous.entries.length > 0 && (
        <section className="pt-9 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow">Last week</span>
            <span className="font-mono text-[11px] text-ink3 tnum">
              {weekLabel(previousWeek.starts_on, previousWeek.ends_on)}
            </span>
          </div>
          <Board
            groupId={groupId}
            entries={previous.entries}
            awaiting={[]}
            awaitingLabel="Missed"
            viewerId={viewerId}
            signedUrls={signedUrls}
          />
        </section>
      )}

      {/* Clearance for the fixed upload button and its caption, which would
          otherwise sit on top of the last rows of the table. */}
      {windowOpen && currentWeek && <div aria-hidden className="h-28" />}

      {windowOpen && currentWeek && (
        <div
          className="fixed bottom-[62px] inset-x-0 px-4 pt-10 pb-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
            // Content fades out under the button instead of being cut off by it.
            background: "linear-gradient(to top, var(--ground) 62%, transparent)",
          }}
        >
          <div className="mx-auto max-w-[560px]">
            <Link
              href={`/g/${groupId}/upload`}
              className="block w-full text-center rounded-[10px] bg-ink text-ground px-4 py-[15px] font-display font-semibold text-[15px] shadow-lg"
            >
              {mine ? `Change your ${formatMinutes(mine.minutes)}` : "Upload screenshot"}
            </Link>
            <p className="pt-2 text-center font-mono text-[10.5px] text-ink3">
              Window closes {formatHour(group.closes_hour)} · {windowLabel(group)}
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}
