export type Group = {
  id: string;
  name: string;
  invite_code: string;
  timezone: string;
  opens_dow: number;
  opens_hour: number;
  closes_dow: number;
  closes_hour: number;
  created_by: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type Member = Profile & { role: "member" | "admin" };

export type Week = {
  id: string;
  group_id: string;
  starts_on: string;
  ends_on: string;
  status: "open" | "closed";
};

/** One entry from the report's "Most Used" list. */
export type TopApp = { name: string; minutes: number };

/** A row of member_week_history. */
export type HistoryRow = {
  group_id: string;
  week_id: string;
  starts_on: string;
  ends_on: string;
  status: "open" | "closed";
  user_id: string;
  minutes: number;
  screenshot_path: string;
  pickups_screenshot_path: string | null;
  top_apps: TopApp[];
  pickups_total: number | null;
  pickups_daily_avg: number | null;
  was_corrected: boolean;
  submitted_at: string;
  rank: number;
  prev_minutes: number | null;
  delta_minutes: number | null;
};

export type GroupData = {
  group: Group;
  members: Member[];
  weeks: Week[];
  history: HistoryRow[];
  currentWeek: Week | null;
  windowOpen: boolean;
  viewerId: string;
};
