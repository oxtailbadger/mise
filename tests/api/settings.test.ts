import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGetRequest, makePatchRequest } from "./helpers";

const { authMock, prismaMock } = vi.hoisted(() => {
  const authMock = vi.fn().mockResolvedValue({ user: { name: "Test" }, expires: "9999" });
  const prismaMock = {
    householdSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(null),
    },
  };
  return { authMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PATCH } from "@/app/api/settings/household/route";

describe("GET /api/settings/household", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns default name 'your' when no settings row exists", async () => {
    prismaMock.householdSettings.findUnique.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("your");
  });

  it("returns the stored household name", async () => {
    prismaMock.householdSettings.findUnique.mockResolvedValueOnce({
      id: "singleton",
      name: "Stanton",
      updatedAt: new Date(),
    });
    const res = await GET();
    const body = await res.json();
    expect(body.name).toBe("Stanton");
  });
});

describe("PATCH /api/settings/household", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest("/api/settings/household", { name: "Smith" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await PATCH(makePatchRequest("/api/settings/household", {}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Name");
  });

  it("returns 400 when name is blank", async () => {
    const res = await PATCH(makePatchRequest("/api/settings/household", { name: "  " }));
    expect(res.status).toBe(400);
  });

  it("upserts and returns the new name", async () => {
    prismaMock.householdSettings.upsert.mockResolvedValueOnce({
      id: "singleton",
      name: "Johnson",
      updatedAt: new Date(),
    });
    const res = await PATCH(makePatchRequest("/api/settings/household", { name: "Johnson" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Johnson");
  });

  it("trims whitespace from the name before saving", async () => {
    prismaMock.householdSettings.upsert.mockResolvedValueOnce({
      id: "singleton",
      name: "Trimmed",
      updatedAt: new Date(),
    });
    await PATCH(makePatchRequest("/api/settings/household", { name: "  Trimmed  " }));
    const call = prismaMock.householdSettings.upsert.mock.calls[0][0];
    expect(call.update.name).toBe("Trimmed");
    expect(call.create.name).toBe("Trimmed");
  });

  it("always upserts with id='singleton'", async () => {
    prismaMock.householdSettings.upsert.mockResolvedValueOnce({
      id: "singleton",
      name: "Test",
      updatedAt: new Date(),
    });
    await PATCH(makePatchRequest("/api/settings/household", { name: "Test" }));
    const call = prismaMock.householdSettings.upsert.mock.calls[0][0];
    expect(call.where.id).toBe("singleton");
    expect(call.create.id).toBe("singleton");
  });
});
