import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const householdId = session.user.id;

  const { id } = await params;

  try {
    const recipe = await prisma.recipe.findFirst({ where: { id, householdId }, select: { favorite: true } });
    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.recipe.update({
      where: { id },
      data: { favorite: !recipe.favorite },
      select: { id: true, favorite: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/recipes/[id]/favorite]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
