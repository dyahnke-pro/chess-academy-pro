import { openSentence } from '../utils/openSentence';
import { Chess } from 'chess.js';
import { classifyPhase } from './gamePhaseService';
import { db } from '../db/schema';
import { emitWeaknessModelChanged } from './weaknessModelEvents';
import { conceptSiblingsToPull, mistakeConcept } from './conceptSchedule';
import { createDefaultSrsFields, calculateNextInterval } from './srsEngine';
import { stockfishEngine } from './stockfishEngine';
import { growOneMove, shrinkOnMiss, solveLengthOf } from './mistakeLineGrowth';
import type { EvaluateMulti } from './criticalityScan';
import { gameReplyAfter } from './moveAllowed';
import { generateMistakeNarration } from './mistakeNarration';
import { voiceMistakeNarration } from './mistakeNarrationVoice';
import { detectTacticType } from './missedTacticService';
import { tacticTypeLabel } from './tacticAlertService';
import type { TacticType, MistakeNarration } from '../types';
import {
  detectPositionTransformation,
  transformationPrompt,
  type TransformationResult,
} from './positionTransformation';
import { getOpeningNameByEco, isBookLine } from './openingDetectionService';
import { isFixtureGame } from './fixtureGames';
import { playedAtMs, type WeaknessProvenance } from './weaknessSpine';
import { capEval } from './accuracyService';
import { verifySacrificeDeep, SAC_VERIFY_DEPTH } from './brilliancy';
import { BLUNDER_CP, isMateEval } from './engineConstants';
import { winPctLost, bandForWinPctLost, cpBand } from './accuracyService';
import type {
  MistakePuzzle,
  MistakeClassification,
  MistakeGamePhase,
  MistakePuzzleSourceMode,
  MistakePuzzleStatus,
  SrsGrade,
  GameRecord,
  GameSource,
  MoveAnnotation,
} from '../types';

// ─── Game context helpers ──────────────────────────────────────────────────

interface GameContext {
  opponentName: string | null;
  gameDate: string | null;
  openingName: string | null;
}

async function resolveGameContext(
  game: GameRecord,
  playerColor: 'white' | 'black',
): Promise<GameContext> {
  const opponentName = playerColor === 'white' ? game.black : game.white;

  // 3-tier fallback to match the OpeningsTab fix (PR #505): user's
  // repertoire wins → Lichess DB ECO→name lookup → null. Without the
  // ECO lookup, imported games with no repertoire-linked openingId
  // show "Unknown" on every costliest-mistake row even when game.eco
  // is set, because the user has to manually link the opening to
  // their repertoire to get a readable name.
  let openingName: string | null = null;
  if (game.openingId) {
    const opening = await db.openings.get(game.openingId);
    if (opening) openingName = opening.name;
  }
  if (!openingName && game.eco) {
    openingName = getOpeningNameByEco(game.eco);
  }

  return {
    opponentName: opponentName || null,
    gameDate: game.date || null,
    openingName,
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Minimum centipawn loss to create a puzzle. 50cp was too low — it
// generated puzzles for minor positional inaccuracies ("you should
// have played Bd3 instead of Be2") that aren't instructive. 150cp
// means the user missed a full piece-level opportunity — a real
// tactical shot worth drilling.
const CP_LOSS_THRESHOLD = 150;
// A book move drops below this and it's opening eval-noise (skip); at or above
// it's a genuine blunder that surfaces even in a named line (2.Qh5). Matches
// the local classifyCpLoss blunder band.
// Same number, same source of truth — a book move is exempt unless it is an
// outright blunder, and "blunder" is defined once (engineConstants).
const BOOK_BLUNDER_CP = BLUNDER_CP;
const MASTERY_REPETITIONS = 3;
const PV_EXTENSION_DEPTH = 14;
const BATCH_GAME_LIMIT = 100;

/** Adaptive PV-length banding by rating. David's directive
 *  2026-05-19: weaker players see shorter puzzles (1-3 player
 *  moves), intermediate 4-6, advanced 6+. Was a flat 3-5
 *  regardless of rating.
 *
 *  The bands target *player moves* (= half the UCI PV length since
 *  every player move alternates with an engine reply). Stockfish
 *  often returns a 10-12 move PV; we trim to the band's MAX. */

/** The move that took `fens[idx - 1]` to `fens[idx]`, for the classifier's
 *  in-between-move read. Null at the start or when the boards do not join. */
function moveIntoFen(fens: readonly string[], idx: number): { fenBefore: string; san: string } | null {
  if (idx < 1 || idx >= fens.length) return null;
  const fenBefore = fens[idx - 1];
  const target = fens[idx].split(' ').slice(0, 4).join(' ');
  try {
    const c = new Chess(fenBefore);
    for (const m of c.moves({ verbose: true })) {
      if (m.after.split(' ').slice(0, 4).join(' ') === target) return { fenBefore, san: m.san };
    }
  } catch { /* unreadable board — no previous move */ }
  return null;
}

export interface DepthBand { min: number; max: number; label: string; }
const RATING_BANDS: { upTo: number; band: DepthBand }[] = [
  { upTo: 1200, band: { min: 1, max: 3, label: 'beginner (1-3)' } },
  { upTo: 1700, band: { min: 4, max: 6, label: 'intermediate (4-6)' } },
  { upTo: Infinity, band: { min: 6, max: 10, label: 'advanced (6+)' } },
];
/** Pick the PV band (in PLAYER-moves) for a given puzzle-rating.
 *  Exported for unit testing — see `mistakePuzzleService.bands.test.ts`.
 *  Band boundaries are inclusive on the upper edge: 1200 → beginner,
 *  1201 → intermediate, 1700 → intermediate, 1701 → advanced. */
export function pvBandForRating(rating: number): DepthBand {
  for (const { upTo, band } of RATING_BANDS) {
    if (rating <= upTo) return band;
  }
  return RATING_BANDS[RATING_BANDS.length - 1].band;
}

/** Backward-compat constants for any existing callers that still
 *  reference the old flat range. Picks the BROAD union so the
 *  default behavior covers all bands until callers migrate to
 *  pvBandForRating. */
const MIN_PV_MOVES = 1;
const MAX_PV_MOVES = 10;

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `mp_${timestamp}_${random}`;
}

const PROMPT_TEXT: Record<MistakeClassification, string> = {
  inaccuracy: 'You had a better option here. Can you find it?',
  mistake: 'This move cost you. What should you have played?',
  blunder: 'Oops — this was a serious mistake. Find the best move.',
  miss: 'Your opponent made a mistake here. Find the best way to punish it!',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

// ⚠️ FALLBACK ONLY — centipawns are NOT the currency chess.com bands in, and
// neither do we (see `bandForWinPctLost`). This is reached only where the two
// evals are genuinely unavailable, so a partial record is still LABELLED
// rather than blank. Where the evals exist, the win% band decides.
//
// 🔒 ONE VOCABULARY FOR "MISTAKE" — the thresholds come from engineConstants,
// they are NOT retyped here (2026-09-20). This function is a SECOND
// `classifyCpLoss`: the rich, eval-aware one lives in `gameAnalysisService`,
// and this bare cpLoss one feeds the DRILL QUEUE. It carried its own literal
// 300/100, so the word "mistake" was defined twice — and a change to what the
// app calls a mistake would have moved review while leaving the drill queue on
// the old meaning, silently, with every test green. That is the duplicated-
// constant rot the fix-on-sight rule exists for, and it is the same shape as
// the `discovery`/`discovered_attack` enum split.
function classifyByCentipawnsFallback(cpLoss: number): MistakeClassification {
  return cpBand(cpLoss) ?? 'inaccuracy';
}

/** `GameSource` → the puzzle's source mode. Null ONLY for `'master'` — a
 *  master game is never the student's, so nothing about it is a slip of
 *  theirs. Held as a `Record` so a new `GameSource` member fails to compile
 *  here until someone answers for it. */
const PUZZLE_SOURCE_FOR_GAME: Record<GameSource, MistakePuzzleSourceMode | null> = {
  coach: 'coach',
  lichess: 'lichess',
  chesscom: 'chesscom',
  import: 'import',
  master: null,
};

function sourceFromGameSource(source: GameSource): MistakePuzzleSourceMode | null {
  return PUZZLE_SOURCE_FOR_GAME[source] ?? null;
}

// ─── Provenance (C9, 2026-09-22) ─────────────────────────────────────────────

/** WHERE a captured slip came from — the `WeaknessProvenance` shape the spine
 *  reads (origin / gameId / opponentName), plus the two fields a persisted
 *  `MistakePuzzle` needs verbatim: the game's SOURCE and its DATE string.
 *
 *  WHY IT IS REQUIRED. `buildMistakePuzzleFromCapture` used to hard-code
 *  `sourceMode: 'coach'`, `opponentName: null`, `gameDate: null` — and
 *  `autoAnalyzeGameMisconceptions` builds EVERY analysed import's positional
 *  slips through it. So My Mistakes read source "Coach", opponent "Unknown"
 *  and date = the import day for slips from a student's chess.com archive,
 *  and Weaknesses printed "vs Unknown · 2026-09-22" under a 2024 game. The
 *  writer's `from` is now a required parameter: a new writer fails to compile
 *  until it says where its slip came from. */
export interface MistakePuzzleProvenance extends WeaknessProvenance {
  origin: 'game';
  gameId: string;
  source: MistakePuzzleSourceMode;
  opponentName: string | null;
  /** The game's own date string (`GameRecord.date`), never the capture clock. */
  gameDate: string | null;
}

/** Provenance read off a game record. Null for a master game — it is nobody's
 *  slip, so no puzzle is built from it. */
export function mistakeProvenanceFromGame(
  game: GameRecord,
  playerColor: 'white' | 'black',
): MistakePuzzleProvenance | null {
  const source = sourceFromGameSource(game.source);
  if (!source) return null;
  const opponentName = playerColor === 'white' ? game.black : game.white;
  return {
    origin: 'game',
    gameId: game.id,
    source,
    opponentName: opponentName || null,
    gameDate: game.date || null,
    playedAt: playedAtMs(game.date),
  };
}

/** Provenance for a slip captured by game id (the live coach surfaces and the
 *  review capture know only the id). Reads the record when it exists; when it
 *  does not — a LIVE coach game is saved at its end, after every slip in it
 *  was captured — the answer is the honest one: a coach game, opponent and
 *  date unknown, never a guess. `playerColor` is used only when the record
 *  does not declare its own seat. */
export async function provenanceForGameId(
  gameId: string | undefined,
  playerColor?: 'white' | 'black',
): Promise<MistakePuzzleProvenance> {
  const unknownCoachGame: MistakePuzzleProvenance = {
    origin: 'game',
    gameId: gameId ?? '',
    source: 'coach',
    opponentName: null,
    gameDate: null,
  };
  if (!gameId) return unknownCoachGame;
  const game = await db.games.get(gameId).catch(() => undefined);
  if (!game) return unknownCoachGame;
  const seat = determinePlayerColor(game) ?? playerColor;
  if (!seat) return { ...unknownCoachGame, source: sourceFromGameSource(game.source) ?? 'coach', gameDate: game.date || null };
  return mistakeProvenanceFromGame(game, seat) ?? unknownCoachGame;
}

export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return uci;
  }
}

/**
 * Extend a PV line by iteratively playing moves and analyzing responses.
 * Targets [min..max] UCI moves — defaults to the wide 1..10 band but
 * callers pass the rating-banded range via pvBandForRating().
 *
 * The PV is in UCI half-moves (alternating player/engine). A 3-move
 * PV is 1.5 player moves; we hold the band at PLAYER-move count by
 * targeting max = playerMaxMoves * 2.
 */
async function extendPvLine(fen: string, pvMoves: string[], min = MIN_PV_MOVES, max = MAX_PV_MOVES): Promise<string[]> {
  if (pvMoves.length >= max) return pvMoves.slice(0, max);

  const extended = [...pvMoves];
  const chess = new Chess(fen);

  // Play existing moves
  for (const uci of extended) {
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    } catch {
      return extended;
    }
  }

  // Keep extending until we reach min or max
  while (extended.length < max) {
    if (chess.isGameOver()) break;
    try {
      const analysis = await stockfishEngine.analyzePosition(chess.fen(), PV_EXTENSION_DEPTH);
      const topLine = analysis.topLines[0] as { moves: string[] } | undefined;
      if (!topLine || topLine.moves.length === 0) break;

      // Add moves from the continuation
      for (const move of topLine.moves) {
        if (extended.length >= max) break;
        extended.push(move);
        try {
          chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move.length > 4 ? move[4] : undefined });
        } catch {
          return extended;
        }
      }

      if (extended.length >= min) break;
    } catch {
      break;
    }
  }

  return extended;
}

export function replayPgnToFens(pgn: string): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  try {
    chess.loadPgn(pgn);
    const moves = chess.history();
    chess.reset();
    for (const move of moves) {
      chess.move(move);
      fens.push(chess.fen());
    }
  } catch {
    // If PGN fails to load, return what we have
  }
  return fens;
}

export function determinePlayerColor(
  game: GameRecord,
  username?: string,
): 'white' | 'black' | null {
  // THE DECLARED SEAT FIRST (`GameRecord.studentSide`, 2026-09-19) — the field
  // that exists so no path has to guess from names. Names are the fallback.
  if (game.studentSide === 'white' || game.studentSide === 'black') return game.studentSide;
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return null;
  }
  if (username) {
    if (game.white.toLowerCase() === username.toLowerCase()) return 'white';
    if (game.black.toLowerCase() === username.toLowerCase()) return 'black';
  }
  return null;
}

// ─── Generation ─────────────────────────────────────────────────────────────

/**
 * Generate mistake puzzles from a completed game.
 * For coach games, annotations already have bestMove — extraction is instant.
 * For imported games with eval-only annotations (bestMove: null), runs Stockfish.
 * For imported games with NO annotations, runs full Stockfish analysis to detect mistakes.
 */
export async function generateMistakePuzzlesFromGame(
  gameId: string,
  username?: string,
  /** Player's current rating — used to band the PV length per
   *  pvBandForRating. Defaults to 1200 (beginner band) when
   *  unknown. David's directive 2026-05-19: weaker players get
   *  1-3 move puzzles, intermediate 4-6, advanced 6+. */
  playerRating = 1200,
): Promise<number> {
  const band = pvBandForRating(playerRating);
  // UCI PV is half-moves (alternating player/engine); player-move
  // count is half. Targets are in player-moves, so double for UCI.
  const uciMin = Math.max(1, band.min * 2 - 1);
  const uciMax = band.max * 2;
  const metaKey = `mistakes_generated_${gameId}`;
  const existing = await db.meta.get(metaKey);
  if (existing?.value === 'true') return 0;

  const game = await db.games.get(gameId);
  if (!game) return 0;
  // A DEMO game never writes into the student's record (D5, 2026-09-22).
  if (isFixtureGame(game)) return 0;

  const sourceMode = sourceFromGameSource(game.source);
  if (!sourceMode) return 0;

  const playerColor = determinePlayerColor(game, username);
  if (!playerColor) return 0;

  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return 0;

  // If no annotations exist, run Stockfish analysis to find mistakes
  if (!game.annotations || game.annotations.length === 0) {
    return analyzeGameWithStockfish(game, gameId, sourceMode, playerColor, fens, uciMin, uciMax);
  }

  return generateFromAnnotations(game, gameId, sourceMode, playerColor, fens, uciMin, uciMax);
}

const ANALYSIS_DEPTH = 12;

/**
 * Analyze a game move-by-move with Stockfish to detect mistakes.
 * Used for imported games that lack eval annotations.
 */
async function analyzeGameWithStockfish(
  game: GameRecord,
  gameId: string,
  sourceMode: MistakePuzzleSourceMode,
  playerColor: 'white' | 'black',
  fens: string[],
  uciMin: number,
  uciMax: number,
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const srsDefaults = createDefaultSrsFields();
  const now = new Date().toISOString();
  const puzzles: MistakePuzzle[] = [];
  const gameContext = await resolveGameContext(game, playerColor);

  // Replay to get SAN moves
  const chess = new Chess();
  const moves: string[] = [];
  try {
    chess.loadPgn(game.pgn);
    moves.push(...chess.history());
  } catch {
    await db.meta.put({ key: metaKey, value: 'true' });
    return 0;
  }

  // Analyze each position to build an eval curve
  // fens[0] = starting position, fens[i] = position after move i
  const evals: (number | null)[] = [];

  try {
    await stockfishEngine.initialize();
  } catch {
    await db.meta.put({ key: metaKey, value: 'true' });
    return 0;
  }

  // Analyze every position to build a complete eval curve.
  // We need evals before and after each player move to detect mistakes.
  for (let i = 0; i < fens.length; i++) {
    try {
      const analysis = await stockfishEngine.analyzePosition(fens[i], ANALYSIS_DEPTH);
      evals.push(analysis.evaluation);
    } catch {
      evals.push(null);
    }
  }

  // Walk through player moves and detect mistakes
  const annotations: MoveAnnotation[] = [];

  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const moveColor: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    if (moveColor !== playerColor) continue;

    const fenBeforeIdx = moveIdx;       // fens[moveIdx] = position before this move
    const fenAfterIdx = moveIdx + 1;    // fens[moveIdx+1] = position after this move

    const evalBefore = evals[fenBeforeIdx];
    const evalAfter = evals[fenAfterIdx];
    if (evalBefore === null || evalAfter === null) continue;

    // Both evals are from White's perspective. Clamp through capEval so a
    // mate score (±30000) can't inflate the stored cpLoss the insights
    // screen averages (David 2026-08-28: "make sure the mistakes are accurate").
    const cpLoss = playerColor === 'white'
      ? capEval(evalBefore) - capEval(evalAfter)
      : capEval(evalAfter) - capEval(evalBefore);

    if (cpLoss < CP_LOSS_THRESHOLD) continue;

    // BOOK-move exemption (David 2026-08-28: "Move 1 or 2 shouldn't be auto
    // marked as mistakes … don't just code to never show an error in the
    // first 2 moves"). A theory move isn't flagged for opening eval-NOISE —
    // but a genuine BLUNDER still surfaces even in a "named" line (2.Qh5,
    // the Wayward Queen, is in the DB yet drops ~400cp). So skip book moves
    // only below the blunder magnitude; the principled gate, not a ply cutoff.
    if (cpLoss < BOOK_BLUNDER_CP && isBookLine(moves.slice(0, moveIdx + 1))) continue;

    const moveNumber = Math.floor(moveIdx / 2) + 1;
    // 🔒 BAND IN EXPECTED POINTS, LIKE CHESS.COM AND LIKE REVIEW (2026-09-20).
    // This read `classifyCpLoss(cpLoss)` — raw centipawns — so the SAME move
    // could be an "inaccuracy" on the review screen and a "mistake" in the
    // drill it generated. Both evals are already in hand here (cpLoss was
    // computed from them three lines up), so there is nothing to thread.
    //
    // A null band is a VERDICT, not a gap: the move gave up less than an
    // inaccuracy in win-probability terms — 300cp handed back at +9 — and
    // chess.com would not flag it, so neither do we. Don't build a drill that
    // teaches a student they erred when the position says they didn't.
    const band = bandForWinPctLost(winPctLost(evalBefore, evalAfter, isWhiteMove));
    if (!band) continue;
    const classification: MistakeClassification = band;
    // Bounds check: truncated PGNs produce fewer FENs than moves.
    if (fenBeforeIdx >= fens.length) continue;
    const fen = fens[fenBeforeIdx];

    // SOUND-SACRIFICE EXEMPTION (David 2026-09-14): a material sacrifice the
    // depth-12 curve read as a loss is NOT a mistake — re-verify deep before
    // recording a puzzle/weakness, so a brilliancy never becomes a drilled
    // "weakness". Gated on describeSacrifice inside the helper (rare).
    const { soundSac } = await verifySacrificeDeep({
      fenBefore: fen,
      san: moves[moveIdx],
      isWhiteMove,
      analyzeAfterWhiteCp: async (fa) => {
        try {
          return (await stockfishEngine.analyzePosition(fa, SAC_VERIFY_DEPTH)).evaluation;
        } catch {
          return null;
        }
      },
    });
    if (soundSac) continue;

    // Get best move + PV line via Stockfish at higher depth
    let bestMove: string | null = null;
    let pvMoves: string[] = [];
    try {
      const bestAnalysis = await stockfishEngine.analyzePosition(fen, 18);
      bestMove = bestAnalysis.bestMove;
      const topLine = bestAnalysis.topLines[0] as { moves: string[] } | undefined;
      if (topLine) pvMoves = topLine.moves;
    } catch {
      continue;
    }
    if (!bestMove) continue;

    // 🔒 SOLUTION INTEGRITY (R3/R5, David 2026-09-01) — the drill validates the
    // student's move against moves[0], while the "best move was X" text and the
    // HINT'S PIECE are derived from bestMoveSan. So moves[0] and bestMove MUST be
    // the same move. Stockfish's committed `bestmove` is the answer; if the
    // captured PV starts with a DIFFERENT move (a stale multipv / info line),
    // rebuild the line from bestmove so the solution, the shown best move, and
    // the hint's piece all agree. This is the "think about your knight" hint on
    // a pawn-move solution David reported. No-op when they already match.
    if (pvMoves.length === 0 || pvMoves[0] !== bestMove) {
      pvMoves = [bestMove];
    }

    // Extend PV to the rating-banded UCI range (player-moves
    // mapped to UCI half-moves; see pvBandForRating).
    if (pvMoves.length < uciMin) {
      pvMoves = pvMoves.length > 0 ? pvMoves : [bestMove];
      pvMoves = await extendPvLine(fen, pvMoves, uciMin, uciMax);
    } else if (pvMoves.length > uciMax) {
      pvMoves = pvMoves.slice(0, uciMax);
    }

    const bestMoveSan = uciToSan(fen, bestMove);
    const san = moves[moveIdx];
    const gamePhase = classifyPhase(fen, { fullMove: moveNumber });

    // Player's actual move in UCI + SAN.
    // chess.js 1.4.0 RETURNS null on illegal moves (older versions
    // threw) — the null would have hit TypeError on .from access
    // below, still caught by the existing try/catch but only by
    // happy accident. Explicit null-check makes the fallback
    // intent clear and future-proofs against chess.js upgrades.
    let playerMove = '';
    const playerMoveSan = san;
    try {
      const c = new Chess(fen);
      const m = c.move(san);
      playerMove = m
        ? m.from + m.to + (m.promotion ?? '')
        : san;
    } catch {
      playerMove = san;
    }

    // Skip if deeper analysis confirms the player's move was actually best
    if (bestMove === playerMove || bestMoveSan === playerMoveSan) continue;

    // ─── Tactical quality gate ──────────────────────────────────────
    // Create puzzles for positions with a CONCRETE tactical motif (fork,
    // pin, skewer, discovered attack, back-rank, removing the guard,
    // promotion, checkmate pattern). Generic 'tactical_sequence' misses are
    // normally dropped — bland "find the slightly better move" drills.
    // EXCEPTION (Phase 4, David 2026-08-26 "position transformation is
    // huge"): keep such a miss when it's a clear POSITION-TRANSFORMATION
    // error — a bad or declined even trade — at mistake level or worse. High
    // precision (the detector returns null unless the shape is clearly a
    // trade), so the queue is not flooded. tacticType=null → the spine
    // buckets it as a positional (phase) weakness.
    let tacticType: TacticType | null = detectTacticType(fen, bestMove, pvMoves, moveIntoFen(fens, fenBeforeIdx) ?? undefined);
    let transformation: TransformationResult | null = null;
    if (tacticType === 'tactical_sequence') {
      transformation = (classification === 'mistake' || classification === 'blunder')
        ? detectPositionTransformation(fen, playerMove, bestMove)
        : null;
      if (!transformation) continue;
      tacticType = null;
    }

    // Cap solution length at 6 ply (3 full moves). Longer sequences
    // are too complex to learn from as a drill.
    if (pvMoves.length > 6) {
      pvMoves = pvMoves.slice(0, 6);
    }

    // Eval before mistake from the player's perspective (positive = player is better)
    const evalBeforeFromPlayer = playerColor === 'white'
      ? evalBefore / 100
      : -evalBefore / 100;

    const movesUci = pvMoves.join(' ');
    const narrationParams = {
      classification,
      gamePhase,
      playerMoveSan,
      bestMoveSan,
      cpLoss: Math.round(cpLoss),
      fen,
      moves: movesUci,
      opponentName: gameContext.opponentName,
      gameDate: gameContext.gameDate,
      openingName: gameContext.openingName,
      evalBefore: evalBeforeFromPlayer,
      // What they answered in the game — the card leads with what it punished.
      allowedReplySan: moves[moveIdx + 1] ?? null,
      // Mate for the OPPONENT after the move (both evals White POV).
      allowedMate: isMateEval(evalAfter) && (playerColor === 'white' ? evalAfter < 0 : evalAfter > 0),
    };
    // PASS 1 computes the facts (distilled note first, board read behind it);
    // PASS 2 hands them to the phrasing model through the one grounding
    // chokepoint. A phrasing failure returns PASS 1 unchanged.
    const narration = await voiceMistakeNarration(
      generateMistakeNarration(narrationParams),
      narrationParams,
    );

    // Store annotation for the game record. Centipawns, White POV —
    // same contract as gameAnalysisService (legacy `/ 100` storage
    // retired when `bestMoveEval` was added).
    annotations.push({
      moveNumber,
      color: moveColor,
      san,
      evaluation: evalAfter,
      bestMove,
      // `evalBefore` is the engine's read of the position before this
      // move — what the player could have achieved with best play.
      bestMoveEval: evalBefore,
      classification,
      comment: null,
    });

    puzzles.push({
      id: generateId(),
      fen,
      playerMove,
      playerMoveSan,
      bestMove,
      bestMoveSan,
      moves: movesUci,
      cpLoss: Math.round(cpLoss),
      classification,
      gamePhase,
      moveNumber,
      sourceGameId: gameId,
      sourceMode,
      playerColor,
      promptText: tacticType
        ? `${openSentence(tacticTypeLabel(tacticType))} — ${PROMPT_TEXT[classification]}`
        : (transformation ? transformationPrompt(transformation) : PROMPT_TEXT[classification]),
      narration,
      createdAt: now,
      opponentName: gameContext.opponentName,
      gameDate: gameContext.gameDate,
      openingName: gameContext.openingName,
      // STORED in centipawns (player POV) — the unit getMistakeInsights reads
      // with a ±100cp threshold. `evalBeforeFromPlayer` is PAWNS here (fed to
      // the narration, which wants pawns), so scale up for the field. Before
      // this fix Path A stored PAWNS (e.g. 1.5), so the situation classifier —
      // which expects centipawns — bucketed every Path-A mistake as "equal"
      // (1.5 is never >100). Loop audit 2026-09-09.
      evalBefore: Math.round(evalBeforeFromPlayer * 100),
      srsInterval: srsDefaults.interval,
      srsEaseFactor: srsDefaults.easeFactor,
      srsRepetitions: srsDefaults.repetitions,
      srsDueDate: srsDefaults.dueDate,
      srsLastReview: null,
      status: 'unsolved',
      attempts: 0,
      successes: 0,
      tacticType,
      positionalMotif: transformation ? transformation.kind : null,
    });
  }

  // Save annotations back to the game record so they're available for game review
  if (annotations.length > 0) {
    await db.games.update(gameId, { annotations });
  }

  if (puzzles.length > 0) {
    await db.mistakePuzzles.bulkAdd(puzzles);
    emitWeaknessModelChanged();
  }

  await db.meta.put({ key: metaKey, value: 'true' });
  return puzzles.length;
}

/**
 * Generate puzzles from existing annotations (coach games or games with eval data).
 */
async function generateFromAnnotations(
  game: GameRecord,
  gameId: string,
  sourceMode: MistakePuzzleSourceMode,
  playerColor: 'white' | 'black',
  fens: string[],
  uciMin = MIN_PV_MOVES,
  uciMax = MAX_PV_MOVES,
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const srsDefaults = createDefaultSrsFields();
  const now = new Date().toISOString();
  const puzzles: MistakePuzzle[] = [];
  const annotations = game.annotations ?? [];
  const gameContext = await resolveGameContext(game, playerColor);

  for (const annotation of annotations) {
    if (annotation.color !== playerColor) continue;

    const isQualifying =
      annotation.classification === 'inaccuracy' ||
      annotation.classification === 'mistake' ||
      annotation.classification === 'blunder' ||
      annotation.classification === 'miss';
    if (!isQualifying) continue;

    // Calculate the FEN index: move 1 white = index 0 (before) → 1 (after),
    // move 1 black = index 1 (before) → 2 (after), etc.
    const fenIndex = (annotation.moveNumber - 1) * 2 + (annotation.color === 'black' ? 1 : 0);
    if (fenIndex < 0 || fenIndex >= fens.length) continue;

    const fen = fens[fenIndex]; // position BEFORE the bad move

    // SOUND-SACRIFICE EXEMPTION (David 2026-09-14): even when an annotation was
    // graded a slip by a classifier that isn't sac-aware (the sweep, an older
    // stored game, the crude importer), a material sacrifice that holds up deep
    // is NOT a mistake — never turn a brilliancy into a drilled "weakness". Gated
    // on describeSacrifice inside the helper (rare); the review classifier now
    // grades most sound sacs great/brilliant up front, so this is the safety net.
    const { soundSac } = await verifySacrificeDeep({
      fenBefore: fen,
      san: annotation.san,
      isWhiteMove: annotation.color === 'white',
      analyzeAfterWhiteCp: async (fa) => {
        try {
          return (await stockfishEngine.analyzePosition(fa, SAC_VERIFY_DEPTH)).evaluation;
        } catch {
          return null;
        }
      },
    });
    if (soundSac) continue;

    // Determine cpLoss from eval data
    let cpLoss: number | null = null;
    if (annotation.evaluation !== null) {
      // Find the annotation for the move right before this one
      let prevEval: number | null = null;
      for (const ann of annotations) {
        const annIdx = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
        if (annIdx === fenIndex - 1) {
          prevEval = ann.evaluation;
          break;
        }
      }

      if (prevEval !== null) {
        // Both evals are White-POV centipawns, clamped through capEval so a
        // mate score (±30000) can't inflate the stored cpLoss (David
        // 2026-08-28). The `* 100` that used to live here compensated for
        // the legacy pawn-unit storage in gameAnalysisService — that storage
        // was switched to centipawns when `bestMoveEval` was added, so the
        // raw difference IS the cpLoss now.
        const prev = capEval(prevEval);
        const cur = capEval(annotation.evaluation);
        if (playerColor === 'white') {
          cpLoss = Math.round(Math.max(0, prev - cur));
        } else {
          cpLoss = Math.round(Math.max(0, cur - prev));
        }
      }
    }

    // For imported games, detectBlunders already gives us eval in pawns
    // and classifies the drop. Use the classification to estimate cpLoss if needed.
    if (cpLoss === null) {
      if (annotation.classification === 'blunder') cpLoss = 350;
      else if (annotation.classification === 'mistake') cpLoss = 175;
      else if (annotation.classification === 'miss') cpLoss = 100;
      else cpLoss = 75;
    }

    if (cpLoss < CP_LOSS_THRESHOLD) continue;

    // Get bestMove + PV line via Stockfish (or annotation for quick fallback)
    let bestMove = annotation.bestMove;
    let pvMoves: string[] = [];
    // The fresh depth-18 read of `fen` (the position BEFORE the move) IS the
    // pre-move eval — i.e. `evalBefore`. Capture it (White-POV cp) so the
    // situation panel can be filled even when the prev-ply annotation carried
    // no evaluation (loop audit 2026-09-09: 14 of 21 mistake puzzles had a null
    // evalBefore because the light review analysis leaves most plies unscored,
    // so the annotation-based lookup below found nothing).
    let posEvalWhiteCp: number | null = null;

    try {
      const analysis = await stockfishEngine.analyzePosition(fen, 18);
      if (!bestMove) bestMove = analysis.bestMove;
      if (typeof analysis.evaluation === 'number' && !analysis.isMate) posEvalWhiteCp = analysis.evaluation;
      else if (analysis.isMate && typeof analysis.mateIn === 'number') posEvalWhiteCp = analysis.mateIn > 0 ? 3000 : -3000;
      // Get the PV line (multi-move continuation) from top line
      const topLine = analysis.topLines[0] as { moves: string[] } | undefined;
      if (topLine) pvMoves = topLine.moves;
    } catch {
      if (!bestMove) continue; // Skip if no bestMove at all
    }

    if (!bestMove) continue;

    // 🔒 SOLUTION INTEGRITY (R3/R5, David 2026-09-01) — the drill validates the
    // student's move against moves[0], while the "best move was X" text and the
    // HINT'S PIECE come from bestMoveSan. So moves[0] and bestMove MUST be the
    // same move. The bestMove here is the mistake annotation's committed
    // depth-18 answer; the PV comes from a SEPARATE fresh search that can start
    // on a different move (a stale multipv / info line) — which is exactly the
    // "think about your knight" hint on a pawn-move solution David reported.
    // Rebuild the line from bestmove so the solution, the shown best move, and
    // the hint's piece all agree. No-op when they already match.
    if (pvMoves.length === 0 || pvMoves[0] !== bestMove) {
      pvMoves = [bestMove];
    }

    // Extend PV to the rating-banded UCI range (player-moves
    // mapped to UCI half-moves; see pvBandForRating).
    if (pvMoves.length < uciMin) {
      pvMoves = pvMoves.length > 0 ? pvMoves : [bestMove];
      pvMoves = await extendPvLine(fen, pvMoves, uciMin, uciMax);
    } else if (pvMoves.length > uciMax) {
      pvMoves = pvMoves.slice(0, uciMax);
    }

    // Tactical quality gate — same filter as the imported-game path. The
    // tactical_sequence skip is DEFERRED to after playerMove/classification are
    // known, so the Phase 4 position-transformation exception can run.
    let tacticType: TacticType | null = detectTacticType(fen, bestMove, pvMoves, moveIntoFen(fens, fenIndex) ?? undefined);
    let transformation: TransformationResult | null = null;

    // Cap solution length at 6 ply for clean, focused drills.
    if (pvMoves.length > 6) {
      pvMoves = pvMoves.slice(0, 6);
    }

    const movesUci = pvMoves.join(' ');
    const bestMoveSan = uciToSan(fen, bestMove);
    // 🔒 REUSE THE BAND THE ANNOTATION ALREADY CARRIES — do not re-derive it.
    // The annotation's `classification` was produced by `classifyCpLoss` in
    // gameAnalysisService, which bands in EXPECTED POINTS. Re-deriving it here
    // from raw centipawns computed a SECOND, disagreeing verdict for the same
    // move — the drill could call "mistake" what the review screen the student
    // just read called "inaccuracy". The annotation is the source of truth;
    // centipawns are only the fallback when it carries no band at all.
    const carried = annotation.classification;
    const classification: MistakeClassification =
      carried === 'miss' ? 'miss'
        : (carried === 'inaccuracy' || carried === 'mistake' || carried === 'blunder') ? carried
          : classifyByCentipawnsFallback(cpLoss);
    const gamePhase = classifyPhase(fen, { fullMove: annotation.moveNumber });

    // Determine player's move in UCI + SAN format from annotation
    let playerMove = '';
    const playerMoveSan = annotation.san;
    try {
      const chess = new Chess(fen);
      const move = chess.move(annotation.san);
      playerMove = move.from + move.to + (move.promotion ?? '');
    } catch {
      playerMove = annotation.san;
    }

    // Skip if deeper analysis confirms the player's move was actually best
    if (bestMove === playerMove || bestMoveSan === playerMoveSan) continue;

    // Deferred tactical gate + Phase 4 positional exception: a non-tactical
    // miss is kept only when it's a clear position-transformation error at
    // mistake level or worse; tacticType=null buckets it as a positional
    // weakness.
    if (tacticType === 'tactical_sequence') {
      transformation = (classification === 'mistake' || classification === 'blunder')
        ? detectPositionTransformation(fen, playerMove, bestMove)
        : null;
      if (!transformation) continue;
      tacticType = null;
    }

    // Pre-mistake eval (player perspective, CENTIPAWNS — same unit the stored
    // MistakePuzzle.evalBefore field carries and the situation classifier in
    // getMistakeInsights reads with a ±100cp threshold). Prefer the prev-ply
    // annotation's score; fall back to the fresh depth-18 read of `fen` (the
    // pre-move position) so a light review analysis with unscored plies still
    // fills the situation panel instead of leaving evalBefore null.
    let evalBeforeCp: number | null = null;
    if (annotation.evaluation !== null) {
      let prevEval: number | null = null;
      for (const ann of annotations) {
        const annIdx = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
        if (annIdx === fenIndex - 1) {
          prevEval = ann.evaluation;
          break;
        }
      }
      if (prevEval !== null) {
        evalBeforeCp = playerColor === 'white' ? prevEval : -prevEval;
      }
    }
    if (evalBeforeCp === null && posEvalWhiteCp !== null) {
      evalBeforeCp = playerColor === 'white' ? posEvalWhiteCp : -posEvalWhiteCp;
    }

    const narrationParams = {
      classification,
      gamePhase,
      playerMoveSan,
      bestMoveSan,
      cpLoss,
      fen,
      moves: movesUci,
      opponentName: gameContext.opponentName,
      gameDate: gameContext.gameDate,
      openingName: gameContext.openingName,
      // generateMistakeNarration expects evalBefore in PAWNS (player POV).
      evalBefore: evalBeforeCp !== null ? evalBeforeCp / 100 : null,
      // What they answered in the game — the card leads with what it punished.
      allowedReplySan: annotations.find(
        (a) => (a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0) === fenIndex + 1,
      )?.san ?? null,
    };
    const narration = await voiceMistakeNarration(
      generateMistakeNarration(narrationParams),
      narrationParams,
    );

    puzzles.push({
      id: generateId(),
      fen,
      playerMove,
      playerMoveSan,
      bestMove,
      bestMoveSan,
      moves: movesUci,
      cpLoss,
      classification,
      gamePhase,
      moveNumber: annotation.moveNumber,
      sourceGameId: gameId,
      sourceMode,
      playerColor,
      promptText: tacticType
        ? `${openSentence(tacticTypeLabel(tacticType))} — ${PROMPT_TEXT[classification]}`
        : (transformation ? transformationPrompt(transformation) : PROMPT_TEXT[classification]),
      narration,
      createdAt: now,
      opponentName: gameContext.opponentName,
      gameDate: gameContext.gameDate,
      openingName: gameContext.openingName,
      // STORED in centipawns (player POV) — the unit getMistakeInsights reads.
      evalBefore: evalBeforeCp !== null ? Math.round(evalBeforeCp) : null,
      srsInterval: srsDefaults.interval,
      srsEaseFactor: srsDefaults.easeFactor,
      srsRepetitions: srsDefaults.repetitions,
      srsDueDate: srsDefaults.dueDate,
      srsLastReview: null,
      status: 'unsolved',
      attempts: 0,
      successes: 0,
      tacticType,
      positionalMotif: transformation ? transformation.kind : null,
    });
  }

  if (puzzles.length > 0) {
    await db.mistakePuzzles.bulkAdd(puzzles);
    emitWeaknessModelChanged();
  }

  await db.meta.put({ key: metaKey, value: 'true' });
  return puzzles.length;
}

/**
 * Batch-generate mistake puzzles for multiple imported games.
 * Runs sequentially to avoid overloading Stockfish.
 */
export async function generateMistakePuzzlesForBatch(
  gameIds: string[],
  username: string,
  playerRating?: number,
): Promise<number> {
  // Limit to most recent games to avoid bogging down the system
  const limitedIds = gameIds.slice(-BATCH_GAME_LIMIT);
  let total = 0;
  for (const id of limitedIds) {
    total += await generateMistakePuzzlesFromGame(id, username, playerRating);
  }
  return total;
}


// ─── Queries ────────────────────────────────────────────────────────────────

export async function getMistakePuzzlesDue(
  limit: number = 20,
): Promise<MistakePuzzle[]> {
  const today = new Date().toISOString().split('T')[0];
  const due = await db.mistakePuzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .toArray();

  // Prioritize newest games first; games older than 1 year are lowest priority
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  due.sort((a, b) => {
    const dateA = a.gameDate ? new Date(a.gameDate).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.gameDate ? new Date(b.gameDate).getTime() : new Date(b.createdAt).getTime();
    const oldA = (now - dateA) > oneYear;
    const oldB = (now - dateB) > oneYear;
    if (oldA !== oldB) return oldA ? 1 : -1;
    return dateB - dateA;
  });

  return due.slice(0, limit);
}

export async function getMistakePuzzlesByGame(
  gameId: string,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('sourceGameId')
    .equals(gameId)
    .toArray();
}

export async function getMistakePuzzlesByClassification(
  classification: MistakeClassification,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('classification')
    .equals(classification)
    .toArray();
}

/** Position identity for capture dedup — placement+side+castling+ep (no
 *  move counters) + the played SAN. Mirrors weaknessSpine.posKey. */
function capturePosKey(fen: string, san: string): string {
  return `${fen.split(' ').slice(0, 4).join(' ')}|${san}`;
}

export interface CapturePuzzleInput {
  fen: string;
  playedSan: string;
  bestSan: string;
  cpLoss?: number;
  gamePhase?: MistakeGamePhase;
  moveNumber?: number;
  openingName?: string;
  /** REQUIRED — where the slip came from (see `MistakePuzzleProvenance`). A
   *  caller that does not know resolves it with `provenanceForGameId`. */
  from: MistakePuzzleProvenance;
  /** Pre-move eval, PLAYER POV, CENTIPAWNS — fills the "Errors by Situation"
   *  panel (getMistakeInsights thresholds at ±100cp). Null/omitted when the
   *  capture had no eval (a live slip with no engine read); the panel then
   *  honestly leaves that puzzle unclassified. Loop audit 2026-09-09. */
  evalBefore?: number | null;
  /** The opponent's best reply to the played move (`pvAfterPlayed[0]`), when
   *  the capture has it — the card leads with what that reply punishes. */
  allowedReplySan?: string | null;
  /** The engine line from this position starting with the best move
   *  (`pvAfterBest`), SAN — classifies the tactic on the whole line. */
  bestLineSan?: readonly string[];
}

/** A stored card's narration, rebuilt from its stored facts plus the move the
 *  opponent actually answered with in the game — the same computer that built
 *  it, so an old card reads like a new one. */
export function rerenderMistakeNarration(p: MistakePuzzle, pgn: string | null): MistakeNarration {
  return generateMistakeNarration({
    classification: p.classification,
    gamePhase: p.gamePhase,
    playerMoveSan: p.playerMoveSan,
    bestMoveSan: p.bestMoveSan,
    cpLoss: p.cpLoss,
    fen: p.fen,
    moves: p.moves,
    opponentName: p.opponentName,
    gameDate: p.gameDate,
    openingName: p.openingName,
    evalBefore: p.evalBefore !== null ? p.evalBefore / 100 : null,
    allowedMate: /forced mate/.test(p.narration.intro),
    allowedReplySan: pgn ? gameReplyAfter(pgn, p.fen, p.playerMoveSan) : null,
  });
}

/** SAN line → UCI from `fen`, stopping at the first move that does not play. */
export function lineToUci(fen: string, sans: readonly string[] | undefined): string[] | undefined {
  if (!sans || sans.length === 0) return undefined;
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const san of sans) {
      const m = c.move(san);
      if (!m) break;
      out.push(`${m.from}${m.to}${m.promotion ?? ''}`);
    }
  } catch { /* keep what played */ }
  return out.length > 0 ? out : undefined;
}

/** Option B of the weakness-spine unification (David 2026-05-25): a mistake
 *  the COACH catches in conversation (review / play / opening-play) is also
 *  written as a drillable mistakePuzzle, so it surfaces in My Mistakes and
 *  Tactics like an Analyze-derived one — not just as a misconception tally.
 *  Deduped by position so it never duplicates an Analyze puzzle for the same
 *  slip (the read-side weaknessSpine dedup also collapses any overlap). Needs
 *  fen + playedSan + bestSan; derives UCI via chess.js and skips silently on
 *  any illegal/ambiguous SAN (we never write a bad puzzle — CLAUDE.md
 *  "when unsure, skip"). */
export async function addMistakePuzzleFromCapture(
  input: CapturePuzzleInput,
): Promise<MistakePuzzle | null> {
  const puzzle = buildMistakePuzzleFromCapture(input);
  if (!puzzle) return null;

  // Dedup against any existing puzzle for the same position+move.
  const key = capturePosKey(input.fen, input.playedSan);
  const existing = await db.mistakePuzzles.toArray();
  if (existing.some((p) => capturePosKey(p.fen, p.playerMoveSan) === key)) return null;

  await db.mistakePuzzles.add(puzzle);
  emitWeaknessModelChanged();
  return puzzle;
}

/** Depth + ply budget for turning a captured single-move `tactical_sequence`
 *  puzzle into a real forcing SEQUENCE. 5 plies ≈ 3 student moves to calculate. */
const SEQUENCE_SOLUTION_DEPTH = 16;
const SEQUENCE_MAX_PLIES = 5;

/** Upgrade a single-move `tactical_sequence` mistake puzzle into the real
 *  multi-move forcing line so the "Tactical Sequences" drill teaches a
 *  SEQUENCE, not a one-move blunder-fix (David 2026-07-14: "I want tactical
 *  sequences tho, just one move solves"). The line is Stockfish's principal
 *  variation from the mistake position — G3-safe: the ENGINE computes every
 *  move, never the LLM. Only touches puzzles that are `tactical_sequence` AND
 *  stored as a single ply; everything else returns unchanged. The extension is
 *  PERSISTED so it's a one-time cost per puzzle. Returns the possibly-updated
 *  puzzle (never throws — on any failure the original single-move puzzle is
 *  returned so the drill still works). */
export async function ensureSequenceSolution(puzzle: MistakePuzzle): Promise<MistakePuzzle> {
  if (puzzle.tacticType !== 'tactical_sequence') return puzzle;
  const plies = puzzle.moves.trim().split(/\s+/).filter(Boolean);
  if (plies.length !== 1) return puzzle; // already a sequence (or malformed)

  try {
    await stockfishEngine.initialize();
    const analysis = await stockfishEngine.analyzePosition(puzzle.fen, SEQUENCE_SOLUTION_DEPTH);
    const pv = analysis.topLines[0]?.moves ?? [];
    // The PV must OPEN with this puzzle's own best move — otherwise a re-eval
    // has picked a different solution and extending would teach a line the
    // puzzle wasn't built around. Keep the single move in that case.
    if (pv.length < 2 || pv[0] !== puzzle.bestMove) return puzzle;

    // Verify the whole line is legal from the mistake FEN before trusting it
    // (chess.js is the truth; never persist a corrupt line — CLAUDE.md G3).
    const line = pv.slice(0, SEQUENCE_MAX_PLIES);
    const chess = new Chess(puzzle.fen);
    for (const uci of line) {
      const m = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      if (!m) return puzzle;
    }

    const moves = line.join(' ');
    if (moves === puzzle.moves) return puzzle;
    await db.mistakePuzzles.update(puzzle.id, { moves }).catch(() => undefined);
    return { ...puzzle, moves };
  } catch {
    return puzzle;
  }
}

/** Pure builder: turn a captured slip (fen + playedSan + bestSan) into a fully-
 *  formed MistakePuzzle WITHOUT touching Dexie — so it can seed an in-memory
 *  drill queue (the per-misconception "drill this exact moment" surface) using
 *  the SAME puzzle shape + board the analyze pipeline produces. Returns null on
 *  any illegal/ambiguous SAN (never build a bad puzzle — CLAUDE.md "when unsure,
 *  skip"). `addMistakePuzzleFromCapture` wraps this with dedup + persistence. */
export function buildMistakePuzzleFromCapture(
  input: CapturePuzzleInput,
): MistakePuzzle | null {
  const { fen, playedSan, bestSan } = input;
  if (!fen || !playedSan || !bestSan) return null;

  // Derive UCI for both moves from the position-before fen.
  let playerMove: string;
  let bestMove: string;
  let playerColor: 'white' | 'black';
  try {
    const c1 = new Chess(fen);
    playerColor = c1.turn() === 'w' ? 'white' : 'black';
    const pm = c1.move(playedSan);
    playerMove = `${pm.from}${pm.to}${pm.promotion ?? ''}`;
    const c2 = new Chess(fen);
    const bm = c2.move(bestSan);
    bestMove = `${bm.from}${bm.to}${bm.promotion ?? ''}`;
  } catch {
    return null; // illegal/ambiguous SAN for this fen — don't build junk
  }

  const cpLoss = input.cpLoss && input.cpLoss > 0 ? Math.round(input.cpLoss) : 150;
  const classification = classifyByCentipawnsFallback(cpLoss);
  const gamePhase = input.gamePhase ?? classifyPhase(fen, { fullMove: input.moveNumber ?? 20 });
  // Classify on the LINE, not the lone move. Without it almost every capture
  // landed as the catch-all "tactical sequence" (666 of 997 cards on a real
  // import, hand walk 2026-10-01) — a fork or mate two moves deep is invisible
  // from the first move alone.
  const tacticType = detectTacticType(fen, bestMove, lineToUci(fen, input.bestLineSan));
  const srsDefaults = createDefaultSrsFields();
  const narration = generateMistakeNarration({
    classification,
    gamePhase,
    playerMoveSan: playedSan,
    bestMoveSan: bestSan,
    cpLoss,
    fen,
    moves: bestMove,
    openingName: input.openingName ?? null,
    allowedReplySan: input.allowedReplySan ?? null,
  });

  return {
    id: generateId(),
    fen,
    playerMove,
    playerMoveSan: playedSan,
    bestMove,
    bestMoveSan: bestSan,
    moves: bestMove,
    cpLoss,
    classification,
    gamePhase,
    moveNumber: input.moveNumber ?? 0,
    // PROVENANCE, from the required `from` — never hard-coded (C9). The
    // game's source, its opponent and its own date string; `createdAt`
    // below is the capture clock and is NOT the game's date.
    sourceGameId: input.from.gameId,
    sourceMode: input.from.source,
    playerColor,
    promptText: `${openSentence(tacticTypeLabel(tacticType))} — ${PROMPT_TEXT[classification]}`,
    narration,
    createdAt: new Date().toISOString(),
    opponentName: input.from.opponentName,
    gameDate: input.from.gameDate,
    openingName: input.openingName ?? null,
    // Player-POV centipawns when the caller supplied it (autoAnalyzeGame passes
    // the pre-move eval); null for a live slip with no engine read.
    evalBefore: input.evalBefore ?? null,
    srsInterval: srsDefaults.interval,
    srsEaseFactor: srsDefaults.easeFactor,
    srsRepetitions: srsDefaults.repetitions,
    srsDueDate: srsDefaults.dueDate,
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    tacticType,
  };
}

/** Build the drill queue for a Thinking-Errors row: every stored position for
 *  that misconception tag, turned into a MistakePuzzle (same shape + board as
 *  My Mistakes / My Weaknesses). Due instances first (then the rest, so the row
 *  is always drillable), deduped by position, newest first. `customLabel` scopes
 *  the `other` catch-all to one phase bucket (Opening / Middlegame / Endgame
 *  slip). Positions with no recorded best move are skipped (can't build a
 *  solvable puzzle). Pure read + build — nothing is persisted. */
export async function getMisconceptionDrillPuzzles(
  tag: string,
  customLabel?: string,
): Promise<MistakePuzzle[]> {
  const now = Date.now();
  let records = await db.misconceptionTags.where('tag').equals(tag).toArray();
  if (tag === 'other' && customLabel) {
    records = records.filter((r) => (r.customLabel ?? '') === customLabel);
  }
  const isDue = (r: { dueAt?: number }): boolean => r.dueAt == null || r.dueAt <= now;
  const due = records.filter(isDue);
  const ordered = (due.length > 0 ? due : records).sort((a, b) => b.createdAt - a.createdAt);

  const puzzles: MistakePuzzle[] = [];
  const seen = new Set<string>();
  // One provenance read per game id — a tag's positions cluster on a few games.
  const provenance = new Map<string, MistakePuzzleProvenance>();
  for (const r of ordered) {
    if (!r.bestSan || !r.playedSan) continue;
    const gameKey = r.sourceGameId ?? '';
    let from = provenance.get(gameKey);
    if (!from) { from = await provenanceForGameId(r.sourceGameId); provenance.set(gameKey, from); }
    const puzzle = buildMistakePuzzleFromCapture({
      fen: r.fen,
      playedSan: r.playedSan,
      bestSan: r.bestSan,
      cpLoss: r.cpLoss,
      gamePhase: r.gamePhase,
      moveNumber: r.moveNumber,
      openingName: r.openingName,
      from,
    });
    if (!puzzle) continue;
    const key = `${puzzle.fen}|${puzzle.playerMoveSan}`;
    if (seen.has(key)) continue;
    seen.add(key);
    puzzles.push(puzzle);
  }
  return puzzles;
}

export async function getAllMistakePuzzles(): Promise<MistakePuzzle[]> {
  const all = await db.mistakePuzzles.toArray();

  // Newest games first; games older than 1 year are lowest priority
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  all.sort((a, b) => {
    const dateA = a.gameDate ? new Date(a.gameDate).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.gameDate ? new Date(b.gameDate).getTime() : new Date(b.createdAt).getTime();
    const oldA = (now - dateA) > oneYear;
    const oldB = (now - dateB) > oneYear;
    if (oldA !== oldB) return oldA ? 1 : -1;
    return dateB - dateA;
  });

  return all;
}

export async function getMistakePuzzlesByPhase(
  phase: MistakeGamePhase,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('gamePhase')
    .equals(phase)
    .toArray();
}

// ─── Grading ────────────────────────────────────────────────────────────────

export async function gradeMistakePuzzle(
  id: string,
  grade: SrsGrade,
  correct: boolean,
  solveTimeMs?: number,
): Promise<void> {
  const puzzle = await db.mistakePuzzles.get(id);
  if (!puzzle) return;

  const srs = calculateNextInterval(
    grade,
    puzzle.srsInterval,
    puzzle.srsEaseFactor,
    puzzle.srsRepetitions,
  );

  const newAttempts = puzzle.attempts + 1;
  const newSuccesses = correct ? puzzle.successes + 1 : puzzle.successes;

  let newStatus: MistakePuzzleStatus = puzzle.status;
  if (correct && puzzle.status === 'unsolved') {
    newStatus = 'solved';
  }
  if (correct && srs.repetitions >= MASTERY_REPETITIONS) {
    newStatus = 'mastered';
  }
  if (!correct && puzzle.status !== 'mastered') {
    newStatus = puzzle.successes > 0 ? 'solved' : 'unsolved';
  }

  // Solve-time aggregation for /weaknesses. We track lastSolveTimeMs
  // (most recent), bestSolveTimeMs (fastest correct only), and a
  // rolling history capped at the last 10 attempts. Best stays null
  // until the puzzle is solved correctly so a fast wrong attempt
  // doesn't poison the "best" metric.
  const updates: Partial<MistakePuzzle> = {
    // A miss drops a grown line back one move (never below one).
    ...(!correct && solveLengthOf(puzzle) > 1 ? { solveLength: shrinkOnMiss(puzzle.solveLength) } : {}),
    srsInterval: srs.interval,
    srsEaseFactor: srs.easeFactor,
    srsRepetitions: srs.repetitions,
    srsDueDate: srs.dueDate,
    srsLastReview: new Date().toISOString().split('T')[0],
    status: newStatus,
    attempts: newAttempts,
    successes: newSuccesses,
  };

  if (typeof solveTimeMs === 'number' && solveTimeMs > 0) {
    updates.lastSolveTimeMs = solveTimeMs;
    const history = [solveTimeMs, ...(puzzle.solveTimes ?? [])].slice(0, 10);
    updates.solveTimes = history;
    if (correct) {
      const prevBest = puzzle.bestSolveTimeMs;
      updates.bestSolveTimeMs = typeof prevBest === 'number'
        ? Math.min(prevBest, solveTimeMs)
        : solveTimeMs;
    }
  }

  await db.mistakePuzzles.update(id, updates);
  if (correct) void growMistakePuzzle(id);

  // THE CONCEPT SCHEDULE: a miss fails the IDEA, so its other open cards come
  // due today and the queue retests the concept on fresh boards.
  if (!correct) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const pull = conceptSiblingsToPull(puzzle, await db.mistakePuzzles.toArray(), today);
      for (const sid of pull) await db.mistakePuzzles.update(sid, { srsDueDate: today });
      if (pull.length > 0) {
        const { logAppAudit } = await import('./appAuditor');
        void logAppAudit({
          kind: 'concept-srs-pulled',
          category: 'subsystem',
          source: 'mistakePuzzleService.gradeMistakePuzzle',
          summary: `${mistakeConcept(puzzle)} missed — ${pull.length} card(s) of the same idea due today`,
          details: JSON.stringify({ concept: mistakeConcept(puzzle), pulled: pull.length }),
        });
      }
    } catch { /* the card's own grade already landed */ }
  }

  // Invalidate the tactical profile cache so it recomputes with fresh data
  await db.meta.delete('tactical_profile');
  // A drilled mistake changes the spine (status, lifecycle) — the coach must
  // hear it on the next read, not after the 5-minute cache ages out.
  emitWeaknessModelChanged();
}

// ─── Growth (David 2026-10-01: "puzzles from my mistakes that grow") ────────

/** The engine as the criticality scan asks for it: MultiPV candidates,
 *  white-POV centipawns (mates already folded in by the engine). */
const engineMulti: EvaluateMulti = async (fen, multiPV) => {
  const a = await stockfishEngine.analyzePosition(fen, 16, { MultiPV: multiPV });
  return a.topLines
    .filter((l) => l.moves.length > 0)
    .map((l) => ({ uci: l.moves[0], cp: l.evaluation }));
};

/**
 * After a CLEAN solve, try to grow the puzzle by one move. Runs in the
 * background (the engine is slow; nothing waits on it) and writes only when
 * the line is still forced. Called from the one grading door, so every
 * surface that drills a mistake grows it the same way.
 */
export async function growMistakePuzzle(id: string, evaluate: EvaluateMulti = engineMulti): Promise<void> {
  const puzzle = await db.mistakePuzzles.get(id);
  if (!puzzle) return;
  const L = solveLengthOf(puzzle);
  if (puzzle.growthCappedAt !== undefined && puzzle.growthCappedAt <= L) return;
  const moves = puzzle.moves.trim().split(/\s+/).filter(Boolean);
  try {
    const g = await growOneMove(puzzle.fen, moves, L, evaluate);
    if (g.cappedAt !== null) {
      await db.mistakePuzzles.update(id, { growthCappedAt: g.cappedAt });
      return;
    }
    await db.mistakePuzzles.update(id, { moves: g.moves.join(' '), solveLength: g.solveLength });
  } catch {
    // Engine unavailable — the puzzle simply does not grow this time.
  }
}

// ─── Drilled motifs (positive transfer) ─────────────────────────────────────

/** The tactic motifs the student has SOLVED from their own mistakes, each with
 *  the opponent of the game it came from (most recent first) — so a live find
 *  of the same motif can be tied back to the drill ("the fork you drilled from
 *  your game against X"). Read once per game; a failed read is empty. */
export async function loadDrilledMotifs(): Promise<Map<TacticType, { opponentName: string | null }>> {
  const out = new Map<TacticType, { opponentName: string | null }>();
  try {
    const rows = await db.mistakePuzzles.toArray();
    rows
      .filter((r) => r.tacticType && r.tacticType !== 'tactical_sequence' && r.successes > 0)
      .sort((a, b) => (b.srsLastReview ?? '').localeCompare(a.srsLastReview ?? ''))
      .forEach((r) => { if (r.tacticType && !out.has(r.tacticType)) out.set(r.tacticType, { opponentName: r.opponentName }); });
  } catch { /* no store — nothing drilled */ }
  return out;
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteMistakePuzzle(id: string): Promise<void> {
  await db.mistakePuzzles.delete(id);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface MistakePuzzleStats {
  total: number;
  unsolved: number;
  solved: number;
  mastered: number;
  byClassification: {
    inaccuracy: number;
    mistake: number;
    blunder: number;
    miss: number;
  };
  byPhase: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  dueCount: number;
}

export async function getMistakePuzzleStats(): Promise<MistakePuzzleStats> {
  const all = await db.mistakePuzzles.toArray();
  const today = new Date().toISOString().split('T')[0];

  const stats: MistakePuzzleStats = {
    total: all.length,
    unsolved: 0,
    solved: 0,
    mastered: 0,
    byClassification: { inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    byPhase: { opening: 0, middlegame: 0, endgame: 0 },
    dueCount: 0,
  };

  for (const p of all) {
    if (p.status === 'unsolved') stats.unsolved++;
    else if (p.status === 'solved') stats.solved++;
    else stats.mastered++;

    stats.byClassification[p.classification]++;

    stats.byPhase[p.gamePhase]++;

    if (p.srsDueDate <= today) stats.dueCount++;
  }

  return stats;
}
