import { describe, it, expect } from 'vitest';
import {
  readCriticalMoment, criticalMomentSpeaks, criticalMomentStatement,
  criticalMomentAsk, criticalMomentReveal, criticalMomentHeld, stakeText,
  type CriticalFanLine,
} from './criticalMoment';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** A fan at ranks 1..n with the given WHITE-POV scores. */
function fan(...cps: number[]): CriticalFanLine[] {
  return cps.map((evaluation, i) => ({ rank: i + 1, evaluation, mate: null, bound: null, moves: ['e2e4'] }));
}

describe('criticalMoment — the count IS the trigger', () => {
  it('counts the moves within the band-free tolerance of the best', () => {
    // the band-free tolerance = MISTAKE_CP (100cp).
    const r = readCriticalMoment({ topLines: fan(300, 120, 10), moverColor: 'w' });
    expect(r?.toleranceCp).toBe(100);
    expect(r?.count).toBe(1);        // only 300 is within 100 of 300
    expect(r?.gapCp).toBe(180);
    expect(r?.resolved).toBe(true);
  });

  it('two moves within tolerance is a forgiving fork, and it SPEAKS', () => {
    const r = readCriticalMoment({ topLines: fan(50, -20, -400), moverColor: 'w' });
    expect(r?.count).toBe(2);
    expect(criticalMomentSpeaks(r)).toBe(true);
  });

  it('three within tolerance means nothing hinges — SILENT, and honestly unresolved', () => {
    const r = readCriticalMoment({ topLines: fan(30, 10, -20), moverColor: 'w' });
    expect(r?.count).toBe(3);
    expect(r?.resolved).toBe(false);
    expect(r?.unresolvedReason).toBe('count-fills-fan');
    expect(criticalMomentSpeaks(r)).toBe(false);
    expect(criticalMomentStatement(r, 7)).toBeNull();
  });

  it('NEGATIVE CONTROL — a 2-wide fan whose both lines hold never claims "two"', () => {
    // The dangerous case: the engine was only ASKED for two lines, so "2" here
    // means "at least 2" and a third holding move may exist unseen.
    const r = readCriticalMoment({ topLines: fan(0, -10), moverColor: 'w' });
    expect(r?.count).toBe(2);
    expect(r?.resolved).toBe(false);
    expect(criticalMomentSpeaks(r)).toBe(false);
  });

  it('NEGATIVE CONTROL — a BOUNDED score proves nothing and never speaks', () => {
    const lines = fan(300, 120, 10);
    lines[1] = { ...lines[1], bound: 'upper' };
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.unresolvedReason).toBe('bounded-score');
    expect(criticalMomentSpeaks(r)).toBe(false);
  });

  it('NEGATIVE CONTROL — an empty fan reads null, never a false only-move', () => {
    expect(readCriticalMoment({ topLines: [], moverColor: 'w' })).toBeNull();
    expect(readCriticalMoment({ topLines: undefined, moverColor: 'w' })).toBeNull();
  });

  it('is BAND-FREE (B6) — the same fan is the same read for every student', () => {
    // This used to assert the opposite: "a fork for a beginner (tol 200) and
    // settled for an expert (tol 50)" — the rating deciding how many moves
    // "hold", and so how often the coach said "only one move holds". The
    // tolerance is the one mistake bar now, and the input takes no rating.
    const lines = fan(0, -150, -900);
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.toleranceCp).toBe(100);
    expect(r?.count).toBe(1);
  });

  it('reads the fan from the MOVER’s seat, not White’s', () => {
    // White-POV: -300 is best for BLACK. Black to move → mover-POV +300.
    const r = readCriticalMoment({ topLines: fan(-300, -120, -10), moverColor: 'b' });
    expect(r?.count).toBe(1);
    expect(r?.bestCp).toBe(300);
    expect(r?.stake).toBe('win');
  });
});

describe('criticalMoment — the stake is computed, never templated', () => {
  const at = (cp: number): string | null =>
    readCriticalMoment({ topLines: fan(cp, cp - 400, cp - 900), moverColor: 'w' })?.stake ?? null;

  it('bands off the best line, mover-POV', () => {
    expect(at(600)).toBe('win');
    expect(at(150)).toBe('on-top');
    expect(at(70)).toBe('edge');
    expect(at(0)).toBe('level');
    expect(at(-200)).toBe('in-it');
    expect(at(-500)).toBe('damage');
  });

  it('"keeps equality" is FALSE when they are winning and when they are lost', () => {
    expect(criticalMomentStatement(
      readCriticalMoment({ topLines: fan(600, 100, -200), moverColor: 'w' }), 4,
    )).toContain('keeps the win');
    expect(criticalMomentStatement(
      readCriticalMoment({ topLines: fan(-500, -900, -1400), moverColor: 'w' }), 4,
    )).toContain('limits the damage');
  });

  it('mate is its own answer, never a centipawn band', () => {
    const lines: CriticalFanLine[] = [
      { rank: 1, evaluation: 0, mate: 3, bound: null, moves: ['e2e4'] },
      { rank: 2, evaluation: 200, mate: null, bound: null, moves: ['d2d4'] },
      { rank: 3, evaluation: 10, mate: null, bound: null, moves: ['g1f3'] },
    ];
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.count).toBe(1);
    expect(r?.stake).toBe('mate');
    expect(criticalMomentStatement(r, 2)).toContain('keeps the forced mate');
  });

  it('several mating moves = nothing hinges (flat mate scoring), so it stays silent', () => {
    const lines: CriticalFanLine[] = [1, 2, 4].map((mate, i) => ({ rank: i + 1, evaluation: 0, mate, bound: null, moves: ['e2e4'] }));
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.count).toBe(3);
    expect(criticalMomentSpeaks(r)).toBe(false);
  });

  it('being MATED in every line has no stake to keep — SILENT, never a stakeless claim', () => {
    const lines: CriticalFanLine[] = [-2, -1, -4].map((mate, i) => ({ rank: i + 1, evaluation: 0, mate, bound: null, moves: ['e1e2'] }));
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.stake).toBeNull();
    expect(criticalMomentSpeaks(r)).toBe(false);
    expect(criticalMomentStatement(r, 3)).toBeNull();
    expect(criticalMomentAsk(r, 3)).toBeNull();
  });

  it('a line that beats a mate-against is the BEST line, whatever rank it carries', () => {
    // Defensive: the count must not depend on the producer's ordering being
    // consistent with this module's flat mate scoring.
    const lines: CriticalFanLine[] = [
      { rank: 1, evaluation: 0, mate: -2, bound: null, moves: ['e1e2'] },
      { rank: 2, evaluation: 0, mate: -1, bound: null, moves: ['e1d1'] },
      { rank: 3, evaluation: -900, mate: null, bound: null, moves: ['d2d4'] },
    ];
    const r = readCriticalMoment({ topLines: lines, moverColor: 'w' });
    expect(r?.bestCp).toBe(-900);
    expect(r?.count).toBe(1);
    expect(r?.stake).toBe('damage');
  });
});

describe('criticalMoment — two registers, one claim', () => {
  const one = readCriticalMoment({ topLines: fan(0, -300, -900), moverColor: 'w', fen: START });
  const two = readCriticalMoment({ topLines: fan(0, -40, -900), moverColor: 'w', fen: START });

  it('LEARN states, and never asks', () => {
    for (let ply = 1; ply <= 12; ply += 1) {
      const t = criticalMomentStatement(one, ply);
      expect(t).toBeTruthy();
      expect(t).not.toContain('?');
    }
  });

  it('REVIEW asks, and never leaks the move in the question', () => {
    for (let ply = 1; ply <= 12; ply += 1) {
      const q = criticalMomentAsk(one, ply);
      expect(q).toContain('?');
      expect(q).not.toContain('e4');
    }
  });

  it('agrees grammatically with the count it just computed', () => {
    expect(criticalMomentStatement(one, 0)).toContain('keeps you level');
    expect(criticalMomentStatement(two, 0)).toContain('keep you level');
    expect(criticalMomentStatement(two, 0)).not.toMatch(/two moves keeps/);
    expect(criticalMomentAsk(two, 0)).not.toMatch(/two moves keeps/);
  });

  it('rotates the STEM on the ply and never the CLAIM — and never Math.random', () => {
    const texts = new Set<string>();
    for (let ply = 0; ply < 8; ply += 1) texts.add(criticalMomentStatement(one, ply) as string);
    expect(texts.size).toBeGreaterThan(1);
    for (const t of texts) expect(t).toContain('keeps you level');
    // Deterministic: the same ply always produces the same stem.
    expect(criticalMomentStatement(one, 5)).toBe(criticalMomentStatement(one, 5));
    expect(criticalMomentStatement(one, -5)).toBe(criticalMomentStatement(one, 5));
  });

  it('the REVEAL names the move — the first time it is stated', () => {
    expect(one?.holdingSans).toEqual(['e4']);
    // THE COUNT LEADS, and review is retrospective — past tense, not "keeps".
    expect(criticalMomentReveal(one)).toBe('Only one move kept you level here, and it was e4.');
    expect(criticalMomentReveal(two)).toBe('Two moves kept you level here — e4 and e4. Everything else conceded.');
  });

  it('grades a find by the SAN the walk recorded', () => {
    expect(criticalMomentHeld(one, 'e4')).toBe(true);
    expect(criticalMomentHeld(one, 'd4')).toBe(false);
    expect(criticalMomentHeld(one, null)).toBe(false);
  });

  it('withholds SANs unless a fen was supplied (Learn must not name the move)', () => {
    const noFen = readCriticalMoment({ topLines: fan(0, -300, -900), moverColor: 'w' });
    expect(noFen?.holdingSans).toEqual([]);
    expect(criticalMomentReveal(noFen)).toBeNull();
  });

  it('stakeText is the ONE source of every form — number AND tense', () => {
    expect(stakeText('level')).toBe('keeps you level');
    expect(stakeText('level', { plural: true })).toBe('keep you level');
    expect(stakeText('level', { past: true })).toBe('kept you level');
    expect(stakeText('level', { plural: true, past: true })).toBe('kept you level');
    expect(stakeText('damage', { plural: true })).toBe('limit the damage');
    expect(stakeText('damage', { past: true })).toBe('limited the damage');
  });

  it('LEARN speaks in the present, REVIEW in the retrospective (the two registers)', () => {
    expect(criticalMomentStatement(one, 0)).toContain('keeps you level');
    expect(criticalMomentStatement(one, 0)).not.toContain('kept you level');
    expect(criticalMomentAsk(one, 0)).toContain('kept you level');
    expect(criticalMomentReveal(one)).toContain('kept you level');
  });

  it('EVERY register names the COUNT — that is the fact this computer exists for', () => {
    for (const r of [one, two]) {
      const n = r!.count === 1 ? /one move/i : /two moves/i;
      expect(criticalMomentStatement(r, 3)).toMatch(n);
      expect(criticalMomentAsk(r, 3)).toMatch(n);
      expect(criticalMomentReveal(r)).toMatch(n);
    }
  });
});

describe('S5 — the reveal names why the failing candidates fail', () => {
  it('a discarded candidate whose line proves a loss is explained', async () => {
    const { readCriticalMoment, criticalMomentReveal } = await import('./criticalMoment');
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const read = readCriticalMoment({
      fen, moverColor: 'b',
      topLines: [
        { rank: 1, evaluation: -20, mate: null, moves: ['g8f6'] },
        { rank: 2, evaluation: 600, mate: null, moves: ['d8h4', 'f3h4'] },
      ],
    });
    expect(read?.discardedProofs).toEqual([{ san: 'Qh4', text: 'Qh4 and Nxh4 — they win a queen' }]);
    const t = criticalMomentReveal(read);
    expect(t).toContain("Qh4 didn't work: Qh4 and Nxh4 — they win a queen.");
  });
});

describe('a move holds when it keeps the STAKE (re-walk 1380, 2026-09-26)', () => {
  it('at +8 every winning line keeps the win — nothing hinges, SILENT', () => {
    // The fan the engine gave at 30…b3: all three lines win by 7+ pawns.
    const r = readCriticalMoment({ topLines: fan(819, 814, 750), moverColor: 'w' });
    expect(criticalMomentSpeaks(r)).toBe(false);
  });
  it('a line that drops the win still counts as conceding — the claim stays when it is true', () => {
    const r = readCriticalMoment({ topLines: fan(600, 500, 150), moverColor: 'w' });
    expect(r?.count).toBe(2);
    expect(criticalMomentSpeaks(r)).toBe(true);
  });
});
