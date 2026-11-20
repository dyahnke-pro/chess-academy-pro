#!/usr/bin/env node
// Fact diff: per read, the facts SPOKEN before vs after, keyed by claim (or
// computer+kind) + squares, so a renderer change shows what went silent and
// what is newly spoken — never by prose, which the renderer is free to reword.
// Usage: node scripts/voice/fact-diff.mjs <before/facts.json> <after/facts.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error('usage: fact-diff.mjs <before> <after>'); process.exit(2); }
const before = JSON.parse(readFileSync(a, 'utf8'));
const after = JSON.parse(readFileSync(b, 'utf8'));
const claimsOf = (read) => new Map((read.facts ?? []).map((f) => [f.text, f.claims ?? []]));
const keyOf = (f, claims) => {
  const c = (claims.get(f.text) ?? []).filter((x) => !/^(said|once):/.test(x)).sort().join('|');
  return `${f.computer ?? '-'}:${f.kind}${c ? `[${c}]` : ''}@${[...(f.squares ?? [])].sort().join(',')}`;
};
let silent = 0; let added = 0;
for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const B = before[id]; const A = after[id];
  // A merged fact (one move's jobs said as one sentence) speaks EACH of its
  // claims: keyed per claim, so a merge is not read as a silence.
  const keys = (R) => new Map((R?.kept ?? []).flatMap((f) => {
    const cl = (f.claims ?? claimsOf(R).get(f.text) ?? []).filter((x) => !/^(said|once):/.test(x));
    return cl.length > 1 ? cl.map((c) => [`claim:${c}`, f.text]) : [[keyOf(f, claimsOf(R)), f.text]];
  }));
  const bk = keys(B); const ak = keys(A);
  const gone = [...bk].filter(([k]) => !ak.has(k));
  const neu = [...ak].filter(([k]) => !bk.has(k));
  if (!gone.length && !neu.length) continue;
  console.log(`## ${id}`);
  for (const [k, t] of gone) { silent++; console.log(`  - SILENT ${k}\n      ${t}`); }
  for (const [k, t] of neu) { added++; console.log(`  + SPOKEN ${k}\n      ${t}`); }
}
console.log(`\n${silent} went silent, ${added} newly spoken`);
