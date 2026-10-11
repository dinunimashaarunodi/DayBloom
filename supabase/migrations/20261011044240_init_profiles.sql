-- Phase 1: user profiles.
-- One row per auth user, created automatically on signup.

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at current. Reused by later tables.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id      uuid primary key default auth.uid()
               references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  timezone     text not null default 'UTC', -- IANA name, e.g. 'Asia/Colombo'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'One row per user. Created by the on_auth_user_created trigger.';
comment on column public.profiles.timezone is 'IANA timezone; defines when the user''s day starts and ends (local midnight).';

-- Reject unknown timezones so date logic can always trust this column.
create or replace function public.profiles_validate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate
  before insert or update of timezone on public.profiles
  for each row execute function public.profiles_validate();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Profiles are created by the signup trigger and deleted by the auth.users
-- cascade, so users only get SELECT and UPDATE (least privilege).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Explicit grants, defense in depth on top of RLS.
-- anon gets nothing, and users may only change the editable columns.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, timezone) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user.
-- SECURITY DEFINER is required: the trigger runs as the auth system while
-- inserting into public.profiles. auth.uid() is not set during signup, so the
-- row is tied to NEW.id instead. Timezone and name come from signup metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz   text := new.raw_user_meta_data ->> 'timezone';
  display text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  if tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;

  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, left(display, 80), tz);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger functions must never be callable through the Data API (RPC).
revoke execute on function public.set_updated_at()    from public, anon, authenticated;
revoke execute on function public.profiles_validate() from public, anon, authenticated;
revoke execute on function public.handle_new_user()   from public, anon, authenticated;
