// The computed endgame drills (scripts/endgame-drills/generate.ts) stay true:
// legal positions, solutions that replay, and the concept computer that
// justified each drill still fires on its exact board — so a change to a
// computer cannot leave drills behind that it would no longer stand behind.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import drills from './endgame-concept-drills.json';
import { outsidePasserDecoy, kingCourse } from '../services/endgamePawnReads';
import { detectPlanRace } from '../services/planRace';
import { conceptDrillsFor } from '../services/endgameDrillService';

interface D { id: string; concept: string; lessonIds: string[]; fen: string; explanation: string; solution: string[]; result: string }
const all = drills as D[];

describe('computed endgame concept drills', () => {
  it('every drill is legal and its solution replays', () => {
    for (const d of all) {
      const c = new Chess(d.fen);
      expect(d.solution.length, d.id).toBeGreaterThan(0);
      for (const san of d.solution) expect(() => c.move(san), `${d.id} ${san}`).not.toThrow();
    }
  });
  it('the concept computer still fires on each board', () => {
    for (const d of all) {
      const stm = d.fen.split(' ')[1] as 'w' | 'b';
      if (d.concept === 'decoy') expect(outsidePasserDecoy(d.fen, stm), d.id).not.toBeNull();
      if (d.concept === 'course') expect(kingCourse(d.fen, stm), d.id).not.toBeNull();
      if (d.concept === 'race') {
        const r = detectPlanRace(d.fen, stm);
        expect(r && r.kind === 'passer-race' && r.firstQueenCovers, d.id).toBe(true);
      }
    }
  });
  it('the first move of the solution IS the idea (passer runs, king heads for the target, runner pushes)', () => {
    const cheb = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
    for (const d of all) {
      const stm = d.fen.split(' ')[1] as 'w' | 'b';
      const m = new Chess(d.fen).move(d.solution[0]);
      if (d.concept === 'decoy') expect(m.piece === 'p' && m.from === outsidePasserDecoy(d.fen, stm)?.passer, d.id).toBe(true);
      if (d.concept === 'course') {
        const t = kingCourse(d.fen, stm)?.target ?? '';
        expect(m.piece === 'k' && cheb(m.to, t) < cheb(m.from, t), d.id).toBe(true);
      }
      if (d.concept === 'race') {
        const r = detectPlanRace(d.fen, stm);
        expect(m.piece === 'p' && r?.kind === 'passer-race' && m.from === r.yourPawn, d.id).toBe(true);
      }
    }
  });
  it('every drill reaches a lesson, and speaks in our words', () => {
    for (const d of all) {
      expect(d.lessonIds.some((id) => conceptDrillsFor(id).some((p) => p.fen === d.fen)), d.id).toBe(true);
      expect(d.explanation, d.id).not.toMatch(/Naroditsky|Danya|video/i);
    }
  });
});
