// reviewGameAdapter — a stored GameRecord → the review's move/key-moment shape.
//
// Moved out of CoachReviewSessionPage (2026-09-23) so the review's narration
// can be BUILT without the page mounted — after the background deepen lands,
// and for the newest imported game — from exactly the same inputs the page
// uses. One adapter, so a pre-built narration and the one the page asks for
// share a cache key by construction.
import { Chess } from 'chess.js';
import { detectOpeningTranspositional } from './openingDetectionService';
import { replayGamePgn } from './gamePgnReplay';
import type {
  GameRecord,
  CoachGameMove,
  KeyMoment,
  MoveAnnotation,
  MoveClassification,
} from '../types';

export interface AdaptedReviewProps {
  moves: CoachGameMove[];
  keyMoments: KeyMoment[];
  playerColor: 'white' | 'black';
  result: string;
  openingName: string | null;
  playerName: string;
  playerRating: number;
  opponentRating: number;
  pgn: string;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function annotationFor(
  annotations: MoveAnnotation[] | null,
  moveNumber: number,
  color: 'white' | 'black',
): MoveAnnotation | null {
  if (!annotations) return null;
  return (
    annotations.find((a) => a.moveNumber === moveNumber && a.color === color) ?? null
  );
}

/** How the review names a game to the student when it has to explain itself —
 *  never "this game". A Learn game is named by the surface and its date; an
 *  imported one by the players. */
export function describeGameForStudent(game: GameRecord): string {
  const date = game.date ? ` from ${game.date}` : '';
  if (game.source === 'coach') {
    const where = game.event && /learn/i.test(game.event) ? 'Learn with Coach' : 'Play with Coach';
    return `Your ${where} game${date} (${game.id})`;
  }
  return `Your game ${game.white} vs ${game.black}${date}`;
}

/** The adapter's full answer: the review, or a SENTENCE saying why not — and,
 *  when the PGN had to be cut to its legal prefix, a note saying so. */
export type AdaptOutcome =
  | { adapted: AdaptedReviewProps; reason: null; repairNote: string | null }
  | { adapted: null; reason: string; repairNote: null };

/**
 * REPAIR OR EXPLAIN — never a blank (WO-STANDARD-01 H3). A real native user's
 * Learn game (`teach-1788396074396`) could not open and read "We could not
 * replay this game" with no game named and no cause. `replayGamePgn` replays
 * from the `[FEN]` header when there is one and from the standard start when
 * there is not, keeps the legal prefix when a later move is broken, and hands
 * back a sentence naming THIS game when nothing can be shown.
 */
export function adaptGameRecordExplained(
  game: GameRecord,
  playerColor: 'white' | 'black',
): AdaptOutcome {
  const replayed = replayGamePgn(game.pgn, describeGameForStudent(game));
  if (!replayed.ok) return { adapted: null, reason: replayed.reason, repairNote: null };
  const adapted = adaptReplayedGame(game, playerColor, replayed.startFen, replayed.sans);
  return { adapted, reason: null, repairNote: replayed.repair?.note ?? null };
}

/** Back-compat shape: the review or null. Callers that can say WHY use
 *  `adaptGameRecordExplained`; this exists for the sites that only branch. */
export function adaptGameRecord(
  game: GameRecord,
  playerColor: 'white' | 'black',
): AdaptedReviewProps | null {
  return adaptGameRecordExplained(game, playerColor).adapted;
}

function adaptReplayedGame(
  game: GameRecord,
  playerColor: 'white' | 'black',
  startFen: string,
  history: readonly string[],
): AdaptedReviewProps {
  // Re-walk to capture FEN after each ply — from the GAME's ACTUAL starting
  // position (the `[SetUp]`/`[FEN]` header on odds games and Learn games that
  // began from a lesson position). Replaying from a fresh STANDARD board made
  // a later move illegal and threw uncaught — the prod "Invalid move: O-O"
  // crash on the two-knights-odds game chesscom-996944614, where 3.O-O is
  // legal on the knight-less board but not on a standard one. The per-move
  // replay is try-guarded so no other odd game can ever crash the review load.
  const replay = new Chess(startFen);
  const moves: CoachGameMove[] = [];
  let prevEval: number | null = null;
  for (let i = 0; i < history.length; i += 1) {
    const san = history[i];
    let moveResult: ReturnType<typeof replay.move> | null = null;
    try { moveResult = replay.move(san); } catch { break; }
    if (!moveResult) break;
    const fullMove = Math.floor(i / 2) + 1;
    const color: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const annot = annotationFor(game.annotations, fullMove, color);
    const evaluation = annot?.evaluation ?? null;
    const isCoachMove = color !== playerColor;
    // CoachGameMove.moveNumber is PLY-indexed (1=White's first ply,
    // 2=Black's response, …) so accuracyService and
    // getClassificationCounts can derive color via `moveNumber % 2 === 1`.
    // Confirmed by CoachGamePage.tsx:1620 where it uses moveCountRef
    // (incremented per ply) for the same field.
    moves.push({
      moveNumber: i + 1,
      san: moveResult.san,
      fen: replay.fen(),
      isCoachMove,
      commentary: annot?.comment ?? '',
      evaluation,
      classification: (annot?.classification as MoveClassification | null) ?? null,
      expanded: false,
      bestMove: annot?.bestMove ?? null,
      // Propagate the annotation's `bestMoveEval` (centipawns, White POV)
      // so the review's Missed Tactics + Missed Opportunities surfaces
      // can compute the swing the player conceded. Pre-fix annotations
      // are flagged for re-analysis by `gameNeedsAnalysis`, so by the
      // time we read here the field is reliably populated.
      bestMoveEval: annot?.bestMoveEval ?? null,
      preMoveEval: prevEval,
      ...(annot?.pv ? { pv: annot.pv } : {}),
    });
    prevEval = evaluation;
  }

  const keyMoments: KeyMoment[] = (game.annotations ?? [])
    .filter(
      (a) =>
        a.classification === 'blunder' ||
        a.classification === 'brilliant' ||
        a.classification === 'mistake',
    )
    .slice(0, 8)
    .map((a) => {
      const idx = (a.moveNumber - 1) * 2 + (a.color === 'white' ? 0 : 1);
      const fen = moves[idx]?.fen ?? STARTING_FEN;
      return {
        moveNumber: a.moveNumber,
        fen,
        explanation: a.comment ?? '',
        type:
          a.classification === 'brilliant'
            ? ('brilliant' as const)
            : a.classification === 'blunder'
            ? ('blunder' as const)
            : ('turning_point' as const),
      };
    });

  // A REAL opening name, not the bare ECO code (David 2026-07-19: the walk
  // never named his opening — "B06" was being passed as the name, which
  // Polly reads as "B zero six"). detectOpening walks the canonical DB trie
  // over the game's actual SANs; ECO stays as the last-resort fallback.
  const detected = detectOpeningTranspositional(moves.map((m) => m.san));
  return {
    moves,
    keyMoments,
    playerColor,
    result: game.result,
    openingName: detected?.name ?? (game.eco ? game.eco : null),
    playerName: playerColor === 'white' ? game.white : game.black,
    playerRating: playerColor === 'white' ? game.whiteElo ?? 1500 : game.blackElo ?? 1500,
    opponentRating: playerColor === 'white' ? game.blackElo ?? 1500 : game.whiteElo ?? 1500,
    pgn: game.pgn,
  };
}
