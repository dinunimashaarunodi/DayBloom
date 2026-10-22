-- Phase 11: workout log.
--
-- One row per workout: its local day (never a future one), a kind, how long
-- it took, an optional effort rating and notes. Workouts are plain records
-- that nothing references; deleting one (e.g. logged by mistake) removes it.

create table public.workouts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  local_date        date not null,
  kind              text not null
                    check (kind in ('strength', 'cardio', 'walk', 'yoga', 'sport', 'other')),
  title             text check (char_length(title) between 1 and 80),
  duration_minutes  smallint not null check (duration_minutes between 1 and 600),
  -- 1 = easy, 2 = moderate, 3 = hard.
  effort            smallint check (effort between 1 and 3),
  notes             text check (char_length(notes) between 1 and 2000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workouts_user_day_idx
  on public.workouts (user_id, local_date desc, created_at desc);

-- Blank title or notes mean none.
create or replace function public.workouts_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := nullif(pg_catalog.btrim(new.title), '');
  new.notes := nullif(pg_catalog.btrim(new.notes, E' \t\r\n'), '');
  return new;
end;
$$;

create trigger workouts_before_write
  before insert or update on public.workouts
  for each row execute function public.workouts_before_write();

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.workouts enable row level security;

create policy "workouts: select own"
  on public.workouts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "workouts: insert own, not in the future"
  on public.workouts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and local_date <= public.current_local_date()
  );
create policy "workouts: update own, not in the future"
  on public.workouts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and local_date <= public.current_local_date()
  );
create policy "workouts: delete own"
  on public.workouts for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.workouts from anon, authenticated;
grant select, delete on table public.workouts to authenticated;
grant insert (local_date, kind, title, duration_minutes, effort, notes)
  on table public.workouts to authenticated;
grant update (local_date, kind, title, duration_minutes, effort, notes)
  on table public.workouts to authenticated;

revoke execute on function public.workouts_before_write() from public, anon, authenticated;
