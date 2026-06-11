// Import-time auto-analysis — the third faucet (David 2026-05-21: "tie
// game analysis in without needing a full review"). Given the blunders a
// game's Stockfish scan already found, classify each into a closed-set
// misconception and log it to the shared bucket — no interactive "why?"
// required (userReason is absent; the coach classifies from position +
// best move + eval alone). Game Review's interactive capture and this
// passive path write to the SAME bucket; this just front-runs it.

import { captureMisconception } from './discussionPractice';
import { db } from '../db/schema';
import { hasMisconceptionsForGame } from './misconceptionService';
import {
  replayPgnToFens,
  determinePlayerColor,
  uciToSan,
} from './mistakePuzzleService';
import { classifyPhase } from './gamePhaseService';

export interface BlunderForAnalysis {
  /** Position BEFORE the move (FEN). */
  fen: string;
  playedSan: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
}

export interface AutoAnalyzeOptions {
  openingId?: string;
  openingName?: string;
  sourceGameId?: string;
  /** Count-against gate: only learned lines / principles become
   *  weaknesses. Imported games of a repertoire the user claims to know
   *  count; first-exposure lines don't. */
  learned: boolean;
}

export interface AutoAnalyzeResult {
  classified: number;
  logged: number;
}

function cpToWords(cpLoss?: number): string | undefined {
  if (cpLoss === undefined) return undefined;
  const pawns = cpLoss / 100;
  if (pawns >= 3) return 'loses a lot of material or the game';
  if (pawns >= 1.5) return "drops a piece's worth of advantage";
  if (pawns >= 0.8) return 'loses about a pawn';
  return 'gives away a little something';
}

/** Classify + log a game's blunders without user interaction. Returns
 *  how many were classifiable and how many were actually logged (the
 *  count-against gate + the classifier's 'none'/off-vocab guards mean
 *  classified >= logged). Runs sequentially to stay gentle on the LLM. */
export async function autoAnalyzeBlunders(
  blunders: BlunderForAnalysis[],
  opts: AutoAnalyzeOptions,
): Promise<AutoAnalyzeResult> {
  let classified = 0;
  let logged = 0;
  for (const b of blunders) {
    const result = await captureMisconception({
      classifyInput: {
        fen: b.fen,
        playedSan: b.playedSan,
        bestSan: b.bestSan,
        evalSummary: cpToWords(b.cpLoss),
        gamePhase: b.gamePhase,
        // No userReason — this is passive analysis.
      },
      source: 'auto-analysis',
      shouldCount: opts.learned,
      context: {
        fen: b.fen,
        playedSan: b.playedSan,
        bestSan: b.bestSan,
        cpLoss: b.cpLoss,
        gamePhase: b.gamePhase,
        moveNumber: b.moveNumber,
        openingId: opts.openingId,
        openingName: opts.openingName,
        sourceGameId: opts.sourceGameId,
      },
    });
    if (result.classification && result.classification.tag !== 'none') classified += 1;
    if (result.logged) logged += 1;
  }
  return { classified, logged };
}

/** Populate the Thinking-Errors bucket from a game's ALREADY-COMPUTED
 *  annotations — the missing BULK faucet (David 2026-06-11: "I still am not
 *  getting thinking errors"). The interactive review walk + the live coach
 *  game + the manual "add to weaknesses" button were the ONLY writers to
 *  `misconceptionTags`, so importing + analyzing a library filled
 *  `mistakePuzzles` (Mistakes/Weaknesses) but never the Thinking-Errors tab.
 *  Now that classification is deterministic and free (no LLM), every analyzed
 *  game can tag its blunders/mistakes here too — covering POSITIONAL slips the
 *  tactical-only mistakePuzzle gate deliberately drops.
 *
 *  `learned: false` (display-only): these surface in Thinking Errors but do
 *  NOT feed the formal weakness profile (the same games' `mistakePuzzles`
 *  already represent them — counting both would double-count) and do NOT
 *  spawn `mistakePuzzles` (that would bypass the tactical quality gate). Idempotent
 *  per game via `hasMisconceptionsForGame`. */
export async function autoAnalyzeGameMisconceptions(
  gameId: string,
  username?: string,
): Promise<AutoAnalyzeResult> {
  const empty: AutoAnalyzeResult = { classified: 0, logged: 0 };
  // Already tagged (bulk, review-walk, or live) — never double-log a game.
  if (await hasMisconceptionsForGame(gameId)) return empty;

  const game = await db.games.get(gameId);
  if (!game) return empty;
  const annotations = game.annotations ?? [];
  if (annotations.length === 0) return empty;
  const playerColor = determinePlayerColor(game, username);
  if (!playerColor) return empty;
  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return empty;

  const blunders: BlunderForAnalysis[] = [];
  for (const ann of annotations) {
    if (ann.color !== playerColor) continue;
    if (ann.classification !== 'blunder' && ann.classification !== 'mistake') continue;
    // fens[0] = start; a move's BEFORE-position index is (moveNumber-1)*2 (+1 for black).
    const fenIndex = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
    if (fenIndex < 0 || fenIndex >= fens.length) continue;
    const fen = fens[fenIndex];
    blunders.push({
      fen,
      playedSan: ann.san,
      bestSan: ann.bestMove ? uciToSan(fen, ann.bestMove) : undefined,
      cpLoss: ann.classification === 'blunder' ? 350 : 175,
      gamePhase: classifyPhase(fen, ann.moveNumber),
      moveNumber: ann.moveNumber,
    });
  }
  if (blunders.length === 0) return empty;

  return autoAnalyzeBlunders(blunders, {
    openingId: game.openingId ?? undefined,
    sourceGameId: gameId,
    learned: false,
  });
}
