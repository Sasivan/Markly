const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Verify folder isolation by clicking 'Frontend' folder in sidebar
  console.log("Locating and clicking 'Frontend' folder...");
  const frontendText = page.locator("text=Frontend").first();
  await frontendText.waitFor({ state: "visible" });
  await frontendText.click();
  await page.waitForTimeout(1000);

  // Check breadcrumbs show 'This Folder Only'
  const toggleBtn = page.locator("text=This Folder Only");
  await toggleBtn.waitFor({ state: "visible", timeout: 5000 });
  console.log("SUCCESS: 'This Folder Only' button is active and visible!");

  // Save isolated view screenshot
  const isolatedScreenshotPath = path.resolve(
    "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_folder_isolation.png"
  );
  await page.screenshot({ path: isolatedScreenshotPath });
  console.log("Saved isolated folder screenshot to:", isolatedScreenshotPath);

  // 2. Test solid context menu and Iconoir icon picker
  console.log("Right-clicking folder for context menu...");
  await frontendText.click({ button: "right" });
  await page.waitForTimeout(400);

  const customizeOption = page.locator("text=Change Icon & Color");
  await customizeOption.waitFor({ state: "visible" });
  console.log("Opening Customize Folder modal with Iconoir picker...");
  await customizeOption.click();
  await page.waitForTimeout(600);

  // Search in Iconoir 1,671 icons
  const searchInput = page.locator("input[placeholder*='Search 1,670+ icons']");
  await searchInput.waitFor({ state: "visible" });
  console.log("Typing 'folder' into Iconoir search...");
  await searchInput.fill("folder");
  await page.waitForTimeout(500);

  // Save full Phase 7 verification screenshot
  const finalScreenshotPath = path.resolve(
    "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_verification.png"
  );
  await page.screenshot({ path: finalScreenshotPath });
  console.log("Saved final Phase 7 verification screenshot to:", finalScreenshotPath);

  await browser.close();
  console.log("All Phase 7 checks completed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
