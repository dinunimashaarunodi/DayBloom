-- Phase 6: users can delete their own account from the app.
--
-- Deleting the auth user removes everything they own: every table references
-- auth.users with "on delete cascade" (profiles, tasks, events, days).
--
-- SECURITY DEFINER is necessary because users can't delete from auth.users
-- themselves. It only ever deletes the caller (auth.uid()), never anyone else.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
