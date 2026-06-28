import { ApiError } from "@/lib/apiError";
import { formatBrandsForPrompt, getBrands, type BrandEntry } from "@/lib/brandStore";
import { formatUsefulFeedbackForPrompt, getFeedbackEntries, type FeedbackEntry } from "@/lib/feedbackStore";
import { saveGenerationHistory } from "@/lib/generationHistoryStore";
import { formatGuidelinesForPrompt, getGuidelines, type Guidelines } from "@/lib/guidelineStore";
import type { GeneratedCard, GenerateCardNewsResponse, ImageFocus, NormalizedRequest, PageInput } from "@/lib/types";

type JsonObject = Record<string, unknown>;

export async function generateCardNews(rawBody: unknown): Promise<GenerateCardNewsResponse> {
  const input = normalizeRequestBody(rawBody);
  const { guidelines } = await getGuidelines();
  const { brands } = await getBrands();
  const { feedback } = await getFeedbackEntries();

  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(500, "OPENAI_API_KEY is missing. Add it in Vercel Project Settings > Environment Variables.");
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildOpenAiRequest(input, guidelines, brands, feedback))
  });

  const raw = await openAiResponse.text();

  if (!openAiResponse.ok) {
    throw new ApiError(502, "OpenAI request failed.", safeDetails(raw));
  }

  let result: unknown;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new ApiError(502, "OpenAI returned invalid JSON.");
  }

  const outputText = extractOutputText(result);

  if (!outputText) {
    throw new ApiError(502, "OpenAI returned no text output.");
  }

  let parsed: JsonObject;
  try {
    parsed = asObject(JSON.parse(outputText));
  } catch {
    throw new ApiError(502, "OpenAI returned a response that did not match the expected JSON format.");
  }

  const response = {
    postCaption: toStringValue(parsed.postCaption || input.postCaption).trim(),
    cards: normalizeCards(parsed.cards, input.cardCount)
  };

  try {
    await saveGenerationHistory(input, response);
  } catch (error) {
    console.error("[generation-history] Could not save generation history", error);
  }

  return response;
}

function normalizeRequestBody(body: unknown): NormalizedRequest {
  const source = asObject(body);
  const rawPages = Array.isArray(source.pages) ? source.pages : [];
  const pages = rawPages.map(normalizePage).slice(0, 20);
  const postCaption = toStringValue(source.postCaption || source.caption).trim();
  const mood = toStringValue(source.mood || source.tone).trim();

  if (pages.length > 0) {
    return {
      mode: "pages",
      postCaption,
      mood,
      pages,
      cardCount: pages.length
    };
  }

  const topic = toStringValue(source.topic).trim();
  const tone = toStringValue(source.tone || "editorial").trim();
  const references = toStringValue(source.references).trim();
  const cardCount = Math.max(1, Math.min(20, Number.parseInt(toStringValue(source.cardCount), 10) || 1));

  if (!topic) {
    throw new ApiError(400, "Add at least one page or topic.");
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

function normalizePage(page: unknown, index: number): PageInput {
  const source = asObject(page);

  return {
    pageNumber: Math.max(1, Number.parseInt(toStringValue(source.pageNumber), 10) || index + 1),
    format: toStringValue(source.format || "story").trim(),
    category: toStringValue(source.category).trim(),
    title: toStringValue(source.title).trim(),
    text: toStringValue(source.text).trim(),
    imageFocus: normalizeImageFocus(source.imageFocus),
    hasImage: Boolean(source.hasImage),
    imageName: toStringValue(source.imageName).trim()
  };
}

function normalizeImageFocus(value: unknown): ImageFocus {
  const focus = toStringValue(value || "center").toLowerCase();
  return ["center", "top", "bottom", "left", "right"].includes(focus) ? (focus as ImageFocus) : "center";
}

function buildOpenAiRequest(
  input: NormalizedRequest,
  guidelines: Guidelines,
  brands: BrandEntry[],
  feedback: FeedbackEntry[]
): JsonObject {
  return {
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    reasoning: {
      effort: process.env.OPENAI_REASONING_EFFORT || "low"
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
      "Follow the active SAMPLAS M guidelines supplied in the user prompt.",
      "Use brand knowledge and useful feedback when relevant.",
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
            text: buildPromptText(input, guidelines, brands, feedback)
          }
        ]
      }
    ]
  };
}

function buildPromptText(
  input: NormalizedRequest,
  guidelines: Guidelines,
  brands: BrandEntry[],
  feedback: FeedbackEntry[]
): string {
  const selectedBrandNames = input.pages.map((page) => page.category).filter(Boolean);
  const selectedGuidelineCategories = input.pages.map((page) => page.category || page.format).filter(Boolean);
  const activeGuidelines = formatGuidelinesForPrompt(guidelines, selectedGuidelineCategories) || "None";
  const brandKnowledge = formatBrandsForPrompt(brands, selectedBrandNames);
  const usefulFeedback = formatUsefulFeedbackForPrompt(feedback);

  if (input.mode === "pages") {
    return [
      "Active SAMPLAS M guidelines:",
      activeGuidelines,
      "",
      "Brand knowledge:",
      brandKnowledge,
      "",
      "Useful feedback:",
      usefulFeedback,
      "",
      `Overall caption draft: ${input.postCaption || "None"}`,
      `Overall mood: ${input.mood || "Not specified"}`,
      `Page count: ${input.cardCount}`,
      "",
      "Pages:",
      input.pages.map(formatPageForPrompt).join("\n\n")
    ].join("\n");
  }

  return [
    "Active SAMPLAS M guidelines:",
    activeGuidelines,
    "",
    "Brand knowledge:",
    brandKnowledge,
    "",
    "Useful feedback:",
    usefulFeedback,
    "",
    `Topic: ${input.topic}`,
    `Tone: ${input.tone}`,
    `Card count: ${input.cardCount}`,
    `References: ${input.references || "None"}`
  ].join("\n");
}

function formatPageForPrompt(page: PageInput): string {
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

function extractOutputText(result: unknown): string {
  const source = asObject(result);

  if (typeof source.output_text === "string") {
    return source.output_text;
  }

  if (!Array.isArray(source.output)) {
    return "";
  }

  for (const item of source.output) {
    const outputItem = asObject(item);

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const content of outputItem.content) {
      const contentItem = asObject(content);

      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        return contentItem.text;
      }
    }
  }

  return "";
}

function normalizeCards(cards: unknown, expectedCount: number): GeneratedCard[] {
  if (!Array.isArray(cards)) {
    throw new ApiError(502, "OpenAI returned an invalid cards array.");
  }

  if (cards.length !== expectedCount) {
    throw new ApiError(502, `OpenAI returned ${cards.length} cards; expected ${expectedCount}.`);
  }

  return cards.map((card) => {
    const source = asObject(card);

    return {
      format: toStringValue(source.format).trim(),
      title: toStringValue(source.title).trim(),
      body: toStringValue(source.body).trim(),
      caption: toStringValue(source.caption).trim(),
      category: toStringValue(source.category).trim(),
      backgroundColor: normalizeHexColor(source.backgroundColor),
      overlayOpacity: clamp(Number(source.overlayOpacity), 0, 80)
    };
  });
}

function normalizeHexColor(value: unknown): string {
  const color = toStringValue(value).trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#f2eee8";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeDetails(raw: string): string {
  if (!raw) return "";
  return raw.length > 800 ? `${raw.slice(0, 800)}...` : raw;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
