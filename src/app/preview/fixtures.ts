import type { GroupData, HistoryRow, Member, Week } from "@/lib/types";

/**
 * A believable group, for looking at the UI without a database behind it.
 * Numbers match the worked example in docs/spec.md.
 */

const GROUP = {
  id: "00000000-0000-0000-0000-0000000000g0",
  name: "Sunday League",
  invite_code: "K7MRPQ",
  timezone: "America/New_York",
  opens_dow: 6,
  opens_hour: 6,
  closes_dow: 6,
  closes_hour: 12,
  created_by: "u-jake",
};

const MEMBERS: Member[] = [
  { id: "u-jake",  display_name: "Jake",  avatar_url: null, role: "admin" },
  { id: "u-marco", display_name: "Marco", avatar_url: null, role: "member" },
  { id: "u-chris", display_name: "Chris", avatar_url: null, role: "member" },
  { id: "u-sam",   display_name: "Sam",   avatar_url: null, role: "member" },
  { id: "u-ryan",  display_name: "Ryan",  avatar_url: null, role: "member" },
];

const WEEK_TWO_AGO: Week = {
  id: "w-0", group_id: GROUP.id,
  starts_on: "2026-08-02", ends_on: "2026-08-08", status: "closed",
};
const LAST_WEEK: Week = {
  id: "w-1", group_id: GROUP.id,
  starts_on: "2026-08-09", ends_on: "2026-08-15", status: "closed",
};
const THIS_WEEK: Week = {
  id: "w-2", group_id: GROUP.id,
  starts_on: "2026-08-16", ends_on: "2026-08-22", status: "open",
};

/** minutes by week, per member — undefined means they didn't submit */
const MINUTES: Record<string, [number | undefined, number | undefined, number | undefined]> = {
  "u-jake":  [131, 120, 102],
  "u-marco": [166, 157, 126],
  "u-chris": [150, 159, 171],
  "u-sam":   [222, 210, 204],
  "u-ryan":  [255, 240, undefined],
};

function buildHistory(weeks: Week[]): HistoryRow[] {
  const rows: HistoryRow[] = [];

  weeks.forEach((week, weekIndex) => {
    const present = MEMBERS.flatMap((member) => {
      const minutes = MINUTES[member.id][weekIndex];
      return minutes == null ? [] : [{ member, minutes }];
    }).sort((a, b) => a.minutes - b.minutes);

    present.forEach(({ member, minutes }, position) => {
      const previous = weekIndex === 0 ? null : MINUTES[member.id][weekIndex - 1] ?? null;
      rows.push({
        group_id: GROUP.id,
        week_id: week.id,
        starts_on: week.starts_on,
        ends_on: week.ends_on,
        status: week.status,
        user_id: member.id,
        minutes,
        screenshot_path: `${GROUP.id}/${week.id}/${member.id}/shot.jpg`,
        was_corrected: member.id === "u-marco" && weekIndex === 2,
        submitted_at: `${week.ends_on}T11:12:00Z`,
        rank: position + 1,
        prev_minutes: previous,
        delta_minutes: previous == null ? null : minutes - previous,
      });
    });
  });

  return rows.reverse();
}

const BASE: GroupData = {
  group: GROUP,
  members: MEMBERS,
  weeks: [THIS_WEEK, LAST_WEEK, WEEK_TWO_AGO],
  history: buildHistory([WEEK_TWO_AGO, LAST_WEEK, THIS_WEEK]),
  currentWeek: THIS_WEEK,
  windowOpen: true,
  viewerId: "u-marco",
};

/** Saturday morning: the window is open and four of five are in. */
export const windowOpenData: GroupData = BASE;

/** Midweek: nobody has submitted, last week's table sits below. */
export const midweekData: GroupData = {
  ...BASE,
  windowOpen: false,
  history: BASE.history.filter((r) => r.week_id !== THIS_WEEK.id),
};

/** After noon on Saturday: final, winner crowned. */
export const closedData: GroupData = {
  ...BASE,
  windowOpen: false,
  weeks: [{ ...THIS_WEEK, status: "closed" }, LAST_WEEK, WEEK_TWO_AGO],
  currentWeek: { ...THIS_WEEK, status: "closed" },
  history: BASE.history.map((r) =>
    r.week_id === THIS_WEEK.id ? { ...r, status: "closed" as const } : r,
  ),
};

export const previewMembers = MEMBERS;
export const previewGroup = GROUP;
