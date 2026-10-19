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

3. In the prod dashboard, under **Authentication → URL Configuration**:
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

1. Import the GitHub repo in Vercel (framework: Next.js; defaults are fine).
2. Add these environment variables (Production and Preview):

   | Name                                   | Value                            |
   | -------------------------------------- | -------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<prod-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key             |

   The app never needs the secret key. Don't add `SUPABASE_SECRET_KEY` to Vercel.

3. Deploy. Add your domain, then update the Supabase Site URL and redirect URLs
   to match (step 1.3).

## 4. After the first deploy

- Sign up with a real address, confirm from your phone, and log in.
- Request a password reset and open the link on another device.
- Check that `https://<your-domain>/privacy` loads without signing in.
- Check the hourly day-closing job in the prod database:
  `select jobname, schedule, active from cron.job;`
- Consider Supabase **leaked password protection** (HaveIBeenPwned). It's flagged
  by the advisors and is available on paid plans.
