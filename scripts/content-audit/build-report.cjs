// Build the human deliverable: docs/content-audit-opening-tab.md
// from the verified artifacts (systemic detectors + re-validated judge findings).
const fs = require('fs');
const sys = JSON.parse(fs.readFileSync('audit-reports/content-audit/_systemic.json', 'utf8'));
const rev = JSON.parse(fs.readFileSync('audit-reports/content-audit/_findings-revalidated.json', 'utf8'));

const high = rev.flatMap((o) => o.findings.filter((f) => f.severity === 'high').map((f) => ({ id: o.id, ...f })));
const liveHigh = high.filter((f) => f.status === 'live');
const totals = { high: high.length, med: rev.flatMap((o) => o.findings).filter((f) => f.severity === 'medium').length, low: rev.flatMap((o) => o.findings).filter((f) => f.severity === 'low').length };

let md = `# Opening Tab — Content Audit (for confirmation)

_Generated ${new Date().toISOString().slice(0, 10)} from a grounded per-section audit of all 123 curated openings (42 masterclass + 81 pro). Every item is FLAGGED for David to confirm — nothing was auto-edited._

## How to read this
- **Axes:** every section judged on **Accuracy** (true vs the replayed line/FEN/data), **Relevance** (actually about THIS opening), **Non-redundancy** (earns its place vs siblings).
- **Tier 1** is mechanically re-derived from the *current* data — confirmed, fix with confidence.
- **Tier 2+** are AI-flagged, grounded findings (quoted + the data they contradict). High-confidence on the sampled set, but they are CANDIDATES for your eye, not gospel.

## Caveats (calibrate trust)
- The adversarial verify pass was killed by an API session limit; I (main loop) re-validated instead — systemic items mechanically, high items by grounding + sampling. So Tier 2 may carry some false positives.
- **Engine move-quality claims were NOT re-checked live** (no clean Stockfish CLI here). A pitfall claim like "the correct move is much better" is reasoned, not engine-confirmed — marked where relevant.
- Re-built against current \`main\` AFTER the parallel session's plan fixes, so already-fixed plan issues are excluded.
- Move legality + line soundness are covered by the existing 2,388 green gates — not re-litigated here.

## Totals
- **123 openings judged**, 3 clean.
- Raw findings: **${totals.high} high / ${totals.med} medium / ${totals.low} low**.
- High findings concentrate in **model games** and **variation explanations** (accuracy: prose describing a different game/line than the one shown).

---

## TIER 1 — Mechanically confirmed against current data (${sys.dupModelGames.length + sys.dupVariations.length + sys.cwFtbClash.length + sys.dupPlans.length})

### Duplicate model games — same game listed twice (${sys.dupModelGames.length})
`;
for (const x of sys.dupModelGames) md += `- **${x.id}**: \`${x.a}\` and \`${x.b}\` are field-for-field identical (${x.who}).\n`;
md += `\n### Duplicate / mislabeled variation tabs (${sys.dupVariations.length})\n`;
for (const x of sys.dupVariations) md += `- **${x.id}**: "${x.a}" and "${x.b}" share the ${x.sameBeat ? 'identical Watch narration' : ''}${x.sameBeat && x.sameLine ? ' and ' : ''}${x.sameLine ? 'identical move line' : ''}.\n`;
md += `\n### Classic-Wisdom vs From-the-Books — same passage, conflicting author (${sys.cwFtbClash.length})\n`;
for (const x of sys.cwFtbClash) md += `- **${x.id}**: "${x.text}…" attributed to **${x.cwAuthor}** (Classic Wisdom) AND **${x.fbAuthor}** (From the Books).\n`;
md += `\n### Duplicate middlegame plans — two plans, identical demonstrated line (${sys.dupPlans.length})\n`;
for (const x of sys.dupPlans) md += `- **${x.id}**: \`${x.a}\` and \`${x.b}\` play the same ${x.kind}.\n`;

md += `\n---\n\n## TIER 2 — High-severity AI findings by opening (${liveHigh.length} with flagged text still present in current data)\n`;
md += `\n_Ranked by # of high findings. Each: the quoted claim → the data it conflicts with → suggested fix._\n`;

const byId = {};
for (const f of liveHigh) (byId[f.id] = byId[f.id] || []).push(f);
const order = Object.keys(byId).sort((a, b) => byId[b].length - byId[a].length);
for (const id of order) {
  md += `\n### ${id} (${byId[id].length})\n`;
  for (const f of byId[id]) {
    md += `- **[${f.axis}] ${f.section.replace(/\s+/g, ' ').slice(0, 60)}** — ${f.issue}\n`;
    md += `  - claim: ${String(f.claim).replace(/\s+/g, ' ').slice(0, 200)}\n`;
    if (f.suggestedFix) md += `  - fix: ${String(f.suggestedFix).replace(/\s+/g, ' ').slice(0, 160)}\n`;
  }
}

md += `\n---\n\n## Where the rest live\n`;
md += `- Full re-validated findings (all 582, every severity, with live/changed status): \`audit-reports/content-audit/_findings-revalidated.json\` (gitignored — regenerate with the content-audit scripts).\n`;
md += `- Systemic detectors: \`scripts/content-audit/detect-systemic.cjs\`. Per-opening packets: \`scripts/content-audit/build-packets.ts\`.\n`;

fs.writeFileSync('docs/content-audit-opening-tab.md', md);
console.log('wrote docs/content-audit-opening-tab.md');
console.log(`tier1 systemic: ${sys.dupModelGames.length + sys.dupVariations.length + sys.cwFtbClash.length + sys.dupPlans.length} | tier2 high-live: ${liveHigh.length} across ${order.length} openings`);
