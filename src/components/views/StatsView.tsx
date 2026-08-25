import Link from "next/link";
import { Shell, PageHeader } from "@/components/Shell";
import { Avatar } from "@/components/Avatar";
import { groupStats } from "@/lib/stats";
import { formatMinutes, weekShort } from "@/lib/time";
import type { GroupData } from "@/lib/types";

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="px-4 py-3.5 border-b border-ruleSoft last:border-b-0 flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span className="text-[16px] leading-snug">{children}</span>
    </li>
  );
}

export function StatsView({ data }: { data: GroupData }) {
  const groupId = data.group.id;
  const stats = groupStats(data);

  const name = (id: string) =>
    data.members.find((m) => m.id === id)?.display_name ?? "Someone";

  return (
    <Shell>
      <PageHeader eyebrow={data.group.name} title="Group stats" />

      <ul className="card overflow-hidden">
        <Line label="Weekly winner">
          {stats.winner && stats.lastClosedWeek ? (
            <>
              <strong className="font-display font-semibold">
                {name(stats.winner.member.id)}
              </strong>{" "}
              took {weekShort(stats.lastClosedWeek.starts_on, stats.lastClosedWeek.ends_on)}{" "}
              at <span className="font-mono text-[15px] tnum">{formatMinutes(stats.winner.minutes)}</span>.
            </>
          ) : (
            <span className="text-ink3">No week has finished yet.</span>
          )}
        </Line>

        <Line label="Group record">
          {stats.record ? (
            <>
              <strong className="font-display font-semibold">
                {name(stats.record.member.id)}
              </strong>
              &rsquo;s{" "}
              <span className="font-mono text-[15px] tnum">
                {formatMinutes(stats.record.minutes)}
              </span>{" "}
              in {weekShort(stats.record.week.starts_on, stats.record.week.ends_on)} is the
              one to beat.
            </>
          ) : (
            <span className="text-ink3">Nothing logged yet.</span>
          )}
        </Line>

        <Line label="Most improved">
          {stats.mostImproved ? (
            <>
              <strong className="font-display font-semibold">
                {name(stats.mostImproved.member.id)}
              </strong>{" "}
              cut{" "}
              <span className="font-mono text-[15px] tnum text-down">
                {formatMinutes(stats.mostImproved.by)}
              </span>{" "}
              off the week before.
            </>
          ) : (
            <span className="text-ink3">Nobody dropped their average last week.</span>
          )}
        </Line>

        <Line label="Current streak">
          {stats.streak ? (
            <>
              <strong className="font-display font-semibold">
                {name(stats.streak.member.id)}
              </strong>{" "}
              has won {stats.streak.weeks}{" "}
              {stats.streak.weeks === 1 ? "week" : "weeks"} in a row.
            </>
          ) : (
            <span className="text-ink3">Nobody is on a run.</span>
          )}
        </Line>
      </ul>

      <section className="pt-9 flex flex-col gap-3">
        <span className="eyebrow">All-time wins</span>
        {stats.wins.length === 0 ? (
          <p className="card px-4 py-5 text-[15px] text-ink3">
            Still everyone&rsquo;s to win.
          </p>
        ) : (
          <ol className="card overflow-hidden">
            {stats.wins.map((row, index) => (
              <li
                key={row.member.id}
                className={[
                  "px-4 py-3 flex items-center gap-3",
                  index < stats.wins.length - 1 ? "border-b border-ruleSoft" : "",
                ].join(" ")}
              >
                <Avatar profile={row.member} size={30} />
                <Link
                  href={`/g/${groupId}/member/${row.member.id}`}
                  className="flex-1 font-display font-medium text-[15.5px] truncate"
                >
                  {row.member.display_name}
                </Link>
                <span className="font-mono text-[13px] tnum text-brassInk">
                  {row.wins} {row.wins === 1 ? "win" : "wins"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}
