import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GFStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const gfOnly = searchParams.get("gfOnly") === "true";
  const favoritesOnly = searchParams.get("favoritesOnly") === "true";
  const maxTime = searchParams.get("maxTime") ? parseInt(searchParams.get("maxTime")!) : undefined;
  const protein = searchParams.get("protein") ?? "";

  const where: Prisma.RecipeWhereInput = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { ingredients: { some: { name: { contains: search, mode: "insensitive" } } } },
      ],
    }),
    ...(gfOnly && { gfStatus: "CONFIRMED_GF" }),
    ...(favoritesOnly && { favorite: true }),
    ...(maxTime && { totalTime: { lte: maxTime } }),
    ...(protein && {
      tags: { some: { type: "PROTEIN", value: { contains: protein, mode: "insensitive" } } },
    }),
  };

  try {
    const recipes = await prisma.recipe.findMany({
      where,
      include: { ingredients: { orderBy: { sortOrder: "asc" } }, tags: true },
      orderBy: [{ favorite: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(recipes);
  } catch (err) {
    console.error("[GET /api/recipes]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      name, sourceUrl, totalTime, activeCookTime, potsAndPans,
      servings, instructions, gfStatus, gfNotes, notes, favorite,
      ingredients = [], tags = [],
    } = body;

    const recipe = await prisma.recipe.create({
      data: {
        name,
        sourceUrl: sourceUrl || null,
        totalTime: totalTime ? parseInt(totalTime) : null,
        activeCookTime: activeCookTime ? parseInt(activeCookTime) : null,
        potsAndPans: potsAndPans ? parseInt(potsAndPans) : null,
        servings: parseInt(servings) || 2,
        instructions,
        gfStatus: (gfStatus as GFStatus) || "NEEDS_REVIEW",
        gfNotes: gfNotes || null,
        notes: notes || null,
        favorite: !!favorite,
        ingredients: {
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
          create: tags.map((t: { type: string; value: string }) => ({
            type: t.type,
            value: t.value,
          })),
        },
      },
      include: { ingredients: { orderBy: { sortOrder: "asc" } }, tags: true },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    console.error("[POST /api/recipes]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
