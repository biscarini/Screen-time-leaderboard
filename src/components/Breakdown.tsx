import { formatMinutes } from "@/lib/time";
import type { TopApp } from "@/lib/types";

/**
 * Where the week's time actually went. Three apps, proportional bars, and the
 * top app's bar always full — the comparison that matters is between a
 * person's own apps, not between people's totals.
 */
export function AppBreakdown({
  apps,
  label = "Where it went",
}: {
  apps: TopApp[];
  label?: string;
}) {
  if (apps.length === 0) return null;
  const worst = Math.max(...apps.map((a) => a.minutes), 1);

  return (
    <section className="flex flex-col gap-2.5">
      <span className="eyebrow">{label}</span>
      <ol className="card overflow-hidden">
        {apps.map((app, index) => (
          <li
            key={`${app.name}-${index}`}
            className={[
              "px-4 py-2.5 flex flex-col gap-1.5",
              index < apps.length - 1 ? "border-b border-ruleSoft" : "",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display font-medium text-[14.5px] truncate">
                {app.name}
              </span>
              <span className="font-mono text-[13px] tnum text-ink2 shrink-0">
                {formatMinutes(app.minutes)}
              </span>
            </div>
            <span aria-hidden className="h-1.5 rounded-full bg-sunken overflow-hidden">
              <span
                className={[
                  "block h-full rounded-full",
                  index === 0 ? "bg-brass" : "bg-ink3",
                ].join(" ")}
                style={{ width: `${Math.max(5, (app.minutes / worst) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Pickups. Tracked and shown, never ranked on. */
export function Pickups({
  total,
  dailyAverage,
}: {
  total: number | null;
  dailyAverage: number | null;
}) {
  if (total == null && dailyAverage == null) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <span className="eyebrow">Pickups</span>
      <div className="card grid grid-cols-2 divide-x divide-ruleSoft">
        <div className="flex flex-col gap-1 px-4 py-3">
          <span className="eyebrow">Total</span>
          <span className="font-display font-semibold text-[19px] tnum">
            {total ?? "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3">
          <span className="eyebrow">A day</span>
          <span className="font-display font-semibold text-[19px] tnum">
            {dailyAverage ?? "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
