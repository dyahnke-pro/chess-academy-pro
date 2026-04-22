import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoachChatResponse } from '../services/coachApi';
import { voiceService } from '../services/voiceService';
import { stockfishEngine } from '../services/stockfishEngine';
import { buildChessContextMessage, POSITION_NARRATION_ADDITION } from '../services/coachPrompts';
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

/**
 * Drives the "Read this position" button on the coach play screen.
 *
 * Calls the coach LLM with POSITION_NARRATION_ADDITION, streams tokens
 * into `currentText` for a live subtitle banner, then hands the full
 * response to voiceService.speak() for TTS. Cancellation uses a token
 * counter so an in-flight run is superseded instead of racing.
 */
export function usePositionNarration(args: UsePositionNarrationArgs): UsePositionNarrationResult {
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);

  // Cancel any in-flight speech if the hook unmounts mid-narration.
  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
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

    try {
      // Ground the narration in Stockfish so the coach doesn't
      // hallucinate what's hanging or whose pieces are active.
      // Non-fatal: if Stockfish can't answer in time, narrate without it.
      let stockfishAnalysis: StockfishAnalysis | null = null;
      try {
        stockfishAnalysis = await stockfishEngine.analyzePosition(args.fen, 16);
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
        apiResponse = await getCoachChatResponse(
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
        );
      } catch (err: unknown) {
        // Stream errored — DON'T bail. We may still have accumulated
        // tokens worth speaking. Record the error and fall through to
        // the speak path below.
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }

      // Only suppress speech on explicit user cancel / re-tap (token
      // supersession). Stream errors / truncation still speak.
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
        return;
      }

      setCurrentText(speakText);
      try {
        await voiceService.speakForced(speakText);
      } catch (err: unknown) {
        // Audio failure — text already on screen for the student.
        // Surface the error but don't crash the hook.
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    } finally {
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, [args.fen, args.pgn, args.moveNumber, args.playerColor, args.openingName]);

  return { narrate, cancel, isNarrating, currentText, error };
}
