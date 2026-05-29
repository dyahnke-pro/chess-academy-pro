import { describe, it, expect } from 'vitest';
import proRepertoires from './pro-repertoires.json';
import baselineJson from './variationMiddlegameDepth.baseline.json';
// @ts-expect-error — plain-JS shared metric, no type decls (run by node + vite)
import { reachesMiddlegame } from './variationMiddlegameDepth.shared.mjs';

// David 2026-05-29: "All openings and variations need to go to the middle
// game." This gate enforces it. A pro-rep main line OR variation whose PGN
// stops before the middlegame (uncastled, under-developed, short — see
// reachesMiddlegame) fails, UNLESS it's in the shrinking baseline backlog.
// New content must reach the middlegame; the baseline never grows.

interface ProVariation { name: string; pgn: string }
interface ProOpening { id: string; pgn: string; variations?: ProVariation[] }
const openings = (proRepertoires as { openings: ProOpening[] }).openings;

const baseline = new Set((baselineJson as { keys: string[] }).keys);

// Collect every (key, pgn) pair: main line + each variation.
const entries: Array<{ key: string; pgn: string; isMain: boolean }> = [];
for (const o of openings) {
  entries.push({ key: `${o.id}::<main>`, pgn: o.pgn, isMain: true });
  for (const v of o.variations ?? []) {
    entries.push({ key: `${o.id}::${v.name}`, pgn: v.pgn, isMain: false });
  }
}

describe('pro-rep openings + variations walk into the middlegame', () => {
  // The teeth: nothing NEW (main line OR variation) may be shallow. Only the
  // pre-existing shrinking backlog (the baseline) is allowed to be shallow.
  it('no NEW shallow main line or variation outside the shrinking baseline', () => {
    const offenders = entries
      .filter((e) => !reachesMiddlegame(e.pgn).pass && !baseline.has(e.key))
      .map((e) => e.key);
    expect(
      offenders,
      `These lines stop before the middlegame and are NOT in the baseline. ` +
        `Extend each PGN to the player's data-derived middlegame spine (do NOT add to the baseline):\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  // Baseline hygiene: it may only SHRINK. If a baselined line now reaches the
  // middlegame, drop it from the baseline (regenerate) so the count ratchets down.
  it('baseline contains no stale (now-deep) entries — it only shrinks', () => {
    const nowDeep = [...baseline].filter((key) => {
      const e = entries.find((x) => x.key === key);
      return e && reachesMiddlegame(e.pgn).pass;
    });
    expect(
      nowDeep,
      `These baseline entries now reach the middlegame — remove them from ` +
        `variationMiddlegameDepth.baseline.json (regenerate via gen-mg-depth-baseline.mjs):\n${nowDeep.join('\n')}`,
    ).toEqual([]);
  });

  // Every baseline key must still exist (catches renames/removals leaving dead keys).
  it('baseline references only live variation keys', () => {
    const live = new Set(entries.map((e) => e.key));
    const dead = [...baseline].filter((k) => !live.has(k));
    expect(dead, `Baseline keys with no matching variation (rename/remove cleanup):\n${dead.join('\n')}`).toEqual([]);
  });
});
