import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MISSIONS, missionForPhase } from './registry';
import type { MissionId } from './missionCard';

describe('mission registry', () => {
  it('a card without check tests does not ship', () => {
    for (const card of Object.values(MISSIONS)) {
      const path = resolve(__dirname, 'checks', `${card.checkModule}.test.ts`);
      expect(existsSync(path), `${card.id}: ${path} is missing`).toBe(true);
      const src = readFileSync(path, 'utf8');
      // Both directions are tested: a fixture that passes and one that misses.
      expect(src, `${card.id}: no PASS fixture`).toMatch(/state: 'pass'/);
      expect(src, `${card.id}: no MISS fixture`).toMatch(/state: 'miss'/);
    }
  });

  it('every card is keyed by its own id and speaks fixed lines', () => {
    for (const [id, card] of Object.entries(MISSIONS)) {
      expect(card.id).toBe(id);
      for (const line of [card.announce, card.missPhrase, card.passLine, ...Object.values(card.missPhraseFor ?? {})]) expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it('a mission with no record is live; the record graduates it, never a rating', () => {
    expect(missionForPhase('opening', [])?.id).toBe('develop-and-castle');
    const passes = (n: number, outcome: 'pass-first-try' | 'pass-retry'): Array<{ missionId: MissionId; outcome: 'pass-first-try' | 'pass-retry' }> =>
      Array.from({ length: n }, () => ({ missionId: 'develop-and-castle' as MissionId, outcome }));
    // Retry passes never graduate a mission.
    expect(missionForPhase('opening', passes(10, 'pass-retry'))?.id).toBe('develop-and-castle');
    // No other opening card yet: the last one stays live.
    expect(missionForPhase('opening', passes(3, 'pass-first-try'))?.id).toBe('develop-and-castle');
    expect(missionForPhase('middlegame', [])?.id).toBe('free-piece-stay-ahead');
    expect(missionForPhase('endgame', [])).toBeNull();
  });

  it('each phase has its own card, and only the middlegame card plants a free piece', () => {
    expect(MISSIONS['free-piece-stay-ahead']).toMatchObject({ phase: 'middlegame', closesAtMove: 40 });
    expect(MISSIONS['free-piece-stay-ahead'].coachDials).toEqual({ attacksOnPieces: 'on', plannedTrap: 'off', plantFreePiece: 'on' });
    expect(MISSIONS['develop-and-castle'].coachDials.plantFreePiece).toBe('off');
  });
});
