// Import-time auto-analysis — the third faucet (David 2026-05-21: "tie
// game analysis in without needing a full review"). Given the blunders a
// game's Stockfish scan already found, classify each into a closed-set
// misconception and log it to the shared bucket — no interactive "why?"
// required (userReason is absent; the coach classifies from position +
// best move + eval alone). Game Review's interactive capture and this
// passive path write to the SAME bucket; this just front-runs it.

import { captureMisconception } from './discussionPractice';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { logAppAudit } from './appAuditor';
import { hasMisconceptionsForGame } from './misconceptionService';
import {
  replayPgnToFens,
  determinePlayerColor,
  uciToSan,
  buildMistakePuzzleFromCapture,
} from './mistakePuzzleService';
import { classifyPhase } from './gamePhaseService';
import type { MistakePuzzle } from '../types';

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
 *  `learned: false` (display-only): the misconception TALLY doesn't feed the
 *  formal weakness profile (the same games' `mistakePuzzles` already represent
 *  them — counting both would double-count). But it DOES now persist a drillable
 *  `mistakePuzzle` for every blunder/mistake — including the POSITIONAL ones the
 *  tactical gate in `generateMistakePuzzlesFromGame` drops — so every thinking
 *  error lands in the same weakness-puzzle pool My Mistakes / My Weaknesses
 *  drill (David 2026-06-11: "all of these need to go into the my weaknesses
 *  puzzles"). The puzzle persistence is idempotent by position (so it runs every
 *  time and back-fills already-tagged games); only the misconception LOGGING is
 *  once-per-game via `hasMisconceptionsForGame`. */
export async function autoAnalyzeGameMisconceptions(
  gameId: string,
  username?: string,
): Promise<AutoAnalyzeResult> {
  const empty: AutoAnalyzeResult = { classified: 0, logged: 0 };

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

  // Persist a drillable mistakePuzzle for each blunder — incl. the positional
  // ones the tactical gate drops — deduped by position against this game's
  // existing puzzles (the tactical ones the analyze pipeline already made). One
  // indexed query + one bulkAdd; idempotent, so it runs every call and catches
  // up already-tagged games.
  await persistMistakePuzzlesForBlunders(gameId, blunders);

  // Log the misconception TALLY once per game (bulk / review-walk / live).
  if (await hasMisconceptionsForGame(gameId)) return empty;
  return autoAnalyzeBlunders(blunders, {
    openingId: game.openingId ?? undefined,
    sourceGameId: gameId,
    learned: false,
  });
}

/** Persist drillable mistakePuzzles for a game's blunders, deduped by position
 *  against the game's existing puzzles. Idempotent — re-running adds nothing new
 *  (position keys already seen). Skips blunders with no recorded best move. */
async function persistMistakePuzzlesForBlunders(
  gameId: string,
  blunders: BlunderForAnalysis[],
): Promise<void> {
  const existing = await db.mistakePuzzles.where('sourceGameId').equals(gameId).toArray();
  const seen = new Set(existing.map((p) => `${p.fen}|${p.playerMoveSan}`));
  const fresh: MistakePuzzle[] = [];
  for (const b of blunders) {
    if (!b.bestSan) continue;
    const key = `${b.fen}|${b.playedSan}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const puzzle = buildMistakePuzzleFromCapture({
      fen: b.fen,
      playedSan: b.playedSan,
      bestSan: b.bestSan,
      cpLoss: b.cpLoss,
      gamePhase: b.gamePhase,
      moveNumber: b.moveNumber,
      sourceGameId: gameId,
    });
    if (puzzle) fresh.push(puzzle);
  }
  if (fresh.length > 0) await db.mistakePuzzles.bulkAdd(fresh);
}

/** One-time backfill: sweep the ALREADY-analyzed game library and fill the
 *  Thinking-Errors bucket from each game's annotations. The per-game bulk
 *  faucet only fires DURING analysis, so a library analyzed before the faucet
 *  existed never populated the tab — and re-analysis skips already-analyzed
 *  games. This catches those up (David 2026-06-11: "pulls from imported games
 *  that are analyzed?" — yes, but the existing library needed a backfill).
 *
 *  Cheap: reads stored annotations + the deterministic classifier (no LLM, no
 *  Stockfish). Idempotent per game (`hasMisconceptionsForGame`) AND gated by a
 *  meta flag so it runs once, not every boot. Yields to the event loop
 *  periodically so a big library doesn't jank the UI. Fire-and-forget. */
export async function backfillMisconceptionsFromAnalyzedGames(
  opts?: { force?: boolean },
): Promise<AutoAnalyzeResult> {
  // v2: re-sweep so already-tagged games also persist their POSITIONAL mistake
  // puzzles (the v1 sweep only logged the tally).
  const flagKey = 'misconceptions_backfill_v2';
  if (!opts?.force) {
    const done = await db.meta.get(flagKey);
    if (done?.value === 'true') return { classified: 0, logged: 0 };
  }

  const prefs = useAppStore.getState().activeProfile?.preferences;
  const chessComUsername = prefs?.chessComUsername;
  const lichessUsername = prefs?.lichessUsername;

  let classified = 0;
  let logged = 0;
  const games = await db.games.toArray();
  let processed = 0;
  for (const game of games) {
    if (!game.annotations || game.annotations.length === 0) continue;
    const username =
      game.source === 'chesscom' ? chessComUsername
      : game.source === 'lichess' ? lichessUsername
      : undefined;
    try {
      const r = await autoAnalyzeGameMisconceptions(game.id, username);
      classified += r.classified;
      logged += r.logged;
    } catch {
      /* continue — best-effort backfill */
    }
    // Yield every 20 games so the chess.js work doesn't block the UI thread.
    if (++processed % 20 === 0) await new Promise((res) => setTimeout(res, 0));
  }

  await db.meta.put({ key: flagKey, value: 'true' });
  void logAppAudit({
    kind: 'misconception-captured',
    category: 'subsystem',
    source: 'autoAnalyzeGame.backfillMisconceptionsFromAnalyzedGames',
    summary: `backfill swept ${games.length} games — classified=${classified} logged=${logged}`,
  });
  return { classified, logged };
}
