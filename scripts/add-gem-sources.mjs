// Insert a verified `sources` array onto every narrated gem of one opening that
// lacks one. The sources must reflect REAL verification done for that opening
// (book corpus + an online search) — this only writes the recorded ref.
// Usage: node scripts/add-gem-sources.mjs <openingId> <src1> <src2> ...
import { readFileSync, writeFileSync } from 'node:fs';

const [openingId, ...sources] = process.argv.slice(2);
if (!openingId || sources.length === 0) { console.error('usage: add-gem-sources.mjs <openingId> <src...>'); process.exit(1); }

const path = 'src/data/lessons/punishGemNarration.ts';
let src = readFileSync(path, 'utf8');
const srcLine = `    sources: [${sources.map((s) => `'${s}'`).join(', ')}],\n`;

// match each entry key for this opening, capture whether its body already has sources
const lines = src.split('\n');
const out = [];
let inserted = 0;
for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  const keyMatch = lines[i].match(new RegExp(`^  ['"](${openingId}:[^'"]+)['"]: \\{$`));
  if (keyMatch) {
    // peek ahead: does this entry already declare sources before its closing?
    let j = i + 1; let hasSources = false;
    for (; j < lines.length && !/^  \},$/.test(lines[j]); j++) if (/^\s*sources:\s*\[/.test(lines[j])) hasSources = true;
    if (!hasSources) { out.push(srcLine.replace(/\n$/, '')); inserted++; }
  }
}
if (inserted > 0) writeFileSync(path, out.join('\n'));
console.log(`${openingId}: inserted sources on ${inserted} gem(s)`);
