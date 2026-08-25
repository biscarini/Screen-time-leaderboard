import { Shell, PageHeader } from "@/components/Shell";
import { missingEnv, OPTIONAL_ENV } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const missing = missingEnv();
  const optionalMissing = OPTIONAL_ENV.filter((name) => !process.env[name]);

  return (
    <Shell>
      <PageHeader eyebrow="Not configured yet" title="Almost there" />
      <div className="flex flex-col gap-6">
        <p className="text-[16px] text-ink2 leading-relaxed">
          The app is deployed but has nothing to talk to. Add these in Vercel under
          Settings → Environment Variables, then redeploy.
        </p>

        <section className="flex flex-col gap-2.5">
          <span className="eyebrow">Required · missing</span>
          <ul className="card overflow-hidden">
            {missing.map((name, index) => (
              <li
                key={name}
                className={[
                  "px-4 py-3 font-mono text-[12.5px]",
                  index < missing.length - 1 ? "border-b border-ruleSoft" : "",
                ].join(" ")}
              >
                {name}
              </li>
            ))}
          </ul>
        </section>

        {optionalMissing.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <span className="eyebrow">Optional</span>
            <ul className="card overflow-hidden">
              {optionalMissing.map((name, index) => (
                <li
                  key={name}
                  className={[
                    "px-4 py-3 flex flex-col gap-0.5",
                    index < optionalMissing.length - 1 ? "border-b border-ruleSoft" : "",
                  ].join(" ")}
                >
                  <span className="font-mono text-[12.5px]">{name}</span>
                  <span className="font-mono text-[10.5px] text-ink3">
                    {name === "ANTHROPIC_API_KEY"
                      ? "Without it, uploads skip the auto-read and open on the keypad."
                      : "Without it, the weekly roll-over cron refuses to run."}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}
