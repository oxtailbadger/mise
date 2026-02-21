import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── POST /api/grocery/clear-checked ──────────────────────────────────────────
// Deletes all checked items from a grocery list.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { listId } = await req.json();
    if (!listId) {
      return NextResponse.json({ error: "listId is required" }, { status: 400 });
    }

    const { count } = await prisma.groceryItem.deleteMany({
      where: { listId, isChecked: true },
    });

    return NextResponse.json({ success: true, deleted: count });
  } catch (err) {
    console.error("[POST /api/grocery/clear-checked]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
