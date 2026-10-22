-- Phase 13: languages, practice log and vocabulary.
--
-- A language is archived, never deleted, so its practice history stays.
-- Practice entries belong to a local day (never a future one). Words are a
-- simple vocabulary list with a "learned" flag; learned_at comes from the
-- database clock. There is no spaced-repetition scheduling yet (postponed).

create table public.languages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  level        text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint languages_id_user_id_key unique (id, user_id)
);

create index languages_user_idx on public.languages (user_id, created_at);
-- One language of each name per user (case-insensitive).
create unique index languages_user_name_key
  on public.languages (user_id, lower(name));

create or replace function public.languages_before_write()
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

create trigger languages_before_write
  before insert or update on public.languages
  for each row execute function public.languages_before_write();

create trigger languages_set_updated_at
  before update on public.languages
  for each row execute function public.set_updated_at();

create table public.language_practice (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  language_id  uuid not null,
  local_date   date not null,
  minutes      smallint not null check (minutes between 1 and 600),
  activity     text not null check (activity in (
                 'lesson', 'vocabulary', 'reading', 'listening', 'speaking', 'writing', 'other')),
  notes        text check (char_length(notes) between 1 and 500),
  created_at   timestamptz not null default now(),
  constraint language_practice_language_fkey
    foreign key (language_id, user_id) references public.languages (id, user_id) on delete cascade
);

create index language_practice_user_day_idx
  on public.language_practice (user_id, local_date desc);
create index language_practice_language_idx
  on public.language_practice (language_id, local_date desc);

create table public.language_words (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  language_id  uuid not null,
  term         text not null check (char_length(term) between 1 and 100),
  meaning      text not null check (char_length(meaning) between 1 and 200),
  example      text check (char_length(example) between 1 and 300),
  learned      boolean not null default false,
  learned_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint language_words_language_fkey
    foreign key (language_id, user_id) references public.languages (id, user_id) on delete cascade,
  constraint language_words_learned_shape check (learned = (learned_at is not null))
);

create index language_words_user_idx on public.language_words (user_id);
create index language_words_language_idx on public.language_words (language_id, created_at desc);

-- Trims text (blank optional text means none) and stamps learned_at.
create or replace function public.language_text_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'language_practice' then
    new.notes := nullif(pg_catalog.btrim(new.notes, E' \t\r\n'), '');
  else
    new.term := pg_catalog.btrim(new.term);
    new.meaning := pg_catalog.btrim(new.meaning);
    new.example := nullif(pg_catalog.btrim(new.example), '');
    if new.learned then
      new.learned_at := case
        when tg_op = 'UPDATE' and old.learned then old.learned_at
        else now()
      end;
    else
      new.learned_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger language_practice_before_write
  before insert or update on public.language_practice
  for each row execute function public.language_text_before_write();

create trigger language_words_before_write
  before insert or update on public.language_words
  for each row execute function public.language_text_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.languages enable row level security;
alter table public.language_practice enable row level security;
alter table public.language_words enable row level security;

-- Languages: no delete (archive instead).
create policy "languages: select own"
  on public.languages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "languages: insert own"
  on public.languages for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "languages: update own"
  on public.languages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "language_practice: select own"
  on public.language_practice for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "language_practice: insert own, not in the future"
  on public.language_practice for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and local_date <= public.current_local_date()
  );
create policy "language_practice: delete own"
  on public.language_practice for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "language_words: own"
  on public.language_words for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.languages from anon, authenticated;
grant select on table public.languages to authenticated;
grant insert (name, level) on table public.languages to authenticated;
grant update (name, level, archived_at) on table public.languages to authenticated;

revoke all on table public.language_practice from anon, authenticated;
grant select, delete on table public.language_practice to authenticated;
grant insert (language_id, local_date, minutes, activity, notes)
  on table public.language_practice to authenticated;

revoke all on table public.language_words from anon, authenticated;
grant select, delete on table public.language_words to authenticated;
grant insert (language_id, term, meaning, example) on table public.language_words to authenticated;
grant update (term, meaning, example, learned) on table public.language_words to authenticated;

revoke execute on function public.languages_before_write() from public, anon, authenticated;
revoke execute on function public.language_text_before_write() from public, anon, authenticated;
