import { describe, it, expect } from 'vitest';
import { KNIGHT_ARMY_LEVELS, BISHOP_ARMY_LEVELS } from './armyLevels';
import {
  initArmyState,
  armyHeroMoves,
  applyArmyMove,
  isArmySolvable,
} from '../services/pieceArmyEngine';

const FILES = 'abcdefgh';
const isSquare = (s: string): boolean => /^[a-h][1-8]$/.test(s);
const colorOf = (s: string): number => (FILES.indexOf(s[0]) + parseInt(s[1], 10)) % 2;

const ALL = [
  ...KNIGHT_ARMY_LEVELS.map((l) => ['knight', l] as const),
  ...BISHOP_ARMY_LEVELS.map((l) => ['bishop', l] as const),
];

describe('army levels', () => {
  for (const [kind, lvl] of ALL) {
    describe(`${kind} pair ${lvl.id} (${lvl.name})`, () => {
      it('has two heroes and ≥3 unique, valid squares', () => {
        expect(lvl.heroes).toHaveLength(2);
        expect(lvl.pawns.length).toBeGreaterThanOrEqual(3);
        const all = [...lvl.heroes.map((h) => h.square), ...lvl.pawns];
        expect(new Set(all).size).toBe(all.length);
        for (const sq of all) expect(isSquare(sq)).toBe(true);
        for (const h of lvl.heroes) expect(h.type).toBe(kind);
      });

      it('bishop pairs cover BOTH colors', () => {
        if (kind !== 'bishop') return;
        expect(colorOf(lvl.heroes[0].square)).not.toBe(colorOf(lvl.heroes[1].square));
      });

      it('no pawn starts already promoting', () => {
        for (const p of lvl.pawns) expect(parseInt(p[1], 10)).toBeLessThan(7);
      });

      it('is winnable (isArmySolvable)', () => {
        expect(isArmySolvable(lvl)).toBe(true);
      });
    });
  }
});

describe('pieceArmyEngine', () => {
  it('capturing the last pawn wins immediately (no advance)', () => {
    // Knight d4, lone pawn c6 — Nd4xc6 wins.
    const state = initArmyState({ id: 1, name: 't', heroes: [{ type: 'knight', square: 'd4' }], pawns: ['c6'] });
    expect(armyHeroMoves(state, 0)).toContain('c6');
    const next = applyArmyMove(state, 0, 'c6');
    expect(next.status).toBe('won');
    expect(next.pawns).toHaveLength(0);
  });

  it('a pawn reaching the 8th rank loses', () => {
    // Pawn on a7 promotes next advance; knight far away can't stop it.
    const state = initArmyState({ id: 1, name: 't', heroes: [{ type: 'knight', square: 'h1' }], pawns: ['a7', 'd2'] });
    const next = applyArmyMove(state, 0, 'g3'); // any non-capturing move
    expect(next.status).toBe('lost');
  });

  it('a hero blocks a pawn directly in front of it', () => {
    // Knight on a5 sits in front of pawn a4 → the pawn can't advance.
    const state = initArmyState({ id: 1, name: 't', heroes: [{ type: 'knight', square: 'a5' }, { type: 'knight', square: 'h8' }], pawns: ['a4', 'e2'] });
    const next = applyArmyMove(state, 1, 'g6'); // move the OTHER knight
    expect(next.pawns).toContain('a4'); // a4 stayed (blocked by a5 knight)
  });
});
