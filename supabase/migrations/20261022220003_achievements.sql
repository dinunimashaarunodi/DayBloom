-- Phase 14: achievements.
--
-- Achievements are derived, never stored: my_achievements() counts the
-- caller's own data (SECURITY INVOKER, so RLS applies) and returns each
-- achievement's progress and target. One is unlocked when progress reaches
-- its target, so there is nothing to fake. The UI copy (titles, descriptions)
-- lives in features/achievements/definitions.ts, keyed by code.
--
-- achievement_seen only remembers which unlocked achievements the user has
-- already seen, so new ones can be celebrated once.

create or replace function public.my_achievements()
returns table (code text, progress integer, target integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  me as (select auth.uid() as id),
  counts as (
    select
      (select count(*) from public.tasks t, me
        where t.user_id = me.id and t.status = 'done' and t.deleted_at is null) as tasks_done,
      (select count(*) from public.days d, me
        where d.user_id = me.id and d.reviewed_at is not null) as reflections,
      (select count(*) from public.habit_logs h, me where h.user_id = me.id) as checkins,
      (select count(*) from public.focus_sessions f, me where f.user_id = me.id) as focus_sessions,
      (select coalesce(sum(floor(extract(epoch from (
                least(
                  coalesce(f.ended_at, 'infinity'::timestamptz),
                  f.started_at + pg_catalog.make_interval(mins => f.planned_minutes),
                  now()
                ) - f.started_at)) / 60)), 0)
         from public.focus_sessions f, me where f.user_id = me.id) as focus_minutes,
      (select count(*) from public.workouts w, me where w.user_id = me.id) as workouts,
      (select count(*) from public.goals g, me
        where g.user_id = me.id and g.status = 'achieved') as goals_achieved,
      (select count(*) from public.journal_entries j, me where j.user_id = me.id) as journal_entries,
      (select count(*) from public.language_words lw, me
        where lw.user_id = me.id and lw.learned) as words_learned,
      (select coalesce(sum(lp.minutes), 0) from public.language_practice lp, me
        where lp.user_id = me.id) as practice_minutes,
      (select count(*) from public.budgets b, me
        where b.user_id = me.id and b.amount_minor is not null) as budgets_set,
      (select count(*) from public.transactions tr, me
        where tr.user_id = me.id and tr.deleted_at is null) as transactions
  ),
  defs (code, value, target) as (
    select v.code, v.value, v.target from counts c, lateral (values
      ('first_task',        c.tasks_done,       1),
      ('tasks_25',          c.tasks_done,       25),
      ('tasks_100',         c.tasks_done,       100),
      ('first_reflection',  c.reflections,      1),
      ('reflections_30',    c.reflections,      30),
      ('checkins_30',       c.checkins,         30),
      ('checkins_100',      c.checkins,         100),
      ('first_focus',       c.focus_sessions,   1),
      ('focus_10h',         c.focus_minutes,    600),
      ('first_workout',     c.workouts,         1),
      ('workouts_25',       c.workouts,         25),
      ('first_goal',        c.goals_achieved,   1),
      ('goals_5',           c.goals_achieved,   5),
      ('first_entry',       c.journal_entries,  1),
      ('entries_30',        c.journal_entries,  30),
      ('words_25',          c.words_learned,    25),
      ('practice_10h',      c.practice_minutes, 600),
      ('first_budget',      c.budgets_set,      1),
      ('transactions_100',  c.transactions,     100)
    ) as v(code, value, target)
  )
  select d.code, least(d.value, d.target)::integer, d.target::integer
  from defs d
  where (select id from me) is not null;
$$;

revoke execute on function public.my_achievements() from public, anon;
grant execute on function public.my_achievements() to authenticated;

create table public.achievement_seen (
  user_id  uuid not null default auth.uid()
           references auth.users (id) on delete cascade,
  code     text not null check (code ~ '^[a-z0-9_]{1,40}$'),
  seen_at  timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.achievement_seen enable row level security;

create policy "achievement_seen: select own"
  on public.achievement_seen for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "achievement_seen: insert own"
  on public.achievement_seen for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.achievement_seen from anon, authenticated;
grant select on table public.achievement_seen to authenticated;
grant insert (code) on table public.achievement_seen to authenticated;
