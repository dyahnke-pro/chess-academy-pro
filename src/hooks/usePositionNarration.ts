import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoachChatResponse } from '../services/coachApi';
import { voiceService } from '../services/voiceService';
import { stockfishEngine } from '../services/stockfishEngine';
import { buildChessContextMessage, POSITION_NARRATION_ADDITION } from '../services/coachPrompts';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
import type { CoachContext, StockfishAnalysis } from '../types';

export interface UsePositionNarrationArgs {
  fen: string;
  pgn: string;
  moveNumber: number;
  playerColor: 'white' | 'black';
  openingName?: string | null;
}

export interface UsePositionNarrationResult {
  narrate: () => Promise<void>;
  cancel: () => void;
  isNarrating: boolean;
  currentText: string;
  error: string | null;
}

/** Stockfish analysis budget — a hung worker must not strand the hook.
 *  This is the outer safety timeout; the hook also races against a
 *  much shorter budget below to keep the tap→first-word latency down. */
const STOCKFISH_TIMEOUT_MS = 8_000;
/** Tap-latency race budget (WO-POLISH-03). If Stockfish hasn't
 *  returned within this window, dispatch the LLM call without the
 *  engine analysis. The narration prompt already handles the missing
 *  block gracefully ("narrate in plans and general shape only"). */
const STOCKFISH_FAST_BUDGET_MS = 500;
/** Total budget for the coach LLM round-trip (network + stream). Raised
 *  30s→120s by WO-POLISH-02. A long-form narration at realistic stream
 *  rates can take well past 30s; the original cap was truncating valid
 *  responses mid-stream and leaving `fullText` short of a period. */
const NARRATION_API_TIMEOUT_MS = 120_000;
/** Speech playback budget. Raised 60s→600s by WO-POLISH-02 — the
 *  previous 60s cap was the primary `narration-speak-timeout` source
 *  (audit log Finding 49). A normal 300-word narration at Polly's
 *  spoken rate already runs well over 60s; 10 minutes is effectively
 *  unlimited for any narration we'd actually produce. The timeout
 *  remains a safety net for a frozen audio pipeline, not a truncator. */
const NARRATION_SPEAK_TIMEOUT_MS = 600_000;

/** Race a promise against a timeout. Rejects with an Error whose
 *  message ends in "-timeout" so the caller can cheaply distinguish
 *  timeout failures from genuine errors. Clears the timer on resolve. */
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
 * Drives the "Read this position" button on the coach play screen.
 *
 * Calls the coach LLM with POSITION_NARRATION_ADDITION, streams tokens
 * into `currentText` for a live subtitle banner, then hands the full
 * response to voiceService.speakForced() for TTS. Cancellation uses a
 * token counter so an in-flight run is superseded instead of racing.
 *
 * Every async step is bounded by a timeout. If any step hangs, the
 * timeout fires, the catch block runs, the finally resets state — so
 * the button can NEVER get stuck in "Reading…" and the board can NEVER
 * stay frozen. That's WO-COACH-NARRATION-05's invariant.
 */
export function usePositionNarration(args: UsePositionNarrationArgs): UsePositionNarrationResult {
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);

  // Defensive unmount cleanup — bump the token so any pending narrate
  // call becomes a no-op at its next checkpoint, stop audio, clear
  // state. State setters on an unmounted component are silent no-ops
  // in React 18+, so this is safe.
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

  const narrate = useCallback(async () => {
    // Bump the token so any still-running call from a prior tap bails
    // out when it next checks. stop() kills in-flight audio immediately.
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);
    // WO-POLISH-03: record tap timestamp so the first-sentence
    // dispatch can log tap-to-first-word latency in the audit trail.
    const tapTs = Date.now();

    // Accumulated streamed text. Lives outside the API try/catch so a
    // truncated / aborted / timed-out stream still produces voice for
    // whatever the coach already generated. Rule: if the coach
    // generated words, Dave hears them.
    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;

    try {
      // WO-POLISH-03: fire Stockfish in PARALLEL with the rest of
      // setup. Race against a short budget so LLM dispatch isn't
      // blocked by engine analysis; whichever finishes first is what
      // the LLM gets. If Stockfish is late, the narration prompt
      // already handles missing stockfishAnalysis gracefully.
      // Depth dropped 16 → 12 for faster turnaround; tactics
      // detection is deterministic and runs in buildChessContextMessage
      // regardless, so grounding quality barely changes.
      const stockfishRace: Promise<StockfishAnalysis | null> = withTimeout(
        stockfishEngine.analyzePosition(args.fen, 12),
        STOCKFISH_TIMEOUT_MS,
        'stockfish',
      ).then(
        (r) => r,
        () => null as StockfishAnalysis | null,
      );
      const stockfishBudget = new Promise<null>((resolve) => setTimeout(() => resolve(null), STOCKFISH_FAST_BUDGET_MS));
      const stockfishAnalysis = await Promise.race([stockfishRace, stockfishBudget]);
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? 1200;

      const context: CoachContext = {
        fen: args.fen,
        lastMoveSan: null,
        moveNumber: args.moveNumber,
        pgn: args.pgn,
        openingName: args.openingName ?? null,
        stockfishAnalysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating, weaknesses: [] },
        additionalContext: `The student is playing as ${args.playerColor}. They just tapped "Read this position" — give them a live, spoken narration of what you see.`,
      };

      const userMessage = buildChessContextMessage(context);

      // WO-POLISH-03: sentence-buffered streaming TTS. As LLM chunks
      // arrive, split on sentence boundaries and dispatch each sentence
      // for speech immediately. First sentence goes through Polly
      // (speakForced — premium voice for the first impression);
      // subsequent sentences go through Web Speech (speakQueuedForced —
      // low latency, no cancellation of the Polly utterance) so the
      // user hears the narration start within one sentence of the first
      // LLM token.
      let sentenceBuffer = '';
      let firstSpeakPromise: Promise<void> | null = null;
      let sentenceCount = 0;
      const dispatchSentence = (sentence: string): void => {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        sentenceCount += 1;
        if (sentenceCount === 1) {
          const firstDispatchMs = Date.now() - tapTs;
          void logAppAudit({
            kind: 'narration-latency',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: `tap-to-first-dispatch ${firstDispatchMs}ms`,
            details: JSON.stringify({
              tapToFirstDispatchMs: firstDispatchMs,
              firstSentenceChars: trimmed.length,
              stockfishResolved: stockfishAnalysis !== null,
            }),
            fen: args.fen,
          });
          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
            /* swallow — error handled via logAppAudit path */
          });
        } else {
          // Queue subsequent sentences behind the Polly first-sentence
          // so they don't talk over it. speakQueuedForced uses Web
          // Speech, which starts near-instantly once Polly ends.
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

      try {
        apiResponse = await withTimeout(
          getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            POSITION_NARRATION_ADDITION,
            (chunk: string) => {
              if (token !== activeTokenRef.current) return;
              fullText += chunk;
              setCurrentText(fullText);
              sentenceBuffer += chunk;
              flushCompletedSentences();
            },
            'position_analysis_chat',
            // Raised 2000→4000 by WO-POLISH-02. Effectively unlimited
            // for a narration; the cap is never the reason a sentence
            // gets cut off.
            4000,
            // Override verbosity — narration length is constrained by the
            // prompt, not by the student's global verbosity setting.
            'medium',
          ),
          NARRATION_API_TIMEOUT_MS,
          'narration-api',
        );
      } catch (err: unknown) {
        // Stream errored or timed out — DON'T bail. Tokens already
        // streamed are speakable. Record the error and fall through.
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          apiTimedOut = true;
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: 'narration API call timed out',
            details: msg,
            fen: args.fen,
          });
        }
      }

      // Only suppress speech on explicit user cancel / re-tap (token
      // supersession). Stream errors / truncation still speak whatever
      // arrived before the failure.
      if (token !== activeTokenRef.current) return;

      // Flush any tail text that didn't end with a sentence terminator
      // (e.g. stream truncated mid-sentence — still speakable).
      if (sentenceBuffer.trim()) {
        dispatchSentence(sentenceBuffer);
        sentenceBuffer = '';
      }

      // Fallback path: if nothing streamed and nothing dispatched, but
      // the API returned a usable response (non-streaming provider,
      // rare), dispatch that as a single speak.
      if (sentenceCount === 0) {
        const apiTrimmed = apiResponse.trim();
        if (apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
          setCurrentText(apiTrimmed);
          dispatchSentence(apiTrimmed);
        } else if (apiTimedOut) {
          // Nothing to say and the call timed out — surface retry hint.
          setCurrentText('Narration timed out — tap again to retry.');
          return;
        } else {
          return;
        }
      }

      // Block isNarrating true until the first (Polly) sentence finishes
      // — preserves the "board frozen while main voice speaks" invariant
      // from WO-COACH-NARRATION-05. Any queued Web Speech sentences
      // continue playing after the board unfreezes, which is fine —
      // Dave can play while the tail narration finishes.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (firstSpeakPromise) {
        try {
          await withTimeout(firstSpeakPromise, NARRATION_SPEAK_TIMEOUT_MS, 'narration-speak');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          if (msg.endsWith('-timeout')) {
            voiceService.stop();
            void logAppAudit({
              kind: 'tts-failure',
              category: 'subsystem',
              source: 'usePositionNarration',
              summary: 'narration TTS playback timed out',
              details: msg,
              fen: args.fen,
            });
          }
        }
      }
    } finally {
      // This is the invariant: if narration is not actively streaming
      // audio right now, the hook's state says so — and therefore the
      // board unfreezes. Token-gated so a superseded older call
      // doesn't clobber the newer call's active state.
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, [args.fen, args.pgn, args.moveNumber, args.playerColor, args.openingName]);

  return { narrate, cancel, isNarrating, currentText, error };
}
