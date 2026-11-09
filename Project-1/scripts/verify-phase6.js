const { chromium } = require('@playwright/test');

async function verifyPhase6() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click on "Import & Export" header button to display modal
  const importExportBtn = page.locator('button:has-text("Import & Export")');
  if (await importExportBtn.isVisible()) {
    await importExportBtn.click();
    await page.waitForTimeout(600);
  }

  const screenshotPath = 'C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase6_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log('Phase 6 screenshot captured successfully at:', screenshotPath);
}

verifyPhase6().catch((err) => {
  console.error('Phase 6 verification failed:', err);
  process.exit(1);
});

