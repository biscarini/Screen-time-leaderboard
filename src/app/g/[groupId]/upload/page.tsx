import Link from "next/link";
import { Shell, PageHeader } from "@/components/Shell";
import { loadGroup } from "@/lib/data";
import { submissionFor } from "@/lib/stats";
import { isoDayName, formatHour } from "@/lib/time";
import { UploadFlow } from "./UploadFlow";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await loadGroup(groupId);
  const { group, currentWeek, windowOpen, viewerId } = data;

  if (!windowOpen || !currentWeek || currentWeek.status !== "open") {
    return (
      <Shell>
        <PageHeader eyebrow="Not yet" title="The window is closed" />
        <p className="card px-4 py-5 text-[16px] text-ink2 leading-relaxed">
          Uploads open {isoDayName(group.opens_dow)} at {formatHour(group.opens_hour)} and
          close {isoDayName(group.closes_dow)} at {formatHour(group.closes_hour)},{" "}
          {group.timezone.replace(/_/g, " ")} — once the week has actually finished, so
          everyone&rsquo;s average covers the same seven days.
        </p>
        <Link
          href={`/g/${groupId}`}
          className="mt-4 block text-center rounded-[10px] bg-surface2 border border-rule py-3 font-display font-semibold text-[14px]"
        >
          Back to the board
        </Link>
      </Shell>
    );
  }

  const mine = submissionFor(data, currentWeek.id, viewerId);

  return (
    <Shell>
      <PageHeader
        eyebrow={mine ? "Change your number" : "Your week"}
        title={mine ? "New screenshot" : "Upload screenshot"}
      />
      <UploadFlow
        groupId={groupId}
        weekId={currentWeek.id}
        userId={viewerId}
        existingMinutes={mine?.minutes ?? null}
      />
    </Shell>
  );
}
