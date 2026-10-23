# DayBloom

A multi-user personal productivity and life-progress web app, installable as a PWA.
Anyone can sign up, and each user sees only their own data.

## Current phase

**Phase 6 is in progress.**

- Done: account deletion, privacy page, security headers, deleted-account sign-out, and deployment prep (`vercel.json`, `docs/deployment.md`).
- Production Supabase `daybloom-prod` (ref `qgzofjctcvtkpxwvzspc`, Mumbai) is created and has all migrations.
- **Live:** https://day-bloom-lilac.vercel.app (Vercel, deploys from GitHub `main`; uses `daybloom-prod`).
  - Prod auth: Site URL is the live domain. Redirects allow it, the preview pattern `https://day-bloom-*-nimasha-arunodis-projects.vercel.app/**`, and the URLs the Vercel integration added.
  - Prod auth was pushed from a temporary copy of `config.toml` (`config push --project-ref <prod> --workdir <tmp>`), auth service only.
- Still waiting on: Resend SMTP (needs a verified domain).

**Phase 15 (installable PWA) is built and all automated checks pass. Waiting for the user's approval.** Prod has every migration (pushed 2026-10-23), so the code can be deployed; the Next.js 16.4.2 security upgrade ships with it. Web Push stays postponed. Update this line whenever a phase is completed and verified.

| Phase | Scope                                                                                           | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ------ |
| 0     | Scaffold: Next.js, Tailwind, shadcn, ESLint/Prettier, Vitest, Playwright                        | ✅     |
| 1     | Supabase, auth (email confirm, password reset), profiles, RLS, app shell                        | ✅     |
| 2     | `lib/dates` timezone utilities and tests                                                        | ✅     |
| 3     | Tasks and Today page                                                                            | ✅     |
| 4     | Calendar (month/week, one-off events)                                                           | ✅     |
| 5     | Day close, review, "Needs a decision" flow, history                                             | ✅     |
| 6     | Hardening, custom SMTP, account deletion, privacy page, Vercel deploy                           | 🚧     |
| 7     | Finance: expenses, income, categories, monthly analytics (Recharts), budgets                    | ✅     |
| 8     | Habits: weekly schedules, check-ins, streaks, 12-week heatmap, Today card                       | ✅     |
| 9     | Journal: entries per local day, search, Today card, entries on History days                     | ✅     |
| 10    | Focus timer: countdown sessions, today and 7-day totals, Today card                             | ✅     |
| 11    | Workouts: log (type, minutes, effort, notes), this week, active-week streak, Today card         | ✅     |
| 12    | Goals: milestones checklist, progress, target dates, achieve/archive, Today card                | ✅     |
| 13    | Languages: practice log, day streak, vocabulary, flashcard review, Today card                   | ✅     |
| 14    | Achievements: 19 badges derived from existing data, progress, "New" celebration, Today card     | ✅     |
| 15    | Installable PWA: manifest, icons, offline page via service worker, offline banner, install help | ✅     |

Postponed until the MVP is stable: recurrence, Google Calendar sync, Web Push, offline writes,
spaced-repetition (SRS) algorithms, multi-currency, export, drag-and-drop calendar editing.

## Stack and architecture

- **Next.js 16 (App Router) with TypeScript (strict)**, Tailwind CSS, shadcn/ui, Recharts (from the finance phase onward).
- **Supabase:** PostgreSQL, Auth (via `@supabase/ssr` cookies) and `pg_cron`.
  - Dev: `daybloom-dev` (ref `dltckblhqkhdxbfeuflx`, Mumbai). The CLI stays linked to dev.
  - Prod: `daybloom-prod` (ref `qgzofjctcvtkpxwvzspc`, Mumbai). Its DB password is `SUPABASE_PROD_DB_PASSWORD` in `.env.local`.
  - To migrate prod: link prod, `db push`, run the advisors, then relink dev (see `docs/deployment.md`).
  - No local Docker stack.
- **Libraries:** Zod for validation. Dates use the built-in `Intl` API via `src/lib/dates`, with no date library.
  - `@date-fns/tz` 1.5.0 was dropped: it returned wrong day boundaries when the machine's own timezone changed DST on the same day.
  - No ORM and no global state library.
- **Reads:** Server Components.
- **Writes:** Server Actions. Each one validates with Zod, writes through Supabase under RLS, then calls `revalidatePath`.
- **Client components:** only where interaction is needed.
- **Shared rules live in Postgres:** constraints, triggers, RLS, and RPC functions.
  - Examples: the `tasks_before_write` trigger (completion time, move counting), `reorder_tasks()`, `current_local_date()`, and later `close_day`.
  - Don't put business rules only in Server Actions; they must also work for any future client.
- **Deployment:** Vercel. The mobile experience is an **installable PWA** with no native app.
- **PWA:** `app/manifest.ts`, icons in `public/icons` plus `app/apple-icon.png` (regenerate with `node scripts/generate-icons.mjs`).
  - `public/sw.js` only serves `public/offline.html` when a page load fails offline. It caches nothing personal and queues no writes; bump its `CACHE` name when `offline.html` changes.
  - The worker registers in production only (`components/pwa/pwa-setup.tsx`). The proxy matcher skips `sw.js` and `offline.html` so they load signed out.
  - `OfflineBanner` warns that changes won't save while offline. Don't enable `experimental.useOffline`: it retries queued Server Actions (offline writes are postponed).

### Layout

```
src/app/(auth)/...         login, signup, password reset
src/app/(app)/...          authenticated pages (today, tasks, calendar, history, settings)
src/app/privacy/           public privacy notice (keep it in sync with what the app stores)
src/features/<domain>/     queries.ts, actions.ts, schema.ts, components/
src/components/ui/         shadcn components (generated, minimal edits)
src/components/layout/     app shell, navigation
src/lib/supabase/          server.ts, proxy.ts (add client.ts only when a client component needs Supabase)
src/lib/auth/              routes.ts (access rules), session.ts (getCurrentUser: the data access layer)
src/lib/dates/             the ONLY place for timezone/day logic (local-date.ts: days; timezone.ts: zones)
src/lib/money.ts           the ONLY place for money parsing/formatting (integer minor units)
src/types/database.ts      generated, never hand-edited
src/proxy.ts               session refresh and route guard
supabase/migrations/       all schema changes
tests/unit/                pure logic, offline
tests/db/                  RLS and trigger tests against the dev project
tests/e2e/                 Playwright (desktop and mobile)
tests/support/             test helpers (throwaway users created with the secret key)
```

Features may import from `lib/` and `components/`, and from another feature's `queries.ts` (its public read API), but never from its actions or components.
Keep `lib/dates` and the Zod schemas free of React and Next.js imports.

### Next.js 16 specifics

- This Next.js version differs from older training data. Read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).
- Use `src/proxy.ts` (formerly middleware). It only refreshes the session and redirects. Every action and query still calls `getCurrentUser()`.
- **Cache Components is on.** Request-time reads (`cookies`, `searchParams`, `getCurrentUser`, `getProfile`) must sit inside `<Suspense>`.
  - Never await the session at the top level of a layout.
  - `createClient()` calls `connection()`, because Supabase reads the clock.

## Time and day rules

- `timestamptz` (UTC) is for moments: `completed_at`, `started_at`.
- `date` is for local calendar days: `due_date`, `local_date`.
- **The day ends at local midnight**, in the IANA timezone stored on the user's profile.
- Calendar days are `LocalDate` strings ("YYYY-MM-DD"). Use the helpers in `src/lib/dates/local-date.ts`:
  - `todayIn(tz, now)` and `toLocalDate(instant, tz)` convert an instant to a day.
  - `localDayRange(date, tz)` gives the half-open `[start, end)` for querying `timestamptz` columns.
  - `addDays`, `daysBetween`, `compareLocalDates` and `formatLocalDate` need no timezone.
  - Validate form dates with `localDateSchema`, and times with `localTimeSchema` ("HH:MM").
  - `localDateTimeToInstant(date, time, tz)` and `toLocalTime(instant, tz)` convert times of day. A repeated time (clocks went back) resolves to the earlier instant; a skipped time resolves to the moment of the jump.
  - Calendar weeks start on Monday (`startOfWeek`, `monthGrid`). This isn't a user setting yet.
- Never derive "today" from the server clock or `toISOString().slice(0,10)`. ESLint blocks the ISO-slice pattern and any date library outside `lib/dates`.
- Always pass `now` in; date helpers never read the clock.
- Unit tests run with the machine timezone set to `Pacific/Chatham`, so code that relies on the system timezone fails.
- Never add 24h in milliseconds to move a day. Use date arithmetic, which keeps daylight-saving changes correct.
- Closing a day is lazy and idempotent:
  - `close_past_days()` runs when Today or History loads (`ensurePastDaysClosed`).
  - The hourly `pg_cron` job `daybloom-close-days` (minute 5) runs `private.close_days_for_everyone()`.
  - The day snapshot (`days.summary`) is frozen at close. A planned task counts as done only if it was finished by the end of that day.
  - Closing never changes tasks.
- Reviews (mood, energy, wins, reflection) are saved with `save_day_review()`, for today and the 7 days before. Only the closing function writes `status` and `summary`.
- **Unfinished tasks are never moved automatically.** Show a friendly "Needs a decision" prompt with three choices:
  - Do it today
  - Choose a date
  - Let it go (sets the status to `dropped`)
- Never add snooze or postpone shortcuts. Warn the user when `times_moved >= 2`.
  - `times_moved` is maintained by a trigger: it counts moving an unfinished, dated task later or removing its date. Clients can't write it.
  - Tasks have no hard delete: "Delete" sets `deleted_at`, and "Let it go" sets status `dropped`.
- Events come in two shapes, enforced by the `events_shape` constraint:
  - Timed events store instants (`starts_at`, `ends_at`), so their local day follows the user's timezone.
  - All-day events store calendar days (`start_date`..`end_date`, inclusive) and never shift.
  - The form only creates same-day timed events, but the logic handles events that cross midnight.
- **Money** (`src/lib/money.ts`, the only place for money logic):
  - Amounts are integer minor units (`amount_minor bigint`).
  - `parseAmount` uses string arithmetic; commas are thousands separators and a dot is the decimal point.
  - Use `formatMoney` and `currencyDigits` for display and decimal places.
  - Each user has one currency (`profiles.currency`, set once in finance setup).
  - The `transactions_before_write` trigger copies the currency onto each transaction, so clients never write it.
  - Analytics only sum transactions in the user's current currency.
  - Categories are archived, never deleted; transactions are soft-deleted.
  - **Budgets** are effective-dated: a `budgets` row applies from `starts_on` (a month start) until a later row for the same scope replaces it.
    - The scope is an expense category, or overall when `category_id` is null. A null amount means removed.
    - `set_budget()` upserts. Never rewrite past months; resolve with `effectiveBudgets()` in `features/finance/budgets.ts`.
    - A budget is "near" at 80% or more, then "over". The UI always states left/over in words, with an icon.
- **Habits** (`features/habits/logic.ts` holds the streak and schedule rules):
  - `days_mask` is a 7-bit weekday schedule (bit 0 = Monday). Check-ins are `habit_logs` rows, one per habit and local day.
  - RLS only allows adding or removing check-ins for today and the 7 days before. Archived habits can't be checked in (trigger).
  - Today being unchecked doesn't break a streak. Unscheduled days are skipped, and a check-in on one counts as a bonus.
  - Habits are archived, never deleted.
- **Journal** (`features/journal`):
  - Entries belong to a local day (`local_date`), any number per day. RLS refuses future days.
  - Entries are hard-deleted (private writing that nothing references), an intended exception to soft deletes.
  - Search uses `containsFilter()`, which escapes LIKE wildcards and quotes the PostgREST value. Never interpolate raw input into `.or()`.
- Timers store `started_at` in the database and compute elapsed time. They never count ticks in the browser.
  - Focus sessions (`focus_sessions`): triggers stamp `started_at` and `ended_at` with the database clock (clients can't set or backdate them), and cap the end at the planned end.
  - A session nobody ends finishes at its planned end and counts in full. Starting a session closes any open one. A session counts on the local day it started.
- **Workouts** (`features/workouts`): one row per workout on a local day (RLS refuses future days). A week streak counts weeks (Monday first) with at least one workout; an empty current week doesn't break it. Hard-deleted, like journal entries and focus sessions.
- **Goals** (`features/goals`): status `active` | `achieved` | `archived`; never deleted (archive instead).
  - Progress is the share of milestones done. Finishing every milestone suggests "Mark as achieved"; it never happens automatically.
  - Triggers stamp `achieved_at` and `done_at` with the database clock and keep the first achieved moment.
  - A passed target date is stated plainly ("Target date was …"), never as a failure.
- **Languages** (`features/languages`): languages are archived, never deleted; one per name per user (case-insensitive).
  - Practice entries belong to a local day (never future). The day streak counts days with any practice; today without practice doesn't break it.
  - Words have a `learned` flag (trigger stamps `learned_at`). Review is a shuffled flashcard deck of unlearned words, with no SRS scheduling yet. The deck is shuffled on the server and kept for the session.
- **Achievements** (`features/achievements`): derived, never stored.
  - `my_achievements()` (SQL, SECURITY INVOKER) returns each code's progress and target from the caller's data. Copy lives in `definitions.ts`; a DB test keeps the codes in sync. Add new ones to both.
  - `achievement_seen` only records which unlocked ones were seen. Marking them seen must not revalidate, or the open page loses its "New" labels.

## Database and Supabase security rules

- Every schema change is a new migration: `npx supabase migration new <name>`.
  - Never edit a migration that has already been pushed. Never change the schema through the dashboard.
- Every table has the following, with no exceptions:
  - `user_id uuid not null default auth.uid() references auth.users on delete cascade`
  - `alter table ... enable row level security`
  - policies `to authenticated` using `(select auth.uid()) = user_id` (with check on writes). Use `for all`, or only the needed commands when least privilege fits (e.g. `profiles` allows select and update only)
  - `revoke all ... from anon, authenticated`, then explicit grants (column-level where only some columns are editable)
  - an index on `user_id`
- Child tables carry `user_id` too and use composite foreign keys, e.g. `(goal_id, user_id) → goals(id, user_id)`.
- Grant no policies to `anon`.
- Store money as an integer number of minor units (`bigint`) plus a currency. Never use floats.
- Soft-delete records that carry history (`deleted_at` or `archived_at`).
- `SECURITY DEFINER` functions are allowed only when necessary. They must set `search_path = ''` and check `auth.uid()`. The only exception is triggers on `auth.users`, where no user is set.
- Revoke `execute` on trigger and helper functions from `public, anon, authenticated` so they aren't exposed through RPC.
- Internal functions go in the `private` schema, which the Data API doesn't expose.
- After a migration, run `npx supabase db advisors --linked`.
  - Accepted warnings: `close_past_days()` and `delete_my_account()`. Both are intentional SECURITY DEFINER functions that only act on `auth.uid()`.
  - Also flagged: leaked password protection (paid plan). It's on the launch checklist.
- Authorize on the server with `supabase.auth.getUser()` or `getClaims()`, never `getSession()`.
- Secrets:
  - The secret (service-role) key is server-only and may never appear in `NEXT_PUBLIC_*` variables or client code.
  - `.env.local` is never committed. Keep `.env.example` up to date.
- After each schema change, regenerate the types with `npm run db:types`.
- Supabase Auth config lives in `supabase/config.toml` and is applied with `npx supabase config push`.
  - Preview first, answering `n` to every prompt. Push only the service you changed, and never let it downgrade remote settings (OTP length, MFA, storage).
  - The free tier rejects custom email templates until custom SMTP is configured (Phase 6).
- **Account deletion:** `delete_my_account()` deletes the caller from `auth.users`, and every table cascades.
  - New tables must reference `auth.users ... on delete cascade` so deletion stays complete.
  - If a login points at a deleted account, `getProfile()` redirects to `/auth/signout`. That route signs out only if the profile is really gone.
- **Security headers** (`next.config.ts`): framing, base, form and object CSP, HSTS, `nosniff`, referrer and permissions policies.
  - A script CSP is deliberately off: nonces would force dynamic rendering.
- **Deployment:** see `docs/deployment.md`.
  - Prod is its own Supabase project, with auth URLs set in its dashboard (never `config push` to prod).
  - Vercel gets only the two `NEXT_PUBLIC_*` variables.
- Auth emails (signup confirmation, password reset) are sent with `createEmailLinkClient()` (implicit flow) and return to `/auth/callback`.
  - That page reads the one-time session from the URL fragment in the browser, so links work on any device.
  - Default PKCE links only work in the browser that requested them, which broke real users.
  - `/auth/confirm` stays for `?code=` links already sent, and for `token_hash` links once custom templates are enabled.

## Design system

"Forest bloom" (redesigned 2026-10-23 at the user's request; greens only for gradients and neutrals, no blue): modern, rich and calm, never a generic admin template. Tokens live in `src/app/globals.css`. Always use the tokens; don't hard-code colours.

- **Colours:**
  - Light: green-tinted page `background` #F3F7F5 with two soft green glows, white `card`, deep forest `foreground` #0F2219, emerald `primary` #047857, `muted-foreground` #4D6358, `input` #82938A (3:1 for field outlines).
  - Dark: forest-night `background` #06120D, `card` #0C1D16, `primary` #34D399. The sidebar is #05190F in both themes.
  - The **bloom** gradient (`bg-bloom`: teal #0F766E → emerald #047857 → forest #166534, stops `--bloom-from/via/to`) marks highlights only: the Today hero, the active nav item, the logo, avatars and the brand panel. White text on it passes AA.
  - The user asked for green gradients, not blue: keep gradients and neutrals green. Violet, sky, amber and rose appear only as module accents.
  - Run `node scripts/check-contrast.mjs` after any colour change; it checks every text/background pair and the non-text 3:1 pairs in both themes.
  - Colours outside the tokens must match them: `app/layout.tsx` (viewport), `app/manifest.ts`, `public/offline.html` (bump `CACHE` in `public/sw.js`) and `scripts/generate-icons.mjs` (rerun it).
- **Theme:** users choose System, Light or Dark with `ThemeSwitcher` (in the sidebar, the mobile top bar and Settings → Appearance).
  - The choice is stored per device in localStorage.
  - `THEME_SCRIPT` (`src/lib/theme.ts`) sets the `.dark` class on `<html>` before first paint.
  - Dark tokens are defined for `:root.dark, .dark`, so any subtree with the `dark` class uses them. The sidebar is dark in both themes this way.
- **Module accents** come from `ACCENT_CHIP` in `src/components/accent.ts` (tinted background + `*-ink` text). Use them for icon chips and small highlights only, never page themes:
  - sage (teal-green): planner, tasks, habits
  - peach (amber): expenses
  - lavender (violet): focus, study, languages
  - mint (sky): workouts, wellness, reflection, schedule
  - rose plus restrained `gold`: achievements, journal
  - `gold` is for icons only.
- **Surfaces:**
  - Cards and lists use the `surface` utility (≈17px radius, thin border, layered `shadow-soft`). Cards that are links add `surface-interactive` (lifts on hover and focus). shadcn `Card` matches `surface`.
  - `glass` is for the mobile top bar and the floating tab bar only.
  - Buttons and inputs use a 12px radius; primary buttons have a soft coloured shadow and press slightly.
- **Building blocks:**
  - `PageHeader` (eyebrow in `primary`, title, actions)
  - `DashboardCard` (title, accent icon chip, optional action)
  - `Section` (title, description, optional actions)
  - `EmptyState` (accent, helpful copy, optional action)
  - `ProgressRing` (`components/progress-ring.tsx`), `BrandPanel` (landing and auth)
- **Layout:**
  - Desktop has a 16rem dark sidebar with grouped navigation (`NAV_GROUPS` in `components/layout/nav-items.ts`) and `max-w-6xl` content.
  - Mobile has a frosted top bar (theme switcher and a Settings icon) and a floating tab bar: Today, Tasks, Habits, Calendar, Finance and **More** (`/more`), which lists every other page.
  - Single-column grids widen at `sm`/`lg`; touch targets are 36–40px or more; no horizontal page scrolling (the screenshot QA script checks `scrollWidth`).
- **Today:** a gradient hero (greeting, task progress ring, today's numbers, one suggested next step from `features/today/logic.ts`), quick actions, the plan and side cards, then "Across your life" module cards and the reflection.
  - Show only real data. Every module card links somewhere real; never add placeholder statistics.
- **Charts** (Recharts):
  - Follow the dataviz skill: one series per chart (no legend), bars at most 24px with 4px rounded data-ends, hairline solid gridlines.
  - Text uses text tokens, every bar gets a hover tooltip, and each chart has an `sr-only` table of its data.
  - Expense bars use `--chart-expense`, checked at 3:1 against the card in both themes by `scripts/check-contrast.mjs`. Check any new chart colour the same way.
- **Typography:** Geist. Page titles are `text-2xl sm:text-3xl font-semibold tracking-tight`; section and card titles are `font-semibold`.
- **Motion:**
  - Short and subtle: pages fade and rise in (`(app)/template.tsx`), cards lift on hover, 200–500ms fades and zooms via `tw-animate-css`, small celebrations when finishing things.
  - Everything is disabled under `prefers-reduced-motion` in `globals.css`.
- **Accessibility:**
  - Accessible labels, keyboard navigation and visible focus rings (`ring-ring/50`).
  - Use native controls where possible (radios, selects, date inputs).
- **General rules:**
  - Use shadcn/ui first. Check `src/components/` before creating a component, and extract one once it's used twice.
  - Every data view needs loading, empty and error states.
  - Forms share their Zod schema with the Server Action and show field-level errors.
  - Gentle warnings use the `warning` token.
  - The tone is friendly and encouraging, without guilt-tripping or nudging the user to postpone.

## Commands (Windows PowerShell)

All verified on 2026-10-11. They need `.env.local` (see `.env.example`).

```powershell
npm run dev            # dev server, http://localhost:3000
npm run lint           # ESLint
npm run typecheck      # next typegen + tsc --noEmit
npm run format         # Prettier write (format:check to verify)
npm test               # Vitest unit tests (offline)
npm run test:db        # RLS/trigger tests against daybloom-dev (creates and deletes test users)
npm run test:e2e       # Playwright; builds and starts production on :3000. Port 3000 must be free:
                       # stop `npm run dev`, and check no leftover node.exe still listens on 3000
$env:E2E_PORT=3100; npm run test:e2e   # or run on :3100 while `npm run dev` keeps :3000 (allowed in Supabase redirects)
npm run build          # production build (then: npm start)
npm run db:types       # regenerate src/types/database.ts

npx supabase migration new <name>
npx supabase db advisors --linked   # security/performance lints after schema changes
npm run db:push        # apply migrations to the linked project (may prompt for SUPABASE_DB_PASSWORD from .env.local)
```

One-time setup on a new machine: `npm install`, `npx playwright install chromium`, `npx supabase login`,
`npx supabase link --project-ref dltckblhqkhdxbfeuflx`.

If PowerShell blocks npm with "running scripts is disabled", run:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Working rules

1. **Inspect before modifying.** Read the relevant existing files, schemas and migrations before you change anything. Reuse what is already there.
2. **Stay in scope.** Implement only the current phase or task.
   - Don't add unrelated features.
   - Don't refactor or rewrite working code unless the task requires it, and say why if you do.
3. **Test all meaningful changes.**
   - Logic, especially dates and money, gets unit tests.
   - Every new table gets an RLS test proving that user B can't access user A's rows.
   - Each user flow gets one end-to-end happy path.
   - All tests share Supabase's per-IP sign-in rate limit (about 30–45 per 5 minutes in practice). The `sign_in_sign_ups` setting and the secret key don't lift it.
     - Seed and poll data with `adminClient()`, not extra sign-ins.
     - In a bulk insert every row needs the same keys: PostgREST sends missing ones as `null` (not the column default), which can fail the whole insert. Check `error` on seeds.
     - `signedInClient()` reuses one session per user and waits out a rate limit instead of failing.
     - A sudden wave of `fetch failed` errors at test setup means the network dropped. Check connectivity, then rerun.
   - In E2E tests, after navigating, wait for the new page's heading before filling fields: the previous page stays visible until the new one renders, and a field with the same label there gets filled instead.
   - In E2E tests, prefer `getByRole` selectors. Cache Components keeps visited pages in the DOM, hidden, and `getByLabel`/`getByText` can match those hidden copies.
   - Any client component that uses `usePathname`, `useSearchParams` or similar URL hooks must render inside `<Suspense>`.
   - Client controls that call server actions (checkboxes, buttons) must be disabled while their transition is pending.
     - Next.js sends actions one at a time, and a second action queued behind the first was observed to be lost.
4. **Definition of done.** These must all pass: `format:check`, `lint`, `typecheck`, `test` and `build`.
   - Also `test:db` after any schema change, and `test:e2e` after any user-flow change.
5. **Finish each phase before starting the next.** Stop after each phase for the user to verify and approve.
6. **Report after every task** with:
   - the files modified or created
   - the commands executed
   - the test, lint and build results (with real output, including failures)
   - remaining issues and next steps
7. **Keep this file current.** Update it when the phase changes or when we agree on an architecture or workflow change. Keep it concise.
