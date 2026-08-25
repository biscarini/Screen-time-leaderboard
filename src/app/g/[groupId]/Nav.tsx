"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Board" },
  { slug: "stats", label: "Stats" },
  { slug: "me", label: "You" },
];

export function Nav({ groupId, viewerId }: { groupId: string; viewerId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 border-t border-rule bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto max-w-[560px] grid grid-cols-3">
        {TABS.map((tab) => {
          const href =
            tab.slug === "" ? base
            : tab.slug === "me" ? `${base}/member/${viewerId}`
            : `${base}/${tab.slug}`;
          const active =
            tab.slug === "" ? pathname === base : pathname.startsWith(href);

          return (
            <li key={tab.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block text-center py-3.5 font-display font-semibold text-[13px]",
                  active ? "text-ink" : "text-ink3",
                ].join(" ")}
              >
                {tab.label}
                <span
                  aria-hidden
                  className={[
                    "block mx-auto mt-1 h-[2px] w-6 rounded-full",
                    active ? "bg-brass" : "bg-transparent",
                  ].join(" ")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
