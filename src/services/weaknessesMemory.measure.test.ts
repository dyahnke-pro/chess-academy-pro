/**
 * HEAP ON /weaknesses WITH A REAL LIBRARY (2026-11-25: a new App Store user's
 * web view reloaded on /weaknesses ~1 s after opening it). Loads David's data
 * drop into fake-indexeddb, runs every read the page starts on open AT ONCE
 * (the four tabs + the heat map panel's reads), and samples the heap's peak.
 *   WEAK_MEM=1 NODE_OPTIONS=--expose-gc npx vitest run src/services/weaknessesMemory.measure.test.ts
 * WEAK_MEM_OLD=1 runs the reads the panel made before (a whole-library
 * games.toArray, the spine reading misconceptionTags twice).
 */
import { describe, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { db } from '../db/schema';

const PATH = process.env.WEAK_MEM_DROP ?? '/home/user/chess-academy-pro/audit-reports/.fixtures/data-drop-david.json';
const MB = (n: number): string => `${(n / 1048576).toFixed(1)} MB`;

async function peakDuring(label: string, fn: () => Promise<unknown>): Promise<void> {
  const g = (globalThis as { gc?: () => void }).gc;
  g?.(); g?.();
  const base = process.memoryUsage().heapUsed;
  let peak = base;
  const t = setInterval(() => { peak = Math.max(peak, process.memoryUsage().heapUsed); }, 1);
  const t0 = Date.now();
  const held = await fn();
  peak = Math.max(peak, process.memoryUsage().heapUsed);
  clearInterval(t);
  console.log(`[weak-mem] ${label}: peak +${MB(peak - base)} in ${Date.now() - t0} ms`);
  void held;
}

describe.skipIf(!process.env.WEAK_MEM || !existsSync(PATH))('weaknesses page heap', () => {
  it('measures the reads the page starts on open', async () => {
    const stores = (JSON.parse(readFileSync(PATH, 'utf8')) as { stores: Record<string, unknown[]> }).stores;
    await db.delete(); await db.open();
    for (const name of ['games', 'misconceptionTags', 'mistakePuzzles', 'capabilityEvidence', 'profiles']) {
      await (db as unknown as Record<string, { bulkPut: (r: unknown[]) => Promise<unknown> }>)[name].bulkPut(stores[name] ?? []);
    }
    const ins = await import('./gameInsightsService');
    const { gameDatesById } = await import('./gameDates');
    const mis = await import('./misconceptionService');
    const old = !!process.env.WEAK_MEM_OLD;
    // The heat map panel's own reads (the spine's are measured inside it).
    const panel = (): Promise<unknown> => Promise.all([
      db.capabilityEvidence.toArray(),
      db.misconceptionTags.toArray(),
      old ? db.games.toArray() : gameDatesById(),
    ]);
    const spineMis = (): Promise<unknown> => old
      ? Promise.all([mis.getMisconceptionProfile({ countedOnly: true }), db.misconceptionTags.toArray()])
      : db.misconceptionTags.toArray().then((r) => [mis.aggregateMisconceptions(r, { countedOnly: true }), r]);
    await peakDuring(`${old ? 'OLD' : 'NEW'} heat map game dates`, () => (old ? db.games.toArray() : gameDatesById()));
    await peakDuring(`${old ? 'OLD' : 'NEW'} spine misconception reads`, spineMis);
    if (process.env.WEAK_MEM_RECOMPUTE) {
      const { computeWeaknessProfile } = await import('./weaknessAnalyzer');
      const { getUnifiedWeaknessProfile } = await import('./weaknessSpine');
      const { useAppStore } = await import('../stores/appStore');
      const profile = (await db.profiles.toArray())[0];
      useAppStore.getState().setActiveProfile(profile);
      await peakDuring('end-of-package recompute (computeWeaknessProfile)', () => computeWeaknessProfile(profile));
      await peakDuring('unified weakness spine (every row)', () => getUnifiedWeaknessProfile());
      const pkg = async (n: number): Promise<unknown> => db.games.limit(n).toArray();
      await peakDuring('a 10-game package held', () => pkg(10));
      await peakDuring('a 5-game package held', () => pkg(5));
    }
    await peakDuring(`${old ? 'OLD' : 'NEW'} page open (4 tabs + panel + spine games)`, () => Promise.all([
      ins.getOverviewInsights(), ins.getOpeningInsights(), ins.getMistakeInsights(), ins.getTacticInsights(),
      panel(), spineMis(), db.games.toArray(),
    ]));
  }, 600_000);
});
