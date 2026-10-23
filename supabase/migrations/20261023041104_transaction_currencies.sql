-- Phase 21: transactions in more than one currency.
--
-- A transaction may now be in any currency. When the client sends none (or
-- the placeholder default 'XXX'), the user's main currency (profiles.currency)
-- is used, as before. Amounts are never converted: analytics and budgets keep
-- summing only the main currency; other currencies get their own totals.

create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category record;
  main_currency text;
begin
  new.note := nullif(pg_catalog.btrim(new.note), '');

  select p.currency into main_currency
  from public.profiles p
  where p.user_id = new.user_id;
  if main_currency is null then
    raise exception 'Choose your currency before adding transactions' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    if new.currency is null or new.currency = 'XXX' then
      new.currency := main_currency;
    end if;
  elsif new.currency is null or new.currency = 'XXX' then
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

grant insert (currency) on table public.transactions to authenticated;
grant update (currency) on table public.transactions to authenticated;
