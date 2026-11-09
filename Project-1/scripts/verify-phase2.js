const { chromium } = require('@playwright/test');

async function verifyPhase2() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click 'Add Bookmark' button to open dialog
  await page.locator('button:has-text("Add Bookmark")').first().click();
  await page.waitForTimeout(600);

  // Fill in duplicate URL to trigger duplicate detection prompt
  await page.locator('input[placeholder*="https://example.com"]').fill('https://react.dev');
  await page.locator('button:has-text("Save")').last().click();
  await page.waitForTimeout(1200);

  // Capture screenshot of dialog with duplicate detection
  const screenshotPath = 'C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase2_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log('Phase 2 screenshot captured successfully at:', screenshotPath);
}

verifyPhase2().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

