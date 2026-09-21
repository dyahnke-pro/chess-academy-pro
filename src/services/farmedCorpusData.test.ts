import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadFarmedCorpora,
  getFarmedCorporaSync,
  primeFarmedCorporaLazily,
  __setFarmedCorporaCache,
} from './farmedCorpusData';
import { secondaryCorpora, secondaryNotesForGap } from './secondaryCorpora';
import type { TeachingsBundle } from './secondaryCorpus';
import registry from '../data/corpora.json';

// 🔒 COUNTS AND ORDER COME FROM THE REGISTRY, never a literal (2026-09-19).
// These were hardcoded `7`s and a hand-typed key list, so the suite broke the
// moment the primary corpus's floating half joined the prewarm — asserting a
// number rather than the contract. What matters is "every declared fetch
// target is loaded, once, smallest first", and that is now expressed as such.
const FETCH_TARGETS: Array<{ key: string; bytes: number }> = [
  ...registry.corpora.filter((c) => c.load === 'fetch').map((c) => ({ key: c.key, bytes: c.bytes ?? 0 })),
  ...registry.corpora
    .filter((c) => typeof (c as { floatingPath?: string }).floatingPath === 'string')
    .map((c) => ({ key: `${c.key}:floating`, bytes: Number.MAX_SAFE_INTEGER })),
];
const TARGET_COUNT = FETCH_TARGETS.length;
const PREWARM_ORDER = [...FETCH_TARGETS].sort((a, b) => a.bytes - b.bytes).map((t) => t.key);

// The farmed corpora moved OUT of the bundle (2026-08-01) because they scale
// with a creator's back-catalogue: Hanging Pawns shipped as a 7.94 MB chunk
// against an 8 MB precache cap, and Saint Louis is 3.7x the videos. They are
// now fetched from public/. What must hold after that move:
//   - the lookup API stays SYNCHRONOUS (its consumers in danyaTeachingService
//     are sync, and rewiring them would ripple through the coach pipeline);
//   - an unprimed cache is SAFE — the gap tier goes quiet, never wrong;
//   - a fetch failure is non-fatal for the same reason (empty > invented).
//
// They are also now LAZY and per-corpus (2026-08-23): fetching all six on boot
// (53 MB with the bake) OOM-crashed the app, so nothing loads until a teaching
// lookup primes the tier, and `getFarmedCorporaSync` is a PURE read. What must
// hold after THAT move:
//   - `getFarmedCorporaSync` triggers no fetch (a stats/debug read is free);
//   - a teaching lookup (`secondaryNotesForGap`) primes the tier;
//   - `primeFarmedCorporaLazily` eventually loads every corpus.

// Flush the sequential lazy prewarm (real promises, one setTimeout(0) yield per
// corpus in the load loop) until all corpora have landed or we give up.
const flushLazy = async (): Promise<void> => {
  for (let i = 0; i < 100 && getFarmedCorporaSync().length < 6; i += 1) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

const bundle = (key: string, opening: string): TeachingsBundle => ({
  generatedAt: '2026-08-01',
  videosDistilled: 1,
  noteCount: 1,
  notes: [{
    id: `${key}1`,
    lineSan: ['e4', 'c6'],
    opening,
    phase: 'opening',
    explains: 'The centre pawn is met by a solid reply.',
    teaches: 'Challenge the centre without blocking the light-squared bishop.',
    plans: 'Follow with the central break.',
    sources: ['yt:abcdef1'],
  }] as unknown as TeachingsBundle['notes'],
});

beforeEach(() => { __setFarmedCorporaCache(undefined); });
afterEach(() => { __setFarmedCorporaCache(undefined); vi.unstubAllGlobals(); });

describe('farmedCorpusData', () => {
  // The farmed CONTRIBUTION only — chessbrah is a static corpus and legitimately
  // answers for openings it covers, so asserting a bare [] would be testing the
  // wrong thing.
  // Opening names NO shipped corpus carries. `gapNotesAcross` walks the static
  // corpora first and stops at maxNotes, so testing with a real opening that
  // chessbrah covers would measure chessbrah, not the farm.
  const GAP_A = 'Zzyzx Attack';
  const GAP_B = 'Qwrrn Attack';

  const farmedNotes = (openingName: string): string[] =>
    secondaryNotesForGap({ openingName, primaryHits: 0, maxNotes: 8 })
      .map((n) => n.id)
      .filter((id) => id.startsWith('hp') || id.startsWith('sl'));

  it('contributes nothing until the prewarm resolves, so the gap tier is quiet not wrong', () => {
    expect(getFarmedCorporaSync()).toEqual([]);
    expect(farmedNotes(GAP_A)).toEqual([]);
  });

  it('getFarmedCorporaSync is a PURE read — it never triggers a fetch', () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => bundle('hp', GAP_A) }));
    vi.stubGlobal('fetch', fetchMock);
    expect(getFarmedCorporaSync()).toEqual([]);
    getFarmedCorporaSync();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('primeFarmedCorporaLazily eventually loads every corpus, off the critical path', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => bundle(url.includes('hangingpawns') ? 'hp' : 'sl', GAP_A),
    }));
    vi.stubGlobal('fetch', fetchMock);

    primeFarmedCorporaLazily();
    // Nothing is loaded synchronously — the whole point is it never blocks boot.
    expect(getFarmedCorporaSync()).toEqual([]);

    await flushLazy();
    expect(getFarmedCorporaSync()).toHaveLength(TARGET_COUNT);
    expect(fetchMock).toHaveBeenCalledTimes(TARGET_COUNT);
  });

  it('primeFarmedCorporaLazily is idempotent — repeated calls do not refetch', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => bundle('hp', GAP_A) }));
    vi.stubGlobal('fetch', fetchMock);
    primeFarmedCorporaLazily();
    primeFarmedCorporaLazily();
    await flushLazy();
    primeFarmedCorporaLazily();
    expect(fetchMock).toHaveBeenCalledTimes(TARGET_COUNT);
  });

  it('a teaching lookup primes the tier (self-heals within a beat)', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => bundle(url.includes('hangingpawns') ? 'hp' : 'sl', GAP_A),
    }));
    vi.stubGlobal('fetch', fetchMock);

    // First lookup: tier not yet loaded, so it is quiet — but it kicks the load.
    expect(farmedNotes(GAP_A)).toEqual([]);
    expect(fetchMock).toHaveBeenCalled();

    await flushLazy();
    expect(farmedNotes(GAP_A).length).toBeGreaterThan(0);
  });

  it('fetches every farmed corpus once and exposes them synchronously', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => bundle(url.includes('hangingpawns') ? 'hp' : 'sl', GAP_A),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await loadFarmedCorpora();
    expect(loaded.map((c) => c.key).sort()).toEqual([...PREWARM_ORDER].sort());
    expect(fetchMock).toHaveBeenCalledTimes(TARGET_COUNT);
    expect(getFarmedCorporaSync()).toHaveLength(TARGET_COUNT);
  });

  it('is idempotent — a second call does not refetch', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => bundle('hp', GAP_A) }));
    vi.stubGlobal('fetch', fetchMock);
    await loadFarmedCorpora();
    await loadFarmedCorpora();
    expect(fetchMock).toHaveBeenCalledTimes(TARGET_COUNT); // every declared target, one round
  });

  it('concurrent callers share one inflight round', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => bundle('hp', GAP_A) }));
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([loadFarmedCorpora(), loadFarmedCorpora(), loadFarmedCorpora()]);
    expect(fetchMock).toHaveBeenCalledTimes(TARGET_COUNT);
  });

  it('survives a missing file / network failure with an empty corpus', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const loaded = await loadFarmedCorpora();
    expect(loaded.every((c) => c.data.notes.length === 0)).toBe(true);
    expect(() => secondaryNotesForGap({ openingName: GAP_A, primaryHits: 0 })).not.toThrow();
  });

  it('survives a non-ok response and a malformed body', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (
      url.includes('hangingpawns')
        ? { ok: false, json: async () => ({}) }
        : { ok: true, json: async () => ({ notes: 'not-an-array' }) }
    )));
    const loaded = await loadFarmedCorpora();
    expect(loaded.every((c) => c.data.notes.length === 0)).toBe(true);
  });

  it('once primed, farmed notes reach the gap tier through the sync API', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () => bundle(url.includes('hangingpawns') ? 'hp' : 'sl', GAP_A),
    })));
    await loadFarmedCorpora();
    expect(farmedNotes(GAP_A).length).toBeGreaterThan(0);
  });

  it('exposes NO secondary corpus until a fetch resolves', () => {
    // 🔴 This asserted the opposite until 2026-09-19 ("keeps chessbrah
    // available even with no farmed corpora loaded"), because chessbrah was a
    // static import. It is fetched now — it was 1.81 MB of boot payload whose
    // 2,766 notes were 99% un-positioned — so there is no static tier left to
    // fall back to. The old claim is DELETED rather than annotated: the gap
    // tier being EMPTY before a load is the contract that makes lazy loading
    // safe ("no gap teaching yet", never wrong teaching).
    expect(secondaryCorpora().map((c) => c.key)).not.toContain('chessbrah');
  });

  it('rebuilds its index when the cache is swapped, never serving a stale one', async () => {
    // 🔒 THE STUB KEY IS DERIVED, NEVER A CREATOR NAME (2026-09-21). These tests
    // exercise the TIER's machinery with synthetic notes, so the key only has to be
    // one the registry knows — `getFarmedCorporaSync` iterates the registry, so an
    // unregistered key is silently dropped and every assertion reads []. They were
    // keyed on 'hangingpawns', which stopped being registered when the seven
    // non-danya creators were removed.
    const stubKey = registry.corpora.find((c) => !c.primary)!.key;
    __setFarmedCorporaCache([{ key: stubKey, data: bundle('hp', GAP_A) }]);
    expect(farmedNotes(GAP_A)).toContain('hp1');

    __setFarmedCorporaCache([{ key: stubKey, data: bundle('hp', GAP_B) }]);
    expect(farmedNotes(GAP_A)).toEqual([]);
    expect(farmedNotes(GAP_B)).toContain('hp1');
  });
});
