import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── GET /api/pantry ───────────────────────────────────────────────────────────
// Returns all pantry staples, alphabetically sorted.

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const staples = await prisma.pantryStaple.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staples);
  } catch (err) {
    console.error("[GET /api/pantry]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

// ── POST /api/pantry ──────────────────────────────────────────────────────────
// Add a single pantry staple by name (case-insensitive dedup).

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // upsert so duplicates are silently ignored
    const staple = await prisma.pantryStaple.upsert({
      where: { name: name.trim().toLowerCase() },
      create: { name: name.trim().toLowerCase() },
      update: {},
    });

    return NextResponse.json(staple, { status: 201 });
  } catch (err) {
    console.error("[POST /api/pantry]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
