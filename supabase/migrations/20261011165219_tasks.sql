-- Phase 3: tasks, plus the user's "today" computed in Postgres.
-- Rules that every client must obey (completion time, move counting) live in
-- the trigger below, not in the app.

-- ---------------------------------------------------------------------------
-- The signed-in user's current calendar day in their profile timezone.
-- Must always agree with todayIn() in src/lib/dates/local-date.ts (tested).
-- ---------------------------------------------------------------------------
create or replace function public.current_local_date()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (pg_catalog.now() at time zone p.timezone)::date
  from public.profiles p
  where p.user_id = (select auth.uid());
$$;

revoke execute on function public.current_local_date() from public, anon;
grant execute on function public.current_local_date() to authenticated;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  notes         text check (notes is null or char_length(notes) <= 5000),
  status        text not null default 'todo' check (status in ('todo', 'done', 'dropped')),
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date      date, -- local calendar day; null = no date ("someday")
  completed_at  timestamptz,
  times_moved   integer not null default 0 check (times_moved >= 0),
  position      double precision not null default extract(epoch from clock_timestamp()),
  deleted_at    timestamptz, -- soft delete: history (day snapshots) may refer to it
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tasks_completed_at_matches_status
    check ((status = 'done') = (completed_at is not null)),
  -- Lets future child tables use composite FKs: (task_id, user_id) -> tasks(id, user_id).
  constraint tasks_id_user_id_key unique (id, user_id)
);

comment on column public.tasks.times_moved is
  'How often an unfinished, dated task was postponed (date moved later or removed). Maintained by trigger.';
comment on column public.tasks.position is
  'Manual sort order. New tasks go last; reorder_tasks() rewrites positions.';

create index tasks_user_due_idx on public.tasks (user_id, due_date) where deleted_at is null;
create index tasks_user_completed_idx on public.tasks (user_id, completed_at)
  where status = 'done' and deleted_at is null;

-- Server-maintained fields. Clients can't write them (see grants), and this
-- trigger keeps them correct for every client.
create or replace function public.tasks_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := pg_catalog.btrim(new.title);

  -- completed_at follows status.
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then
      new.completed_at := old.completed_at;
    else
      new.completed_at := pg_catalog.now();
    end if;
  else
    new.completed_at := null;
  end if;

  -- Postponing an unfinished, dated task counts as a move. Moving it earlier
  -- (or giving an undated task a date) does not.
  if tg_op = 'INSERT' then
    new.times_moved := 0;
  elsif old.due_date is not null
        and new.status = 'todo'
        and (new.due_date is null or new.due_date > old.due_date) then
    new.times_moved := old.times_moved + 1;
  else
    new.times_moved := old.times_moved;
  end if;

  return new;
end;
$$;

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. No DELETE: tasks are soft-deleted via deleted_at.
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy "tasks: select own"
  on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tasks: insert own"
  on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "tasks: update own"
  on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.tasks from anon, authenticated;
grant select on table public.tasks to authenticated;
grant insert (title, notes, status, priority, due_date, position) on table public.tasks to authenticated;
grant update (title, notes, status, priority, due_date, position, deleted_at)
  on table public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- Reorder: positions follow the order of the given ids. RLS limits it to the
-- caller's own tasks; ids that aren't theirs are ignored.
-- ---------------------------------------------------------------------------
create or replace function public.reorder_tasks(task_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_catalog.cardinality(task_ids) > 500 then
    raise exception 'Too many tasks to reorder at once' using errcode = '22023';
  end if;

  update public.tasks t
  set position = o.ord
  from unnest(task_ids) with ordinality as o(id, ord)
  where t.id = o.id
    and t.user_id = (select auth.uid());
end;
$$;

revoke execute on function public.tasks_before_write() from public, anon, authenticated;
revoke execute on function public.reorder_tasks(uuid[]) from public, anon;
grant execute on function public.reorder_tasks(uuid[]) to authenticated;
