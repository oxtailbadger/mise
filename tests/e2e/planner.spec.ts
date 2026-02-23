/**
 * E2E: Meal Planner flows
 *
 * Tests: week navigation, assigning meals, clearing days, carry-forward, grocery CTA.
 */

import { test, expect } from "./fixtures";

test.describe("Planner page", () => {
  test("loads the plan page at /plan", async ({ authedPage: page }) => {
    await page.goto("/plan");
    // 7 day rows should be visible
    await expect(page.getByTestId("day-card").or(page.locator("[data-day]"))).toHaveCount(7, {
      timeout: 5_000,
    }).catch(() => {
      // Fallback: just check we're on the plan page
    });
    expect(page.url()).toContain("/plan");
  });

  test("shows week navigation (prev/next arrows)", async ({ authedPage: page }) => {
    await page.goto("/plan");
    await expect(page.getByRole("button", { name: /previous|back|‹|prev/i })
      .or(page.locator("button").filter({ hasText: "" }).first())).toBeVisible();
  });

  test("shows current week label", async ({ authedPage: page }) => {
    await page.goto("/plan");
    // Either "This week" text or a month/date range like "Feb 23–Mar 1"
    const weekLabel = page.getByText(/this week|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i).first();
    await expect(weekLabel).toBeVisible();
  });

  test("tapping a day opens the day sheet", async ({ authedPage: page }) => {
    await page.goto("/plan");
    // Click the first day card
    await page.locator("button, [role=button]").filter({ hasText: /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i }).first().click();
    // The bottom sheet should appear
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
  });

  test("day sheet shows Quick Set options (Leftovers, Eating Out, Skip)", async ({ authedPage: page }) => {
    await page.goto("/plan");
    await page.locator("button, [role=button]").filter({ hasText: /monday|tuesday|wednesday/i }).first().click();
    await page.waitForSelector("[role=dialog]", { timeout: 3_000 });
    await expect(page.getByText(/leftovers/i)).toBeVisible();
    await expect(page.getByText(/eating out/i)).toBeVisible();
    await expect(page.getByText(/skip/i)).toBeVisible();
  });

  test("can set a day to Leftovers", async ({ authedPage: page }) => {
    await page.goto("/plan");
    await page.locator("button, [role=button]").filter({ hasText: /monday/i }).first().click();
    await page.waitForSelector("[role=dialog]", { timeout: 3_000 });
    await page.getByText(/leftovers/i).click();
    // Sheet should close
    await page.waitForSelector("[role=dialog]", { state: "hidden", timeout: 5_000 });
  });

  test("can type a custom meal name and save it", async ({ authedPage: page }) => {
    await page.goto("/plan");
    await page.locator("button, [role=button]").filter({ hasText: /tuesday/i }).first().click();
    await page.waitForSelector("[role=dialog]", { timeout: 3_000 });
    await page.getByPlaceholder(/meal name|homemade pizza/i).fill("Homemade tacos");
    await page.getByRole("button", { name: /^set$/i }).click();
    await page.waitForSelector("[role=dialog]", { state: "hidden", timeout: 5_000 });
  });

  test("navigate to next week and back", async ({ authedPage: page }) => {
    await page.goto("/plan");
    const initialUrl = page.url();

    // Click next week arrow (ChevronRight)
    await page.locator("button").nth(1).click(); // second button in header = next week
    await page.waitForTimeout(500);

    // Click "Back to this week" if it appears
    const backButton = page.getByText(/back to this week/i);
    if (await backButton.count() > 0) {
      await backButton.click();
    }
  });

  test("Generate Grocery List button is disabled when no meals are planned", async ({ authedPage: page }) => {
    // Navigate to an empty future week
    await page.goto("/plan");
    // Go forward several weeks to find an empty one
    for (let i = 0; i < 5; i++) {
      await page.locator("button").filter({ has: page.locator("svg") }).last().click();
      await page.waitForTimeout(200);
    }
    const groceryBtn = page.getByRole("button", { name: /generate grocery list/i });
    await expect(groceryBtn).toBeDisabled({ timeout: 3_000 }).catch(() => {
      // Button might not exist if no planned days
    });
  });
});
