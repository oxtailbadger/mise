import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromISODate, toISODate } from "@/lib/week-utils";

// ── GET /api/grocery?weekStart=YYYY-MM-DD ─────────────────────────────────────
// Returns the grocery list for the week, or null if none exists.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartStr = req.nextUrl.searchParams.get("weekStart");
  if (!weekStartStr) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  try {
    const weekStart = fromISODate(weekStartStr);
    const list = await prisma.groceryList.findUnique({
      where: { weekStart },
      include: { items: { orderBy: [{ isPantryCheck: "desc" }, { category: "asc" }, { sortOrder: "asc" }] } },
    });

    if (!list) return NextResponse.json(null);

    return NextResponse.json({ ...list, weekStart: toISODate(list.weekStart) });
  } catch (err) {
    console.error("[GET /api/grocery]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

// ── DELETE /api/grocery?weekStart=YYYY-MM-DD ──────────────────────────────────
// Deletes the entire grocery list for the week.

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartStr = req.nextUrl.searchParams.get("weekStart");
  if (!weekStartStr) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  try {
    const weekStart = fromISODate(weekStartStr);
    await prisma.groceryList.deleteMany({ where: { weekStart } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/grocery]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
