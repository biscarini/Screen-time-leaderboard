/** Pure derivations over what loadGroup() already fetched. No IO in here. */

import { delta, type Delta } from "@/lib/time";
import type { GroupData, HistoryRow, Member, Week } from "@/lib/types";

export type Entry = {
  member: Member;
  rank: number;
  minutes: number;
  change: Delta;
  screenshotPath: string;
  wasCorrected: boolean;
};

export type Standing = {
  week: Week | null;
  entries: Entry[];
  /** Members with no submission for this week. */
  awaiting: Member[];
};

function byId(members: Member[]): Map<string, Member> {
  return new Map(members.map((m) => [m.id, m]));
}

export function standingsFor(data: GroupData, weekId: string | null): Standing {
  const week = data.weeks.find((w) => w.id === weekId) ?? null;
  if (!week) return { week: null, entries: [], awaiting: data.members };

  const lookup = byId(data.members);
  const rows = data.history.filter((r) => r.week_id === week.id);

  const entries: Entry[] = rows
    .flatMap((r) => {
      const member = lookup.get(r.user_id);
      if (!member) return [];
      return [{
        member,
        rank: r.rank,
        minutes: r.minutes,
        change: delta(r.minutes, r.prev_minutes),
        screenshotPath: r.screenshot_path,
        wasCorrected: r.was_corrected,
      }];
    })
    .sort((a, b) => a.minutes - b.minutes || a.member.display_name.localeCompare(b.member.display_name));

  const submitted = new Set(rows.map((r) => r.user_id));
  const awaiting = data.members.filter((m) => !submitted.has(m.id));

  return { week, entries, awaiting };
}

export function submissionFor(
  data: GroupData,
  weekId: string | null,
  userId: string,
): HistoryRow | null {
  return data.history.find((r) => r.week_id === weekId && r.user_id === userId) ?? null;
}

/* --- one person --------------------------------------------------------- */

export type MemberStats = {
  rows: HistoryRow[]; // oldest first
  current: HistoryRow | null;
  best: number | null;
  average: number | null;
  wins: number;
  trend: Delta;
};

export function memberStats(data: GroupData, userId: string): MemberStats {
  const rows = data.history
    .filter((r) => r.user_id === userId)
    .slice()
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));

  const minutes = rows.map((r) => r.minutes);
  const latest = rows[rows.length - 1] ?? null;

  return {
    rows,
    current: rows.find((r) => r.week_id === data.currentWeek?.id) ?? null,
    best: minutes.length ? Math.min(...minutes) : null,
    average: minutes.length
      ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)
      : null,
    wins: rows.filter((r) => r.rank === 1 && r.status === "closed").length,
    trend: latest ? delta(latest.minutes, latest.prev_minutes) : null,
  };
}

/* --- the group ---------------------------------------------------------- */

export type GroupStats = {
  lastClosedWeek: Week | null;
  winner: { member: Member; minutes: number } | null;
  record: { member: Member; minutes: number; week: Week } | null;
  mostImproved: { member: Member; by: number } | null;
  streak: { member: Member; weeks: number } | null;
  wins: { member: Member; wins: number }[];
};

export function groupStats(data: GroupData): GroupStats {
  const lookup = byId(data.members);
  const closed = data.weeks
    .filter((w) => w.status === "closed")
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on)); // newest first
  const lastClosedWeek = closed[0] ?? null;

  // Weekly winner — first place in the most recent finished week.
  let winner: GroupStats["winner"] = null;
  if (lastClosedWeek) {
    const top = data.history
      .filter((r) => r.week_id === lastClosedWeek.id && r.rank === 1)
      .sort((a, b) => a.minutes - b.minutes)[0];
    const member = top && lookup.get(top.user_id);
    if (top && member) winner = { member, minutes: top.minutes };
  }

  // Group record — the lowest week anyone has ever posted.
  let record: GroupStats["record"] = null;
  for (const r of data.history) {
    if (record && r.minutes >= record.minutes) continue;
    const member = lookup.get(r.user_id);
    const week = data.weeks.find((w) => w.id === r.week_id);
    if (member && week) record = { member, minutes: r.minutes, week };
  }

  // Most improved — biggest drop in the most recent finished week.
  let mostImproved: GroupStats["mostImproved"] = null;
  if (lastClosedWeek) {
    for (const r of data.history) {
      if (r.week_id !== lastClosedWeek.id) continue;
      if (r.delta_minutes == null || r.delta_minutes >= 0) continue;
      const by = -r.delta_minutes;
      if (mostImproved && by <= mostImproved.by) continue;
      const member = lookup.get(r.user_id);
      if (member) mostImproved = { member, by };
    }
  }

  // Current streak — consecutive wins running back from the latest closed week.
  let streak: GroupStats["streak"] = null;
  for (const member of data.members) {
    let run = 0;
    for (const week of closed) {
      const row = data.history.find(
        (r) => r.week_id === week.id && r.user_id === member.id,
      );
      if (row?.rank === 1) run += 1;
      else break;
    }
    if (run > 0 && (!streak || run > streak.weeks)) streak = { member, weeks: run };
  }

  const wins = data.members
    .map((member) => ({
      member,
      wins: data.history.filter(
        (r) => r.user_id === member.id && r.rank === 1 && r.status === "closed",
      ).length,
    }))
    .filter((w) => w.wins > 0)
    .sort((a, b) => b.wins - a.wins || a.member.display_name.localeCompare(b.member.display_name));

  return { lastClosedWeek, winner, record, mostImproved, streak, wins };
}
