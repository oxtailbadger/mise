import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";
const DEFAULT_NAME  = "your";

// ── GET /api/settings/household ───────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.householdSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    return NextResponse.json({ name: settings?.name ?? DEFAULT_NAME });
  } catch (err) {
    console.error("[GET /api/settings/household]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// ── PATCH /api/settings/household ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const settings = await prisma.householdSettings.upsert({
      where:  { id: SINGLETON_ID },
      update: { name: name.trim() },
      create: { id: SINGLETON_ID, name: name.trim() },
    });

    return NextResponse.json({ name: settings.name });
  } catch (err) {
    console.error("[PATCH /api/settings/household]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
