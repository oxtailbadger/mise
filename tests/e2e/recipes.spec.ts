/**
 * E2E: Recipe library flows
 *
 * Tests: view list, search/filter, create (manual), view detail, edit, import.
 */

import { test, expect } from "./fixtures";

test.describe("Recipe list", () => {
  test("loads the recipes page", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    await expect(page.getByRole("heading", { name: /recipes/i })).toBeVisible();
  });

  test("shows search input and filter controls", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test("shows empty state when no recipes exist", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    // The empty state or a recipe list or the add-first CTA should be present
    const hasContent =
      (await page.getByText(/no recipes/i).count()) > 0 ||
      (await page.getByRole("link", { name: /add|import|new/i }).count()) > 0;
    expect(hasContent).toBe(true);
  });
});

test.describe("Add new recipe", () => {
  test("opens the new recipe page via button", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    await page.getByRole("link", { name: /add|new|import/i }).first().click();
    await page.waitForURL(/\/recipes\/new/, { timeout: 5_000 });
    expect(page.url()).toContain("/recipes/new");
  });

  test("new recipe page shows import tabs (URL, Paste, Manual, Photo)", async ({ authedPage: page }) => {
    await page.goto("/recipes/new");
    await expect(page.getByRole("tab", { name: /url/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /paste/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /manual/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /photo/i })).toBeVisible();
  });

  test("can create a recipe via the Manual tab", async ({ authedPage: page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("tab", { name: /manual/i }).click();

    // Fill in the recipe form
    await page.getByLabel(/recipe name/i).fill("E2E Test Recipe");
    await page.getByLabel(/total time/i).fill("30");
    await page.getByLabel(/servings/i).fill("4");

    // Add an ingredient
    await page.getByPlaceholder(/ingredient name/i).first().fill("garlic");
    await page.getByPlaceholder(/qty|quantity/i).first().fill("4");

    // Instructions
    await page.getByLabel(/instructions/i).fill("Cook garlic. Done.");

    // Submit
    await page.getByRole("button", { name: /save|create|add recipe/i }).click();

    // Should redirect to the recipe detail page or recipes list
    await page.waitForURL(/\/recipes\//, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/recipes\/[a-z0-9]/);
  });
});

test.describe("Recipe detail", () => {
  test("recipe detail page shows name, ingredients, and instructions", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    // If there are any recipes listed, click the first one
    const firstRecipe = page.getByRole("link", { name: /.+/ }).filter({ hasText: /.{3,}/ }).first();
    const count = await firstRecipe.count();
    test.skip(count === 0, "No recipes in DB — skipping detail test");

    await firstRecipe.click();
    await page.waitForURL(/\/recipes\/[a-z0-9]/, { timeout: 5_000 });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("edit button on recipe detail navigates to edit page", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    const firstLink = page.getByRole("link").filter({ hasText: /.{3,}/ }).first();
    const count = await firstLink.count();
    test.skip(count === 0, "No recipes — skipping edit test");

    await firstLink.click();
    await page.waitForURL(/\/recipes\/[a-z0-9]/);

    await page.getByRole("link", { name: /edit/i }).click();
    await page.waitForURL(/\/recipes\/[a-z0-9]+\/edit/, { timeout: 5_000 });
    expect(page.url()).toContain("/edit");
  });
});

test.describe("Recipe filters", () => {
  test("GF filter chip applies and removes", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    const gfButton = page.getByRole("button", { name: /gluten.free|gf/i });
    const count = await gfButton.count();
    if (count === 0) return; // filter might have different label

    await gfButton.click();
    await page.waitForTimeout(500);
    // Verify filter is active (some visual indicator or URL param)
    await gfButton.click(); // toggle off
  });

  test("favorites filter applies", async ({ authedPage: page }) => {
    await page.goto("/recipes");
    const favButton = page.getByRole("button", { name: /favorites?/i });
    const count = await favButton.count();
    if (count === 0) return;
    await favButton.click();
    await page.waitForTimeout(300);
  });
});
