// SHADOW DIFF — what the new deterministic derivation would draw on the 21
// baked openings, against what the old runtime prose-scrape draws today.
//
// Run BEFORE swapping anything in (David 2026-07-31 plan): the point is to see
// every arrow that changes, so a fix can't quietly delete good arrows while
// removing the false ones.
//
//   npx tsx scripts/danya-corpus/arrow-diff.mts [--opening "<key>"] [--verbose]
import { Chess } from 'chess.js';
import { deriveNarrationArrows } from '../../src/services/narrationArrows';
import { mentionedMoveArrows } from '../../src/services/mentionedMoveArrows';
import data from '../../src/data/walkthrough-narrations.json';

interface Idea { text?: string; shortText?: string }
interface Baked { openingName: string; spine: string[]; ideas: Array<Idea | string> }

const only = process.argv.includes('--opening')
  ? process.argv[process.argv.indexOf('--opening') + 1]
  : null;
const verbose = process.argv.includes('--verbose');

const narrations = (data as unknown as { narrations: Record<string, Baked> }).narrations;
const keys = Object.keys(narrations).filter((k) => !only || k === only);

let plies = 0;
let removed = 0;
let added = 0;
let kept = 0;
const removedSamples: string[] = [];
const addedSamples: string[] = [];

for (const key of keys) {
  const n = narrations[key];
  const c = new Chess();
  n.spine.forEach((san, i) => {
    let mv;
    try { mv = c.move(san); } catch { return; }
    const fen = c.fen();
    const raw = n.ideas?.[i];
    const text = typeof raw === 'string' ? raw : raw?.text ?? '';
    if (!text) return;
    plies += 1;
    const exclude = [{ from: mv.from, to: mv.to }];
    const oldSet = new Set(mentionedMoveArrows(text, fen, exclude).map((a) => `${a.from}-${a.to}`));
    const res = deriveNarrationArrows(text, fen, exclude);
    const newSet = new Set(res.arrows.map((a) => `${a.from}-${a.to}`));

    for (const a of oldSet) {
      if (newSet.has(a)) { kept += 1; continue; }
      removed += 1;
      // Match the rejection to THIS arrow's token where we can, so the
      // reason column isn't just the first rejection of the ply.
      const why = res.rejected.find((r) => a.includes(r.token.slice(-2)))?.reason
        ?? res.rejected[0]?.reason ?? 'not derived';
      if (removedSamples.length < 25) removedSamples.push(`${key} ply${i + 1} ${san}: -${a}  (${why})`);
    }
    for (const a of newSet) {
      if (oldSet.has(a)) continue;
      added += 1;
      const arrow = res.arrows.find((x) => `${x.from}-${x.to}` === a);
      if (addedSamples.length < 25) addedSamples.push(`${key} ply${i + 1} ${san}: +${a} (${arrow?.san}, token "${arrow?.token}")`);
    }
    if (verbose && (oldSet.size || newSet.size)) {
      console.log(`\n${key} ply${i + 1} ${san}`);
      console.log(`  "${text.slice(0, 150)}"`);
      console.log(`  old: ${[...oldSet].join(' ') || '(none)'}`);
      console.log(`  new: ${[...newSet].join(' ') || '(none)'}`);
      for (const r of res.rejected) console.log(`  reject "${r.token}": ${r.reason}`);
    }
  });
}

console.log(`\n════ ARROW SHADOW DIFF ════`);
console.log(`  ${keys.length} opening(s), ${plies} narrated plies`);
console.log(`  kept    ${kept}`);
console.log(`  REMOVED ${removed}   (arrows the old scrape drew that the gate rejects)`);
console.log(`  ADDED   ${added}   (arrows the gate resolves that the old scrape missed)`);
if (removedSamples.length) {
  console.log(`\n  — removed —`);
  for (const s of removedSamples) console.log(`    ${s}`);
}
if (addedSamples.length) {
  console.log(`\n  — added —`);
  for (const s of addedSamples) console.log(`    ${s}`);
}
