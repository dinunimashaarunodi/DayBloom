-- Phase 8: habits and daily check-ins.
--
-- A habit is scheduled on some weekdays (days_mask: bit 0 = Monday ... bit 6
-- = Sunday; 127 = every day). A check-in is one row per habit per local day.
-- Habits are archived, never deleted, so their history stays intact.
-- Check-ins can be added or removed for today and the 7 days before it.

create table public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  days_mask    smallint not null default 127 check (days_mask between 1 and 127),
  position     double precision not null default extract(epoch from clock_timestamp()),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint habits_id_user_id_key unique (id, user_id)
);

create index habits_user_active_idx on public.habits (user_id, position)
  where archived_at is null;

create or replace function public.habits_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.name := pg_catalog.btrim(new.name);
  return new;
end;
$$;

create trigger habits_before_write
  before insert or update on public.habits
  for each row execute function public.habits_before_write();

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  habit_id    uuid not null,
  local_date  date not null,
  created_at  timestamptz not null default now(),
  constraint habit_logs_habit_fkey
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  constraint habit_logs_habit_day_key unique (habit_id, local_date)
);

create index habit_logs_user_day_idx on public.habit_logs (user_id, local_date);

-- New check-ins only for active habits.
create or replace function public.habit_logs_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.habits h
    where h.id = new.habit_id and h.user_id = new.user_id and h.archived_at is not null
  ) then
    raise exception 'This habit is archived' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger habit_logs_before_insert
  before insert on public.habit_logs
  for each row execute function public.habit_logs_before_insert();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits: select own"
  on public.habits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "habits: insert own"
  on public.habits for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "habits: update own"
  on public.habits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "habit_logs: select own"
  on public.habit_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "habit_logs: insert own recent"
  on public.habit_logs for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and local_date between public.current_local_date() - 7 and public.current_local_date()
  );
-- Unticking a check-in is a correction, so it deletes (same window).
create policy "habit_logs: delete own recent"
  on public.habit_logs for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and local_date between public.current_local_date() - 7 and public.current_local_date()
  );

revoke all on table public.habits from anon, authenticated;
grant select on table public.habits to authenticated;
grant insert (name, days_mask) on table public.habits to authenticated;
grant update (name, days_mask, position, archived_at) on table public.habits to authenticated;

revoke all on table public.habit_logs from anon, authenticated;
grant select, delete on table public.habit_logs to authenticated;
grant insert (habit_id, local_date) on table public.habit_logs to authenticated;

revoke execute on function public.habits_before_write() from public, anon, authenticated;
revoke execute on function public.habit_logs_before_insert() from public, anon, authenticated;
