// PLAY-THROUGH CORRECTNESS audit for every Samay lesson (main + variation).
// Replays EVERY beat move-by-move and verifies, at the beat's real board:
//   1. every move is chess.js-legal (the line actually plays),
//   2. every ARROW originates on a real piece, is not from a pawn (green
//      vision-arrow rule), and is a geometrically valid line for some piece,
//   3. every NARRATION board-claim matches — hyphen form ("the d5-knight") AND
//      prose form ("the knight on d5" / "the e4-pawn" / "bishop on c4"),
//   4. every HIGHLIGHT square is either a square the move touched or a square
//      the narration names (lead-the-eye).
// Reports REAL per-beat mismatches. This is the "arrows correct + narration
// matches" check the mount/voice runtime audit can't give.
import { Chess } from 'chess.js';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const o = join(tmpdir(), `lc-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(o);
const samay = getAllLessonScripts().filter(({ key, lesson }) => key.includes('samay') || (lesson.openingId || '').includes('samay'));

const PL = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const HYPHEN = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;
const PROSE = /\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;
// "the e4-pawn" already covered by HYPHEN; also catch "e4 pawn"/"e4-square" lightly
function fileRankSeq(from, to) {
  // is to reachable from from along a straight/diagonal/knight line (geometry only)
  const df = to.charCodeAt(0) - from.charCodeAt(0), dr = to.charCodeAt(1) - from.charCodeAt(1);
  const adf = Math.abs(df), adr = Math.abs(dr);
  if (df === 0 && dr === 0) return false;
  return adf === adr || df === 0 || dr === 0 || (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
}

let beats = 0, arrowsChecked = 0, claimsChecked = 0;
const fails = [];
const F = (m) => fails.push(m);

for (const { key, lesson } of samay) {
  for (const beat of lesson.beats) {
    beats++;
    const c = new Chess();
    let ok = true;
    for (const m of beat.moves) { try { c.move(m); } catch { F(`${key}/${beat.id}: ILLEGAL move "${m}"`); ok = false; break; } }
    if (!ok) continue;
    // arrows render on the FINAL board (what's displayed); narration may speak
    // in past/future tense across the line, so ground narration against EVERY
    // frame (start + after each move) like proRepNarrationAccuracy.
    const board = c.board();
    const at = (sq) => { const f = sq.charCodeAt(0) - 97, r = 8 - Number(sq[1]); const p = board[r]?.[f]; return p ? p.type : null; };
    const frameFacts = new Set();
    { const cc = new Chess(); const snap = () => { for (const row of cc.board()) for (const sq of row) if (sq) frameFacts.add(`${sq.square}:${sq.type}`); }; snap(); for (const m of beat.moves) { try { cc.move(m); } catch { break; } snap(); } }
    const claimOk = (sq, piece) => frameFacts.has(`${sq}:${piece}`);
    // 2. arrows
    for (const a of (beat.arrows || [])) {
      const from = a.from, to = a.to;
      if (!from || !to) continue;
      arrowsChecked++;
      const pc = at(from);
      if (!pc) F(`${key}/${beat.id}: arrow ${from}->${to} from EMPTY square`);
      else if (pc === 'p') F(`${key}/${beat.id}: green arrow from PAWN ${from} (rule: never from a pawn)`);
      else if (!fileRankSeq(from, to)) F(`${key}/${beat.id}: arrow ${from}->${to} is not a valid piece line`);
    }
    // 3. narration claims (both registers of text)
    const text = `${beat.say || ''} ${beat.sayShort || ''}`;
    const seen = new Set();
    for (const m of text.matchAll(HYPHEN)) {
      const sq = m[1].toLowerCase(), piece = PL[m[2].toLowerCase()]; const k = sq + piece;
      if (seen.has(k)) continue; seen.add(k); claimsChecked++;
      if (!claimOk(sq, piece)) F(`${key}/${beat.id}: narration "${m[0]}" never matches the board in this line`);
    }
    for (const m of text.matchAll(PROSE)) {
      const sq = m[2].toLowerCase(), piece = PL[m[1].toLowerCase()]; const k = 'p' + sq + piece;
      if (seen.has(k)) continue; seen.add(k); claimsChecked++;
      if (!claimOk(sq, piece)) F(`${key}/${beat.id}: narration "${m[0]}" never matches the board in this line`);
    }
    // 4. highlights should be a move square or a square the narration names
    const moveSquares = new Set();
    { const cc = new Chess(); for (const mv of beat.moves) { const r = cc.move(mv); if (r) { moveSquares.add(r.from); moveSquares.add(r.to); } } }
    // squares named in the narration — bare ("d5", "d5-pawn") AND embedded in a
    // SAN token ("Nf5" names f5, "Bxd3" names d3) so a planned move counts.
    const namedSquares = new Set([
      ...[...text.matchAll(/([a-h][1-8])/g)].map((x) => x[1].toLowerCase()),
    ]);
    // arrow endpoints are valid lead-the-eye anchors: a highlight on an arrow's
    // from/to square points the eye where the arrow leads.
    const arrowSquares = new Set();
    for (const a of (beat.arrows || [])) { if (a.from) arrowSquares.add(a.from); if (a.to) arrowSquares.add(a.to); }
    // blue/context (SOFT) highlights are a sanctioned context affordance and do
    // not need to be named — only yellow KEY highlights carry the "narration
    // names this square" contract.
    const isContext = (h) => typeof h.color === 'string' && /80\s*,\s*140\s*,\s*255/.test(h.color);
    for (const h of (beat.highlights || [])) {
      const sq = h.square; if (!sq || isContext(h)) continue;
      if (!moveSquares.has(sq) && !namedSquares.has(sq) && !arrowSquares.has(sq)) {
        // advisory only — not all highlights must be named; report as soft
        F(`${key}/${beat.id}: KEY highlight ${sq} not a move square, arrow endpoint, nor named in narration (ADVISORY)`);
      }
    }
  }
}

const hard = fails.filter((f) => !f.includes('ADVISORY'));
const soft = fails.filter((f) => f.includes('ADVISORY'));
console.log(`\n=== SAMAY PLAY-THROUGH CORRECTNESS ===`);
console.log(`lessons: ${samay.length} | beats replayed: ${beats} | arrows checked: ${arrowsChecked} | narration claims checked: ${claimsChecked}`);
console.log(`HARD failures (illegal move / arrow-on-empty / arrow-from-pawn / narration mismatch): ${hard.length}`);
for (const f of hard) console.log('  ✗ ' + f);
console.log(`ADVISORY (highlight not move/named): ${soft.length}`);
for (const f of soft.slice(0, 20)) console.log('  · ' + f.replace(' (ADVISORY)', ''));
console.log(hard.length === 0 ? '\n✅ every beat plays legally; every arrow on a real non-pawn piece; every narration board-claim matches' : `\n❌ ${hard.length} hard correctness failures`);
