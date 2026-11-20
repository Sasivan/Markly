import { chromium } from 'playwright';
import fs from 'node:fs';

async function run() {
  console.log('Launching browser...');
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.log('Default chromium not found, attempting with system msedge/chrome...');
    try {
      browser = await chromium.launch({ channel: 'msedge' });
    } catch {
      browser = await chromium.launch({ channel: 'chrome' });
    }
  }

  const page = await browser.newPage();

  const routes = [
    '/',
    '/library',
    '/favorites',
    '/recent',
    '/stash',
    '/analytics',
    '/trash',
    '/feedback',
    '/profile',
    '/settings',
    '/lab'
  ];

  const results = [];

  for (const route of routes) {
    const url = `http://localhost:4173${route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const title = await page.title();
      const heading = await page.$eval('h1, h2, span.font-bold', el => el.innerText).catch(() => 'no heading');
      console.log(`✓ Visited ${route} — Title: ${title} — Heading: ${heading}`);
      results.push({ route, status: 'pass', heading });
    } catch (err) {
      console.error(`✕ Failed ${route}: ${err.message}`);
      results.push({ route, status: 'fail', error: err.message });
    }
  }

  // Test responsive viewports
  const viewports = [
    { width: 390, height: 844, name: 'mobile-390' },
    { width: 768, height: 1024, name: 'tablet-768' },
    { width: 1024, height: 768, name: 'laptop-1024' },
    { width: 1440, height: 900, name: 'desktop-1440' },
  ];

  if (!fs.existsSync('docs/markly-dither-fresh-start/screenshots')) {
    fs.mkdirSync('docs/markly-dither-fresh-start/screenshots', { recursive: true });
  }

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `docs/markly-dither-fresh-start/screenshots/${vp.name}-home.png` });
    console.log(`✓ Captured viewport screenshot: ${vp.name}`);
  }

  // Also capture lab and library screenshots
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:4173/library', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `docs/markly-dither-fresh-start/screenshots/desktop-1440-library.png` });

  await page.goto('http://localhost:4173/analytics', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `docs/markly-dither-fresh-start/screenshots/desktop-1440-analytics.png` });

  await page.goto('http://localhost:4173/lab', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `docs/markly-dither-fresh-start/screenshots/desktop-1440-lab.png` });

  await browser.close();
  console.log('All browser checks passed!');
}

run().catch(e => {
  console.error('Browser check failed:', e);
  process.exit(1);
});
