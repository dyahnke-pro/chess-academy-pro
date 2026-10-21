import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MISSIONS, missionForPhase, type MissionRecordRow } from './registry';
import { watchersForPhase } from './watchers';
import type { MissionCard } from './missionCard';

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
    const rows = (outcomes: string[], harder = 1): MissionRecordRow[] =>
      outcomes.map((outcome, at) => ({ missionId: 'develop-and-castle', outcome: outcome as MissionRecordRow['outcome'], at, harder }));
    // Retry passes never graduate a mission.
    expect(missionForPhase('opening', rows(Array(10).fill('pass-retry')))?.id).toBe('develop-and-castle');
    // Three first-try passes at the card's own setting step the coach up, they
    // do not graduate it (2026-10-21) …
    expect(missionForPhase('opening', rows(['pass-first-try', 'pass-first-try', 'pass-first-try'], 0))?.id).toBe('develop-and-castle');
    // … three at the harder setting do: the phase has no other card yet, so
    // it is only watched.
    const graduated = rows(['pass-first-try', 'pass-first-try', 'pass-first-try']);
    expect(missionForPhase('opening', graduated)).toBeNull();
    expect(watchersForPhase('opening', graduated).map((c) => c.id)).toEqual(['develop-and-castle']);
    expect(missionForPhase('middlegame', [])?.id).toBe('free-piece-stay-ahead');
    expect(missionForPhase('endgame', [])?.id).toBe('kq-mate');
  });

  it('a reactivated habit is the phase mission again, ahead of anything new', () => {
    const r: MissionRecordRow[] = [
      ...['pass-first-try', 'pass-first-try', 'pass-first-try'].map((o, at) => ({ missionId: 'develop-and-castle' as const, outcome: o as MissionRecordRow['outcome'], at, harder: 1 })),
      { missionId: 'develop-and-castle', outcome: 'missed', at: 10, watcher: true },
      { missionId: 'develop-and-castle', outcome: 'missed', at: 11, watcher: true },
    ];
    expect(missionForPhase('opening', r)?.id).toBe('develop-and-castle');
    expect(watchersForPhase('opening', r)).toEqual([]);
  });

  it('siblings rotate: the least-practised open card of the slot; a card waits for its prerequisite', () => {
    const base = MISSIONS['develop-and-castle'];
    const a: MissionCard = { ...base, siblings: ['free-piece-stay-ahead'] };
    // A same-phase stand-in sibling (ids reused; only the selection is under test).
    const b: MissionCard = { ...MISSIONS['free-piece-stay-ahead'], phase: 'opening', siblings: ['develop-and-castle'] };
    const source = { 'develop-and-castle': a, 'free-piece-stay-ahead': b };
    const played = (id: MissionRecordRow['missionId'], n: number, from: number): MissionRecordRow[] =>
      Array.from({ length: n }, (_, i) => ({ missionId: id, outcome: 'incomplete' as const, at: from + i }));
    expect(missionForPhase('opening', [], source)?.id).toBe('develop-and-castle');
    expect(missionForPhase('opening', played('develop-and-castle', 2, 0), source)?.id).toBe('free-piece-stay-ahead');
    expect(missionForPhase('opening', [...played('develop-and-castle', 2, 0), ...played('free-piece-stay-ahead', 3, 5)], source)?.id).toBe('develop-and-castle');
    // A prerequisite not yet graduated keeps the card closed.
    const gated = { 'develop-and-castle': base, 'free-piece-stay-ahead': { ...b, siblings: undefined, unlock: { after: ['develop-and-castle' as const] } } };
    const dcGraduated = ['pass-first-try', 'pass-first-try', 'pass-first-try'].map((o, at) => ({ missionId: 'develop-and-castle' as const, outcome: o as MissionRecordRow['outcome'], at, harder: 1 }));
    expect(missionForPhase('opening', [], gated)?.id).toBe('develop-and-castle');
    expect(missionForPhase('opening', dcGraduated, gated)?.id).toBe('free-piece-stay-ahead');
  });

  it('each phase has its own card, and only the middlegame card plants a free piece', () => {
    expect(MISSIONS['free-piece-stay-ahead']).toMatchObject({ phase: 'middlegame', closesAtMove: 40 });
    expect(MISSIONS['free-piece-stay-ahead'].coachDials).toMatchObject({ attacksOnPieces: 'on', plannedTrap: 'off', plantFreePiece: 'on' });
    expect(MISSIONS['develop-and-castle'].coachDials.plantFreePiece).toBe('off');
  });
});
