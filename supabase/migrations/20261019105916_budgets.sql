-- Phase 7b: monthly budgets.
--
-- A budget is either for one expense category or overall (category_id null).
-- Budgets are effective-dated: each row applies from `starts_on` (the first
-- day of a month) until a later row for the same scope replaces it. So
-- changing a budget never rewrites past months. amount_minor null means
-- "no budget from this month on" (removing keeps the history too).

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  category_id   uuid, -- null = overall monthly budget
  starts_on     date not null check (extract(day from starts_on) = 1),
  amount_minor  bigint check (
                  amount_minor is null
                  or (amount_minor > 0 and amount_minor <= 1000000000000)
                ),
  -- Set from the profile by the trigger (placeholder lets clients omit it).
  currency      text not null default 'XXX' check (currency ~ '^[A-Z]{3}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint budgets_category_fkey
    foreign key (category_id, user_id) references public.finance_categories (id, user_id)
);

-- One row per scope per month. Null category (overall) gets a fixed stand-in.
create unique index budgets_scope_month_key
  on public.budgets (
    user_id,
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    starts_on
  );

create or replace function public.budgets_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category_kind text;
begin
  if tg_op = 'INSERT' then
    select p.currency into new.currency
    from public.profiles p
    where p.user_id = new.user_id;
    if new.currency is null then
      raise exception 'Choose your currency before setting budgets' using errcode = '22023';
    end if;

    if new.category_id is not null then
      select c.kind into category_kind
      from public.finance_categories c
      where c.id = new.category_id and c.user_id = new.user_id;
      if category_kind is distinct from 'expense' then
        raise exception 'Budgets are for expense categories only' using errcode = '22023';
      end if;
    end if;
  else
    new.currency := old.currency;
  end if;
  return new;
end;
$$;

create trigger budgets_before_write
  before insert or update on public.budgets
  for each row execute function public.budgets_before_write();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. No DELETE: set amount_minor to null to remove a budget.
-- ---------------------------------------------------------------------------
alter table public.budgets enable row level security;

create policy "budgets: select own"
  on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "budgets: insert own"
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "budgets: update own"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.budgets from anon, authenticated;
grant select on table public.budgets to authenticated;
grant insert (category_id, starts_on, amount_minor) on table public.budgets to authenticated;
grant update (amount_minor) on table public.budgets to authenticated;

-- Sets (or removes, with null) a budget from a month onwards. Runs as the
-- caller, so RLS, grants and the trigger all apply.
create or replace function public.set_budget(
  p_category_id uuid,
  p_starts_on date,
  p_amount_minor bigint
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.budgets (category_id, starts_on, amount_minor)
  values (p_category_id, pg_catalog.date_trunc('month', p_starts_on)::date, p_amount_minor)
  on conflict (
    user_id,
    (coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    starts_on
  ) do update set amount_minor = excluded.amount_minor;
$$;

revoke execute on function public.budgets_before_write() from public, anon, authenticated;
revoke execute on function public.set_budget(uuid, date, bigint) from public, anon;
grant execute on function public.set_budget(uuid, date, bigint) to authenticated;
