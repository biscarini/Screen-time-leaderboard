# Screen Time Leaderboard

A private weekly competition for a group of friends: **lowest average daily
screen time wins.**

At the end of each week everyone uploads a screenshot of their iOS Screen Time
report. The app reads the daily average off the screenshot, the user confirms
it, and the group gets ranked lowest → highest. The week closes, a winner is
crowned, and a new week starts.

```
upload screenshot → confirm the number → rank the group → crown a winner → repeat
```

More a friendly fitness leaderboard for digital habits than a productivity
dashboard.

## Status

Design stage. No application code yet.

- **[docs/spec.md](docs/spec.md)** — data model, architecture, MVP screens,
  and build order
- **[supabase/migrations/](supabase/migrations/)** — the schema, with RLS

## Planned stack

Next.js (App Router) + Tailwind on Vercel · Supabase for Postgres, auth and
storage · Claude vision for reading the screenshot · Vercel Cron to roll the
week over. Mobile-first PWA, no native app.
