import Anthropic from "@anthropic-ai/sdk";
import type { ParsedRecipe } from "@/types/recipe";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a recipe parser. Extract recipes into structured JSON.

Return ONLY a valid JSON object — no markdown, no explanation — with this exact shape:
{
  "name": "string",
  "totalTime": number | null,        // total minutes (prep + cook)
  "activeCookTime": number | null,   // active hands-on minutes
  "potsAndPans": number | null,      // estimated distinct pots/pans/baking dishes
  "servings": number,
  "instructions": "string",          // newline-separated numbered steps, e.g. "1. Do this\n2. Do that"
  "ingredients": [
    {
      "name": "string",              // ingredient name only (no quantity)
      "quantity": "string",          // numeric string, fraction, or range e.g. "1 1/2", "2"
      "unit": "string | null",       // cup, tbsp, oz, clove, etc. — null if no unit
      "notes": "string | null",      // prep notes e.g. "finely chopped", "room temperature"
      "isGlutenFlag": boolean,       // true if this ingredient commonly contains gluten
      "gfSubstitute": "string | null" // suggested GF swap if flagged, else null
    }
  ],
  "tags": [
    { "type": "PROTEIN", "value": "string" },   // e.g. chicken, beef, salmon, tofu
    { "type": "VEGGIE",  "value": "string" },   // e.g. broccoli, spinach
    { "type": "CARB",    "value": "string" },   // e.g. rice, pasta, potatoes
    { "type": "CUISINE", "value": "string" }    // e.g. italian, mexican, asian
  ],
  "gfNotes": "string | null"         // summary of GF flags and substitutions, null if none
}

Gluten flag criteria — set isGlutenFlag: true for:
wheat/all-purpose/bread/pastry flour, breadcrumbs/panko, regular pasta (not GF),
regular soy sauce, teriyaki sauce, oyster sauce (unless GF labeled),
barley, rye, malt, beer, couscous, bulgur, seitan, many broths/gravies.

GF substitute suggestions:
- All-purpose flour → "Rice flour, almond flour, or GF flour blend"
- Breadcrumbs/panko → "GF breadcrumbs or almond meal"
- Regular pasta → "GF pasta (rice or chickpea-based)"
- Soy sauce → "Tamari or coconut aminos"
- Oyster sauce → "GF oyster sauce or hoisin"
- Beer → "GF beer or chicken broth"`;

/**
 * Fetch HTML from a URL and extract readable text.
 */
async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MiseApp/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();

  // Strip HTML tags and collapse whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();

  // Limit to ~8000 chars to stay within token budget
  return text.slice(0, 8000);
}

/**
 * Parse a recipe from a URL using Claude.
 */
export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const pageText = await fetchUrlText(url);
  return parseRecipeFromText(pageText, url);
}

/**
 * Parse a recipe from pasted text using Claude.
 */
export async function parseRecipeFromText(
  text: string,
  sourceUrl?: string
): Promise<ParsedRecipe> {
  const userContent = sourceUrl
    ? `Parse this recipe content from ${sourceUrl}:\n\n${text}`
    : `Parse this recipe:\n\n${text}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const raw = message.content[0];
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude");

  let parsed: ParsedRecipe;
  try {
    // Strip any accidental markdown fences
    const json = raw.text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Claude returned invalid JSON. Please try again.");
  }

  if (sourceUrl) parsed.sourceUrl = sourceUrl;
  return parsed;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type AllowedImageMediaType = typeof ALLOWED_IMAGE_TYPES[number];

/**
 * Parse a recipe from a base64-encoded image using Claude Vision.
 * `base64Data` must be the raw base64 string — no "data:image/...;base64," prefix.
 */
export async function parseRecipeFromImage(
  base64Data: string,
  mediaType: AllowedImageMediaType
): Promise<ParsedRecipe> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          {
            type: "text",
            text: "Extract the recipe from this image and return the structured JSON.",
          },
        ],
      },
    ],
  });

  const raw = message.content[0];
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude");

  let parsed: ParsedRecipe;
  try {
    const json = raw.text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Claude returned invalid JSON. Please try again.");
  }

  return parsed;
}
