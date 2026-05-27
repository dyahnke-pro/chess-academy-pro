import { describe, it, expect } from 'vitest';
import { getLessonScript, getVariationLessonScript } from './index';
import { expectedOrientation } from './registry';
import proRepertoire from '../pro-repertoires.json';

// G1-sanctioned proof of the pro-masterclass WRITE/RESOLVE logic: the sandbox
// browser can't seed the openings store (documented IndexedDB write-stall), so
// the live render routes to David — but the resolution logic the stalled write
// would feed is proven here against the real data + registries.

const OPENING_ID = 'pro-ericrosen-stafford';

describe('Eric Rosen Stafford — pro masterclass wiring', () => {
  const entry = (proRepertoire as { openings: Array<{ id: string; color: string; pgn: string; variations: Array<{ name: string; provenance?: string }>; provenance?: string }> })
    .openings.find((o) => o.id === OPENING_ID);

  it('opening record exists, black, with a verified spine + 3 provenance-tagged variations', () => {
    expect(entry).toBeTruthy();
    expect(entry!.color).toBe('black');
    expect(entry!.pgn).toBe('e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5');
    expect(entry!.variations).toHaveLength(3);
    for (const v of entry!.variations) expect(v.provenance).toBeTruthy();
    expect(entry!.provenance).toBe('both');
  });

  it('orientation resolves to black through the pro bridge', () => {
    expect(expectedOrientation(OPENING_ID)).toBe('black');
  });

  it('main lesson resolves (renders via LessonPlayer instead of legacy fallback)', () => {
    const main = getLessonScript(OPENING_ID);
    expect(main).toBeTruthy();
    expect(main!.title).toBe('The Stafford Gambit — Eric Rosen Master Class');
    expect(main!.orientation).toBe('black');
  });

  it('every variation tab resolves to its own distinct lesson (no fallback/dup)', () => {
    const titles = new Set<string>([getLessonScript(OPENING_ID)!.title]);
    for (const v of entry!.variations) {
      const l = getVariationLessonScript(OPENING_ID, v.name);
      expect(l, `no lesson for variation "${v.name}"`).toBeTruthy();
      expect(titles.has(l!.title), `duplicate lesson "${l!.title}"`).toBe(false);
      titles.add(l!.title);
    }
    expect(titles.size).toBe(4); // main + 3 variations
  });
});
