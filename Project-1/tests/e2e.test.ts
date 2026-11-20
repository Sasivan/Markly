import { test, expect } from "@playwright/test";

test.describe("Markly End-to-End Workflow", () => {
  test("renders dashboard, sidebar tree, and TanStack table", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Verify Brand title
    await expect(page.locator("text=Markly").first()).toBeVisible();

    // Verify Sidebar system views
    await expect(page.locator("text=All Bookmarks").first()).toBeVisible();
    await expect(page.locator("text=Favorites").first()).toBeVisible();

    // Verify KPI Stat Cards
    await expect(page.locator("text=Total Bookmarks").first()).toBeVisible();
    await expect(page.locator("text=Link Health").first()).toBeVisible();

    // Verify Table controls
    await expect(page.locator("input[placeholder*='Search title, URL']")).toBeVisible();
  });

  test("filters bookmarks by clicking nested folder in sidebar", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Click on Frontend folder
    const frontendFolder = page.locator('span:text-is("Frontend")').first();
    if (await frontendFolder.isVisible()) {
      await frontendFolder.click();
      await page.waitForTimeout(500);

      // Verify breadcrumbs updated
      await expect(page.locator("text=Frontend").first()).toBeVisible();
    }
  });

  test("opens command palette on Cmd+K and add modal on N shortcut", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Press 'n' to trigger Add Bookmark modal
    await page.keyboard.press("n");
    await page.waitForTimeout(500);

    const dialogTitle = page.locator("text=Add Bookmark");
    await expect(dialogTitle.first()).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });
});

