/**
 * openingTrapDetector
 * -------------------
 * Trap-shaped positions are where a LOT of games at recreational
 * rating play a move that the engine considers losing. That's the
 * signature of a trap: popular because it looks natural, but the
 * refutation is concrete enough that experienced players avoid it.
 *
 * This module reads Lichess Opening Explorer data (move counts +
 * scores by player rating) plus engine evaluation per candidate move
 * and decides whether the current position is "trap-ready" — i.e.
 * the student can expect the opponent to walk into one if they're
 * the one side, OR the student themselves is the one likely to
 * blunder if they're the one on move.
 */
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

/** Minimum Lichess-wide game count for a move to count as "popular".
 *  Below this, the move is too obscure to be a trap trigger — nobody
 *  actually falls for it. */
const POPULAR_MOVE_MIN_GAMES = 40;

/** Eval drop (in centipawns, from the mover's POV) below which a
 *  popular move qualifies as a trap candidate. -200cp = the move
 *  loses roughly two pawns of equity. */
const TRAP_EVAL_THRESHOLD_CP = -200;

/** Eval drop below which a popular move is an outright blunder
 *  that's textbook trap bait. -400cp means "walks into mate or
 *  material catastrophe". */
const SEVERE_TRAP_THRESHOLD_CP = -400;

export interface MoveEvaluation {
  /** SAN of the candidate move. Must match entries in the explorer. */
  san: string;
  /** Centipawn eval from the MOVER's perspective after the move is
   *  played. Negative = losing for the mover. */
  evalCp: number;
}

export interface TrapSignal {
  /** The popular-but-losing move itself (SAN). */
  trapMove: string;
  /** Number of Lichess games where this move was played. */
  gamesPlayed: number;
  /** Eval after the move, mover's POV, centipawns. Negative = bad. */
  evalCpForMover: number;
  /** How bad this is — 'trap' for a standard losing line, 'severe'
   *  for a catastrophic blunder popular enough to set up a mate. */
  severity: 'trap' | 'severe';
  /** What the refuting side should play next to punish it, when
   *  available. Helps the coach phrase the warning concretely. */
  refutationSan?: string;
}

export interface DetectTrapInput {
  /** Lichess Opening Explorer response at the CURRENT position. */
  explorer: LichessExplorerResult;
  /** Engine evaluations for the top N moves at this position.
   *  Provides the "is this actually losing?" signal. */
  evaluations: MoveEvaluation[];
  /** SAN of the move the engine thinks is best — used as the
   *  refutation hint when a trap fires. */
  engineBestSan?: string;
  /** Legal SAN moves in the CURRENT position. Used to gate explorer
   *  candidates so a stale or mismatched explorer payload can't
   *  produce a trap claim for an illegal move. Optional because the
   *  caller is sometimes upstream of the chess instance — when
   *  omitted, detection proceeds without legality filtering. */
  legalSan?: string[];
}

/**
 * Scan the current position for a trap-shaped candidate move. Returns
 * null when no move in the explorer meets both criteria (popular +
 * losing). Returns at most ONE trap — the worst evaluation among the
 * qualifying popular moves.
 */
export function detectTrapInPosition(input: DetectTrapInput): TrapSignal | null {
  const evalBySan = new Map<string, number>();
  for (const ev of input.evaluations) {
    evalBySan.set(ev.san, ev.evalCp);
  }

  // Defensive: if the caller supplied the current legal-move set,
  // filter explorer candidates against it. Explorer data comes from
  // Lichess games recorded at a position — if the client FEN drifts
  // from the explorer FEN even by one ply, we could flag an illegal
  // move as a trap (exactly the "push e-pawn but e5 blocks it" bug).
  const legal = input.legalSan ? new Set(input.legalSan) : null;

  let worst: { move: LichessExplorerMove; evalCp: number } | null = null;
  for (const move of input.explorer.moves) {
    if (legal && !legal.has(move.san)) continue;
    const totalGames = move.white + move.draws + move.black;
    if (totalGames < POPULAR_MOVE_MIN_GAMES) continue;
    const evalCp = evalBySan.get(move.san);
    if (evalCp === undefined) continue;
    if (evalCp > TRAP_EVAL_THRESHOLD_CP) continue;
    if (worst === null || evalCp < worst.evalCp) {
      worst = { move, evalCp };
    }
  }

  if (!worst) return null;
  return {
    trapMove: worst.move.san,
    gamesPlayed: worst.move.white + worst.move.draws + worst.move.black,
    evalCpForMover: worst.evalCp,
    severity: worst.evalCp <= SEVERE_TRAP_THRESHOLD_CP ? 'severe' : 'trap',
    refutationSan: input.engineBestSan,
  };
}

/**
 * Format a trap signal as a compact prompt-ready string the coach
 * commentary can cite directly. Keeps the numbers (game count + cp
 * loss) so the LLM can be specific rather than hand-wave.
 */
export function formatTrapForPrompt(trap: TrapSignal): string {
  const pawns = (trap.evalCpForMover / 100).toFixed(1);
  const severity = trap.severity === 'severe' ? 'SEVERE TRAP' : 'TRAP';
  const refutation = trap.refutationSan ? ` — refute with ${trap.refutationSan}` : '';
  return `[${severity} AVAILABLE] The natural-looking move ${trap.trapMove} has been played ${trap.gamesPlayed.toLocaleString()} times on Lichess, but it's losing by ${pawns} pawns${refutation}. Real players walk into it — tell the student what to watch for.`;
}
