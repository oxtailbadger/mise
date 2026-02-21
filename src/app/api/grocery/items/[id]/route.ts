import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/grocery/items/[id] ─────────────────────────────────────────────
// Toggle isChecked (or update other fields in the future).

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();

    // Only allow safe, explicit updates
    const data: Record<string, unknown> = {};
    if (typeof body.isChecked === "boolean") data.isChecked = body.isChecked;
    if (typeof body.name === "string") data.name = body.name.trim();
    if ("quantity" in body) data.quantity = body.quantity ?? null;
    if ("unit" in body) data.unit = body.unit ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const item = await prisma.groceryItem.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (err) {
    console.error("[PATCH /api/grocery/items/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/grocery/items/[id] ────────────────────────────────────────────
// Remove a single grocery item.

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.groceryItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/grocery/items/[id]]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
