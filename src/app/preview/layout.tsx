import { notFound } from "next/navigation";

/**
 * A gallery of every screen, rendered from the real components against
 * fixtures. Development only unless ENABLE_PREVIEW is set, so it never ships
 * as a public route.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_PREVIEW) notFound();
  return <>{children}</>;
}
