# Screen Time Leaderboard

A private weekly competition for a group of friends: **lowest average daily
screen time wins.**

Every Saturday morning each person uploads a screenshot of their iOS Screen
Time report. The app reads the daily average off it, the user confirms the
number, and the group gets ranked lowest → highest. The week closes, a winner
is crowned, and a new week starts.

```
upload screenshot → confirm the number → rank the group → crown a winner → repeat
```

More a friendly fitness leaderboard for digital habits than a productivity
dashboard.

## How a week works

The competition week runs **Sunday → Saturday**, matching Apple: the iOS Screen
Time report uses that boundary, and its *Daily Average* divides by the days
**elapsed**, not by seven.

Uploads open **Saturday 06:00–12:00** in the group's timezone. The narrow
window is the point — at that moment every member's Daily Average covers the
same complete Sun–Fri set, so the numbers are comparable. It's a per-group
setting if you want a wider net.

Verification is social: the screenshot is stored and any member can tap a row
to see it. An honor system, with receipts.

## Stack

- **Next.js** (App Router) + Tailwind — mobile-first PWA, no native app
- **Supabase** — Postgres with row level security, magic-link auth, private
  storage for screenshots
- **Claude** (`claude-opus-5` vision) — reads the Daily Average off the
  screenshot; the user confirms every value
- **Vercel Cron** — hourly, rolls each group's week over

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the five values
npm run dev
```

### Seeing the UI without a database

Every screen is also rendered from fixtures at **`/preview`** — nine frames,
each in its own iframe so `position: fixed` behaves the way it does on a phone.
No Supabase, no auth, no seeding:

```bash
npm install && npm run dev
open http://localhost:3000/preview
```

Individual screens live at `/preview/<screen>`: `sign-in`, `midweek`, `open`,
`closed`, `upload`, `confirm`, `profile`, `stats`, `settings`. It renders the
same components the app uses in production — the data-driven screens are split
into a route (which loads) and a view (which renders), so the preview can never
drift from the real thing. The route 404s in production unless `ENABLE_PREVIEW`
is set.

Apply the migrations to a Supabase project in order:

```bash
supabase link --project-ref <ref>
supabase db push               # or paste supabase/migrations/*.sql into the SQL editor
```

Then in the Supabase dashboard set **Authentication → URL Configuration →
Site URL** to your app's origin, and add `<origin>/auth/callback` to the
redirect allow-list, or the magic link will bounce.

### Tests

The week math and the RLS rules are the two things that are easy to get quietly
wrong, so both are covered. The suite runs against any Postgres — it shims the
handful of Supabase built-ins the schema uses:

```bash
PGHOST=/var/tmp PGPORT=5439 PGUSER=postgres npm run test:db
```

## Layout

| Path | What's in it |
|---|---|
| `supabase/migrations/` | Schema, week logic, RLS, storage buckets |
| `supabase/tests/` | Schema and RLS suites, plus the Supabase shim |
| `src/app/g/[groupId]/` | The five in-group screens |
| `src/app/api/extract/` | The vision pass |
| `src/lib/stats.ts` | Ranks, deltas, records, streaks — all derived |
| `docs/spec.md` | The design: data model, architecture, screens |
