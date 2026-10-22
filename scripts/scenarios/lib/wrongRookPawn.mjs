// The wrong rook pawn — shared facts for the Lane R builder and its proof.
// chess.js only.
//
// A rook pawn whose promotion square the attacker's bishop can never cover
// (the square is the other colour). THE FORTRESS: once the defending king
// stands in the corner zone — the promotion square or a square next to it —
// the attacker can never win. `proveFortress` checks it EXHAUSTIVELY, every
// legal placement, all four orientations (pawn on the a- or h-file, attacker
// White or Black), with and without the bishop:
//
//   for every placement with the defender's king in the zone and the attacker
//   to move, and for every attacker move, the defender is not mated and
//   either the game is drawn on the spot (stalemate, bare material) or the
//   defender has a legal reply that keeps its king in the zone — capturing
//   a promoted piece counts. Induction then closes it: the zone is never left,
//   so the pawn never promotes safely and no mate ever comes.
import { Chess } from 'chess.js';
import { cheb, sq } from './board.mjs';

/** The promotion square of a rook pawn on `file` (0 = a, 7 = h) for `attacker`. */
export const cornerOf = (file, attacker) => sq(file, attacker === 'w' ? 7 : 0);
/** A square's colour: true = light (a1 is dark). */
export const isLight = (s) => ((s.charCodeAt(0) - 97) + (Number(s[1]) - 1)) % 2 === 1;
/** The squares of the corner zone: the promotion square and its neighbours. */
export function zoneOf(corner) {
  const out = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if (cheb(sq(f, r), corner) <= 1) out.push(sq(f, r));
  return out;
}

function place(chess, s, type, color) {
  return chess.put({ type, color }, s);
}

/**
 * Every placement with the defender's king in the zone, attacker to move:
 * attacker king anywhere, bishop on any square of the wrong colour (or none),
 * the rook pawn on its 2nd–7th rank. Returns the proof's counts and the first
 * few failures (there must be none).
 */
export function proveFortress(file, attacker) {
  const defender = attacker === 'w' ? 'b' : 'w';
  const corner = cornerOf(file, attacker);
  const zone = new Set(zoneOf(corner));
  const wrongLight = !isLight(corner);
  const all = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) all.push(sq(f, r));
  const bishopSquares = [null, ...all.filter((s) => isLight(s) === wrongLight)];
  const pawnSquares = [1, 2, 3, 4, 5, 6].map((r) => sq(file, attacker === 'w' ? r : 7 - r));
  let states = 0; let attackerMoves = 0;
  const failures = [];
  for (const dk of zone) for (const ak of all) for (const b of bishopSquares) for (const p of pawnSquares) {
    const used = [dk, ak, b, p].filter(Boolean);
    if (new Set(used).size !== used.length || cheb(dk, ak) <= 1) continue;
    const c = new Chess();
    c.clear();
    place(c, dk, 'k', defender); place(c, ak, 'k', attacker); place(c, p, 'p', attacker);
    if (b) place(c, b, 'b', attacker);
    const fen = `${c.fen().split(' ')[0]} ${attacker} - - 0 1`;
    let s;
    try { s = new Chess(fen); } catch { continue; }
    // The side not to move (the defender) must not be in check.
    if (s.isAttacked(dk, attacker)) continue;
    if (s.isGameOver()) continue;
    states++;
    for (const m of s.moves({ verbose: true })) {
      attackerMoves++;
      s.move(m);
      const replies = s.moves({ verbose: true });
      let ok;
      if (replies.length === 0) ok = !s.inCheck(); // stalemate draws; mate fails
      else if (s.isInsufficientMaterial()) ok = true; // bare material draws
      else ok = replies.some((reply) => zone.has(reply.to));
      if (!ok && failures.length < 5) failures.push(`${fen} ${m.san}`);
      s.undo();
    }
  }
  return { file: 'abcdefgh'[file], attacker, corner, states, attackerMoves, failures };
}
