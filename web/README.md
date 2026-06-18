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
- `/admin/brands` scaffold
- `/admin/feedback` scaffold
- `/admin/test` generation test page
- `GET /health`
- `GET /api/health`
- `POST /api/generate-card-news`
- `GET /api/guidelines`
- `PUT /api/guidelines`
- `GET /api/guidelines/history`
- Read-only sample APIs for guidelines, brands, and feedback

Not implemented yet:

- Persistent admin login
- Brand and feedback database storage
- Brand editing
- Feedback moderation

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

The Save button sends the admin password only to the server API. The OpenAI API key and Redis token remain server-side.

Saved guidelines are included in future `POST /api/generate-card-news` prompts.
