const { chromium } = require('@playwright/test');

async function verifyPhase4() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Select the first two row checkboxes to trigger the BulkActionBar
  const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
  const count = await checkboxes.count();
  if (count > 0) {
    await checkboxes.nth(0).click();
  }
  if (count > 1) {
    await checkboxes.nth(1).click();
  }
  await page.waitForTimeout(500);

  // Focus and type in search filter to demonstrate real-time table filtering
  const searchInput = page.locator('input[placeholder*="Search title, URL"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('next');
    await page.waitForTimeout(600);
  }

  const screenshotPath = 'C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase4_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log('Phase 4 screenshot captured successfully at:', screenshotPath);
}

verifyPhase4().catch((err) => {
  console.error('Phase 4 verification failed:', err);
  process.exit(1);
});

