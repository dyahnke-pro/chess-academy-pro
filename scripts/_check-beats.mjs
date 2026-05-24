// Throwaway validator for hand-authored Italian beats. Mirrors the gate
// logic (lessonIntegrity arrow sight-line, narrationAccuracy hyphen claims,
// narrationGrounding endpoints-named, wlpp sayShort ≤8w, DB anchor, depth).
// Usage: node scripts/_check-beats.mjs <beatsfile.json>
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';

const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'));
const prefixes = new Set();
for (const e of db) { if (!e?.pgn) continue; const ms = e.pgn.split(' '); for (let k = 1; k <= ms.length; k++) prefixes.add(ms.slice(0, k).join(' ')); }
function anchor(sans) { const c = new Chess(); const clean = []; for (const m of sans) { try { clean.push(c.move(m).san); } catch { break; } } for (let k = clean.length; k >= 1; k--) if (prefixes.has(clean.slice(0, k).join(' '))) return k; return 0; }

function fr(sq) { return [sq.charCodeAt(0) - 97, +sq[1] - 1]; }
function clearRay(c, from, to) { const [ff, frr] = fr(from), [tf, tr] = fr(to); const df = Math.sign(tf - ff), dr = Math.sign(tr - frr); let f = ff + df, r = frr + dr; while (f !== tf || r !== tr) { if (c.get(String.fromCharCode(97 + f) + (r + 1))) return false; f += df; r += dr; } return true; }
function sees(c, from, to) { const pc = c.get(from); if (!pc) return 'EMPTY'; if (pc.type === 'p') return 'PAWN'; const [ff, frr] = fr(from), [tf, tr] = fr(to); const adf = Math.abs(tf - ff), adr = Math.abs(tr - frr); let ok = false; switch (pc.type) { case 'n': ok = (adf === 1 && adr === 2) || (adf === 2 && adr === 1); break; case 'b': ok = adf === adr && adf > 0 && clearRay(c, from, to); break; case 'r': ok = ((adf === 0) !== (adr === 0)) && clearRay(c, from, to); break; case 'q': ok = (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to); break; case 'k': ok = adf <= 1 && adr <= 1; break; } return ok ? 'OK' : 'BLOCKED'; }

const SQUARE_RE = /\b([a-h][1-8])\b/g;
const PIECE_SAN_RE = /\b[NBRQK][a-h]?[1-8]?x?([a-h][1-8])/g;
const PAWN_CAP_RE = /\b[a-h]x([a-h][1-8])/g;
function named(text) { const o = new Set(); for (const m of text.matchAll(PIECE_SAN_RE)) o.add(m[1]); for (const m of text.matchAll(PAWN_CAP_RE)) o.add(m[1]); for (const m of text.matchAll(SQUARE_RE)) o.add(m[1]); return o; }
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;
const LET = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
function facts(moves) { const c = new Chess(); const s = new Set(); const snap = () => { for (const row of c.board()) for (const sq of row) if (sq) s.add(sq.square + ':' + sq.type); }; snap(); for (const m of moves) { try { c.move(m); } catch { break; } snap(); } return s; }

const lessons = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
let errs = 0;
for (const lesson of lessons) {
  let deepest = 0;
  let bestAnchor = 0;
  for (const beat of lesson.beats) {
    const moves = beat.moves.trim().split(/\s+/);
    deepest = Math.max(deepest, moves.length);
    bestAnchor = Math.max(bestAnchor, anchor(moves));
    const c = new Chess();
    for (const m of moves) { const b = c.fen(); try { c.move(m); } catch {} if (c.fen() === b) { console.log(`[${lesson.title}] ${beat.id}: ILLEGAL ${m}`); errs++; break; } }
    const txt = `${beat.say} ${beat.sayShort ?? ''}`;
    const nm = named(txt);
    for (const a of beat.arrows ?? []) { const v = sees(c, a.from, a.to); if (v !== 'OK') { console.log(`[${lesson.title}] ${beat.id}: ARROW ${a.from}->${a.to} ${v}`); errs++; } if (!nm.has(a.to)) { console.log(`[${lesson.title}] ${beat.id}: arrow endpoint ${a.to} NOT NAMED`); errs++; } }
    for (const h of beat.highlights ?? []) { if (!nm.has(h.square)) { console.log(`[${lesson.title}] ${beat.id}: highlight ${h.square} NOT NAMED`); errs++; } }
    const f = facts(moves);
    for (const m of txt.matchAll(CLAIM_RE)) { const key = m[1].toLowerCase() + ':' + LET[m[2].toLowerCase()]; if (!f.has(key)) { console.log(`[${lesson.title}] ${beat.id}: CLAIM ${m[1]}-${m[2]} ungrounded`); errs++; } }
    if ((beat.arrows?.length ?? 0) + (beat.highlights?.length ?? 0) === 0 && nm.size > 0) { console.log(`[${lesson.title}] ${beat.id}: names squares but NO marker`); errs++; }
    if (beat.say && !beat.sayShort) { console.log(`[${lesson.title}] ${beat.id}: say without sayShort`); errs++; }
    if (beat.sayShort) { const w = beat.sayShort.split(/\s+/).filter(x => !/^[—–-]+$/.test(x)).length; if (w > 8) { console.log(`[${lesson.title}] ${beat.id}: sayShort ${w}w >8 : "${beat.sayShort}"`); errs++; } }
  }
  const kind = lesson._out === 'trap' ? 'trap' : (lesson.kind ?? 'variation');
  if (kind !== 'trap' && kind !== 'roadmap' && deepest < 20) { console.log(`[${lesson.title}] DEPTH ${deepest} <20`); errs++; }
  if (bestAnchor < 6) { console.log(`[${lesson.title}] ANCHOR ${bestAnchor} <6`); errs++; }
  console.log(`[${lesson.title}] depth=${deepest} anchor=${bestAnchor} beats=${lesson.beats.length}`);
}
console.log(errs === 0 ? 'ALL CLEAN' : `${errs} ERRORS`);
