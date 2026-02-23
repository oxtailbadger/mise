/**
 * Multi-Household Isolation Tests
 * ================================
 * All tests in this file are SKIPPED until multi-household support is
 * implemented (see MEMORY.md → V2 Roadmap → P0).
 *
 * When implementing multi-household:
 *   1. Remove `test.skip(...)` from each test (or change to `test(...)`)
 *   2. Set env vars: HOUSEHOLD_A_PASSWORD, HOUSEHOLD_B_PASSWORD
 *   3. Seed two distinct households in the test DB before running
 *
 * These tests validate the core security guarantee of multi-tenancy:
 *   HOUSEHOLD A MUST NEVER SEE HOUSEHOLD B'S DATA
 *
 * Test coverage:
 *   - Authentication: each household logs in independently
 *   - Data isolation: recipes, meal plans, grocery lists, pantry, settings
 *   - API-level isolation: direct API calls with wrong householdId are rejected
 *   - Realtime isolation: Supabase channel scoping
 *   - Edge cases: cross-household URL traversal
 */

import { test, expect, login } from "./fixtures";
import type { Page, BrowserContext } from "@playwright/test";

// ── Test household credentials ────────────────────────────────────────────────
// Set these env vars when running isolation tests after implementing multi-household support.

const HOUSEHOLD_A = {
  name: "HouseholdAlpha",
  password: process.env.HOUSEHOLD_A_PASSWORD ?? "password-a",
};

const HOUSEHOLD_B = {
  name: "HouseholdBeta",
  password: process.env.HOUSEHOLD_B_PASSWORD ?? "password-b",
};

// ── Helper: login as a specific household ─────────────────────────────────────

async function loginAs(page: Page, household: { name: string; password: string }) {
  await page.goto("/login");
  // When multi-household is implemented, the login form will need a household
  // identifier (name or code). Update this helper to match the actual UI.
  const householdInput = page.getByLabel(/household/i);
  if (await householdInput.count() > 0) {
    await householdInput.fill(household.name);
  }
  await page.getByLabel(/password/i).fill(household.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(welcome|plan)/, { timeout: 10_000 });
}

// ── Authentication isolation ──────────────────────────────────────────────────

test.describe("Authentication — multi-household", () => {
  test.skip("Household A can log in independently", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, HOUSEHOLD_A);
    expect(page.url()).not.toContain("/login");
    await ctx.close();
  });

  test.skip("Household B can log in independently", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, HOUSEHOLD_B);
    expect(page.url()).not.toContain("/login");
    await ctx.close();
  });

  test.skip("Household A's password does not grant access to Household B", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/login");
    const householdInput = page.getByLabel(/household/i);
    if (await householdInput.count() > 0) {
      await householdInput.fill(HOUSEHOLD_B.name);
    }
    await page.getByLabel(/password/i).fill(HOUSEHOLD_A.password); // wrong password for B
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    expect(page.url()).toContain("/login");
    await ctx.close();
  });
});

// ── Recipe isolation ──────────────────────────────────────────────────────────

test.describe("Recipe isolation", () => {
  test.skip("Household A cannot see Household B's recipes via the UI", async ({ browser }) => {
    // Seed: create a recipe in Household B via API, then verify Household A can't see it.
    // Implementation: call /api/recipes as B to create, then as A to list, verify absent.

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // B creates a recipe with a distinctive name
      await pageB.goto("/recipes/new");
      await pageB.getByRole("tab", { name: /manual/i }).click();
      await pageB.getByLabel(/recipe name/i).fill("Household B Secret Recipe XYZ");
      await pageB.getByLabel(/instructions/i).fill("Secret instructions");
      await pageB.getByRole("button", { name: /save|create/i }).click();
      await pageB.waitForURL(/\/recipes\/[a-z0-9]/, { timeout: 10_000 });

      // A navigates to recipes — should NOT see B's recipe
      await pageA.goto("/recipes");
      await expect(pageA.getByText("Household B Secret Recipe XYZ")).not.toBeVisible({ timeout: 3_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test.skip("Direct API call for Household B's recipe returns 404 for Household A's session", async ({ browser }) => {
    // After multi-household is implemented, GET /api/recipes/[id] must return 404
    // when the recipe belongs to a different household.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // Get a recipe ID from household B (navigate and capture URL)
      await pageB.goto("/recipes");
      const firstBRecipe = pageB.getByRole("link").filter({ hasText: /.{3,}/ }).first();
      const count = await firstBRecipe.count();
      if (count === 0) return; // no recipes in B, skip

      await firstBRecipe.click();
      await pageB.waitForURL(/\/recipes\/([a-z0-9]+)/, { timeout: 5_000 });
      const recipeIdMatch = pageB.url().match(/\/recipes\/([a-z0-9]+)/);
      const recipeId = recipeIdMatch?.[1];
      if (!recipeId) return;

      // A tries to access B's recipe via the API
      const response = await pageA.request.get(`/api/recipes/${recipeId}`);
      expect(response.status()).toBe(404);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test.skip("Household A cannot access Household B's recipe detail page via URL traversal", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // Get a recipe URL from B
      await pageB.goto("/recipes");
      const firstBRecipe = pageB.getByRole("link").filter({ hasText: /.{3,}/ }).first();
      const count = await firstBRecipe.count();
      if (count === 0) return;

      await firstBRecipe.click();
      await pageB.waitForURL(/\/recipes\/[a-z0-9]/, { timeout: 5_000 });
      const bRecipeUrl = pageB.url();
      const bRecipeId = bRecipeUrl.split("/recipes/")[1]?.split("/")[0];

      // A tries to navigate directly to B's recipe URL
      await pageA.goto(`/recipes/${bRecipeId}`);
      // Should get 404 page or redirect
      const status = await pageA.evaluate(() => document.title);
      const is404 = status.includes("404") || (await pageA.getByText(/not found|404/i).count()) > 0;
      const redirectedAway = !pageA.url().includes(bRecipeId);
      expect(is404 || redirectedAway).toBe(true);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ── Meal plan isolation ───────────────────────────────────────────────────────

test.describe("Meal plan isolation", () => {
  test.skip("Household A's meal plan is not visible to Household B", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // A plans a meal with a distinctive custom name on Monday
      await pageA.goto("/plan");
      await pageA.locator("button, [role=button]").filter({ hasText: /monday/i }).first().click();
      await pageA.waitForSelector("[role=dialog]", { timeout: 3_000 });
      await pageA.getByPlaceholder(/meal name|homemade pizza/i).fill("Household A Special Dinner");
      await pageA.getByRole("button", { name: /^set$/i }).click();
      await pageA.waitForSelector("[role=dialog]", { state: "hidden", timeout: 5_000 });

      // B checks the planner — should NOT see A's meal
      await pageB.goto("/plan");
      await expect(pageB.getByText("Household A Special Dinner")).not.toBeVisible({ timeout: 3_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test.skip("Direct API call to GET /api/meal-plan only returns current household's data", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // A creates a meal plan entry via API
      const weekStart = "2026-06-01"; // far future week unlikely to have real data
      await pageA.request.put("/api/meal-plan", {
        data: { weekStart, dayOfWeek: 3, status: "PLANNED", customMealName: "A Thursday Dinner" },
      });

      // B queries the same week — should get empty or its own data
      const response = await pageB.request.get(`/api/meal-plan?weekStart=${weekStart}`);
      const days = await response.json();
      const hasAData = Array.isArray(days) && days.some(
        (d: { customMealName?: string }) => d.customMealName === "A Thursday Dinner"
      );
      expect(hasAData).toBe(false);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ── Grocery list isolation ────────────────────────────────────────────────────

test.describe("Grocery list isolation", () => {
  test.skip("Household A's grocery items are not visible to Household B", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // A adds a manual grocery item with a distinctive name
      await pageA.goto("/grocery");
      const input = pageA.getByPlaceholder(/item name|add item/i);
      if (await input.count() > 0) {
        await input.fill("Household A's Distinctive Item 99XYZ");
        await pageA.keyboard.press("Enter");
        await pageA.waitForTimeout(500);
      }

      // B's grocery page should not show A's item
      await pageB.goto("/grocery");
      await expect(pageB.getByText("Household A's Distinctive Item 99XYZ")).not.toBeVisible({
        timeout: 3_000,
      });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test.skip("POST /api/grocery/generate only uses the current household's meal plan", async ({ browser }) => {
    // If A has planned a specific recipe and B generates their grocery list,
    // B's list should not contain ingredients from A's recipe.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageB, HOUSEHOLD_B);

      // B generates a grocery list for a week where they have no planned meals
      const weekStart = "2026-07-06";
      const response = await pageB.request.post("/api/grocery/generate", {
        data: { weekStart },
      });
      const list = await response.json();

      // The generated list should have zero auto-generated items
      // (B has no planned meals this week)
      const autoItems = (list.items ?? []).filter((i: { isManual: boolean }) => !i.isManual);
      expect(autoItems).toHaveLength(0);
    } finally {
      await ctxB.close();
    }
  });
});

// ── Pantry staples isolation ──────────────────────────────────────────────────

test.describe("Pantry staples isolation", () => {
  test.skip("Household A's pantry staples are not visible to Household B", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // A adds a unique pantry item
      await pageA.request.post("/api/pantry", {
        data: { name: "household-a-unique-pantry-item-xyz" },
      });

      // B fetches pantry — should not contain A's item
      const response = await pageB.request.get("/api/pantry");
      const staples = await response.json();
      const hasAItem = staples.some(
        (s: { name: string }) => s.name === "household-a-unique-pantry-item-xyz"
      );
      expect(hasAItem).toBe(false);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ── Settings isolation ────────────────────────────────────────────────────────

test.describe("Settings isolation", () => {
  test.skip("Household A's name change does not affect Household B's settings", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // Store B's current name
      const bSettingsBeforeRes = await pageB.request.get("/api/settings/household");
      const { name: bNameBefore } = await bSettingsBeforeRes.json();

      // A changes their household name
      await pageA.request.patch("/api/settings/household", {
        data: { name: "HouseholdAlphaRenamed" },
      });

      // B's name should be unchanged
      const bSettingsAfterRes = await pageB.request.get("/api/settings/household");
      const { name: bNameAfter } = await bSettingsAfterRes.json();
      expect(bNameAfter).toBe(bNameBefore);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test.skip("HouseholdSettings is per-household, not a global singleton", async ({ browser }) => {
    // This test validates the architectural shift from the v1 singleton pattern
    // (id='singleton') to a per-household settings row.
    //
    // After the migration:
    // - HouseholdSettings will have a householdId FK column
    // - The singleton id='singleton' constraint will be removed
    // - Each household will have its own row
    //
    // This test verifies both households can have distinct settings simultaneously.

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      await pageA.request.patch("/api/settings/household", { data: { name: "AlphaUnique" } });
      await pageB.request.patch("/api/settings/household", { data: { name: "BetaUnique" } });

      const aRes = await pageA.request.get("/api/settings/household");
      const bRes = await pageB.request.get("/api/settings/household");

      expect((await aRes.json()).name).toBe("AlphaUnique");
      expect((await bRes.json()).name).toBe("BetaUnique");
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ── Supabase Realtime channel isolation ───────────────────────────────────────

test.describe("Realtime channel isolation", () => {
  test.skip("Household A's item check-off is not received by Household B's client", async ({ browser }) => {
    // The Supabase Realtime subscription is scoped to listId (a UUID).
    // Since each household has a distinct GroceryList, their listIds are different.
    // This means cross-household pollution is architecturally impossible at the
    // channel level — this test validates the assumption holds end-to-end.
    //
    // Implementation note: testing Realtime in Playwright requires both contexts
    // to have the grocery page open simultaneously, then verify that a check
    // event in context A does NOT propagate to context B.
    //
    // This test requires a stable seeded test DB with both households having
    // an existing grocery list for the same week.

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, HOUSEHOLD_A);
      await loginAs(pageB, HOUSEHOLD_B);

      // Both open grocery page for the current week
      await pageA.goto("/grocery");
      await pageB.goto("/grocery");
      await pageA.waitForTimeout(1000); // allow Realtime subscription to connect

      // A checks an item
      const aCheckbox = pageA.getByRole("checkbox").first();
      if (await aCheckbox.count() === 0) return; // no items to check

      await aCheckbox.check();
      await pageA.waitForTimeout(1000); // allow Realtime event to propagate

      // B's identical first item should remain unchecked
      const bCheckbox = pageB.getByRole("checkbox").first();
      if (await bCheckbox.count() === 0) return;
      expect(await bCheckbox.isChecked()).toBe(false);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ── Unauthenticated isolation ─────────────────────────────────────────────────

test.describe("Unauthenticated access", () => {
  test.skip("All API routes return 401 without a valid session", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      // Do NOT log in
      const routes = [
        { method: "GET",   url: "/api/recipes" },
        { method: "GET",   url: "/api/meal-plan?weekStart=2026-02-23" },
        { method: "GET",   url: "/api/grocery?weekStart=2026-02-23" },
        { method: "GET",   url: "/api/pantry" },
        { method: "GET",   url: "/api/settings/household" },
      ];

      for (const route of routes) {
        const res = await page.request.get(route.url);
        expect(res.status()).toBe(401);
      }
    } finally {
      await ctx.close();
    }
  });
});
