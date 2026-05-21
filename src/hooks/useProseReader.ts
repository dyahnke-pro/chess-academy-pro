import { useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeForTTS, voiceService } from '../services/voiceService';
import { scrubDescriptiveNotationForSpeech } from '../utils/descriptiveNotation';

export interface ProseUnit {
  /** Stable id used for highlight + click-to-play. */
  id: string;
  /** Text spoken for this unit (may differ from displayed text). */
  text: string;
}

export interface ProseReader {
  /** Id of the unit currently being read, or null. */
  currentId: string | null;
  isPlaying: boolean;
  /** Play sequentially from the given unit to the end. */
  playFrom: (id: string) => void;
  /** Read just this one unit, then stop. */
  playOne: (id: string) => void;
  /** Toggle: play from current/start, or pause. */
  toggle: () => void;
  stop: () => void;
}

/**
 * Shared "audiobook" engine for any prose surface. Reads `units`
 * sequentially through the canonical voice path (sanitize + descriptive-
 * notation scrub), exposes the currently-spoken unit for follow-along
 * highlight, and supports click-to-start-here + relisten-one. Voice-
 * promise resolution drives advancement (no racing timers). A token
 * supersedes any in-flight chain on pause / restart / unmount.
 */
export function useProseReader(units: ProseUnit[]): ProseReader {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const tokenRef = useRef(0);
  const unitsRef = useRef(units);
  unitsRef.current = units;

  const stop = useCallback((): void => {
    tokenRef.current++;
    voiceService.stop();
    setIsPlaying(false);
    setCurrentId(null);
  }, []);

  useEffect(
    () => () => {
      tokenRef.current++;
      voiceService.stop();
    },
    [],
  );

  const speakUnit = useCallback(async (text: string): Promise<void> => {
    await voiceService.speakForced(sanitizeForTTS(scrubDescriptiveNotationForSpeech(text)));
  }, []);

  const playSequence = useCallback(
    async (startIdx: number): Promise<void> => {
      const token = ++tokenRef.current;
      setIsPlaying(true);
      const list = unitsRef.current;
      for (let i = startIdx; i < list.length; i++) {
        if (tokenRef.current !== token) return;
        setCurrentId(list[i].id);
        try {
          await speakUnit(list[i].text);
        } catch {
          /* keep reading even if one unit fails */
        }
        if (tokenRef.current !== token) return;
      }
      if (tokenRef.current === token) {
        setIsPlaying(false);
        setCurrentId(null);
      }
    },
    [speakUnit],
  );

  const playFrom = useCallback(
    (id: string): void => {
      const idx = unitsRef.current.findIndex((u) => u.id === id);
      if (idx >= 0) void playSequence(idx);
    },
    [playSequence],
  );

  const playOne = useCallback(
    (id: string): void => {
      const unit = unitsRef.current.find((u) => u.id === id);
      if (!unit) return;
      const token = ++tokenRef.current;
      voiceService.stop();
      setIsPlaying(true);
      setCurrentId(id);
      void speakUnit(unit.text)
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          if (tokenRef.current === token) {
            setIsPlaying(false);
            setCurrentId(null);
          }
        });
    },
    [speakUnit],
  );

  const toggle = useCallback((): void => {
    if (isPlaying) {
      stop();
      return;
    }
    const list = unitsRef.current;
    const startIdx = currentId ? Math.max(0, list.findIndex((u) => u.id === currentId)) : 0;
    void playSequence(startIdx);
  }, [isPlaying, currentId, playSequence, stop]);

  return { currentId, isPlaying, playFrom, playOne, toggle, stop };
}
