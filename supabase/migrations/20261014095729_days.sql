-- Phase 5: days, end-of-day review and automatic day closing.
--
-- A day is "closed" once it is in the past for the user (local midnight in
-- their profile timezone). Closing freezes a snapshot (summary) of what was
-- planned, finished and scheduled, so later edits never rewrite history.
-- Closing never moves or changes tasks: unfinished tasks wait for the user's
-- decision on the Today page.
--
-- Closing is lazy and idempotent: the app calls close_past_days() when it
-- opens, and an hourly pg_cron job does the same for everyone as a backup.

-- Internal functions live in a schema the Data API doesn't expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- days
-- ---------------------------------------------------------------------------
create table public.days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  local_date   date not null,
  status       text not null default 'open' check (status in ('open', 'closed')),
  closed_at    timestamptz,
  summary      jsonb, -- frozen snapshot, written only by private.close_days_for_user
  mood         smallint check (mood between 1 and 5),
  energy       smallint check (energy between 1 and 5),
  wins         text check (wins is null or char_length(wins) <= 2000),
  reflection   text check (reflection is null or char_length(reflection) <= 2000),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint days_user_date_key unique (user_id, local_date),
  constraint days_closed_shape check ((status = 'closed') = (closed_at is not null and summary is not null))
);

comment on column public.days.summary is
  'Snapshot frozen when the day closed: planned tasks with their status at day end, tasks completed that day, events.';

create or replace function public.days_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.wins := nullif(pg_catalog.btrim(new.wins), '');
  new.reflection := nullif(pg_catalog.btrim(new.reflection), '');
  if tg_op = 'INSERT'
     or new.mood is distinct from old.mood
     or new.energy is distinct from old.energy
     or new.wins is distinct from old.wins
     or new.reflection is distinct from old.reflection then
    if new.mood is not null or new.energy is not null or new.wins is not null or new.reflection is not null then
      new.reviewed_at := pg_catalog.now();
    end if;
  end if;
  return new;
end;
$$;

create trigger days_before_write
  before insert or update on public.days
  for each row execute function public.days_before_write();

create trigger days_set_updated_at
  before update on public.days
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. Users write only their review, only for the last
-- 7 days up to today. Status and summary are written by the closing function.
-- ---------------------------------------------------------------------------
alter table public.days enable row level security;

create policy "days: select own"
  on public.days for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "days: insert own recent"
  on public.days for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and local_date between public.current_local_date() - 7 and public.current_local_date()
  );

create policy "days: update own recent"
  on public.days for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and local_date between public.current_local_date() - 7 and public.current_local_date()
  );

revoke all on table public.days from anon, authenticated;
grant select on table public.days to authenticated;
grant insert (local_date, mood, energy, wins, reflection) on table public.days to authenticated;
grant update (mood, energy, wins, reflection) on table public.days to authenticated;

-- Saves (creates or updates) the review for one day. Runs as the caller, so
-- RLS enforces ownership and the 7-day window.
create or replace function public.save_day_review(
  p_date date,
  p_mood smallint,
  p_energy smallint,
  p_wins text,
  p_reflection text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.days (local_date, mood, energy, wins, reflection)
  values (p_date, p_mood, p_energy, p_wins, p_reflection)
  on conflict (user_id, local_date) do update
    set mood = excluded.mood,
        energy = excluded.energy,
        wins = excluded.wins,
        reflection = excluded.reflection;
$$;

-- ---------------------------------------------------------------------------
-- Snapshot of one local day. Instants are converted to local dates with
-- "at time zone", which is exact (no daylight-saving ambiguity).
-- A planned task counts as done only if it was finished by the end of that
-- day, so closing late still records the day truthfully.
-- ---------------------------------------------------------------------------
create or replace function private.day_summary(p_user uuid, p_date date, p_tz text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'version', 1,
    'timezone', p_tz,
    'planned', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', t.id,
          'title', t.title,
          'status', case
            when t.status = 'done' and (t.completed_at at time zone p_tz)::date <= p_date then 'done'
            when t.status = 'dropped' then 'dropped'
            else 'unfinished'
          end
        )
        order by t.position, t.created_at
      )
      from public.tasks t
      where t.user_id = p_user and t.deleted_at is null and t.due_date = p_date
    ), '[]'::jsonb),
    'completed', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('id', t.id, 'title', t.title, 'due_date', t.due_date)
        order by t.completed_at
      )
      from public.tasks t
      where t.user_id = p_user and t.deleted_at is null and t.status = 'done'
        and (t.completed_at at time zone p_tz)::date = p_date
    ), '[]'::jsonb),
    'events', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', e.id, 'title', e.title, 'all_day', e.all_day,
          'starts_at', e.starts_at, 'ends_at', e.ends_at,
          'start_date', e.start_date, 'end_date', e.end_date
        )
        order by e.all_day desc, e.starts_at nulls first, e.title
      )
      from public.events e
      where e.user_id = p_user and e.deleted_at is null
        and case
          when e.all_day then p_date between e.start_date and e.end_date
          else (e.starts_at at time zone p_tz)::date <= p_date
           and ((e.ends_at - interval '1 microsecond') at time zone p_tz)::date >= p_date
        end
    ), '[]'::jsonb)
  );
$$;

-- Closes every past day with activity for one user. Idempotent: closed days
-- are never touched again. Returns how many days it closed.
create or replace function private.close_days_for_user(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  today date;
  d date;
  closed integer := 0;
begin
  select p.timezone into tz from public.profiles p where p.user_id = p_user;
  if tz is null then
    return 0;
  end if;
  today := (pg_catalog.now() at time zone tz)::date;

  for d in
    select distinct x.day
    from (
      select t.due_date as day from public.tasks t
        where t.user_id = p_user and t.deleted_at is null and t.due_date is not null
      union
      select (t.completed_at at time zone tz)::date from public.tasks t
        where t.user_id = p_user and t.deleted_at is null and t.completed_at is not null
      union
      select (e.starts_at at time zone tz)::date from public.events e
        where e.user_id = p_user and e.deleted_at is null and not e.all_day
      union
      select e.start_date from public.events e
        where e.user_id = p_user and e.deleted_at is null and e.all_day
      union
      select dy.local_date from public.days dy
        where dy.user_id = p_user and dy.status = 'open'
    ) x
    where x.day < today
      and not exists (
        select 1 from public.days c
        where c.user_id = p_user and c.local_date = x.day and c.status = 'closed'
      )
    order by x.day
  loop
    insert into public.days (user_id, local_date, status, closed_at, summary)
    values (p_user, d, 'closed', pg_catalog.now(), private.day_summary(p_user, d, tz))
    on conflict (user_id, local_date) do update
      set status = 'closed',
          closed_at = excluded.closed_at,
          summary = excluded.summary
      where public.days.status = 'open';
    closed := closed + 1;
  end loop;

  return closed;
end;
$$;

-- Called by the app. SECURITY DEFINER is needed because users can't write
-- status/summary themselves; it only ever acts on the caller's own data.
create or replace function public.close_past_days()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  return private.close_days_for_user(uid);
end;
$$;

-- Hourly backup for everyone (users who don't open the app still get their
-- days closed soon after their local midnight).
create or replace function private.close_days_for_everyone()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  total integer := 0;
begin
  for p in select user_id from public.profiles loop
    total := total + private.close_days_for_user(p.user_id);
  end loop;
  return total;
end;
$$;

revoke execute on function public.days_before_write() from public, anon, authenticated;
revoke execute on function private.day_summary(uuid, date, text) from public, anon, authenticated;
revoke execute on function private.close_days_for_user(uuid) from public, anon, authenticated;
revoke execute on function private.close_days_for_everyone() from public, anon, authenticated;
revoke execute on function public.close_past_days() from public, anon;
grant execute on function public.close_past_days() to authenticated;
revoke execute on function public.save_day_review(date, smallint, smallint, text, text) from public, anon;
grant execute on function public.save_day_review(date, smallint, smallint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Schedule: every hour at minute 5.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'daybloom-close-days',
  '5 * * * *',
  'select private.close_days_for_everyone()'
);
