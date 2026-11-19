// WO-PICTURE-01 P3 (first half): the ledger, the counterplay and the target,
// on three of Danya's boards (audit-reports/danya-havecheck, the engine lines
// stored with them). Each conclusion rests on the facts the other computers
// produced on the board (`readEveryComputer`), and each has a negative control.
import { describe, it, expect } from 'vitest';
import type { Color } from 'chess.js';
import { readEveryComputer } from './boardBundle';
import { readBoardAll } from './boardComputers';
import type { CoachFact } from './coachFact';
import type { EngineLine } from './engineLineRead';
import { buildPicture } from './positionPicture';
import { counterplayOf, counterplayText, ledgerOf, pictureConclusions, pictureOfBoard, targetOf } from './pictureLedger';

interface Board { id: string; fen: string; lines: EngineLine[] }

const ENDGAME: Board = {
  id: 'endgame-attacks-part-2#3',
  fen: '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29',
  lines: [
    { moves: ['f1e2', 'b7e7', 'e2b5', 'a4a3', 'b2a3', 'e7a3', 'd4d8', 'g8h7', 'd8d2', 'a3c5'], cp: -7, mate: null },
    { moves: ['g1g2', 'b7e7', 'f1b5', 'a4a3', 'b2a3', 'e7a3', 'b5e2', 'a3b2', 'g2f1', 'b2c1'], cp: -11, mate: null },
    { moves: ['d4d8', 'g8h7', 'd8d4', 'b7a6', 'd4c5', 'a4a3', 'b2a3', 'a6a4', 'f1e2', 'a4c2'], cp: -34, mate: null },
  ],
};
const MANEUVER: Board = {
  id: 'the-art-of-maneuvering#1',
  fen: '2b1rrk1/6pp/p2bpn2/2p1N1B1/2Pp1P2/3B4/PP2R1PP/4R1K1 w - - 0 24',
  lines: [
    { moves: ['d3c2', 'e8e7', 'h2h3', 'e7b7', 'e2f2', 'a6a5', 'b2b3', 'f6d7', 'e5d3', 'd7b8'], cp: 48, mate: null },
    { moves: ['g2g3', 'f6d7', 'e5c6', 'd7f6', 'h2h3', 'f8f7', 'd3c2', 'f7b7', 'b2b3', 'a6a5'], cp: 44, mate: null },
    { moves: ['d3b1', 'e8e7', 'b1c2', 'e7b7', 'b2b3', 'a6a5', 'g2g4', 'b7b6', 'h2h3', 'f6d7'], cp: 32, mate: null },
  ],
};
const ROOK_LIFT: Board = {
  id: 'the-positional-rook-lift#2',
  fen: '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25',
  lines: [
    { moves: ['c8b8', 'e1e2', 'd8d7', 'd1a1', 'b8c8', 'e2e1', 'c8c7', 'e1f1', 'd7f7', 'f3d2'], cp: -126, mate: null },
    { moves: ['g6f6', 'd3d4', 'e5d4', 'c3d4', 'g5g4', 'd4d5', 'g4f3', 'd5e6', 'f6e6', 'h6f4'], cp: -121, mate: null },
    { moves: ['d8d7', 'd1a1', 'c8b8', 'e1e2', 'g6f7', 'a1f1', 'a6a5', 'f1a1', 'g5g4', 'f3e1'], cp: -110, mate: null },
  ],
};

const studentOf = (b: Board): Color => (b.fen.split(' ')[1] === 'b' ? 'b' : 'w');
const factsOn = (b: Board): CoachFact[] =>
  readEveryComputer({ fen: b.fen, student: studentOf(b), lines: b.lines, rating: 1800, history: [], priorMove: null, priorMoveSeat: null, priorLines: null });

/** Every entry rests on facts that exist and are about its object. */
function restsOnFacts(facts: readonly CoachFact[], factIds: readonly string[], object: string): boolean {
  const pic = buildPicture(facts);
  return factIds.length > 0 && factIds.every((id) => pic.entries.get(id)?.objects.includes(object));
}

describe('the ledger', () => {
  it('endgame-attacks #3: Black\'s backward b5 pawn and the d5 hole, both reachable, resting on their facts', () => {
    const facts = factsOn(ENDGAME);
    const c = pictureConclusions(facts, ENDGAME.fen, ENDGAME.lines);
    const weak = c?.ledger.b.weaknesses ?? [];
    expect(weak.map((e) => e.object)).toEqual(['bP@b5', '-@d5']);
    expect(weak[0].traits).toContain('backward');
    for (const e of weak) expect(restsOnFacts(facts, e.factIds, e.object)).toBe(true);
    // The queen's way to b4 and the bishop already on the diagonal; the c-pawn's lever.
    expect(weak[0].access?.attackers.map((r) => r.from).sort()).toEqual(['d4', 'f1']);
    expect(weak[0].access?.levers.map((l) => l.from)).toEqual(['c3']);
  });

  it('the art of maneuvering #1: the knight on its outpost works, the blockaded passer does not, a6 is reachable', () => {
    const c = pictureConclusions(factsOn(MANEUVER), MANEUVER.fen, MANEUVER.lines);
    expect(c?.ledger.w.assets.map((e) => [e.object, e.working])).toEqual([['wN@e5', true]]);
    expect(c?.ledger.b.assets.map((e) => [e.object, e.working])).toEqual([['bP@d4', false]]);
    expect(c?.ledger.b.weaknesses.map((e) => e.object)).toEqual(['-@a5', 'bP@a6', '-@c6']);
    expect(c?.ledger.b.weaknesses.find((e) => e.object === 'bP@a6')?.traits).toContain('isolated');
  });

  it('the rook lift #2: f2 and the stranded bishop are reachable; the king in the centre is not', () => {
    const c = pictureConclusions(factsOn(ROOK_LIFT), ROOK_LIFT.fen, ROOK_LIFT.lines);
    expect(c?.ledger.w.weaknesses.map((e) => e.object)).toEqual(['wP@f2', 'wB@h6']);
    expect(c?.ledger.w.weaknesses.find((e) => e.object === 'wB@h6')?.traits).toContain('no-safe-square');
    // Nothing of Black's can stand hitting e1 within two moves: weak, never counted.
    expect(c?.ledger.w.unreached.map((e) => e.object)).toEqual(['wK@e1']);
    expect(c?.ledger.b.unreached.map((e) => e.object)).toEqual(['-@d5']);
  });

  it('negative control: a weakness no fact is about is never on the ledger', () => {
    const facts = factsOn(ENDGAME).filter((f) => !buildPicture([f]).entries.get(f.id)?.objects.includes('bP@b5'));
    const led = ledgerOf(pictureOfBoard(facts, ENDGAME.fen), ENDGAME.fen);
    expect(led?.b.weaknesses.map((e) => e.object)).toEqual(['-@d5']);
  });

  it('negative control: a fact about another board, or a conclusion, never feeds the ledger', () => {
    const facts = factsOn(ENDGAME);
    const elsewhere = facts.map((f) => ({ ...f, fen: MANEUVER.fen }));
    expect(ledgerOf(pictureOfBoard(elsewhere, ENDGAME.fen), ENDGAME.fen)?.b.weaknesses).toEqual([]);
    const pic = pictureOfBoard(facts, ENDGAME.fen);
    expect([...pic.entries.values()].some((e) => e.fact.computer.startsWith('picture'))).toBe(false);
  });
});

describe('the counterplay', () => {
  it('endgame-attacks #3: Black\'s …a3 against b2 is alive — the best line plays it', () => {
    const c = pictureConclusions(factsOn(ENDGAME), ENDGAME.fen, ENDGAME.lines);
    expect(c?.counterplay.b).toMatchObject({ from: 'a4', to: 'a3', hits: ['b2'], state: 'alive', ply: 3 });
  });

  it('the art of maneuvering #1: Black has no break at all', () => {
    expect(pictureConclusions(factsOn(MANEUVER), MANEUVER.fen, MANEUVER.lines)?.counterplay.b).toBeNull();
  });

  it('the rook lift #2: White\'s b4, named by a fact, is left alone by the line — unsettled, never said', () => {
    const facts = factsOn(ROOK_LIFT);
    const c = pictureConclusions(facts, ROOK_LIFT.fen, ROOK_LIFT.lines);
    expect(c?.counterplay.w).toMatchObject({ from: 'b3', to: 'b4', state: 'unsettled' });
    expect(counterplayText(c!.counterplay.w!, 'b', ROOK_LIFT.fen, ROOK_LIFT.lines)).toBeNull();
    expect(readBoardAll('pictureCounterplay', { fen: ROOK_LIFT.fen, student: 'b', lines: ROOK_LIFT.lines, facts })).toEqual([]);
  });

  it('dead: a move of the best line that takes the lever away kills the break, and names its mover', () => {
    const fen = '4k3/8/8/3p4/8/8/2P5/4K3 b - - 0 1';
    const named = { id: 'test:break-c4', computer: 'pawnBreak', fen, squares: ['c4', 'd5'], claims: [], text: 'c4 is your break.' } as unknown as CoachFact;
    const lines: EngineLine[] = [{ moves: ['d5d4', 'e1d2', 'e8d7'], cp: 0, mate: null }];
    const r = counterplayOf(buildPicture([named]), fen, lines, 'w');
    expect(r).toMatchObject({ from: 'c2', to: 'c4', state: 'dead', ply: 0, stoppedBy: 'd5d4' });
    expect(counterplayText(r!, 'b', fen, lines)).toMatch(/dead: after d4 it no longer works/);
    const [f] = readBoardAll('pictureCounterplay', { fen, student: 'b', lines, facts: [named] });
    // The student's own next move kills it: posed both ways, and named, so Learn holds it.
    expect(f.skill).toBe('missed-opponents-threat');
    expect(f.namesStudentMove).toBe(true);
    // Negative control: no fact names the break and the line does not play it — nothing to say.
    expect(counterplayOf(buildPicture([]), fen, lines, 'w')).toBeNull();
  });

  it('negative control: with no line, the alive break is only unsettled', () => {
    expect(pictureConclusions(factsOn(ENDGAME), ENDGAME.fen, [])?.counterplay.b?.state).toBe('unsettled');
  });
});

describe('the target', () => {
  it('endgame-attacks #3: b5, not d5 — three units reach it, two guard it, and it cannot run', () => {
    const facts = factsOn(ENDGAME);
    const t = pictureConclusions(facts, ENDGAME.fen, ENDGAME.lines)?.target.w;
    expect(t?.best.entry.object).toBe('bP@b5');
    expect([t?.best.attackers, t?.best.defenders, t?.best.fixed]).toEqual([3, 2, true]);
    expect(t?.runnerUp?.entry.object).toBe('-@d5');
    const [f] = readBoardAll('pictureTarget', { fen: ENDGAME.fen, student: 'w', lines: ENDGAME.lines, facts });
    expect(f.text).toMatch(/pawn on b5, not the hole on d5: three of your pieces and pawns can get at it, and only two of theirs can guard it\./);
  });

  it('negative control: where no weakness is outnumbered there is no target', () => {
    const c = pictureConclusions(factsOn(MANEUVER), MANEUVER.fen, MANEUVER.lines);
    expect(c?.target.w).toBeNull();
    // The candidates are still weighed and kept; none has more attackers than guards.
    const led = c!.ledger;
    expect(led.b.weaknesses.length).toBeGreaterThan(0);
    expect(targetOf(led, 'w')).toBeNull();
  });
});

describe('the registry reads', () => {
  it('the three conclusions come out of the one bundle read, with words in the student\'s seat', () => {
    const facts = factsOn(ENDGAME);
    const byComputer = new Map(facts.filter((f) => f.computer.startsWith('picture')).map((f) => [f.computer, f]));
    expect(byComputer.get('pictureLedger')?.text).toMatch(/b5/);
    expect(byComputer.get('pictureCounterplay')?.text).toMatch(/a3, hitting your pawn on b2/);
    expect(byComputer.get('pictureTarget')?.seat).toBe('student');
  });

  it('negative control: no facts, no ledger', () => {
    expect(readBoardAll('pictureLedger', { fen: ENDGAME.fen, student: 'w', lines: ENDGAME.lines, facts: [] })).toEqual([]);
  });
});
