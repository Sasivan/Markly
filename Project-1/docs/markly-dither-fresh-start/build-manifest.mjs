import fs from 'node:fs';

const crawled = JSON.parse(fs.readFileSync('markly-dither-fresh-start/crawled-nav-items.json', 'utf8'));

const targetCategoryCounts = {
  Overview: 1,
  Primitives: 19,
  Typography: 25,
  Handbook: 7,
  Examples: 32,
  Components: 103,
  Backgrounds: 49,
  Text: 24,
  Animations: 50,
  Utils: 2
};

const liveCategoryCounts = crawled.counts;

const countDiscrepancies = [];
for (const [cat, target] of Object.entries(targetCategoryCounts)) {
  const live = liveCategoryCounts[cat] || 0;
  if (target !== live) {
    countDiscrepancies.push({
      category: cat,
      targetCount: target,
      liveCount: live,
      diff: live - target
    });
  }
}

const items = crawled.allItems.map((item, index) => {
  // Determine suggested markly adoption status
  let status = 'lab-preview';
  let marklyLocation = '/lab';
  
  if (item.category === 'Overview') {
    status = 'handbook-reference';
    marklyLocation = '/lab?cat=Overview';
  } else if (item.category === 'Handbook') {
    status = 'handbook-reference';
    marklyLocation = '/lab?cat=Handbook';
  } else if (item.category === 'Examples') {
    if (['app-shell', 'file-tree', 'activity-feed', 'notification-center'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = item.id === 'file-tree' ? '/library, /folders/:id' : '/';
    } else {
      status = 'example-gallery';
      marklyLocation = `/lab?cat=Examples&item=${item.id}`;
    }
  } else if (item.category === 'Components') {
    if (['button', 'input', 'dialog', 'sidebar', 'chart', 'field', 'command', 'context-menu', 'popover', 'tooltip', 'badge', 'separator'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = 'Global Shell, Library, Analytics';
    } else {
      status = 'lab-preview';
      marklyLocation = `/lab?cat=Components&item=${item.id}`;
    }
  } else if (item.category === 'Primitives') {
    if (['box', 'text', 'divider', 'icon', 'focus-ring', 'pressable'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = 'Everywhere';
    } else {
      status = 'lab-preview';
      marklyLocation = `/lab?cat=Primitives&item=${item.id}`;
    }
  } else if (item.category === 'Backgrounds') {
    if (['dither', 'grainient', 'dot-grid'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = 'Home hero, Analytics backdrop';
    } else {
      status = 'lab-preview';
      marklyLocation = `/lab?cat=Backgrounds&item=${item.id}`;
    }
  } else if (item.category === 'Text') {
    if (['gradient-text', 'decrypted-text', 'count-up'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = 'Home hero, Analytics';
    } else {
      status = 'lab-preview';
      marklyLocation = `/lab?cat=Text&item=${item.id}`;
    }
  } else if (item.category === 'Animations') {
    if (['dither-reveal', 'dither-transition'].includes(item.id)) {
      status = 'core-product';
      marklyLocation = 'Transitions';
    } else {
      status = 'lab-preview';
      marklyLocation = `/lab?cat=Animations&item=${item.id}`;
    }
  } else if (item.category === 'Utils') {
    status = 'core-product';
    marklyLocation = 'Theme engine & /lab';
  }

  return {
    index: index + 1,
    id: item.id,
    name: item.label,
    title: item.title,
    category: item.category,
    subcategory: item.subcategory,
    docsUrl: `https://dither-ui.com/docs/${item.id}`,
    sourceUrl: `https://github.com/drvova/dither-ui/blob/master/packages/site/src/pages/docs/${item.file}`,
    frameworkVariant: 'solid (live master) / vue 3.5 (git ref ac2a46684)',
    status,
    marklyLocation,
    implementationFile: null,
    previewRoute: `/lab/${item.category.toLowerCase()}/${item.id}`,
    interactiveChecks: ['render', 'props-inspect', 'keyboard-accessible'],
    license: 'MIT',
    notes: `Nav file: ${item.file}`
  };
});

const manifest = {
  product: 'Markly',
  visualSource: 'Dither UI',
  sources: [
    'https://dither-ui.com/',
    'https://dither-ui.com/docs/',
    'https://github.com/drvova/dither-ui'
  ],
  frameworkVerification: {
    selectedVariant: null,
    quickStartUrl: 'https://dither-ui.com/docs/getting-started/',
    sourcePathVerified: false,
    buildProofPassed: false,
    blockerReason: 'Official Vue 3 kit was removed in PR #41 (2026-11-13). Current master and live site are SolidJS only.',
    historicalVueSha: 'ac2a46684f8e3e90fe00c79693b6237a584be00a'
  },
  targetCategoryCounts,
  liveCategoryCounts,
  countDiscrepancies,
  coverage: {
    catalogueItems: items.length,
    livePreviews: items.filter(i => i.status === 'lab-preview' || i.status === 'example-gallery').length,
    coreProductUses: items.filter(i => i.status === 'core-product').length,
    handbookReferences: items.filter(i => i.status === 'handbook-reference').length,
    notApplicable: 0
  },
  items,
  rules: [
    'Every live Dither catalogue item needs a real preview in Dither Lab or a justified status.',
    'Do not invent entries to force target counts.',
    'Keep irrelevant examples in isolated Dither Lab previews, not core Markly workflows.'
  ]
};

// Write to markly-dither-fresh-start/catalogue-manifest.json
fs.writeFileSync('markly-dither-fresh-start/catalogue-manifest.json', JSON.stringify(manifest, null, 2));

// Ensure docs/markly-dither-fresh-start exists and write there too
if (!fs.existsSync('docs/markly-dither-fresh-start')) {
  fs.mkdirSync('docs/markly-dither-fresh-start', { recursive: true });
}
fs.writeFileSync('docs/markly-dither-fresh-start/catalogue-manifest.json', JSON.stringify(manifest, null, 2));

console.log('Manifest generated successfully! Total items:', items.length);
console.log('Discrepancies:', countDiscrepancies);
