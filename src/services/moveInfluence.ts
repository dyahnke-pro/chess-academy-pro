// moveInfluence — WHAT A MOVE NOW DOES: the moved piece's new pressure from
// the square it landed on (moved out of reviewFullData so the one registry,
// `boardComputers`, reads it without importing the surface that says it).
import { Chess, type Color } from 'chess.js';
import { squareRole } from './squareRole';
import { andList } from '../utils/andList';

function pieceWord(p: string): string {
  return ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[p.toLowerCase()] ?? 'piece';
}

/** The loose tail `describeMoveInfluence` closes an attack with, every
 *  rotation of it. ONE pattern for the producer and the walk's loose-piece
 *  habit, which swaps the tail for "that's the second piece …" (the habit's
 *  hand copy of the old "— nothing guards it" wording stopped matching when
 *  the line was reworded, and the habit went silent with every test green). */
export const INFLUENCE_LOOSE_TAIL_RE = /, (?:and nothing guards [^.,]+|and [^.,]+ (?:has no guard|is loose)|which (?:has no guard|is loose))(?=\.)/;

/** The moved piece's influence from its NEW square: enemy pieces it now eyes,
 *  central squares it now fights for, own pieces it now guards. Pure chess.js
 *  (attackers()) — the quiet-move beat that gives EVERY ply its own computed
 *  content (David 2026-07-22). Null when the move creates none of the three. */
export function describeMoveInfluence(fenBefore: string, fenAfter: string, san: string, squaresOut?: string[], shapeOut?: { hitsPiece: boolean; loose?: string }): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(san.replace(/[?!]+$/, ''));
    if (!mv) return null;
    const a = new Chess(fenAfter);
    const to = mv.to;
    const pc = a.get(to);
    if (!pc) return null;
    const enemyWB: Color = pc.color === 'w' ? 'b' : 'w';
    const eyes: string[] = [];
    let pressed = false;
    let pressReason: { loose: boolean; target: string } | null = null;
    for (const row of a.board()) {
      for (const cell of row) {
        if (!cell || cell.square === to) continue;
        if (!a.attackers(cell.square, pc.color).includes(to)) continue;
        // Only the ENEMY targets the moved piece now eyes are teaching — a
        // fresh pressure the student should see. "guards your own pawn on d2"
        // is mechanics, not an idea (David 2026-07-23: cut the per-move filler);
        // a piece that must defend an ATTACKED friend surfaces via the
        // [loose]/count detectors instead.
        if (cell.color === enemyWB && cell.type !== 'k') {
          // PRESSURE IS WHAT TEACHES (review audit 2026-10-14: "Their pawn on d4
          // now eyes your pawn on c5." spoke alone as a teaching point). Eyeing
          // a defended piece worth no more than the eyeing one is a description.
          const IV: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
          const loose = a.attackers(cell.square, enemyWB).length === 0;
          // A KING TAKES ONLY WHAT NOTHING GUARDS (Danya Review tapes: "Their
          // king now hits your f-pawn on f3, which is worth more than the
          // king"): for a king, only a loose piece is pressure.
          const bigger = pc.type !== 'k' && (IV[cell.type] ?? 0) > (IV[pc.type] ?? 0);
          if ((loose || bigger) && !pressReason) {
            // …and the pressure says WHY it is pressure (review audit
            // 2026-10-14: the line stated the eyeing and left the reason out).
            pressReason = { loose, target: `the ${pieceWord(cell.type)} on ${cell.square}` };
            if (loose && shapeOut) shapeOut.loose = cell.square;
          }
          // Only PRESSURE is named (David 2026-10-14: a description speaks only
          // inside a reason) — "now eyes their pawn on c3" with c3 guarded was
          // said four times in one review as a bare formula.
          if (loose || bigger) {
            pressed = true;
            eyes.push(`the ${pieceWord(cell.type)} on ${cell.square}`); squaresOut?.push(cell.square);
          }
        }
      }
    }
    // A CENTRAL SQUARE IS NAMED ONLY WITH WHAT IT IS FOR (squareRole):
    // "fights for d5" alone was scenery said on ~20 plies; "fights for d5,
    // holding back their d-pawn" is the reason the square matters.
    const fights: string[] = [];
    for (const sq of ['d4', 'e4', 'd5', 'e5'] as const) {
      if (sq === to || a.get(sq)) continue;
      if (!a.attackers(sq, pc.color).includes(to)) continue;
      const role = squareRole(a, sq, pc.color, 'the', 'covers');
      if (!role) continue;
      fights.push(`${sq}, ${role}`); squaresOut?.push(sq);
      break;
    }
    // The moved piece's own square leads the set — the same geometry the
    // opponent read (`[opp-target]`) couples, so the selector can prove the
    // two lines are ONE claim (walk 5, 2026-09-23: "Their knight on c3 now
    // fights for d5. Your opponent's knight steps in eyeing d5" on every ply).
    squaresOut?.unshift(to);
    // ROTATED, keyed on the square it lands on and the move number (stable,
    // never Math.random): "now fights for d5" was one formula said three
    // times in a review, and "eyes" was the stock verb (the human voice,
    // David 2026-11-08: players' words, attacks / hits).
    const turnKey = to.charCodeAt(0) + Number(to[1]) + Number(fenAfter.split(' ')[5] ?? 0);
    const eyeVerb = ['attacks', 'hits'][turnKey % 2];
    const fightVerb = ['fights for', 'joins the fight for', 'adds its weight to'][turnKey % 3];
    const attack = eyes.length ? `${eyeVerb} ${andList(eyes)}` : null;
    const fight = fights.length ? `${fightVerb} ${andList(fights)}` : null;
    if (!attack && !fight) return null;
    if (shapeOut) shapeOut.hitsPiece = pressed;
    // The one piece it attacks is said once, then carried by the clause
    // ("now attacks their bishop, which has no guard"); named again only
    // beside a second target. No dash: one idea, then what it means.
    const one = eyes.length === 1 && pressReason && eyes[0] === pressReason.target;
    const tgt = one ? 'it' : pressReason?.target;
    const looseWords = one
      ? [', and nothing guards it', ', which has no guard', ', which is loose'][turnKey % 3]
      : [`, and nothing guards ${tgt}`, `, and ${tgt} has no guard`, `, and ${tgt} is loose`][turnKey % 3];
    const why = !pressReason ? ''
      : pressReason.loose ? looseWords
        : one ? `, which is worth more than the ${pieceWord(pc.type)}` : `, and ${tgt} is worth more than the ${pieceWord(pc.type)}`;
    const lead = `The ${pieceWord(pc.type)} on ${to} now`;
    // The reason rides its attack, never the clause after it ("adds its
    // weight to d5, keeping your rook on d8 off it, which is loose" pinned
    // the loose bishop on the rook): the fight is its own sentence then.
    if (attack && fight) return why ? `${lead} ${attack}${why}. It also ${fight}.` : `${lead} ${attack} and ${fight}.`;
    return `${lead} ${attack ?? fight}${why}.`;
  } catch {
    return null;
  }
}
