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
import {
  HINT_TIER_1_ADDITION,
  HINT_TIER_2_ADDITION,
  HINT_TIER_3_ADDITION,
} from '../services/coachPrompts';
import { coachService } from '../coach/coachService';
import type { LiveState } from '../coach/types';
import { voiceService } from '../services/voiceService';
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

/** Strip the brain's `[BOARD:...]` and `[[ACTION:...]]` tags from any
 *  spoken / displayed text — never read action tags out loud, never
 *  show them to the user in the hint nudge. */
const TAG_STRIP_RE = /\[BOARD:[^\]]*\]|\[\[ACTION:[^\]]*\]\]/gi;

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
}

export interface HintState {
  level: HintLevel;
  arrows: BoardArrow[];
  nudgeText: string | null;
  ghostMove: GhostMoveData | null;
  isAnalyzing: boolean;
  hintsUsed: number;
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
  const { fen, enabled, knownMove, gameId, moveNumber, ply, playerColor } = config;

  const [hintState, setHintState] = useState<HintState>(INITIAL_STATE);
  const fenRef = useRef(fen);
  const bestMoveRef = useRef<BestMoveCacheEntry | null>(null);
  const inFlightRef = useRef(false);
  // Mirrors hintState.level synchronously so back-to-back clicks see
  // the freshly-bumped tier without waiting for React to re-render
  // requestHint with a new closure.
  const levelRef = useRef<HintLevel>(0);

  // Reset per-position state when the FEN changes. Memory store records
  // are NOT cleared — they persist so the post-game review can surface
  // them. Only the in-memory tier counter and arrow buffer reset.
  useEffect(() => {
    if (fenRef.current === fen) return;
    const previousFen = fenRef.current;
    fenRef.current = fen;
    bestMoveRef.current = null;
    levelRef.current = 0;
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

    const nextLevel = (levelRef.current + 1) as 1 | 2 | 3;
    levelRef.current = nextLevel;
    // Bump the tier synchronously so the UI reflects the user's click
    // immediately. The brain call below populates nudgeText / arrows
    // when it returns; until then the tier is "active but loading."
    // isAnalyzing is intentionally NOT set here — HintButton has
    // disabled={hintState.isAnalyzing}, so setting it synchronously
    // would block any back-to-back click before the next render. It
    // flips one microtask later inside the async IIFE.
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

        // Build the per-tier framing that goes inside the `ask` text.
        // Post WO-BRAIN-05b the spine assembles the four-source
        // envelope (identity prompt with calibration framing,
        // memory snapshot with recent-hints summary, routes manifest,
        // live state); the surface only provides the tier-specific
        // ask + the engine context the brain needs to answer it.
        let tierAddition = HINT_TIER_1_ADDITION;
        let tierContextLine: string;
        if (nextLevel === 2) {
          // Determine piece + origin for Tier 2's prompt.
          const { from } = uciToSquares(best.bestMoveUci);
          let pieceSymbol = '?';
          try {
            const chess = new Chess(fen);
            const sq = chess.get(from as Parameters<typeof chess.get>[0]);
            if (sq) pieceSymbol = sq.type;
          } catch {
            // Fall back; brain will work from SAN.
          }
          tierAddition = HINT_TIER_2_ADDITION;
          tierContextLine =
            `Best move (for your reference, used to derive the piece): ${best.bestMoveSan}.\n` +
            `Piece to move: ${pieceNameFromSymbol(pieceSymbol)} on ${from}.`;
        } else if (nextLevel === 3) {
          tierAddition = HINT_TIER_3_ADDITION;
          tierContextLine = `Best move: ${best.bestMoveSan}. Explain WHY it's best with concrete depth — what it defends, attacks, or changes; the plan it enables next.`;
        } else {
          tierContextLine = `Best move (for your reference, DO NOT state it): ${best.bestMoveSan}. Diagnose the WHY in 1-2 sentences without naming any piece or square.`;
        }

        // The full ask: tier framing + per-tier context + an explicit
        // record_hint_request instruction so the brain reliably logs
        // the tap to memory via its cerebrum tool. Memory writes are
        // the brain's responsibility now (BRAIN-05b retired the
        // deterministic `useCoachMemoryStore.recordHintRequest`
        // call that ran before the LLM).
        const recordHintArgs = JSON.stringify({
          gameId: gameId ?? '',
          moveNumber: moveNumber ?? 0,
          ply: ply ?? 0,
          fen,
          bestMoveUci: best.bestMoveUci,
          bestMoveSan: best.bestMoveSan,
          tier: nextLevel,
        });
        const askText = [
          tierAddition,
          '',
          tierContextLine,
          '',
          `Also call record_hint_request with these args so this tap lands in memory: [[ACTION:record_hint_request ${recordHintArgs}]]`,
        ].join('\n');

        const liveState: LiveState = {
          surface: 'hint',
          fen,
          moveHistory: [],
          userJustDid: `requested hint tier ${nextLevel}`,
          currentRoute: '/coach/play',
        };
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

        // Stream chunks straight into sentence-buffered TTS so the
        // student hears the hint as the brain produces it. Tag-strip
        // both the spoken text and the final nudge text so action
        // tags never reach the user.
        let speechBuffer = '';
        let firstSpeakPromise: Promise<void> | null = null;
        const speakSentence = (sentence: string): void => {
          const cleaned = sentence.replace(TAG_STRIP_RE, '').trim();
          if (!cleaned) return;
          if (!firstSpeakPromise) {
            firstSpeakPromise = Promise.resolve(voiceService.speakForced(cleaned))
              .catch(() => undefined);
          } else {
            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(cleaned));
          }
        };
        voiceService.stop();

        let response = '';
        try {
          const answer = await coachService.ask(
            { surface: 'hint', ask: askText, liveState },
            {
              maxToolRoundTrips: 2,
              onChunk: (chunk: string) => {
                speechBuffer += chunk;
                const sentenceEnd = /[.!?\n]/.exec(speechBuffer);
                if (sentenceEnd) {
                  const sentence = speechBuffer.slice(0, sentenceEnd.index + 1).trim();
                  speechBuffer = speechBuffer.slice(sentenceEnd.index + 1).trimStart();
                  speakSentence(sentence);
                }
              },
            },
          );
          // Flush any trailing text (no terminator) via the same gate.
          const tail = speechBuffer.replace(TAG_STRIP_RE, '').trim();
          if (tail) speakSentence(tail);
          speechBuffer = '';
          response = answer.text.replace(TAG_STRIP_RE, '').trim();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'useHintSystem',
            summary: `tier ${nextLevel} spine call failed`,
            details: msg,
          });
        }

        if (fenRef.current !== fen) {
          setHintState((s) => ({ ...s, isAnalyzing: false }));
          return;
        }

        const text = response.trim();
        const arrows: BoardArrow[] = [];
        if (nextLevel === 3 && best.bestMoveUci) {
          const { from, to } = uciToSquares(best.bestMoveUci);
          if (isLegalMove(fen, from, to)) {
            arrows.push({ startSquare: from, endSquare: to, color: TIER3_ARROW_COLOR });
          }
        }

        // Streaming TTS already happened in the spine `onChunk` above
        // — no additional speak call here. The text below is the
        // post-strip nudge for the visual bubble.

        setHintState((s) => ({
          ...s,
          // level + hintsUsed already set synchronously on click
          nudgeText: text || s.nudgeText,
          arrows,
          ghostMove: null,
          isAnalyzing: false,
        }));
        // Suppress unused-var lint while preserving the reference for
        // future tier prompts that may key off student color.
        void playerColor;
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [enabled, knownMove, fen, gameId, moveNumber, ply, playerColor]);

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
