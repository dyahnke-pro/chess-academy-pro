/**
 * MEASUREMENT, not a gate (SKILL_DROP=1): the skill meters on a real student's
 * record, from an owner data drop. Prints each meter's level and how many
 * meters a single game moves (the coin rate), so the in-game bars can be judged
 * against real data before anyone sees them.
 */
import { describe, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { metersFrom, skillDifficulty, type SkillRows } from './skillMetersLoader';
import { eventsFromRecord } from './skillMeters';

const PATH = process.env.SKILL_DROP_PATH ?? 'audit-reports/.fixtures/data-drop-david.json';
const RUN = process.env.SKILL_DROP === '1' && existsSync(PATH);

describe.skipIf(!RUN)('skill meters on a real drop', () => {
  it('prints levels and the per-game coin rate', () => {
    const stores = JSON.parse(readFileSync(PATH, 'utf8')).stores as Record<string, Array<Record<string, unknown>>>;
    const rows: SkillRows = {
      held: stores.capabilityEvidence as unknown as SkillRows['held'],
      slips: stores.misconceptionTags as unknown as SkillRows['slips'],
      startRating: Number(stores.profiles?.[0]?.currentRating ?? 1200),
    };
    for (const m of metersFrom(rows)) {
      console.log(`${m.label.padEnd(22)} ${m.rated ? `Lv${m.level} ~${Math.round(m.rating)} rd${Math.round(m.rd)}` : 'not rated'} events=${m.events}`);
    }
    const events = eventsFromRecord(rows.held, rows.slips, skillDifficulty);
    console.log(`events=${events.length} weighted=${events.filter((e) => e.weight > 0).length}`);
    // Coin rate: per game, how many distinct meters moved and how many events fired.
    const byGame = new Map<string, { held: SkillRows['held']; slips: SkillRows['slips'] }>();
    for (const h of rows.held) {
      const g = (h as unknown as { sourceGameId?: string }).sourceGameId ?? '';
      if (!g) continue;
      const b = byGame.get(g) ?? { held: [], slips: [] };
      b.held.push(h);
      byGame.set(g, b);
    }
    for (const s of rows.slips) {
      const g = (s as unknown as { sourceGameId?: string }).sourceGameId ?? '';
      if (!g) continue;
      const b = byGame.get(g) ?? { held: [], slips: [] };
      b.slips.push(s);
      byGame.set(g, b);
    }
    const counts: number[] = [];
    const moved: number[] = [];
    for (const b of byGame.values()) {
      const ev = eventsFromRecord(b.held, b.slips, skillDifficulty).filter((e) => e.weight > 0);
      counts.push(ev.length);
      moved.push(new Set(ev.map((e) => e.meter)).size);
    }
    const med = (a: number[]): number => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
    console.log(`games=${byGame.size} coins/game median=${med(counts)} max=${Math.max(0, ...counts)} meters-moved/game median=${med(moved)}`);
  });
});
