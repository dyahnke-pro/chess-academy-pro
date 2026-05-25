// Gate-safe authoring harness for middlegame-plan playableLines.
// Reads patches from scripts/plan-line-patches.mjs (array of {key, moves, full,
// short, yellow?, arrows?}) and rewrites the matching playableLine so it:
//   • plays one of the plan's declared pawn breaks (theme-hit, chess.js-verified)
//   • never ends on a bare promise
//   • carries lead-the-eye highlights (ORANGE = the move's two squares, auto-
//     generated so they can't be wrong; YELLOW = a named key square) + optional
//     piece-only vision arrows (validated with the SAME sees() the gate uses)
// If a patch fails any check it is REJECTED (printed) and NOT applied — so an
// unsound/ungrounded line can never silently ship. Run: node scripts/apply-plan-line-patches.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { patches } from './plan-line-patches.mjs';

const dir = 'src/data';
const plans = JSON.parse(readFileSync(`${dir}/middlegame-plans.json`, 'utf8'));
const colorMap = {};
for (const f of ['repertoire.json', 'pro-repertoires.json']) {
  try { for (const o of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))) if (o?.id && o?.color) colorMap[o.id] = o.color; } catch {}
}
const byId = Object.fromEntries(plans.map((p) => [p.id, p]));

const SQUARE = /([a-h][1-8])/g;
const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small)\b/i;
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const YELLOW = 'rgba(255, 235, 59, 0.5)';
const GREEN = 'rgba(34, 197, 94, 0.85)';

function squaresIn(s) { const out = []; if (typeof s === 'string') { let m; SQUARE.lastIndex = 0; while ((m = SQUARE.exec(s)) !== null) out.push(m[1]); } return out; }
// Goal squares = unconditional declared breaks ∪ pieceManeuver squares (matches
// the gate in middlegamePlanThemes.test.ts). A line "demonstrates its plan"
// when a student move lands on one of these.
function goalSquares(plan) {
  const out = new Set();
  for (const pb of plan.pawnBreaks ?? []) { const s = typeof pb === 'string' ? pb : pb?.move; if (typeof s === 'string' && !COND.test(s)) for (const q of squaresIn(s)) out.add(q); }
  for (const pm of plan.pieceManeuvers ?? []) { for (const q of squaresIn(typeof pm === "string" ? pm : (pm?.move ?? pm?.route))) out.add(q); }
  return out;
}
function annotationSquares(text) {
  const out = new Set();
  for (const m of (text ?? '').matchAll(/\b([NBRQK])([a-h][1-8])\b/g)) out.add(m[2]);
  for (const m of (text ?? '').matchAll(/\b([a-h][1-8])\b/g)) out.add(m[1]);
  return out;
}
const fileRank = (sq) => [sq.charCodeAt(0) - 97, +sq[1] - 1];
function clearRay(c, from, to) {
  const [ff, fr] = fileRank(from); const [tf, tr] = fileRank(to);
  const df = Math.sign(tf - ff), dr = Math.sign(tr - fr); let f = ff + df, r = fr + dr;
  while (f !== tf || r !== tr) { if (c.get(String.fromCharCode(97 + f) + (r + 1))) return false; f += df; r += dr; }
  return true;
}
function sees(c, from, to) {
  if (from === to) return false; const pc = c.get(from); if (!pc) return false;
  const [ff, fr] = fileRank(from); const [tf, tr] = fileRank(to);
  const adf = Math.abs(tf - ff), adr = Math.abs(tr - fr);
  switch (pc.type) {
    case 'n': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'b': return adf === adr && adf > 0 && clearRay(c, from, to);
    case 'r': return ((adf === 0) !== (adr === 0)) && clearRay(c, from, to);
    case 'q': return (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to);
    case 'k': return adf <= 1 && adr <= 1 && (adf > 0 || adr > 0);
    default: return false;
  }
}

let applied = 0; const rejected = [];
for (const p of patches) {
  const [pid, idxS] = p.key.split('#'); const idx = +idxS;
  const plan = byId[pid];
  const reject = (why) => { rejected.push(`${p.key}: ${why}`); };
  if (!plan) { reject('plan not found'); continue; }
  const line = (plan.playableLines ?? [])[idx];
  if (!line) { reject('line index not found'); continue; }
  const color = colorMap[plan.openingId] ?? null;
  const studentChar = color === 'black' ? 'b' : color === 'white' ? 'w' : null;
  const brk = goalSquares(plan);

  if (p.full.length !== p.moves.length) { reject(`full annotations ${p.full.length} != moves ${p.moves.length}`); continue; }
  if (p.short.length !== p.moves.length) { reject(`short cues ${p.short.length} != moves ${p.moves.length}`); continue; }

  const c = new Chess(line.fen);
  const mvs = []; let bad = false; let themeHit = false;
  for (const san of p.moves) {
    const mover = c.turn(); let mv;
    try { mv = c.move(san); } catch { reject(`illegal move ${san} after ${mvs.map((m) => m.san).join(' ')}`); bad = true; break; }
    mvs.push(mv);
    if ((studentChar ? mover === studentChar : true) && brk.has(mv.to)) themeHit = true;
  }
  if (bad) continue;
  if (brk.size > 0 && !themeHit) { reject(`student move lands on no goal square (${[...brk].join(',')})`); continue; }
  if (PROMISE.test(p.full[p.full.length - 1])) { reject(`final annotation is a promise: "${p.full[p.full.length - 1]}"`); continue; }

  // Build highlights + validate arrows against the post-move position per ply.
  const cc = new Chess(line.fen);
  const highlights = []; const arrows = []; let arrowBad = false;
  for (let i = 0; i < p.moves.length; i++) {
    const mv = cc.move(p.moves[i]);
    const named = annotationSquares(p.full[i]);
    const row = [{ square: mv.from, color: ORANGE }, { square: mv.to, color: ORANGE }];
    for (const y of (p.yellow?.[i] ?? [])) {
      if (!named.has(y)) { reject(`yellow ${y} (move ${i}) not named in annotation`); arrowBad = true; break; }
      row.push({ square: y, color: YELLOW });
    }
    if (arrowBad) break;
    highlights.push(row);
    const arow = [];
    for (const a of (p.arrows?.[i] ?? [])) {
      if (!sees(cc, a.from, a.to)) { reject(`arrow ${a.from}->${a.to} (move ${i}) not a legal sight-line`); arrowBad = true; break; }
      if (!(named.has(a.from) || a.from === mv.to)) { reject(`arrow origin ${a.from} (move ${i}) not named`); arrowBad = true; break; }
      if (!named.has(a.to)) { reject(`arrow target ${a.to} (move ${i}) not named`); arrowBad = true; break; }
      arow.push({ from: a.from, to: a.to, color: GREEN });
    }
    if (arrowBad) break;
    arrows.push(arow);
  }
  if (arrowBad) continue;

  line.moves = p.moves;
  line.annotations = p.full;
  line.learnCues = p.short;
  line.arrows = arrows;
  line.highlights = highlights;
  applied++;
}

if (rejected.length) { console.log(`\nREJECTED ${rejected.length}:`); for (const r of rejected) console.log('  ✗', r); }
if (applied > 0) { writeFileSync(`${dir}/middlegame-plans.json`, JSON.stringify(plans, null, 2) + '\n'); }
console.log(`\napplied ${applied} / ${patches.length} patches${rejected.length ? `, ${rejected.length} rejected (NOT written)` : ''}`);
process.exit(rejected.length ? 1 : 0);
