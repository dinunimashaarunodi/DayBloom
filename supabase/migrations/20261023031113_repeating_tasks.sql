-- Phase 17: repeating tasks.
--
-- A task_series is a task that repeats: every day or on chosen weekdays
-- (days_mask: bit 0 = Monday ... bit 6 = Sunday), or monthly on a day of the
-- month (month_day; 29-31 fall back to the month's last day).
--
-- Occurrences are ordinary tasks. ensure_repeating_tasks() creates today's
-- occurrence lazily (when Today or Tasks loads), once: (series_id, occurs_on)
-- is unique, and occurs_on keeps the scheduled day even if the task is later
-- moved, finished or deleted. Nothing is ever moved automatically, so an
-- unfinished occurrence goes through "Needs a decision" like any other task.
-- Series are archived ("Stop repeating"), never deleted.

create table public.task_series (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  notes       text check (notes is null or char_length(notes) <= 5000),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  days_mask   smallint check (days_mask between 1 and 127),
  month_day   smallint check (month_day between 1 and 31),
  starts_on   date not null,
  ends_on     date,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Exactly one kind of schedule.
  constraint task_series_one_rule check ((days_mask is null) <> (month_day is null)),
  constraint task_series_ends_after_start check (ends_on is null or ends_on >= starts_on),
  constraint task_series_id_user_id_key unique (id, user_id)
);

create index task_series_user_active_idx on public.task_series (user_id)
  where archived_at is null;

create or replace function public.task_series_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := pg_catalog.btrim(new.title);
  return new;
end;
$$;

create trigger task_series_before_write
  before insert or update on public.task_series
  for each row execute function public.task_series_before_write();

create trigger task_series_set_updated_at
  before update on public.task_series
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Occurrences: tasks remember their series and the day they were scheduled.
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column series_id uuid,
  add column occurs_on date,
  add constraint tasks_series_fkey
    foreign key (series_id, user_id) references public.task_series (id, user_id)
    on delete cascade,
  add constraint tasks_series_shape check ((series_id is null) = (occurs_on is null)),
  add constraint tasks_series_occurrence_key unique (series_id, occurs_on);

comment on column public.tasks.occurs_on is
  'For a repeating task: the day it was scheduled for (kept when the task is moved).';

-- ---------------------------------------------------------------------------
-- Row Level Security. No DELETE: series are archived.
-- ---------------------------------------------------------------------------
alter table public.task_series enable row level security;

create policy "task_series: select own"
  on public.task_series for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "task_series: insert own"
  on public.task_series for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "task_series: update own"
  on public.task_series for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.task_series from anon, authenticated;
grant select on table public.task_series to authenticated;
grant insert (title, notes, priority, days_mask, month_day, starts_on, ends_on)
  on table public.task_series to authenticated;
grant update (title, notes, priority, days_mask, month_day, starts_on, ends_on, archived_at)
  on table public.task_series to authenticated;

-- ensure_repeating_tasks() runs as the caller, so it needs to insert these two
-- columns. A client writing them directly can only create tasks for its own
-- series (composite FK), at most one per day (unique). They can't be updated.
grant insert (series_id, occurs_on) on table public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Does a series fall on this day? (Mirrors occursOn() in
-- src/features/tasks/repeat.ts; tested against it.)
-- ---------------------------------------------------------------------------
create or replace function public.task_series_occurs_on(
  days_mask smallint,
  month_day smallint,
  day date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when days_mask is not null then
      (days_mask & (1 << (extract(isodow from day)::int - 1))) <> 0
    else
      extract(day from day)::int = least(
        month_day::int,
        extract(day from (date_trunc('month', day) + interval '1 month - 1 day'))::int
      )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Creates today's occurrence of each active series that falls on today
-- (lazy, idempotent). Returns how many tasks it created.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_repeating_tasks()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date := public.current_local_date();
  created integer;
begin
  if today is null then
    return 0;
  end if;

  insert into public.tasks (title, notes, priority, due_date, series_id, occurs_on)
  select s.title, s.notes, s.priority, today, s.id, today
  from public.task_series s
  where s.user_id = (select auth.uid())
    and s.archived_at is null
    and s.starts_on <= today
    and (s.ends_on is null or s.ends_on >= today)
    and public.task_series_occurs_on(s.days_mask, s.month_day, today)
  on conflict (series_id, occurs_on) do nothing;

  get diagnostics created = row_count;
  return created;
end;
$$;

revoke execute on function public.task_series_before_write() from public, anon, authenticated;
revoke execute on function public.task_series_occurs_on(smallint, smallint, date) from public, anon;
grant execute on function public.task_series_occurs_on(smallint, smallint, date) to authenticated;
revoke execute on function public.ensure_repeating_tasks() from public, anon;
grant execute on function public.ensure_repeating_tasks() to authenticated;
