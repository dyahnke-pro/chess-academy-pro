// Board-truth column for the tape: an INDEPENDENT check of the claims that can
// be read straight off the board (not the grader Learn already ran). A line is
// TRUE when every checkable claim in it holds on the board after the student's
// move or after the reply; FALSE when one fails on both; UNCHECKED when it
// makes no claim this reader parses.
//   node scripts/scoreboard/board-truth.mjs <tape.json> <games.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const [TAPE, GAMES, OUT] = process.argv.slice(2);
const tape = JSON.parse(readFileSync(TAPE, 'utf8'));
const games = new Map(JSON.parse(readFileSync(GAMES, 'utf8')).map((g) => [g.id.replace(/^naro-/, ''), g]));
const PIECE = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const files = 'abcdefgh';

function board(fen) { return new Chess(fen); }
function at(c, sq) { return c.get(sq); }
function pawnsOn(c, file, color) { const out = []; for (let r = 1; r <= 8; r++) { const p = c.get(`${file}${r}`); if (p && p.type === 'p' && (!color || p.color === color)) out.push(r); } return out; }
function passed(c, sq, color) {
  const f = files.indexOf(sq[0]); const r = Number(sq[1]); const dir = color === 'w' ? 1 : -1;
  for (const df of [-1, 0, 1]) { const ff = files[f + df]; if (!ff) continue; for (const rr of pawnsOn(c, ff, color === 'w' ? 'b' : 'w')) if ((rr - r) * dir > 0) return false; }
  return true;
}
function isolated(c, sq, color) { const f = files.indexOf(sq[0]); return [files[f - 1], files[f + 1]].filter(Boolean).every((ff) => pawnsOn(c, ff, color).length === 0); }
function hole(c, sq, forColor /* the side that would sit there */) {
  // No pawn of the OTHER side can ever attack sq: none on adjacent files behind it (from that side's view).
  const enemy = forColor === 'w' ? 'b' : 'w'; const f = files.indexOf(sq[0]); const r = Number(sq[1]);
  for (const df of [-1, 1]) { const ff = files[f + df]; if (!ff) continue; for (const rr of pawnsOn(c, ff, enemy)) if (enemy === 'b' ? rr > r : rr < r) return false; }
  return true;
}

// Each check returns true / false, or null when the claim does not parse here.
function checks(textIn, c, student) {
  const res = [];
  // A sentence that starts "After X, Y, Z," (or "moving … would") is about the
  // board at the END of a line, not this one — out of scope for a board read.
  const text = textIn.split(/(?<=[.!?])\s+/).filter((s) => !/^(After |If |Then )/.test(s) && !/\bwould unveil\b/.test(s)).join(' ');
  const me = student; const them = student === 'w' ? 'b' : 'w';
  const who = (w) => (/^(your|you)$/i.test(w) ? me : /^(their|they)$/i.test(w) ? them : null);
  for (const m of text.matchAll(/\b(your|their)\s+(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])/gi)) {
    const p = at(c, m[3]); res.push(!!p && p.type === PIECE[m[2].toLowerCase()] && p.color === who(m[1]));
  }
  for (const m of text.matchAll(/\bthe\s+([a-h])-file\s+is\s+(half-open|open)/gi)) {
    const w = pawnsOn(c, m[1], 'w').length; const b = pawnsOn(c, m[1], 'b').length;
    res.push(m[2].toLowerCase() === 'open' ? w + b === 0 : (w === 0) !== (b === 0));
  }
  for (const m of text.matchAll(/\b(?:(your|their)\s+)?passed pawn on ([a-h][1-8])/gi)) {
    const p = at(c, m[2]); const col = m[1] ? who(m[1]) : p?.color; res.push(!!p && p.type === 'p' && p.color === col && passed(c, m[2], col));
  }
  for (const m of text.matchAll(/\bisolated pawn on ([a-h][1-8])/gi)) { const p = at(c, m[1]); res.push(!!p && p.type === 'p' && isolated(c, m[1], p.color)); }
  for (const m of text.matchAll(/\b([a-h][1-8]) is a hole in (their|your) camp/gi)) { const owner = who(m[2]); res.push(hole(c, m[1], owner === me ? them : me)); }
  return res;
}

const stats = { lines: 0, checked: 0, trueL: 0, falseL: 0 }; const falses = [];
for (const [id, r] of Object.entries(tape)) {
  const g = games.get(id); if (!g) continue;
  const student = g.white === g.us ? 'w' : 'b';
  const sans = g.moves ? g.moves.split(' ') : g.plies.map((p) => p.san).filter(Boolean);
  for (const [p, lines] of Object.entries(r.plies)) {
    const ply = Number(p); const c0 = new Chess(); const c1 = new Chess(); const c2 = new Chess();
    try { for (let i = 0; i < ply - 1; i++) c0.move(sans[i]); for (let i = 0; i < ply; i++) c1.move(sans[i]); for (let i = 0; i < Math.min(ply + 1, sans.length); i++) c2.move(sans[i]); } catch { continue; }
    for (const l of lines) {
      stats.lines++;
      const z = checks(l, c0, student); const a = checks(l, c1, student); const b = checks(l, c2, student);
      if (!a.length) continue; stats.checked++;
      const ok = z.every(Boolean) || a.every(Boolean) || b.every(Boolean);
      if (ok) stats.trueL++; else { stats.falseL++; falses.push({ id, ply, line: l, fenAfterReply: c2.fen() }); }
    }
  }
}
console.log(`spoken lines ${stats.lines}; with a checkable claim ${stats.checked}; TRUE ${stats.trueL}, FALSE ${stats.falseL} (${(100 * stats.trueL / Math.max(1, stats.checked)).toFixed(1)}% of checked)`);
for (const f of falses.slice(0, 15)) console.log(`FALSE ${f.id}:${f.ply} ${f.line}\n   ${f.fenAfterReply}`);
if (OUT) writeFileSync(OUT, JSON.stringify({ stats, falses }));
