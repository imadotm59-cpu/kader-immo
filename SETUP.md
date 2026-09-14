# Put Kader Immo online

You, the website maintainer, do these steps once. Afterwards the client uses only **your-domain.com/admin**.

The code is implemented but not connected to a live Supabase project or deployed on your Vercel account. Keep the old site until the final checklist passes.

## 1. Save the old listings

The old records exist in the browser used to create them, not necessarily in the code folder. On the **old website in that original browser**, open Developer Tools → Console and run:

```js
const saved = localStorage.getItem('kader-properties-v2');
if (!saved) {
  console.log('No saved listings here. Check the correct site and browser.');
} else {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([saved], {type:'application/json'}));
  link.href = url;
  link.download = 'kader-old-listings.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

Keep this file privately outside the repository. Do not clear the old storage. Nothing in the migration deletes it.

The six hardcoded examples are preserved in `migration/example-listings.json`. These are illustrative, not verified inventory. Import them only if wanted and check every detail before publishing.

## 2. Create Supabase and run the SQL

1. Create a Supabase project using **your owner account**. Choose a nearby available region and save the database password privately. This app does not use that password.
2. Open **SQL Editor → New query**.
3. Paste the entire contents of `supabase/migrations/001_cms.sql` and click **Run**.
4. In Table Editor, verify `properties` and `admin_users` exist with RLS enabled.
5. In Storage, verify `property-images` exists and is **private**. The SQL creates the bucket and its policies.

Run this once on a new project. If those tables or bucket already exist, do not drop them: reconcile the schema first. The migration is transactional; a failed run rolls back.

| Table/bucket | Purpose |
| --- | --- |
| `properties` | UUID, reference, title, price, status, published/archived/featured flags, ordered image paths, timestamps; optional existing fields in a `data` JSON object |
| `admin_users` | Which Supabase Auth users may manage the website |
| `auth.users` | Supabase's built-in account table; do not create it yourself |
| `property-images` | Private JPEG/PNG/WebP photos, up to 2 MB each |

Only administrators upload/delete images; visitors read images referenced by published, non-archived listings. This uses [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control).

## 3. Create the client login

1. Supabase → **Authentication → Users → Add user / Create user**.
2. Use `kader225@admin.com` if that is still the intended login. For password-recovery emails, prefer an address you or the client actually controls.
3. Enter a **new strong password privately**, not a password previously shared in chat or embedded in the demo. Do not add it to code or environment variables.
4. Use the owner-dashboard option to confirm the email when creating the account.
5. Copy the new user's UUID. In SQL Editor, run:

```sql
insert into public.admin_users (user_id)
values ('PASTE-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

6. In Authentication settings, keep email/password sign-in enabled and **disable new user signups**.
7. Set the Auth Site URL to your canonical website origin. Configure strong password requirements; see [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

An Auth account alone is not an admin. The membership row is essential. Never invite the client to your Supabase organization.

Password recovery is handled by you through Supabase's supported account-management flow. A custom self-service reset page is not included. To revoke access, remove the account's `admin_users` row: every protected request rechecks it.

## 4. Set environment variables

Find the project URL and publishable key in Supabase's project connection/API settings.

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `SUPABASE_ANON_KEY` | Publishable key, `sb_publishable_...`, or legacy **anon** key |
| `APP_ORIGIN` | Exact website origin, e.g. `https://your-domain.com`, with no path |

The compatibility name `SUPABASE_ANON_KEY` accepts the new publishable key. Do **not** use a secret/service-role key, database password, or admin password. The backend refuses elevated keys. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

These are server variables, not `VITE_` or `NEXT_PUBLIC_` variables. No service-role key is required.

For local testing, create a private `.env` beside `package.json`, using `.env.example` as a template. Set `APP_ORIGIN=http://localhost:3000`.

With Node.js 22 or later installed:

```sh
npm run dev
```

Open http://localhost:3000/admin. Keep the terminal running during local testing. No npm packages are needed. Opening `index.html` directly or using a static-only Python server will not run the backend.

The included `.gitignore` excludes `.env` files except the blank example. Do not commit private exports. If a secret was ever committed, ignoring it now is not enough: rotate it and remove it from history.

## 5. Deploy on Vercel

1. Put this project in **your private GitHub repository**, without secrets or private exports.
2. In your Vercel account: **Add New → Project → Import Git Repository**.
3. Select the folder containing `package.json` as the root.
4. Framework: **Other**. The included `vercel.json` sets Build Command to `npm run build` and Output Directory to `dist`.
5. Use a supported Node.js version of 22 or later.
6. Add the three variables above to **Production**. Initially, `APP_ORIGIN` can be the exact production `https://your-project.vercel.app` address.
7. Deploy. Check `/`, `/admin`, and `/api/cms?action=public` (which should return JSON).

Vercel hosts the public assets and deploys `api/cms.js` as a serverless function with its server helpers. No VPS or always-running server is needed. See [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js).

Use a separate Supabase project for previews where possible; don't expose production editing to untrusted preview branches. The API also accepts that deployment's own `VERCEL_URL` origin.

After changing environment variables, **redeploy**.

## 6. Connect your domain

1. Vercel → Project → **Settings → Domains → Add**.
2. At your registrar, enter the exact DNS records Vercel displays. Wait for verification and HTTPS.
3. Choose one canonical hostname, with or without `www`; redirect the other.
4. Set Production `APP_ORIGIN` to that exact HTTPS origin, then redeploy.
5. Update Supabase's Auth Site URL to match.

See [Vercel's custom-domain instructions](https://vercel.com/docs/domains/working-with-domains/add-a-domain). If login says “Request origin is not allowed,” correct the hostname—do not allow every origin.

## 7. Import the old listings

After the account and API work, run locally:

```sh
npm run import:listings -- /absolute/path/kader-old-listings.json
```

The tool targets `APP_ORIGIN`. To override that, set `IMPORT_ORIGIN` in your private local `.env` to your deployed website's origin. The tool prompts for the admin email and a hidden password, then signs out when done.

- All imports are **private Drafts**. Review and publish individually.
- Existing references are skipped, never overwritten. Rerunning after a failure skips completed records.
- Old IDs get stable legacy references if needed; PostgreSQL assigns new UUIDs.
- Base64 images and Unsplash URLs are supported. Each file must be under 2 MB.
- For another trusted image host, explicitly add its hostname to comma-separated `IMPORT_IMAGE_HOSTS` in your local private environment.
- Temporary `blob:` links cannot be migrated; reupload original files manually.
- CMS exports with `imagePaths` can be imported into the **same Supabase project**, not automatically copied across projects.
- A failed import may leave unused uploads; clean them from Media library after checking.

An export contains property fields and paths, not a full backup of Storage files.

## 8. Test before handing over

1. Log in; verify wrong credentials fail.
2. Add a draft with details, a custom feature and two images. Refresh and confirm persistence.
3. Edit title/price/description/location/details; save. The listing count must not increase.
4. Reorder images, change the cover, replace an image; save and reopen.
5. Choose Available, check Featured, and publish.
6. In a private browser or another device, verify public listings, homepage, details and map.
7. Unpublish/archive; refresh the public page and verify disappearance. Restore stays private until published.
8. Duplicate: the copy must have a new reference and be a private Draft.
9. Delete only a throwaway listing/unused image. Shared images should survive on other listings.
10. Sign out; `/admin` returns to login and unauthenticated `/api/cms?action=properties` returns 401.
11. Test an Auth account without membership: admin login/operations must be denied.
12. Verify RLS directly with anonymous/non-admin roles: published rows readable, drafts/archives hidden, mutations denied. Check Storage policies too. Automated tests mock Supabase; they do not validate deployed RLS.
13. Check mobile, keyboard focus, language/theme, empty lists and network failures. Check provider logs without logging passwords/tokens.
14. Configure Vercel Firewall rate limiting for POST `/api/cms?action=login` and review Supabase Auth rate limits before launch. Test without locking out legitimate users.
15. Set up database **and Storage file** backups and test restore.

Public pages revalidate every 30 seconds while open. Private image paths persist; signed display links last one hour. Previously issued links may still work until they expire after unpublishing. Don't upload confidential documents as property photos.

## Client handoff

Give the client only:

- Their `https://your-domain.com/admin` address.
- Their login email and new password via a secure channel.
- “Listings → Add Property → enter details/upload photos → Save Draft or Publish Listing. Settings → Sign out when finished.”

Do not give Vercel, GitHub, Supabase, environment-variable or database access.

## Troubleshooting

| Message | Check |
| --- | --- |
| CMS configuration is missing | Server env exists; restart locally or redeploy |
| Invalid email or password | Auth credentials and confirmed-email state |
| No administrator access | Exact user UUID in `admin_users` |
| Origin not allowed | Canonical hostname matches `APP_ORIGIN` |
| Database/storage request failed | SQL applied, private bucket/policies exist; inspect provider logs |
| Reference exists | Use a unique reference |
| Listing changed in another session | Copy unsaved text, reload and reapply to latest version |
| Publishing requires details | Positive price/area, location, description, image and non-Draft status |
| Image too large | Resize to under 2 MB; JPEG/PNG/WebP only |
| Saved but cleanup failed | Listing saved; retry unused-file cleanup in Media library |

The original contact email on the website remains unverified. Contact forms prepare a WhatsApp message for the visitor to send; no email-delivery service was added. The migration does not add AI, finance integrations or visitor-tracking analytics.
