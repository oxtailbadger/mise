import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectCategory } from "@/lib/grocery-utils";
import type { ItemCategory } from "@prisma/client";

// ── POST /api/grocery/items ───────────────────────────────────────────────────
// Add a manual item to an existing grocery list.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const householdId = session.user.id;

  try {
    const { listId, name, quantity, unit, category, isQuickTrip } = await req.json();

    if (!listId || !name?.trim()) {
      return NextResponse.json({ error: "listId and name are required" }, { status: 400 });
    }

    // Verify the list belongs to this household before adding to it.
    const list = await prisma.groceryList.findFirst({ where: { id: listId, householdId }, select: { id: true } });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    // Find the highest existing sortOrder
    const last = await prisma.groceryItem.findFirst({
      where: { listId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const item = await prisma.groceryItem.create({
      data: {
        listId,
        name: name.trim(),
        quantity: quantity?.trim() || null,
        unit: unit?.trim() || null,
        category: (category ?? detectCategory(name)) as ItemCategory,
        isPantryCheck: false,
        isManual: true,
        isQuickTrip: !!isQuickTrip,
        isChecked: false,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/grocery/items]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
