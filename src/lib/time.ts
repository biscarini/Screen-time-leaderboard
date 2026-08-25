/** Everything screen-time is an integer number of minutes. Formatting lives here. */

export function formatMinutes(total: number | null | undefined): string {
  if (total == null) return "—";
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${String(rem).padStart(2, "0")}m`;
}

/** "2h 14m" -> 134. Also accepts "134", "2:14", "2 h 14 min". */
export function parseMinutes(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  const hm = s.match(/^(\d+)\s*(?:h|hr|hrs|hour|hours|:)\s*(\d+)?\s*(?:m|min|mins|minutes)?$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);

  const hOnly = s.match(/^(\d+)\s*(?:h|hr|hrs|hour|hours)$/);
  if (hOnly) return Number(hOnly[1]) * 60;

  const mOnly = s.match(/^(\d+)\s*(?:m|min|mins|minutes)?$/);
  if (mOnly) return Number(mOnly[1]);

  return null;
}

export type Delta = { minutes: number; direction: "down" | "up" | "flat" } | null;

export function delta(current: number, previous: number | null | undefined): Delta {
  if (previous == null) return null;
  const d = current - previous;
  if (d === 0) return { minutes: 0, direction: "flat" };
  return { minutes: Math.abs(d), direction: d < 0 ? "down" : "up" };
}

export function formatDelta(d: Delta): string {
  if (!d) return "";
  if (d.direction === "flat") return "even";
  return `${d.direction === "down" ? "↓" : "↑"} ${formatMinutes(d.minutes)}`;
}

/* --- dates -------------------------------------------------------------- */
/* `starts_on` / `ends_on` are plain YYYY-MM-DD strings with no timezone.
   Parse them as UTC so they never shift a day under the viewer's clock. */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Sun 17 – Sat 23" */
export function weekLabel(startsOn: string, endsOn: string): string {
  const a = utcDate(startsOn);
  const b = utcDate(endsOn);
  return `${DAYS[a.getUTCDay()]} ${a.getUTCDate()} – ${DAYS[b.getUTCDay()]} ${b.getUTCDate()}`;
}

/** "17–23 Nov" */
export function weekShort(startsOn: string, endsOn: string): string {
  const a = utcDate(startsOn);
  const b = utcDate(endsOn);
  return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/* --- the submission window --------------------------------------------- */

/** ISO day of week (1 = Mon … 7 = Sun) to a full day name. */
export function isoDayName(iso: number): string {
  return DAYS_FULL[iso % 7];
}

export function formatHour(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

export function windowLabel(g: {
  opens_dow: number; opens_hour: number;
  closes_dow: number; closes_hour: number;
}): string {
  const open = `${isoDayName(g.opens_dow)} ${formatHour(g.opens_hour)}`;
  return g.opens_dow === g.closes_dow
    ? `${open}–${formatHour(g.closes_hour)}`
    : `${open} – ${isoDayName(g.closes_dow)} ${formatHour(g.closes_hour)}`;
}
