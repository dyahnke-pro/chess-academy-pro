// Gate detector: a middlegame-plan playableLine must DEMONSTRATE its plan —
// a student move must land on one of the plan's GOAL squares (an UNCONDITIONAL
// declared pawn break, or any square named in pieceManeuvers) — and it must not
// end on a bare promise. The disease (David 2026-05-25): "Dutch Leningrad: The
// Kingside Storm" played d5/Na6/Rb1/Bd7 (zero storm) then PROMISED the storm.
// Conditional breaks ("…c5 only if", "avoid loosening", "the passed c3-pawn")
// are NOT required — forcing them would be wrong content; those plans are
// demonstrated via their maneuvers instead. Read-only; --json writes the report.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const dir = 'src/data';
const plans = JSON.parse(readFileSync(`${dir}/middlegame-plans.json`, 'utf8'));
const colorMap = {};
for (const f of ['repertoire.json', 'pro-repertoires.json']) {
  try { for (const o of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))) if (o?.id && o?.color) colorMap[o.id] = o.color; } catch {}
}

const SQUARE = /([a-h][1-8])/g;
const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small)\b/i;

function squares(s) { const out = new Set(); if (typeof s === 'string') { let m; SQUARE.lastIndex = 0; while ((m = SQUARE.exec(s)) !== null) out.add(m[1]); } return out; }

export function goalSquares(plan) {
  const out = new Set();
  for (const pb of plan.pawnBreaks ?? []) { const s = typeof pb === 'string' ? pb : pb?.move; if (typeof s === 'string' && !COND.test(s)) for (const q of squares(s)) out.add(q); }
  for (const pm of plan.pieceManeuvers ?? []) { for (const q of squares(typeof pm === 'string' ? pm : (pm?.move ?? pm?.route))) out.add(q); }
  return out;
}

export function findOffenders() {
  const offenders = [];
  for (const plan of plans) {
    const color = colorMap[plan.openingId] ?? null;
    const sc = color === 'black' ? 'b' : color === 'white' ? 'w' : null;
    const goals = goalSquares(plan);
    const lines = plan.playableLines ?? [];
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      let demo = false, bad = false;
      try {
        const c = new Chess(line.fen);
        for (const san of line.moves) {
          const mover = c.turn(); let mv;
          try { mv = c.move(san); } catch { bad = true; break; }
          if ((sc ? mover === sc : true) && goals.has(mv.to)) demo = true;
        }
      } catch { bad = true; }
      const anns = line.annotations ?? [];
      const last = anns.length ? anns[anns.length - 1] : '';
      const promise = PROMISE.test(last);
      const themeEmpty = goals.size > 0 && !demo && !bad;
      if (themeEmpty || promise || bad) {
        offenders.push({ key: `${plan.id}#${li}`, planId: plan.id, lineIndex: li, openingId: plan.openingId, title: line.title ?? plan.title, goals: [...goals], flags: { themeEmpty, promise, bad }, moves: line.moves, lastAnnotation: last });
      }
    }
  }
  return offenders;
}

const offenders = findOffenders();
const report = { totalLines: plans.reduce((n, p) => n + (p.playableLines?.length ?? 0), 0), offenders };
if (process.argv.includes('--json')) writeFileSync('/tmp/plan-themes.json', JSON.stringify(report, null, 2));
const byO = {}; for (const o of offenders) byO[o.openingId] = (byO[o.openingId] || 0) + 1;
console.error(`[summary] lines=${report.totalLines} offenders=${offenders.length} (promise=${offenders.filter((o) => o.flags.promise).length})`);
console.error(Object.entries(byO).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
