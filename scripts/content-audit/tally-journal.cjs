const fs = require('fs');
const path = process.argv[2];
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');
const byId = new Map();
for (const l of lines) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  const r = o.result;
  if (r && r.id && Array.isArray(r.findings)) byId.set(r.id, r); // last write wins
}
let H = 0, M = 0, L = 0, acc = 0, rel = 0, red = 0, total = 0;
const rows = [];
for (const r of byId.values()) {
  const f = r.findings;
  for (const x of f) {
    total++;
    if (x.severity === 'high') H++; else if (x.severity === 'medium') M++; else L++;
    if (x.axis === 'accuracy') acc++; else if (x.axis === 'relevance') rel++; else red++;
  }
  rows.push({ id: r.id, n: f.length, h: f.filter(x => x.severity === 'high').length, m: f.filter(x => x.severity === 'medium').length });
}
console.log('openings judged:', byId.size);
console.log('total findings:', total, '| high:', H, 'med:', M, 'low:', L);
console.log('by axis -> accuracy:', acc, '| relevance:', rel, '| redundancy:', red);
console.log('clean openings (0 findings):', rows.filter(r => r.n === 0).length);
rows.sort((a, b) => (b.h * 100 + b.m * 10 + (b.n)) - (a.h * 100 + a.m * 10 + a.n));
console.log('\n=== worst by severity (top 18) ===');
for (const r of rows.slice(0, 18)) console.log(`  ${r.id}: ${r.n} findings (${r.h} high, ${r.m} med)`);
// dump full findings to a file for the report
const out = [...byId.values()].map(r => ({ id: r.id, findings: r.findings }));
fs.writeFileSync('audit-reports/content-audit/_judge-findings.json', JSON.stringify(out, null, 2));
console.log('\nfull judge findings -> audit-reports/content-audit/_judge-findings.json');
