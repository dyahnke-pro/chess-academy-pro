// LEVY'S LINES AS EXTRA SHEET LINES (WO-OPENINGS-REWRITE-01 R4). For each of his
// GothamChess openings, every taught line placed on it (a tab, a reply or a
// trap, `_placement.json`) as one extra line for the fact sheet
// (`LESSON_EXTRA`): tabs and replies walked to a middlegame (`_tabs-walked.json`),
// traps as he plays them, to where the punishment lands. The line's name
// carries what the writer needs to place it: the swarm's kind, whose move it
// leaves on, and how many of the plies are his.
//
//   node scripts/levy-lines/extra-lines.mjs   → docs/levy-lines/_extra-lines.json + notes/<openingId>.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const placement = J('docs/levy-lines/_placement.json');
const walked = new Map(J('docs/levy-lines/_tabs-walked.json').map((r) => [r.moves, r.walked]));
const merged = new Map(J('docs/levy-lines/_merged.json').map((l) => [l.moves, l]));

const out = {};
const notes = {};
let missing = 0;
for (const r of placement) {
  if (!r.taught || !r.opening || !['tab', 'reply', 'trap'].includes(r.place)) continue;
  const levy = r.moves.split(' ');
  const moves = r.place === 'trap' ? r.moves : walked.get(r.moves);
  if (!moves) { missing += 1; continue; }
  const ply = r.leavesAt + 1;
  const leavesOn = (ply % 2 === 1 ? 'white' : 'black') === r.side ? 'your move' : 'their move';
  const list = (out[r.opening] ??= []);
  const name = `Levy ${list.length + 1} (${r.place}, leaves ${r.nearTab ?? 'main'} on ${leavesOn} at ply ${ply}, his first ${levy.length} plies): ${r.name}`;
  list.push({ name, moves: moves.split(' ') });
  const m = merged.get(r.moves);
  (notes[r.opening] ??= []).push(`## Levy ${list.length}: ${r.name}\n- kind: ${r.place} · leaves ${r.nearTab ?? 'main'} on ${leavesOn} at ply ${ply} · his moves: ${r.moves}\n- the idea he teaches (a paraphrase, reference only): ${(m?.ideas ?? []).join(' ')}\n- from: ${(m?.videos ?? []).map((v) => v.title).join('; ')}\n`);
}
mkdirSync('docs/levy-lines/notes', { recursive: true });
for (const [id, list] of Object.entries(notes)) writeFileSync(`docs/levy-lines/notes/${id}.md`, [`# Levy's lines placed on ${id}`, '', 'Reference only: teach the idea in your own words; never quote him, never name him in a beat.', '', ...list].join('\n'));
writeFileSync('docs/levy-lines/_extra-lines.json', JSON.stringify(out, null, 1));
const total = Object.values(out).reduce((a, l) => a + l.length, 0);
console.log(`[extra-lines] ${total} lines on ${Object.keys(out).length} openings${missing ? `; ${missing} not walked yet` : ''}`);
