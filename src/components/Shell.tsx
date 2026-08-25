import Link from "next/link";

/** The page frame every screen sits in: one column, thumb-reachable. */
export function Shell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-[560px] px-4 pb-24 ${className}`}>
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pt-8 pb-5">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="font-display font-bold text-[27px] leading-[1.1] tracking-[-0.02em] text-balance">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 pt-6 font-mono text-[11.5px] tracking-wide text-ink3 hover:text-ink"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
