// playCommentary — what a coach says WHILE you play, computed from the board.
//
// David 2026-08-05, from the Naroditsky speedrun (B7r1bgPEyIQ, ~18-23 min):
// "he talks about making improving moves, trading off opponents best piece,
// and then he finds a tactic." This replaces the blocking cards in Learn: the
// teaching arrives as the game unfolds instead of stopping it to quiz.
//
// G0 — CODE decides, the model only phrases. Every line below is a FACT
// computed here (chess.js + the existing detectors) and handed to the narration
// as grounding. Nothing in this file asks the model what it thinks.
//
// SILENT BY DEFAULT. Returns null on an unremarkable position, which is most of
// them. That is the locked voice law ("speak when it instructs") and the
// narration rules' "silence is acceptable" — a coach who comments on every
// recapture teaches nothing and gets tuned out.
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';

export type CommentaryKind = 'tactic' | 'trade-the-best-piece' | 'improving-move';

export interface PlayCommentary {
  kind: CommentaryKind;
  /** Grounded fact lines for the narration package. Each is TRUE of the board
   *  passed in; the model rephrases, it does not extend. */
  facts: string[];
}

type Piece = { type: string; color: 'w' | 'b'; square: string };

const pieces = (chess: Chess): Piece[] => {
  const out: Piece[] = [];
  for (const row of chess.board()) {
    for (const p of row) if (p) out.push({ type: p.type, color: p.color, square: p.square });
  }
  return out;
};

const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Can the side to move capture this square? Used both for "you can trade it"
 *  and to check a piece is genuinely reachable rather than merely annoying. */
function capturesOf(chess: Chess, square: string): string[] {
  try {
    return chess.moves({ verbose: true })
      .filter((m) => m.to === square && m.flags.includes('c'))
      .map((m) => m.san);
  } catch {
    return [];
  }
}

/**
 * The opponent's BEST-PLACED piece, when one plainly stands out — the video's
 * "trade off the opponent's best piece".
 *
 * Deliberately narrow: a knight on a pawn-defended outpost in your half, or a
 * rook on a file with no pawns at all. Those are positions a coach actually
 * names. A merely-developed bishop is not, and calling one "their best piece"
 * would be the kind of confident filler the narration rules ban.
 */
function opponentsBestPiece(
  all: Piece[],
  them: 'w' | 'b',
): { piece: Piece; why: string } | null {
  const theirPawns = all.filter((p) => p.type === 'p' && p.color === them);
  const myPawns = all.filter((p) => p.type === 'p' && p.color !== them);
  const dir = them === 'w' ? 1 : -1;

  for (const n of all) {
    if (n.type !== 'n' || n.color !== them) continue;
    const f = fileOf(n.square);
    const r = rankOf(n.square);
    // In OUR half — a knight on its own third rank is not an outpost.
    if (them === 'w' ? r < 5 : r > 4) continue;
    const defended = theirPawns.some((p) =>
      Math.abs(fileOf(p.square) - f) === 1 && rankOf(p.square) === r - dir);
    if (!defended) continue;
    // No pawn of ours can ever challenge it.
    const challengeable = myPawns.some((p) => {
      const pf = fileOf(p.square);
      const pr = rankOf(p.square);
      return Math.abs(pf - f) === 1 && (them === 'w' ? pr < r : pr > r);
    });
    if (!challengeable) {
      return { piece: n, why: `the knight on ${n.square} sits on an outpost no pawn can challenge` };
    }
  }

  for (const rk of all) {
    if (rk.type !== 'r' || rk.color !== them) continue;
    const f = fileOf(rk.square);
    const anyPawn = all.some((p) => p.type === 'p' && fileOf(p.square) === f);
    if (!anyPawn) {
      return { piece: rk, why: `the rook on ${rk.square} owns an open file` };
    }
  }
  return null;
}

/**
 * The running commentary for the position the student is about to move in.
 *
 * Priority is the coach's: a tactic on the board beats a plan, and a plan beats
 * a quiet improving move. One thing per turn — a coach does not deliver three
 * observations about one position.
 */
export function buildPlayCommentary(args: {
  /** Position with the STUDENT to move (after the coach's reply landed). */
  fen: string;
  studentColor: 'white' | 'black';
  /** Engine's best move for the student, UCI. Optional — the commentary
   *  degrades to board-only observations when the engine is unavailable. */
  bestUci?: string | null;
  /** Engine eval from the STUDENT's perspective, centipawns. */
  evalCpStudentPov?: number | null;
  /** Why the engine likes its move — `explainBestMoveGrounded`'s output,
   *  already board-verified. Passed in rather than recomputed so this file
   *  stays a composer, not a second source of truth. */
  bestMoveWhy?: string | null;
}): PlayCommentary | null {
  let chess: Chess;
  try {
    chess = new Chess(args.fen);
  } catch {
    return null;
  }
  const me: 'w' | 'b' = args.studentColor === 'white' ? 'w' : 'b';
  if (chess.turn() !== me) return null; // not the student's move — say nothing
  const all = pieces(chess);
  if (all.length === 0) return null;

  // ── 1. A TACTIC. The video's third beat, and the one worth interrupting a
  // quiet plan for. Only the student's OWN tactics — pointing out the
  // opponent's would be handing over the game.
  try {
    const t = detectTactics(args.fen);
    const mine = t.tactics.filter((tac) => tac.side === args.studentColor);
    const theirHanging = t.hangingPieces.filter((h) => h.color !== args.studentColor);
    if (mine.length > 0) {
      const tac = mine[0];
      return {
        kind: 'tactic',
        facts: [
          `TACTIC ON THE BOARD for the student: ${tac.description}. Point out that something is there and WHY the geometry works. Do NOT name the move or the destination square — let them find it.`,
        ],
      };
    }
    if (theirHanging.length > 0) {
      const h = theirHanging[0];
      return {
        kind: 'tactic',
        facts: [
          `UNDEFENDED: the opponent's ${NAME[h.type] ?? 'piece'} on ${h.square} is not defended. Say what you notice — an undefended piece is the seed of a tactic — without naming the move that wins it.`,
        ],
      };
    }
  } catch { /* the detector is a bonus, never a blocker */ }

  // ── 2. TRADE OFF THEIR BEST PIECE. Only when the trade is actually
  // available on this move — otherwise it is advice about a different position.
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const best = opponentsBestPiece(all, them);
  if (best) {
    const trades = capturesOf(chess, best.piece.square);
    if (trades.length > 0) {
      return {
        kind: 'trade-the-best-piece',
        facts: [
          `THEIR BEST PIECE: ${best.why}. The student can trade it off right now. Teach the idea — the opponent's best piece is the one worth exchanging — and name the piece and its square. Do NOT give the capturing move.`,
        ],
      };
    }
  }

  // ── 3. THE IMPROVING MOVE. The quiet beat, and the one that makes the video
  // teach: nothing is forcing, so the plan is to put a piece on a better square.
  // Requires the engine to have said which — otherwise there is no fact here,
  // only an opinion, and this file does not deal in those.
  if (args.bestMoveWhy && args.bestUci && args.bestUci.length >= 4) {
    const from = args.bestUci.slice(0, 2) as Square;
    const moved = all.find((p) => p.square === from);
    // Quiet only: a capture or a check is not an "improving move", and the
    // tactic branch above would have caught it if it mattered.
    const isQuiet = (() => {
      try {
        const probe = new Chess(args.fen);
        const m = probe.move({ from, to: args.bestUci.slice(2, 4) as Square, promotion: 'q' });
        return !!m && !m.captures && !probe.isCheck();
      } catch {
        return false;
      }
    })();
    if (moved && isQuiet) {
      return {
        kind: 'improving-move',
        facts: [
          `IMPROVING MOVE: nothing is forcing here, so the move is to improve a piece. The ${NAME[moved.type] ?? 'piece'} on ${from} is the one with a better square available. Grounded reason: ${args.bestMoveWhy}. Teach the HABIT — when there is no tactic, find your worst-placed piece and improve it — and name the piece, NOT its destination.`,
        ],
      };
    }
  }

  return null; // unremarkable — silence teaches better than filler
}
