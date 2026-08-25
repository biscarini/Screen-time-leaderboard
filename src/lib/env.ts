/** Env the app cannot run without. Checked in middleware so a missing one
 *  produces a page that says which, rather than a stack trace on every route. */
export const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** Not required to run — the upload flow falls back to manual entry without it. */
export const OPTIONAL_ENV = ["ANTHROPIC_API_KEY", "CRON_SECRET"] as const;

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}
