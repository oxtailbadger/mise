import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// ── DELETE /api/pantry/[id] ───────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.pantryStaple.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/pantry/[id]]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
