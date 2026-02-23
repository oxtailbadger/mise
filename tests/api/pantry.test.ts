import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, makePostRequest } from "./helpers";

const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({ user: { name: "Test" }, expires: "9999" });
  const prismaMock = {
    pantryStaple: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/pantry/route";

describe("GET /api/pantry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns all pantry staples", async () => {
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([
      { id: "p1", name: "olive oil", createdAt: new Date() },
      { id: "p2", name: "salt", createdAt: new Date() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("olive oil");
  });

  it("returns empty array when pantry is empty", async () => {
    prismaMock.pantryStaple.findMany.mockResolvedValueOnce([]);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/pantry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest("/api/pantry", { name: "butter" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest("/api/pantry", {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("name");
  });

  it("returns 400 when name is blank", async () => {
    const res = await POST(makePostRequest("/api/pantry", { name: "   " }));
    expect(res.status).toBe(400);
  });

  it("creates a new pantry staple and returns 201", async () => {
    const staple = { id: "p1", name: "butter", createdAt: new Date() };
    prismaMock.pantryStaple.upsert.mockResolvedValueOnce(staple);
    const res = await POST(makePostRequest("/api/pantry", { name: "butter" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("butter");
  });

  it("normalises name to lowercase before upsert", async () => {
    prismaMock.pantryStaple.upsert.mockResolvedValueOnce({ id: "p1", name: "olive oil", createdAt: new Date() });
    await POST(makePostRequest("/api/pantry", { name: "Olive Oil" }));
    const call = prismaMock.pantryStaple.upsert.mock.calls[0][0];
    expect(call.create.name).toBe("olive oil");
  });

  it("silently ignores duplicate names (upsert pattern)", async () => {
    const existing = { id: "p1", name: "salt", createdAt: new Date() };
    prismaMock.pantryStaple.upsert.mockResolvedValueOnce(existing);
    const res = await POST(makePostRequest("/api/pantry", { name: "salt" }));
    expect(res.status).toBe(201);
  });
});
