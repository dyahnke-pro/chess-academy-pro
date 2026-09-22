import { Chess } from 'chess.js';
// Import-time auto-analysis — the third faucet (David 2026-05-21: "tie
// game analysis in without needing a full review"). Given the blunders a
// game's Stockfish scan already found, classify each into a closed-set
// misconception and log it to the shared bucket — no interactive "why?"
// required (userReason is absent; the coach classifies from position +
// best move + eval alone). Game Review's interactive capture and this
// passive path write to the SAME bucket; this just front-runs it.

import { captureMisconception } from './discussionPractice';
import { recordCapabilityEvidence } from './capabilityEvidence';
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
import { pvUciToSan } from './principleAttribution';
import { isMateEval } from './engineConstants';
import { isFixtureGame } from './fixtureGames';
import type { MistakePuzzle, MoveAnnotation } from '../types';

export interface BlunderForAnalysis {
  /** Position BEFORE the move (FEN). */
  fen: string;
  playedSan: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  /** Every SAN up to and including the played move — lets the classifier run
   *  the fundamentals attributor (the same one the review speaks). */
  historySans?: string[];
  /** Persisted engine lines (SAN) + eval (mover POV, cp) — unlock the eval/PV-
   *  gated fundamentals on the recording path so they become drillable
   *  weaknesses (David 2026-09-06). */
  pvAfterPlayed?: string[];
  pvAfterBest?: string[];
  evalBefore?: number;
  evalAfterPlayed?: number;
}

/** One ply the student played that was NOT a mistake — the POSITIVE half of the
 *  same game. Passed in rather than re-derived so the caller walks the game
 *  ONCE and both halves come out of one pass. */
export interface CapabilityPly {
  fenBefore: string;
  playedSan: string;
  cpLoss: number | null;
  /** The coach announced the moment before this move (Learn's critical-moment
   *  statement), so a find here is not unaided evidence. Default false. */
  prompted?: boolean;
}

export interface AutoAnalyzeOptions {
  openingId?: string;
  openingName?: string;
  sourceGameId?: string;
  /** Count-against gate: only learned lines / principles become
   *  weaknesses. Imported games of a repertoire the user claims to know
   *  count; first-exposure lines don't. */
  learned: boolean;
  /** The student's non-mistake plies. Omitted = the caller has no positive
   *  evidence to file (an imported game with no per-ply data, say) — an honest
   *  absence, never a reason to invent one. */
  capabilityPlies?: readonly CapabilityPly[];
  /** Which side the student played — required to attribute the positive half. */
  playerColor?: 'white' | 'black';
}

export interface AutoAnalyzeResult {
  classified: number;
  logged: number;
  /** Capabilities RECORDED as held from the same game. Reported so a caller —
   *  or a gate — can prove the positive half fired rather than assume it. */
  capabilitiesHeld: number;
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
        ...(b.historySans ? { historySans: b.historySans } : {}),
        ...(b.pvAfterPlayed ? { pvAfterPlayed: b.pvAfterPlayed } : {}),
        ...(b.pvAfterBest ? { pvAfterBest: b.pvAfterBest } : {}),
        ...(b.evalBefore !== undefined ? { evalBefore: b.evalBefore } : {}),
        ...(b.evalAfterPlayed !== undefined ? { evalAfterPlayed: b.evalAfterPlayed } : {}),
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
    // THE 23% BUCKET, MADE READABLE (2026-09-20). A slip that lands on `other`
    // is one the app could not name, and section 14 exists to shrink that set —
    // but on the first four prod games after it shipped, none of its three
    // detectors fired. `why` says which GATE stopped each one; emitting it here
    // (once per unnamed slip, never for a named one) is what lets an audit read
    // the real population instead of a guess. The reasons are diagnostic
    // strings, never spoken.
    const why = result.classification?.why ?? [];
    if (result.classification?.tag === 'other' && why.length > 0) {
      void logAppAudit({
        kind: 'misconception-captured',
        category: 'subsystem',
        source: 'autoAnalyzeGame.unnamedSlip',
        summary: `unnamed slip at ${b.playedSan} (move ${b.moveNumber ?? '?'}) — section 14 declined: ${why.join(' | ')}`,
        fen: b.fen,
      });
    }
  }

  // AND THE POSITIVE HALF OF THE SAME GAME. Both halves are captured by ONE
  // service call so a surface never has to know there are two — the caller
  // walks the game once and hands over both sets. Keeping this here rather
  // than in the component is also what stops a UI surface importing a fact
  // computer directly (surfaceComposition.scan).
  let capabilitiesHeld = 0;
  if (opts.capabilityPlies?.length && opts.playerColor) {
    for (const ply of opts.capabilityPlies) {
      capabilitiesHeld += await recordCapabilityEvidence({
        fenBefore: ply.fenBefore,
        playedSan: ply.playedSan,
        moverColor: opts.playerColor,
        cpLoss: ply.cpLoss,
        origin: 'review',
        // Unaided by default — this sweep runs afterwards over what they did
        // alone. EXCEPT where Learn announced the moment first (T3, 2026-09-20):
        // the game record carries those plies, and a find there is prompted.
        prompted: ply.prompted ?? false,
        ...(opts.sourceGameId ? { sourceGameId: opts.sourceGameId } : {}),
      });
    }
  }
  return { classified, logged, capabilitiesHeld };
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
  const empty: AutoAnalyzeResult = { classified: 0, logged: 0, capabilitiesHeld: 0 };

  const game = await db.games.get(gameId);
  if (!game) return empty;
  // 🔒 A DEMO GAME NEVER WRITES INTO THE STUDENT'S RECORD (D5, 2026-09-22).
  // The readers exclude `sample-*` rows too, but the honest fix is that they
  // are never written: a seeded fixture has nothing to say about this student.
  if (isFixtureGame(game)) return empty;
  const annotations = game.annotations ?? [];
  if (annotations.length === 0) return empty;
  const playerColor = determinePlayerColor(game, username);
  if (!playerColor) return empty;
  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return empty;
  // SAN history for the fundamentals attributor (fens[i] is the position
  // BEFORE move i, so the history through move i is sans[0..i]).
  let sans: string[] = [];
  try { const c = new Chess(); c.loadPgn(game.pgn); sans = c.history(); } catch { sans = []; }

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
      // 🔒 STOCKFISH'S OWN NUMBER, NEVER ONE INFERRED FROM THE LABEL (David
      // 2026-08-10: "Use stockfish as the standard… Stockfish to measure
      // mistake vs inaccuracy"). This read `ann.classification === 'blunder' ?
      // 350 : 175` — the CLASSIFICATION deciding the measurement it was derived
      // from, which is backwards, and which then flowed on as if measured into
      // the misconception classifier, the mistake puzzles and the weakness
      // spine. Every "blunder" in the app's history was recorded as costing
      // exactly 350 centipawns.
      //
      // The real delta is already stored on the annotation: `bestMoveEval` is
      // what the position was worth had the engine's move been played, and
      // `evaluation` is what it is worth after the move actually played. Both
      // are White-POV, so flipping to the mover gives what they gave up.
      //
      // The band midpoint survives ONLY as a fallback for annotations written
      // before `bestMoveEval` existed (`gameNeedsAnalysis` re-analyses those, so
      // it drains) and for mate-encoded evals, where a centipawn difference is a
      // six-figure sentinel rather than a cost.
      cpLoss: measuredCpLoss(ann) ?? (ann.classification === 'blunder' ? 350 : 175),
      gamePhase: classifyPhase(fen, ann.moveNumber),
      moveNumber: ann.moveNumber,
      ...(sans.length > fenIndex ? { historySans: sans.slice(0, fenIndex + 1) } : {}),
      // Pre-move eval (mover POV, centipawns) so the persisted mistakePuzzle can
      // fill the "Errors by Situation" panel (loop audit 2026-09-09: this path's
      // puzzles carried a null evalBefore and dropped out of the panel).
      // `bestMoveEval` is the White-POV value of the position with best play —
      // i.e. what it was worth before the move; flip to the mover, skip mate
      // sentinels (a six-figure number is not an eval to threshold at ±100cp).
      ...(ann.bestMoveEval != null && !isMateEval(ann.bestMoveEval)
        ? { evalBefore: Math.round(ann.bestMoveEval * (ann.color === 'white' ? 1 : -1)) }
        : {}),
      // AND THE EVAL AFTER THE MOVE (WO-4 J2, 2026-09-19). `BlunderForAnalysis`
      // has carried `evalAfterPlayed` since the eval-gated fundamentals landed,
      // the review path and the interactive capture both fill it, and the
      // annotation has the number (`evaluation`) — but this builder never passed
      // it. `botched-conversion` (#33) gates on evalBefore AND evalAfterPlayed
      // with no PV, so on the RECORDING path — every imported and every finished
      // coach game — a student who threw a won position away was never filed
      // under it: measured 0 of 154 flagged moves across 47 real amateur games
      // before this line, with the detector sitting there the whole time. Same
      // POV flip and mate-sentinel skip as evalBefore, so the two are one unit.
      ...(ann.evaluation != null && !isMateEval(ann.evaluation)
        ? { evalAfterPlayed: Math.round(ann.evaluation * (ann.color === 'white' ? 1 : -1)) }
        : {}),
      // AND THE ENGINE LINES (2026-09-20) — the same defect as the two blocks
      // above, one field over, and it is what the section-14 reading actually
      // found. `calculation-depth` (#34) needs a punishing PV of >= 3 plies and
      // that the punishment NOT be immediate; the annotation carries the lines
      // (`ann.pv`, persisted by the review's deep dive at a flagged ply) and
      // this builder never passed them. So on the RECORDING path the detector
      // saw an EMPTY pv and declined every time — the muted prod loop audit
      // printed `calculation-depth: punishing PV is 0 plies, needs 3` on every
      // unnamed slip it met. Zero, not two: the gate was never tight, the input
      // was absent, and widening the threshold could not have moved it.
      // The annotation stores UCI; the attributor reads SAN (same conversion
      // the review path does at coachFeatureService.ts:1449).
      ...(ann.pv?.afterPlayed.length
        ? { pvAfterPlayed: pvUciToSan(fens[fenIndex + 1] ?? fen, ann.pv.afterPlayed) }
        : {}),
      ...(ann.pv?.afterBest.length
        ? { pvAfterBest: pvUciToSan(fen, ann.pv.afterBest) }
        : {}),
    });
  }
  if (blunders.length === 0) return empty;

  // Persist a drillable mistakePuzzle for each blunder — incl. the positional
  // ones the tactical gate drops — deduped by position against this game's
  // existing puzzles (the tactical ones the analyze pipeline already made). One
  // indexed query + one bulkAdd; idempotent, so it runs every call and catches
  // up already-tagged games.
  await persistMistakePuzzlesForBlunders(gameId, blunders);

  // The dossier "builds on each game" (P7, David 2026-09-08): a freshly analyzed
  // game changed the weakness picture, so recompute the persistent snapshot.
  // THROTTLED (fire-and-forget) so a library SWEEP — one call per game — collapses
  // to ~one refresh per window instead of N stacked full-library scans (the
  // 2026-09-08 perf fix); the dossier read path is SWR anyway, so a slightly
  // delayed snapshot is fine.
  void import('./studentDossier').then((m) => m.refreshStudentDossierThrottled()).catch(() => undefined);

  // Log the misconception TALLY once per game (bulk / review-walk / live).
  if (await hasMisconceptionsForGame(gameId)) return empty;
  return autoAnalyzeBlunders(blunders, {
    openingId: game.openingId ?? undefined,
    sourceGameId: gameId,
    learned: false,
  });
}

/** What the move actually cost, in centipawns, from the MOVER's perspective —
 *  measured by Stockfish rather than read off the label.
 *
 *  Null when it cannot be measured honestly: no stored best-move eval (an
 *  annotation older than that field), or either side of the comparison is a
 *  mate-encoded sentinel, where subtracting produces a number in the tens of
 *  thousands that is not a cost. Callers fall back explicitly. */
function measuredCpLoss(ann: MoveAnnotation): number | null {
  const after = ann.evaluation;
  const best = ann.bestMoveEval;
  if (after === null || best === null || best === undefined) return null;
  if (isMateEval(after) || isMateEval(best)) return null;
  const moverSign = ann.color === 'white' ? 1 : -1;
  // Both are White-POV. Flipped to the mover, "best minus actual" is what the
  // move gave up; clamped at zero because a move that BEAT the shallow best-move
  // eval has cost nothing.
  return Math.max(0, (best - after) * moverSign);
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
      evalBefore: b.evalBefore ?? null,
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
    if (done?.value === 'true') return { classified: 0, logged: 0, capabilitiesHeld: 0 };
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
  return { classified, logged, capabilitiesHeld: 0 };
}
