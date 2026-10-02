import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

const captured: { name: string; props?: Record<string, unknown> }[] = [];
vi.mock('./analytics', () => ({ captureEvent: (name: string, props?: Record<string, unknown>) => captured.push({ name, props }) }));
const audits: { kind: string }[] = [];
vi.mock('./appAuditor', () => ({ logAppAudit: async (e: { kind: string }) => { audits.push(e); } }));

import { gameTime, reportTeachingEffects } from './teachingEffectService';

const ann = [{ moveNumber: 1, color: 'white', san: 'e4' } as unknown as MoveAnnotation];

describe('teachingEffectService', () => {
  beforeEach(async () => {
    captured.length = 0; audits.length = 0;
    await db.delete(); await db.open();
  });

  it('reads PGN dot dates and ISO dates', () => {
    expect(gameTime('2026.10.01')).toBe(Date.parse('2026-10-01'));
    expect(gameTime('2026-10-01T10:00:00Z')).toBe(Date.parse('2026-10-01T10:00:00Z'));
    expect(gameTime('????.??.??')).toBeNull();
  });

  it('publishes a direction once a taught slip stops recurring', async () => {
    const day = (d: number): string => `2026.09.${String(d).padStart(2, '0')}`;
    for (let d = 1; d <= 8; d++) {
      await db.games.put(buildGameRecord({ id: `g${d}`, date: day(d), annotations: ann }));
    }
    let id = 1;
    const tag = (gameId: string, source: string): Promise<unknown> => db.misconceptionTags.put({
      id: `m${id++}`, tag: 'hung-piece', source, createdAt: 0, sourceGameId: gameId,
    } as never);
    for (const g of ['g1', 'g2', 'g3']) await tag(g, 'auto-analysis');
    await tag('g4', 'game-review');
    const effects = await reportTeachingEffects('review-opened');
    expect(effects).toHaveLength(1);
    expect(effects[0].verdict).toBe('declining');
    expect(audits.some((a) => a.kind === 'teaching-effect')).toBe(true);
    expect(captured).toEqual([expect.objectContaining({ name: 'teaching_effect', props: expect.objectContaining({ kind: 'hung-piece', verdict: 'declining' }) })]);
  });
});
