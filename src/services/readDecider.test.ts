import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideRead, type ReadFact } from './readDecider';

// Every fact the app's computers made on Korchnoi's board from Danya's "How to
// avoid blunders" (a3 to play), with what the old read said (`keptToday`: the
// composer joined every kept fact, a dozen structure plans among them). Its
// facts carry the squares their producers named (backfilled once from the
// words when the decider stopped reading squares off prose, 2026-11-19).
interface FixtureFact extends ReadFact { keptToday: boolean }
const board = JSON.parse(readFileSync('src/test/fixtures/read-korchnoi-board.json', 'utf8')) as { facts: FixtureFact[] };

describe('the read decider: his order, one fact a step', () => {
  it('Korchnoi\'s board: the verdict, then a3 and why, then Nxb5 refuted — nothing else', () => {
    const said = decideRead(board.facts).map((f) => f.text);
    expect(said).toHaveLength(3);
    expect(said[0]).toMatch(/pawn down.*bishop pair/);
    expect(said[1]).toMatch(/^a3 first.*covers b4/);
    expect(said[2]).toMatch(/^Nxb5 .*Qe8/);
    // The old read said a minority attack and a dozen structure plans.
    expect(board.facts.filter((f) => f.keptToday).some((f) => /minority attack/.test(f.text))).toBe(true);
    expect(said.some((t) => /minority attack|plan from here/.test(t))).toBe(false);
  });

  it('a step with nothing to say stays empty; a fact is said once', () => {
    expect(decideRead([{ from: 'position', kind: 'structure-plan', text: 'x', squares: [] }])).toEqual([]);
    const f: ReadFact = { from: 'tempting', kind: 'refuted', text: 'y', squares: [] };
    expect(decideRead([f, { ...f }])).toHaveLength(1);
  });

  it('one idea once: a story line whose squares were all named already is not said', () => {
    const facts: ReadFact[] = [
      { from: 'position', kind: 'standing', text: 'Roughly balanced — your isolated pawn on c4 is attacked twice.', squares: ['c4'] },
      { from: 'position', kind: 'their-target', text: 'The target is your pawn on c4: it is isolated.', squares: ['c4'] },
      { from: 'bestMove', kind: 'move-job', text: 'You play Rf4 — it adds a second guard to your pawn on c4.', squares: ['f4', 'c4'] },
    ];
    expect(decideRead(facts).map((f) => f.kind)).toEqual(['standing', 'move-job']);
  });

  it('the second front follows the story\'s own target, never another pawn', () => {
    const base: ReadFact[] = [
      { from: 'position', kind: 'priority', text: 'Their pawn on d5 is isolated. Aim at it.', squares: ['d5'] },
      { from: 'position', kind: 'switch-wing', text: 'Their pawn on h7 holds, but it ties down a piece. Open a second front: the c5 break.', squares: ['h7', 'c5'] },
    ];
    expect(decideRead(base).map((f) => f.kind)).toEqual(['priority']);
    const onTarget: ReadFact = { from: 'position', kind: 'switch-wing', text: 'Their pawn on d5 holds, but it ties down two pieces. Open a second front: the g4 break.', squares: ['d5', 'g4'] };
    expect(decideRead([base[0], onTarget]).map((f) => f.kind)).toEqual(['priority', 'switch-wing']);
  });

  it('the best move\'s job that hits the story\'s target outranks its other jobs (Karpov–Spassky, Rd3)', () => {
    const facts: ReadFact[] = [
      { from: 'position', kind: 'priority', text: 'Their pawn on d5 is isolated. Aim at it: Rd3 does.', squares: ['d5'] },
      { from: 'bestMove', kind: 'move-job', text: 'You play Rd3 — it adds a second guard to your bishop on c3.', squares: ['d3', 'c3'] },
      { from: 'bestMove', kind: 'board-teacher', text: 'You play Rd3, which presses down the half-open d-file at their pawn on d5.', squares: ['d3', 'd5'] },
    ];
    expect(decideRead(facts).map((f) => f.kind)).toEqual(['priority', 'board-teacher']);
  });

  it('reads the squares its producer named, never the words (G4.5.1)', () => {
    // The words name c3 only in passing; the fact is about d5.
    const facts: ReadFact[] = [
      { from: 'position', kind: 'priority', text: 'Their isolated pawn is the target.', squares: ['d5'] },
      { from: 'bestMove', kind: 'move-job', text: 'You play Rd3 — it adds a guard to your bishop on c3.', squares: ['d3', 'c3'] },
      { from: 'bestMove', kind: 'board-teacher', text: 'You play Rd3, pressing down the half-open file.', squares: ['d3', 'd5'] },
    ];
    expect(decideRead(facts).map((f) => f.kind)).toEqual(['priority', 'board-teacher']);
  });
});

