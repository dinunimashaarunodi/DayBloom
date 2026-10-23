-- Phase 20: opt-in reminders by Web Push.
--
-- reminder_settings: one row per user. A morning reminder ("You have N tasks
-- planned today") and an evening one (a gentle invitation to reflect, only if
-- today isn't reviewed yet), each with its own local time. Off by default.
-- push_subscriptions: one row per user and device (browser push endpoint).
--
-- Every 5 minutes pg_cron calls private.send_reminders(), which asks the Edge
-- Function `send-reminders` to send. The function calls claim_due_reminders()
-- with the service role: it marks reminders as sent for the local day (so each
-- goes out at most once) and returns who to notify. A reminder more than two
-- hours late is skipped rather than sent at an odd time.

create table public.reminder_settings (
  user_id          uuid primary key default auth.uid()
                   references auth.users (id) on delete cascade,
  morning_enabled  boolean not null default false,
  morning_time     time not null default '08:00',
  evening_enabled  boolean not null default false,
  evening_time     time not null default '20:30',
  -- Written only by claim_due_reminders(): the local day each was last sent.
  last_morning_on  date,
  last_evening_on  date,
  updated_at       timestamptz not null default now()
);

create trigger reminder_settings_set_updated_at
  before update on public.reminder_settings
  for each row execute function public.set_updated_at();

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  endpoint      text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh        text not null check (char_length(p256dh) between 1 and 200),
  auth          text not null check (char_length(auth) between 1 and 100),
  subscribed_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index push_subscriptions_endpoint_idx on public.push_subscriptions (endpoint, subscribed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.reminder_settings enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "reminder_settings: select own"
  on public.reminder_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "reminder_settings: insert own"
  on public.reminder_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "reminder_settings: update own"
  on public.reminder_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "push_subscriptions: select own"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "push_subscriptions: insert own"
  on public.push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "push_subscriptions: delete own"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.reminder_settings from anon, authenticated;
grant select on table public.reminder_settings to authenticated;
grant insert (morning_enabled, morning_time, evening_enabled, evening_time)
  on table public.reminder_settings to authenticated;
grant update (morning_enabled, morning_time, evening_enabled, evening_time)
  on table public.reminder_settings to authenticated;

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, delete on table public.push_subscriptions to authenticated;
grant insert (endpoint, p256dh, auth) on table public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Which reminders are due now. Called by the Edge Function with the service
-- role only. Marks them as sent first, so overlapping runs can't send twice.
-- A device that several accounts subscribed (a shared browser) only gets the
-- reminders of the account that subscribed it last.
-- ---------------------------------------------------------------------------
create or replace function public.claim_due_reminders()
returns table (
  kind text,
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  body text,
  url text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with local as (
    select r.user_id,
           (pg_catalog.now() at time zone p.timezone)::date as day,
           (pg_catalog.now() at time zone p.timezone)::time as at,
           r.morning_enabled, r.morning_time, r.last_morning_on,
           r.evening_enabled, r.evening_time, r.last_evening_on
    from public.reminder_settings r
    join public.profiles p on p.user_id = r.user_id
    where (r.morning_enabled or r.evening_enabled)
      and exists (select 1 from public.push_subscriptions s where s.user_id = r.user_id)
  ),
  due as (
    select l.user_id, 'morning'::text as kind, l.day
    from local l
    where l.morning_enabled
      and l.at >= l.morning_time
      and l.at - l.morning_time < interval '2 hours'
      and l.last_morning_on is distinct from l.day
    union all
    select l.user_id, 'evening', l.day
    from local l
    where l.evening_enabled
      and l.at >= l.evening_time
      and l.at - l.evening_time < interval '2 hours'
      and l.last_evening_on is distinct from l.day
  ),
  claimed as (
    update public.reminder_settings r
       set last_morning_on = case when d.kind = 'morning' then d.day else r.last_morning_on end,
           last_evening_on = case when d.kind = 'evening' then d.day else r.last_evening_on end
      from due d
     where r.user_id = d.user_id
    returning r.user_id, d.kind, d.day
  ),
  messages as (
    select c.user_id, c.kind,
      case c.kind
        when 'morning' then 'Good morning'
        else 'How did today go?'
      end as title,
      case c.kind
        when 'morning' then (
          select case count(*)
                   when 0 then 'A fresh day. What would you like to get done?'
                   when 1 then 'You have 1 task planned today.'
                   else 'You have ' || count(*) || ' tasks planned today.'
                 end
          from public.tasks t
          where t.user_id = c.user_id and t.due_date = c.day
            and t.status = 'todo' and t.deleted_at is null
        )
        else 'Take a minute to notice how your day went.'
      end as body
    from claimed c
    -- The evening reminder is only for days that aren't reflected on yet.
    where c.kind = 'morning' or not exists (
      select 1 from public.days d
      where d.user_id = c.user_id and d.local_date = c.day and d.reviewed_at is not null
    )
  )
  select m.kind, m.user_id, s.endpoint, s.p256dh, s.auth, m.title, m.body, '/today'::text
  from messages m
  join public.push_subscriptions s on s.user_id = m.user_id
  where s.subscribed_at = (
    select max(other.subscribed_at) from public.push_subscriptions other
    where other.endpoint = s.endpoint
  );
end;
$$;

revoke execute on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;

-- ---------------------------------------------------------------------------
-- Schedule: every 5 minutes, ask the Edge Function to send. Its URL and shared
-- secret live in Vault (set per project, never in a migration); without them
-- this does nothing.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create or replace function private.send_reminders()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  function_url text;
  secret text;
begin
  select decrypted_secret into function_url
    from vault.decrypted_secrets where name = 'reminders_function_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'reminders_secret';
  if function_url is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := function_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    timeout_milliseconds := 20000
  );
end;
$$;

revoke execute on function private.send_reminders() from public, anon, authenticated;

select cron.schedule(
  'daybloom-send-reminders',
  '*/5 * * * *',
  'select private.send_reminders()'
);
