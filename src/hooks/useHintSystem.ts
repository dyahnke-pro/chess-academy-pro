/**
 * useHintSystem
 * -------------
 * Progressive hint tiers (WO-HINT-REDESIGN-01). Replaces the legacy
 * three-arrow / Socratic-nudge / ghost-piece tiers with a teaching
 * sequence:
 *
 *   Tier 1 — the WHY: strategic diagnosis, no piece or square named.
 *   Tier 2 — the WHICH: the specific piece (with disambiguator), no
 *            destination square, no arrow.
 *   Tier 3 — the FULL ANSWER: move + green arrow + deeper rationale.
 *
 * Each tier streams an LLM response through Polly + Web Speech via
 * voiceService. Stockfish runs through the shared FEN cache so repeat
 * taps and other narration paths reuse the same analysis. Every tap
 * records to `useCoachMemoryStore.hintRequests`; the next move played
 * on the same FEN finalizes the record with `userPlayedBestMove` so
 * the cross-game growth map (future WO) can mine the data.
 *
 * Public shape is unchanged — `hintState.arrows`, `nudgeText`, and
 * `ghostMove` are all still present so CoachGamePage's existing
 * rendering paths keep working without modification. `ghostMove` is
 * always null going forward; Tier 3 uses an arrow instead.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import { voiceService } from '../services/voiceService';
import { explainBestMoveGrounded } from '../services/groundedAnswer';
import {
  getCachedStockfish,
  setCachedStockfish,
} from './stockfishFenCache';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';
import { logAppAudit } from '../services/appAuditor';
import type {
  HintLevel,
  BoardArrow,
  GhostMoveData,
  StockfishAnalysis,
} from '../types';

export interface UseHintSystemConfig {
  fen: string;
  playerColor: 'white' | 'black';
  enabled: boolean;
  /** @deprecated Stockfish depth is now fixed at the fast-pathway 10
   *  to match Read Position and Phase Narration. Argument retained
   *  for API stability with prior callers. */
  analysisDepth?: number;
  knownMove?: { from: string; to: string; san: string } | null;
  /** @deprecated Reserved for future hint classification (fork / pin /
   *  back-rank) but unused in the current tier prompts. */
  puzzleThemes?: string[];
  /** Optional context fields used to enrich the memory record so
   *  cross-game queries can filter / surface in review. Falls back to
   *  empty string + 0 when omitted, preserving back-compat. */
  gameId?: string;
  moveNumber?: number;
  ply?: number;
  /** The student's rating, used to size the live-tactics lookahead
   *  (`getTacticLookahead`). The hint now feeds the brain a real,
   *  code-computed TacticsLiveContext so it can NAME the tactic on the
   *  board (and the tactic-claim gate validates against it instead of
   *  stripping an ungrounded mention — PostHog `hint.tacticClaimGate
   *  audit-only (no tactics context)`, David 2026-06-22). Defaults to
   *  1200 when omitted. */
  playerRating?: number;
}

export interface HintState {
  level: HintLevel;
  arrows: BoardArrow[];
  nudgeText: string | null;
  ghostMove: GhostMoveData | null;
  isAnalyzing: boolean;
  hintsUsed: number;
  /** The exact best move the hint computed for a position, keyed by FEN, so the
   *  blunder classifier can GROUND its verdict on the SAME data that drew the
   *  arrow (David 2026-07-10: "the board flash grounded to the same deterministic
   *  data"). Without this the flash ran a SECOND, separate engine analysis that
   *  could disagree with the hint — flagging the very move the coach recommended
   *  as a blunder. Playing this move must never flash red. */
  resolvedBestMove: { fen: string; uci: string } | null;
}

export interface UseHintSystemReturn {
  hintState: HintState;
  requestHint: () => void;
  resetHints: () => void;
}

const TIER3_ARROW_COLOR = 'rgba(34, 197, 94, 0.85)'; // green-500 @ 85%
const HINT_API_TIMEOUT_MS = 30_000;
const HINT_STOCKFISH_DEPTH = 10;

const INITIAL_STATE: HintState = {
  level: 0,
  arrows: [],
  nudgeText: null,
  ghostMove: null,
  isAnalyzing: false,
  hintsUsed: 0,
  resolvedBestMove: null,
};

function uciToSquares(uci: string): { from: string; to: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

function isLegalMove(fen: string, from: string, to: string): boolean {
  try {
    const chess = new Chess(fen);
    const legal = chess.moves({ verbose: true });
    return legal.some((m) => m.from === from && m.to === to);
  } catch {
    return false;
  }
}

function pieceNameFromSymbol(symbol: string): string {
  switch (symbol.toLowerCase()) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return 'piece';
  }
}

interface BestMoveCacheEntry {
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  analysis: StockfishAnalysis;
}

async function resolveBestMove(
  fen: string,
  knownMove: UseHintSystemConfig['knownMove'],
): Promise<BestMoveCacheEntry | null> {
  if (knownMove) {
    return {
      fen,
      bestMoveUci: `${knownMove.from}${knownMove.to}`,
      bestMoveSan: knownMove.san,
      // Synthesise a minimal analysis envelope so downstream callers
      // (LLM context) don't have to special-case knownMove.
      analysis: {
        bestMove: `${knownMove.from}${knownMove.to}`,
        evaluation: 0,
        isMate: false,
        mateIn: null,
        depth: 0,
        topLines: [],
        nodesPerSecond: 0,
      },
    };
  }
  const cached = getCachedStockfish(fen);
  let analysis = cached;
  if (!analysis) {
    try {
      analysis = await stockfishEngine.analyzePosition(fen, HINT_STOCKFISH_DEPTH);
      setCachedStockfish(fen, analysis);
    } catch {
      return null;
    }
  }
  if (!analysis.bestMove) return null;
  // Convert UCI → SAN via chess.js so the prompt sees natural notation.
  let bestMoveSan = analysis.bestMove;
  try {
    const chess = new Chess(fen);
    const moveResult = chess.move({
      from: analysis.bestMove.slice(0, 2),
      to: analysis.bestMove.slice(2, 4),
      promotion: analysis.bestMove.length > 4 ? analysis.bestMove[4] : undefined,
    });
    bestMoveSan = moveResult.san;
  } catch {
    // Fall back to UCI if chess.js can't replay (rare — unrecognised position).
  }
  return {
    fen,
    bestMoveUci: analysis.bestMove,
    bestMoveSan,
    analysis,
  };
}

export function useHintSystem(config: UseHintSystemConfig): UseHintSystemReturn {
  const { fen, enabled, knownMove, gameId, moveNumber, ply, playerColor, playerRating } = config;

  const [hintState, setHintState] = useState<HintState>(INITIAL_STATE);
  const fenRef = useRef(fen);
  const bestMoveRef = useRef<BestMoveCacheEntry | null>(null);
  const inFlightRef = useRef(false);
  // Mirrors hintState.level synchronously so back-to-back clicks see
  // the freshly-bumped tier without waiting for React to re-render
  // requestHint with a new closure.
  const levelRef = useRef<HintLevel>(0);
  // Tracks when this FEN became active so the hint-revealed audit can
  // carry a meaningful `timeToRevealMs` (how long the student stared
  // at the position before tapping for help). Reset when FEN changes.
  const positionEnteredAtRef = useRef<number>(Date.now());

  // Reset per-position state when the FEN changes. Memory store records
  // are NOT cleared — they persist so the post-game review can surface
  // them. Only the in-memory tier counter and arrow buffer reset.
  useEffect(() => {
    if (fenRef.current === fen) return;
    const previousFen = fenRef.current;
    fenRef.current = fen;
    bestMoveRef.current = null;
    levelRef.current = 0;
    positionEnteredAtRef.current = Date.now();
    setHintState((prev) => ({
      ...INITIAL_STATE,
      hintsUsed: prev.hintsUsed,
    }));
    // Finalize any pending hint record for the prior FEN with the
    // move that was just played. We don't know the played UCI here,
    // so the store action accepts null and treats it as "user did
    // not play the engine's best move". The CoachGamePage move-played
    // path could call finalize directly with the UCI for accuracy in
    // a follow-up — this is the safe-default fallback.
    if (previousFen) {
      useCoachMemoryStore.getState().finalizeHintRequest({
        fen: previousFen,
        playedMoveUci: null,
      });
    }
  }, [fen]);

  const requestHint = useCallback((): void => {
    if (!enabled) return;
    if (levelRef.current >= 3) return;

    // ONE TAP = THE ANSWER (David 2026-09-06: "Fuck that system! Push once get
    // answer. With the why." — supersedes the 2026-07-03 adaptive tiers AND the
    // 2026-05-26 progressive rungs). Every hint tap goes straight to the full
    // answer: the move + green arrow + the grounded why, all computed in code.
    // No WHY/WHICH rungs, no LLM.
    // Typed 1|2|3 (not `3 as const`) so the legacy tier-1/2 code below stays
    // type-valid; the value is always 3 — one tap, the answer.
    // Cast (not an annotated literal) so TS keeps the type as the wide union and
    // does NOT narrow it to `3` — a narrowed literal makes the still-present
    // legacy `nextLevel === 2` branches below a TS2367 build error under the prod
    // `vite build` tsconfig (2026-09-06: it broke the production build while
    // `tsc --noEmit` passed). At runtime it is always the answer tier.
    const nextLevel = 3 as 1 | 2 | 3;
    levelRef.current = nextLevel;
    // Bump the level synchronously so the button reflects the tap immediately;
    // the async block below fills nudgeText / arrows a microtask later.
    setHintState((s) => ({
      ...s,
      level: nextLevel,
      hintsUsed: s.hintsUsed + 1,
    }));

    void (async () => {
      // inFlightRef set inside the async block (not the synchronous
      // prologue) so a fast second tap bumps the tier counter even
      // while the prior brain call is still streaming. Tradeoff: a
      // fast double-tap can fire two brain calls in parallel; the
      // later resolution wins.
      inFlightRef.current = true;
      try {
        setHintState((s) => ({ ...s, isAnalyzing: true }));
        const best = bestMoveRef.current ?? (await resolveBestMove(fen, knownMove));
        if (!best || fenRef.current !== fen) {
          setHintState((s) => ({ ...s, isAnalyzing: false }));
          return;
        }
        bestMoveRef.current = best;
        // Publish the resolved best move so the blunder classifier grounds its
        // verdict on the SAME data that drew the hint arrow (never flags a hinted
        // move as a blunder). Keyed by FEN so a stale hint can't mis-clear a later
        // position's move.
        setHintState((s) => ({ ...s, resolvedBestMove: { fen, uci: best.bestMoveUci } }));

        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useHintSystem.requestHint',
          summary: `surface=hint viaSpine=true tier=${nextLevel}`,
          details: JSON.stringify({
            surface: 'hint',
            viaSpine: true,
            tier: nextLevel,
            bestMoveSan: best.bestMoveSan,
          }),
          fen,
        });
        // Tier 1 analytic emit — `hint-revealed` carries the structured
        // payload analyticsService.recentHintActivity reads. Pairs with
        // the next move-attempt on the same FEN (via the join logic in
        // the service) to derive hint effectiveness.
        const timeToRevealMs = Date.now() - positionEnteredAtRef.current;
        void logAppAudit({
          kind: 'hint-revealed',
          category: 'subsystem',
          source: 'useHintSystem.requestHint',
          summary: `tier ${nextLevel} reveal · ${timeToRevealMs}ms since position`,
          details: JSON.stringify({
            surface: 'coach-play',  // useHintSystem is wired in CoachGamePage today
            reason: 'student-tap',
            tier: nextLevel,
            timeToRevealMs,
            fen,
            sourceId: gameId ?? undefined,
          }),
          fen,
        });

        // ── TIER 3 = THE ANSWER: computed in code, never the brain (David
        // 2026-09-06: "just do the standard green arrow and name the fucking
        // move… throw a why in there too if you can").
        //
        // The hint ALREADY knows the move (Stockfish) and the WHY is board-
        // provable (explainBestMoveGrounded — wins the piece / forks / check /
        // the quiet purpose). Routing that through the chat brain was the bug:
        // `hint` is an internalAsk surface, so getCoachChatResponse skips the
        // move-stating assembler and the fall-through re-describes the position
        // WITHOUT the move — or serves the "I can't verify" stock line (PostHog:
        // both returning users' hint taps, 2026-09). So Tier 3 states the move +
        // a grounded why deterministically, draws the green arrow, records the
        // tap directly (the brain's record_hint_request tool is bypassed here),
        // and never calls the LLM. Tiers 1/2 (progressive WHY/WHICH) keep the
        // brain — they intentionally withhold the move, which it does fine.
        if (nextLevel === 3) {
          const moverColor: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white';
          const why = explainBestMoveGrounded(fen, null, best.bestMoveUci, moverColor);
          const { from: bmFrom, to: bmTo } = uciToSquares(best.bestMoveUci);
          let movePhrase = 'This is the move';
          try {
            const cc = new Chess(fen);
            const sq = cc.get(bmFrom as Parameters<typeof cc.get>[0]);
            const piece = sq ? pieceNameFromSymbol(sq.type) : 'piece';
            const isCapture = best.bestMoveSan.includes('x') || !!cc.get(bmTo as Parameters<typeof cc.get>[0]);
            movePhrase = isCapture ? `Your ${piece} takes on ${bmTo}` : `Your ${piece} to ${bmTo}`;
          } catch { /* fall back to the generic phrase */ }
          // `why` already ends in a period; strip it so the appended one
          // doesn't produce a stray "…e5.." (caught by the prod hint audit).
          const whyClean = why ? why.trim().replace(/[.!?]+$/, '') : '';
          const tier3Text = whyClean ? `${movePhrase} — ${whyClean}.` : `${movePhrase} — that's the move.`;

          // Record the tap directly (BRAIN-05b moved this into the brain's tool;
          // Tier 3 no longer calls the brain, so record it here — same escalate-
          // on-same-FEN store method the tool used).
          try {
            useCoachMemoryStore.getState().recordHintRequest({
              gameId: gameId ?? '',
              moveNumber: moveNumber ?? 0,
              ply: ply ?? 0,
              fen,
              bestMoveUci: best.bestMoveUci,
              bestMoveSan: best.bestMoveSan,
              tier: 3,
            });
          } catch { /* memory write is best-effort */ }

          const arrows: BoardArrow[] = [];
          const { from, to } = uciToSquares(best.bestMoveUci);
          if (isLegalMove(fen, from, to)) {
            arrows.push({ startSquare: from, endSquare: to, color: TIER3_ARROW_COLOR });
          }

          voiceService.stop();
          void voiceService.speakForced(tier3Text).catch(() => undefined);

          if (fenRef.current !== fen) { setHintState((s) => ({ ...s, isAnalyzing: false })); return; }
          setHintState((s) => ({
            ...s,
            nudgeText: tier3Text,
            arrows,
            ghostMove: null,
            isAnalyzing: false,
          }));
          return;
        }
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [enabled, knownMove, fen, gameId, moveNumber, ply, playerColor, playerRating]);

  const resetHints = useCallback((): void => {
    bestMoveRef.current = null;
    levelRef.current = 0;
    voiceService.stop();
    setHintState((prev) => ({
      ...INITIAL_STATE,
      hintsUsed: prev.hintsUsed,
    }));
  }, []);

  // Voice cleanup on unmount.
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  // Keep API-stable dummy reference to HINT_API_TIMEOUT_MS so the
  // future timeout wire-in doesn't drop the constant from the bundle
  // tree-shaker.
  void HINT_API_TIMEOUT_MS;

  return { hintState, requestHint, resetHints };
}
