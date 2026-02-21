import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Default pantry staples — common items most households always have stocked.
// Stored lowercase to match case-insensitive ingredient lookups.
const DEFAULT_STAPLES = [
  // Oils & fats
  "olive oil", "butter", "vegetable oil", "sesame oil", "coconut oil",
  // Salt, pepper & core spices
  "salt", "black pepper", "garlic powder", "onion powder",
  "paprika", "cumin", "oregano", "chili powder", "red pepper flakes",
  "cinnamon", "bay leaves", "thyme", "rosemary",
  // Sweeteners
  "sugar", "brown sugar", "honey", "maple syrup",
  // Acids & condiments
  "white wine vinegar", "apple cider vinegar", "soy sauce",
  "hot sauce", "dijon mustard", "fish sauce",
  // Canned & jarred
  "chicken broth", "diced tomatoes", "tomato paste", "coconut milk",
  // Dry goods
  "rice", "cornstarch", "baking powder", "baking soda",
  // Nuts & seeds
  "sesame seeds",
];

// ── POST /api/pantry/seed ─────────────────────────────────────────────────────
// Populates the pantry with the default starter list.
// Safe to call repeatedly — skips items that already exist.

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // createMany with skipDuplicates handles the unique constraint gracefully
    const result = await prisma.pantryStaple.createMany({
      data: DEFAULT_STAPLES.map((name) => ({ name })),
      skipDuplicates: true,
    });

    const all = await prisma.pantryStaple.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ seeded: result.count, staples: all });
  } catch (err) {
    console.error("[POST /api/pantry/seed]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
