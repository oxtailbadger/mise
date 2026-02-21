/**
 * Parse a quantity string into a decimal number for scaling.
 * Handles: "1", "1/2", "1 1/2", "2-3" (takes first number), "¼", etc.
 */
export function parseQuantity(q: string): number | null {
  const s = q.trim();
  if (!s) return null;

  // Unicode fractions
  const unicodeFractions: Record<string, number> = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅓": 1 / 3, "⅔": 2 / 3,
    "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  };
  for (const [char, val] of Object.entries(unicodeFractions)) {
    if (s === char) return val;
  }

  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);

  // Simple fraction: "1/2"
  const fraction = s.match(/^(\d+)\/(\d+)$/);
  if (fraction) return parseInt(fraction[1]) / parseInt(fraction[2]);

  // Range: "2-3" — take the first
  const range = s.match(/^(\d*\.?\d+)/);
  if (range) return parseFloat(range[1]);

  return null;
}

/**
 * Format a decimal number back to a human-friendly quantity string.
 */
export function formatQuantity(n: number): string {
  if (n === Math.floor(n)) return String(n);

  // Common fractions
  const fractions: [number, string][] = [
    [0.25, "¼"], [0.5, "½"], [0.75, "¾"],
    [1 / 3, "⅓"], [2 / 3, "⅔"],
    [0.125, "⅛"], [0.375, "⅜"], [0.625, "⅝"], [0.875, "⅞"],
  ];

  const whole = Math.floor(n);
  const decimal = n - whole;

  for (const [val, str] of fractions) {
    if (Math.abs(decimal - val) < 0.02) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Fall back to 2 dp
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Scale an ingredient quantity string by a ratio.
 * Returns the original string if it can't be parsed numerically.
 */
export function scaleQuantity(
  quantity: string,
  originalServings: number,
  desiredServings: number
): string {
  const ratio = desiredServings / originalServings;
  const parsed = parseQuantity(quantity);
  if (parsed === null) return quantity;
  return formatQuantity(parsed * ratio);
}

/**
 * Split instruction text into numbered steps for display.
 */
export function parseInstructions(instructions: string): string[] {
  return instructions
    .split("\n")
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

/** GF status display helpers */
export const GF_STATUS_LABEL: Record<string, string> = {
  CONFIRMED_GF: "Confirmed GF",
  CONTAINS_GLUTEN: "Contains Gluten",
  NEEDS_REVIEW: "Needs Review",
};

export const GF_STATUS_COLOR: Record<string, string> = {
  CONFIRMED_GF: "bg-green-100 text-green-800",
  CONTAINS_GLUTEN: "bg-red-100 text-red-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
};

/** Category labels for grocery items */
export const ITEM_CATEGORY_LABEL: Record<string, string> = {
  PRODUCE: "Produce",
  PROTEIN: "Protein",
  DAIRY: "Dairy & Eggs",
  DRY_GOODS: "Dry Goods & Grains",
  CANNED: "Canned & Packaged",
  OTHER: "Other",
};
