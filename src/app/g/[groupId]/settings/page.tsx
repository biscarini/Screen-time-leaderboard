import { SettingsView } from "@/components/views/SettingsView";
import { loadGroup } from "@/lib/data";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <SettingsView data={await loadGroup(groupId)} />;
}
