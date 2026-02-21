import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GFStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { orderBy: { sortOrder: "asc" } }, tags: true },
    });

    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(recipe);
  } catch (err) {
    console.error("[GET /api/recipes/[id]]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      name, sourceUrl, totalTime, activeCookTime, potsAndPans,
      servings, instructions, gfStatus, gfNotes, notes, favorite,
      ingredients = [], tags = [],
    } = body;

    // Replace ingredients and tags entirely
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name,
        sourceUrl: sourceUrl || null,
        totalTime: totalTime ? parseInt(totalTime) : null,
        activeCookTime: activeCookTime ? parseInt(activeCookTime) : null,
        potsAndPans: potsAndPans ? parseInt(potsAndPans) : null,
        servings: parseInt(servings) || 2,
        instructions,
        gfStatus: gfStatus as GFStatus,
        gfNotes: gfNotes || null,
        notes: notes || null,
        favorite: !!favorite,
        ingredients: {
          deleteMany: {},
          create: ingredients.map(
            (ing: { name: string; quantity: string; unit?: string; notes?: string; isGlutenFlag?: boolean; gfSubstitute?: string }, i: number) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit || null,
              notes: ing.notes || null,
              isGlutenFlag: !!ing.isGlutenFlag,
              gfSubstitute: ing.gfSubstitute || null,
              sortOrder: i,
            })
          ),
        },
        tags: {
          deleteMany: {},
          create: tags.map((t: { type: string; value: string }) => ({
            type: t.type,
            value: t.value,
          })),
        },
      },
      include: { ingredients: { orderBy: { sortOrder: "asc" } }, tags: true },
    });

    return NextResponse.json(recipe);
  } catch (err) {
    console.error("[PUT /api/recipes/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/recipes/[id]]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}
