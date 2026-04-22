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

/** Stockfish analysis budget — a hung worker must not strand the hook. */
const STOCKFISH_TIMEOUT_MS = 8_000;
/** Total budget for the coach LLM round-trip (network + stream). The WO
 *  cites ~30s as the human-acceptable upper bound before we show a
 *  retry message. Tuned a bit tighter so the student sees a clear
 *  failure instead of a silent wait. */
const NARRATION_API_TIMEOUT_MS = 30_000;
/** Speech playback budget. Caps the hook's wait for Polly / Web Speech
 *  to finish so a frozen audio pipeline can't hold isNarrating true
 *  indefinitely. The voiceService itself already aborts on stop(). */
const NARRATION_SPEAK_TIMEOUT_MS = 60_000;

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

    // Accumulated streamed text. Lives outside the API try/catch so a
    // truncated / aborted / timed-out stream still produces voice for
    // whatever the coach already generated. Rule: if the coach
    // generated words, Dave hears them.
    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;

    try {
      // Ground the narration in Stockfish so the coach doesn't
      // hallucinate what's hanging or whose pieces are active.
      // Non-fatal: if Stockfish can't answer in time (or at all),
      // narrate without it.
      let stockfishAnalysis: StockfishAnalysis | null = null;
      try {
        stockfishAnalysis = await withTimeout(
          stockfishEngine.analyzePosition(args.fen, 16),
          STOCKFISH_TIMEOUT_MS,
          'stockfish',
        );
      } catch {
        stockfishAnalysis = null;
      }
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

      try {
        apiResponse = await withTimeout(
          getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            POSITION_NARRATION_ADDITION,
            (chunk: string) => {
              if (token !== activeTokenRef.current) return;
              fullText += chunk;
              setCurrentText(fullText);
            },
            'position_analysis_chat',
            // Raised 400→600 by WO-COACH-NARRATION-03. Narration spec is
            // 70-150 words (~100-225 tokens). 600 gives a safety margin
            // so the model doesn't land the last sentence against the cap.
            600,
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

      // Prefer streamed tokens — that's what the user saw on screen.
      // Fall back to the API return value only if nothing streamed AND
      // it isn't an inline error placeholder ("⚠️ Coach error: …").
      const streamed = fullText.trim();
      const apiTrimmed = apiResponse.trim();
      let speakText = streamed;
      if (!speakText && apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
        speakText = apiTrimmed;
      }

      if (!speakText) {
        // Nothing to say. If we hit the timeout and streamed nothing,
        // surface a graceful retry message so the banner isn't empty.
        if (apiTimedOut) {
          setCurrentText('Narration timed out — tap again to retry.');
        }
        return;
      }

      setCurrentText(speakText);
      try {
        await withTimeout(
          voiceService.speakForced(speakText),
          NARRATION_SPEAK_TIMEOUT_MS,
          'narration-speak',
        );
      } catch (err: unknown) {
        // Audio failure or playback timeout — text already on screen
        // for the student. Surface the error but don't crash the hook.
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          // Force audio to stop so the next narrate() starts clean.
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
