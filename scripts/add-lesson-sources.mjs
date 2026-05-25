// Insert a verified `sources` array onto every masterclass LessonScript for one
// opening (main line + variations + named traps), keyed off the `openingId:`
// line. The sources must reflect REAL verification done for that opening (book
// corpus + an online search) — this only records the ref. Idempotent: skips a
// lesson that already declares sources right after its openingId.
// Usage: node scripts/add-lesson-sources.mjs <openingId> <src1> <src2> ...
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const [openingId, ...sources] = process.argv.slice(2);
if (!openingId || sources.length === 0) { console.error('usage: add-lesson-sources.mjs <openingId> <src...>'); process.exit(1); }

const dir = 'src/data/lessons';
const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !/\.test\.ts$/.test(f));
const anchorRe = new RegExp(`^(\\s*)openingId:\\s*['"]${openingId}['"],`);
let total = 0;
for (const f of files) {
  const lines = readFileSync(`${dir}/${f}`, 'utf8').split('\n');
  const out = [];
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const m = lines[i].match(anchorRe);
    if (m && !(lines[i + 1] || '').trim().startsWith('sources:')) {
      out.push(`${m[1]}sources: [${sources.map((s) => `'${s}'`).join(', ')}],`);
      n++;
    }
  }
  if (n > 0) { writeFileSync(`${dir}/${f}`, out.join('\n')); total += n; console.log(`  ${f}: +${n}`); }
}
console.log(`${openingId}: inserted sources on ${total} lesson(s)`);
