# DayBloom

A multi-user personal productivity and life-progress web app, installable as a PWA.
Anyone can sign up, and each user sees only their own data.

## Current phase

**Phase 3 is built and all automated checks pass. Waiting for the user's approval.** Phase 1 still needs a manual check with a real email signup.
Next up: Phase 4. Update this line whenever a phase is completed and verified.

| Phase | Scope                                                                                                          | Status |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 0     | Scaffold: Next.js, Tailwind, shadcn, ESLint/Prettier, Vitest, Playwright                                       | ✅     |
| 1     | Supabase, auth (email confirm, password reset), profiles, RLS, app shell                                       | ✅     |
| 2     | `lib/dates` timezone utilities and tests                                                                       | ✅     |
| 3     | Tasks and Today page                                                                                           | ✅     |
| 4     | Calendar (month/week, one-off events)                                                                          |        |
| 5     | Day close, review, "Needs a decision" flow, history                                                            |        |
| 6     | Hardening, custom SMTP, account deletion, privacy page, Vercel deploy                                          |        |
| 7+    | Habits → Journal → Focus timer → Finance → Workouts → Goals → Languages → Achievements → PWA and notifications |        |

Postponed until the MVP is stable: recurrence, Google Calendar sync, Web Push, offline writes,
spaced-repetition (SRS) algorithms, multi-currency, export, drag-and-drop calendar editing.

## Stack and architecture

- **Next.js 16 (App Router) with TypeScript (strict)**, Tailwind CSS, shadcn/ui, Recharts (from the finance phase onward).
- **Supabase:** PostgreSQL, Auth (via `@supabase/ssr` cookies) and `pg_cron`.
  - One hosted project for dev (`daybloom-dev`, ref `dltckblhqkhdxbfeuflx`, Mumbai) and a separate one for prod.
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

### Layout

```
src/app/(auth)/...         login, signup, password reset
src/app/(app)/...          authenticated pages (today, tasks, calendar, history, settings)
src/features/<domain>/     queries.ts, actions.ts, schema.ts, components/
src/components/ui/         shadcn components (generated, minimal edits)
src/components/layout/     app shell, navigation
src/lib/supabase/          server.ts, proxy.ts (add client.ts only when a client component needs Supabase)
src/lib/auth/              routes.ts (access rules), session.ts (getCurrentUser: the data access layer)
src/lib/dates/             the ONLY place for timezone/day logic (local-date.ts: days; timezone.ts: zones)
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
  - Validate form dates with `localDateSchema`.
- Never derive "today" from the server clock or `toISOString().slice(0,10)`. ESLint blocks the ISO-slice pattern and any date library outside `lib/dates`.
- Always pass `now` in; date helpers never read the clock.
- Unit tests run with the machine timezone set to `Pacific/Chatham`, so code that relies on the system timezone fails.
- Never add 24h in milliseconds to move a day. Use date arithmetic, which keeps daylight-saving changes correct.
- Closing a day is lazy and idempotent: `close_day()` runs when the app opens, with an hourly `pg_cron` job as a backup.
  - The day snapshot (`days.summary`) is frozen at close.
- **Unfinished tasks are never moved automatically.** Show a friendly "Needs a decision" prompt with three choices:
  - Do it today
  - Choose a date
  - Let it go (sets the status to `dropped`)
- Never add snooze or postpone shortcuts. Warn the user when `times_moved >= 2`.
  - `times_moved` is maintained by a trigger: it counts moving an unfinished, dated task later or removing its date. Clients can't write it.
  - Tasks have no hard delete: "Delete" sets `deleted_at`, and "Let it go" sets status `dropped`.
- Timers store `started_at` in the database and compute elapsed time. They never count ticks in the browser.

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
- Authorize on the server with `supabase.auth.getUser()` or `getClaims()`, never `getSession()`.
- Secrets:
  - The secret (service-role) key is server-only and may never appear in `NEXT_PUBLIC_*` variables or client code.
  - `.env.local` is never committed. Keep `.env.example` up to date.
- After each schema change, regenerate the types with `npm run db:types`.
- Supabase Auth config lives in `supabase/config.toml` and is applied with `npx supabase config push`.
  - Preview first, answering `n` to every prompt. Push only the service you changed, and never let it downgrade remote settings (OTP length, MFA, storage).
  - The free tier rejects custom email templates until custom SMTP is configured (Phase 6). Until then, `/auth/confirm` handles the default `?code=` links.

## UI consistency

- Use shadcn/ui components first. Check `src/components/` before creating a new component.
- Extract a component once it is used twice or more. Don't build abstractions for single use.
- Use Tailwind with the theme tokens from shadcn CSS variables. Don't hard-code colours.
  - For gentle warnings, use the `warning` token (`text-warning`, `bg-warning/10`).
- Support light and dark mode.
- Design mobile-first: it must work at 375px wide with no horizontal scroll.
- Every data view needs loading, empty and error states.
- Forms use a Zod schema shared with the Server Action, and show field-level errors.
- Use accessible labels, keyboard navigation and visible focus states.
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
npm run test:e2e       # Playwright; builds and starts production on :3000 (stop npm run dev first)
npm run build          # production build (then: npm start)
npm run db:types       # regenerate src/types/database.ts

npx supabase migration new <name>
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
   - In E2E tests, prefer `getByRole` selectors. Cache Components keeps visited pages in the DOM, hidden, and `getByLabel`/`getByText` can match those hidden copies.
   - Any client component that uses `usePathname`, `useSearchParams` or similar URL hooks must render inside `<Suspense>`.
4. **Definition of done.** These must all pass: `format:check`, `lint`, `typecheck`, `test` and `build`.
   - Also `test:db` after any schema change, and `test:e2e` after any user-flow change.
5. **Finish each phase before starting the next.** Stop after each phase for the user to verify and approve.
6. **Report after every task** with:
   - the files modified or created
   - the commands executed
   - the test, lint and build results (with real output, including failures)
   - remaining issues and next steps
7. **Keep this file current.** Update it when the phase changes or when we agree on an architecture or workflow change. Keep it concise.
