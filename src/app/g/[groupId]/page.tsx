import { LeaderboardView } from "@/components/views/LeaderboardView";
import { loadGroup, signScreenshots } from "@/lib/data";
import { standingsFor } from "@/lib/stats";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await loadGroup(groupId);

  const previousWeek =
    data.weeks.find((w) => w.status === "closed" && w.id !== data.currentWeek?.id) ?? null;

  const signedUrls = await signScreenshots([
    ...standingsFor(data, data.currentWeek?.id ?? null).entries.map((e) => e.screenshotPath),
    ...standingsFor(data, previousWeek?.id ?? null).entries.map((e) => e.screenshotPath),
  ]);

  return <LeaderboardView data={data} signedUrls={signedUrls} />;
}
