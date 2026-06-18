# SAMPLAS M API Contract

## Current Compatibility Contract

The current Figma/Buzz plugin depends on these endpoints.

```text
GET /health
POST /api/generate-card-news
```

Any future Vercel API must keep these routes working or provide compatibility aliases.

## GET /health

Response:

```json
{
  "ok": true
}
```

## POST /api/generate-card-news

Purpose:

Generate or refine card-news slide copy from page-by-page user input.

Request:

```json
{
  "postCaption": "string",
  "mood": "string",
  "pages": [
    {
      "pageNumber": 1,
      "format": "cover",
      "category": "Category",
      "title": "Draft title",
      "text": "Draft text",
      "imageFocus": "center",
      "hasImage": true,
      "imageName": "photo.jpg"
    }
  ]
}
```

Response:

```json
{
  "postCaption": "Polished caption",
  "cards": [
    {
      "format": "cover",
      "title": "string",
      "body": "string",
      "caption": "string",
      "category": "string",
      "backgroundColor": "#F2EEE8",
      "overlayOpacity": 40
    }
  ]
}
```

Rules:

- Return exactly one card per input page.
- Preserve input page order.
- Preserve each page `format`.
- Do not invent facts not present in input, brand data, or future guidelines.
- `backgroundColor` must be `#RRGGBB`.
- `overlayOpacity` must be between 0 and 80.

## Future Admin API

These endpoints are future contracts for the Vercel system.

### GET /api/guidelines

Returns active guideline data.

Response:

```json
{
  "brandTone": [],
  "contentStructures": [],
  "bannedExpressions": [],
  "goodExamples": [],
  "badExamples": [],
  "imageRules": [],
  "ctaRules": [],
  "hashtagRules": []
}
```

### PUT /api/guidelines

Updates active guidelines.

Current Vercel scaffold requires:

```text
x-admin-password: ADMIN_PASSWORD
```

Persistent storage requires:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Accepted alternative names:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Request:

```json
{
  "updatedBy": "admin",
  "guidelines": {
    "brandTone": [],
    "contentStructures": [],
    "bannedExpressions": [],
    "goodExamples": [],
    "badExamples": [],
    "imageRules": [],
    "ctaRules": [],
    "hashtagRules": []
  }
}
```

Response:

```json
{
  "ok": true,
  "version": "2026-06-18T00:00:00.000Z"
}
```

### GET /api/guidelines/history

Returns guideline snapshots.

### POST /api/guidelines/history/restore

Restores a prior guideline version.

Request:

```json
{
  "version": "2026-06-18T00:00:00.000Z",
  "updatedBy": "admin"
}
```

### GET /api/brands

Returns brand knowledge entries.

### POST /api/brands

Creates a brand entry.

### PUT /api/brands/:brandName

Updates a brand entry.

### DELETE /api/brands/:brandName

Deletes a brand entry.

### GET /api/feedback

Returns feedback entries.

### POST /api/feedback

Stores a feedback entry.

Request:

```json
{
  "timestamp": "2026-06-18T00:00:00.000Z",
  "originalInput": {},
  "generatedOutput": {},
  "feedback": "너무 광고 같다",
  "status": "new"
}
```

### PATCH /api/feedback/:id

Updates feedback status.

Allowed statuses:

- `new`
- `reviewed`
- `useful`
- `ignored`
