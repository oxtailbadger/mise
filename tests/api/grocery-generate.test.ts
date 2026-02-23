import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePostRequest } from "./helpers";

const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({ user: { name: "Test" }, expires: "9999" });
  const prismaMock = {
    mealPlan: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    pantryStaple: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    groceryList: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
    },
    groceryItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/grocery/generate/route";

const WEEK_START = "2026-02-23";

function makePlannedDay(ingredients: { name: string; quantity: string; unit: string | null; isGlutenFlag: boolean }[]) {
  return {
    id: "mp_1",
    weekStart: new Date("2026-02-23T00:00:00Z"),
    dayOfWeek: 0,
    status: "PLANNED",
    recipeId: "rec_1",
    customMealName: null,
    servings: 2,
    recipe: {
      id: "rec_1",
      name: "Test Recipe",
      ingredients: ingredients.map((ing, i) => ({
        id: `ing_${i}`,
        recipeId: "rec_1",
        sortOrder: i,
        notes: null,
        gfSubstitute: null,
        ...ing,
      })),
    },
  };
}

describe("POST /api/grocery/generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await POST(makePostRequest("/api/grocery/generate", {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("weekStart");
  });

  it("creates a new grocery list from scratch when none exists", async () => {
    const ingredients = [
      { name: "chicken breast", quantity: "2", unit: "lbs", isGlutenFlag: false },
      { name: "garlic", quantity: "4", unit: "cloves", isGlutenFlag: false },
    ];

    prismaMock.mealPlan.findMany.mockResolvedValueOnce([makePlannedDay(ingredients)]);
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([]);
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(null);
    prismaMock.groceryList.create.mockResolvedValueOnce({
      id: "list_1",
      weekStart: new Date("2026-02-23T00:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { id: "i1", listId: "list_1", name: "chicken breast", quantity: "2", unit: "lbs", category: "PROTEIN", isPantryCheck: false, isManual: false, isQuickTrip: false, isChecked: false, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: "i2", listId: "list_1", name: "garlic", quantity: "4", unit: "cloves", category: "PRODUCE", isPantryCheck: false, isManual: false, isQuickTrip: false, isChecked: false, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
    });

    const res = await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(prismaMock.groceryList.create).toHaveBeenCalledOnce();
  });

  it("marks pantry-matched ingredients as isPantryCheck=true", async () => {
    const ingredients = [
      { name: "olive oil", quantity: "2", unit: "tbsp", isGlutenFlag: false },
      { name: "chicken breast", quantity: "1", unit: "lb", isGlutenFlag: false },
    ];

    prismaMock.mealPlan.findMany.mockResolvedValueOnce([makePlannedDay(ingredients)]);
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([{ name: "olive oil" }]);
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(null);

    prismaMock.groceryList.create.mockImplementationOnce(async ({ data }: { data: { items: { create: { name: string; isPantryCheck: boolean }[] } } }) => ({
      id: "list_1",
      weekStart: new Date("2026-02-23T00:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.create,
    }));

    const res = await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    const body = await res.json();

    const oilItem = body.items.find((i: { name: string }) => i.name === "olive oil");
    const chickenItem = body.items.find((i: { name: string }) => i.name === "chicken breast");
    expect(oilItem?.isPantryCheck).toBe(true);
    expect(chickenItem?.isPantryCheck).toBe(false);
  });

  it("consolidates duplicate ingredients across multiple recipe days", async () => {
    const day2 = {
      ...makePlannedDay([{ name: "garlic", quantity: "3", unit: "cloves", isGlutenFlag: false }]),
      id: "mp_2",
      dayOfWeek: 1,
    };

    prismaMock.mealPlan.findMany.mockResolvedValueOnce([
      makePlannedDay([{ name: "garlic", quantity: "2", unit: "cloves", isGlutenFlag: false }]),
      day2,
    ]);
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([]);
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(null);

    let capturedItems: { name: string; quantity: string | null }[] = [];
    prismaMock.groceryList.create.mockImplementationOnce(async ({ data }: { data: { items: { create: typeof capturedItems } } }) => {
      capturedItems = data.items.create;
      return { id: "list_1", weekStart: new Date("2026-02-23T00:00:00Z"), createdAt: new Date(), updatedAt: new Date(), items: capturedItems };
    });

    await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    const garlicItem = capturedItems.find((i) => i.name === "garlic");
    expect(garlicItem?.quantity).toBe("5"); // 2 + 3
  });

  it("preserves manual items when regenerating an existing list", async () => {
    const existingList = {
      id: "list_1",
      weekStart: new Date("2026-02-23T00:00:00Z"),
      items: [
        { id: "manual_1", name: "wine", isManual: true },
      ],
    };

    prismaMock.mealPlan.findMany.mockResolvedValueOnce([]);
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([]);
    prismaMock.groceryList.findUnique
      .mockResolvedValueOnce(existingList)
      .mockResolvedValueOnce({ ...existingList, items: existingList.items });

    prismaMock.groceryItem.deleteMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.groceryItem.createMany.mockResolvedValueOnce({ count: 0 });

    const res = await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    expect(res.status).toBe(200);

    const deleteCall = prismaMock.groceryItem.deleteMany.mock.calls[0][0];
    expect(deleteCall.where.isManual).toBe(false);
  });

  it("returns 500 when prisma throws", async () => {
    prismaMock.mealPlan.findMany.mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest("/api/grocery/generate", { weekStart: WEEK_START }));
    expect(res.status).toBe(500);
  });
});
