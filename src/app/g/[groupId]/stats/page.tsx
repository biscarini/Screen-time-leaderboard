import { StatsView } from "@/components/views/StatsView";
import { loadGroup } from "@/lib/data";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <StatsView data={await loadGroup(groupId)} />;
}
