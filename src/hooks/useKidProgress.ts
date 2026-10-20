import { useCallback, useEffect, useState } from 'react';
import { recallData, remember } from '../services/studentMemory';

interface KidProgress {
  /** Levels finished, ever (index into the game's level list). */
  completed: ReadonlySet<number>;
  /** Best stars earned on a level, ever. */
  stars: Readonly<Record<number, number>>;
  /** True once the remembered progress has been read. */
  loaded: boolean;
  /** Mark a level finished, keeping the best stars. */
  complete: (level: number, stars?: number) => void;
}

/**
 * A kid game's levels and stars, REMEMBERED across closes (persistent memory,
 * 2026-10-19). Six games kept them only in page state, so ticks and stars
 * vanished the moment the kid left the game.
 */
export function useKidProgress(gameId: string): KidProgress {
  const [completed, setCompleted] = useState<ReadonlySet<number>>(new Set());
  const [stars, setStars] = useState<Readonly<Record<number, number>>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    void recallData('kid-progress', gameId).then((d) => {
      if (!live) return;
      if (d) {
        setCompleted((cur) => new Set([...d.levelsCompleted, ...cur]));
        setStars((cur) => {
          const out: Record<number, number> = {};
          for (const [k, v] of Object.entries(d.stars)) out[Number(k)] = v;
          for (const [k, v] of Object.entries(cur)) out[Number(k)] = Math.max(out[Number(k)] ?? 0, v);
          return out;
        });
      }
      setLoaded(true);
    });
    return () => { live = false; };
  }, [gameId]);
  const complete = useCallback((level: number, earned?: number) => {
    setCompleted((cur) => new Set([...cur, level]));
    if (earned !== undefined) setStars((cur) => ({ ...cur, [level]: Math.max(cur[level] ?? 0, earned) }));
    void remember('kid-progress', gameId, (prev) => {
      const levels = new Set([...(prev?.levelsCompleted ?? []), level]);
      const s = { ...(prev?.stars ?? {}) };
      if (earned !== undefined) s[String(level)] = Math.max(s[String(level)] ?? 0, earned);
      return { levelsCompleted: [...levels].sort((a, b) => a - b), stars: s };
    });
  }, [gameId]);
  return { completed, stars, loaded, complete };
}

/** The first level not yet finished (0 when none are, or all are). */
export function firstOpenLevel(completed: ReadonlySet<number>, levelCount: number): number {
  for (let i = 0; i < levelCount; i++) if (!completed.has(i)) return i;
  return 0;
}
