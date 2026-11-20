#!/usr/bin/env node
// Words and try sentences on a P5_DUMP (the 29 puzzle reads), and — given a
// second dump — every sentence new or changed.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const tries = (t) => (t.match(/(looks natural|is the obvious try|is tempting|all fail to|\? Then |would run into|If they try)/g) ?? []).length;
const stat = (m) => { const ws = Object.values(m).map(words); return { avg: Math.round(ws.reduce((x, y) => x + y, 0) / ws.length), max: Math.max(...ws), tries: Object.values(m).reduce((n, t) => n + tries(t), 0) }; };
const A = JSON.parse(readFileSync(a, 'utf8'));
console.log(a, JSON.stringify(stat(A)));
if (b) {
  const B = JSON.parse(readFileSync(b, 'utf8'));
  console.log(b, JSON.stringify(stat(B)));
  const sents = (t) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const id of Object.keys(B)) {
    const was = new Set(sents(A[id] ?? '')); const now = sents(B[id]);
    const neu = now.filter((s) => !was.has(s)); const gone = [...was].filter((s) => !now.includes(s));
    if (neu.length || gone.length) { console.log(`## ${id}`); gone.forEach((s) => console.log(`  - ${s}`)); neu.forEach((s) => console.log(`  + ${s}`)); }
  }
}
