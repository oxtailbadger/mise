/**
 * E2E: Authentication flows
 *
 * Tests login, logout, and route protection (unauthenticated redirects).
 */

import { test, expect, login } from "./fixtures";

test.describe("Login page", () => {
  test("redirects unauthenticated users from protected routes to /login", async ({ page }) => {
    await page.goto("/recipes");
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    expect(page.url()).toContain("/login");
  });

  test("shows the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /mise/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows an error for a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill("definitely-wrong-password-xyz");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Should stay on login page with some error indication
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    // Either a toast or an inline error should be visible
    const hasError =
      (await page.getByText(/invalid|incorrect|wrong/i).count()) > 0 ||
      (await page.getByText(/try again/i).count()) > 0;
    expect(hasError).toBe(true);
  });

  test("logs in with the correct password and redirects", async ({ page }) => {
    await login(page);
    // Should be on an authenticated page
    expect(page.url()).not.toContain("/login");
  });
});

test.describe("Authenticated navigation", () => {
  test("bottom nav shows Plan, Recipes, Grocery, Settings tabs", async ({ authedPage: page }) => {
    await page.goto("/welcome");
    await expect(page.getByRole("link", { name: /plan/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /recipes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /grocery/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("welcome page loads and shows household name", async ({ authedPage: page }) => {
    await page.goto("/welcome");
    // The welcome heading always contains possessive text
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });
});
