import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Creates a new household. Public endpoint — no auth required.
// The registration page is unguarded; access is controlled by who knows the URL.

export async function POST(req: NextRequest) {
  try {
    const { householdName, password } = await req.json();

    const name = (householdName as string | undefined)?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Household name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!password || (password as string).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check for name collision before hashing (cheap check first).
    const existing = await prisma.household.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "That household name is already taken — try adding a unique word." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password as string, 10);

    await prisma.household.create({
      data: { name, password: hash },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
