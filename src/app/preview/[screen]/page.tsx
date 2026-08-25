import { notFound } from "next/navigation";
import { SCREENS } from "../screens";

export const dynamic = "force-dynamic";

export default async function PreviewScreen({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  const entry = SCREENS[screen];
  if (!entry) notFound();
  return <>{entry.render()}</>;
}
