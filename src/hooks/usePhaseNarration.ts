import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoachChatResponse } from '../services/coachApi';
import { voiceService } from '../services/voiceService';
import { stockfishEngine } from '../services/stockfishEngine';
import { buildChessContextMessage, PHASE_NARRATION_ADDITION } from '../services/coachPrompts';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
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
const NARRATION_API_TIMEOUT_MS = 30_000;
const NARRATION_SPEAK_TIMEOUT_MS = 60_000;

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
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);

    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;

    try {
      let stockfishAnalysis: StockfishAnalysis | null = null;
      try {
        stockfishAnalysis = await withTimeout(
          stockfishEngine.analyzePosition(event.fen, 16),
          STOCKFISH_TIMEOUT_MS,
          'stockfish',
        );
      } catch {
        stockfishAnalysis = null;
      }
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? 1200;
      const { getPgn, getOpeningName } = argsRef.current;

      const transitionLabel = event.kind === 'opening-to-middlegame'
        ? 'Opening → Middlegame'
        : 'Middlegame → Endgame';

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
          `Verbosity: ${verbosity}.\n` +
          `Narrate the transition per the VERBOSITY rules above. Do not invent moves or pieces — every claim must be verifiable against the Position (FEN) line and the Stockfish / Tactics analysis blocks below.`,
      };

      const userMessage = buildChessContextMessage(context);

      try {
        apiResponse = await withTimeout(
          getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            PHASE_NARRATION_ADDITION,
            (chunk: string) => {
              if (token !== activeTokenRef.current) return;
              fullText += chunk;
              setCurrentText(fullText);
            },
            'position_analysis_chat',
            2000,
            'medium',
          ),
          NARRATION_API_TIMEOUT_MS,
          'phase-narration-api',
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
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

      const streamed = fullText.trim();
      const apiTrimmed = apiResponse.trim();
      let speakText = streamed;
      if (!speakText && apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
        speakText = apiTrimmed;
      }

      if (!speakText) {
        if (apiTimedOut) {
          setCurrentText('Phase narration timed out.');
        }
        return;
      }

      setCurrentText(speakText);
      try {
        await withTimeout(
          voiceService.speakForced(speakText),
          NARRATION_SPEAK_TIMEOUT_MS,
          'phase-narration-speak',
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
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
    } finally {
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, []);

  return { narrate, cancel, isNarrating, currentText, error };
}
