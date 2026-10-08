// planJudgement — the batch-6 PLAN judgements, each read off an engine line
// handed in by the surface (never searched here): right idea, wrong piece; keep
// the plan, change the route; the plan over the one-move shot; a placement
// judged by its future line; small edges piling up; and the fighting line
// versus the peaceful one.
//
// The engine supplies the lines; every claim made about them is checked with
// chess.js (the same piece, the same square, the scope counted) and carries
// the line it rests on as its proof — said short, never recited as fact (an
// engine proof is not exact). Pure.
import type { Color, Square } from 'chess.js';
import { legalLineProof, type Proof } from './proof';
import { costStakes } from './factStakes';
import { andList } from '../utils/andList';
import { CENTRAL_SQUARES } from './keySquares';
import {
  type StructureRead, PIECE_NOUN, board, play, piecesOf, other, fileIdx, rankNum,
  scope, uciToSans, bare,
} from './structureJudgementKit';

/** RIGHT IDEA, WRONG PIECE — the student's piece went to the square the
 *  engine wanted, but the engine sends a different piece of the same kind. */
export function rightIdeaWrongPiece(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): StructureRead | null {
  if (!bestSan || cpLoss < 30) return null;
  const r = play(fenBefore, san);
  const b = play(fenBefore, bestSan);
  if (!r || !b) return null;
  if (r.mv.piece !== b.mv.piece || r.mv.to !== b.mv.to || r.mv.from === b.mv.from) return null;
  if (r.mv.piece === 'p' || r.mv.piece === 'k') return null;
  const noun = PIECE_NOUN[r.mv.piece];
  // What the played piece was doing from home: a piece of yours it guarded
  // that now stands attacked with no guard.
  const before = board(fenBefore);
  if (!before) return null;
  const student = r.mv.color;
  const dropped = piecesOf(r.after, student).find((q) => q !== r.mv.to
    && r.after.get(q)?.type !== 'k'
    && before.attackers(q, student).includes(r.mv.from)
    && r.after.attackers(q, student).length === 0
    && r.after.attackers(q, other(student)).length > 0);
  const proof = legalLineProof(fenBefore, [bestSan]);
  if (!proof) return null;
  const why = dropped ? ` Your ${noun} on ${r.mv.from} was guarding ${dropped}.` : '';
  return {
    act: 'right-idea-wrong-piece', squares: [r.mv.to, b.mv.from, r.mv.from], proof, key: `wrong-piece:${r.mv.to}`,
    stakes: costStakes(cpLoss) ?? undefined,
    text: `${r.mv.to} is the right square, but it is the ${b.mv.from} ${noun}'s job: ${bare(bestSan)}.${why}`,
  };
}

const knightHop = (a: string, b: string): boolean => {
  const df = Math.abs(fileIdx(a) - fileIdx(b)); const dr = Math.abs(rankNum(a) - rankNum(b));
  return (df === 1 && dr === 2) || (df === 2 && dr === 1);
};

/** KEEP THE PLAN, CHANGE THE ROUTE — the student's knight headed for a square
 *  by a road that fails; the engine's line takes the same knight to the same
 *  square by another road. */
export function keepPlanChangeRoute(
  fenBefore: string, san: string, bestUci: readonly string[], cpLoss: number, replySan: string | null,
): StructureRead | null {
  if (cpLoss < 60) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.piece !== 'n') return null;
  const pv = uciToSans(fenBefore, bestUci);
  if (pv.length < 3) return null;
  const c = board(fenBefore);
  if (!c) return null;
  let at: string = r.mv.from;
  let target: string | null = null;
  let firstHop: string | null = null;
  let upTo = 0;
  for (let i = 0; i < pv.length && i < 7; i++) {
    let mv;
    try { mv = c.move(pv[i]); } catch { break; }
    if (i % 2 === 1) { if (mv.to === at) break; continue; }
    if (mv.from !== at) { if (i === 0) return null; continue; }
    at = mv.to;
    if (firstHop === null) { firstHop = mv.to; if (firstHop === r.mv.to) return null; continue; }
    if (knightHop(r.mv.to, at) && at !== r.mv.to) { target = at; upTo = i + 1; break; }
  }
  if (!target || !firstHop) return null;
  const proof = legalLineProof(fenBefore, pv.slice(0, upTo));
  if (!proof) return null;
  const rep = replySan ? play(r.after.fen(), replySan.replace(/^…/, '')) : null;
  const fails = rep && rep.mv.to === r.mv.to ? `runs into ${rep.mv.san}` : `doesn't work here`;
  return {
    act: 'keep-plan-change-route', squares: [r.mv.to, firstHop, target], proof, key: `route:${target}`,
    stakes: costStakes(cpLoss) ?? undefined,
    text: `The knight jump to ${r.mv.to} ${fails}; that rules out the route, not the plan: it reaches ${target} through ${firstHop} instead.`,
  };
}

/** Does `san` pin an enemy piece with the moved slider (the first enemy piece
 *  on a ray, a more valuable piece or the king behind it)? */
function createsPin(fenBefore: string, san: string): boolean {
  const r = play(fenBefore, san);
  if (!r || !['b', 'r', 'q'].includes(r.mv.piece)) return false;
  const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const dirs = r.mv.piece === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
    : r.mv.piece === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
      : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const them = other(r.mv.color);
  for (const [df, dr] of dirs) {
    const hit: { type: string; color: string }[] = [];
    for (let k = 1; k < 8 && hit.length < 2; k++) {
      const f = fileIdx(r.mv.to) + df * k; const rr = rankNum(r.mv.to) + dr * k;
      if (f < 0 || f > 7 || rr < 1 || rr > 8) break;
      const p = r.after.get(`${String.fromCharCode(97 + f)}${rr}` as Square);
      if (p) hit.push(p);
    }
    if (hit.length === 2 && hit[0].color === them && hit[1].color === them && VAL[hit[1].type] > VAL[hit[0].type]) return true;
  }
  return false;
}

/** THE PLAN OVER THE ONE-MOVE SHOT — the student's check or pin cost, and the
 *  engine's quiet move takes a central square instead. */
export function planOverOneMove(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): StructureRead | null {
  if (!bestSan || cpLoss < 40 || /[x+#]/.test(bestSan) || bare(bestSan) === bare(san)) return null;
  const r = play(fenBefore, san);
  const b = play(fenBefore, bestSan);
  if (!r || !b || b.mv.piece === 'k') return null;
  const shot = /\+/.test(r.mv.san) ? 'check' : createsPin(fenBefore, san) ? 'pin' : null;
  if (!shot) return null;
  const before = board(fenBefore);
  if (!before) return null;
  const gained = CENTRAL_SQUARES.filter((s) => b.after.attackers(s as Square, b.mv.color).includes(b.mv.to)
    && !before.attackers(s as Square, b.mv.color).includes(b.mv.from));
  if (gained.length === 0) return null;
  const proof = legalLineProof(fenBefore, [bestSan]);
  if (!proof) return null;
  return {
    act: 'plan-over-one-move', squares: [r.mv.to, b.mv.to, gained[0]], proof, key: `one-move:${r.mv.to}`,
    stakes: costStakes(cpLoss) ?? undefined,
    text: `The ${shot} is a one-move idea; ${bare(bestSan)} is the plan: it adds control of ${andList(gained)}.`,
  };
}

/** A PLACEMENT JUDGED BY ITS FUTURE LINE — the student's bishop has almost no
 *  scope now, and the engine's line opens it with the student's own pawn moves
 *  while it stays put. `fen`: the student to move; `pvUci`: the engine line. */
export function placementFutureLine(fen: string, student: Color, pvUci: readonly string[]): StructureRead | null {
  const c0 = board(fen);
  if (!c0 || c0.turn() !== student) return null;
  const pv = uciToSans(fen, pvUci);
  if (pv.length < 3) return null;
  for (const bsq of piecesOf(c0, student, 'b')) {
    const now = scope(c0, bsq);
    if (now > 4) continue;
    const c = board(fen);
    if (!c) return null;
    const pawnMoves: string[] = [];
    for (let i = 0; i < pv.length; i++) {
      const mv = c.move(pv[i]);
      if (mv.from === bsq || (mv.color !== student && mv.to === bsq)) break;
      if (mv.color === student && mv.piece === 'p') pawnMoves.push(bare(mv.san));
      if (pawnMoves.length > 0 && scope(c, bsq) - now >= 4) {
        const proof = legalLineProof(fen, pv.slice(0, i + 1));
        if (!proof) break;
        return {
          act: 'placement-future-line', squares: [bsq], proof, key: `future-bishop:${bsq}`,
          text: `Your bishop on ${bsq} looks dead, but your planned ${andList(pawnMoves)} open it.`,
        };
      }
    }
  }
  return null;
}

/** SMALL EDGES ACCUMULATE — across a game, no single student move was a real
 *  mistake, yet several gave a little each and the total is real. `moves`: the
 *  student's own moves in order, each with its engine cost. */
export function smallEdges(moves: readonly { san: string; cpLoss: number }[]): StructureRead | null {
  if (moves.some((m) => m.cpLoss >= 100)) return null;
  const small = moves.filter((m) => m.cpLoss >= 25);
  const total = moves.reduce((s, m) => s + Math.max(0, m.cpLoss), 0);
  if (small.length < 3 || total < 150) return null;
  const sans = small.map((m) => m.san);
  const proof: Proof = {
    kind: 'count', exact: false,
    short: `${andList(sans)} each gave a little`,
    full: `${andList(sans)} each gave a little, and none of them was a big mistake on its own`,
  };
  return {
    act: 'small-edges', squares: [], proof, key: 'small-edges',
    text: `No single big mistake, but small ones piled up: ${andList(sans)} each gave a little.`,
  };
}

/** What a line's first move and the reply create, in words — or nothing when
 *  the material and structure stay symmetrical. */
function imbalanceOf(fen: string, sans: readonly string[]): string[] {
  const r = play(fen, sans[0]);
  if (!r) return [];
  const out: string[] = [];
  if (r.mv.piece === 'b' && r.mv.captured === 'n') out.push('bishop for knight');
  if (r.mv.piece === 'n' && r.mv.captured === 'b') out.push('knight for bishop');
  if (sans[1]) {
    const them = other(r.mv.color);
    const doubled = (c: NonNullable<ReturnType<typeof board>>): number => {
      const files = piecesOf(c, them, 'p').map((p) => p[0]);
      return files.length - new Set(files).size;
    };
    const rep = play(r.after.fen(), sans[1]);
    if (rep && doubled(rep.after) > doubled(r.after)) out.push('doubled pawns for them');
  }
  return out;
}

/** THE FIGHTING LINE OR THE PEACEFUL ONE — the position is level and the
 *  engine's two best moves are close; one creates an imbalance, the other does
 *  not. `lines`: the student's MultiPV at `fen` (student to move), best first,
 *  `evaluation` White-POV centipawns. */
export function fightingLine(
  fen: string, student: Color,
  lines: readonly { moves: readonly string[]; evaluation: number; mate?: number | null }[],
): StructureRead | null {
  const c = board(fen);
  if (!c || c.turn() !== student || lines.length < 2) return null;
  const [a, b] = lines;
  if (a.mate != null || b.mate != null) return null;
  const pov = (cp: number): number => (student === 'w' ? cp : -cp);
  if (Math.abs(pov(a.evaluation)) > 60 || Math.abs(a.evaluation - b.evaluation) > 40) return null;
  const sa = uciToSans(fen, a.moves.slice(0, 2));
  const sb = uciToSans(fen, b.moves.slice(0, 2));
  if (sa.length === 0 || sb.length === 0) return null;
  const ia = imbalanceOf(fen, sa);
  const ib = imbalanceOf(fen, sb);
  if ((ia.length > 0) === (ib.length > 0)) return null;
  const [fight, labels, quiet] = ia.length > 0 ? [sa, ia, sb] : [sb, ib, sa];
  const proof = legalLineProof(fen, fight);
  if (!proof) return null;
  return {
    act: 'fighting-line', squares: [], proof, key: `fighting:${fen.split(' ')[0]}`,
    text: `It's level, so make chances: ${bare(fight[0])} creates the imbalance, ${andList(labels)}. ${bare(quiet[0])} keeps it quiet.`,
  };
}
