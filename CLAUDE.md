# DayBloom

A multi-user personal productivity and life-progress web app, installable as a PWA.
Anyone can sign up, and each user sees only their own data.

## Current phase

**Phase 0: Scaffold. Not started yet.** The plan is approved.
Update this line whenever a phase is completed and verified.

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold: Next.js, Tailwind, shadcn, ESLint/Prettier, Vitest, Playwright | ⏳ |
| 1 | Supabase, auth (email confirm, password reset), profiles, RLS | |
| 2 | `lib/dates` timezone utilities and tests | |
| 3 | Tasks and Today page | |
| 4 | Calendar (month/week, one-off events) | |
| 5 | Day close, review, "Needs a decision" flow, history | |
| 6 | Hardening, custom SMTP, account deletion, privacy page, Vercel deploy | |
| 7+ | Habits → Journal → Focus timer → Finance → Workouts → Goals → Languages → Achievements → PWA and notifications | |

Postponed until the MVP is stable: recurrence, Google Calendar sync, Web Push, offline writes,
spaced-repetition (SRS) algorithms, multi-currency, export, drag-and-drop calendar editing.

## Stack and architecture

- **Next.js (App Router) with TypeScript (strict)**, Tailwind CSS, shadcn/ui, Recharts (from the finance phase onward).
- **Supabase:** PostgreSQL, Auth (via `@supabase/ssr` cookies) and `pg_cron`.
  - One hosted project for dev (`daybloom-dev`) and a separate one for prod.
  - No local Docker stack.
- **Libraries:** Zod for validation, `date-fns` with `@date-fns/tz` for dates. No ORM and no global state library.
- **Reads:** Server Components.
- **Writes:** Server Actions. Each one validates with Zod, writes through Supabase under RLS, then calls `revalidatePath`.
- **Client components:** only where interaction is needed.
- **Shared rules live in Postgres:** constraints, RLS, and RPC functions such as `close_day` and `move_task`.
  - Don't put business rules only in Server Actions; they must also work for any future client.
- **Deployment:** Vercel. The mobile experience is an **installable PWA** with no native app.

### Layout

```
src/app/(auth)/...         login, signup, password reset
src/app/(app)/...          authenticated pages (today, tasks, calendar, history, settings)
src/features/<domain>/     queries.ts, actions.ts, schema.ts, components/
src/components/ui/         shadcn components (generated, minimal edits)
src/components/layout/     app shell, navigation
src/lib/supabase/          server.ts, client.ts, proxy.ts
src/lib/dates/             the ONLY place for timezone/day logic
src/types/database.ts      generated, never hand-edited
src/proxy.ts               session refresh and route guard
supabase/migrations/       all schema changes
tests/unit/, tests/e2e/
```

Features may import from `lib/` and `components/`, but never from another feature's internals.
Keep `lib/dates` and the Zod schemas free of React and Next.js imports.

## Time and day rules

- `timestamptz` (UTC) is for moments: `completed_at`, `started_at`.
- `date` is for local calendar days: `due_date`, `local_date`.
- **The day ends at local midnight**, in the IANA timezone stored on the user's profile.
- Never derive "today" from the server clock or `toISOString().slice(0,10)`. Use `lib/dates` with an injectable `now`.
- Never add 24h in milliseconds to move a day. Use date arithmetic, which keeps daylight-saving changes correct.
- Closing a day is lazy and idempotent: `close_day()` runs when the app opens, with an hourly `pg_cron` job as a backup.
  - The day snapshot (`days.summary`) is frozen at close.
- **Unfinished tasks are never moved automatically.** Show a friendly "Needs a decision" prompt with three choices:
  - Do it today
  - Choose a date
  - Let it go (sets the status to `dropped`)
- Never add snooze or postpone shortcuts. Warn the user when `times_moved >= 2`.
- Timers store `started_at` in the database and compute elapsed time. They never count ticks in the browser.

## Database and Supabase security rules

- Every schema change is a new migration: `npx supabase migration new <name>`.
  - Never edit a migration that has already been pushed. Never change the schema through the dashboard.
- Every table has the following, with no exceptions:
  - `user_id uuid not null default auth.uid() references auth.users on delete cascade`
  - `alter table ... enable row level security`
  - a policy `for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)`
  - an index on `user_id`
- Child tables carry `user_id` too and use composite foreign keys, e.g. `(goal_id, user_id) → goals(id, user_id)`.
- Grant no policies to `anon`.
- Store money as an integer number of minor units (`bigint`) plus a currency. Never use floats.
- Soft-delete records that carry history (`deleted_at` or `archived_at`).
- `SECURITY DEFINER` functions are allowed only when necessary. They must set `search_path = ''` and check `auth.uid()`.
- Authorize on the server with `supabase.auth.getUser()` or `getClaims()`, never `getSession()`.
- Secrets:
  - The secret (service-role) key is server-only and may never appear in `NEXT_PUBLIC_*` variables or client code.
  - `.env.local` is never committed. Keep `.env.example` up to date.
- After each schema change, regenerate the types with `npm run db:types`.

## UI consistency

- Use shadcn/ui components first. Check `src/components/` before creating a new component.
- Extract a component once it is used twice or more. Don't build abstractions for single use.
- Use Tailwind with the theme tokens from shadcn CSS variables. Don't hard-code colours.
- Support light and dark mode.
- Design mobile-first: it must work at 375px wide with no horizontal scroll.
- Every data view needs loading, empty and error states.
- Forms use a Zod schema shared with the Server Action, and show field-level errors.
- Use accessible labels, keyboard navigation and visible focus states.
- The tone is friendly and encouraging, without guilt-tripping or nudging the user to postpone.

## Commands (Windows PowerShell)

> ⚠️ **Not verified yet.** These are the planned scripts, to be created and confirmed in Phase 0.
> Replace this note once each command has been run successfully.

```powershell
npm run dev          # dev server, http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run build        # production build (then: npm start)
npm run db:types     # regenerate src/types/database.ts

npx supabase migration new <name>
npx supabase db push                 # apply migrations to the linked project
```

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
4. **Definition of done.** These must all pass: `lint`, `typecheck`, `test` and `build`.
5. **Finish each phase before starting the next.** Stop after each phase for the user to verify and approve.
6. **Report after every task** with:
   - the files modified or created
   - the commands executed
   - the test, lint and build results (with real output, including failures)
   - remaining issues and next steps
7. **Keep this file current.** Update it when the phase changes or when we agree on an architecture or workflow change. Keep it concise.
