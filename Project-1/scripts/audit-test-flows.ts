import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/audit_screenshots";

async function testFlows() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 1. Open Auth Modal via "Create Free Account" button
  console.log("1. Testing Auth Modal Sign Up with reserved username 'admin'...");
  const createAccBtn = page.locator("button:has-text('Create Free Account')").first();
  if (await createAccBtn.isVisible()) {
    await createAccBtn.click();
    await page.waitForTimeout(600);

    // Screenshot open signup modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_auth_modal_signup.png") });

    // Fill in "admin" into username input
    const usernameInput = page.locator("input#signup-username, input[placeholder*='e.g. johndoe']").first();
    if (await usernameInput.isVisible()) {
      await usernameInput.fill("admin");
      await page.waitForTimeout(800); // debounce check
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_auth_reserved_username.png") });

      // Check for error text
      const errorMsg = await page.locator("text=reserved, text=already taken").first().textContent().catch(() => null);
      console.log("Reserved username validation response:", errorMsg);
    }

    // Switch to Sign In tab
    const signInTab = page.locator("button:has-text('Sign In')").first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_auth_modal_login.png") });
    }

    // Close modal
    const closeBtn = page.locator("button[aria-label*='close' i], button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(400);
  }

  // 2. Open Add Bookmark Modal via "+ Add Bookmark" button
  console.log("2. Testing Add Bookmark Modal ('+ Add Bookmark')...");
  const addBookmarkBtn = page.locator("button:has-text('Add Bookmark')").first();
  if (await addBookmarkBtn.isVisible()) {
    await addBookmarkBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_add_bookmark_modal.png") });

    // Test duplicate detection
    const urlInput = page.locator("input[placeholder*='https://']").first();
    if (await urlInput.isVisible()) {
      await urlInput.fill("https://nextjs.org");
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_add_bookmark_duplicate_check.png") });
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // 3. Switch to All Sites (TanStack Table)
  console.log("3. Switching to All Sites view...");
  const allSitesNav = page.locator("span:text-is('All Sites')").first();
  if (await allSitesNav.isVisible()) {
    await allSitesNav.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_table_all_sites.png") });

    // Check table rows count
    const rows = await page.locator("table tbody tr").count();
    console.log("Table rendered rows:", rows);
  }

  // 4. Test Knowledge Graph View
  console.log("4. Testing Knowledge Graph View...");
  const graphNav = page.locator("span:text-is('Knowledge Graph')").first();
  if (await graphNav.isVisible()) {
    await graphNav.click();
    await page.waitForTimeout(1500); // allow graph force layout to simulate
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_knowledge_graph_view.png") });
  }

  // 5. Test Folder Collections View & Deep 5-level nesting
  console.log("5. Testing Folder Collections View...");
  const collectionsNav = page.locator("span:text-is('Folder Collections')").first();
  if (await collectionsNav.isVisible()) {
    await collectionsNav.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_folder_collections_view.png") });
  }

  // 6. Test Command Palette (⌘K)
  console.log("6. Testing Command Palette (Cmd/Ctrl+K)...");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_command_palette_modal.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 7. Test Import/Export Modal
  console.log("7. Testing Import/Export Modal...");
  const importExportBtn = page.locator("button[title*='Import & Export']").first();
  if (await importExportBtn.isVisible()) {
    await importExportBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit_import_export_modal.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  await browser.close();
  console.log("Flows audit finished successfully!");
}

testFlows().catch((e) => {
  console.error("Error in flows:", e);
  process.exit(1);
});

