-- transactions.currency is always set by the transactions_before_write trigger
-- from the user's profile. A placeholder default ("XXX", the ISO 4217 code for
-- "no currency") lets clients omit the column (they can't write it anyway);
-- the trigger replaces it on every insert.
alter table public.transactions alter column currency set default 'XXX';
