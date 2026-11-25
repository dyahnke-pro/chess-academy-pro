import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { MISCONCEPTION_RULES_REV, POSITIVE_HALF_REV, RECORD_PRICE_REV, THREAT_HALF_REV } from '../data/misconceptionTags';
import { TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { OPENING_KEY_REV, reconcileOpeningKeys } from './openingKeyBackfill';
import { gamesBehindPositiveHalf, gamesBehindRules, gamesBehindThreatHalf } from './misconceptionRulesBackfill';
import { gamesBehindPrice } from './recordReprice';
import { backfillClassifiedTactics } from './tacticClassifierService';
import type { GameRecord, MisconceptionTagRecord } from '../types';

// 2026-11-25 (an App Store user's phone in a /weaknesses crash loop): the
// background readers found "games not yet read" by loading EVERY game, with
// its whole analysis, to compare one stamp — several times a launch. With the
// stamps indexed, a library that is all read must load no game at all, and a
// game imported late and out of date order must still be found.

const ann = [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good' as const, comment: null }];
const STAMPED: Partial<GameRecord> = {
  fullyAnalyzed: true, annotations: ann,
  positiveHalfRev: POSITIVE_HALF_REV, threatHalfRev: THREAT_HALF_REV, recordPriceRev: RECORD_PRICE_REV,
  tacticsClassifiedRev: TACTIC_TYPE_REV, openingKeyRev: OPENING_KEY_REV,
};
const tagRow = (id: string, gameId: string): MisconceptionTagRecord => ({
  id, tag: 'hung-material', source: 'auto-analysis', createdAt: 1, sourceGameId: gameId,
  fen: '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nd4', status: 'open', masteryHits: 0, rulesRev: MISCONCEPTION_RULES_REV,
});

// What crosses the IndexedDB boundary as a whole row, counted below Dexie
// (a `.filter()` deserialises every row it tests, matched or not — a
// reading hook only sees the matches). Distinct keys per table.
const loaded: Record<'games' | 'misconceptionTags', Set<string>> = { games: new Set(), misconceptionTags: new Set() };
db.use({
  stack: 'dbcore',
  name: 'count-loaded-rows',
  create: (down) => ({
    ...down,
    table: (name) => {
      const t = down.table(name);
      if (name !== 'games' && name !== 'misconceptionTags') return t;
      const seen = loaded[name];
      const note = (v: unknown): void => { const id = (v as { id?: unknown } | undefined)?.id; if (typeof id === 'string') seen.add(id); };
      return {
        ...t,
        get: async (req) => { const v: unknown = await t.get(req); note(v); return v; },
        getMany: async (req) => { const vs = await t.getMany(req); vs.forEach(note); return vs; },
        query: async (req) => { const res = await t.query(req); if (req.values) res.result.forEach(note); return res; },
        openCursor: async (req) => {
          const c = await t.openCursor(req);
          if (!c || !req.values) return c;
          return new Proxy(c, { get: (target, prop) => { const v: unknown = Reflect.get(target, prop, target); if (prop === 'value') note(v); return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v; } });
        },
      };
    },
  }),
});
const gameReads = (): number => loaded.games.size;
const tagReads = (): number => loaded.misconceptionTags.size;
const resetReads = (): void => { loaded.games.clear(); loaded.misconceptionTags.clear(); };

describe('the background readers find unread games from keys, not by loading the library', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
    const ids = Array.from({ length: 40 }, (_, i) => `g${i}`);
    await db.games.bulkPut(ids.map((id, i) => buildGameRecord({ id, date: `2026-0${(i % 9) + 1}-01`, ...STAMPED })));
    await db.misconceptionTags.bulkPut(ids.map((id) => tagRow(`t-${id}`, id)));
    // Every game was read on this device (some answer no question).
    await db.meta.put({ key: 'skill-record-games-read', value: JSON.stringify(ids) });
    resetReads();
  });

  it('a library that is all read loads no game and no slip row', async () => {
    expect(await gamesBehindRules()).toEqual([]);
    expect(await gamesBehindPositiveHalf()).toEqual([]);
    expect(await gamesBehindThreatHalf()).toEqual([]);
    expect(await gamesBehindPrice()).toEqual([]);
    expect(await backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE })).toBe(0);
    const keys = await reconcileOpeningKeys(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(keys.recomputed).toBe(0);
    expect(gameReads()).toBe(0);
    expect(tagReads()).toBe(0);
  });

  it('an older game imported late is still found, and only it is loaded', async () => {
    await db.games.put(buildGameRecord({ id: 'late-old', date: '2019-01-01', fullyAnalyzed: true, annotations: ann }));
    await db.misconceptionTags.put({ ...tagRow('t-late', 'late-old'), rulesRev: undefined });
    resetReads();
    expect(await gamesBehindRules()).toEqual(['late-old']);
    expect(tagReads()).toBe(1);
    for (const find of [gamesBehindPositiveHalf, gamesBehindThreatHalf, gamesBehindPrice]) {
      resetReads();
      expect(await find()).toEqual(['late-old']);
      expect(gameReads()).toBe(1);
    }
  });

  it('a game stamped read but with no record on this device is still behind (restored from another device)', async () => {
    await db.meta.put({ key: 'skill-record-games-read', value: JSON.stringify(['g0']) });
    resetReads();
    const behind = await gamesBehindPositiveHalf();
    expect(behind).toHaveLength(39);
    expect(behind).not.toContain('g0');
    expect(gameReads()).toBe(39);
  });
});
