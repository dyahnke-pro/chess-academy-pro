/**
 * learnRecordWatch — the ONE loop a live game uses to see the student's record
 * change: snapshot when the game starts, re-read each time a record row is
 * written (`onWeaknessModelChanged`), and report what crossed. Two readers ride
 * it: a skill turning GREEN (the FIXED chip) and a skill METER moving (the coin
 * and bar). They used to be two hooks each running its own copy of the loop.
 */
import { onWeaknessModelChanged } from './weaknessModelEvents';
import { loadProvenTags } from './studentRecord';
import { claimProvenAnnouncements, markProvenAnnounced } from './provenAnnouncements';
import { readSkillRows, metersFrom, isBackgroundRow, type SkillRows } from './skillMetersLoader';
import { levelOf } from './skillMeters';

/**
 * A capability turning GREEN while the student plays. A tag proven before the
 * game began never fires; a tag that crosses during it fires once EVER — the
 * claim goes through the one announced memory, so a background re-pass of an
 * old game never re-announces. Returns the unsubscribe.
 */
export function watchProvenTags(onProven: (tag: string) => void): () => void {
  let cancelled = false;
  let known: Set<string> | null = null;
  void loadProvenTags().then((s) => {
    if (cancelled) return;
    known = s;
    void markProvenAnnounced(s);
  }).catch(() => { known = new Set(); });
  const off = onWeaknessModelChanged(() => {
    void loadProvenTags().then((now) => {
      if (cancelled || !known) return;
      const crossed = [...now].filter((tag) => !known?.has(tag));
      known = now;
      void claimProvenAnnouncements(crossed).then((fresh) => {
        if (!cancelled) for (const tag of fresh) onProven(tag);
      });
    }).catch(() => undefined);
  });
  return () => { cancelled = true; off(); };
}

/** One meter moving, as this game's moves moved it. */
export interface SkillMeterMove {
  id: string;
  label: string;
  /** Rating points this move added (gold) or took away (red). */
  delta: number;
  level: number;
  /** 0..1 toward the next level, after the move. */
  toNext: number;
  levelChange: -1 | 0 | 1;
}

/**
 * The skill meters moving while the student plays. A background pass over an
 * old game also writes rows; those fold into the baseline silently, so a move
 * reported here only ever means "the move you just made". Returns the
 * unsubscribe.
 */
export function watchSkillMeters(onMove: (moves: SkillMeterMove[]) => void): () => void {
  let cancelled = false;
  let known: Set<string> | null = null;
  const ids = (r: SkillRows): Set<string> => new Set([...r.held.map((x) => x.id), ...r.slips.map((x) => x.id)]);
  void readSkillRows().then((r) => { if (!cancelled) known = ids(r); }).catch(() => { known = new Set(); });
  const off = onWeaknessModelChanged(() => {
    void readSkillRows().then((now) => {
      if (cancelled || !known) return;
      const seen = known;
      const live = (x: { id: string; origin?: string; source?: string }): boolean => !seen.has(x.id) && !isBackgroundRow(x);
      // Baseline = everything except this game's live rows.
      const before = metersFrom({ held: now.held.filter((x) => !live(x)), slips: now.slips.filter((x) => !live(x)), startRating: now.startRating });
      const after = metersFrom(now);
      known = ids(now);
      const moves: SkillMeterMove[] = [];
      for (const a of after) {
        const b = before.find((m) => m.id === a.id);
        if (!b) continue;
        const delta = a.rating - b.rating;
        if (Math.abs(delta) < 0.5) continue;
        const lb = levelOf(b.rating).level;
        moves.push({ id: `${a.id}-${Date.now()}`, label: a.label, delta, level: a.level, toNext: a.toNext, levelChange: a.level > lb ? 1 : a.level < lb ? -1 : 0 });
      }
      if (moves.length) onMove(moves.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)));
    }).catch(() => undefined);
  });
  return () => { cancelled = true; off(); };
}
