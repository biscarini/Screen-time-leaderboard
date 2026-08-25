import { SCREENS, SCREEN_ORDER } from "./screens";

/**
 * Every screen at once, each in its own iframe so `position: fixed` behaves
 * exactly as it does on a phone.
 */
export const dynamic = "force-dynamic";

export default function PreviewIndex() {
  return (
    <div className="min-h-dvh bg-ground">
      <header className="mx-auto max-w-[1180px] px-6 pt-14 pb-10 flex flex-col gap-3">
        <span className="eyebrow">Every screen · rendered from the real components</span>
        <h1 className="font-display font-bold text-[40px] leading-[0.98] tracking-[-0.025em]">
          Screen Time Leaderboard
        </h1>
        <p className="text-[17px] text-ink2 max-w-[52ch] leading-relaxed">
          Fixtures instead of a database, but the same components the app renders
          in production. Open any frame on its own at{" "}
          <code className="font-mono text-[14px]">/preview/&lt;screen&gt;</code>.
        </p>
      </header>

      <div className="mx-auto max-w-[1180px] px-6 pb-24 grid gap-x-8 gap-y-12 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {SCREEN_ORDER.map((slug) => (
          <figure key={slug} className="flex flex-col gap-3 m-0">
            <div
              className="rounded-[28px] border border-rule bg-surface overflow-hidden shadow-lg"
              style={{ height: 700 }}
            >
              <iframe
                src={`/preview/${slug}`}
                title={SCREENS[slug].title}
                className="w-full h-full border-0"
                style={{ colorScheme: "normal" }}
              />
            </div>
            <figcaption className="flex flex-col gap-1.5">
              <span className="font-display font-semibold text-[16px]">
                {SCREENS[slug].title}
              </span>
              <span className="font-mono text-[11.5px] text-ink3 leading-relaxed">
                {SCREENS[slug].caption}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
