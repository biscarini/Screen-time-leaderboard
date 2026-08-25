"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { submitScreenTime } from "@/lib/actions";
import { downscale } from "@/lib/image";
import { formatMinutes } from "@/lib/time";
import { ErrorNote } from "@/components/ui";

type Stage = "pick" | "reading" | "confirm" | "edit" | "saving";

export function UploadFlow({
  groupId,
  weekId,
  userId,
  existingMinutes,
}: {
  groupId: string;
  weekId: string;
  userId: string;
  existingMinutes: number | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [path, setPath] = useState<string>();
  const [detected, setDetected] = useState<number | null>(null);
  const [extraction, setExtraction] = useState<unknown>(null);
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(undefined);
    setStage("reading");
    setPreview(URL.createObjectURL(file));

    try {
      const supabase = supabaseBrowser();
      const blob = await downscale(file, 1280, 0.85);
      const key = `${groupId}/${weekId}/${userId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(key, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      setPath(key);

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: key }),
      });
      const result = await response.json();

      setExtraction(result.extraction ?? null);

      if (result.found && typeof result.minutes === "number") {
        setDetected(result.minutes);
        setHours(String(Math.floor(result.minutes / 60)));
        setMins(String(result.minutes % 60));
        setStage("confirm");
      } else {
        // A failed read is never a dead end — go straight to the keypad.
        setDetected(null);
        setStage("edit");
      }
    } catch {
      setError("That screenshot didn't upload. Check your connection and try again.");
      setStage("pick");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save(minutes: number) {
    if (!path) return;
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
      setError("Enter a daily average between 0 and 24 hours.");
      return;
    }

    setError(undefined);
    setStage("saving");
    const result = await submitScreenTime({
      groupId,
      weekId,
      minutes: Math.round(minutes),
      detectedMinutes: detected,
      screenshotPath: path,
      extraction,
    });

    if (result.error) {
      setError(result.error);
      setStage(detected == null ? "edit" : "confirm");
      return;
    }

    router.push(`/g/${groupId}`);
    router.refresh();
  }

  /* --- pick ------------------------------------------------------------ */
  if (stage === "pick" || stage === "reading") {
    return (
      <div className="flex flex-col gap-4">
        <div className="card px-5 py-8 flex flex-col items-center gap-4 text-center">
          {stage === "reading" ? (
            <>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="h-40 w-auto rounded-lg border border-rule object-contain"
                />
              )}
              <span className="eyebrow">Reading the screenshot</span>
              <span
                aria-hidden
                className="h-1 w-24 rounded-full bg-sunken overflow-hidden relative"
              >
                <span className="absolute inset-y-0 left-0 w-1/3 bg-brass animate-pulse rounded-full" />
              </span>
            </>
          ) : (
            <>
              <span className="eyebrow">Step one</span>
              <p className="text-[17px] text-ink2 max-w-[34ch] leading-relaxed">
                Open Settings → Screen Time, tap <strong className="text-ink">Week</strong>,
                and screenshot the top of the report.
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="w-full rounded-[10px] bg-ink text-ground px-4 py-[15px] font-display font-semibold text-[15px]"
              >
                Choose screenshot
              </button>
            </>
          )}
        </div>

        <ErrorNote message={error} />

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />

        {existingMinutes != null && (
          <p className="font-mono text-[11.5px] text-ink3 text-center">
            You&rsquo;re down for {formatMinutes(existingMinutes)} this week. A new upload
            replaces it.
          </p>
        )}
      </div>
    );
  }

  /* --- confirm --------------------------------------------------------- */
  if (stage === "confirm" || stage === "saving") {
    return (
      <div className="flex flex-col gap-4">
        <div className="card px-6 py-8 flex flex-col items-center gap-1 text-center">
          <span className="eyebrow">Detected screen time</span>
          <span className="font-display font-bold text-[46px] leading-[1.1] tracking-[-0.03em] tnum">
            {formatMinutes(detected ?? 0)}
          </span>
          <span className="font-mono text-[11px] text-ink3 pb-5">
            read from &ldquo;Daily Average&rdquo;
          </span>
          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              disabled={stage === "saving"}
              onClick={() => save(detected ?? 0)}
              className="flex-1 rounded-[10px] bg-ink text-ground py-3 font-display font-semibold text-[14px] disabled:opacity-60"
            >
              {stage === "saving" ? "Saving…" : "Looks right"}
            </button>
            <button
              type="button"
              disabled={stage === "saving"}
              onClick={() => setStage("edit")}
              className="flex-1 rounded-[10px] bg-surface2 border border-rule py-3 font-display font-semibold text-[14px] disabled:opacity-60"
            >
              Fix it
            </button>
          </div>
        </div>
        <ErrorNote message={error} />
      </div>
    );
  }

  /* --- edit ------------------------------------------------------------ */
  return (
    <div className="flex flex-col gap-4">
      <div className="card px-6 py-7 flex flex-col gap-5">
        <div className="flex flex-col gap-1 text-center">
          <span className="eyebrow">
            {detected == null ? "Type it in" : "Correct the reading"}
          </span>
          {detected == null && (
            <p className="text-[15px] text-ink2 pt-1">
              Couldn&rsquo;t read that one. What does your Daily Average say?
            </p>
          )}
        </div>

        <div className="flex items-end justify-center gap-3">
          <label className="flex flex-col items-center gap-1.5">
            <input
              className="field text-center font-display font-bold text-[30px] tnum w-[92px]"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="2"
              value={hours}
              onChange={(e) => setHours(e.target.value.replace(/\D/g, ""))}
            />
            <span className="eyebrow">hours</span>
          </label>
          <label className="flex flex-col items-center gap-1.5">
            <input
              className="field text-center font-display font-bold text-[30px] tnum w-[92px]"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="14"
              value={mins}
              onChange={(e) => setMins(e.target.value.replace(/\D/g, ""))}
            />
            <span className="eyebrow">minutes</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => save(Number(hours || 0) * 60 + Number(mins || 0))}
          className="w-full rounded-[10px] bg-ink text-ground py-[13px] font-display font-semibold text-[15px]"
        >
          Submit {formatMinutes(Number(hours || 0) * 60 + Number(mins || 0))}
        </button>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
