import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/Avatar";
import { loadGroup, signScreenshots } from "@/lib/data";
import { memberStats } from "@/lib/stats";
import { delta, formatDelta, formatMinutes, weekShort } from "@/lib/time";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <span className="eyebrow">{label}</span>
      <span className="font-display font-semibold text-[19px] tnum">{value}</span>
    </div>
  );
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ groupId: string; userId: string }>;
}) {
  const { groupId, userId } = await params;
  const data = await loadGroup(groupId);

  const member = data.members.find((m) => m.id === userId);
  if (!member) notFound();

  const stats = memberStats(data, userId);
  const signedUrls = await signScreenshots(stats.rows.map((r) => r.screenshot_path));
  const worst = Math.max(...stats.rows.map((r) => r.minutes), 1);
  const isViewer = userId === data.viewerId;

  return (
    <Shell>
      <header className="flex items-center gap-3.5 pt-8 pb-6">
        <Avatar profile={member} size={54} />
        <div className="flex flex-col gap-0.5">
          <span className="eyebrow">{isViewer ? "You" : "Member"}</span>
          <h1 className="font-display font-bold text-[25px] leading-tight tracking-[-0.02em]">
            {member.display_name}
          </h1>
        </div>
      </header>

      <div className="card grid grid-cols-2 divide-x divide-y divide-ruleSoft [&>*:nth-child(-n+2)]:border-t-0">
        <Stat
          label="This week"
          value={stats.current ? formatMinutes(stats.current.minutes) : "—"}
        />
        <Stat label="Personal best" value={formatMinutes(stats.best)} />
        <Stat label="Average" value={formatMinutes(stats.average)} />
        <Stat
          label="Weekly wins"
          value={String(stats.wins)}
        />
      </div>

      {stats.trend && stats.trend.direction !== "flat" && (
        <p className="pt-3 font-mono text-[11.5px] text-ink3">
          Latest week{" "}
          <span className={stats.trend.direction === "down" ? "text-down" : "text-up"}>
            {formatDelta(stats.trend)}
          </span>{" "}
          on the one before.
        </p>
      )}

      <section className="pt-9 flex flex-col gap-3">
        <span className="eyebrow">Every week</span>

        {stats.rows.length === 0 ? (
          <p className="card px-4 py-5 text-[15px] text-ink3">
            No weeks logged yet.
          </p>
        ) : (
          <ol className="card overflow-hidden">
            {stats.rows
              .slice()
              .reverse()
              .map((row, index, all) => {
                const change = delta(row.minutes, row.prev_minutes);
                const url = signedUrls[row.screenshot_path];
                return (
                  <li
                    key={row.week_id}
                    className={[
                      "px-4 py-3 flex flex-col gap-2",
                      index < all.length - 1 ? "border-b border-ruleSoft" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[11.5px] text-ink3 tnum">
                        {weekShort(row.starts_on, row.ends_on)}
                        {row.rank === 1 && row.status === "closed" && (
                          <span className="text-brassInk"> · won</span>
                        )}
                      </span>
                      <span className="flex items-baseline gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-ink3 hover:text-ink"
                          >
                            screenshot
                          </a>
                        )}
                        <span className="font-mono font-medium text-[13.5px] tnum">
                          {formatMinutes(row.minutes)}
                        </span>
                        {change && change.direction !== "flat" && (
                          <span
                            className={[
                              "font-mono text-[11px] tnum",
                              change.direction === "down" ? "text-down" : "text-up",
                            ].join(" ")}
                          >
                            {formatDelta(change)}
                          </span>
                        )}
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className="h-1.5 rounded-full bg-sunken overflow-hidden"
                    >
                      <span
                        className={[
                          "block h-full rounded-full",
                          row.minutes === stats.best ? "bg-brass" : "bg-ink3",
                        ].join(" ")}
                        style={{ width: `${Math.max(4, (row.minutes / worst) * 100)}%` }}
                      />
                    </span>
                  </li>
                );
              })}
          </ol>
        )}
      </section>
    </Shell>
  );
}
