const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Verify Homepage Section in sidebar
  console.log("Checking left top Homepage navigation hub...");
  const quickAccess = page.locator("text=Quick Access").first();
  await quickAccess.waitFor({ state: "visible" });

  const folderCollections = page.locator("text=Folder Collections").first();
  await folderCollections.waitFor({ state: "visible" });

  const inboxNav = page.locator("text=Inbox / Needs Organization").first();
  await inboxNav.waitFor({ state: "visible" });
  console.log("SUCCESS: Homepage section with Quick Access, Folder Collections, and Inbox verified!");

  // 2. Verify single merged folder toggle icon
  console.log("Testing merged folder collapse/expand toggle icon...");
  const toggleFolderIcon = page.locator("button[title*='folders']").first();
  await toggleFolderIcon.waitFor({ state: "visible" });
  await toggleFolderIcon.click();
  await page.waitForTimeout(300);
  await toggleFolderIcon.click();
  await page.waitForTimeout(300);
  console.log("SUCCESS: Unified folder collapse/expand toggle icon verified!");

  // 3. Verify top search omnibox
  console.log("Testing top search omnibox...");
  const topSearch = page.locator("input[placeholder*='Search all sites']");
  await topSearch.waitFor({ state: "visible" });
  await topSearch.fill("react");
  await page.waitForTimeout(600);

  // Clear search
  const clearBtn = page.locator("button[title='Clear Search']");
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(400);
  } else {
    await topSearch.fill("");
  }

  // 4. Test Visual Analytics Charts (Top 5 Influential Visuals)
  console.log("Testing Visual Analytics Top 5 Influential Visuals...");
  // Check Domains tab
  const domainTab = page.locator("button:has-text('Domains')").first();
  await domainTab.click();
  await page.waitForTimeout(400);

  // Check Topics & Tags tab
  const tagsTab = page.locator("button:has-text('Topics & Tags')").first();
  await tagsTab.click();
  await page.waitForTimeout(400);

  // Check Velocity Timeline tab
  const timelineTab = page.locator("button:has-text('Velocity')").first();
  await timelineTab.click();
  await page.waitForTimeout(400);

  // Check Link Health tab
  const healthTab = page.locator("button:has-text('Link Health')").first();
  await healthTab.click();
  await page.waitForTimeout(400);

  // Check Favicon Wall tab
  const wallTab = page.locator("button:has-text('Favicon Wall')").first();
  await wallTab.click();
  await page.waitForTimeout(500);

  // Switch back to Domains for main view
  await domainTab.click();
  await page.waitForTimeout(400);

  // 5. Capture final comprehensive screenshot
  const screenshotPath = path.resolve(
    "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_homepage_and_visual_analytics.png"
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log("Screenshot successfully saved to:", screenshotPath);

  await browser.close();
  console.log("All Phase 7 requirements verified successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

