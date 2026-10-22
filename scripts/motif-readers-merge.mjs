// Sums the shards of the motif-reader measure (WO-MOTIFS-01 M4) into
// audit-reports/motif-readers.json and prints catch / false-alarm per motif.
// Run after: MOTIF_READERS=1 MOTIF_READERS_SHARD=i/n npx vitest run src/services/motifReaders.measure.test.ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const files = readdirSync('audit-reports').filter((f) => /^motif-readers\.shard-\d+\.json$/.test(f));
if (files.length === 0) { console.error('no shard files in audit-reports/'); process.exit(1); }
const sum = {};
const namedAs = {};
let read = 0, of = 0;
for (const f of files) {
  const s = JSON.parse(readFileSync(`audit-reports/${f}`, 'utf8'));
  read += s.read; of += s.of;
  if (!s.done) console.log(`(shard ${s.shard} still running: ${s.read}/${s.of})`);
  for (const [id, row] of Object.entries(s.namedAs ?? {})) {
    const a = (namedAs[id] ??= {});
    for (const [k, n] of Object.entries(row)) a[k] = (a[k] ?? 0) + n;
  }
  for (const [id, t] of Object.entries(s.tallies)) {
    const a = (sum[id] ??= { carry: 0, caught: 0, consistent: 0, without: 0, falseAlarm: 0 });
    for (const k of Object.keys(a)) a[k] += t[k];
  }
}
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
const rows = Object.entries(sum).map(([motif, t]) => ({
  motif, carry: t.carry,
  catchRate: pct(t.caught, t.carry), consistentRate: pct(t.consistent, t.carry), falseAlarmRate: pct(t.falseAlarm, t.without),
}));
writeFileSync('audit-reports/motif-readers.json', JSON.stringify({ puzzles: read, of, rows, namedAs }, null, 2));
console.log(`${read}/${of} puzzles read`);
for (const r of rows) console.log(`${r.motif.padEnd(20)} carry ${String(r.carry).padStart(5)}  exact ${r.catchRate ?? '—'}%  consistent ${r.consistentRate ?? '—'}%  false ${r.falseAlarmRate ?? '—'}%`);

// What each motif is named instead (top five), for the readers to fix.
for (const [id, row] of Object.entries(namedAs)) {
  const total = Object.values(row).reduce((a, b) => a + b, 0);
  const top = Object.entries(row).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, n]) => `${k} ${Math.round((n / total) * 100)}%`).join(', ');
  console.log(`  ${id.padEnd(20)} named as: ${top}`);
}
