# SAMPLAS M Web

This folder is a Vercel-ready scaffold for the future SAMPLAS M Admin + API system.

It does not replace the existing Figma/Buzz plugin or the existing Express backend.

## Local Setup

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000/admin
```

## Vercel Setup

When importing this repository into Vercel:

- Framework Preset: `Next.js`
- Root Directory: `web`
- Environment Variables:
  - `OPENAI_API_KEY`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET` optional
  - `OPENAI_MODEL` optional
  - `OPENAI_REASONING_EFFORT` optional
  - `UPSTASH_REDIS_REST_URL` for editable guideline storage
  - `UPSTASH_REDIS_REST_TOKEN` for editable guideline storage

After deployment, test:

```text
https://your-project.vercel.app/health
https://your-project.vercel.app/api/health
```

Use this as the plugin backend URL:

```text
https://your-project.vercel.app
```

## Current Scope

Implemented:

- `/admin` preview dashboard
- `/admin/guidelines` editable guideline manager
- `/admin/brands` editable brand manager
- `/admin/feedback` editable feedback manager
- `/admin/test` generation test page
- `/admin/settings` admin password settings
- `/login` persistent admin session login
- `GET /health`
- `GET /api/health`
- `POST /api/generate-card-news`
- `GET /api/guidelines`
- `PUT /api/guidelines`
- `GET /api/guidelines/history`
- `GET /api/brands`
- `POST /api/brands`
- `PUT /api/brands/:brandName`
- `DELETE /api/brands/:brandName`
- `GET /api/feedback`
- `POST /api/feedback`
- `PATCH /api/feedback/:id`
- `DELETE /api/feedback/:id`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`

Not implemented yet:

- Full database migration beyond Redis

## Editable Guidelines

`/admin/guidelines` can save active rules when Redis storage is configured.

Required Vercel environment variables:

```text
ADMIN_PASSWORD
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

The API also accepts Vercel KV-style names:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

The Save button uses the server-side admin session. The OpenAI API key and Redis token remain server-side.

Saved guidelines are included in future `POST /api/generate-card-news` prompts.

## Brand And Feedback Storage

`/admin/brands` can add, edit, delete, and search brand knowledge entries.

`/admin/feedback` can mark feedback as `reviewed`, `useful`, or `ignored`, and can delete feedback entries.

Saved brand data and useful feedback are included in future `POST /api/generate-card-news` prompts.

## Admin Password

`ADMIN_PASSWORD` remains the first fallback password.

Users log in once at `/login`. The browser receives an HTTP-only admin session cookie, so `/admin/guidelines`,
`/admin/brands`, `/admin/feedback`, `/admin/test`, and `/admin/settings` do not ask for the password again during the session.

When Redis storage is configured, `/admin/settings` can save a new admin password. After a custom password is saved, that password is hashed in Redis and becomes the active admin password for future logins.
