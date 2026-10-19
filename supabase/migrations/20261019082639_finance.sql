-- Phase 7: personal finance (expenses and income).
--
-- Money is stored as an integer number of minor units (e.g. cents) plus an
-- ISO 4217 currency code. Never floats. Each user has one currency (chosen
-- once, on their profile); every transaction records the currency it was
-- entered in, copied from the profile by the database.
-- Dates are local calendar days (occurred_on), like tasks.due_date.

-- ---------------------------------------------------------------------------
-- The user's currency
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column currency text check (currency is null or currency ~ '^[A-Z]{3}$');

comment on column public.profiles.currency is
  'ISO 4217 code for finance (e.g. LKR). Null until the user sets up finance.';

grant update (currency) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Categories. Never hard-deleted: archiving hides them from new entries but
-- keeps past transactions and analytics intact.
-- ---------------------------------------------------------------------------
create table public.finance_categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('expense', 'income')),
  name         text not null check (char_length(name) between 1 and 40),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint finance_categories_id_user_id_key unique (id, user_id)
);

-- No two active categories with the same name (ignoring case) per kind.
create unique index finance_categories_active_name_key
  on public.finance_categories (user_id, kind, lower(name))
  where archived_at is null;

create or replace function public.finance_categories_before_write()
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

create trigger finance_categories_before_write
  before insert or update on public.finance_categories
  for each row execute function public.finance_categories_before_write();

create trigger finance_categories_set_updated_at
  before update on public.finance_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('expense', 'income')),
  amount_minor  bigint not null check (amount_minor > 0 and amount_minor <= 1000000000000),
  currency      text not null check (currency ~ '^[A-Z]{3}$'),
  category_id   uuid,
  occurred_on   date not null, -- local calendar day
  note          text check (note is null or char_length(note) <= 500),
  deleted_at    timestamptz, -- soft delete
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- The category must belong to the same user.
  constraint transactions_category_fkey
    foreign key (category_id, user_id) references public.finance_categories (id, user_id),
  constraint transactions_id_user_id_key unique (id, user_id)
);

create index transactions_user_day_idx
  on public.transactions (user_id, occurred_on)
  where deleted_at is null;

-- Rules every client must follow: currency comes from the profile, and a
-- transaction's category must be of the same kind (and active when chosen).
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category record;
begin
  new.note := nullif(pg_catalog.btrim(new.note), '');

  if tg_op = 'INSERT' then
    select p.currency into new.currency
    from public.profiles p
    where p.user_id = new.user_id;
    if new.currency is null then
      raise exception 'Choose your currency before adding transactions' using errcode = '22023';
    end if;
  else
    new.currency := old.currency;
  end if;

  if new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id or new.kind is distinct from old.kind) then
    select c.kind, c.archived_at into category
    from public.finance_categories c
    where c.id = new.category_id and c.user_id = new.user_id;
    if category.kind is distinct from new.kind then
      raise exception 'Category does not match the transaction type' using errcode = '22023';
    end if;
    if category.archived_at is not null and new.category_id is distinct from (case when tg_op = 'UPDATE' then old.category_id end) then
      raise exception 'Category is archived' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_before_write
  before insert or update on public.transactions
  for each row execute function public.transactions_before_write();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. No DELETE: categories are archived, transactions
-- soft-deleted. Account deletion still removes everything (cascade).
-- ---------------------------------------------------------------------------
alter table public.finance_categories enable row level security;
alter table public.transactions enable row level security;

create policy "finance_categories: select own"
  on public.finance_categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "finance_categories: insert own"
  on public.finance_categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "finance_categories: update own"
  on public.finance_categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions: select own"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "transactions: insert own"
  on public.transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "transactions: update own"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.finance_categories from anon, authenticated;
grant select on table public.finance_categories to authenticated;
grant insert (kind, name) on table public.finance_categories to authenticated;
grant update (name, archived_at) on table public.finance_categories to authenticated;

revoke all on table public.transactions from anon, authenticated;
grant select on table public.transactions to authenticated;
grant insert (kind, amount_minor, category_id, occurred_on, note)
  on table public.transactions to authenticated;
grant update (kind, amount_minor, category_id, occurred_on, note, deleted_at)
  on table public.transactions to authenticated;

-- ---------------------------------------------------------------------------
-- Starter categories, created once for a user who has none.
-- Runs as the caller, so RLS and grants apply. Safe to call repeatedly.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_default_finance_categories()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.finance_categories where user_id = (select auth.uid())) then
    return;
  end if;

  insert into public.finance_categories (kind, name)
  values
    ('expense', 'Food & groceries'),
    ('expense', 'Eating out'),
    ('expense', 'Transport'),
    ('expense', 'Bills & utilities'),
    ('expense', 'Rent & housing'),
    ('expense', 'Health'),
    ('expense', 'Shopping'),
    ('expense', 'Entertainment'),
    ('expense', 'Education'),
    ('expense', 'Other'),
    ('income', 'Salary'),
    ('income', 'Freelance'),
    ('income', 'Gifts'),
    ('income', 'Other income')
  on conflict do nothing;
end;
$$;

revoke execute on function public.finance_categories_before_write() from public, anon, authenticated;
revoke execute on function public.transactions_before_write() from public, anon, authenticated;
revoke execute on function public.ensure_default_finance_categories() from public, anon;
grant execute on function public.ensure_default_finance_categories() to authenticated;
