# Deploying DayBloom

Production uses its own Supabase project (never `daybloom-dev`) and Vercel.
Server code runs in Mumbai (`bom1`, set in `vercel.json`), next to the database.

## 1. Production Supabase project

1. Create the project in the same region as dev (South Asia, Mumbai):

   ```powershell
   npx supabase projects create daybloom-prod --org-id <org-id> --region ap-south-1 --db-password "<strong password>"
   ```

   Keep the password in a password manager, not in the repo.

2. Apply every migration. Link prod, push, then **relink dev** so day-to-day
   commands keep targeting dev:

   ```powershell
   npx supabase link --project-ref <prod-ref>
   npx supabase db push
   npx supabase db advisors --linked   # expect only the two accepted warnings
   npx supabase link --project-ref dltckblhqkhdxbfeuflx
   ```

3. Set the production auth URLs. (Done for https://day-bloom-lilac.vercel.app.) Either use the dashboard
   (**Authentication → URL Configuration**), or push a temporary copy of `supabase/config.toml` with
   prod values: `npx supabase config push --project-ref <prod-ref> --workdir <tmp-dir>`, auth service only.
   The values:
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/**`

   Don't run `config push` against prod: `supabase/config.toml` holds the
   localhost URLs used by dev.

4. Under **Authentication → Providers → Email**, make sure "Confirm email" is on.
   Then set the password rules: at least 8 characters, with letters and digits.

## 2. Email (custom SMTP with Resend)

Supabase's built-in email sends only a few messages an hour, which isn't enough
for real users.

1. Create a Resend account and verify a domain you own (DNS records).
   Without a verified domain, Resend only delivers to your own address.
2. Create an API key that is only allowed to send email.
3. In the prod dashboard, under **Authentication → Emails → SMTP Settings**:
   - Host `smtp.resend.com`, port `465`, user `resend`, password: the API key
   - Sender: e.g. `DayBloom <hello@your-domain>`
4. Optionally use the templates in `supabase/templates/` (they use `token_hash`
   links, verified by `/auth/confirm`). The app's current links (via
   `/auth/callback`) also work without them.

## 3. Vercel

> Turn off **Settings → Deployment Protection → Vercel Authentication** for production,
> otherwise every visitor is sent to a Vercel login page.

1. Import the GitHub repo in Vercel (framework: Next.js; defaults are fine).
2. Add these environment variables (Production and Preview):

   | Name                                   | Value                            |
   | -------------------------------------- | -------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<prod-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key             |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | the VAPID public key (reminders) |

   The app never needs the secret key or the VAPID private key. Don't add
   `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY` or `REMINDERS_SECRET` to Vercel.

3. Deploy. Add your domain, then update the Supabase Site URL and redirect URLs
   to match (step 1.3).

## 3b. Reminders (Web Push)

Reminders are sent by the Supabase Edge Function `send-reminders`, which
pg_cron calls every 5 minutes (migration `20261023035207_reminders`). Per
project:

1. Keys: one VAPID key pair and a random `REMINDERS_SECRET`, kept in
   `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` = the site URL, `REMINDERS_SECRET`). Dev and prod can share
   the key pair.
2. Function secrets (from a temporary env file, deleted afterwards):
   `REMINDERS_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   and `SERVICE_KEY` (that project's secret key):

   ```powershell
   npx supabase secrets set --env-file <tmp-file> --project-ref <ref>
   npx supabase functions deploy send-reminders --use-api --no-verify-jwt --project-ref <ref>
   ```

3. Vault (so the cron job knows where to call, and with which secret):

   ```sql
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-reminders', 'reminders_function_url');
   select vault.create_secret('<REMINDERS_SECRET>', 'reminders_secret');
   ```

   Run with `npx supabase db query --linked --file <tmp.sql>` while linked to
   that project. Without these two secrets the job does nothing.

4. Check: `select private.send_reminders()`, then
   `select status_code, content from net._http_response order by created desc limit 1`
   should show `200` and `{"due":…,"sent":…}`.

## 4. After the first deploy

- Sign up with a real address, confirm from your phone, and log in.
- Request a password reset and open the link on another device.
- Check that `https://<your-domain>/privacy` loads without signing in.
- Check the hourly day-closing job in the prod database:
  `select jobname, schedule, active from cron.job;`
- Consider Supabase **leaked password protection** (HaveIBeenPwned). It's flagged
  by the advisors and is available on paid plans.
