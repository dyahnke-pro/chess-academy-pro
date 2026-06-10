// Assemble hand-authored disaster-walkthrough narration + the engine-verified
// scaffold (moves + per-move board facts) into punishmentLine objects, and
// insert them into common-mistakes.json. I hand-author the PROSE (annotations +
// learnCues, sharp/cautionary 2nd-person, board-true); this wires the structure
// (moves from the scaffold, the move-arrow from the real from→to + my vision
// arrows, highlights). Idempotent: re-running overwrites the punishmentLine.
import { readFileSync, writeFileSync } from 'fs';
const RED = 'rgba(239,68,68,0.85)';      // the move just played (the blunder / the punishing blow)
const ATK = 'rgba(40,185,95,0.92)';      // vision arrow
const KEY = 'rgba(255,214,0,0.88)';      // key square highlight
const scaffold = JSON.parse(readFileSync('/tmp/punish-scaffold.json', 'utf8'));
const NARR = JSON.parse(readFileSync(process.env.NARR, 'utf8')); // {"oid::wrongMove":{title,ann:[],cue:[],vis:{i:[[from,to],...]},hl:{i:[sq,...]}}}
const cm = JSON.parse(readFileSync('src/data/common-mistakes.json', 'utf8'));

let done = 0;
for (const [key, n] of Object.entries(NARR)) {
  const [oid, wrong] = key.split('::');
  const sc = (scaffold[oid] || []).find((e) => e.wrongMove === wrong);
  if (!sc) { console.log('NO SCAFFOLD', key); continue; }
  if (n.ann.length !== sc.moves.length || n.cue.length !== sc.moves.length) {
    console.log(`LEN MISMATCH ${key}: moves ${sc.moves.length} ann ${n.ann.length} cue ${n.cue.length}`); continue;
  }
  const arrows = sc.facts.map((f, i) => {
    const a = [{ from: f.from, to: f.to, color: RED }];
    for (const [fr, to] of (n.vis?.[i] || [])) a.push({ from: fr, to, color: ATK });
    return a;
  });
  const highlights = sc.facts.map((f, i) => {
    const h = [{ square: f.to, color: KEY }];
    for (const sq of (n.hl?.[i] || [])) h.push({ square: sq, color: KEY });
    return h;
  });
  const pl = { fen: sc.fen, title: n.title, moves: sc.moves, annotations: n.ann, arrows, highlights, learnCues: n.cue };
  const entry = (cm[oid] || []).find((e) => e.wrongMove === wrong);
  if (!entry) { console.log('NO ENTRY', key); continue; }
  entry.punishmentLine = pl; done++;
}
writeFileSync('src/data/common-mistakes.json', JSON.stringify(cm, null, 2) + '\n');
console.log(`assembled ${done} punishmentLines into common-mistakes.json`);
