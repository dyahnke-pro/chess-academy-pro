import { describe, expect, it, vi } from 'vitest';
vi.mock('./appAuditor', () => ({ logAppAudit: () => Promise.resolve() }));
import { Chess } from 'chess.js';
import { theoryExtras } from './theoryReads';
import { planRepairForTests } from './mistakeLesson';
import { NEW_GAME_MEMORY } from './mistakeLesson';

const fenOf = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const FRENCH_ADVANCE = fenOf('e4 e6 d4 d5 e5');

describe('the plan computer on its surfaces', () => {
  it('Theory: where the book gives no plan, the structure plan the line plays is said', () => {
    const text = theoryExtras({ history: ['e4', 'e6', 'd4', 'd5', 'e5'], fenBefore: FRENCH_ADVANCE, san: 'c5', mover: 'b', movesAt: () => [], slipsAt: () => [], said: new Set(), withPieceJob: false }).join(' ');
    expect(text).toMatch(/base of their pawn chain/);
  });
  it('the mistake lesson: the plan is the recovery, by its pawn, never its move', () => {
    const r = planRepairForTests({
      ew: { cause: { kind: 'positional', motif: null, tag: null, causedByMove: true, detail: null }, failedSquares: [] },
      fenBefore: FRENCH_ADVANCE, playedSan: 'h6', replyLineUci: ['g1f3', 'c7c5', 'c2c3'], bestSan: 'c5',
      seat: 'you', costCp: 120, surface: 'learn', holdOf: () => undefined, memory: NEW_GAME_MEMORY,
    });
    expect(r?.text).toMatch(/base of their pawn chain/);
    expect(r?.text).toMatch(/c-pawn/);
    expect(r?.text).not.toMatch(/\bc5\b/);
  });
});
