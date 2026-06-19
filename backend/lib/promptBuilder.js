"use strict";

const FIXED_SYSTEM_INSTRUCTIONS = [
  "You are SAMPLAS M, an editorial assistant for a fashion concept store.",
  "Polish user-provided card-news drafts while preserving the user's intent, order, and concrete facts.",
  "Do not invent dates, names, statistics, image details, or brand claims that are not present in the input or provided knowledge.",
  "Write with editorial restraint and avoid generic advertising language.",
  "Return structured output that matches the API contract."
];

function buildPromptContext({
  guidelines = {},
  brands = [],
  usefulFeedback = [],
  userRequest = {}
} = {}) {
  return [
    formatSection("Fixed System Instructions", FIXED_SYSTEM_INSTRUCTIONS),
    formatGuidelines(guidelines),
    formatBrands(brands),
    formatFeedback(usefulFeedback),
    formatSection("User Request", [JSON.stringify(userRequest, null, 2)])
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatGuidelines(guidelines) {
  if (Array.isArray(guidelines.categories)) {
    return guidelines.categories
      .map((category) => {
        const rules = category.rules || {};
        const sections = [
          ["Brand Tone", rules.brandTone],
          ["Content Structures", rules.contentStructures],
          ["Banned Expressions", rules.bannedExpressions],
          ["Good Examples", rules.goodExamples],
          ["Bad Examples", rules.badExamples],
          ["Image Rules", rules.imageRules],
          ["References", formatReferences(category.references)]
        ];

        return [`## Content Category: ${category.name || "Category"}`, ...sections.map(([title, values]) => formatSection(title, values)).filter(Boolean)]
          .filter(Boolean)
          .join("\n\n");
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  }

  const sections = [
    ["Brand Tone", guidelines.brandTone],
    ["Content Structures", guidelines.contentStructures],
    ["Banned Expressions", guidelines.bannedExpressions],
    ["Good Examples", guidelines.goodExamples],
    ["Bad Examples", guidelines.badExamples],
    ["Image Rules", guidelines.imageRules]
  ];

  return sections
    .map(([title, values]) => formatSection(title, values))
    .filter(Boolean)
    .join("\n\n");
}

function formatReferences(references) {
  if (!Array.isArray(references)) {
    return [];
  }

  return references
    .map((reference, index) =>
      [
        `${index + 1}. ${reference.title || "Untitled reference"}`,
        reference.url ? `URL: ${reference.url}` : "",
        reference.note ? `Note: ${reference.note}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    )
    .filter(Boolean);
}

function formatBrands(brands) {
  if (!Array.isArray(brands) || brands.length === 0) {
    return "";
  }

  return formatSection(
    "Brand Data",
    brands.map((brand) => JSON.stringify(brand, null, 2))
  );
}

function formatFeedback(feedbackEntries) {
  if (!Array.isArray(feedbackEntries) || feedbackEntries.length === 0) {
    return "";
  }

  const useful = feedbackEntries
    .filter((entry) => entry && entry.status === "useful")
    .map((entry) => entry.feedback)
    .filter(Boolean);

  return formatSection("Useful Feedback", useful);
}

function formatSection(title, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  const cleanedValues = values.map((value) => String(value).trim()).filter(Boolean);

  if (cleanedValues.length === 0) {
    return "";
  }

  return [`## ${title}`, ...cleanedValues.map((value) => `- ${value}`)].join("\n");
}

module.exports = {
  FIXED_SYSTEM_INSTRUCTIONS,
  buildPromptContext
};
