import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, makeDeleteRequest } from "./helpers";

const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({ user: { name: "Test" }, expires: "9999" });
  const prismaMock = {
    groceryList: {
      findUnique: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, DELETE } from "@/app/api/grocery/route";

const SAMPLE_LIST = {
  id: "list_1",
  weekStart: new Date("2026-02-23T00:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    { id: "item_1", listId: "list_1", name: "chicken breast", quantity: "2", unit: "lbs", category: "PROTEIN", isPantryCheck: false, isManual: false, isQuickTrip: false, isChecked: false, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: "item_2", listId: "list_1", name: "olive oil", quantity: "2", unit: "tbsp", category: "DRY_GOODS", isPantryCheck: true, isManual: false, isQuickTrip: false, isChecked: false, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ],
};

describe("GET /api/grocery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await GET(makeGetRequest("/api/grocery"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("weekStart");
  });

  it("returns null when no grocery list exists for the week", async () => {
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("returns the grocery list with items when it exists", async () => {
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(SAMPLE_LIST);
    const res = await GET(makeGetRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("list_1");
    expect(body.items).toHaveLength(2);
  });

  it("normalizes weekStart to ISO date string in response", async () => {
    prismaMock.groceryList.findUnique.mockResolvedValueOnce(SAMPLE_LIST);
    const res = await GET(makeGetRequest("/api/grocery?weekStart=2026-02-23"));
    const body = await res.json();
    expect(body.weekStart).toBe("2026-02-23");
  });

  it("returns 500 when prisma throws", async () => {
    prismaMock.groceryList.findUnique.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeGetRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/grocery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weekStart is missing", async () => {
    const res = await DELETE(makeDeleteRequest("/api/grocery"));
    expect(res.status).toBe(400);
  });

  it("deletes the list and returns success", async () => {
    const res = await DELETE(makeDeleteRequest("/api/grocery?weekStart=2026-02-23"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
