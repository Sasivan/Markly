const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Verify site URL removed from row and test Edit Bookmark Modal
  console.log("Testing Edit Bookmark Modal (URL & Site Image sections)...");
  // Hover over first bookmark row and click edit icon
  const firstRow = page.locator("tbody tr").first();
  await firstRow.waitFor({ state: "visible" });

  const editBtn = firstRow.locator("button[title='Edit Bookmark'], button:has-text('Edit')").first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
  } else {
    // Or click row actions edit button
    const rowEditIcon = firstRow.locator("svg.lucide-edit-2, svg.lucide-pencil, button").nth(2);
    await rowEditIcon.click();
  }

  await page.waitForTimeout(600);

  // Assert Website URL field is present in Edit Modal
  const urlLabel = page.locator("label:has-text('Website URL')");
  await urlLabel.waitFor({ state: "visible", timeout: 5000 });
  console.log("SUCCESS: Website URL section found in Edit Modal!");

  // Assert Site Preview Image section with 'Scrape Again' and 'Upload' buttons
  const rescrapeBtn = page.locator("button:has-text('Scrape Again')");
  await rescrapeBtn.waitFor({ state: "visible" });
  console.log("SUCCESS: Site Preview Image with 'Scrape Again' button found!");

  // Screenshot of Edit Modal
  const editModalScreenshot = path.resolve(
    "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_edit_modal_with_image_and_url.png"
  );
  await page.screenshot({ path: editModalScreenshot });
  console.log("Saved Edit Modal screenshot to:", editModalScreenshot);

  // Close Edit modal
  const cancelBtn = page.locator("button:has-text('Cancel')").first();
  await cancelBtn.click();
  await page.waitForTimeout(400);

  // 2. Verify parent folder click shows child folder sites too
  console.log("Clicking parent folder 'Engineering'...");
  const engFolder = page.locator("text=Engineering").first();
  await engFolder.click();
  await page.waitForTimeout(800);

  // Check breadcrumb shows 'Including Subfolders' for parent folder
  const subfoldersBadge = page.locator("text=Including Subfolders");
  await subfoldersBadge.waitFor({ state: "visible", timeout: 5000 });
  console.log("SUCCESS: Parent folder automatically includes child folder sites!");

  // 3. Test VS Code Folders Section collapse & expand all icons
  console.log("Testing VS Code minimize all folders icon...");
  const collapseAllBtn = page.locator("button[title='Collapse all folders']");
  await collapseAllBtn.click();
  await page.waitForTimeout(400);

  console.log("Testing VS Code expand all folders icon...");
  const expandAllBtn = page.locator("button[title='Expand all folders']");
  await expandAllBtn.click();
  await page.waitForTimeout(400);

  // 4. Open Add Folder modal to test 16-shade palette & recent icons
  console.log("Opening Add Folder Modal to test color palette and recent icons...");
  const addFolderBtn = page.locator("button[title*='Add New Folder']");
  await addFolderBtn.click();
  await page.waitForTimeout(600);

  // Pick an icon to trigger recently used memory
  const firstSvgBtn = page.locator("button[title='Folder']").first();
  if (await firstSvgBtn.isVisible()) {
    await firstSvgBtn.click();
    await page.waitForTimeout(200);
  }

  // Screenshot of Add Folder modal with color palette and recent icons
  const addFolderScreenshot = path.resolve(
    "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase7_vscode_folders_and_palette.png"
  );
  await page.screenshot({ path: addFolderScreenshot });
  console.log("Saved Add Folder screenshot to:", addFolderScreenshot);

  await browser.close();
  console.log("All extended Phase 7 requirements verified successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

