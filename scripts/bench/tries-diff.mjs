// What changed between two tries-bench reports: tries newly said, tries no
// longer said, and said lines whose words changed.
// Run: node scripts/bench/tries-diff.mjs <before.json> <after.json>
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
const key = (r) => `${r.id}|${r.try}|${r.nag}`;
const before = new Map(a.rows.map((r) => [key(r), r]));
console.log('before', JSON.stringify(a.gates));
console.log('after ', JSON.stringify(b.gates));
for (const r of b.rows) {
  const o = before.get(key(r));
  if (!o) continue;
  if (r.said && !o.said) console.log(`NEW   ${r.id} ${r.try}${r.nag} (was ${o.gate}): ${r.said}`);
  else if (!r.said && o.said) console.log(`LOST  ${r.id} ${r.try}${r.nag} (now ${r.gate}): ${o.said}`);
  else if (r.said && o.said && r.said !== o.said) console.log(`CHANGED ${r.id} ${r.try}${r.nag}\n  was: ${o.said}\n  now: ${r.said}`);
}
