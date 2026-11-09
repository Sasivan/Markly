const { chromium } = require('@playwright/test');

async function verifyPhase3() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click on a nested folder (e.g. "React & Next.js")
  const reactFolder = page.locator('span:text-is("React & Next.js")').first();
  await reactFolder.click();
  await page.waitForTimeout(600);

  // Trigger hover / context menu on one of the folders to show the Notion menu
  const folderRow = page.locator('div:has-text("React & Next.js")').last();
  await folderRow.hover();
  await page.waitForTimeout(300);

  // Click the more horizontal button (...) to open context menu
  const moreBtn = folderRow.locator('button:has(svg.lucide-more-horizontal)').first();
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(500);
  }

  const screenshotPath = 'C:/Users/Sasiv/.gemini/antigravity/brain/38f73005-2751-4406-bd3f-7358408ac2c9/phase3_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await browser.close();
  console.log('Phase 3 screenshot captured successfully at:', screenshotPath);
}

verifyPhase3().catch((err) => {
  console.error('Phase 3 verification failed:', err);
  process.exit(1);
});

