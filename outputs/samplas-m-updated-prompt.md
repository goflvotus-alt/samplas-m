# Updated Prompt for SAMPLAS M

You are a senior product engineer and AI systems architect.

You are working on an existing Figma/Buzz plugin project called **SAMPLAS M**.

## Important

Do not rebuild the project from scratch.

Preserve all existing functionality and architecture.

Only extend and improve the current system.

The project already includes:

- Figma/Buzz plugin
- Template-based card generation
- `CARD_TEMPLATE` and `CARD_TEMPLATE_[FORMAT]` support
- Format-based slide generation
- Page-by-page content input workflow
- User-written page content that AI improves
- OpenAI-powered content refinement through a secure backend
- PNG export via Figma `exportAsync`
- Backend separated from the plugin
- No direct OpenAI API calls from the Figma plugin

The current project specification is already implemented and should remain intact.

## Current Product Direction

SAMPLAS M is not simply a card-news generator.

It should evolve into:

> An AI-powered editorial operating system for a fashion concept store.

Primary use cases:

- Fashion concept store marketing
- Brand storytelling
- Product introductions
- Designer introductions
- Editorial-style social content
- Instagram carousel/card-news production

The system should help non-technical marketing staff create better editorial content without touching code or prompts.

## Current Workflow

The Figma/Buzz plugin panel should support this workflow:

1. User writes an overall post caption.
2. User writes the overall mood/direction freely.
3. User creates page-by-page content using arrow/page controls.
4. For each page, user specifies:
   - Format
   - Category
   - Draft title
   - Draft text
   - Photo
5. AI refines the content.
6. The plugin generates Figma/Buzz cards from the relevant template frames.

The AI should polish and structure user-provided material, not invent unsupported facts.

## Template Rules

Template frames are defined inside Figma/Buzz.

Default template:

```text
CARD_TEMPLATE
```

Format-specific templates:

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

The plugin should read available `CARD_TEMPLATE_...` frames and show them in the format selector.

Required layers:

```text
TITLE
IMAGE
```

Optional layers:

```text
BODY
CAPTION
CATEGORY
OVERLAY
BACKGROUND
```

Each format template may have a different layer structure. Optional layers should be filled only when present.

## Template Page Separation

Templates are separated from generated output.

Recommended Figma/Buzz structure:

```text
Page: SAMPLAS_TEMPLATES
  CARD_TEMPLATE_COVER
  CARD_TEMPLATE_STORY
  CARD_TEMPLATE_QUOTE
  ...

Page: Current working page
  Generated Card 01
  Generated Card 02
  ...
```

The plugin should:

- Search templates from a page named `SAMPLAS_TEMPLATES`
- Generate output cards on the current active page
- Fall back to current-page template search only when `SAMPLAS_TEMPLATES` is missing

Do not assume templates can be shared across different Figma files automatically. A plugin can normally access only the currently open file.

## Image Handling

Current image handling:

- User uploads image in plugin UI.
- Plugin applies it to the `IMAGE` layer using Figma image fill.
- Fill mode is `scaleMode: "FILL"`.
- This means images are cropped by Figma to fill the target frame.

Important:

AI does not currently analyze the image.

If a 16:9 photo is placed into a 1:1 frame, Figma will crop it using fill behavior. It will not automatically understand faces, products, or visual composition.

Current practical image focus options:

```text
Center
Top
Bottom
Left
Right
```

Future improvement:

Smart AI crop may be added later, but that requires image data to be sent to an image-capable model through a secure backend or future web server.

## Backend

The current backend is a Node.js/Express API server.

It is responsible for:

- Keeping `OPENAI_API_KEY` secure
- Receiving generation requests from the plugin
- Calling the OpenAI API
- Returning structured JSON cards

Existing endpoints:

```text
GET /health
POST /api/generate-card-news
```

The plugin must never call OpenAI directly.

The OpenAI API key must never be exposed to:

- Figma plugin code
- `ui.html`
- Client browser UI

The Figma plugin may store the deployed backend API URL in Figma client storage.

This saved URL should:

- Be entered through a `Backend API URL` field
- Support a `Paste` button
- Persist across plugin sessions
- Stay locked after saving
- Be editable or deletable only through the field's right-click menu

This field is for the backend URL only, not for `OPENAI_API_KEY`.

## Website/Admin Server Direction

Important update:

Do **not** implement the web-based Admin UI or website server in the current phase.

The website/admin server will be added later and should be designed for **Vercel-based deployment**.

This means:

- Do not build `/admin` inside the current Express backend right now.
- Do not add a full web admin UI to the current plugin project right now.
- Do not introduce Next.js/Vercel app structure unless explicitly requested.
- Keep the current backend focused on plugin AI generation.
- Design API/data boundaries so a future Vercel admin app can integrate cleanly.

Future Vercel app may include:

- Guideline Manager Admin UI
- Brand knowledge base editor
- Feedback review dashboard
- Test generation interface
- Authentication/admin password or account-based auth
- Vercel API routes or calls to a separate backend API

But these are future additions, not current deliverables.

## Future Guideline Manager

In a later Vercel-based admin app, managers should be able to update AI behavior without editing prompts.

Future guideline categories:

- Brand Tone
- Content Structure Types
- Banned Expressions
- Good Examples
- Bad Examples
- Brand Data
- Image Usage Rules
- CTA Rules
- Hashtag Rules

Future data structure may look like:

```json
{
  "brandTone": [],
  "contentStructures": [],
  "bannedExpressions": [],
  "goodExamples": [],
  "badExamples": [],
  "brandData": [],
  "imageRules": [],
  "ctaRules": [],
  "hashtagRules": []
}
```

Do not implement this admin system yet unless explicitly asked.

## Future Prompt Builder

The AI should eventually use a Prompt Builder that combines:

1. Fixed system instructions
2. Brand Tone
3. Content Structure Types
4. Banned Expressions
5. Good Examples
6. Bad Examples
7. Brand Data
8. Recent feedback summary
9. User request

The fixed system instructions should not be editable from the future Admin UI.

For now, keep the current backend prompt simple and compatible with future Prompt Builder integration.

## Future Feedback Loop

Future feature:

After generation, show:

```text
생성 결과는 어땠나요?
```

Allow free-text feedback such as:

- 너무 광고 같다
- 브랜드 맥락이 부족하다
- 설명이 너무 길다
- 더 편집샵스럽게 써달라

Future buttons:

- Save Feedback
- Regenerate With Feedback

Do not implement this full feedback system now unless explicitly requested.

## Future Learning Memory

Future memory entries may store:

```json
{
  "timestamp": "",
  "originalInput": {},
  "generatedOutput": {},
  "feedback": ""
}
```

Before future generations, recent feedback may be summarized and injected into the Prompt Builder.

Goal:

Allow the AI to gradually adapt to the client’s editorial preferences.

Do not implement persistent learning memory now unless explicitly requested.

## Future Brand Knowledge Base

Future brand entries may support:

```json
{
  "brandName": "",
  "designer": "",
  "keywords": [],
  "description": "",
  "comparableBrands": [],
  "notes": []
}
```

Goal:

Create a store-specific editorial knowledge base.

This should belong to the future Vercel admin/web system, not the current Figma plugin UI.

## Current Implementation Priorities

For the current phase, prioritize:

1. Preserve current Figma/Buzz plugin behavior.
2. Improve template separation using `SAMPLAS_TEMPLATES`.
3. Keep generated content on the current working page.
4. Add practical image focus controls before attempting AI image crop.
5. Keep backend API stable and secure.
6. Keep code simple and maintainable.
7. Update README and client handoff docs whenever behavior changes.

## Current Deliverables

When implementing current-phase work, provide:

- Modified plugin code
- Updated `dist/code.js`
- Modified `ui.html`
- Modified backend only if needed
- Updated README
- Updated client handoff documentation

Do **not** deliver:

- Vercel app
- Admin website
- `/admin` Express route
- Full guideline manager
- Full feedback memory system
- User account system

Those are future Vercel-based additions.

## Engineering Constraints

Use:

- Official Figma Plugin API
- TypeScript for plugin source
- Vanilla HTML/CSS/JS for plugin UI
- Node.js/Express for current backend

Avoid:

- Rebuilding from scratch
- External UI libraries inside the plugin
- Exposing OpenAI API key to the plugin
- Premature framework migration
- Implementing future Vercel/web admin features before requested

The project should remain easy for a fashion retailer to understand, hand off, and maintain.
