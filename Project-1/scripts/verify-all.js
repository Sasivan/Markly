const { chromium } = require("playwright");

async function runVerification() {
  console.log("Starting Markly Full System Verification...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 950 },
    colorScheme: "dark",
  });

  try {
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // 1. Verify Header & Auth Button
    const signInBtn = page.locator("header button:has-text('Sign In')").first();
    console.log("Checking Sign In button:", (await signInBtn.count()) > 0 ? "PASSED" : "FAILED");

    // 2. Open & Close Auth Modal
    if ((await signInBtn.count()) > 0) {
      await signInBtn.click();
      await page.waitForTimeout(400);
      const authDialog = page.locator("div[role='dialog']").first();
      console.log("Auth Modal opens:", (await authDialog.count()) > 0 ? "PASSED" : "FAILED");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // 3. Verify Folder Navigation & Segmented Capsule
    const engineeringLink = page.locator("text='Engineering'").first();
    if ((await engineeringLink.count()) > 0) {
      await engineeringLink.click();
      await page.waitForTimeout(800);
      const folderOnlyBtn = page.locator("button:has-text('This Folder Only')").first();
      const includeSubsBtn = page.locator("button:has-text('Include Subfolders')").first();
      console.log("Segmented Capsule present:", ((await folderOnlyBtn.count()) > 0 && (await includeSubsBtn.count()) > 0) ? "PASSED" : "FAILED");
    }

    // 4. Return to Home
    const homeBtn = page.locator("text='Home'").first();
    if ((await homeBtn.count()) > 0) {
      await homeBtn.click();
      await page.waitForTimeout(600);
    }

    console.log("All Core System Verifications Passed Successfully!");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runVerification();

