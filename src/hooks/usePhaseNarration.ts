import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoachChatResponse } from '../services/coachApi';
import { voiceService } from '../services/voiceService';
import { stockfishEngine } from '../services/stockfishEngine';
import { buildChessContextMessage, PHASE_NARRATION_ADDITION } from '../services/coachPrompts';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
import { getCachedStockfish, setCachedStockfish } from './stockfishFenCache';
import type { CoachContext, PhaseNarrationVerbosity, StockfishAnalysis } from '../types';
import type { PhaseTransitionEvent } from '../services/phaseTransitionDetector';

export interface UsePhaseNarrationArgs {
  /** Full PGN at narration time — fed into the grounding block. */
  getPgn: () => string;
  /** Opening name as detected by the coach game screen. */
  getOpeningName: () => string | null;
}

export interface UsePhaseNarrationResult {
  narrate: (event: PhaseTransitionEvent, verbosity: Exclude<PhaseNarrationVerbosity, 'off'>) => Promise<void>;
  cancel: () => void;
  isNarrating: boolean;
  currentText: string;
  error: string | null;
}

/** Mirrors usePositionNarration's budgets (WO-COACH-NARRATION-05) so a
 *  hung engine, fetch, or TTS call can never strand the hook and the
 *  transition is always either spoken or logged-and-forgotten. */
const STOCKFISH_TIMEOUT_MS = 8_000;
/** Tap-latency race budget. PHASE-LAG-01 set 500ms mirroring POLISH-03;
 *  PHASE-LAG-02 tightens to 300ms to match the post-PHASE-PROSE-01
 *  Read Position budget. PHASE_NARRATION_ADDITION tolerates a missing
 *  stockfishAnalysis block, so racing out fast is net-positive for
 *  detection-to-first-word latency. */
const STOCKFISH_FAST_BUDGET_MS = 300;
/** Stockfish analysis depth for phase narration. PHASE-LAG-01 set 12;
 *  PHASE-LAG-02 drops to 10 to match Read Position. Deterministic
 *  tactics detection runs on every FEN in buildChessContextMessage
 *  regardless, so the engine contributes only eval direction + top
 *  lines — not something that benefits from deeper search here. */
const STOCKFISH_DEPTH = 10;
const NARRATION_API_TIMEOUT_MS = 30_000;
const NARRATION_SPEAK_TIMEOUT_MS = 60_000;

/** WO-VISIBLE-POLISH bug 5 — when the phase-narration LLM call times
 *  out (Audit Finding 61) we used to render NOTHING and the user
 *  silently saw / heard nothing at the transition. These templates
 *  are deterministic, local, and prefixed with a leading `*` so the
 *  banner subtly flags it as a fallback rather than a tailored read. */
const PHASE_FALLBACK_TEMPLATES: Record<'opening-to-middlegame' | 'middlegame-to-endgame', string> = {
  'opening-to-middlegame':
    "* We're entering the middlegame. The opening is set, now it's about plans and piece coordination.",
  'middlegame-to-endgame':
    "* Endgame territory. King activity and pawn structure decide it from here.",
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Fires automatic narration at phase boundaries (opening→middlegame,
 * middlegame→endgame). Consumer holds the phase-transition ledger and
 * calls `narrate()` when the detector produces an event AND all
 * gating conditions pass (verbosity ≠ 'off', no blunder pending, no
 * position-narration in flight).
 *
 * Shape parallels `usePositionNarration` so the two hooks are
 * interchangeable from an observability standpoint — same grounding
 * pipeline, same timeout discipline, same token-supersession
 * cancellation.
 */
export function usePhaseNarration(args: UsePhaseNarrationArgs): UsePhaseNarrationResult {
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);
  // Capture args in a ref so the narrate callback's dependency list
  // stays empty — the hook is called once per coach play session and
  // should reuse the same narrate reference across renders.
  const argsRef = useRef(args);
  argsRef.current = args;

  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
      setIsNarrating(false);
      setCurrentText('');
      setError(null);
    };
  }, []);

  const cancel = useCallback(() => {
    activeTokenRef.current += 1;
    voiceService.stop();
    setIsNarrating(false);
    setCurrentText('');
  }, []);

  const narrate = useCallback(async (
    event: PhaseTransitionEvent,
    verbosity: Exclude<PhaseNarrationVerbosity, 'off'>,
  ): Promise<void> => {
    console.log('[PHASE-HOOK-01] received event', { event, verbosity });
    if (activeTokenRef.current > 0) {
      console.log('[PHASE-HOOK-02] aborting prior narration (token supersession)');
    }
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);
    // WO-PHASE-LAG-01: detection timestamp drives the tap-to-first-word
    // latency measurement. Phase narration has no literal tap — "tap"
    // here means "the moment the hook received the detection event".
    const detectedTs = Date.now();

    // Full-trail instrumentation (WO-PHASE-FIX-02): record that the
    // hook actually received an event. If Dave ever sees a
    // 'phase-transition-detected' audit entry without a matching
    // 'usePhaseNarration received' entry, the dispatch wiring is
    // broken between CoachGamePage and the hook.
    void logAppAudit({
      kind: 'phase-transition-detected',
      category: 'subsystem',
      source: 'usePhaseNarration',
      summary: `received: ${event.kind} verbosity=${verbosity}`,
      details: JSON.stringify(event),
      fen: event.fen,
    });

    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;

    try {
      // WO-PHASE-LAG-02: check the shared Stockfish FEN cache first.
      // When Read Position ran the engine on this exact board a few
      // seconds ago (or another phase transition produced the same
      // position), we skip the engine cycle entirely and jump straight
      // to LLM dispatch. Emits narration-stockfish-cache-hit for
      // observability parity with usePositionNarration.
      let stockfishAnalysis: StockfishAnalysis | null;
      const cachedAnalysis = getCachedStockfish(event.fen);
      if (cachedAnalysis) {
        void logAppAudit({
          kind: 'narration-stockfish-cache-hit',
          category: 'subsystem',
          source: 'usePhaseNarration',
          summary: 'skipped Stockfish — cached analysis',
          fen: event.fen,
        });
        stockfishAnalysis = cachedAnalysis;
        console.log('[PHASE-HOOK-03] stockfish cache hit');
      } else {
        // WO-PHASE-LAG-01: mirror WO-POLISH-03's parallel + race pattern.
        // Stockfish runs alongside the rest of setup; we race it against
        // a short budget so LLM dispatch isn't blocked by engine
        // analysis. PHASE_NARRATION_ADDITION already handles missing
        // stockfishAnalysis gracefully. WO-PHASE-LAG-02: depth 12 → 10,
        // budget 500ms → 300ms, successful analyses cached for reuse.
        console.log('[PHASE-HOOK-03] stockfish analysis call (parallel)');
        const stockfishRace: Promise<StockfishAnalysis | null> = withTimeout(
          stockfishEngine.analyzePosition(event.fen, STOCKFISH_DEPTH),
          STOCKFISH_TIMEOUT_MS,
          'stockfish',
        ).then(
          (r) => {
            setCachedStockfish(event.fen, r);
            return r;
          },
          () => null as StockfishAnalysis | null,
        );
        const stockfishBudget = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), STOCKFISH_FAST_BUDGET_MS),
        );
        stockfishAnalysis = await Promise.race([stockfishRace, stockfishBudget]);
        console.log('[PHASE-HOOK-04] stockfish race resolved', {
          hasAnalysis: stockfishAnalysis !== null,
        });
      }
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? 1200;
      const { getPgn, getOpeningName } = argsRef.current;

      const transitionLabel = event.kind === 'opening-to-middlegame'
        ? 'Opening → Middlegame'
        : 'Middlegame → Endgame';

      // WO-PHASE-PROSE-01: verbosity branching removed from the user
      // message. The prompt now invites full prose regardless of the
      // student's global verbosity setting — phase transitions are
      // rich moments that deserve the whole board read. Verbosity
      // remains a function parameter for API compatibility; a future
      // Coach Settings WO can re-introduce it with saner semantics.
      void verbosity;
      const context: CoachContext = {
        fen: event.fen,
        lastMoveSan: event.triggeringMoveSan,
        moveNumber: event.moveNumber,
        pgn: getPgn(),
        openingName: getOpeningName(),
        stockfishAnalysis,
        playerMove: event.triggeringMoveSan,
        moveClassification: null,
        playerProfile: { rating, weaknesses: [] },
        additionalContext:
          `Transition: ${transitionLabel}. Student color: ${event.playerColor}. Triggering move (the student's move that just completed the transition): ${event.triggeringMoveSan}.\n` +
          `Narrate the transition as thoroughly as the position deserves. There is no length limit. Do not invent moves or pieces — every claim must be verifiable against the Position (FEN) line and the Stockfish / Tactics analysis blocks below.`,
      };

      const userMessage = buildChessContextMessage(context);

      // WO-PHASE-LAG-01: sentence-buffered streaming TTS (mirror of
      // WO-POLISH-03 in usePositionNarration). First complete sentence
      // goes to Polly (speakForced) so the premium voice lands on the
      // first impression; subsequent sentences chain through Web Speech
      // (speakQueuedForced) behind the Polly promise so they don't talk
      // over it. Net effect: voice starts within one sentence of the
      // first LLM token instead of waiting for the full response.
      let sentenceBuffer = '';
      let firstSpeakPromise: Promise<void> | null = null;
      let sentenceCount = 0;
      const dispatchSentence = (sentence: string): void => {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        sentenceCount += 1;
        if (sentenceCount === 1) {
          const firstDispatchMs = Date.now() - detectedTs;
          void logAppAudit({
            kind: 'phase-narration-latency',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `detection-to-first-dispatch ${firstDispatchMs}ms (${event.kind})`,
            details: JSON.stringify({
              tapToFirstDispatchMs: firstDispatchMs,
              firstSentenceChars: trimmed.length,
              stockfishResolved: stockfishAnalysis !== null,
              transitionKind: event.kind,
            }),
            fen: event.fen,
          });
          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
            /* swallow — error handled via logAppAudit path */
          });
        } else {
          if (firstSpeakPromise) {
            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
          } else {
            voiceService.speakQueuedForced(trimmed);
          }
        }
      };
      // `+` (not `*`) so a bare terminator like "..." can't match a
      // zero-char sentence. Requires ≥1 non-terminator char before the
      // `.`/`!`/`?` so we dispatch only actual sentences.
      const SENTENCE_END_RE = /([^.!?]+[.!?])(?=\s|$)/g;
      const flushCompletedSentences = (): void => {
        SENTENCE_END_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        let lastEnd = 0;
        while ((match = SENTENCE_END_RE.exec(sentenceBuffer)) !== null) {
          dispatchSentence(match[1]);
          lastEnd = SENTENCE_END_RE.lastIndex;
        }
        if (lastEnd > 0) sentenceBuffer = sentenceBuffer.slice(lastEnd);
      };

      console.log('[PHASE-HOOK-05] LLM call dispatched', {
        addition: 'PHASE_NARRATION_ADDITION',
        task: 'position_analysis_chat',
        maxTokens: 4000,
      });
      try {
        apiResponse = await withTimeout(
          getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            PHASE_NARRATION_ADDITION,
            (chunk: string) => {
              if (token !== activeTokenRef.current) return;
              fullText += chunk;
              setCurrentText(fullText);
              sentenceBuffer += chunk;
              flushCompletedSentences();
            },
            'position_analysis_chat',
            // WO-PHASE-PROSE-01: raised 2000 → 4000 to match
            // usePositionNarration's cap. Phase prose is full coach
            // reads (20+ seconds of speech), not a tagline.
            4000,
            'medium',
          ),
          NARRATION_API_TIMEOUT_MS,
          'phase-narration-api',
        );
        console.log('[PHASE-HOOK-06] LLM returned', {
          length: apiResponse.length,
          startsWithWarning: apiResponse.startsWith('⚠️'),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log('[PHASE-HOOK-06] LLM errored', msg);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          apiTimedOut = true;
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `phase narration API timed out (${event.kind})`,
            details: msg,
            fen: event.fen,
          });
        }
      }

      if (token !== activeTokenRef.current) return;

      // Flush any tail text that didn't end with a sentence terminator
      // (e.g. stream truncated mid-sentence — still speakable).
      if (sentenceBuffer.trim()) {
        dispatchSentence(sentenceBuffer);
        sentenceBuffer = '';
      }

      // Fallback: if nothing streamed and nothing dispatched but the
      // API returned a usable response (non-streaming provider, rare),
      // dispatch that as a single speak.
      if (sentenceCount === 0) {
        const apiTrimmed = apiResponse.trim();
        if (apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
          setCurrentText(apiTrimmed);
          dispatchSentence(apiTrimmed);
        } else if (apiTimedOut || apiTrimmed.startsWith('⚠️') || !apiTrimmed) {
          // WO-VISIBLE-POLISH bug 5 — Audit Finding 61: silent failure
          // when the phase-narration API hung. Render the deterministic
          // template so the user sees / hears SOMETHING for the
          // transition. Audio uses the local text — no API round-trip.
          const fallback = PHASE_FALLBACK_TEMPLATES[event.kind];
          const reason = apiTimedOut
            ? 'api-timeout'
            : apiTrimmed.startsWith('⚠️')
              ? 'api-warning'
              : 'empty-response';
          void logAppAudit({
            kind: 'phase-narration-fallback-shown',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `transition=${event.kind} reason=${reason}`,
            fen: event.fen,
          });
          setCurrentText(fallback);
          dispatchSentence(fallback);
        } else {
          console.log('[PHASE-HOOK-07] speech SKIPPED: no speakable text');
          return;
        }
      }

      console.log('[PHASE-HOOK-07] streaming speech dispatched', {
        sentenceCount,
      });
      // Block isNarrating true until the first (Polly) sentence
      // finishes — preserves the "board frozen while main voice speaks"
      // invariant. Queued Web Speech sentences continue playing after
      // the board unfreezes, which is fine.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (firstSpeakPromise) {
        try {
          await withTimeout(
            firstSpeakPromise,
            NARRATION_SPEAK_TIMEOUT_MS,
            'phase-narration-speak',
          );
          console.log('[PHASE-HOOK-08] first-sentence speech complete');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log('[PHASE-HOOK-08] speech errored / timed out', msg);
          setError(msg);
          if (msg.endsWith('-timeout')) {
            voiceService.stop();
            void logAppAudit({
              kind: 'tts-failure',
              category: 'subsystem',
              source: 'usePhaseNarration',
              summary: 'phase narration TTS playback timed out',
              details: msg,
              fen: event.fen,
            });
          }
        }
      }
    } finally {
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, []);

  return { narrate, cancel, isNarrating, currentText, error };
}
