#!/usr/bin/env node
// Corpus sweep REPORT — read-only. Classifies every spoken clause in the
// walkthrough corpus and writes a review file. CHANGES NOTHING.
//
//   node scripts/corpus-sweep/report.mjs [--json]
//
// Output: audit-reports/corpus-sweep-review.md (gitignored)
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { classifyClause, toClauses } from '../../src/services/narrationQuality.shared.mjs';

const SRC = 'src/data/voiced-walkthroughs.json';
const PIECE = { pawn: '', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const SPOKEN = /\b(pawn|knight|bishop|rook|queen|king)\s+(?:to|takes|captures|goes to|comes to|steps to|drops to|settles on|jumps to|lands on)\s+([a-h][1-8])\b/gi;
const SAN = /\b([NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b/g;

/** Every move a clause names, in SAN, however it was phrased for speech. */
function namedMoves(text) {
  const out = [];
  for (const m of text.matchAll(SPOKEN)) out.push(`${PIECE[m[1].toLowerCase()]}${m[2]}`);
  for (const m of text.matchAll(SAN)) out.push(m[1]);
  return [...new Set(out)];
}

const trees = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const cuts = {};
const kept = [];
const walkouts = [];
let nodes = 0;
let sentences = 0;

for (const tree of trees) {
  const walk = (node, sans) => {
    if (node.san) sans = [...sans, node.san];
    const idea = (node.idea || '').trim();
    if (idea) {
      nodes += 1;
      const at = `${tree.openingName} @ ${sans.join(' ') || '(start)'}`;
      for (const clause of toClauses(idea)) {
        sentences += 1;
        const r = classifyClause(clause);
        if (r.disposition === 'cut') (cuts[r.class] ??= []).push({ at, clause, name: r.name });
        else if (r.class === 'principle') kept.push({ at, clause });
      }
      // LOOK-AHEAD: moves named that cannot be played from this very board.
      // <=4 get arrows; >=5 get played out and snapped back (David 2026-09-12).
      const board = new Chess();
      let legalPath = true;
      for (const san of sans) {
        try { if (!board.move(san)) { legalPath = false; break; } } catch { legalPath = false; break; }
      }
      if (legalPath) {
        const legal = new Set(board.moves().map((m) => m.replace(/[+#]/g, '')));
        const played = sans.length ? sans[sans.length - 1].replace(/[+#]/g, '') : '';
        const future = namedMoves(idea).filter((m) => m !== played && !legal.has(m));
        if (future.length >= 5) walkouts.push({ at, future, idea });
      }
    }
    for (const child of node.children ?? []) walk(child.node, sans);
  };
  walk(tree.tree.root, []);
}

const total = Object.values(cuts).reduce((a, b) => a + b.length, 0);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ nodes, sentences, total, cuts, kept: kept.length, walkouts: walkouts.length }, null, 2));
  process.exit(0);
}

const LABEL = {
  rating: 'OPPONENT RATING — a player the student never saw',
  session: 'SESSION / TOURNAMENT FRAMING — the game as an event',
  author: 'AUTHOR ASIDE — the presenter on themselves, or the game as entertainment',
  priorVid: 'PRIOR VIDEO — content the student was never given',
  audience: 'AUDIENCE ADDRESS — spoken to video viewers',
  namedPerson: 'NAMED PERSON — a human the student has never heard of',
  fragment: 'FRAGMENT — no square, no piece, no chess idea. Connective tissue.',
};

let out = `# Corpus sweep — review\n\nSource: \`${SRC}\` — ${trees.length} trees, ${nodes} narrated nodes, ${sentences} spoken clauses.\n**Read-only. Nothing has been applied.**\n\n## Summary\n\n| class | clauses | action |\n|---|---|---|\n`;
for (const [k, v] of Object.entries(cuts)) out += `| ${k} | ${v.length} | CUT |\n`;
out += `| **total cut** | **${total}** (${((100 * total) / sentences).toFixed(1)}%) | |\n`;
out += `| general principles (no square, real chess) | ${kept.length} | **KEPT** |\n`;
out += `| walk-out nodes (5+ unplayable moves named) | ${walkouts.length} | PLAY OUT + SNAP BACK |\n`;
for (const [k, v] of Object.entries(cuts)) {
  out += `\n---\n\n## ${k} — ${v.length}\n_${LABEL[k] ?? ''}_\n\n`;
  for (const x of v) out += `- \`${x.at}\`\n  > ${x.name ? `[${x.name}] ` : ''}${x.clause}\n`;
}
out += `\n---\n\n## KEPT — general principles (${kept.length})\n_No square named, but real chess. NOT cut._\n\n`;
for (const x of kept.slice(0, 150)) out += `- > ${x.clause}\n`;
out += `\n_(first 150 of ${kept.length})_\n\n---\n\n## WALK-OUT candidates — ${walkouts.length}\n\n`;
for (const x of walkouts) out += `- \`${x.at}\`\n  un-playable: ${x.future.join(', ')}\n  > ${x.idea}\n\n`;

fs.mkdirSync('audit-reports', { recursive: true });
fs.writeFileSync('audit-reports/corpus-sweep-review.md', out);
console.log(`wrote audit-reports/corpus-sweep-review.md`);
console.log(`${sentences} clauses · cut ${total} · principles kept ${kept.length} · walk-outs ${walkouts.length}`);
console.log(Object.fromEntries(Object.entries(cuts).map(([k, v]) => [k, v.length])));
