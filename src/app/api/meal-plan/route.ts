import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromISODate, toISODate, addWeeks } from "@/lib/week-utils";
import type { DayStatus } from "@prisma/client";
import type { UpsertDayPayload } from "@/types/meal-plan";

// ── GET /api/meal-plan?weekStart=YYYY-MM-DD ───────────────────────────────────
// Returns all planned days for the given week.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartStr = req.nextUrl.searchParams.get("weekStart");
  if (!weekStartStr) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  try {
    const weekStart = fromISODate(weekStartStr);
    const days = await prisma.mealPlan.findMany({
      where: { weekStart },
      include: {
        recipe: {
          select: { id: true, name: true, totalTime: true, gfStatus: true },
        },
      },
      orderBy: { dayOfWeek: "asc" },
    });

    // Normalize weekStart to ISO date string for the client
    const normalized = days.map((d) => ({
      ...d,
      weekStart: toISODate(d.weekStart),
    }));

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("[GET /api/meal-plan]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

// ── PUT /api/meal-plan — upsert a single day ──────────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: UpsertDayPayload = await req.json();
    const { weekStart: weekStartStr, dayOfWeek, status, recipeId, customMealName, servings } = body;

    if (weekStartStr == null || dayOfWeek == null || !status) {
      return NextResponse.json({ error: "weekStart, dayOfWeek, and status are required" }, { status: 400 });
    }

    const weekStart = fromISODate(weekStartStr);

    const day = await prisma.mealPlan.upsert({
      where: { weekStart_dayOfWeek: { weekStart, dayOfWeek } },
      create: {
        weekStart,
        dayOfWeek,
        status: status as DayStatus,
        recipeId: recipeId ?? null,
        customMealName: customMealName ?? null,
        servings: servings ?? 2,
      },
      update: {
        status: status as DayStatus,
        recipeId: recipeId ?? null,
        customMealName: customMealName ?? null,
        servings: servings ?? 2,
      },
      include: {
        recipe: {
          select: { id: true, name: true, totalTime: true, gfStatus: true },
        },
      },
    });

    return NextResponse.json({ ...day, weekStart: toISODate(day.weekStart) });
  } catch (err) {
    console.error("[PUT /api/meal-plan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/meal-plan?weekStart=YYYY-MM-DD&dayOfWeek=0 ───────────────────
// Removes the plan for a single day (clears it back to unplanned).

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartStr = req.nextUrl.searchParams.get("weekStart");
  const dayOfWeekStr = req.nextUrl.searchParams.get("dayOfWeek");

  if (!weekStartStr || dayOfWeekStr == null) {
    return NextResponse.json({ error: "weekStart and dayOfWeek are required" }, { status: 400 });
  }

  try {
    const weekStart = fromISODate(weekStartStr);
    const dayOfWeek = parseInt(dayOfWeekStr);

    await prisma.mealPlan.deleteMany({
      where: { weekStart, dayOfWeek },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/meal-plan]", err);
    return NextResponse.json({ error: "Database error — is the DB running?" }, { status: 500 });
  }
}

// ── POST /api/meal-plan — carry forward last week ─────────────────────────────
// Copies last week's plan into this week (skips days already planned).

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { weekStart: weekStartStr, action } = await req.json();
    if (action !== "carry-forward") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const weekStart = fromISODate(weekStartStr);
    const prevWeekStart = addWeeks(weekStart, -1);

    // Load previous week
    const prevDays = await prisma.mealPlan.findMany({
      where: { weekStart: prevWeekStart },
    });

    if (prevDays.length === 0) {
      return NextResponse.json({ message: "No previous week to carry forward" });
    }

    // Load existing days for this week to avoid overwriting
    const existing = await prisma.mealPlan.findMany({
      where: { weekStart },
      select: { dayOfWeek: true },
    });
    const existingDays = new Set(existing.map((d) => d.dayOfWeek));

    // Create only the days not already planned
    const toCreate = prevDays
      .filter((d) => !existingDays.has(d.dayOfWeek))
      .map((d) => ({
        weekStart,
        dayOfWeek: d.dayOfWeek,
        status: d.status as DayStatus,
        recipeId: d.recipeId,
        customMealName: d.customMealName,
        servings: d.servings,
      }));

    if (toCreate.length > 0) {
      await prisma.mealPlan.createMany({ data: toCreate });
    }

    // Return the full week
    const days = await prisma.mealPlan.findMany({
      where: { weekStart },
      include: {
        recipe: {
          select: { id: true, name: true, totalTime: true, gfStatus: true },
        },
      },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(days.map((d) => ({ ...d, weekStart: toISODate(d.weekStart) })));
  } catch (err) {
    console.error("[POST /api/meal-plan carry-forward]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error — is the DB running?" },
      { status: 500 }
    );
  }
}
