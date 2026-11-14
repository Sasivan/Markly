import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/audit_screenshots";
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runAudit() {
  console.log("🚀 Starting Playwright Browser Audit on http://localhost:3000...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === "error") {
      consoleErrors.push(text);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(`[PAGE_ERROR] ${err.message}`);
  });

  // 1. Initial Load at 1440px
  console.log("📸 Step 1: Navigating to 1440px Home view...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_1440_home.png"), fullPage: false });

  // 2. Light / Dark Mode Toggle
  console.log("📸 Step 2: Testing Dark Mode Toggle...");
  const themeBtn = page.locator("button[aria-label*='theme' i], button:has(svg.lucide-moon), button:has(svg.lucide-sun)").first();
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_dark_mode.png") });
    await themeBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Auth Modal & Username Validation
  console.log("📸 Step 3: Testing Auth Modal & Reserved Username Validation...");
  const signInBtn = page.locator("button:has-text('Sign In'), button:has-text('Login')").first();
  if (await signInBtn.isVisible()) {
    await signInBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_auth_modal_login.png") });

    // Switch to Sign Up tab
    const signUpTab = page.locator("button:has-text('Sign Up'), button:has-text('Create Account')").first();
    if (await signUpTab.isVisible()) {
      await signUpTab.click();
      await page.waitForTimeout(300);

      // Type reserved username "admin"
      const usernameInput = page.locator("input[placeholder*='username' i], input[name='username']").first();
      if (await usernameInput.isVisible()) {
        await usernameInput.fill("admin");
        await page.waitForTimeout(700); // debounce check
        await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_auth_reserved_username.png") });
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // 4. View Switcher & Table
  console.log("📸 Step 4: Testing Table & View Switcher...");
  const allBookmarksNav = page.locator("span:has-text('All Bookmarks'), button:has-text('All Bookmarks')").first();
  if (await allBookmarksNav.isVisible()) {
    await allBookmarksNav.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_table_all_bookmarks.png") });

  // Cards View
  const cardsViewBtn = page.locator("button[title*='Card' i], button:has(svg.lucide-layout-grid)").first();
  if (await cardsViewBtn.isVisible()) {
    await cardsViewBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_cards_view.png") });
  }

  // Compact View
  const compactViewBtn = page.locator("button[title*='Compact' i], button:has(svg.lucide-list)").first();
  if (await compactViewBtn.isVisible()) {
    await compactViewBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_compact_view.png") });
  }

  // Back to Table View
  const tableViewBtn = page.locator("button[title*='Table' i], button:has(svg.lucide-table)").first();
  if (await tableViewBtn.isVisible()) {
    await tableViewBtn.click();
    await page.waitForTimeout(300);
  }

  // 5. Visual Analytics Dashboard & Charts
  console.log("📸 Step 5: Testing Visual Dashboard...");
  const analyticsNav = page.locator("span:has-text('Visual Analytics'), button:has-text('Visual Analytics'), span:has-text('Dashboard')").first();
  if (await analyticsNav.isVisible()) {
    await analyticsNav.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_visual_dashboard.png") });
  }

  // 6. Knowledge Graph
  console.log("📸 Step 6: Testing Knowledge Graph...");
  const graphNav = page.locator("span:has-text('Graph View'), span:has-text('Knowledge Graph'), button:has-text('Knowledge Graph')").first();
  if (await graphNav.isVisible()) {
    await graphNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_knowledge_graph.png") });
  }

  // 7. Command Palette (Cmd+K)
  console.log("📸 Step 7: Testing Command Palette (Cmd/Ctrl+K)...");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_command_palette.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 8. Add Bookmark Modal ('n')
  console.log("📸 Step 8: Testing Add Bookmark Modal ('n')...");
  await page.keyboard.press("n");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_add_bookmark_modal.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 9. Responsive Viewports: 768px (Tablet) & 375px (Mobile)
  console.log("📸 Step 9: Testing Responsive Viewports (768px and 375px)...");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_768_tablet.png") });

  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_375_mobile.png") });

  await browser.close();

  console.log("\n=== AUDIT RUN COMPLETED ===");
  console.log("Total Console Logs:", consoleLogs.length);
  console.log("Total Console Errors:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log("Console Errors Detected:");
    consoleErrors.forEach((e) => console.log(" - ", e));
  } else {
    console.log("Zero console errors during browser navigation!");
  }

  const screenshots = fs.readdirSync(ARTIFACT_DIR);
  console.log(`Saved ${screenshots.length} screenshots to ${ARTIFACT_DIR}`);
}

runAudit().catch((err) => {
  console.error("Audit run error:", err);
  process.exit(1);
});
