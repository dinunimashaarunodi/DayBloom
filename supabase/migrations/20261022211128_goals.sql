-- Phase 12: goals and milestones.
--
-- A goal has an optional "why" and target date, and a status: active,
-- achieved or archived. Goals are never deleted (archive instead) so their
-- history stays available for achievements. Progress comes from milestones,
-- a checklist per goal. Timestamps (achieved_at, done_at) come from the
-- database clock; clients only flip the status or the done flag.

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 100),
  why          text check (char_length(why) between 1 and 1000),
  target_date  date,
  status       text not null default 'active'
               check (status in ('active', 'achieved', 'archived')),
  achieved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint goals_id_user_id_key unique (id, user_id),
  constraint goals_achieved_shape check ((status = 'achieved') = (achieved_at is not null))
);

create index goals_user_status_idx on public.goals (user_id, status, created_at);

create or replace function public.goals_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := pg_catalog.btrim(new.title);
  new.why := nullif(pg_catalog.btrim(new.why, E' \t\r\n'), '');
  if new.status = 'achieved' then
    -- Keep the original moment if it was already achieved.
    new.achieved_at := case
      when tg_op = 'UPDATE' and old.status = 'achieved' then old.achieved_at
      else now()
    end;
  else
    new.achieved_at := null;
  end if;
  return new;
end;
$$;

create trigger goals_before_write
  before insert or update on public.goals
  for each row execute function public.goals_before_write();

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  goal_id     uuid not null,
  title       text not null check (char_length(title) between 1 and 100),
  done        boolean not null default false,
  done_at     timestamptz,
  position    double precision not null default extract(epoch from clock_timestamp()),
  created_at  timestamptz not null default now(),
  constraint goal_milestones_goal_fkey
    foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  constraint goal_milestones_done_shape check (done = (done_at is not null))
);

create index goal_milestones_user_idx on public.goal_milestones (user_id);
create index goal_milestones_goal_idx on public.goal_milestones (goal_id, position);

create or replace function public.goal_milestones_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := pg_catalog.btrim(new.title);
  if new.done then
    new.done_at := case
      when tg_op = 'UPDATE' and old.done then old.done_at
      else now()
    end;
  else
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger goal_milestones_before_write
  before insert or update on public.goal_milestones
  for each row execute function public.goal_milestones_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;

-- Goals: no delete (archive instead).
create policy "goals: select own"
  on public.goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "goals: insert own"
  on public.goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "goals: update own"
  on public.goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goal_milestones: own"
  on public.goal_milestones for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.goals from anon, authenticated;
grant select on table public.goals to authenticated;
grant insert (title, why, target_date) on table public.goals to authenticated;
grant update (title, why, target_date, status) on table public.goals to authenticated;

revoke all on table public.goal_milestones from anon, authenticated;
grant select, delete on table public.goal_milestones to authenticated;
grant insert (goal_id, title) on table public.goal_milestones to authenticated;
grant update (title, done, position) on table public.goal_milestones to authenticated;

revoke execute on function public.goals_before_write() from public, anon, authenticated;
revoke execute on function public.goal_milestones_before_write() from public, anon, authenticated;
