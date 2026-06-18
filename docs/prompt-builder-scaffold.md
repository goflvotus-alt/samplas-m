# Prompt Builder Scaffold

The current Express backend still uses its existing prompt flow.

`backend/lib/promptBuilder.js` is a future-safe helper scaffold. It is intentionally not wired into `backend/server.js` yet, so existing behavior remains unchanged.

Future Prompt Builder inputs:

1. Fixed system instructions
2. Brand Tone
3. Content Structures
4. Banned Expressions
5. Good Examples
6. Bad Examples
7. Brand Data
8. Useful Feedback
9. User Request

The fixed system instructions are code-owned and should not be editable from the future Admin UI.

Example usage for future implementation:

```js
const { buildPromptContext } = require("./lib/promptBuilder");

const promptContext = buildPromptContext({
  guidelines,
  brands,
  usefulFeedback,
  userRequest: request.body
});
```

Do not integrate this helper into production generation until the Vercel data layer and tests are ready.
