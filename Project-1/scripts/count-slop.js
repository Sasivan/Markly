const fs = require("fs");
const path = require("path");

const IGNORED = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "tests",
  ".agents",
  "folder-treemap",
  "activity-heatmap",
  "folder-sunburst",
  "network-graph",
  "domain-distribution",
];

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    if (IGNORED.some((ign) => full.includes(ign))) continue;
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = [...getFiles("components"), ...getFiles("app")];

const metrics = {
  emojis: { count: 0, files: {} },
  transitionAll: { count: 0, files: {} },
  uppercase: { count: 0, files: {} },
  arbitraryPx: { count: 0, files: {} },
  animations: { count: 0, files: {} },
  hoverScale: { count: 0, files: {} },
  gradientClasses: { count: 0, files: {} },
};

const reTransitionAll = /\btransition-all\b/g;
const reUppercase = /\buppercase\b/g;
const reArbitraryPx = /\[\d+(\.\d+)?px\]/g;
const reAnimations = /\banimate-(pulse|ping|bounce)\b/g;
const reHoverScale = /\bhover:scale(-\d+)?\b/g;
const reGradientClasses = /\b(bg-gradient-[a-z0-9-]+|from-[a-z0-9-]+|via-[a-z0-9-]+|to-[a-z0-9-]+)\b/g;
// Comprehensive emoji matcher: Pictographs, symbols, dingbats, flags, emoticons
const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");

  const transMatches = content.match(reTransitionAll) || [];
  if (transMatches.length > 0) {
    metrics.transitionAll.count += transMatches.length;
    metrics.transitionAll.files[relPath] = transMatches.length;
  }

  const upperMatches = content.match(reUppercase) || [];
  if (upperMatches.length > 0) {
    metrics.uppercase.count += upperMatches.length;
    metrics.uppercase.files[relPath] = upperMatches.length;
  }

  const pxMatches = content.match(reArbitraryPx) || [];
  if (pxMatches.length > 0) {
    metrics.arbitraryPx.count += pxMatches.length;
    metrics.arbitraryPx.files[relPath] = pxMatches.length;
  }

  const animMatches = content.match(reAnimations) || [];
  if (animMatches.length > 0) {
    metrics.animations.count += animMatches.length;
    metrics.animations.files[relPath] = animMatches.length;
  }

  const scaleMatches = content.match(reHoverScale) || [];
  if (scaleMatches.length > 0) {
    metrics.hoverScale.count += scaleMatches.length;
    metrics.hoverScale.files[relPath] = scaleMatches.length;
  }

  const gradMatches = content.match(reGradientClasses) || [];
  if (gradMatches.length > 0) {
    metrics.gradientClasses.count += gradMatches.length;
    metrics.gradientClasses.files[relPath] = gradMatches.length;
  }

  // Find emojis in strings/JSX (excluding comments)
  const emojiMatches = content.match(emojiRegex) || [];
  if (emojiMatches.length > 0) {
    metrics.emojis.count += emojiMatches.length;
    metrics.emojis.files[relPath] = {
      count: emojiMatches.length,
      sample: [...new Set(emojiMatches)].slice(0, 10).join(" "),
    };
  }
}

console.log("=== UNSLOP BASELINE AUDIT COUNTS ===");
console.log(`1. Emoji characters in UI strings: ${metrics.emojis.count}`);
console.log(`2. transition-all: ${metrics.transitionAll.count}`);
console.log(`3. uppercase: ${metrics.uppercase.count}`);
console.log(`4. arbitrary px values like [13px]: ${metrics.arbitraryPx.count}`);
console.log(`5. animate-pulse/ping/bounce: ${metrics.animations.count}`);
console.log(`6. hover:scale: ${metrics.hoverScale.count}`);
console.log(`7. gradient classes: ${metrics.gradientClasses.count}`);

console.log("\n=== TOP ARBITRARY PX HOTSPOTS ===");
const pxHotspots = Object.entries(metrics.arbitraryPx.files)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
for (const [f, c] of pxHotspots) {
  console.log(`  ${f}: ${c}`);
}

console.log("\n=== TOP TRANSITION-ALL HOTSPOTS ===");
const transHotspots = Object.entries(metrics.transitionAll.files)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
for (const [f, c] of transHotspots) {
  console.log(`  ${f}: ${c}`);
}

console.log("\n=== TOP EMOJI HOTSPOTS ===");
const emojiHotspots = Object.entries(metrics.emojis.files)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15);
for (const [f, info] of emojiHotspots) {
  console.log(`  ${f}: ${info.count} (${info.sample})`);
}

