const path = require("path");
const express = require("express");
const cors = require("cors");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT) || 3000;
const model = process.env.OPENAI_MODEL || "gpt-5.5";
const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "low";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/generate-card-news", async (request, response) => {
  try {
    const input = normalizeRequestBody(request.body);

    if (!process.env.OPENAI_API_KEY) {
      response.status(500).json({ error: "OPENAI_API_KEY is missing. Add it to backend/.env." });
      return;
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildOpenAiRequest(input))
    });

    const raw = await openAiResponse.text();

    if (!openAiResponse.ok) {
      response.status(502).json({
        error: "OpenAI request failed.",
        details: safeDetails(raw)
      });
      return;
    }

    const result = JSON.parse(raw);
    const outputText = extractOutputText(result);

    if (!outputText) {
      response.status(502).json({ error: "OpenAI returned no text output." });
      return;
    }

    const parsed = JSON.parse(outputText);
    const cards = normalizeCards(parsed.cards, input.cardCount);

    response.json({
      postCaption: String(parsed.postCaption || input.postCaption || "").trim(),
      cards
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid request."
    });
  }
});

app.listen(port, () => {
  console.log(`SAMPLAS M backend is running on http://localhost:${port}`);
});

function normalizeRequestBody(body) {
  const pages = Array.isArray(body.pages) ? body.pages.map(normalizePage).slice(0, 20) : [];
  const postCaption = String(body.postCaption || body.caption || "").trim();
  const mood = String(body.mood || body.tone || "").trim();

  if (pages.length > 0) {
    return {
      mode: "pages",
      postCaption,
      mood,
      pages,
      cardCount: pages.length
    };
  }

  const topic = String(body.topic || "").trim();
  const tone = String(body.tone || "editorial").trim();
  const references = String(body.references || "").trim();
  const cardCount = Math.max(1, Math.min(20, Number.parseInt(body.cardCount, 10) || 1));

  if (!topic) {
    throw new Error("Add at least one page or topic.");
  }

  return {
    mode: "topic",
    topic,
    tone,
    references,
    cardCount,
    postCaption: "",
    mood: tone,
    pages: []
  };
}

function normalizePage(page, index) {
  return {
    pageNumber: Math.max(1, Number.parseInt(page.pageNumber, 10) || index + 1),
    format: String(page.format || "story").trim(),
    category: String(page.category || "").trim(),
    title: String(page.title || "").trim(),
    text: String(page.text || "").trim(),
    imageFocus: normalizeImageFocus(page.imageFocus),
    hasImage: Boolean(page.hasImage),
    imageName: String(page.imageName || "").trim()
  };
}

function normalizeImageFocus(value) {
  const focus = String(value || "center").toLowerCase();
  return ["center", "top", "bottom", "left", "right"].includes(focus) ? focus : "center";
}

function buildOpenAiRequest(input) {
  return {
    model,
    reasoning: {
      effort: reasoningEffort
    },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "card_news_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["postCaption", "cards"],
          properties: {
            postCaption: {
              type: "string",
              description: "A polished overall caption for posting the full slide set."
            },
            cards: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["format", "title", "body", "caption", "category", "backgroundColor", "overlayOpacity"],
                properties: {
                  format: {
                    type: "string",
                    description: "The original format value for this page."
                  },
                  title: {
                    type: "string",
                    description: "Short card headline."
                  },
                  body: {
                    type: "string",
                    description: "One concise paragraph for the card body."
                  },
                  caption: {
                    type: "string",
                    description: "Brief source, context, or supporting caption."
                  },
                  category: {
                    type: "string",
                    description: "A short category label, usually one to three words."
                  },
                  backgroundColor: {
                    type: "string",
                    description: "A hex color for the card background, such as #F2EEE8."
                  },
                  overlayOpacity: {
                    type: "number",
                    description: "Overlay opacity from 0 to 80."
                  }
                }
              }
            }
          }
        }
      }
    },
    instructions: [
      "Polish user-provided card-news drafts for a multi-slide post.",
      "Preserve the user's intent, order, and concrete facts.",
      "Do not invent dates, names, statistics, or claims not present in the input.",
      "Return exactly one card for each requested page and preserve each page's format value.",
      "Keep titles short, bodies readable, captions compact, category labels brief, backgroundColor as a #RRGGBB hex value, and overlayOpacity between 0 and 80."
    ].join(" "),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPromptText(input)
          }
        ]
      }
    ]
  };
}

function buildPromptText(input) {
  if (input.mode === "pages") {
    return [
      `Overall caption draft: ${input.postCaption || "None"}`,
      `Overall mood: ${input.mood || "Not specified"}`,
      `Page count: ${input.cardCount}`,
      "",
      "Pages:",
      input.pages.map(formatPageForPrompt).join("\n\n")
    ].join("\n");
  }

  return [
    `Topic: ${input.topic}`,
    `Tone: ${input.tone}`,
    `Card count: ${input.cardCount}`,
    `References: ${input.references || "None"}`
  ].join("\n");
}

function formatPageForPrompt(page) {
  return [
    `Page ${page.pageNumber}`,
    `Format: ${page.format}`,
    `Category draft: ${page.category || "None"}`,
    `Title draft: ${page.title || "None"}`,
    `Text draft: ${page.text || "None"}`,
    `Photo attached: ${page.hasImage ? "Yes" : "No"}`,
    `Photo focus: ${page.imageFocus}`,
    `Photo filename: ${page.imageName || "None"}`
  ].join("\n");
}

function extractOutputText(result) {
  if (typeof result.output_text === "string") {
    return result.output_text;
  }

  if (!Array.isArray(result.output)) {
    return "";
  }

  for (const item of result.output) {
    if (!Array.isArray(item.content)) continue;

    for (const content of item.content) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function normalizeCards(cards, expectedCount) {
  if (!Array.isArray(cards)) {
    throw new Error("OpenAI returned an invalid cards array.");
  }

  if (cards.length !== expectedCount) {
    throw new Error(`OpenAI returned ${cards.length} cards; expected ${expectedCount}.`);
  }

  return cards.map((card) => ({
    format: String(card.format || "").trim(),
    title: String(card.title || "").trim(),
    body: String(card.body || "").trim(),
    caption: String(card.caption || "").trim(),
    category: String(card.category || "").trim(),
    backgroundColor: normalizeHexColor(card.backgroundColor),
    overlayOpacity: clamp(Number(card.overlayOpacity), 0, 80)
  }));
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#f2eee8";
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeDetails(raw) {
  if (!raw) return "";
  return raw.length > 800 ? `${raw.slice(0, 800)}...` : raw;
}
