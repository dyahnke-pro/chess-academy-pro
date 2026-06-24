const fs = require('fs');
const data = JSON.parse(fs.readFileSync('audit-reports/content-audit/_judge-findings.json', 'utf8'));
const sev = process.argv[2] || 'high';
const order = { high: 3, medium: 2, low: 1 };
const min = order[sev] || 3;
let md = `# Content audit — judge-stage findings (severity >= ${sev}, UNVERIFIED)\n\n`;
const ranked = data
  .map((o) => ({ id: o.id, f: o.findings.filter((x) => order[x.severity] >= min) }))
  .filter((o) => o.f.length)
  .sort((a, b) => b.f.filter((x) => x.severity === 'high').length - a.f.filter((x) => x.severity === 'high').length);
for (const o of ranked) {
  md += `\n## ${o.id}  (${o.f.length})\n`;
  for (const x of o.f) {
    md += `\n- **[${x.severity}/${x.axis}] ${x.section}**\n`;
    md += `  - claim: ${JSON.stringify(x.claim)}\n`;
    md += `  - vs ground truth: ${x.groundTruth}\n`;
    md += `  - issue: ${x.issue}\n`;
    md += `  - suggested: ${x.suggestedFix}\n`;
  }
}
fs.writeFileSync(`audit-reports/content-audit/_findings-${sev}.md`, md);
console.log(`wrote audit-reports/content-audit/_findings-${sev}.md (${ranked.length} openings, ${ranked.reduce((s, o) => s + o.f.length, 0)} findings)`);
