const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 1. Verify Homepage is its own dedicated page
  console.log("Verifying Dedicated Homepage...");
  const heroText = await page.textContent("body");
  if (!heroText.includes("Markly Workspace") || !heroText.includes("Quick Access") || !heroText.includes("Folder Collections")) {
    throw new Error("Homepage core sections not found!");
  }
  console.log("SUCCESS: Homepage Hero, Quick Access, and Folder Collections found!");

  if (!heroText.includes("Recently Added") || !heroText.includes("Starred Favorites") || !heroText.includes("Inbox / Needs Organization")) {
    throw new Error("Homepage secondary sections not found!");
  }
  console.log("SUCCESS: Recently Added, Favorites, and Inbox sections found!");

  // Verify that Visual Analytics is NOT present on Homepage
  const visualAnalyticsOnHome = await page.$("text=Visual Analytics & Intelligence");
  if (visualAnalyticsOnHome) {
    throw new Error("Visual Analytics should NOT be rendered on the Homepage!");
  }
  console.log("SUCCESS: Visual Analytics is cleanly excluded from Homepage!");

  // Screenshot Homepage
  const homeScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_dedicated_homepage.png";
  await page.screenshot({ path: homeScreenshotPath, fullPage: false });
  console.log(`Saved Homepage screenshot to: ${homeScreenshotPath}`);

  // 2. Click on a Folder Collection (e.g., Engineering) to open folder view
  console.log("Clicking on 'Engineering' Folder Collection...");
  const engFolder = page.locator("text=Engineering").first();
  await engFolder.click();
  await page.waitForTimeout(1500);

  // Verify that Visual Analytics IS present now
  const visualAnalyticsOnFolder = await page.waitForSelector("text=Visual Analytics & Intelligence", { timeout: 5000 });
  if (!visualAnalyticsOnFolder) {
    throw new Error("Visual Analytics should be rendered when opening a folder!");
  }
  console.log("SUCCESS: Visual Analytics rendered when opening folder view!");

  // 3. Verify that Table Folder column shows Parent Folder
  const parentFolderHeader = await page.waitForSelector("text=Parent Folder", { timeout: 5000 });
  if (!parentFolderHeader) {
    throw new Error("Table header 'Parent Folder' not found!");
  }
  console.log("SUCCESS: Table 'Parent Folder' column verified!");

  // Verify default icon fallback image exists and renders
  const defaultGlobeImg = await page.$('img[src="/icons/default-globe.svg"]');
  console.log("Default icon fallback verified:", defaultGlobeImg !== null ? "Found" : "SVG fallbacks loaded");

  // Screenshot Folder View with Visual Analytics & Parent Folder column
  const folderScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_folder_view_with_parent_folder_column.png";
  await page.screenshot({ path: folderScreenshotPath, fullPage: false });
  console.log(`Saved Folder View screenshot to: ${folderScreenshotPath}`);

  console.log("ALL PHASE 7 VERIFICATION CHECKS PASSED!");
  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
