# SAMPLAS M Client Handoff

## Recommended Setup

Do not ask the client to run the backend locally.

Deploy the backend once, then give the client the backend URL.

This repository now includes two deployment paths:

1. Existing Express backend in `backend/`
2. New Vercel-ready scaffold in `web/`

For new client-facing deployment, prefer the Vercel scaffold once it has been tested with the client's OpenAI key.

## Backend Deployment

Use a Node.js hosting service such as Render, Railway, Fly.io, or any server that supports Node 18+.

For Render, this repository includes `render.yaml`.

Required environment variable:

```bash
OPENAI_API_KEY=your-openai-api-key
```

Optional environment variables:

```bash
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
PORT=3000
```

After deployment, test:

```text
https://your-backend-url/health
```

It should return:

```json
{ "ok": true }
```

## Vercel Deployment

In Vercel, import the GitHub repository and use:

```text
Framework Preset: Next.js
Root Directory: web
```

Required environment variables:

```bash
OPENAI_API_KEY=your-openai-api-key
ADMIN_PASSWORD=your-admin-password
```

Optional environment variables:

```bash
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=low
```

After deployment, test:

```text
https://your-project.vercel.app/health
https://your-project.vercel.app/api/health
https://your-project.vercel.app/admin
```

Use this plugin Backend API URL:

```text
https://your-project.vercel.app
```

## Client Steps

1. Import `manifest.json` in Figma or Buzz.
2. Run `SAMPLAS M`.
3. Paste the deployed backend URL into `Backend API URL`.
4. Click `Test Backend`.
5. Fill the overall caption and mood.
6. Add page-by-page format, title, text, and photo.
7. Use `AI로 다듬기`.

The backend URL is saved inside Figma client storage. To change or remove it, right-click the `Backend API URL` field and choose `Edit` or `Delete`.

Manual card generation does not need the backend.

## Template Layers

Required:

- `CARD_TEMPLATE`
- `TITLE`
- `IMAGE`

Optional:

- `BODY`
- `CAPTION`
- `CATEGORY`
- `OVERLAY`
- `BACKGROUND`

## Format Names

Format names are defined by Figma frame names.

Recommended setup:

```text
Page: SAMPLAS_TEMPLATES
  CARD_TEMPLATE_COVER
  CARD_TEMPLATE_STORY
  CARD_TEMPLATE_INFORMATION

Page: Working page
  Generated Card 01
  Generated Card 02
```

The plugin searches `SAMPLAS_TEMPLATES` first and generates cards on the current working page. If `SAMPLAS_TEMPLATES` is missing or empty, it falls back to the current page.

Use this pattern:

```text
CARD_TEMPLATE_[FORMAT_NAME]
```

Examples:

```text
CARD_TEMPLATE_COVER
CARD_TEMPLATE_STORY
CARD_TEMPLATE_INFORMATION
CARD_TEMPLATE_QUOTE
CARD_TEMPLATE_CLOSING
CARD_TEMPLATE_CASE_STUDY
```

The plugin automatically reads these frames and shows them in the page `양식` dropdown.

Each format frame may have a different layer structure. Only `TITLE` and `IMAGE` are required. Optional layers are filled only when present.

## Image Focus

For each page, the user can choose:

```text
Center
Top
Bottom
Left
Right
```

This is not AI image analysis. It is practical crop positioning inside Figma.

## Future Admin System Status

Implemented as Vercel scaffold:

- `web/`
- `/admin`
- `/admin/guidelines`
- `/admin/brands`
- `/admin/feedback`
- `/admin/test`
- `/api/health`
- `/api/generate-card-news`

Not implemented yet:

- Persistent admin login
- Database storage
- Guideline editing
- Brand database editing
- Feedback review dashboard

Prepared for future implementation:

- Vercel migration plan
- Admin UI specification
- API contract
- Sample guideline data
- Sample brand data
- Sample feedback data
- Prompt Builder helper scaffold

The client can use the plugin now with the existing backend API. The Admin system should be treated as the next project phase.
