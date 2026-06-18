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
- `/admin/guidelines` scaffold
- `/admin/brands` scaffold
- `/admin/feedback` scaffold
- `/admin/test` generation test page
- `GET /health`
- `GET /api/health`
- `POST /api/generate-card-news`
- Read-only sample APIs for guidelines, brands, and feedback

Not implemented yet:

- Persistent admin login
- Database storage
- Guideline editing
- Brand editing
- Feedback moderation
