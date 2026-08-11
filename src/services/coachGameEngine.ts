import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { getNextOpeningBookMove } from './openingDetectionService';
import { findHangingPieces } from './tacticClassifier';
import { lookupMasterPlay } from './masterPlayLookup';
import { pickBookMove } from './coachBookMove';
import { logAppAudit } from './appAuditor';
import type { StockfishAnalysis, CoachDifficulty } from '../types';

// Budget for the skill-limited opponent search before falling back to a
// movetime best-move. 8s (was 5s) gives the slower single-threaded iOS engine
// headroom to finish the (now depth-capped) search instead of timing out into
// the weak/random fallback (David 2026-06-21: "coach is not playing good moves").
const COACH_MOVE_TIMEOUT_MS = 8000;

/** Movetime budget for the single-threaded (iOS/asm.js) opponent search. Long
 *  enough for a sensible rating-matched move, short enough that the student
 *  isn't waiting — and, unlike a depth search, it is a CEILING the engine
 *  cannot overrun. */
const SINGLE_THREAD_MOVETIME_MS = 2500;

/** Movetime budget for the THREADED opponent search (David 2026-08-07: the
 *  depth-14 selection search took 5-6s per reply on his live game — the
 *  single biggest chunk of the move→voice delay). A skill-limited engine's
 *  strength comes from the Skill Level cap, not the extra plies; one bounded
 *  second returns an indistinguishable rating-matched move and the reply
 *  lands while the think-pad is still on screen. */
const THREADED_MOVETIME_MS = 1200;

/** Consecutive getAdaptiveMove calls where BOTH book layers (masters +
 *  broader lichess) missed. At ≥2 the lookups are skipped for the rest of
 *  the game — out-of-book positions never come back into book, and each
 *  miss pair costs ~0.5-1.5s of dead time before the engine starts. Reset
 *  by any hit or a fresh game (fullmove ≤ 4). */
let bookMissStreak = 0;

const FALLBACK_ANALYSIS: StockfishAnalysis = {
  bestMove: '',
  evaluation: 0,
  isMate: false,
  mateIn: null,
  depth: 0,
  topLines: [],
  nodesPerSecond: 0,
};

/**
 * Maps target ELO to Stockfish Skill Level (0–20).
 * Skill Level controls how many intentional "errors" the engine makes —
 * much more natural than picking random non-best moves.
 */
function getSkillLevelForElo(targetElo: number): number {
  if (targetElo < 800) return 2;
  if (targetElo < 1000) return 5;
  if (targetElo < 1200) return 8;
  if (targetElo < 1400) return 11;
  if (targetElo < 1600) return 14;
  if (targetElo < 1800) return 16;
  if (targetElo < 2000) return 18;
  return 20;
}

/**
 * Analysis depth — higher is fine because Skill Level handles weakness.
 * We want the engine to "see" tactics so it doesn't hang pieces.
 */
function getDepthForElo(targetElo: number): number {
  if (targetElo < 1000) return 10;
  if (targetElo < 1200) return 12;
  if (targetElo < 1500) return 14;
  if (targetElo < 1800) return 16;
  return 18;
}

/**
 * Probability the adaptive opponent BREAKS book in the opening (David 2026-07-24:
 * "in the opening I want stockfish to break book if playing beginner/some
 * intermediate players"). Beginners and lower-intermediates don't play textbook
 * theory — they improvise and slip. Skipping the masters/Lichess book layers and
 * letting Stockfish play at its rating-matched Skill Level makes the opening feel
 * rating-appropriate AND lets the live punishment callout fire on real opening
 * mistakes. Tapers to 0 by ~1600, where copying the crowd's book move is itself
 * realistic; strong opponents always stay on book. Exported for threshold tests.
 */
export function breakBookProbability(targetElo: number): number {
  if (targetElo >= 1600) return 0;
  if (targetElo < 900) return 0.7;
  if (targetElo < 1100) return 0.55;
  if (targetElo < 1300) return 0.4;
  if (targetElo < 1500) return 0.22;
  return 0.1; // 1500–1600: mostly book, the occasional own move
}

/** Lichess explorer rating buckets. A bucket labelled 1600 holds games by
 *  players rated 1600-1799, so the label is the FLOOR of the band. */
const EXPLORER_BUCKETS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500] as const;

/**
 * The two buckets closest to `targetElo` — the pool a player at this level
 * actually comes from.
 *
 * 🔒 THE COACH MAKES THE MISTAKES OF ITS LEVEL (David 2026-08-11: "Based on
 * rating I want coach making mistakes! Maybe have coach use the amateur
 * database for openings?").
 *
 * Two buckets rather than one so the sample stays wide enough to have moves at
 * all in a sideline, and adjacent rather than centred so a weak opponent never
 * borrows a strong player's move. Nothing is invented (G3): every move it
 * yields was played, by humans, at this strength.
 *
 * Why this and not a weaker engine — the old answer, measured 2026-08-11:
 * skill-limited Stockfish plays WORSE, and worse is not HUMAN. Its errors are
 * diffuse and arbitrary; a 1300's errors are specific and repeat. It is also
 * exactly why `gem_alert_spoken` had NEVER fired in production: all 344 gems
 * were mined from the amateur explorer, and the coach never drew from it, so
 * its inaccuracies could not appear. Zero of 344 gem lines exist in the
 * openings DB either, so the book layer could not produce one and the engine
 * would not.
 */
export function explorerBandForElo(targetElo: number): string {
  const floors = EXPLORER_BUCKETS.filter((b) => b <= targetElo);
  const base = floors.length > 0 ? floors[floors.length - 1] : EXPLORER_BUCKETS[0];
  const i = EXPLORER_BUCKETS.indexOf(base);
  // Pair downward at the top of the range so the strongest band still has two.
  const pair = i + 1 < EXPLORER_BUCKETS.length
    ? [EXPLORER_BUCKETS[i], EXPLORER_BUCKETS[i + 1]]
    : [EXPLORER_BUCKETS[i - 1], EXPLORER_BUCKETS[i]];
  return pair.join(',');
}

function shouldBreakBook(targetElo: number): boolean {
  const p = breakBookProbability(targetElo);
  return p > 0 && Math.random() < p;
}

/**
 * Small chance of picking 2nd-best move for variety (not blundering).
 * Kept very low since Skill Level already weakens play naturally.
 */
function getVarietyChance(targetElo: number): number {
  if (targetElo < 1000) return 0.10;
  if (targetElo < 1200) return 0.08;
  if (targetElo < 1500) return 0.05;
  return 0.03;
}

/** Compact 0-100 quality score for a legal move. Higher = better.
 *  Hand-built priorities so the last-resort random fallback is
 *  PLAUSIBLE-looking, not literal-random. Used when both the masters
 *  DB AND the Lichess broader DB AND Stockfish all fail — exceptional
 *  case but the user still deserves a sensible move. */
function scoreLegalMove(fen: string, m: { from: string; to: string; flags: string; promotion?: string }): number {
  let score = 50;
  // Captures rank highest — taking material is usually fine
  if (m.flags.includes('c') || m.flags.includes('e')) score += 30;
  // Promotions
  if (m.promotion) score += 25;
  // Castling — almost always safe and good
  if (m.flags.includes('k') || m.flags.includes('q')) score += 20;
  // Central squares are stronger
  const toFile = m.to[0];
  const toRank = m.to[1];
  if ('de'.includes(toFile) && '45'.includes(toRank)) score += 10;
  if ('cdef'.includes(toFile) && '3456'.includes(toRank)) score += 5;
  // Flank pawn pushes are usually waste of tempo — penalize hard
  // (this is what blocked `b7b6` style nonsense moves in the
  // 2026-05-17 audit). Detect: pawn move ending on a/b/g/h file
  // and not capturing.
  if (!m.flags.includes('c') && !m.flags.includes('e')) {
    if ('abgh'.includes(toFile)) score -= 15;
  }
  // Penalize moves that leave own pieces hanging
  try {
    const test = new Chess(fen);
    const chessTurn = test.turn();
    test.move({ from: m.from, to: m.to, promotion: m.promotion });
    const hanging = findHangingPieces(test).filter((p) => p.color === chessTurn);
    score -= hanging.length * 25;
  } catch {
    // chess.js refused the move shape; treat as low quality
    score -= 50;
  }
  return score;
}

export function getRandomLegalMove(fen: string): string | null {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Score every legal move and pick from the top-3 (weighted by
    // their scores). This way "random" still looks like a plausible
    // human move — captures + central development first, no flank
    // pawn pushes when better options exist.
    const scored = moves
      .map((m) => ({ move: m, score: scoreLegalMove(fen, m) }))
      .sort((a, b) => b.score - a.score);
    const topK = scored.slice(0, Math.min(3, scored.length));
    const totalWeight = topK.reduce((sum, s) => sum + Math.max(1, s.score), 0);
    let r = Math.random() * totalWeight;
    let chosen = topK[0];
    for (const s of topK) {
      r -= Math.max(1, s.score);
      if (r <= 0) { chosen = s; break; }
    }
    return `${chosen.move.from}${chosen.move.to}${chosen.move.promotion ?? ''}`;
  } catch {
    return null;
  }
}

function makeTimeoutPromise(ms: number): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Stockfish timeout after ${ms}ms`)), ms);
  });
}

/**
 * Try to play the next opening book move if a requested opening is active.
 * Returns the UCI move string (e.g. "e7e6") or null if not applicable.
 */
export function tryOpeningBookMove(
  fen: string,
  gameHistory: string[],
  openingMoves: string[] | null,
  aiColor: 'white' | 'black',
): string | null {
  if (!openingMoves || openingMoves.length === 0) return null;

  const bookSan = getNextOpeningBookMove(openingMoves, gameHistory, aiColor);
  if (!bookSan) return null;

  // Convert SAN to UCI
  try {
    const chess = new Chess(fen);
    const move = chess.move(bookSan);
    return `${move.from}${move.to}${move.promotion ?? ''}`;
  } catch {
    return null;
  }
}

/** UCI encoder used by the master-play path. Converts a SAN move into
 *  the UCI string the rest of the play loop expects. Returns null if
 *  chess.js refuses the move (e.g. ambiguous / illegal for this FEN). */
function sanToUci(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return `${move.from}${move.to}${move.promotion ?? ''}`;
  } catch {
    return null;
  }
}

/** Pick a master move from a `MasterPlayResult`, weighted by total games
 *  played. Returns the chosen MasterPlayMove, or null when the result
 *  is empty / too sparse. */
function pickMasterMove(
  moves: ReadonlyArray<{ san: string; games: number }>,
  rng: () => number = Math.random,
): { san: string; games: number } | null {
  // Filter to popular replies: cap at top 5 and require ≥1 game.
  const candidates = moves.filter((m) => m.games > 0).slice(0, 5);
  if (candidates.length === 0) return null;
  const total = candidates.reduce((sum, m) => sum + m.games, 0);
  if (total === 0) return null;
  const r = rng() * total;
  let acc = 0;
  for (const m of candidates) {
    acc += m.games;
    if (r < acc) return m;
  }
  return candidates[candidates.length - 1];
}

export async function getAdaptiveMove(
  fen: string,
  targetElo: number,
): Promise<{ move: string; analysis: StockfishAnalysis; source: 'masters' | 'lichess-games' | 'amateur-band' | 'stockfish-best' | 'stockfish-variety' | 'stockfish-fallback' | 'random' }> {
  // Single-threaded Stockfish (iOS / any context without SharedArrayBuffer +
  // cross-origin isolation) is ~5-10x slower than the threaded build, so a
  // depth 14-16 search blows the COACH_MOVE_TIMEOUT_MS budget → timeout →
  // movetime fallback or, worse, the random floor (the documented "source=
  // random after Stockfish timeout" failure that makes the coach play garbage
  // on iPhone — David 2026-06-21). Cap the depth on single-threaded so the
  // skill-limited best-move search actually COMPLETES and returns a real
  // rating-matched move. Desktop (threaded) keeps full depth.
  const threaded = typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated;
  const depth = threaded ? getDepthForElo(targetElo) : Math.min(getDepthForElo(targetElo), 10);
  const skillLevel = getSkillLevelForElo(targetElo);
  // BOOK-MISS STREAK BREAKER (David 2026-08-07: "Still too long of a
  // delay"). Once a game is genuinely out of book, the masters lookup +
  // broader-lichess lookup miss on EVERY subsequent move (his log: 10
  // consecutive misses, ~0.5-1.5s each) — pure dead time before the engine
  // even starts. Two consecutive both-layers misses ⇒ skip the lookups for
  // the rest of the game; a fresh game (low fullmove number) re-arms them.
  const fullmove = Number(fen.split(' ')[5] ?? '1');
  if (fullmove <= 4) bookMissStreak = 0;
  const skipBookLookups = bookMissStreak >= 2;
  // BREAK BOOK for weak opponents: roll per move. When it hits, MASTER theory
  // stands down so a weak opponent is not handed a grandmaster's move. The
  // human band below is consulted either way — see the note there.
  const breakBook = shouldBreakBook(targetElo);
  if (breakBook) {
    void logAppAudit({
      kind: 'coach-opponent-move-source',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `break-book elo=${targetElo} — master theory stands down for this move`,
      fen,
    });
  }

  // ── LAYER 0.1 — WHAT PLAYERS AT THIS LEVEL ACTUALLY PLAY ────────────────
  //
  // 🔒 THE COACH MAKES THE MISTAKES OF ITS RATING, ON EVERY DIFFICULTY (David
  // 2026-08-11: "Based on rating I want coach making mistakes! Maybe have coach
  // use the amateur database for openings?" and, on where it hangs: "The DB
  // check should be attached to easy and medium and hard settings.").
  //
  // It is attached to the SETTING by construction: `resolveConfig` folds the
  // difficulty into the target rating before this runs — easy is the student's
  // rating minus 300, medium is their rating, hard is plus 300 — so banding on
  // `targetElo` bands on the setting. Easy samples weaker players and blunders
  // more; hard samples stronger ones and blunders less; one mechanism covers
  // all three with no per-difficulty special case to drift.
  //
  // The first draft hung this off `shouldBreakBook`, a per-move coin flip whose
  // probability is ZERO at 1600 and above — so medium and hard would never have
  // consulted it at all. That is the bug David caught before it shipped, and it
  // is why this runs unconditionally now.
  //
  // Breaking book used to mean handing the opening to Stockfish at a reduced
  // skill level. That is the wrong instrument and the 2026-08-11 measurement
  // says so: a weakened engine plays WORSE, and worse is not HUMAN. Its errors
  // are diffuse and arbitrary; a 1300's errors are specific, common, and
  // repeat — which is the only kind worth teaching against.
  //
  // The amateur explorer IS the rating-ranked popularity source, and Stockfish
  // has no equivalent: it holds no book and no game statistics at all. So we
  // sample the difficulty's own band, weighted by real frequency. Humans there play the bad move at the rate they really play it,
  // so mistakes arrive on their own — no "now blunder" logic, nothing invented
  // (G3: every move came from real games).
  //
  // It also reopens `gem_alert_spoken`, which had NEVER fired in production:
  // all 344 gems were mined from this exact distribution, and the coach was
  // drawing from theory and an engine instead, so a gem's inaccuracy could
  // not appear. Whether it actually fires now is a MEASUREMENT to take, not a
  // claim to make here.
  //
  // Thresholds are deliberately loose — a band is a fraction of the whole DB,
  // so the 500-game floor of the theory picker would starve it — and a miss is
  // free: it falls through to the engine exactly as before.
  if (!skipBookLookups) try {
    const band = explorerBandForElo(targetElo);
    const human = await pickBookMove(fen, {
      ratings: band,
      maxPly: 200,
      minTotalGames: 20,
      topN: 6,
    });
    if (human) {
      const uci = `${human.uci.slice(0, 2)}${human.uci.slice(2, 4)}${human.uci.length > 4 ? human.uci[4] : ''}`;
      bookMissStreak = 0;
      void logAppAudit({
        kind: 'coach-opponent-move-source',
        category: 'subsystem',
        source: 'coachGameEngine.getAdaptiveMove',
        summary: `source=amateur-band san=${human.san} uci=${uci} band=${band} elo=${targetElo}`,
        fen,
      });
      return {
        move: uci,
        analysis: { ...FALLBACK_ANALYSIS, bestMove: uci },
        source: 'amateur-band',
      };
    }
  } catch { /* the band is a bonus — the engine still answers below */ }

  // Layer 0 — master play. Consult the canonical masters DB (local
  // first, then live Lichess) BEFORE Stockfish. When this position has
  // master games, the opponent plays a weighted-random move from the
  // top-5 replies — keeps the line natural / theoretically sound and
  // avoids Stockfish-low-skill blunders that send the user wandering
  // off into nonsense positions. Falls through to broader Lichess on
  // masters miss; that falls through to Stockfish; that falls through
  // to last-resort random.
  //
  // Audit emissions on every branch so the play surface is debuggable
  // from the audit stream alone (no console-log archaeology).
  if (!breakBook && !skipBookLookups) try {
    const masters = await lookupMasterPlay(fen, {
      triggeredBy: 'manual',
      surface: 'coachGameEngine.getAdaptiveMove',
    });
    if (masters.source !== 'none' && masters.moves.length > 0) {
      const picked = pickMasterMove(masters.moves);
      if (picked) {
        const uci = sanToUci(fen, picked.san);
        if (uci) {
          bookMissStreak = 0;
          void logAppAudit({
            kind: 'coach-opponent-move-source',
            category: 'subsystem',
            source: 'coachGameEngine.getAdaptiveMove',
            summary: `source=${masters.source} san=${picked.san} games=${picked.games}/${masters.totalGames} elo=${targetElo}`,
            fen,
          });
          return {
            move: uci,
            analysis: { ...FALLBACK_ANALYSIS, bestMove: uci },
            source: 'masters',
          };
        }
      }
    }
    // No masters data OR pickMasterMove rejected. Fall through.
    void logAppAudit({
      kind: 'coach-opponent-masters-miss',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `source=${masters.source} totalGames=${masters.totalGames} elo=${targetElo} — trying broader lichess DB`,
      fen,
    });
  } catch (err) {
    // Don't let masters-lookup errors block play. Log and continue.
    void logAppAudit({
      kind: 'coach-opponent-masters-error',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `error=${(err as Error)?.message ?? err} elo=${targetElo}`,
      fen,
    });
  }

  // Layer 0.5 — broader Lichess games DB. Catches the long tail
  // positions where masters dries up (off-mainstream openings past
  // book, e.g. Bird's Opening past ply 8). Has WAY more coverage
  // than masters because it includes every Lichess game (rated +
  // casual). Relaxed thresholds vs the standard pickBookMove
  // call — we WANT this layer to fire deep, since the alternative
  // is Stockfish failing → random move.
  //
  // Why this matters: 2026-05-17 live audit showed `source=random
  // move=b7b6` and `source=random move=f6g4` after Stockfish
  // init timed out in Bird's Opening. With this layer, deep
  // off-book positions still get a Lichess-played move (which any
  // user has tried before) instead of a chess.js random walk.
  if (!breakBook && !skipBookLookups) try {
    const lichess = await pickBookMove(fen, {
      maxPly: 200,        // no horizon — try at any depth
      minTotalGames: 50,  // sparser than the 500-game cutoff for the
                          // primary book picker, but enough to filter
                          // out one-off games
      topN: 5,
    });
    if (lichess) {
      const uci = `${lichess.uci.slice(0, 2)}${lichess.uci.slice(2, 4)}${lichess.uci.length > 4 ? lichess.uci[4] : ''}`;
      bookMissStreak = 0;
      void logAppAudit({
        kind: 'coach-opponent-move-source',
        category: 'subsystem',
        source: 'coachGameEngine.getAdaptiveMove',
        summary: `source=lichess-games san=${lichess.san} uci=${uci} opening=${lichess.openingName ?? '-'} elo=${targetElo}`,
        fen,
      });
      return {
        move: uci,
        analysis: { ...FALLBACK_ANALYSIS, bestMove: uci },
        source: 'lichess-games',
      };
    }
    bookMissStreak += 1;
    void logAppAudit({
      kind: 'coach-opponent-masters-miss',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `lichess-games also empty — falling to stockfish (elo=${targetElo}, missStreak=${bookMissStreak})`,
      fen,
    });
  } catch (err) {
    void logAppAudit({
      kind: 'coach-opponent-masters-error',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `lichess-games lookup error=${(err as Error)?.message ?? err}`,
      fen,
    });
  }

  // ON SINGLE-THREADED, SEARCH BY TIME, NOT BY DEPTH (David 2026-08-02, playing
  // a Vienna on his iPhone). The depth cap above was supposed to make the
  // skill-limited search complete on asm.js; in a real middlegame it does not.
  // His log: EIGHT coach moves, EIGHT `analyzePosition failed/timeout after
  // 8000ms`, every one landing on the fallback — so each reply cost him 8
  // seconds of nothing, and none of them were the rating-matched move the depth
  // search was there to produce. A movetime search cannot overrun: the engine
  // returns the best move it has when the clock runs out, at the skill level it
  // was given. Depth search stays on desktop, where it completes.
  // MOVETIME SEARCH ON EVERY BUILD (extended to threaded, David 2026-08-07:
  // the desktop depth-14 selection search took 5-6 seconds per reply — the
  // biggest chunk of his "still too long" move→voice delay). The reply's
  // strength comes from the Skill Level cap, not extra plies; a bounded
  // think returns the same rating-matched move in ~1-2.5s and CANNOT
  // overrun. The depth search below stays only as the recovery ladder.
  {
    const movetime = threaded ? THREADED_MOVETIME_MS : SINGLE_THREAD_MOVETIME_MS;
    try {
      const timed = await Promise.race([
        stockfishEngine.getBestMove(fen, movetime, skillLevel),
        makeTimeoutPromise(movetime + 3000),
      ]);
      if (timed && timed !== '(none)') {
        void logAppAudit({
          kind: 'coach-opponent-move-source',
          category: 'subsystem',
          source: 'coachGameEngine.getAdaptiveMove',
          summary: `source=stockfish-timed move=${timed} skill=${skillLevel} elo=${targetElo} (${movetime}ms movetime search)`,
          fen,
        });
        return {
          move: timed,
          analysis: { ...FALLBACK_ANALYSIS, bestMove: timed },
          source: 'stockfish-best',
        };
      }
    } catch {
      // Fall through to the depth search + its recovery ladder below.
    }
  }

  let analysis: StockfishAnalysis;
  try {
    analysis = await Promise.race([
      stockfishEngine.analyzePosition(fen, depth, { 'Skill Level': skillLevel }),
      makeTimeoutPromise(COACH_MOVE_TIMEOUT_MS),
    ]);
  } catch (error) {
    void logAppAudit({
      kind: 'coach-opponent-stockfish-error',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `analyzePosition failed/timeout — ${(error as Error)?.message ?? error}`,
      fen,
    });
    stockfishEngine.stop();

    // Second attempt: use movetime-based best move (always returns within
    // budget). AT THE RATING-MATCHED SKILL LEVEL — `getBestMove`'s skill
    // parameter defaults to 20, and these fallbacks were omitting it, so every
    // recovered move was FULL-STRENGTH Stockfish. That is what a fallback on
    // every move actually felt like to David (2026-08-02): a 1684-rated
    // opponent that crushed him by seven pawns. A fallback may play a slightly
    // worse move than the primary search; it may never play a stronger one.
    try {
      const bestMove = await Promise.race([
        stockfishEngine.getBestMove(fen, 2000, skillLevel),
        makeTimeoutPromise(4000),
      ]);
      if (bestMove && bestMove !== '(none)') {
        void logAppAudit({
          kind: 'coach-opponent-move-source',
          category: 'subsystem',
          source: 'coachGameEngine.getAdaptiveMove',
          summary: `source=stockfish-fallback move=${bestMove} elo=${targetElo}`,
          fen,
        });
        return {
          move: bestMove,
          analysis: { ...FALLBACK_ANALYSIS, bestMove },
          source: 'stockfish-fallback',
        };
      }
    } catch (innerErr) {
      void logAppAudit({
        kind: 'coach-opponent-stockfish-error',
        category: 'subsystem',
        source: 'coachGameEngine.getAdaptiveMove',
        summary: `getBestMove fallback also failed — ${(innerErr as Error)?.message ?? innerErr}`,
        fen,
      });
    }

    // Third attempt (hung-worker recovery): the first two hit a HUNG iOS
    // worker — the asm engine analyzes any position fine in <4s (David
    // 2026-07-04 node repro), so it's the WebKit Web Worker that dies
    // transiently (memory/backgrounding), regardless of position. Force-respawn
    // a fresh worker NOW (don't wait the 30s internal backstop) and retry once;
    // a fresh worker recovers, which beats playing a random move.
    try {
      stockfishEngine.forceRestart('getAdaptiveMove hung-worker recovery');
      const revivedMove = await Promise.race([
        stockfishEngine.getBestMove(fen, 2000, skillLevel),
        makeTimeoutPromise(6000),
      ]).catch(() => null);
      if (revivedMove && revivedMove !== '(none)') {
        void logAppAudit({
          kind: 'coach-opponent-move-source',
          category: 'subsystem',
          source: 'coachGameEngine.getAdaptiveMove',
          summary: `source=stockfish-respawn move=${revivedMove} elo=${targetElo} (recovered a hung worker)`,
          fen,
        });
        return {
          move: revivedMove,
          analysis: { ...FALLBACK_ANALYSIS, bestMove: revivedMove },
          source: 'stockfish-fallback',
        };
      }
    } catch { /* recovery failed too — fall to random below */ }

    // Last resort: random legal move (should be extremely rare)
    const fallbackMove = getRandomLegalMove(fen);
    if (!fallbackMove) throw new Error('No legal moves available');
    void logAppAudit({
      kind: 'coach-opponent-move-source',
      category: 'subsystem',
      source: 'coachGameEngine.getAdaptiveMove',
      summary: `source=random move=${fallbackMove} elo=${targetElo}`,
      fen,
    });
    return {
      move: fallbackMove,
      analysis: { ...FALLBACK_ANALYSIS, bestMove: fallbackMove },
      source: 'random',
    };
  }

  const varietyChance = getVarietyChance(targetElo);
  const topLines = analysis.topLines;

  // Occasionally pick the 2nd-best move for variety (not the 3rd — too risky)
  if (topLines.length >= 2 && Math.random() < varietyChance) {
    const secondLine = topLines[1];
    if (secondLine.moves.length > 0) {
      // Only pick 2nd-best if it's not drastically worse (within 0.8 pawns)
      const evalDiff = Math.abs(
        topLines[0].evaluation - secondLine.evaluation,
      );
      if (evalDiff < 80) {
        void logAppAudit({
          kind: 'coach-opponent-move-source',
          category: 'subsystem',
          source: 'coachGameEngine.getAdaptiveMove',
          summary: `source=stockfish-variety move=${secondLine.moves[0]} evalDiff=${evalDiff}cp elo=${targetElo}`,
          fen,
        });
        return { move: secondLine.moves[0], analysis, source: 'stockfish-variety' };
      }
    }
  }

  void logAppAudit({
    kind: 'coach-opponent-move-source',
    category: 'subsystem',
    source: 'coachGameEngine.getAdaptiveMove',
    summary: `source=stockfish-best move=${analysis.bestMove} eval=${analysis.evaluation}cp skill=${skillLevel} elo=${targetElo}`,
    fen,
  });
  return { move: analysis.bestMove, analysis, source: 'stockfish-best' };
}

/** ELO offset per difficulty level relative to the player rating. */
const DIFFICULTY_OFFSET: Record<CoachDifficulty, number> = {
  easy: -300,
  medium: 0,
  hard: 200,
};

export function getTargetStrength(playerRating: number, difficulty: CoachDifficulty = 'medium'): number {
  return Math.max(600, playerRating + DIFFICULTY_OFFSET[difficulty]);
}
