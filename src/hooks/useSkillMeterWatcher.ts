import { useEffect, useRef } from 'react';
import { onWeaknessModelChanged } from '../services/weaknessModelEvents';
import { readSkillRows, metersFrom, isBackgroundRow, type SkillRows } from '../services/skillMetersLoader';
import { levelOf } from '../services/skillMeters';
import type { SkillMove } from '../components/Coach/SkillLevelBar';

/**
 * Watch the skill meters while the student plays, and report each one that a
 * move of THIS game moved (David 2026-10-18: the coin and bar). Rides the same
 * signal as the FIXED chips (`onWeaknessModelChanged`): a snapshot when the game
 * starts, a re-read each time a record row is written.
 *
 * A background pass over an old game also writes rows; those are folded into
 * the baseline silently, so a coin only ever means "the move you just made".
 */
export function useSkillMeterWatcher(active: boolean, onMove: (moves: SkillMove[]) => void): void {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let known: Set<string> | null = null;
    const ids = (r: SkillRows): Set<string> => new Set([...r.held.map((x) => x.id), ...r.slips.map((x) => x.id)]);
    void readSkillRows().then((r) => { if (!cancelled) known = ids(r); }).catch(() => { known = new Set(); });
    const off = onWeaknessModelChanged(() => {
      void readSkillRows().then((now) => {
        if (cancelled || !known) return;
        const seen = known;
        const fresh = (x: { id: string }): boolean => !seen.has(x.id);
        const live = (x: { id: string; origin?: string; source?: string }): boolean => fresh(x) && !isBackgroundRow(x);
        // Baseline = everything except this game's live rows.
        const before = metersFrom({
          held: now.held.filter((x) => !live(x)),
          slips: now.slips.filter((x) => !live(x)),
          startRating: now.startRating,
        });
        const after = metersFrom(now);
        known = ids(now);
        const moves: SkillMove[] = [];
        for (const a of after) {
          const b = before.find((m) => m.id === a.id);
          if (!b) continue;
          const delta = a.rating - b.rating;
          if (Math.abs(delta) < 0.5) continue;
          const lb = levelOf(b.rating).level;
          moves.push({
            id: `${a.id}-${Date.now()}`, label: a.label, delta, level: a.level, toNext: a.toNext,
            levelChange: a.level > lb ? 1 : a.level < lb ? -1 : 0,
          });
        }
        if (moves.length) onMoveRef.current(moves.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)));
      }).catch(() => undefined);
    });
    return () => { cancelled = true; off(); };
  }, [active]);
}
