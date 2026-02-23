/**
 * Shared Playwright fixtures and helpers for E2E tests.
 *
 * Usage:
 *   import { test, expect, login } from "./fixtures";
 *
 * The `login` fixture automatically signs in before each test using the
 * PLAYWRIGHT_PASSWORD env var (falls back to "test").
 */

import { test as base, expect, type Page } from "@playwright/test";

export { expect };

// ── Login helper ──────────────────────────────────────────────────────────────

export async function login(page: Page, password?: string) {
  const pwd = password ?? process.env.PLAYWRIGHT_PASSWORD ?? "test";
  await page.goto("/login");
  await page.getByLabel(/password/i).fill(pwd);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for redirect to welcome or plan page
  await page.waitForURL(/\/(welcome|plan)/, { timeout: 10_000 });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

type MiseFixtures = {
  /** Page pre-logged-in with the default household password. */
  authedPage: Page;
};

export const test = base.extend<MiseFixtures>({
  authedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});
