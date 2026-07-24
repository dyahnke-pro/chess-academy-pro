// pieceQuality — THE METHOD OF COMPARISON, aimed at a PIECE instead of a MOVE
// (David 2026-07-23, from Naroditsky: "the knight and the bishop are so bad
// that White has fighting chances"). `moveComparison` proves why one MOVE beats
// another by ablation; this proves why a POSITION's eval is what it is by
// ablating a PIECE: a piece is "bad" only if IMPROVING it swings the evaluation.
//
//   HYPOTHESIS  — a side's non-pawn piece has near-zero mobility (rim knight,
//                 buried bishop). Cheap board fact, just a candidate.
//   ABLATION    — teleport that piece to its best safe reachable square and
//                 re-evaluate. If the eval swings toward its owner by the bar,
//                 the placement WAS the cause (engine-proven). If it barely
//                 moves, the hypothesis is wrong — say nothing.
//
// The engine is the gate: a crude teleport can only UNDER-claim (a poor square →
// small swing → we stay quiet). We never over-claim, because the swing is the
// engine's verdict, not ours (G0/G3). 100% engine + chess.js; zero LLM.

import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';
import type { Evaluate } from './moveComparison';

const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';

export interface BadPieceDelta {
  kind: 'bad-piece';
  /** Whose piece(s) are bad. */
  color: Color;
  /** The bad piece square(s) — one, or two when both survive together. */
  squares: string[];
  pieces: PieceSymbol[];
  /** Grounded, board-true phrase for the voice layer (LLM only rewords it). */
  text: string;
  proof: 'ablation';
  /** cp from the BAD side's POV: before vs after improving the piece(s). */
  ablation: { before: number; after: number; swingCp: number };
}

export interface PieceQualityResult {
  /** White-POV cp of the position as-is. */
  evalCp: number;
  favored: Color | 'equal';
  /** The proven bad-piece attribution, or null when none survives. */
  delta: BadPieceDelta | null;
}

export interface PieceQualityOpts {
  /** A piece is only a candidate at or below this mobility. Default 3. */
  maxBadMobility?: number;
  /** Single-piece ablation must swing at least this (cp) to be spoken. Default 120. */
  swingThresholdCp?: number;
  /** Naming a SECOND piece requires the pair to swing at least this (cp). Default 180. */
  pairThresholdCp?: number;
  /** Reject a swing above this (cp) — a piece's ACTIVITY is bounded, so a bigger
   *  swing means the relocation manufactured a tactic, not that the piece was
   *  passive. Default 500. */
  maxSwingCp?: number;
  /** White-POV cp of the position, if already known (skips the base re-eval —
   *  the caller usually has it from the per-ply analysis). */
  baseCp?: number;
}

/** Squares a piece at `sq` can move to, with the side-to-move flipped to its own
 *  color so chess.js generates its moves. Mobility = how alive the piece is. */
function pieceMobility(fen: string, sq: Square): number {
  try {
    const parts = fen.split(' ');
    const piece = new Chess(fen).get(sq);
    if (!piece) return 0;
    parts[1] = piece.color;
    parts[3] = '-';
    return new Chess(parts.join(' ')).moves({ square: sq, verbose: true }).length;
  } catch {
    return 0;
  }
}

/** Enemy pawns' attacked squares (cheap "don't teleport into a hanging square"
 *  guard). */
function enemyPawnAttacks(chess: Chess, enemy: Color): Set<string> {
  const out = new Set<string>();
  const dr = enemy === 'w' ? 1 : -1;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p' || cell.color !== enemy) continue;
      const f = cell.square.charCodeAt(0) - 97;
      const r = Number(cell.square[1]) - 1;
      for (const df of [-1, 1]) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.add(`${FILES[nf]}${nr + 1}`);
      }
    }
  }
  return out;
}

/** The square of `color`'s king, or null. */
function kingSquare(chess: Chess, color: Color): Square | null {
  for (const row of chess.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) return cell.square;
  return null;
}

/** Build the FEN with the pieces at `from[]` teleported to their best CLEAN
 *  square (max own-mobility, not attacked by an enemy pawn, and NOT giving check
 *  — a check-giving teleport manufactures a tactic that has nothing to do with
 *  the piece being passive, which is what inflated the ablation to +900). Side-
 *  to-move is preserved. Returns null if a clean relocation isn't possible. */
function relocateToBest(fen: string, from: Square[]): string | null {
  try {
    const chess = new Chess(fen);
    const moved = from[0] ? chess.get(from[0]) : null;
    if (!moved) return null;
    const enemy: Color = moved.color === 'w' ? 'b' : 'w';
    const pawnAttacks = enemyPawnAttacks(chess, enemy);
    const enemyKing = kingSquare(chess, enemy);

    for (const sq of from) chess.remove(sq);

    for (const sq of from) {
      const piece = new Chess(fen).get(sq);
      if (!piece) return null;
      let bestSq: Square | null = null;
      let bestMob = -1;
      for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
          const cand = `${FILES[f]}${r + 1}` as Square;
          if (chess.get(cand)) continue; // occupied
          if (pawnAttacks.has(cand)) continue; // would hang to a pawn
          const probe = new Chess(chess.fen());
          probe.put({ type: piece.type, color: piece.color }, cand);
          // Reject a square that gives check — that's a manufactured tactic, not
          // activity (kills the +900 mate-teleport artifact).
          if (enemyKing && probe.isAttacked(enemyKing, piece.color)) continue;
          const parts = probe.fen().split(' ');
          parts[1] = piece.color;
          parts[3] = '-';
          let mob = 0;
          try { mob = new Chess(parts.join(' ')).moves({ square: cand, verbose: true }).length; } catch { mob = 0; }
          if (mob > bestMob) { bestMob = mob; bestSq = cand; }
        }
      }
      if (!bestSq) return null;
      chess.put({ type: piece.type, color: piece.color }, bestSq);
    }
    // Legality: removing a minor can DISCOVER an attack on its own king. If the
    // side NOT to move ends up in check, the position is illegal (the engine
    // would choke) — bail rather than ablate a broken board.
    const stm = chess.turn();
    const otherKing = kingSquare(chess, stm === 'w' ? 'b' : 'w');
    if (otherKing && chess.isAttacked(otherKing, stm)) return null;
    return chess.fen();
  } catch {
    return null;
  }
}

/** The mover's worst-placed MINOR pieces (knight/bishop), ascending by mobility.
 *  Minors only — that is Naroditsky's actual register ("the knight and bishop
 *  are so bad"), and a minor's value really is decided by its SQUARE (a rim
 *  knight, a buried bishop). A rook's passivity is an open-file/structural story
 *  (owned by describeStructure), and an undeveloped rook on its home square
 *  reads as "bad" when it's merely un-developed — so rooks/queens are excluded
 *  to avoid overclaiming (empty > overclaim). */
function worstPieces(fen: string, color: Color, maxMob: number): Array<{ sq: Square; type: PieceSymbol; mob: number }> {
  const chess = new Chess(fen);
  const out: Array<{ sq: Square; type: PieceSymbol; mob: number }> = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || (cell.type !== 'n' && cell.type !== 'b')) continue;
      const mob = pieceMobility(fen, cell.square);
      if (mob <= maxMob) out.push({ sq: cell.square, type: cell.type, mob });
    }
  }
  return out.sort((a, b) => a.mob - b.mob);
}


/**
 * Lowest mobility among any minor (knight/bishop) on the board, either colour —
 * a FREE (no-engine) proxy for "is a minor cramped enough here to be worth an
 * ablation probe?". Infinity when there are no minors. Callers use it to TARGET
 * the one position most likely to carry a bad-minor story, so the expensive
 * ablation runs once, where it matters.
 */
export function lowestMinorMobility(fen: string): number {
  try {
    const chess = new Chess(fen);
    let lo = Infinity;
    for (const row of chess.board()) {
      for (const cell of row) {
        if (!cell || (cell.type !== 'n' && cell.type !== 'b')) continue;
        const m = pieceMobility(fen, cell.square);
        if (m < lo) lo = m;
      }
    }
    return lo;
  } catch {
    return Infinity;
  }
}

/**
 * Attribute a position's evaluation to a badly-placed piece (or pair), proven by
 * ablation. Returns null on an invalid/terminal position or an empty engine
 * reply. `delta` is null when no attribution survives — then the caller states
 * the number honestly instead of inventing a cause.
 */
export async function explainEvalByPieceQuality(
  fen: string,
  evaluate: Evaluate,
  opts: PieceQualityOpts = {},
): Promise<PieceQualityResult | null> {
  const maxBadMobility = opts.maxBadMobility ?? 3;
  const swingThreshold = opts.swingThresholdCp ?? 120;
  const pairThreshold = opts.pairThresholdCp ?? 180;
  const maxSwing = opts.maxSwingCp ?? 500;

  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  if (chess.isGameOver()) return null;

  const evalCp = Number.isFinite(opts.baseCp) ? (opts.baseCp as number) : (await evaluate(fen)).cp;
  if (!Number.isFinite(evalCp)) return null;
  const favored: Color | 'equal' = evalCp > 30 ? 'w' : evalCp < -30 ? 'b' : 'equal';

  // Test BOTH sides' worst pieces; report the biggest proven swing. A "bad
  // piece" is the same fact whichever side owns it — improving it swings the
  // eval toward that side.
  let winner: BadPieceDelta | null = null;

  for (const color of ['w', 'b'] as Color[]) {
    const cands = worstPieces(fen, color, maxBadMobility);
    if (!cands.length) continue;
    const sign = color === 'w' ? 1 : -1;
    const beforeOwn = sign * evalCp;

    // Single worst piece.
    const one = cands[0];
    const relFen1 = relocateToBest(fen, [one.sq]);
    if (relFen1) {
      const e1 = await evaluate(relFen1);
      if (Number.isFinite(e1.cp)) {
        const afterOwn = sign * e1.cp;
        const swing = afterOwn - beforeOwn;
        if (swing >= swingThreshold && swing <= maxSwing && (!winner || swing > winner.ablation.swingCp)) {
          winner = {
            kind: 'bad-piece',
            color,
            squares: [one.sq],
            pieces: [one.type],
            text: `the ${PIECE_WORD[one.type]} on ${one.sq} is doing nothing where it sits — that passivity is the whole story here`,
            proof: 'ablation',
            ablation: { before: beforeOwn, after: afterOwn, swingCp: swing },
          };
        }

        // Two bad pieces together (the "knight AND bishop" case) — only if a
        // second candidate exists and the pair clears the higher bar AND beats
        // the single-piece swing (both pieces really are the story).
        if (cands.length >= 2) {
          const two = cands[1];
          const relFen2 = relocateToBest(fen, [one.sq, two.sq]);
          if (relFen2) {
            const e2 = await evaluate(relFen2);
            if (Number.isFinite(e2.cp)) {
              const afterOwn2 = sign * e2.cp;
              const swing2 = afterOwn2 - beforeOwn;
              if (swing2 >= pairThreshold && swing2 <= maxSwing && swing2 > swing && (!winner || swing2 > winner.ablation.swingCp)) {
                winner = {
                  kind: 'bad-piece',
                  color,
                  squares: [one.sq, two.sq],
                  pieces: [one.type, two.type],
                  text: `the ${PIECE_WORD[one.type]} on ${one.sq} and the ${PIECE_WORD[two.type]} on ${two.sq} are both so passive they're the whole story here`,
                  proof: 'ablation',
                  ablation: { before: beforeOwn, after: afterOwn2, swingCp: swing2 },
                };
              }
            }
          }
        }
      }
    }
  }

  return { evalCp, favored, delta: winner };
}

export const __test = { pieceMobility, worstPieces, relocateToBest, enemyPawnAttacks };
