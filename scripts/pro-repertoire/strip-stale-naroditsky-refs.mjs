#!/usr/bin/env node
// Remove dangling references to the 8 scrapped Naroditsky pro-rep
// openings (scotch / najdorf / vienna / jobava-london / fantasy-caro /
// alapin / kid / grunfeld / semi-slav). The actual pro-repertoires.json
// entries were scrapped in the rebuild commit; auxiliary data files
// still carry their keys, which point nowhere.

import fs from 'node:fs';

const STALE_PREFIXES = [
  'pro-naroditsky-scotch',
  'pro-naroditsky-najdorf',
  'pro-naroditsky-vienna',
  'pro-naroditsky-jobava-london',
  'pro-naroditsky-fantasy-caro',
  'pro-naroditsky-alapin',
  'pro-naroditsky-kid',
  'pro-naroditsky-grunfeld',
  'pro-naroditsky-semi-slav',
];
function isStale(key) {
  return STALE_PREFIXES.some((p) => key === p || key.startsWith(`${p}::`));
}

function pruneObj(path) {
  if (!fs.existsSync(path)) return { skipped: true };
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (Array.isArray(data)) {
    const before = data.length;
    const after = data.filter((x) => !isStale(x.id || '') && !isStale(x.openingId || ''));
    fs.writeFileSync(path, JSON.stringify(after, null, 2) + '\n');
    return { removed: before - after.length };
  }
  let removed = 0;
  for (const k of Object.keys(data)) {
    if (isStale(k)) { delete data[k]; removed++; }
  }
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  return { removed };
}

const targets = [
  'src/data/trap-line-classifications.json',
  'src/data/common-mistakes.json',
  'src/data/annotations-bundle.json',
  'src/data/checkpoint-quizzes.json',
];

for (const t of targets) {
  const r = pruneObj(t);
  if (r.skipped) console.log(`SKIP ${t} (missing)`);
  else console.log(`${t}: removed ${r.removed} stale key(s)`);
}

// annotations/pro-naroditsky-jobava-london.json — orphan file, delete it
if (fs.existsSync('src/data/annotations/pro-naroditsky-jobava-london.json')) {
  fs.unlinkSync('src/data/annotations/pro-naroditsky-jobava-london.json');
  console.log('deleted src/data/annotations/pro-naroditsky-jobava-london.json');
}

// annotations/index.ts — strip any import or registration of the orphan
const indexPath = 'src/data/annotations/index.ts';
if (fs.existsSync(indexPath)) {
  let src = fs.readFileSync(indexPath, 'utf8');
  const before = src.length;
  src = src
    .split('\n')
    .filter((line) => !STALE_PREFIXES.some((p) => line.includes(p)))
    .join('\n');
  if (src.length !== before) {
    fs.writeFileSync(indexPath, src);
    console.log(`annotations/index.ts: stripped ${before - src.length} chars of stale references`);
  }
}

console.log('\nDone.');
