import { notFound } from "next/navigation";
import { MemberView } from "@/components/views/MemberView";
import { loadGroup, signScreenshots } from "@/lib/data";
import { memberStats } from "@/lib/stats";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ groupId: string; userId: string }>;
}) {
  const { groupId, userId } = await params;
  const data = await loadGroup(groupId);

  const member = data.members.find((m) => m.id === userId);
  if (!member) notFound();

  const signedUrls = await signScreenshots(
    memberStats(data, userId).rows.map((r) => r.screenshot_path),
  );

  return <MemberView data={data} member={member} signedUrls={signedUrls} />;
}
