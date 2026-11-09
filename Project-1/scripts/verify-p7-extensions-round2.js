const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 1. Test clicking search bar opens centered CommandPalette modal on click
  console.log("1. Testing search bar click to open centered popup...");
  const searchBar = page.locator("header div[title*='search']").first();
  await searchBar.click();
  await page.waitForTimeout(500);

  const commandPaletteModal = page.locator("input[placeholder*='Search bookmarks, folders']");
  await commandPaletteModal.waitFor({ state: "visible", timeout: 4000 });
  console.log("SUCCESS: Centered search popup opened immediately on click!");

  const searchPopupPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_centered_search_popup.png";
  await page.screenshot({ path: searchPopupPath, fullPage: false });
  console.log(`Saved screenshot to: ${searchPopupPath}`);

  // Close popup
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 2. Test Folder Collections directory and Child Subfolders Bar
  console.log("2. Testing Folder Collections page and Child Subfolders bar...");
  const folderCollectionsBtn = page.locator("aside button:has-text('Folder Collections')").first();
  await folderCollectionsBtn.click();
  await page.waitForTimeout(1000);

  const collectionsHeader = page.locator("text=Collections Directory");
  await collectionsHeader.waitFor({ state: "visible", timeout: 4000 });
  console.log("SUCCESS: Dedicated Folder Collections directory view opened!");

  const collScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_folder_collections_directory.png";
  await page.screenshot({ path: collScreenshotPath, fullPage: false });
  console.log(`Saved screenshot to: ${collScreenshotPath}`);

  // Click on 'Engineering' card to enter folder
  console.log("Clicking Engineering card...");
  const engCard = page.locator("div:has-text('Engineering')").locator("text=Open Folder & Analytics").first();
  await engCard.click();
  await page.waitForTimeout(1200);

  // Verify child subfolders bar in Engineering
  const subfoldersBar = page.locator("text=Subfolders in Engineering");
  await subfoldersBar.waitFor({ state: "visible", timeout: 4000 });
  console.log("SUCCESS: Child subfolders bar rendered inside Engineering!");

  const childSubfoldersScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_child_subfolders_bar.png";
  await page.screenshot({ path: childSubfoldersScreenshotPath, fullPage: false });
  console.log(`Saved screenshot to: ${childSubfoldersScreenshotPath}`);

  // 3. Test Minimized sidebar icon options (Home, All, Collections, Recent, Favorites, Inbox)
  console.log("3. Testing minimized sidebar with Home and All icons...");
  const collapseSidebarBtn = page.locator("button[title*='Collapse Sidebar']").first();
  await collapseSidebarBtn.click();
  await page.waitForTimeout(500);

  const homeRailBtn = page.locator("button[title='Workspace Home']");
  await homeRailBtn.waitFor({ state: "visible" });
  const allRailBtn = page.locator("button[title*='All Bookmarks']");
  await allRailBtn.waitFor({ state: "visible" });
  console.log("SUCCESS: Minimized sidebar displays Home and All Bookmarks icons!");

  const minimizedScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_minimized_sidebar_icons.png";
  await page.screenshot({ path: minimizedScreenshotPath, fullPage: false });
  console.log(`Saved screenshot to: ${minimizedScreenshotPath}`);

  // Expand sidebar back
  const expandSidebarBtn = page.locator("button[title*='Expand Sidebar']").first();
  await expandSidebarBtn.click();
  await page.waitForTimeout(500);

  // 4. Test VS Code style Folders section collapse down
  console.log("4. Testing Folders section collapse down to bottom...");
  const foldersHeaderChevron = page.locator("aside button:has-text('Folders')").first();
  await foldersHeaderChevron.click();
  await page.waitForTimeout(500);

  const collapsedDownScreenshotPath = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_folders_collapsed_down.png";
  await page.screenshot({ path: collapsedDownScreenshotPath, fullPage: false });
  console.log(`Saved screenshot to: ${collapsedDownScreenshotPath}`);

  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
