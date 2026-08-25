import { Shell, PageHeader } from "@/components/Shell";
import { Avatar } from "@/components/Avatar";
import { leaveGroup } from "@/lib/actions";
import { windowLabel } from "@/lib/time";
import { InviteCode } from "@/app/g/[groupId]/settings/InviteCode";
import { SettingsForm } from "@/app/g/[groupId]/settings/SettingsForm";
import type { GroupData } from "@/lib/types";

export function SettingsView({ data }: { data: GroupData }) {
  const groupId = data.group.id;
  const isAdmin =
    data.members.find((m) => m.id === data.viewerId)?.role === "admin";

  return (
    <Shell>
      <PageHeader eyebrow={data.group.name} title="Settings" />

      <div className="flex flex-col gap-8">
        <InviteCode code={data.group.invite_code} groupName={data.group.name} />

        <section className="flex flex-col gap-3">
          <span className="eyebrow">
            {data.members.length} {data.members.length === 1 ? "member" : "members"}
          </span>
          <ul className="card overflow-hidden">
            {data.members.map((member, index) => (
              <li
                key={member.id}
                className={[
                  "px-4 py-3 flex items-center gap-3",
                  index < data.members.length - 1 ? "border-b border-ruleSoft" : "",
                ].join(" ")}
              >
                <Avatar profile={member} size={30} />
                <span className="flex-1 font-display font-medium text-[15.5px] truncate">
                  {member.display_name}
                  {member.id === data.viewerId && (
                    <span className="text-ink3 font-normal"> · you</span>
                  )}
                </span>
                {member.role === "admin" && (
                  <span className="font-mono text-[11px] text-ink3">admin</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <span className="eyebrow">The week</span>
          {isAdmin ? (
            <SettingsForm group={data.group} />
          ) : (
            <div className="card px-4 py-4 flex flex-col gap-1.5">
              <p className="text-[16px]">
                Uploads open {windowLabel(data.group)}.
              </p>
              <p className="font-mono text-[11.5px] text-ink3">
                {data.group.timezone.replace(/_/g, " ")} · only an admin can change this.
              </p>
            </div>
          )}
        </section>

        <form action={leaveGroup} className="pt-2">
          <input type="hidden" name="group_id" value={groupId} />
          <button className="font-mono text-[11.5px] text-up hover:underline">
            Leave this group
          </button>
        </form>
      </div>
    </Shell>
  );
}
