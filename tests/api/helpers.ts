/**
 * Shared test helpers for API route tests.
 *
 * Usage:
 *   vi.mock("@/lib/auth", () => ({ auth: mockAuth() }));
 *   vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma() }));
 */

import { vi } from "vitest";
import { NextRequest } from "next/server";

// ── Auth mock ─────────────────────────────────────────────────────────────────

/** Returns a mock `auth` function that resolves with a valid session by default. */
export function mockAuth(authenticated = true) {
  return vi.fn().mockResolvedValue(
    authenticated
      ? { user: { name: "Test Household" }, expires: "9999-12-31" }
      : null
  );
}

// ── Prisma mock ───────────────────────────────────────────────────────────────

/** Creates a full mock Prisma client with all models used in the app. */
export function mockPrisma() {
  return {
    recipe: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    recipeIngredient: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    recipeTag: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    mealPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    groceryList: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
    },
    groceryItem: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    pantryStaple: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
    },
    householdSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(null),
    },
  };
}

// ── Request factories ─────────────────────────────────────────────────────────

export function makeGetRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`);
}

export function makePostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function makePutRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function makePatchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function makeDeleteRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: "DELETE" });
}
