# Kader Immo CMS

Existing vanilla HTML/CSS/JavaScript website, connected to Vercel Functions and Supabase PostgreSQL, Auth and Storage. No framework rewrite or manually maintained server.

Start with **[the step-by-step production setup guide](SETUP.md)**. No real Supabase project or Vercel deployment is configured in this repository.

## Local development

Install Node.js 22 or later. Create a private `.env` using `.env.example`, then:

```sh
npm run dev
npm test
npm run build
```

Open http://localhost:3000 and http://localhost:3000/admin. Opening `index.html` directly or using a Python-only static server no longer works: authentication and listings require the API. There are no npm dependencies to install.

## Architecture

- `app.js`: original public/dashboard templates and translations.
- `cms-client.js`: requests, editor, media, filters, previews, publication and error states.
- `api/cms.js`: same-origin API and property/image operations.
- `server/supabase.js`: provider requests, verified sessions, HttpOnly cookies, CSRF checks.
- `server/validation.js`: server-side field and upload validation.
- `supabase/migrations/001_cms.sql`: tables, private bucket, RLS, timestamp triggers.
- `scripts/import.mjs`: owner-run importer for old browser exports.
- `tests/cms.test.mjs`: automated validation and mocked API tests.
- `tests/preview.mjs`: optional isolated UI fixture. Never deployed; fake data disappears when stopped.

The production build includes only four public assets in `dist/`. Vercel deploys `api/cms.js` separately.

## Changes from the demo

Listings and permanent image paths now live in Supabase. Only theme/language preferences use localStorage. There are no built-in credentials or client-side Auth tokens.

Editing updates the existing ID, fixing the old duplicate-on-edit bug. Features, image order, availability, publication and featured flags persist. Archive/restore, filters, grid/table, draft previews, media cleanup and export work through the CMS.

Simulated metrics were replaced with actual portfolio counts/distributions. The AI panel and nonfunctional finance/customer widgets were removed. Contact forms prepare a WhatsApp message for the visitor to send, rather than falsely claiming to send email.

The original styling, centered full-height hero, agency map, French/Arabic public controls and day/night styling remain. Dashboard and property text are not automatically translated.

## Security and limits

Use a publishable/anon key, **never** a service-role key. A valid Supabase login plus `admin_users` membership is required. Give clients only the website login.

Images: JPEG/PNG/WebP, 2 MB each, 20 per property. Private paths persist; one-hour signed URLs are generated for display. Open public listing pages revalidate every 30 seconds. Previously issued URLs can remain usable until expiration after unpublishing.

Stale edits return a conflict instead of overwriting another session's changes. JSON exports contain paths, not image backups. Arrange database and Storage backups.

Automated tests mock Supabase; they do not prove deployed RLS. Complete SETUP.md's live acceptance checklist before client handoff.
