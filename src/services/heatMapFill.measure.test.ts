import { it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { heatMap } from './heatMap';
import { buildSkillTimelines, parseGameDate } from './skillTimeline';
import { isUseEvidence } from './capabilityEvidence';

// MEASUREMENT on David's own record (HEATMAP_FILL=1): the heat map before and
// after the board pass, with the engine silent (as on his phone).
vi.mock('./refutedAlternative', () => {
  const stall = (): Promise<never> => new Promise(() => undefined);
  return { SINGLETON_SCORER: new Proxy({}, { get: () => stall }), BACKGROUND_SCORER: new Proxy({}, { get: () => stall }) };
});
const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const run = process.env.HEATMAP_FILL === '1' && existsSync(DROP);

async function snapshot(label: string): Promise<void> {
  const [ev, slips, games] = await Promise.all([db.capabilityEvidence.toArray(), db.misconceptionTags.toArray(), db.games.toArray()]);
  const now = Date.parse('2026-10-20T19:38:29Z');
  const tiles = heatMap(ev, slips, { now });
  const dates = new Map<string, number>();
  for (const g of games) { const d = parseGameDate(g.date); if (d !== null) dates.set(g.id, d); }
  const lines = buildSkillTimelines(tiles.map((t) => t.tag), slips, ev.filter(isUseEvidence), dates, now);
  const cells = lines.reduce((n, l) => n + l.weeks.filter((c) => c.score !== null).length, 0);
  const grey = tiles.filter((t) => t.state === 'grey').map((t) => `${t.tag}(${t.hold.posed})`);
  console.log(`${label}: rows ${ev.length} · red ${tiles.filter((t) => t.state === 'red').length} · green ${tiles.filter((t) => t.state === 'green').length} · grey ${grey.length} · filled week cells ${cells}/${lines.length * 26}\n  grey: ${grey.join(', ')}`);
}

it.runIf(run)('fills the heat map from the board pass alone', async () => {
  const drop = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: Record<string, unknown[]> };
  await db.delete(); await db.open();
  const s = drop.stores as Record<string, never[]>;
  await db.games.bulkPut(s.games);
  await db.misconceptionTags.bulkPut(s.misconceptionTags);
  await db.capabilityEvidence.bulkPut(s.capabilityEvidence);
  await db.mistakePuzzles.bulkPut(s.mistakePuzzles);
  await db.meta.bulkPut(s.meta);
  const profile = (s.profiles as unknown[])[0] as never;
  await db.profiles.put(profile);
  useAppStore.getState().setActiveProfile(profile);
  await snapshot('BEFORE');
  const { reconcileMisconceptionRules, onRebuildProgress } = await import('./misconceptionRulesBackfill');
  const t0 = Date.now();
  // A snapshot once the newest 80 games are read — about the 26 weeks the
  // heat map shows — and progress every 20 games with the elapsed time.
  const done = new Promise<void>((resolve) => {
    const off = onRebuildProgress((p) => {
      if (p === null) { off(); resolve(); return; }
      if (p.done % 20 === 0) console.log(`  board pass ${p.done}/${p.total} · ${Math.round((Date.now() - t0) / 1000)}s`);
      if (p.done === 80) void snapshot('AFTER 80 NEWEST');
    });
  });
  void reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
  await done;
  console.log(`board pass took ${Math.round((Date.now() - t0) / 1000)}s`);
  await snapshot('AFTER ');
}, 1_800_000);
