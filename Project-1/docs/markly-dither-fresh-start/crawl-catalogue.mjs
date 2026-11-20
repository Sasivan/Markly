import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

async function run() {
  const base = 'https://raw.githubusercontent.com/drvova/dither-ui/master/packages/site/src/pages/docs/';
  const navFiles = [
    { cat: 'Overview', file: 'overview/overview-nav.ts' },
    { cat: 'Primitives', file: 'primitives/primitives-nav.ts' },
    { cat: 'Typography', file: 'typography/typography-nav.ts' },
    { cat: 'Handbook', file: 'handbook/handbook-nav.ts' },
    { cat: 'Examples', file: 'examples/page-nav.ts', sub: 'Page' },
    { cat: 'Examples', file: 'examples/auth-nav.ts', sub: 'Auth' },
    { cat: 'Examples', file: 'examples/product-nav.ts', sub: 'Product' },
    { cat: 'Examples', file: 'examples/sidebar-nav.ts', sub: 'Sidebar' },
    { cat: 'Examples', file: 'examples/stats-nav.ts', sub: 'Stats' },
    { cat: 'Examples', file: 'examples/table-nav.ts', sub: 'Table' },
    { cat: 'Examples', file: 'examples/chat-nav.ts', sub: 'Chat' },
    { cat: 'Examples', file: 'examples/notifications-nav.ts', sub: 'Notifications' },
    { cat: 'Components', file: 'components/chart-nav.ts', sub: 'Charts' },
    { cat: 'Components', file: 'components/basics-nav.ts', sub: 'Basics' },
    { cat: 'Components', file: 'components/form-nav.ts', sub: 'Form' },
    { cat: 'Components', file: 'components/field-nav.ts', sub: 'Field' },
    { cat: 'Components', file: 'forms/forms-nav.ts', sub: 'Forms' },
    { cat: 'Components', file: 'components/selection-nav.ts', sub: 'Selection' },
    { cat: 'Components', file: 'components/feedback-nav.ts', sub: 'Feedback' },
    { cat: 'Components', file: 'components/structure-nav.ts', sub: 'Structure' },
    { cat: 'Components', file: 'components/layout-nav.ts', sub: 'Layout' },
    { cat: 'Components', file: 'components/media-nav.ts', sub: 'Media' },
    { cat: 'Components', file: 'components/overlay-nav.ts', sub: 'Overlay' },
    { cat: 'Components', file: 'components/surface-nav.ts', sub: 'Surface' },
    { cat: 'Components', file: 'components/navigation-nav.ts', sub: 'Navigation' },
    { cat: 'Backgrounds', file: 'backgrounds/backgrounds-nav.ts' },
    { cat: 'Text', file: 'text/text-nav.ts' },
    { cat: 'Animations', file: 'animations/animations-nav.ts' },
    { cat: 'Utils', file: 'utils/utils-nav.ts' }
  ];

  const counts = {};
  const allItems = [];

  for (const { cat, file, sub } of navFiles) {
    try {
      const content = await get(base + file);
      // Look for objects with id and label
      const regex = /\{\s*id:\s*["']([^"']+)["'],\s*label:\s*["']([^"']+)["'](?:,\s*title:\s*["']([^"']+)["'])?[^}]*\}/g;
      let m;
      let count = 0;
      while ((m = regex.exec(content)) !== null) {
        count++;
        allItems.push({
          category: cat,
          subcategory: sub || null,
          id: m[1],
          label: m[2],
          title: m[3] || m[2],
          file
        });
      }
      counts[cat] = (counts[cat] || 0) + count;
      console.log(`${cat} (${sub || file}): ${count} items`);
    } catch (e) {
      console.error(`Failed ${file}: ${e.message}`);
    }
  }

  console.log('\n=== TOTAL COUNTS BY CATEGORY ===');
  console.log(counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('TOTAL ITEMS:', total);

  // Write out the raw list
  fs.writeFileSync('markly-dither-fresh-start/crawled-nav-items.json', JSON.stringify({ counts, total, allItems }, null, 2));
}

run();
