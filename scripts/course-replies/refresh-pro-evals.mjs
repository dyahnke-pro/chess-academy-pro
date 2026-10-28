// Every pro reply line's stored eval, read off its OWN last board
// (WO-COURSE-01, 2026-10-28). `evalCp` / `dubious` / `engineBest` drive the
// teach-both caption; they were computed once when a line was built, and lines
// rebuilt later kept the old numbers (43 off by more than half a pawn, 17
// dubious flags wrong). This reads the grounding cache — the same engine read
// the gate checks — and the engine for the fix a dubious line names.
//
// Run after `scripts/ci/build-grounding.cjs` so every last board is in the cache.
// Usage: node scripts/course-replies/refresh-pro-evals.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const WRITE = process.argv.includes('--write');
const LOSING = -100;

const subs = J('src/data/course-sublines.json');
const items = new Map(J('src/data/grounding-items.json').items.filter((it) => it.cat === 'subline').map((it) => [it.name, it]));
const evals = J('src/data/grounding-evals.json');
const engine = new Engine();

/** The engine's best line from a board, `plies` long. */
async function bestLine(fen, plies = 6) {
  const c = new Chess(fen);
  const line = [];
  for (let i = 0; i < plies && !c.isGameOver(); i++) {
    const r = await engine.analyse(c.fen(), { depth: 14 });
    if (!r.best) break;
    line.push(c.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }).san);
  }
  return line;
}

let changed = 0, flagged = 0, missing = 0;
for (const [id, tabs] of Object.entries(subs)) {
  if (!id.startsWith('pro-')) continue;
  for (const [tab, list] of Object.entries(tabs)) {
    for (const s of list) {
      const it = items.get(`${id}::${tab}::${s.triggerMove}@${s.atPly}`);
      const e = it && evals[it.terminalFen];
      if (!e) { missing++; continue; }
      const white = e.mate != null ? (e.mate > 0 ? 10000 : -10000) : e.cp;
      const cp = it.color === 'white' ? white : -white;
      const dubious = cp < LOSING;
      if (s.evalCp !== cp || !!s.dubious !== dubious) changed++;
      s.evalCp = cp;
      s.dubious = dubious;
      if (dubious) {
        flagged++;
        // The fix: the engine's best from the board where the student answers
        // the reply (after the trigger).
        const c = new Chess();
        for (const m of s.moves.slice(0, s.atPly + 1)) c.move(m);
        const line = await bestLine(c.fen());
        if (line.length) { s.engineBest = line[0]; s.engineBestLine = line; }
      } else {
        delete s.engineBest;
        delete s.engineBestLine;
      }
    }
  }
}
engine.quit();
console.log(`[pro-evals] ${changed} lines changed · ${flagged} dubious · ${missing} not in the cache${WRITE ? '' : ' (dry run)'}`);
if (WRITE) writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(subs));
