import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, makePostRequest } from "./helpers";

// vi.mock is hoisted before imports — use vi.hoisted() to create shared mocks
const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({
    user: { name: "Test Household" },
    expires: "9999-12-31",
  });
  const prismaMock = {
    recipe: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/recipes/route";

const SAMPLE_RECIPE = {
  id: "rec_1",
  name: "Pasta Carbonara",
  sourceUrl: null,
  totalTime: 30,
  activeCookTime: 20,
  potsAndPans: 2,
  servings: 4,
  instructions: "Cook pasta. Mix eggs and cheese. Combine.",
  gfStatus: "NEEDS_REVIEW",
  gfNotes: null,
  notes: null,
  favorite: false,
  ingredients: [
    { id: "ing_1", recipeId: "rec_1", name: "spaghetti", quantity: "200", unit: "g", notes: null, isGlutenFlag: true, gfSubstitute: "GF pasta", sortOrder: 0 },
  ],
  tags: [{ id: "tag_1", recipeId: "rec_1", type: "PROTEIN", value: "egg" }],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("GET /api/recipes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest("/api/recipes"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns recipe list when authenticated", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([SAMPLE_RECIPE]);
    const res = await GET(makeGetRequest("/api/recipes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Pasta Carbonara");
  });

  it("passes search param to prisma query", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest("/api/recipes?search=pasta"));
    const call = prismaMock.recipe.findMany.mock.calls[0][0];
    expect(call.where).toHaveProperty("OR");
  });

  it("applies gfOnly filter when gfOnly=true", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest("/api/recipes?gfOnly=true"));
    const call = prismaMock.recipe.findMany.mock.calls[0][0];
    expect(call.where.gfStatus).toBe("CONFIRMED_GF");
  });

  it("applies favoritesOnly filter", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest("/api/recipes?favoritesOnly=true"));
    const call = prismaMock.recipe.findMany.mock.calls[0][0];
    expect(call.where.favorite).toBe(true);
  });

  it("applies maxTime filter", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest("/api/recipes?maxTime=30"));
    const call = prismaMock.recipe.findMany.mock.calls[0][0];
    expect(call.where.totalTime).toEqual({ lte: 30 });
  });

  it("applies protein tag filter", async () => {
    prismaMock.recipe.findMany.mockResolvedValueOnce([]);
    await GET(makeGetRequest("/api/recipes?protein=chicken"));
    const call = prismaMock.recipe.findMany.mock.calls[0][0];
    expect(call.where.tags).toBeDefined();
  });

  it("returns 500 when prisma throws", async () => {
    prismaMock.recipe.findMany.mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeGetRequest("/api/recipes"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/recipes", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    name: "Spaghetti Aglio e Olio",
    instructions: "Cook garlic in oil. Add pasta. Toss.",
    servings: 2,
    gfStatus: "NEEDS_REVIEW",
    ingredients: [
      { name: "spaghetti", quantity: "200", unit: "g", isGlutenFlag: true },
      { name: "garlic", quantity: "4", unit: "cloves", isGlutenFlag: false },
    ],
    tags: [{ type: "CUISINE", value: "italian" }],
  };

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest("/api/recipes", validBody));
    expect(res.status).toBe(401);
  });

  it("creates a recipe and returns 201", async () => {
    prismaMock.recipe.create.mockResolvedValueOnce({ ...SAMPLE_RECIPE, name: "Spaghetti Aglio e Olio" });
    const res = await POST(makePostRequest("/api/recipes", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Spaghetti Aglio e Olio");
  });

  it("filters out ingredients without a name", async () => {
    prismaMock.recipe.create.mockResolvedValueOnce({ ...SAMPLE_RECIPE });
    await POST(makePostRequest("/api/recipes", {
      ...validBody,
      ingredients: [
        { name: "", quantity: "2", unit: "tbsp" }, // should be filtered
        { name: "garlic", quantity: "4", unit: "cloves" },
      ],
    }));
    const call = prismaMock.recipe.create.mock.calls[0][0];
    expect(call.data.ingredients.create).toHaveLength(1);
    expect(call.data.ingredients.create[0].name).toBe("garlic");
  });

  it("returns 500 when prisma throws", async () => {
    prismaMock.recipe.create.mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePostRequest("/api/recipes", validBody));
    expect(res.status).toBe(500);
  });
});
