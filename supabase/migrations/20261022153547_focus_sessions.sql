-- Phase 10: focus timer sessions.
--
-- A session is a countdown of planned_minutes from started_at. Times come from
-- the database clock, never the client: started_at is always now() on insert,
-- and ending a session stamps ended_at = now() (capped at the planned end).
-- A session left running simply finishes at its planned end, so it counts in
-- full even if nobody presses "End". Only one session can be open at a time;
-- starting a new one closes the previous one.
-- Sessions are plain records that nothing references; deleting one removes it.

create table public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  label            text check (char_length(label) between 1 and 80),
  planned_minutes  smallint not null check (planned_minutes between 1 and 240),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  created_at       timestamptz not null default now(),
  constraint focus_sessions_end_after_start check (ended_at >= started_at)
);

create index focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);
-- At most one open session per user.
create unique index focus_sessions_one_open_idx
  on public.focus_sessions (user_id) where ended_at is null;

create or replace function public.focus_sessions_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.label := nullif(pg_catalog.btrim(new.label), '');
  new.started_at := now();
  new.ended_at := null;
  -- Close whatever was still open (the update trigger stamps the end time).
  update public.focus_sessions
     set ended_at = now()
   where user_id = new.user_id and ended_at is null;
  return new;
end;
$$;

create trigger focus_sessions_before_insert
  before insert on public.focus_sessions
  for each row execute function public.focus_sessions_before_insert();

create or replace function public.focus_sessions_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.label := nullif(pg_catalog.btrim(new.label), '');
  new.started_at := old.started_at;
  new.planned_minutes := old.planned_minutes;
  if old.ended_at is not null then
    -- An ended session stays ended at the same moment.
    new.ended_at := old.ended_at;
  elsif new.ended_at is not null then
    -- Now, or the planned end if that came first.
    new.ended_at := least(
      now(),
      old.started_at + pg_catalog.make_interval(mins => old.planned_minutes)
    );
  end if;
  return new;
end;
$$;

create trigger focus_sessions_before_update
  before update on public.focus_sessions
  for each row execute function public.focus_sessions_before_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.focus_sessions enable row level security;

create policy "focus_sessions: select own"
  on public.focus_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "focus_sessions: insert own"
  on public.focus_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "focus_sessions: update own"
  on public.focus_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "focus_sessions: delete own"
  on public.focus_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.focus_sessions from anon, authenticated;
grant select, delete on table public.focus_sessions to authenticated;
grant insert (label, planned_minutes) on table public.focus_sessions to authenticated;
grant update (label, ended_at) on table public.focus_sessions to authenticated;

revoke execute on function public.focus_sessions_before_insert() from public, anon, authenticated;
revoke execute on function public.focus_sessions_before_update() from public, anon, authenticated;
