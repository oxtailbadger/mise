import type { ItemCategory } from "@prisma/client";
import { parseQuantity, formatQuantity } from "@/lib/recipe-utils";

// ── Category detection ──────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  PROTEIN: [
    "chicken", "beef", "pork", "lamb", "veal", "duck", "turkey", "bison",
    "fish", "salmon", "tuna", "cod", "tilapia", "halibut", "trout", "sardine",
    "shrimp", "scallop", "crab", "lobster", "clam", "mussel", "oyster", "anchovy",
    "sausage", "bacon", "ham", "pancetta", "prosciutto", "salami", "pepperoni",
    "steak", "ground", "mince", "egg", "tofu", "tempeh", "seitan", "edamame",
    "lentil", "chickpea", "black bean", "kidney bean", "white bean", "cannellini",
  ],
  PRODUCE: [
    "tomato", "lettuce", "spinach", "kale", "arugula", "chard", "collard",
    "onion", "shallot", "leek", "chive", "scallion", "green onion",
    "garlic", "ginger", "turmeric",
    "pepper", "jalapeño", "serrano", "habanero", "chili",
    "zucchini", "squash", "pumpkin", "mushroom", "portobello", "shiitake",
    "carrot", "parsnip", "turnip", "radish", "beet",
    "potato", "sweet potato", "yam",
    "broccoli", "cauliflower", "brussels", "cabbage", "bok choy",
    "celery", "fennel", "artichoke", "asparagus", "eggplant", "corn", "peas",
    "cucumber", "avocado", "lime", "lemon", "orange", "grapefruit",
    "apple", "pear", "peach", "plum", "mango", "pineapple", "papaya",
    "banana", "berry", "strawberry", "blueberry", "raspberry", "blackberry",
    "grape", "cherry", "watermelon", "melon",
    "herb", "basil", "parsley", "cilantro", "mint", "thyme", "rosemary",
    "sage", "dill", "oregano", "tarragon", "bay leaf",
    "watercress", "endive", "radicchio",
  ],
  DAIRY: [
    "milk", "cream", "half-and-half", "half and half", "buttermilk",
    "butter", "ghee",
    "cheese", "cheddar", "mozzarella", "parmesan", "parmigiano", "gruyère",
    "gruyere", "ricotta", "feta", "brie", "gouda", "goat cheese", "blue cheese",
    "cottage cheese", "cream cheese", "mascarpone", "provolone", "swiss",
    "yogurt", "kefir", "sour cream", "crème fraîche", "creme fraiche",
    "ice cream", "whipped cream",
  ],
  DRY_GOODS: [
    "flour", "sugar", "brown sugar", "powdered sugar", "honey", "maple syrup",
    "rice", "brown rice", "wild rice", "basmati", "jasmine",
    "pasta", "noodle", "spaghetti", "penne", "rigatoni", "fettuccine",
    "linguine", "farfalle", "orzo", "couscous", "bulgur", "farro",
    "quinoa", "oat", "granola", "cereal",
    "bread", "baguette", "pita", "tortilla", "wrap", "roll", "bun",
    "cracker", "breadcrumb", "panko",
    "cornstarch", "cornmeal", "semolina", "almond flour",
    "baking powder", "baking soda", "yeast",
    "cocoa", "chocolate chip", "vanilla extract",
    "oil", "olive oil", "vegetable oil", "sesame oil", "coconut oil",
    "vinegar", "soy sauce", "fish sauce", "worcestershire", "hot sauce",
    "salt", "pepper", "spice", "seasoning", "cumin", "paprika", "coriander",
    "turmeric", "cayenne", "chili powder", "garlic powder", "onion powder",
    "nutmeg", "cinnamon", "cardamom", "clove", "allspice", "star anise",
    "mustard", "ketchup", "mayonnaise", "tahini", "peanut butter",
    "jam", "jelly", "syrup",
    "nuts", "almond", "walnut", "pecan", "cashew", "pine nut", "peanut",
    "seed", "sunflower", "pumpkin seed", "sesame", "chia", "flax",
    "dried fruit", "raisin", "cranberry",
  ],
  CANNED: [
    "canned", "can of", "tin of",
    "tomato sauce", "tomato paste", "crushed tomato", "diced tomato",
    "tomato puree", "marinara",
    "broth", "stock", "bouillon",
    "coconut milk", "coconut cream",
    "beans in can", "canned beans", "canned chickpea", "canned lentil",
    "canned tuna", "canned salmon", "canned sardine",
    "canned corn", "canned pea", "canned artichoke",
    "olives", "capers", "roasted pepper",
    "evaporated milk", "condensed milk",
  ],
  OTHER: [],
};

/**
 * Detect the most likely grocery category for an ingredient name.
 * Checks PROTEIN first (most distinctive), then down the list.
 */
export function detectCategory(ingredientName: string): ItemCategory {
  const lower = ingredientName.toLowerCase();
  const order: ItemCategory[] = ["PROTEIN", "PRODUCE", "DAIRY", "CANNED", "DRY_GOODS"];

  for (const category of order) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "OTHER";
}

// ── Pantry staple matching ──────────────────────────────────────────────────

/**
 * Returns true if `ingredientName` matches any entry in `pantrySet`.
 *
 * Handles two cases:
 *  1. Case-insensitive exact match  ("Olive Oil" matches pantry "olive oil")
 *  2. OR expressions in ingredient names ("coconut oil or vegetable oil" matches
 *     if EITHER "coconut oil" OR "vegetable oil" is in the pantry)
 */
export function matchesPantry(ingredientName: string, pantrySet: Set<string>): boolean {
  const lower = ingredientName.toLowerCase().trim();

  // Direct case-insensitive match
  if (pantrySet.has(lower)) return true;

  // Split on " or " (case-insensitive) and test each alternative
  if (lower.includes(" or ")) {
    return lower.split(/\s+or\s+/).some((part) => pantrySet.has(part.trim()));
  }

  return false;
}

// ── Ingredient consolidation ────────────────────────────────────────────────

interface RawIngredient {
  name: string;
  quantity: string;
  unit: string | null;
  isGlutenFlag: boolean;
}

interface ConsolidatedIngredient {
  name: string;
  quantity: string | null;
  unit: string | null;
  isGlutenFlag: boolean;
}

/**
 * Merge a flat list of recipe ingredients into a deduplicated grocery list.
 * - Groups by (normalized name, normalized unit)
 * - Sums numeric quantities when possible
 * - Keeps the original casing from the first occurrence
 */
export function consolidateIngredients(
  ingredients: RawIngredient[]
): ConsolidatedIngredient[] {
  // Group: key = "normalizedName::normalizedUnit"
  const groups = new Map<string, RawIngredient[]>();

  for (const ing of ingredients) {
    const key = `${ing.name.toLowerCase().trim()}::${(ing.unit ?? "").toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ing);
  }

  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    if (group.length === 1) {
      return {
        name: first.name,
        quantity: first.quantity || null,
        unit: first.unit,
        isGlutenFlag: first.isGlutenFlag,
      };
    }

    // Try to sum all numeric quantities
    const nums = group.map((i) => parseQuantity(i.quantity));
    if (nums.every((n) => n !== null)) {
      const total = (nums as number[]).reduce((a, b) => a + b, 0);
      return {
        name: first.name,
        quantity: formatQuantity(total),
        unit: first.unit,
        isGlutenFlag: group.some((i) => i.isGlutenFlag),
      };
    }

    // Can't parse numerically — join with " + "
    return {
      name: first.name,
      quantity: group.map((i) => i.quantity).filter(Boolean).join(" + ") || null,
      unit: first.unit,
      isGlutenFlag: group.some((i) => i.isGlutenFlag),
    };
  });
}
