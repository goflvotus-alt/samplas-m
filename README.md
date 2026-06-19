# SAMPLAS M

SAMPLAS M is a Figma plugin that clones a `CARD_TEMPLATE` frame and generates card-news layouts from page-by-page content drafts.

## Template

Create one frame on the current Figma page named `CARD_TEMPLATE`.

Inside it, add these layers:

- `TITLE`
- `BODY`
- `IMAGE`
- `CAPTION`
- `CATEGORY`
- `OVERLAY`
- `BACKGROUND`

`TITLE`, `BODY`, `CAPTION`, and `CATEGORY` should be text layers. `IMAGE` must be a layer that supports fills, such as a rectangle or frame. `BACKGROUND` and `OVERLAY` should also be fillable layers, such as rectangles or frames.

Only `TITLE` and `IMAGE` are required. The plugin updates the other layers when they exist.

## Format Templates

Create a page named:

```text
SAMPLAS_TEMPLATES
```

Keep reusable template frames on that page. Generated cards are placed on the current working page.

If `SAMPLAS_TEMPLATES` is missing or empty, the plugin falls back to the current page.

You can define format names directly in Figma by creating template frames with this naming pattern:

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

The plugin reads these frames and shows them in the `양식` selector.

Each format template can have its own layer structure. Use the same layer names inside each template:

- Required: `TITLE`, `IMAGE`
- Optional: `BODY`, `CAPTION`, `CATEGORY`, `OVERLAY`, `BACKGROUND`

If a format-specific frame is missing, the plugin falls back to `CARD_TEMPLATE`.

## Image Focus

Each page can set a photo focus:

- Center
- Top
- Bottom
- Left
- Right

`Center` uses normal Figma fill behavior. The directional options use crop positioning to keep that side of the photo more visible.

## Plugin Setup

Install and build the Figma plugin:

```bash
npm install
npm run build
```

The manifest points to `dist/code.js`. A compiled copy is included, but rebuilding keeps it in sync with `code.ts`.

## Backend Setup

For client delivery, prefer deploying the backend once and giving the user the deployed URL. See `CLIENT_HANDOFF.md`.

Install backend dependencies:

```bash
cd backend
npm install
cp ../.env.example .env
```

Edit `backend/.env` and set `OPENAI_API_KEY`.

Start the local backend:

```bash
npm start
```

The plugin UI expects the backend at `http://localhost:3000`. If you type the URL manually, include `http://`.

## Run in Figma

1. Open Figma.
2. Go to Plugins > Development > Import plugin from manifest.
3. Select this project's `manifest.json`.
4. Open a Figma file containing `CARD_TEMPLATE`.
5. Run Plugins > Development > SAMPLAS M.

## Workflow

1. Write the overall post caption.
2. Write the overall mood.
3. Add page-by-page content with the arrow/page controls.
4. For each page, set format, category, title, text, photo, and photo focus.
5. Click `AI로 다듬기` to polish the pages and generate cards.
6. Use `템플릿 생성` to generate from the raw page inputs without the backend.

Generated cards are placed on the current working page, to the right of the current selection or existing page content with 80px spacing. To export PNGs, select generated card frames and click `Export Selected PNG`.

## Backend API URL Storage

The plugin has a `Backend API URL` field with a `Paste` button.

When a backend URL is pasted or entered, it is saved in Figma client storage and restored when the plugin is opened again.

After saving, the field is locked to prevent accidental edits. Right-click the field and choose `Edit` or `Delete` to change it.

Do not put `OPENAI_API_KEY` in this field. The OpenAI key belongs only on the backend server.

## Future Vercel Admin/API Preparation

This repository now includes migration-ready planning files and a Vercel-ready `web/` scaffold for a future Admin + API system.

Current behavior is unchanged:

- The Figma/Buzz plugin still works with `GET /health`.
- The Figma/Buzz plugin still generates AI content through `POST /api/generate-card-news`.
- The existing Express backend in `backend/server.js` is still present and is not replaced.

Preparation documents:

- `docs/vercel-migration-plan.md`
- `docs/admin-ui-spec.md`
- `docs/api-contract.md`
- `docs/prompt-builder-scaffold.md`

Sample data files:

- `data/guidelines.sample.json`
- `data/guideline-history.sample.json`
- `data/brands.sample.json`
- `data/feedback.sample.json`

Safe helper scaffold:

- `backend/lib/promptBuilder.js`

Vercel scaffold:

- `web/`
- `web/app/admin`
- `web/app/admin/guidelines`
- `web/app/admin/brands`
- `web/app/admin/feedback`
- `web/app/admin/test`
- `web/app/admin/settings`
- `web/app/api/health`
- `web/app/api/generate-card-news`
- `web/app/health`

When importing this repository into Vercel, set the Root Directory to:

```text
web
```

Then add these Vercel environment variables:

```text
OPENAI_API_KEY
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
OPENAI_MODEL
OPENAI_REASONING_EFFORT
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

After deployment, use this as the plugin Backend API URL:

```text
https://your-project.vercel.app
```

The future full Admin system may eventually provide:

- `/admin`
- `/admin/guidelines`
- `/admin/brands`
- `/admin/feedback`
- `/admin/test`
- `/api/generate-card-news`
- `/api/guidelines`
- `/api/guidelines/history`
- `/api/brands`
- `/api/feedback`

Do not remove the Express backend until the Vercel app is deployed, tested, and accepted as the new production backend.

### Editable Vercel Guidelines

The Vercel scaffold includes an editable `/admin/guidelines` page.

To make guideline saves persistent in Vercel, add Redis storage credentials to the Vercel project:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

The implementation also accepts Vercel KV-style names:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

The admin site uses `/login` for a persistent browser session. Saved guidelines are read by `POST /api/generate-card-news` and included in the OpenAI prompt.

### Admin Password Changes

The first admin password comes from the Vercel `ADMIN_PASSWORD` environment variable.

When Redis storage is connected, `/admin/settings` can save a new admin password. The saved password is hashed in Redis and becomes the active admin password for future logins. The Vercel `ADMIN_PASSWORD` environment variable remains valid as an emergency recovery password.

### Editable Brands And Feedback

The Vercel scaffold includes editable `/admin/brands` and `/admin/feedback` pages.

Brand data can be added, edited, deleted, and searched. Useful feedback can be marked and is included in future AI generation prompts.
