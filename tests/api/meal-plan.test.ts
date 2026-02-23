import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, makePutRequest, makeDeleteRequest, makePostRequest } from "./helpers";

const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({ user: { name: "Test" }, expires: "9999" });
  const prismaMock = {
    mealPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PUT, DELETE, POST } from "@/app/api/meal-plan/route";

const SAMPLE_DAY = {
  id: "mp_1",
  weekStart: new Date("2026-02-23T00:00:00Z"),
  dayOfWeek: 0,
  status: "PLANNED",
  recipeId: "rec_1",
  customMealName: null,
  servings: 2,
  recipe: { id: "rec_1", name: "Pasta", totalTime: 30, gfStatus: "CONFIRMED_GF" },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GET /api/meal-plan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest("/api/meal-plan?weekStart=2026-02-23"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await GET(makeGetRequest("/api/meal-plan"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("weekStart");
  });

  it("returns week plan days as array", async () => {
    prismaMock.mealPlan.findMany.mockResolvedValueOnce([SAMPLE_DAY]);
    const res = await GET(makeGetRequest("/api/meal-plan?weekStart=2026-02-23"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].dayOfWeek).toBe(0);
  });

  it("normalizes weekStart to ISO date string in response", async () => {
    prismaMock.mealPlan.findMany.mockResolvedValueOnce([SAMPLE_DAY]);
    const res = await GET(makeGetRequest("/api/meal-plan?weekStart=2026-02-23"));
    const body = await res.json();
    expect(body[0].weekStart).toBe("2026-02-23");
  });

  it("returns empty array when no days are planned", async () => {
    prismaMock.mealPlan.findMany.mockResolvedValueOnce([]);
    const res = await GET(makeGetRequest("/api/meal-plan?weekStart=2026-02-23"));
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("PUT /api/meal-plan", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    weekStart: "2026-02-23",
    dayOfWeek: 0,
    status: "PLANNED",
    recipeId: "rec_1",
  };

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await PUT(makePutRequest("/api/meal-plan", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await PUT(makePutRequest("/api/meal-plan", { weekStart: "2026-02-23" }));
    expect(res.status).toBe(400);
  });

  it("upserts the day and returns it", async () => {
    prismaMock.mealPlan.upsert.mockResolvedValueOnce(SAMPLE_DAY);
    const res = await PUT(makePutRequest("/api/meal-plan", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weekStart).toBe("2026-02-23");
    expect(body.dayOfWeek).toBe(0);
  });

  it("upserts a LEFTOVERS status day", async () => {
    const leftoversDay = { ...SAMPLE_DAY, status: "LEFTOVERS", recipeId: null };
    prismaMock.mealPlan.upsert.mockResolvedValueOnce(leftoversDay);
    const res = await PUT(makePutRequest("/api/meal-plan", {
      weekStart: "2026-02-23",
      dayOfWeek: 1,
      status: "LEFTOVERS",
      recipeId: null,
    }));
    expect(res.status).toBe(200);
  });

  it("upserts with a custom meal name (no recipe)", async () => {
    const customDay = { ...SAMPLE_DAY, recipeId: null, customMealName: "Tacos" };
    prismaMock.mealPlan.upsert.mockResolvedValueOnce(customDay);
    const res = await PUT(makePutRequest("/api/meal-plan", {
      weekStart: "2026-02-23",
      dayOfWeek: 2,
      status: "PLANNED",
      recipeId: null,
      customMealName: "Tacos",
    }));
    const body = await res.json();
    expect(body.customMealName).toBe("Tacos");
  });
});

describe("DELETE /api/meal-plan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest("/api/meal-plan?weekStart=2026-02-23&dayOfWeek=0"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await DELETE(makeDeleteRequest("/api/meal-plan?dayOfWeek=0"));
    expect(res.status).toBe(400);
  });

  it("deletes the day and returns success", async () => {
    prismaMock.mealPlan.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(makeDeleteRequest("/api/meal-plan?weekStart=2026-02-23&dayOfWeek=0"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/meal-plan (carry-forward)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest("/api/meal-plan", { action: "carry-forward", weekStart: "2026-03-02" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for unknown action", async () => {
    const res = await POST(makePostRequest("/api/meal-plan", { action: "unknown", weekStart: "2026-03-02" }));
    expect(res.status).toBe(400);
  });

  it("returns message when no previous week exists", async () => {
    prismaMock.mealPlan.findMany.mockResolvedValueOnce([]); // prev week empty
    const res = await POST(makePostRequest("/api/meal-plan", { action: "carry-forward", weekStart: "2026-03-02" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("No previous week");
  });

  it("copies previous week's days into the new week", async () => {
    const prevDays = [
      { ...SAMPLE_DAY, weekStart: new Date("2026-02-16T00:00:00Z"), dayOfWeek: 0 },
      { ...SAMPLE_DAY, weekStart: new Date("2026-02-16T00:00:00Z"), dayOfWeek: 1 },
    ];
    prismaMock.mealPlan.findMany
      .mockResolvedValueOnce(prevDays)                  // prev week lookup
      .mockResolvedValueOnce([])                        // existing days (empty)
      .mockResolvedValueOnce(prevDays.map(d => ({       // full week return
        ...d, weekStart: new Date("2026-02-23T00:00:00Z"),
      })));
    prismaMock.mealPlan.createMany.mockResolvedValueOnce({ count: 2 });

    const res = await POST(makePostRequest("/api/meal-plan", { action: "carry-forward", weekStart: "2026-02-23" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(prismaMock.mealPlan.createMany).toHaveBeenCalledOnce();
  });

  it("skips days that are already planned in the target week", async () => {
    const prevDay = { ...SAMPLE_DAY, weekStart: new Date("2026-02-16T00:00:00Z"), dayOfWeek: 0 };
    const existingDay = { dayOfWeek: 0 }; // Monday already planned

    prismaMock.mealPlan.findMany
      .mockResolvedValueOnce([prevDay])         // prev week
      .mockResolvedValueOnce([existingDay])     // existing days in target week
      .mockResolvedValueOnce([]);               // full week return

    const res = await POST(makePostRequest("/api/meal-plan", { action: "carry-forward", weekStart: "2026-02-23" }));
    expect(res.status).toBe(200);
    // createMany should NOT have been called because no new days to add
    expect(prismaMock.mealPlan.createMany).not.toHaveBeenCalled();
  });
});
