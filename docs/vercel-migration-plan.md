# SAMPLAS M Vercel Migration Plan

## Goal

Prepare SAMPLAS M for a future Vercel-based Admin + API system without replacing the current Figma/Buzz plugin or the existing Express backend.

The current plugin and Express backend must continue working as-is.

## Current System

- Figma/Buzz plugin
- `code.ts`
- `dist/code.js`
- `ui.html`
- Express backend in `backend/server.js`
- OpenAI generation endpoint: `POST /api/generate-card-news`
- Health endpoint: `GET /health`
- Template-based card generation
- `SAMPLAS_TEMPLATES` support
- PNG export

## Future Vercel Structure

```text
/app
  /login
  /admin
  /admin/guidelines
  /admin/brands
  /admin/feedback
  /admin/test

/app/api
  /health
  /generate-card-news
  /guidelines
  /guidelines/history
  /brands
  /feedback
```

## Future URLs

Admin:

```text
https://project.vercel.app/admin
```

API:

```text
https://project.vercel.app/api/generate-card-news
```

Plugin Backend URL:

```text
https://project.vercel.app
```

The plugin should keep calling:

```text
GET {Backend API URL}/health
POST {Backend API URL}/api/generate-card-news
```

For compatibility, the future Vercel API should preserve this route shape or provide a stable adapter.

## Migration Phases

### Phase 0: Current Preparation

Completed in this project phase:

- Add migration documentation.
- Add Admin UI specification.
- Add API contract documentation.
- Add sample JSON data files.
- Add prompt-builder scaffold that is not wired into production behavior yet.
- Preserve existing plugin and Express backend behavior.

### Phase 1: Vercel App Scaffold

Create a new Vercel app without deleting the Express backend.

Recommended approach:

- Add a separate `web/` or `vercel/` folder.
- Implement `/login`.
- Implement read-only Admin pages first.
- Implement `/api/health`.
- Implement `/api/generate-card-news` with the same request/response contract as the current Express backend.

Current scaffold added:

- `web/app/admin`
- `web/app/admin/guidelines`
- `web/app/admin/brands`
- `web/app/admin/feedback`
- `web/app/admin/test`
- `web/app/api/health`
- `web/app/api/generate-card-news`
- `web/app/health`

Deploy this scaffold by importing the repository into Vercel and setting Root Directory to `web`.

### Phase 2: Admin Data Editing

Add write operations:

- `PUT /api/guidelines`
- `POST /api/feedback`
- Brand create/update/delete
- Guideline history restore

### Phase 3: Plugin Cutover

Only after the Vercel API is verified:

1. Deploy Vercel app.
2. Paste `https://project.vercel.app` into the plugin `Backend API URL`.
3. Click `Test Backend`.
4. Verify generation.
5. Keep Express backend available as rollback until the Vercel system is stable.

## Security

Environment variables:

```bash
OPENAI_API_KEY=
ADMIN_PASSWORD=
```

Rules:

- `OPENAI_API_KEY` must remain server-side only.
- Never expose OpenAI keys to the plugin, browser UI, or Admin frontend bundle.
- `ADMIN_PASSWORD` is only for future Admin login.
- MVP sessions may use secure HTTP-only cookies.
- OAuth is not required for the first Admin version.

## Compatibility Rules

Do not break:

- `GET /health`
- `POST /api/generate-card-news`
- Existing plugin request body shape
- Existing plugin response handling
- Existing Express backend

Any Vercel API should either match current endpoints or provide compatibility aliases.
