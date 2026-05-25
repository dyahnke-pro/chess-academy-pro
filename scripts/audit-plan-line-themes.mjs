// Analysis: which middlegame-plan playableLines fail to DEMONSTRATE their
// named theme. The disease (David 2026-05-25, "Dutch Leningrad: The Kingside
// Storm" showed d5/Na6/Rb1/Bd7 — zero storm moves + a promise-only ending):
// a plan's playableLine walks generic continuation moves instead of the
// plan's own declared pawn breaks, then the final annotation just PROMISES
// the advantage ("ready for …e5 and the kingside storm") without ever showing
// it. This script measures the blast radius and emits the offender list that
// seeds the gate baseline. Read-only; prints JSON to stdout.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');
const plans = JSON.parse(readFileSync(join(dataDir, 'middlegame-plans.json'), 'utf8'));

// openingId -> 'white' | 'black'
const colorMap = {};
for (const f of ['repertoire.json', 'pro-repertoires.json']) {
  try {
    const arr = JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
    const list = Array.isArray(arr) ? arr : arr.openings ?? [];
    for (const o of list) if (o && o.id && o.color) colorMap[o.id] = o.color;
  } catch { /* optional */ }
}

const SQUARE = /\b([a-h][1-8])\b/g;
const PROMISE = /\b(ready for|ready to|prepares?|preparing|will follow|is ready|planning|intends?|sets? up|setting up|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;

function breakSquaresOf(plan) {
  const out = new Set();
  const harvest = (s) => { if (typeof s !== 'string') return; let m; while ((m = SQUARE.exec(s)) !== null) out.add(m[1]); };
  for (const pb of plan.pawnBreaks ?? []) {
    if (typeof pb === 'string') harvest(pb);
    else if (pb && typeof pb === 'object') harvest(pb.move);
  }
  return out;
}

const report = { totalPlans: 0, plansWithLines: 0, totalLines: 0, themeEmptyLines: 0, promiseEndingLines: 0, offenders: [] };

for (const plan of plans) {
  report.totalPlans++;
  const lines = plan.playableLines ?? [];
  if (lines.length === 0) continue;
  report.plansWithLines++;
  const color = colorMap[plan.openingId] ?? null;
  const breakSq = breakSquaresOf(plan);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    report.totalLines++;
    let themeHit = false;
    let badFen = false;
    try {
      const chess = new Chess(line.fen);
      const studentChar = color === 'black' ? 'b' : color === 'white' ? 'w' : null;
      for (const san of line.moves) {
        const mover = chess.turn();
        let mv;
        try { mv = chess.move(san); } catch { badFen = true; break; }
        const isStudent = studentChar ? mover === studentChar : true;
        if (isStudent && breakSq.size > 0 && breakSq.has(mv.to)) themeHit = true;
      }
    } catch { badFen = true; }

    const anns = line.annotations ?? [];
    const last = anns.length ? anns[anns.length - 1] : '';
    const promiseEnding = PROMISE.test(last);

    const themeEmpty = breakSq.size > 0 && !themeHit && !badFen;
    if (themeEmpty) report.themeEmptyLines++;
    if (promiseEnding) report.promiseEndingLines++;

    if (themeEmpty || promiseEnding || badFen) {
      report.offenders.push({
        key: `${plan.id}#${li}`,
        planId: plan.id,
        lineIndex: li,
        openingId: plan.openingId,
        title: line.title ?? plan.title,
        color,
        moves: line.moves,
        breakSquares: [...breakSq],
        flags: { themeEmpty, promiseEnding, badFen },
        lastAnnotation: last,
      });
    }
  }
}

console.log(JSON.stringify(report, null, 2));
console.error(`\n[summary] plans=${report.totalPlans} plansWithLines=${report.plansWithLines} lines=${report.totalLines} themeEmpty=${report.themeEmptyLines} promiseEnding=${report.promiseEndingLines} offenders=${report.offenders.length}`);
