import Link from "next/link";
import { loadGroup } from "@/lib/data";
import { Nav } from "./Nav";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await loadGroup(groupId);

  return (
    <>
      <div className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-[560px] px-4 h-12 flex items-center justify-between gap-3">
          <Link href="/groups" className="font-mono text-[11.5px] text-ink3 hover:text-ink">
            ← Groups
          </Link>
          <span className="font-display font-semibold text-[14px] truncate">
            {data.group.name}
          </span>
          <Link
            href={`/g/${groupId}/settings`}
            className="font-mono text-[11.5px] text-ink3 hover:text-ink"
          >
            Settings
          </Link>
        </div>
      </div>
      {children}
      <Nav groupId={groupId} viewerId={data.viewerId} />
    </>
  );
}
