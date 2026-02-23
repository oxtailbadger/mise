import { describe, it, expect } from "vitest";
import { detectCategory, matchesPantry, consolidateIngredients } from "@/lib/grocery-utils";

// ── detectCategory ────────────────────────────────────────────────────────────

describe("detectCategory", () => {
  it("detects PROTEIN for chicken", () => {
    expect(detectCategory("boneless chicken thighs")).toBe("PROTEIN");
  });

  it("detects PROTEIN for salmon", () => {
    expect(detectCategory("fresh salmon fillet")).toBe("PROTEIN");
  });

  it("detects PROTEIN for eggs", () => {
    expect(detectCategory("large eggs")).toBe("PROTEIN");
  });

  it("detects PRODUCE for tomatoes", () => {
    expect(detectCategory("cherry tomatoes")).toBe("PRODUCE");
  });

  it("detects PRODUCE for fresh herbs (basil)", () => {
    expect(detectCategory("fresh basil leaves")).toBe("PRODUCE");
  });

  it("detects PRODUCE for garlic", () => {
    expect(detectCategory("garlic cloves")).toBe("PRODUCE");
  });

  it("detects DAIRY for milk", () => {
    expect(detectCategory("whole milk")).toBe("DAIRY");
  });

  it("detects DAIRY for parmesan", () => {
    expect(detectCategory("grated parmesan cheese")).toBe("DAIRY");
  });

  it("detects DRY_GOODS for olive oil", () => {
    expect(detectCategory("extra virgin olive oil")).toBe("DRY_GOODS");
  });

  it("detects DRY_GOODS for pasta", () => {
    expect(detectCategory("dried spaghetti")).toBe("DRY_GOODS");
  });

  it("detects CANNED for marinara sauce (no earlier-category match)", () => {
    expect(detectCategory("marinara sauce")).toBe("CANNED");
  });

  it("detects CANNED for olives (no earlier-category match)", () => {
    expect(detectCategory("olives")).toBe("CANNED");
  });

  it("detects CANNED for vegetable broth (broth keyword, no PROTEIN/PRODUCE/DAIRY match)", () => {
    expect(detectCategory("vegetable broth")).toBe("CANNED");
  });

  it("detects PRODUCE for 'canned tomato sauce' — PRODUCE is checked before CANNED", () => {
    // 'tomato' in 'canned tomato sauce' hits PRODUCE before CANNED in detection order
    expect(detectCategory("canned tomato sauce")).toBe("PRODUCE");
  });

  it("detects DAIRY for 'coconut milk' — DAIRY is checked before CANNED in detection order", () => {
    // 'milk' hits DAIRY before CANNED
    expect(detectCategory("coconut milk")).toBe("DAIRY");
  });

  it("falls back to OTHER for unknown items", () => {
    expect(detectCategory("mysterious ingredient xyz")).toBe("OTHER");
  });

  it("PROTEIN takes priority over PRODUCE (e.g. edamame over general terms)", () => {
    expect(detectCategory("edamame")).toBe("PROTEIN");
  });
});

// ── matchesPantry ─────────────────────────────────────────────────────────────

describe("matchesPantry", () => {
  const pantrySet = new Set([
    "olive oil",
    "salt",
    "black pepper",
    "vegetable oil",
    "garlic powder",
  ]);

  it("matches an exact pantry staple (same case)", () => {
    expect(matchesPantry("olive oil", pantrySet)).toBe(true);
  });

  it("matches case-insensitively (uppercase input)", () => {
    expect(matchesPantry("Olive Oil", pantrySet)).toBe(true);
  });

  it("matches case-insensitively (mixed case)", () => {
    expect(matchesPantry("BLACK PEPPER", pantrySet)).toBe(true);
  });

  it("returns false when ingredient is not in pantry", () => {
    expect(matchesPantry("lemon juice", pantrySet)).toBe(false);
  });

  it("matches first option in an OR expression", () => {
    expect(matchesPantry("olive oil or vegetable oil", pantrySet)).toBe(true);
  });

  it("matches second option in an OR expression", () => {
    // only "vegetable oil" is in pantry, not "coconut oil"
    expect(matchesPantry("coconut oil or vegetable oil", pantrySet)).toBe(true);
  });

  it("returns false when neither OR option is in pantry", () => {
    expect(matchesPantry("avocado oil or coconut oil", pantrySet)).toBe(false);
  });

  it("handles OR with extra whitespace", () => {
    expect(matchesPantry("olive oil  or  vegetable oil", pantrySet)).toBe(true);
  });

  it("handles empty pantry set", () => {
    expect(matchesPantry("salt", new Set<string>())).toBe(false);
  });

  it("trims leading/trailing whitespace from ingredient name", () => {
    expect(matchesPantry("  salt  ", pantrySet)).toBe(true);
  });
});

// ── consolidateIngredients ────────────────────────────────────────────────────

describe("consolidateIngredients", () => {
  it("returns empty array for empty input", () => {
    expect(consolidateIngredients([])).toEqual([]);
  });

  it("returns single ingredient unchanged", () => {
    const result = consolidateIngredients([
      { name: "olive oil", quantity: "2", unit: "tbsp", isGlutenFlag: false },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("olive oil");
    expect(result[0].quantity).toBe("2");
  });

  it("sums numeric quantities for the same ingredient + unit", () => {
    const result = consolidateIngredients([
      { name: "chicken breast", quantity: "2", unit: "lbs", isGlutenFlag: false },
      { name: "chicken breast", quantity: "1", unit: "lbs", isGlutenFlag: false },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("3");
  });

  it("keeps separate entries for different units", () => {
    const result = consolidateIngredients([
      { name: "flour", quantity: "2", unit: "cups", isGlutenFlag: true },
      { name: "flour", quantity: "200", unit: "grams", isGlutenFlag: true },
    ]);
    expect(result).toHaveLength(2);
  });

  it("consolidates case-insensitively (Tomato vs tomato)", () => {
    const result = consolidateIngredients([
      { name: "Tomato", quantity: "2", unit: null, isGlutenFlag: false },
      { name: "tomato", quantity: "3", unit: null, isGlutenFlag: false },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("5");
  });

  it("uses ' + ' when quantities are non-numeric", () => {
    const result = consolidateIngredients([
      { name: "salt", quantity: "to taste", unit: null, isGlutenFlag: false },
      { name: "salt", quantity: "a pinch", unit: null, isGlutenFlag: false },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("to taste + a pinch");
  });

  it("preserves original casing from first occurrence", () => {
    const result = consolidateIngredients([
      { name: "Garlic Cloves", quantity: "4", unit: null, isGlutenFlag: false },
      { name: "garlic cloves", quantity: "2", unit: null, isGlutenFlag: false },
    ]);
    expect(result[0].name).toBe("Garlic Cloves");
  });

  it("marks isGlutenFlag true if any occurrence is flagged", () => {
    const result = consolidateIngredients([
      { name: "soy sauce", quantity: "2", unit: "tbsp", isGlutenFlag: false },
      { name: "soy sauce", quantity: "1", unit: "tbsp", isGlutenFlag: true },
    ]);
    expect(result[0].isGlutenFlag).toBe(true);
  });

  it("returns null quantity when all quantities are empty strings", () => {
    const result = consolidateIngredients([
      { name: "salt", quantity: "", unit: null, isGlutenFlag: false },
    ]);
    expect(result[0].quantity).toBeNull();
  });
});
