import { LeaderboardView } from "@/components/views/LeaderboardView";
import { MemberView } from "@/components/views/MemberView";
import { StatsView } from "@/components/views/StatsView";
import { SettingsView } from "@/components/views/SettingsView";
import { Shell, PageHeader } from "@/components/Shell";
import { ConfirmPreview } from "./ConfirmPreview";
import { LoginForm } from "@/app/login/LoginForm";
import { Nav } from "@/app/g/[groupId]/Nav";
import { UploadFlow } from "@/app/g/[groupId]/upload/UploadFlow";
import { closedData, midweekData, previewGroup, windowOpenData } from "./fixtures";
import type { GroupData } from "@/lib/types";
import Link from "next/link";

/** The in-group chrome: top bar plus bottom tabs, same as the real layout. */
function Chrome({
  data,
  tab,
  children,
}: {
  data: GroupData;
  tab: "board" | "stats" | "me";
  children: React.ReactNode;
}) {
  const base = `/g/${data.group.id}`;
  const activePath =
    tab === "board" ? base : tab === "stats" ? `${base}/stats` : `${base}/member/${data.viewerId}`;

  return (
    <>
      <div className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-[560px] px-4 h-12 flex items-center justify-between gap-3">
          <span className="font-mono text-[11.5px] text-ink3">← Groups</span>
          <span className="font-display font-semibold text-[14px] truncate">
            {data.group.name}
          </span>
          <span className="font-mono text-[11.5px] text-ink3">Settings</span>
        </div>
      </div>
      {children}
      <Nav groupId={data.group.id} viewerId={data.viewerId} activePath={activePath} />
    </>
  );
}

export const SCREENS: Record<
  string,
  { title: string; caption: string; render: () => React.ReactNode }
> = {
  "sign-in": {
    title: "Sign in",
    caption: "Magic link. No password to forget, no password to reset.",
    render: () => (
      <Shell>
        <div className="pt-16 pb-8 flex flex-col gap-3">
          <span className="eyebrow">Weekly, with your friends</span>
          <h1 className="font-display font-bold text-[38px] leading-[0.98] tracking-[-0.025em] text-balance">
            Screen Time Leaderboard
          </h1>
          <p className="text-[17px] text-ink2 leading-relaxed">
            Lowest average daily screen time wins. Everyone posts their Saturday
            screenshot, the app reads the number, the group gets ranked.
          </p>
        </div>
        <LoginForm />
      </Shell>
    ),
  },

  midweek: {
    title: "Leaderboard · midweek",
    caption:
      "Nobody has submitted yet, so last week's final table sits below. The screen is never empty.",
    render: () => (
      <Chrome data={midweekData} tab="board">
        <LeaderboardView data={midweekData} signedUrls={{}} />
      </Chrome>
    ),
  },

  open: {
    title: "Leaderboard · window open",
    caption:
      "Saturday morning. Four of five are in, Ryan is holding up the group, and the upload button is stuck to the thumb.",
    render: () => (
      <Chrome data={windowOpenData} tab="board">
        <LeaderboardView data={windowOpenData} signedUrls={{}} />
      </Chrome>
    ),
  },

  closed: {
    title: "Leaderboard · final",
    caption:
      "After noon. The order is locked, the winner is crowned, and the top line is worth screenshotting into the group chat.",
    render: () => (
      <Chrome data={closedData} tab="board">
        <LeaderboardView data={closedData} signedUrls={{}} />
      </Chrome>
    ),
  },

  upload: {
    title: "Upload",
    caption: "Step one. Camera roll, one tap.",
    render: () => (
      <Shell>
        <PageHeader eyebrow="Your week" title="Upload screenshot" />
        <UploadFlow
          groupId={previewGroup.id}
          weekId="w-2"
          userId="u-marco"
          existingMinutes={null}
        />
      </Shell>
    ),
  },

  confirm: {
    title: "Confirm",
    caption:
      "What the vision pass produces: the daily average to confirm, where the time went, and the pickups. Every value is confirmed by hand.",
    render: () => (
      <Shell>
        <PageHeader eyebrow="Your week" title="Upload screenshot" />
        <ConfirmPreview
          minutes={134}
          topApps={[
            { name: "Instagram", minutes: 165 },
            { name: "Messages", minutes: 110 },
            { name: "Google Maps", minutes: 57 },
          ]}
          pickupsTotal={875}
          pickupsDailyAvg={125}
        />
        <p className="pt-4 font-mono text-[11.5px] text-ink3 leading-relaxed">
          &ldquo;Fix it&rdquo; swaps in an hour/minute keypad. A failed read opens straight
          on that keypad instead — never a dead end.
        </p>
      </Shell>
    ),
  },

  "confirm-no-pickups": {
    title: "Confirm · before pickups",
    caption:
      "The Pickups card sits further down the report than the Screen Time card, so it takes a second screenshot. Offered, never required.",
    render: () => (
      <Shell>
        <PageHeader eyebrow="Your week" title="Upload screenshot" />
        <ConfirmPreview
          minutes={134}
          topApps={[
            { name: "Instagram", minutes: 165 },
            { name: "Messages", minutes: 110 },
            { name: "Google Maps", minutes: 57 },
          ]}
          offerPickups
        />
      </Shell>
    ),
  },

  profile: {
    title: "Profile",
    caption:
      "Every week as one bar, personal best in brass. One number per line, no charts.",
    render: () => (
      <Chrome data={windowOpenData} tab="me">
        <MemberView
          data={windowOpenData}
          member={windowOpenData.members[1]}
          signedUrls={{}}
        />
      </Chrome>
    ),
  },

  stats: {
    title: "Group stats",
    caption: "Five lines, each a sentence with a name in it.",
    render: () => (
      <Chrome data={windowOpenData} tab="stats">
        <StatsView data={windowOpenData} />
      </Chrome>
    ),
  },

  settings: {
    title: "Settings",
    caption:
      "The invite code, the members, and the window. Deliberately boring — except the window, which is the one setting that changes the competition.",
    render: () => (
      <Chrome data={{ ...windowOpenData, viewerId: "u-jake" }} tab="board">
        <SettingsView data={{ ...windowOpenData, viewerId: "u-jake" }} />
      </Chrome>
    ),
  },
};

export const SCREEN_ORDER = [
  "sign-in", "midweek", "open", "closed", "upload", "confirm", "confirm-no-pickups",
  "profile", "stats", "settings",
] as const;

export { Link };
