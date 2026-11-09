const { chromium } = require('@playwright/test');

async function verifyPhase5() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click on "Domains & Tags" tab to verify the Donut and Bar chart rendering
  const domainsTab = page.locator('button:has-text("Domains & Tags")');
  if (await domainsTab.isVisible()) {
    await domainsTab.click();
    await page.waitForTimeout(800);
  }

  const screenshotPath = 'C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase5_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log('Phase 5 screenshot captured successfully at:', screenshotPath);
}

verifyPhase5().catch((err) => {
  console.error('Phase 5 verification failed:', err);
  process.exit(1);
});

