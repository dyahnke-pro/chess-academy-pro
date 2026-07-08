/**
 * useGameCalculationPuzzles
 * -------------------------
 * Async-loads the student's own game-derived puzzles that match a
 * calculation skill's pattern, for blending into the adaptive drill
 * stream. Returns an empty array (and no error) for a fresh user with
 * no matching mistakes — the drill then behaves exactly as the static
 * pool did.
 */
import { useEffect, useState } from 'react';
import { getGameCalculationPuzzlesForSkill } from '../services/gameCalculationPuzzleService';
import type { RawPuzzle } from '../services/adaptiveEndgameService';

export interface GameCalculationPuzzles {
  puzzles: RawPuzzle[];
  loading: boolean;
}

export function useGameCalculationPuzzles(skillId: string): GameCalculationPuzzles {
  const [puzzles, setPuzzles] = useState<RawPuzzle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGameCalculationPuzzlesForSkill(skillId)
      .then((p) => {
        if (!cancelled) setPuzzles(p);
      })
      .catch(() => {
        if (!cancelled) setPuzzles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  return { puzzles, loading };
}
