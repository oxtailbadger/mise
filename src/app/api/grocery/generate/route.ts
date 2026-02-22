import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromISODate, toISODate } from "@/lib/week-utils";
import { consolidateIngredients, detectCategory, matchesPantry } from "@/lib/grocery-utils";
import type { ItemCategory } from "@prisma/client";

// ── POST /api/grocery/generate ────────────────────────────────────────────────
// Generates (or regenerates) the grocery list for a week from its meal plan.
// Keeps any existing manual items; replaces all auto-generated ones.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { weekStart: weekStartStr } = await req.json();
    if (!weekStartStr) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const weekStart = fromISODate(weekStartStr);

    // ── 1. Get all planned days with recipes ─────────────────────────────────
    const plannedDays = await prisma.mealPlan.findMany({
      where: { weekStart, status: "PLANNED", recipeId: { not: null } },
      include: {
        recipe: {
          include: { ingredients: true },
        },
      },
    });

    // ── 2. Collect all ingredients ───────────────────────────────────────────
    const allIngredients = plannedDays.flatMap((day) =>
      (day.recipe?.ingredients ?? []).map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        isGlutenFlag: ing.isGlutenFlag,
      }))
    );

    // ── 3. Consolidate duplicates ────────────────────────────────────────────
    const consolidated = consolidateIngredients(allIngredients);

    // ── 4. Load pantry staples for matching ──────────────────────────────────
    const pantryStaples = await prisma.pantryStaple.findMany({ select: { name: true } });
    const pantrySet = new Set(pantryStaples.map((p) => p.name.toLowerCase().trim()));

    // ── 5. Upsert GroceryList, preserving manual items ───────────────────────
    const existingList = await prisma.groceryList.findUnique({
      where: { weekStart },
      include: { items: { where: { isManual: true } } },
    });

    // Build the new auto-generated items
    const autoItems = consolidated.map((ing, i) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category: detectCategory(ing.name) as ItemCategory,
      isPantryCheck: matchesPantry(ing.name, pantrySet),
      isManual: false,
      isQuickTrip: false,
      isChecked: false,
      sortOrder: i,
    }));

    let list;

    if (existingList) {
      // Delete all non-manual items, then re-create
      await prisma.groceryItem.deleteMany({
        where: { listId: existingList.id, isManual: false },
      });
      await prisma.groceryItem.createMany({
        data: autoItems.map((item) => ({ ...item, listId: existingList.id })),
      });
      // Fetch fresh
      list = await prisma.groceryList.findUnique({
        where: { weekStart },
        include: {
          items: {
            orderBy: [
              { isPantryCheck: "desc" },
              { category: "asc" },
              { sortOrder: "asc" },
            ],
          },
        },
      });
    } else {
      // Create from scratch
      list = await prisma.groceryList.create({
        data: {
          weekStart,
          items: { create: autoItems },
        },
        include: {
          items: {
            orderBy: [
              { isPantryCheck: "desc" },
              { category: "asc" },
              { sortOrder: "asc" },
            ],
          },
        },
      });
    }

    if (!list) throw new Error("Failed to create grocery list");
    return NextResponse.json({ ...list, weekStart: toISODate(list.weekStart) });
  } catch (err) {
    console.error("[POST /api/grocery/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
