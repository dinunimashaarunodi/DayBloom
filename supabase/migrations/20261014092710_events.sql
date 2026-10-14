-- Phase 4: one-off calendar events (no recurrence yet).
-- Two shapes, enforced by CHECK constraints:
-- - Timed events: real instants (starts_at, ends_at). The local day they show
--   on follows the user's timezone.
-- - All-day events: calendar days (start_date..end_date, inclusive). They
--   never shift, whatever the timezone.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  notes       text check (notes is null or char_length(notes) <= 5000),
  all_day     boolean not null default false,
  starts_at   timestamptz,
  ends_at     timestamptz,
  start_date  date,
  end_date    date,
  deleted_at  timestamptz, -- soft delete
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_shape check (
    case when all_day
      then start_date is not null and end_date is not null
           and starts_at is null and ends_at is null
           and end_date >= start_date
           and end_date - start_date < 366
      else starts_at is not null and ends_at is not null
           and start_date is null and end_date is null
           and ends_at > starts_at
           and ends_at - starts_at <= interval '7 days'
    end
  ),
  constraint events_id_user_id_key unique (id, user_id)
);

comment on table public.events is
  'One-off events. Timed events use starts_at/ends_at; all-day events use start_date/end_date (inclusive).';

create index events_user_starts_idx on public.events (user_id, starts_at)
  where deleted_at is null and not all_day;
create index events_user_dates_idx on public.events (user_id, start_date, end_date)
  where deleted_at is null and all_day;

create or replace function public.events_before_write()
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

create trigger events_before_write
  before insert or update on public.events
  for each row execute function public.events_before_write();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. No DELETE: events are soft-deleted via deleted_at.
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events: select own"
  on public.events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "events: insert own"
  on public.events for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "events: update own"
  on public.events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.events from anon, authenticated;
grant select on table public.events to authenticated;
grant insert (title, notes, all_day, starts_at, ends_at, start_date, end_date)
  on table public.events to authenticated;
grant update (title, notes, all_day, starts_at, ends_at, start_date, end_date, deleted_at)
  on table public.events to authenticated;

revoke execute on function public.events_before_write() from public, anon, authenticated;
