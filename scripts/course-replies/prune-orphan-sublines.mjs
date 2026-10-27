// Delete sublines that no longer branch from their tab (G8 orphan sweep,
// WO-COURSE-01 C). A subline is a reply ON a tab's line: its moves before the
// reply must be that tab's moves. When a tab's line is rebuilt (a masterclass
// spine moved, an anti-opening's junk tail replaced) or a tab is removed, the
// sublines built on the old moves stay behind — and the reply tree would play
// a line the tab never reaches. Measured 2026-10-27: 112 off-line + 84 on tabs
// that no longer exist. The gate `courseSublinesOnTab.gate.test.ts` holds it.
//
// Usage: node scripts/course-replies/prune-orphan-sublines.mjs [--write]
// → audit-reports/subline-orphans.json (the deleted keys, for the narration
//   retire tool: KEYS_FILE=audit-reports/subline-orphans.json).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../..', import.meta.url).pathname;
const WRITE = process.argv.includes('--write');
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const tokens = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

const byId = new Map(
  ['repertoire', 'pro-repertoires', 'gambits', 'anti-openings']
    .flatMap((f) => arr(J(`src/data/${f}.json`)))
    .filter((o) => o?.id)
    .map((o) => [o.id, o]),
);
const subs = J('src/data/course-sublines.json');
const deleted = [];
for (const [id, tabs] of Object.entries(subs)) {
  const o = byId.get(id);
  for (const [tab, list] of Object.entries(tabs)) {
    const line = !o ? [] : tab === '-1' ? tokens(o.pgn) : tokens(o.variations?.[Number(tab)]?.pgn);
    const keep = list.filter((s) => line.length >= s.atPly && s.moves.slice(0, s.atPly).join(' ') === line.slice(0, s.atPly).join(' '));
    for (const s of list) if (!keep.includes(s)) deleted.push(`${id}::${tab}::${s.triggerMove}@${s.atPly}`);
    if (keep.length) tabs[tab] = keep;
    else delete tabs[tab];
  }
  if (Object.keys(tabs).length === 0) delete subs[id];
}
writeFileSync(root + 'audit-reports/subline-orphans.json', JSON.stringify(deleted, null, 1));
console.log(`[prune] ${deleted.length} orphaned sublines${WRITE ? ' deleted' : ' (dry run)'}`);
if (WRITE) writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(subs));
