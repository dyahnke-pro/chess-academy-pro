import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  rankUpNext, currentPick, WEAKNESS_BITE, PICK_KINDS, PICK_FINISH_LINE, THINKING_LESSON_LIVE,
  THINKING_LESSON_PATH, type UpNextInput, type UpNextPick,
} from './upNextPicker';
import type { RepCandidate } from './trainingPlanSelector';

const weak: RepCandidate = { kind: 'weakness', key: 'weakness:hung-material:Hung a piece', label: 'Hung a piece or pawn', subtitle: '', tag: 'hung-material', puzzleThemes: ['hangingPiece'] };
const srs: RepCandidate = { kind: 'srs', key: 'srs:italian-game', label: 'Italian Game', subtitle: '', openingId: 'italian-game' };
const base: UpNextInput = { reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: false, startSteps: [], thinking: null, endgameDue: null, openingHoles: [] };

describe('upNextPicker', () => {
  it('a first visit leads with a 60-second Deep Run', () => {
    const r = rankUpNext({ ...base, coldStart: true });
    expect(r[0].kind).toBe('deep-run');
    expect(r[0].path).toBe('/tactics/deep-run');
  });

  it('the latest game slip leads, then the weakness, then the opening', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], latestGameSlip: { puzzleId: 'p1', opponent: 'Rainbow', cpLoss: 300 } });
    expect(r.map((p) => p.kind).slice(0, 3)).toEqual(['game-slip', 'weakness', 'opening']);
    expect(r[0].reason).toContain('Rainbow');
  });

  it('every bite is short: a weakness asks for TWO puzzles, not a session', () => {
    const w = rankUpNext({ ...base, reps: [weak] }).find((p) => p.kind === 'weakness');
    expect(w?.state?.repCap).toBe(WEAKNESS_BITE);
    expect(w?.state?.repKey).toBe(w?.key);
  });

  it('the free opening only appears when a slot is open', () => {
    expect(rankUpNext(base).some((p) => p.kind === 'free-opening')).toBe(false);
    expect(rankUpNext({ ...base, freeOpeningOpen: true }).some((p) => p.kind === 'free-opening')).toBe(true);
  });

  it('there is always something to do, and Up next skips what is done', () => {
    const r = rankUpNext({ ...base, reps: [weak] });
    expect(r.length).toBeGreaterThan(0);
    const first = currentPick(r, new Set());
    const second = currentPick(r, new Set([first!.key]));
    expect(second?.key).not.toBe(first?.key);
  });

  it('keys are unique', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], coldStart: true, freeOpeningOpen: true });
    expect(new Set(r.map((p) => p.key)).size).toBe(r.length);
  });
  it('every puzzle bite opens straight onto a puzzle — a start screen is a bite with no finish line', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], coldStart: true, freeOpeningOpen: true });
    const puzzleBites = r.filter((p) => p.path === '/tactics/adaptive' || p.path === '/tactics/long');
    expect(puzzleBites.length).toBeGreaterThanOrEqual(2);
    for (const p of puzzleBites) expect((p.state as { autoStart?: boolean } | undefined)?.autoStart).toBe(true);
  });
});

describe('the thinking lesson bite (learn-how-to-think)', () => {
  const withoutThinking = (r: UpNextPick[]): string[] => r.filter((p) => p.kind !== 'thinking').map((p) => p.key);
  const inputs: UpNextInput[] = [
    base,
    { ...base, coldStart: true },
    { ...base, reps: [weak, srs], latestGameSlip: { puzzleId: 'p1', opponent: 'R', cpLoss: 300 }, grownPuzzle: { puzzleId: 'g', length: 3 }, freeOpeningOpen: true },
  ];

  it('adding the lesson never reorders anything else', () => {
    for (const i of inputs) {
      const before = rankUpNext(i).map((p) => p.key);
      expect(withoutThinking(rankUpNext({ ...i, thinking: { state: 'red', skill: 'Hung material', step: 'Am I safe?' } }))).toEqual(before);
      expect(withoutThinking(rankUpNext({ ...i, thinking: { state: 'grey', skill: 'Hung material', step: 'Am I safe?' } }))).toEqual(before);
    }
  });

  it('RED lands right after the slip, ahead of the puzzle weakness', () => {
    const r = rankUpNext({ ...base, reps: [weak], latestGameSlip: { puzzleId: 'p1', opponent: null, cpLoss: 300 }, thinking: { state: 'red', skill: 'Hung material', step: 'Am I safe?' } });
    expect(r.map((p) => p.kind).slice(0, 3)).toEqual(['game-slip', 'thinking', 'weakness']);
    expect(r[1].reason).toContain('Hung material');
    expect(r[1].path).toBe(THINKING_LESSON_PATH);
    expect(r[1].hub).toBe('coach');
  });

  it('GREY (a fresh install) is taught: on a first visit it is in the ring of three', () => {
    const r = rankUpNext({ ...base, coldStart: true, thinking: { state: 'grey', skill: 'x', step: 'x' } });
    expect(r.map((p) => p.kind).slice(0, 3)).toEqual(['deep-run', 'thinking', 'warm-up']);
  });

  it('a known-not-used gap leads the card\'s reason, and the pick is unchanged otherwise', () => {
    const gap = 'In lessons you find their loose pieces; in your games you still walk past them.';
    const r = rankUpNext({ ...base, thinking: { state: 'grey', skill: 'x', step: 'Am I safe?', gap } });
    const t = r.find((p) => p.kind === 'thinking')!;
    expect(t.reason.startsWith(gap)).toBe(true);
    expect(t.path).toBe(THINKING_LESSON_PATH);
    const plain = rankUpNext({ ...base, thinking: { state: 'grey', skill: 'x', step: 'Am I safe?' } }).find((p) => p.kind === 'thinking')!;
    expect(t.reason.endsWith(plain.reason)).toBe(true);
  });

  it('GREEN (proven) is not offered', () => {
    expect(rankUpNext({ ...base, thinking: { state: 'green', skill: 'x', step: 'x' } }).some((p) => p.kind === 'thinking')).toBe(false);
  });

  it('every kind with a finish line really finishes there; a live kind must have one', () => {
    for (const kind of PICK_KINDS) {
      const f = PICK_FINISH_LINE[kind];
      if (!f) continue;
      const src = readFileSync(f.file, 'utf8');
      if (f.by === 'kind') expect(src, `${kind} in ${f.file}`).toMatch(new RegExp(`finishBite\\([^)]*'${kind}'`));
      else expect(src, `${kind} in ${f.file}`).toMatch(/finishBiteByKey\('up:start:/);
    }
    // The thinking bite may go live only once its lesson finishes it.
    if (THINKING_LESSON_LIVE) expect(PICK_FINISH_LINE.thinking).not.toBeNull();
  });
});

describe('the card is the top three by ONE importance (David 2026-10-17)', () => {
  const eg = (missed: boolean, overdueDays = 0) => ({ lessonId: 'kp-opposition', name: 'Opposition', tab: 'pawn-endings' as const, dueCount: 2, missed, overdueDays });

  it('every pick carries its importance, and the list is sorted by it', () => {
    const r = rankUpNext({ ...base, reps: [weak, srs], endgameDue: eg(false) });
    const imps = r.map((p) => p.importance ?? -1);
    expect(imps.every((n) => n >= 0)).toBe(true);
    expect([...imps].sort((a, b) => b - a)).toEqual(imps);
  });

  it('an endgame you got wrong outranks a puzzle weakness; one you are spacing out does not', () => {
    const missed = rankUpNext({ ...base, reps: [weak], endgameDue: eg(true) });
    expect(missed.findIndex((p) => p.kind === 'endgame')).toBeLessThan(missed.findIndex((p) => p.kind === 'weakness'));
    const spaced = rankUpNext({ ...base, reps: [weak], endgameDue: eg(false) });
    expect(spaced.findIndex((p) => p.kind === 'weakness')).toBeLessThan(spaced.findIndex((p) => p.kind === 'endgame'));
  });

  it('a line due for review outranks a new one, and the slip still leads', () => {
    const r = rankUpNext({ ...base, reps: [srs, weak], latestGameSlip: { puzzleId: 'p1', opponent: 'X', cpLoss: 200 }, endgameDue: eg(false) });
    expect(r[0].kind).toBe('game-slip');
    expect(r.slice(0, 3).map((p) => p.kind)).toContain('opening');
  });
});

describe('an opening you keep leaving the book in (David 2026-10-18: "weighted by reoccurring opening mistakes")', () => {
  const hole = (openingId: string, games: number) => ({ openingId, name: 'Caro-Kann Defense', games });

  it('becomes its own quick bite, named by the games it cost', () => {
    const p = rankUpNext({ ...base, openingHoles: [hole('b10-caro', 3)] }).find((x) => x.key === 'up:hole:b10-caro');
    expect(p?.bite).toBe('one line');
    expect(p?.reason).toBe('You left the book early in 3 of your Caro-Kann Defense games, and it cost you each time. Play the main line once.');
  });

  it('the more games it cost, the higher it ranks — past a puzzle weakness at 4 games', () => {
    const r = (games: number): UpNextPick[] => rankUpNext({ ...base, reps: [weak], openingHoles: [hole('b10-caro', games)] });
    const at = (rs: UpNextPick[], k: string): number => rs.findIndex((p) => p.key === k);
    expect(at(r(2), 'up:hole:b10-caro')).toBeGreaterThan(at(r(2), 'up:weakness:hung-material:Hung a piece'));
    expect(at(r(4), 'up:hole:b10-caro')).toBeLessThan(at(r(4), 'up:weakness:hung-material:Hung a piece'));
  });

  it('a due line in the same opening carries the hole instead of a second bite', () => {
    const r = rankUpNext({ ...base, reps: [srs], openingHoles: [{ openingId: 'italian-game', name: 'Italian Game', games: 5 }] });
    expect(r.filter((p) => p.openingId === 'italian-game')).toHaveLength(1);
    const p = r.find((x) => x.openingId === 'italian-game');
    expect(p?.reason).toContain('5 of your Italian Game games');
    expect(p?.importance).toBe(74);
  });
});
