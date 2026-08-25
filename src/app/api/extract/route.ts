import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * `found: false` carries "no reliable reading" instead of a nullable number —
 * one less thing for strict JSON schema support to vary on, and the UI only
 * ever needs the boolean. The same trick is used for the optional numbers:
 * 0 means "not shown", never "the value is zero", because a week with zero
 * screen time or zero pickups is not a thing anyone will submit.
 */
const Extraction = z.object({
  found: z
    .boolean()
    .describe("true only if a Daily Average screen-time figure is clearly legible"),
  daily_average_minutes: z
    .number().int().min(0).max(1440)
    .describe("The Screen Time Daily Average in whole minutes. 0 when found is false."),
  total_minutes: z
    .number().int().min(0)
    .describe("Total Screen Time for the week in minutes, or 0 if not shown."),

  top_apps: z
    .array(
      z.object({
        name: z.string().describe("The app name exactly as it appears, e.g. Instagram"),
        minutes: z.number().int().min(0).max(10080).describe("That app's time in minutes"),
      }),
    )
    .describe(
      "Up to three entries from the 'Most Used' list, highest first. Empty if that list is not visible.",
    ),

  pickups_total: z
    .number().int().min(0).max(20000)
    .describe("Total Pickups for the week, or 0 if the Pickups card is not visible."),
  pickups_daily_avg: z
    .number().int().min(0).max(5000)
    .describe("The Pickups daily average, or 0 if the Pickups card is not visible."),

  week_scope: z
    .enum(["this_week", "last_week", "unknown"])
    .describe("Whether the header reads as the current week or a past one."),
  device_scope: z
    .enum(["all_devices", "single_device", "unknown"])
    .describe("Whether the report header says All Devices or names one device."),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().describe("One short sentence: what you read, and from where."),
});

const SYSTEM = `You read numbers off screenshots of Apple's iOS Screen Time report.

You may be given more than one image — the report is taller than a phone
screen, so people screenshot the top of it and then scroll down and screenshot
the Pickups card. Treat the images as one report and fill in whatever each one
shows. A field that appears in none of them stays 0 or empty.

WHAT TO READ

1. daily_average_minutes — the large figure directly beneath the words
   "Daily Average" in the SCREEN TIME card. This is the number that matters.
   It is NOT any of these, and confusing them is the main failure mode:
     - "Total Screen Time", usually a larger number lower in the same card
     - the Daily Average in the PICKUPS card, which counts pickups, not time
     - any per-app or per-category time
     - the y-axis labels on the bar chart

2. top_apps — up to three entries from the "Most Used" list, highest first,
   with each app's time in minutes. Read the app names exactly as shown.
   If the list shows categories (Social, Travel) rather than apps, leave it
   empty: categories are not apps.

3. pickups_total and pickups_daily_avg — from the PICKUPS card only. Total
   Pickups is a plain count, usually in the hundreds. Leave both 0 if that
   card is not in any image.

Convert every duration to whole minutes: "4h" is 240, "2h 14m" is 134,
"48m" is 48, "1h 33m" is 93.

Set found=false when the Screen Time Daily Average is cropped out, illegible,
obscured, or none of the images is an iOS Screen Time report. A wrong number is
far worse than an honest miss — the person can always type it themselves.`;

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let paths: string[];
  try {
    const body = (await request.json()) as { paths?: string[]; path?: string };
    paths = body.paths ?? (body.path ? [body.path] : []);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  paths = paths.filter(Boolean).slice(0, 2);
  if (paths.length === 0) {
    return NextResponse.json({ error: "No screenshot to read." }, { status: 400 });
  }

  // Downloading through the user's session means RLS decides whether they may
  // see these files — no separate membership check to keep in sync.
  const images = await Promise.all(
    paths.map(async (path) => {
      const { data: file } = await supabase.storage.from("screenshots").download(path);
      if (!file) return null;
      const mediaType = ["image/png", "image/jpeg", "image/webp"].includes(file.type)
        ? (file.type as "image/png" | "image/jpeg" | "image/webp")
        : "image/jpeg";
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        },
      };
    }),
  );

  const usable = images.filter((image) => image !== null);
  if (usable.length === 0) {
    return NextResponse.json({ error: "Could not open that screenshot." }, { status: 404 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(Extraction) },
      messages: [
        {
          role: "user",
          content: [
            ...usable,
            {
              type: "text",
              text:
                usable.length > 1
                  ? "These are two parts of one Screen Time report. Read the Daily Average, the Most Used apps, and the Pickups."
                  : "Read the Daily Average, and the Most Used apps and Pickups if they are visible.",
            },
          ],
        },
      ],
    });

    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed || !parsed.found) {
      return NextResponse.json({ found: false, extraction: parsed ?? null });
    }

    return NextResponse.json({
      found: true,
      minutes: parsed.daily_average_minutes,
      topApps: parsed.top_apps.slice(0, 3),
      pickupsTotal: parsed.pickups_total || null,
      pickupsDailyAvg: parsed.pickups_daily_avg || null,
      confidence: parsed.confidence,
      extraction: parsed,
    });
  } catch (error) {
    // Extraction is a convenience, never a gate. Fall through to manual entry.
    console.error("screen time extraction failed", error);
    return NextResponse.json({ found: false, extraction: null });
  }
}
