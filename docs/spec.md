# Screen Time Leaderboard — MVP design

A private weekly competition for a group of friends: lowest average daily screen
time wins. Everyone uploads their iOS Screen Time screenshot at the end of the
week, the app reads the number off it, and the group gets ranked.

The whole product is one loop:

> upload screenshot → confirm the number → rank the group → crown a winner → repeat

Everything below is in service of keeping that loop small.

---

## 1. The one thing to get right: what "a week" means

iOS's Screen Time weekly report runs **Sunday → Saturday**, and its *Daily
Average* divides total time by the days **elapsed so far**, not by 7. In the
reference screenshot: 12h total, 3 days of bars, 4h average.

Two consequences shape the entire data model:

1. **The competition week is Sun–Sat**, matching Apple. If we used Mon–Sun, no
   screenshot anyone could take would correspond to a competition week.
2. **A screenshot is only comparable to another screenshot taken at a similar
   time.** Someone uploading Friday 6pm is averaging ~6 days; someone uploading
   Saturday noon is averaging ~6.5 days including their Friday night. The
   submission window *is* the fairness mechanism — not the week boundary.

So: a week is scored on a partial week, and that's fine, as long as the window
is narrow. The default window is **Friday 18:00 → Saturday 12:00 group-local**,
as described in the brief.

> **One flag worth raising:** that window spans Friday night, which is the
> single most screen-heavy stretch of most weeks. A late submitter carries a
> Friday night that an early submitter doesn't. If the group ever argues about
> it, tighten the window to **Saturday 08:00–12:00** — then everyone is
> averaging the same complete Sun–Fri set. It's a per-group setting
> (`groups.opens_dow/opens_hour/closes_dow/closes_hour`), so this is a config
> change, not a migration. Shipping with the brief's wider window because
> participation matters more than precision in a group of friends.

Weeks open and close on a **server cron**, never on a client. The job runs
hourly, and for each group whose local window has just ended it closes the open
week and opens the next one. Hourly ticks cover every timezone without any
per-group scheduling.

---

## 2. Database

Six tables, two views. Full DDL with row-level security in
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

```
profiles ──┬─< group_members >── groups ──< weeks ──< submissions
           └──────────────────────────────────────────┘
```

| Table | One row per | Purpose |
|---|---|---|
| `profiles` | person | name + avatar, keyed to the auth user |
| `groups` | friend group | name, invite code, timezone, submission window |
| `group_members` | membership | join table, carries `role` |
| `weeks` | group × week | the competition week; `open` or `closed` |
| `submissions` | person × week | the confirmed number + the screenshot behind it |

### The important columns

```sql
minutes          int   not null   -- confirmed daily average. the source of truth.
detected_minutes int             -- what the vision pass read, before confirmation
was_corrected    bool  generated  -- detected is distinct from confirmed
screenshot_path  text  not null   -- storage key, kept for group transparency
extraction       jsonb            -- raw model output: confidence, total, week label
```

Three deliberate choices:

- **Screen time is stored as one integer: minutes.** Not `"2h 06m"`, not a
  duration, not seconds. Ranking, deltas, records, and averages are all integer
  math; formatting happens in one UI helper.
- **`detected_minutes` is kept alongside `minutes`.** The gap between them is
  the product's only real quality metric — `select avg(was_corrected::int) from
  submissions` tells you whether extraction is working, per week, over time.
- **Nothing about ranking is stored.** Rank, week-over-week change, personal
  best, win counts and streaks are all *derived*. A group is 5–15 people and a
  year is 52 weeks, so the entire history of a group is a few hundred rows —
  window functions over that are instant, and there is no standings table to
  drift out of sync when someone corrects a submission.

### The two views

`week_standings` adds `rank() over (partition by week_id order by minutes)`.
`member_week_history` adds `lag(minutes)` per member for the `↓ 18m` deltas.
Every screen in the app reads from one of these two.

### Everything else, as queries

| Stat | Definition |
|---|---|
| Weekly winner | `rank = 1` in a closed week (ties → co-winners) |
| Personal best | `min(minutes)` for a member |
| Group record | `min(minutes)` across the group, all time |
| Most improved | most negative `delta_minutes` this week |
| Win streak | consecutive closed weeks at `rank = 1` |
| All-time wins | count of closed weeks at `rank = 1` |

### Access rules

RLS, two sentences long: **you can read anything inside a group you belong to,
and write only your own rows.** A `security definer` `is_member(group_id)`
helper keeps the `group_members` policy from recursing into itself. Weeks are
opened and closed only by the service role.

Screenshots live in a **private** Storage bucket at
`{group_id}/{week_id}/{user_id}/{uuid}.jpg`, served to members through signed
URLs. The first path segment drives the read policy; the third proves you're
uploading as yourself.

---

## 3. Architecture

```
  iOS Safari (PWA, mobile-first)
        │
        ▼
  Next.js App Router  ──────────────►  Supabase
   · server components read              · Postgres + RLS
     the leaderboard directly            · Auth (magic link)
   · /api/extract  (vision)              · Storage (screenshots)
   · /api/cron/roll-weeks
        │
        ▼
  Claude vision  →  strict JSON
```

**Stack:** Next.js (App Router) + Tailwind on Vercel, Supabase for Postgres /
auth / storage, Claude vision for extraction, Vercel Cron for the weekly roll.
No state management library, no separate API service, no mobile app. It's a
PWA — "Add to Home Screen" is the install story, and the camera roll is the
only device capability the product needs.

**Auth** is email magic link. A friend group doesn't need passwords, and
usernames are just `profiles.display_name`.

**Reads** happen in server components straight against Postgres under the
user's RLS context. There is no leaderboard API to build.

**Writes** are three actions total: `joinGroup(code)`, `submitScreenshot(...)`,
`correctSubmission(...)`.

### The extraction path

1. Client downscales the image to ~1280px on the long edge and uploads it
   directly to Storage with a signed upload URL. (Downscaling matters: a raw
   iPhone screenshot is several MB, and the number we want is legible at a
   fraction of that.)
2. `POST /api/extract` receives the storage path, fetches the image, and asks
   Claude vision for a strict JSON object:

   ```json
   {
     "daily_average_minutes": 134,
     "total_minutes": 720,
     "week_label": "S M T W T F S",
     "device_scope": "all_devices",
     "confidence": "high",
     "notes": "read from the 'Daily Average' figure"
   }
   ```

   The prompt is pinned to one target: **the number directly under "Daily
   Average" in the Screen Time card** — not the total, not the top app, not a
   category. `total_minutes` and `week_label` come back only as sanity checks;
   `device_scope` catches the "All Devices" vs. single-device difference, which
   is worth surfacing to the group later but isn't enforced in the MVP.
3. The response populates the confirm screen. **The user always confirms**, even
   at high confidence — the model is a typing shortcut, not an authority.
4. On confirm, the row is written with both numbers.

If extraction fails or confidence is low, the confirm screen opens with an
empty field and a keypad instead of a detected value. A failed read must never
be a dead end; manual entry is always available, and the screenshot is attached
either way.

### Trust model

Verification here is **social, not technical**. The screenshot is stored and
any group member can tap a row to see it. That's the whole enforcement
mechanism, and for a group of friends it's the right amount — anti-tamper
detection would cost more than the problem is worth. Worth being explicit about
in the product copy: this is an honor system with receipts.

---

## 4. MVP screens

Six screens. Mobile-first, one column, thumb-reachable actions.

### 1 · Join
Email magic link → name + avatar → enter invite code. Ends on the leaderboard.
Creating a group is the same screen with the code field swapped for a name.

### 2 · Leaderboard *(home)*
The screen that carries the product. One list, one row per member:

```
  Weekly Screen Time            Sun 17 – Sat 23

  🥇  Jake    1h 42m   ↓ 18m
  🥈  Marco   2h 06m   ↓ 31m
  🥉  Chris   2h 51m   ↑ 12m
   4  Sam     3h 24m
   5  Ryan    Pending
```

Rank · avatar · name · time · delta · status. Nothing else on the row. Green
for a drop, muted for a rise — down is good, and the color should say so
without a legend.

It renders three states from the same list:

- **Mid-week** — everyone `Pending`, last week's final table shown below with a
  "last week" header so the screen is never empty.
- **Window open** — a sticky **Upload screenshot** button; submitted members
  fill in from the top, pending members hold their place at the bottom. This is
  the state that creates the pressure to submit.
- **Closed** — final order, winner crowned, a one-line summary worth screenshotting
  into the group chat ("Jake takes it at 1h 42m — third week running").

Tapping a row opens that member's profile; tapping their time opens their
screenshot.

### 3 · Upload & confirm
Pick from camera roll → upload → spinner → the confirmation:

```
        Detected Screen Time

            2h 14m

     [ Looks right ]   [ Fix it ]
```

"Fix it" swaps in an hour/minute keypad. This screen must handle a wrong read
gracefully — it will be wrong sometimes, and the recovery has to feel like a
one-tap correction rather than an error. Submitting drops the user back onto
the leaderboard with their row filled in.

Re-uploading while the week is open replaces the submission; after close, it's
locked.

### 4 · Profile
Current week · all previous weeks as a simple bar list · personal best ·
average · trend · wins. One number per line, no charts beyond a bar per week.

### 5 · Group stats
Weekly winner, group record, most improved, current streak, all-time wins.
Five lines, each one a sentence with a name in it.

### 6 · Group settings
Invite code with a share button, member list, submission window, leave group.
Deliberately boring.

### Non-submitters

A member who misses the window is listed below the ranked group as **Missed** —
not ranked, not penalized. Friendly beats rigorous here. It does mean someone
could skip a bad week to protect a streak; that's an accepted MVP tradeoff, and
the group will notice long before the software needs to.

---

## 5. Explicitly not in the MVP

Cut to protect the loop: comments and reactions, multiple groups per user,
Android / Digital Wellbeing screenshots (iOS-only extraction to start), category
and per-app breakdowns, push notifications (the group chat is the notification
layer at this size), penalty scores for missed weeks, editing a closed week,
and any chart more elaborate than a bar per week.

The first three are the likely v2, in that order.

---

## 6. Build order

1. Schema + RLS + a seeded group, verified with SQL only.
2. Auth, join by invite code, leaderboard reading real rows — hardcode
   submissions at first.
3. Upload → storage → confirm → submit, with manual entry only.
4. Add the vision pass in front of the confirm screen.
5. The cron that rolls weeks, plus the closed-week state.
6. Profile and group stats, which are pure reads over views already built.

Steps 1–3 are a working product for a group willing to type their own number.
Step 4 is what makes it feel like magic.
