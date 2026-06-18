# SAMPLAS M Future Admin UI Specification

## Scope

This document describes the future Vercel-based Admin UI.

Do not implement this full Admin UI inside the current Figma plugin.
Do not add `/admin` to the current Express backend during the preparation phase.

## Routes

```text
/login
/admin
/admin/guidelines
/admin/brands
/admin/feedback
/admin/test
```

## Login

MVP login:

- Single password field.
- Password checked against `ADMIN_PASSWORD`.
- Session stored in secure cookie.
- No OAuth required.

## Admin Home

Route:

```text
/admin
```

Purpose:

- Link to guideline manager.
- Link to brand knowledge base.
- Link to feedback review.
- Link to test generation page.
- Show API health status.

## Guideline Manager

Route:

```text
/admin/guidelines
```

Layout:

- Two-column layout.
- Left column: guideline category list.
- Right column: editable active rules.

Categories:

- Brand Tone
- Content Structure Types
- Banned Expressions
- Good Examples
- Bad Examples
- Image Usage Rules
- CTA Rules
- Hashtag Rules

Controls:

- Save
- Reload
- Restore Previous Version

Behavior:

- Selecting a category shows its current rules.
- Rules can be edited as one item per line or as structured cards later.
- Save creates a guideline-history entry.
- Restore Previous Version loads a prior snapshot.

## Brand Knowledge Base

Route:

```text
/admin/brands
```

Brand schema:

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

Future features:

- Add Brand
- Edit Brand
- Delete Brand
- Search Brand

UX:

- List brands in the left column.
- Edit selected brand in the right column.
- Keep keyword and notes fields simple for MVP.

## Feedback Review

Route:

```text
/admin/feedback
```

Feedback entry:

```json
{
  "timestamp": "",
  "originalInput": {},
  "generatedOutput": {},
  "feedback": "",
  "status": "new"
}
```

Statuses:

- `new`
- `reviewed`
- `useful`
- `ignored`

Future features:

- Mark reviewed
- Mark useful
- Mark ignored
- Delete

Purpose:

- Let managers identify recurring editorial preferences.
- Useful feedback may later be summarized into the Prompt Builder.

## Test Generation Page

Route:

```text
/admin/test
```

Inputs:

- Topic
- Mood
- Format
- Number of Slides
- Brand
- Draft Text

Button:

- Generate Test

Call:

```text
POST /api/generate-card-news
```

Show:

- Post caption
- Card list
- Raw JSON

Feedback area below result:

```text
생성 결과는 어땠나요?
```

Controls:

- Save Feedback
- Regenerate With Feedback

