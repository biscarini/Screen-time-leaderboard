import Link from "next/link";
import { Shell, PageHeader } from "@/components/Shell";
import { myGroups, requireProfile } from "@/lib/data";
import { signOut } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";
import { GroupForms } from "./GroupForms";

export default async function GroupsPage() {
  const profile = await requireProfile();
  const groups = await myGroups();

  return (
    <Shell>
      <PageHeader
        eyebrow="Signed in"
        title={groups.length ? "Your groups" : "Find your group"}
        action={
          <Link href="/welcome?next=/groups" aria-label="Edit your profile">
            <Avatar profile={profile} size={38} />
          </Link>
        }
      />

      {groups.length > 0 && (
        <ul className="flex flex-col gap-2 pb-8">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/g/${group.id}`}
                className="card px-4 py-4 flex items-center justify-between gap-3 active:bg-surface2"
              >
                <span className="font-display font-semibold text-[17px]">{group.name}</span>
                <span aria-hidden className="text-ink3">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <GroupForms hasGroups={groups.length > 0} />

      <form action={signOut} className="pt-10">
        <button className="font-mono text-[11.5px] text-ink3 hover:text-ink">
          Sign out
        </button>
      </form>
    </Shell>
  );
}
