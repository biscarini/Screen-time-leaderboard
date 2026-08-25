import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * `found: false` carries "no reliable reading" instead of a nullable number —
 * one less thing for strict JSON schema support to vary on, and the UI only
 * ever needs the boolean.
 */
const Extraction = z.object({
  found: z
    .boolean()
    .describe("true only if a Daily Average figure is clearly legible"),
  daily_average_minutes: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .describe("The Daily Average, converted to whole minutes. 0 when found is false."),
  total_minutes: z
    .number()
    .int()
    .min(0)
    .describe("Total Screen Time for the week in minutes, or 0 if not shown."),
  device_scope: z
    .enum(["all_devices", "single_device", "unknown"])
    .describe("Whether the report header says All Devices or names one device."),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().describe("One short sentence: what you read, and from where."),
});

const SYSTEM = `You read a single number off a screenshot of Apple's iOS Screen Time report.

Your target is the DAILY AVERAGE — the large figure directly beneath the words
"Daily Average" in the Screen Time card, near the top of the report.

It is NOT any of these, and confusing them is the main failure mode:
- "Total Screen Time", usually a larger number at the bottom of the same card
- any per-app time in the "Most Used" list (Instagram, Messages, ...)
- any per-category time (Social, Travel, Productivity & Finance)
- the y-axis labels on the bar chart

Convert to whole minutes: "4h" is 240, "2h 14m" is 134, "48m" is 48.

Set found=false when the Daily Average is cropped out, illegible, obscured, or
the image is not an iOS Screen Time report at all. A wrong number is far worse
than an honest miss — the person can always type it themselves.`;

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let path: string;
  try {
    ({ path } = (await request.json()) as { path: string });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!path) {
    return NextResponse.json({ error: "No screenshot to read." }, { status: 400 });
  }

  // Downloading through the user's session means RLS decides whether they may
  // see this file — no separate membership check to keep in sync.
  const { data: file, error: downloadError } = await supabase.storage
    .from("screenshots")
    .download(path);

  if (downloadError || !file) {
    return NextResponse.json({ error: "Could not open that screenshot." }, { status: 404 });
  }

  const mediaType = ["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ? (file.type as "image/png" | "image/jpeg" | "image/webp")
    : "image/jpeg";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: zodOutputFormat(Extraction),
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Read the Daily Average from this Screen Time report." },
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
      confidence: parsed.confidence,
      extraction: parsed,
    });
  } catch (error) {
    // Extraction is a convenience, never a gate. Fall through to manual entry.
    console.error("screen time extraction failed", error);
    return NextResponse.json({ found: false, extraction: null });
  }
}
