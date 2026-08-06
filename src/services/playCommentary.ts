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

export type CommentaryKind =
  | 'tactic'
  | 'seeding-observation'
  | 'trade-the-best-piece'
  | 'improving-move';

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
      .filter((m) => m.to === square && m.isCapture())
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
 * The video's opening beat — "there is an alignment of the Rooks…". Two big
 * enemy pieces sharing a line the student owns a matching slider for. Not a
 * tactic yet: the NOTICING that precedes one, which is the first thing he
 * teaches students to see.
 *
 * Deliberately conservative, because king+queen share a rank in every game
 * ever played: only king+queen and queen+rook pairs count, the shared rank
 * must not be the opponent's home rank (that is the back-rank detector's
 * lesson), the two pieces must have at most one piece between them, and the
 * student must own a slider that moves along that geometry.
 */
function findAlignmentSeed(
  all: Piece[],
  me: 'w' | 'b',
  them: 'w' | 'b',
): { what: string; line: string; tool: string } | null {
  const bigs = all.filter(
    (p) => p.color === them && (p.type === 'k' || p.type === 'q' || p.type === 'r'),
  );
  const homeRank = them === 'w' ? 1 : 8;
  const occupied = new Set(all.map((p) => p.square));

  const betweenCount = (a: Piece, b: Piece): number => {
    const df = Math.sign(fileOf(b.square) - fileOf(a.square));
    const dr = Math.sign(rankOf(b.square) - rankOf(a.square));
    let f = fileOf(a.square) + df;
    let r = rankOf(a.square) + dr;
    let n = 0;
    while (f !== fileOf(b.square) || r !== rankOf(b.square)) {
      if (occupied.has(`${String.fromCharCode(97 + f)}${r}`)) n += 1;
      f += df;
      r += dr;
    }
    return n;
  };

  const myTool = (kinds: string[]): string | null => {
    for (const k of kinds) {
      if (all.some((p) => p.color === me && p.type === k)) return NAME[k];
    }
    return null;
  };

  for (let i = 0; i < bigs.length; i++) {
    for (let j = i + 1; j < bigs.length; j++) {
      const a = bigs[i];
      const b = bigs[j];
      const pair = [a.type, b.type].sort().join('');
      if (pair !== 'kq' && pair !== 'qr') continue;
      const df = fileOf(b.square) - fileOf(a.square);
      const dr = rankOf(b.square) - rankOf(a.square);
      // Adjacent pieces are a huddle, not an alignment worth a word.
      if (Math.max(Math.abs(df), Math.abs(dr)) < 2) continue;

      let line: string | null = null;
      let tool: string | null = null;
      if (df === 0) {
        line = `${a.square[0]}-file`;
        tool = myTool(['r', 'q']);
      } else if (dr === 0 && rankOf(a.square) !== homeRank) {
        line = `${rankOf(a.square)}th rank`.replace(/^1th/, '1st').replace(/^2th/, '2nd').replace(/^3th/, '3rd');
        tool = myTool(['r', 'q']);
      } else if (Math.abs(df) === Math.abs(dr)) {
        line = 'diagonal';
        tool = myTool(['b', 'q']);
      }
      if (!line || !tool) continue;
      if (betweenCount(a, b) > 1) continue;
      return {
        what: `${NAME[a.type]} on ${a.square} and ${NAME[b.type]} on ${b.square}`,
        line,
        tool,
      };
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
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  if (chess.turn() !== me) return null; // not the student's move — say nothing
  const all = pieces(chess);
  if (all.length === 0) return null;

  // ── 1. A TACTIC. The video's third beat, and the one worth interrupting a
  // quiet plan for. `detectTactics` reports geometry without a beneficiary
  // side, so only the side-attributed HANGING read is used here — the
  // structured tactic list already reaches the narration through the
  // TacticsLiveContext block, which does carry sides. Only the OPPONENT'S
  // hanging pieces: pointing out the student's own would be handing the
  // opponent's game plan to the student's ears mid-game.
  try {
    const t = detectTactics(args.fen);
    // The 2026-08-06 expansion put a beneficiary on every pattern, so the
    // full tactic library speaks here — the STUDENT'S OWN tactics only
    // (naming the opponent's would hand their plan over). Mate outranks
    // everything; the detector already orders mate_threat first.
    const EVENT_ORDER: Record<string, number> = {
      mate_threat: 0, fork: 1, trapped_piece: 2, removal_of_guard: 3, back_rank: 4, discovery: 5,
    };
    const mine = t.tactics
      .filter((tac) => tac.beneficiary === me && tac.type in EVENT_ORDER)
      .sort((a, b) => (EVENT_ORDER[a.type] ?? 9) - (EVENT_ORDER[b.type] ?? 9));
    if (mine.length > 0) {
      const tac = mine[0];
      if (tac.type === 'mate_threat') {
        return {
          kind: 'tactic',
          facts: [
            'MATE IS ON THE BOARD for the student. Say plainly that a checkmate is available right now and they should look for the forcing move. Do NOT name the move or the square.',
          ],
        };
      }
      return {
        kind: 'tactic',
        facts: [
          `TACTIC ON THE BOARD for the student: ${tac.description}. Name the PATTERN and why the geometry works. Do NOT name the winning move — let them find it.`,
        ],
      };
    }
    // Pieces only — a "hanging" PAWN on a repertoire line is usually the
    // gambit itself (measured: 7.9% of theory plies have a pawn en prise,
    // 3.3% a real piece). Narrating every loose pawn is the tuned-out
    // failure, and calling a gambit pawn a tactic-seed is wrong teaching.
    const theirHanging = t.hangingPieces.filter((h) => h.color === them && h.piece !== 'p');
    if (theirHanging.length > 0) {
      const h = theirHanging[0];
      return {
        kind: 'tactic',
        facts: [
          `UNDEFENDED: the opponent's ${NAME[h.piece] ?? 'piece'} on ${h.square} is not defended. Say what you notice — an undefended piece is the seed of a tactic — without naming the move that wins it.`,
        ],
      };
    }
  } catch { /* the detector is a bonus, never a blocker */ }

  // ── 1.5 THE SEEDING OBSERVATION — the video's opening beat ("there is an
  // alignment of the Rooks…"): two big enemy pieces sharing a line the
  // student owns a matching slider for. Not a tactic yet — the NOTICING that
  // precedes one, which is exactly what he teaches students to see first.
  const seed = findAlignmentSeed(all, me, them);
  if (seed) {
    return {
      kind: 'seeding-observation',
      facts: [
        `ALIGNMENT: the opponent's ${seed.what} line up on the same ${seed.line}. The student owns a ${seed.tool} that moves along that geometry. Point out the alignment as something worth noticing — nothing more. Do NOT suggest a move.`,
      ],
    };
  }

  // ── 2. TRADE OFF THEIR BEST PIECE. Only when the trade is actually
  // available on this move — otherwise it is advice about a different position.
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
        return !m.captured && !probe.isCheck();
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
