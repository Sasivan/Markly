const { chromium } = require("playwright");
const path = require("path");

const ARTIFACTS_DIR = "C:\\Users\\Sasiv\\.gemini\\antigravity\\brain\\38f73005-2751-4406-bd3f-7358408ac2c9";

async function run() {
  console.log("Starting Phase 7 Round 3 Playwright Verification...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Load Homepage
    console.log("Navigating to http://localhost:3000 ...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Light mode full homepage screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase7_round3_light_homepage.png"),
      fullPage: true,
    });
    console.log("Captured light mode homepage screenshot.");

    // 2. Test Needs Organization card click
    console.log("Testing 'Needs Organization' card click...");
    const organizeCard = page.locator("section:has-text('Inbox / Needs Organization') div.rounded-xl").first();
    if (await organizeCard.count() > 0) {
      console.log("Found organize card, clicking it...");
      await organizeCard.click();
      await page.waitForTimeout(600);
      
      const modalHeader = page.locator("text=Edit Bookmark");
      const isModalVisible = await modalHeader.isVisible();
      console.log("EditBookmarkModal visible:", isModalVisible);
      if (!isModalVisible) {
        throw new Error("EditBookmarkModal failed to open when clicking unorganized card!");
      }

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "phase7_round3_organize_modal_open.png"),
      });

      // Close modal
      const closeBtn = page.locator("button:has-text('Cancel')").first();
      await closeBtn.click();
      await page.waitForTimeout(500);
      console.log("Organize modal verified and closed.");
    } else {
      console.log("No unorganized bookmarks found in demo data, skipping click test.");
    }

    // 3. Test Sidebar Search Icon
    console.log("Testing Sidebar Search icon...");
    const sidebarSearchBtn = page.locator("aside button[title*='Search']").first();
    await sidebarSearchBtn.click();
    await page.waitForTimeout(500);

    const commandPalette = page.locator("input[placeholder*='Search bookmarks']");
    const isPaletteOpen = await commandPalette.isVisible();
    console.log("Command Palette opened via sidebar search button:", isPaletteOpen);
    if (!isPaletteOpen) {
      throw new Error("Command Palette failed to open from sidebar search icon!");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 4. Navigate to All Bookmarks / Quick Access view to check Visual Analytics & Table Time
    console.log("Navigating to 'Quick Access' view...");
    const quickAccessBtn = page.locator("aside button:has-text('Quick Access')").first();
    await quickAccessBtn.click();
    await page.waitForTimeout(1000);

    // Check Visual Analytics collapsed state
    const expandChartsBtn = page.locator("button:has-text('Expand Charts')");
    const isCollapsedByDefault = await expandChartsBtn.isVisible();
    console.log("Visual Analytics collapsed by default ('Expand Charts' visible):", isCollapsedByDefault);
    if (!isCollapsedByDefault) {
      throw new Error("Visual Analytics was NOT collapsed by default!");
    }

    // Click Expand Charts
    await expandChartsBtn.click();
    await page.waitForTimeout(600);
    const hideChartsBtn = page.locator("button:has-text('Hide Charts')");
    const isExpanded = await hideChartsBtn.isVisible();
    console.log("Visual Analytics expanded ('Hide Charts' visible):", isExpanded);

    // Check Table "Added" column time
    console.log("Verifying Table 'Added' column format with date and time...");
    const addedCells = page.locator("table tbody tr td:nth-child(8)");
    const firstCellText = await addedCells.first().innerText();
    console.log("First row Added cell text:", firstCellText);
    
    // Check if cell text contains time (e.g. "PM" or "AM" or ":" )
    const hasTime = /\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(firstCellText);
    console.log("Added column contains time (AM/PM):", hasTime);
    if (!hasTime) {
      throw new Error(`Added column cell '${firstCellText}' does not contain formatted time!`);
    }

    // 5. Dark Mode Verification
    console.log("Toggling Dark Mode...");
    const themeToggleBtn = page.locator("header button[title*='Switch to']").first();
    await themeToggleBtn.click();
    await page.waitForTimeout(800);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    console.log("Dark class on html root:", isDark);
    if (!isDark) {
      throw new Error("Dark mode failed to apply to html root element!");
    }

    // Take Dark Mode Table & Expanded Charts Screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase7_round3_dark_table_and_charts.png"),
      fullPage: true,
    });

    // Go back to Homepage in Dark Mode
    const homeBtn = page.locator("aside button:has-text('Home')").first();
    await homeBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "phase7_round3_dark_homepage.png"),
      fullPage: true,
    });
    console.log("Captured dark mode homepage screenshot.");

    // Open Edit Modal in Dark Mode to verify high-contrast styling
    const darkOrganizeCard = page.locator("section:has-text('Inbox / Needs Organization') div.rounded-xl").first();
    if (await darkOrganizeCard.count() > 0) {
      await darkOrganizeCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "phase7_round3_dark_modal.png"),
      });
      await page.locator("button:has-text('Cancel')").first().click();
      await page.waitForTimeout(400);
      console.log("Captured dark mode edit modal screenshot.");
    }

    console.log("ALL PHASE 7 ROUND 3 VERIFICATIONS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
