-- Phase 9: journal entries.
--
-- Free-form writing, any number of entries per local day. An entry belongs to
-- a calendar day (local_date), never a future one. Entries are private writing
-- that nothing else references, so deleting one removes it for real.

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  local_date  date not null,
  title       text check (char_length(title) between 1 and 120),
  body        text not null check (char_length(body) between 1 and 20000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index journal_entries_user_day_idx
  on public.journal_entries (user_id, local_date desc, created_at desc);

-- Trims the title (blank means no title) and the body's outer whitespace.
create or replace function public.journal_entries_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.title := nullif(pg_catalog.btrim(new.title), '');
  new.body := pg_catalog.btrim(new.body, E' \t\r\n');
  return new;
end;
$$;

create trigger journal_entries_before_write
  before insert or update on public.journal_entries
  for each row execute function public.journal_entries_before_write();

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.journal_entries enable row level security;

create policy "journal_entries: select own"
  on public.journal_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "journal_entries: insert own, not in the future"
  on public.journal_entries for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and local_date <= public.current_local_date()
  );
create policy "journal_entries: update own, not in the future"
  on public.journal_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and local_date <= public.current_local_date()
  );
create policy "journal_entries: delete own"
  on public.journal_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.journal_entries from anon, authenticated;
grant select, delete on table public.journal_entries to authenticated;
grant insert (local_date, title, body) on table public.journal_entries to authenticated;
grant update (local_date, title, body) on table public.journal_entries to authenticated;

revoke execute on function public.journal_entries_before_write() from public, anon, authenticated;
