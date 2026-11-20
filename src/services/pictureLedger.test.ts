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
import { counterplayOf, counterplaysOf, counterplayText, ledgerOf, pictureConclusions, pictureOfBoard, planRacesOf, planTargetOf, planTargetText, targetOf } from './pictureLedger';

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

  it('the art of maneuvering #1: Black has no break, and its one piece resource, …Nh5 against f4, is dead after Rf2', () => {
    const facts = factsOn(MANEUVER);
    const c = pictureConclusions(facts, MANEUVER.fen, MANEUVER.lines);
    // …Nh5 hits f4 twice (the knight, and the rook on f8 down the opened
    // file) against the g5 bishop alone; the best line's Rf2 guards it again.
    expect(c?.counterplay.b).toMatchObject({ kind: 'piece', piece: 'n', from: 'f6', to: 'h5', hits: ['f4'], state: 'dead', ply: 4, stoppedBy: 'e2f2' });
    expect(counterplayText(c!.counterplay.b!, 'w', MANEUVER.fen, MANEUVER.lines))
      .toMatch(/^Their (knight can come to h5 and hit|resource is the knight on f6: from h5 it hits) your pawn on f4\. But it is dead: after Rf2 it no longer works\.$/);
    // It rests on a fact about the pawn it hits.
    expect(restsOnFacts(facts, c!.counterplay.b!.factIds, 'wP@f4')).toBe(true);
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

  it('a capture break is named by its move and TAKES the pawn — never "the push to e4, against your pawn on e4"', () => {
    // Black's …d5 pawn levers White's e4: the break is …dxe4, a capture.
    const fen = 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
    const named = { id: 'test:break-dxe4', computer: 'pawnBreak', fen, squares: ['d5', 'e4'], claims: [], text: 'dxe4 is their break.' } as unknown as CoachFact;
    const lines: EngineLine[] = [{ moves: ['f1d3', 'd5e4', 'd3e4'], cp: 0, mate: null }];
    const r = counterplaysOf(buildPicture([named]), fen, lines, 'b').find((x) => x.from === 'd5' && x.to === 'e4');
    expect(r).toMatchObject({ kind: 'break' });
    expect(r?.state).not.toBe('unsettled');
    const text = counterplayText(r!, 'w', fen, lines) ?? '';
    expect(text).toMatch(/^Their (one resource is the pawn break …dxe4, taking your pawn on e4\.|counterplay is …dxe4: the pawn takes your pawn on e4\.)/);
    expect(text).not.toMatch(/(push|break) to e4/);
    // A push still goes TO an empty square and hits the pawn beside it.
    const pushFen = '4k3/8/8/8/3p4/8/2P1P3/4K3 w - - 0 1';
    const pushNamed = { id: 'test:break-c3', computer: 'pawnBreak', fen: pushFen, squares: ['c3', 'd4'], claims: [], text: 'c3 is your break.' } as unknown as CoachFact;
    const pl: EngineLine[] = [{ moves: ['c2c3', 'e8d7'], cp: 0, mate: null }];
    const p = counterplaysOf(buildPicture([pushNamed]), pushFen, pl, 'w').find((x) => x.from === 'c2' && x.to === 'c3');
    expect(counterplayText(p!, 'b', pushFen, pl)).toMatch(/^Their (one resource is the pawn break c3, hitting your pawn on d4|counterplay is the push c3, against your pawn on d4)\./);
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

const fact = (id: string, computer: string, fen: string, squares: string[]): CoachFact =>
  ({ id, computer, fen, squares, claims: [], text: `${id}.` } as unknown as CoachFact);

describe('the plan target (a race of up to four moves)', () => {
  // White's knight needs four quiet moves to hit the isolated a6 pawn; Black
  // has nothing that can guard it in time.
  const FAR = '7k/8/p7/8/8/8/8/6NK w - - 0 1';

  it('a weakness two moves cannot reach is won by a plan: the knight\'s route, and the count that wins it', () => {
    const facts = [fact('test:a6', 'attackerDefenderCount', FAR, ['a6'])];
    const led = ledgerOf(buildPicture(facts), FAR)!;
    // Out of reach in two moves: never the target now.
    expect(led.b.unreached.map((e) => e.object)).toEqual(['bP@a6']);
    expect(targetOf(led, 'w')).toBeNull();
    const p = planTargetOf(led, 'w');
    expect(p?.best).toMatchObject({ won: true, horizon: 4, attackers: 1, defenders: 0 });
    expect(p?.best.decisive).toMatchObject({ from: 'g1', piece: 'n', moves: 4 });
    expect(planTargetText(p!, 'w')).toMatch(/^Your knight (can go by [a-h][1-8], [a-h][1-8] and [a-h][1-8] to [a-h][1-8] and hit|has a way to) their pawn on a6.* In four moves one of your pieces reaches it, and they have nothing that can guard it in time\.$/);
    const [f] = readBoardAll('pictureTarget', { fen: FAR, student: 'w', lines: [], facts });
    expect(f.text).toBe(planTargetText(p!, 'w'));
    expect(f.squares).toContain('a6');
  });

  it('negative control: a guard that gets there in the same time wins the race — never the target', () => {
    // Black's knight on h3 reaches c7 (guarding a6) in three moves, before
    // White's knight is there: the race is counted move for move, never the
    // attacker's four moves against the guards standing now.
    const fen = '7k/8/p7/8/8/7n/8/6NK w - - 0 1';
    const led = ledgerOf(buildPicture([fact('test:a6', 'attackerDefenderCount', fen, ['a6'])]), fen)!;
    expect(planTargetOf(led, 'w')).toBeNull();
    expect(planRacesOf(led, 'w')[0]).toMatchObject({ won: false, attackers: 1, defenders: 1 });
    expect(readBoardAll('pictureTarget', { fen, student: 'w', lines: [], facts: [fact('test:a6', 'attackerDefenderCount', fen, ['a6'])] })).toEqual([]);
  });

  it('the rook lift #2: f2 is no plan target — the queen behind the knight is all Black brings, and four guard it', () => {
    const c = pictureConclusions(factsOn(ROOK_LIFT), ROOK_LIFT.fen, ROOK_LIFT.lines)!;
    const f2 = planRacesOf(c.ledger, 'b').find((r) => r.entry.object === 'wP@f2');
    // Both rooks would stand behind the queen on the f-file, two pieces in
    // front of f2: one line passes one piece, never two.
    expect(f2).toMatchObject({ won: false, attackers: 1, defenders: 4 });
    expect(c.planTarget.b).toBeNull();
  });

  it('the art of maneuvering #1: a6 is no plan target — four reach it, and four guard it in the same moves', () => {
    const c = pictureConclusions(factsOn(MANEUVER), MANEUVER.fen, MANEUVER.lines)!;
    expect(planRacesOf(c.ledger, 'w').find((r) => r.entry.object === 'bP@a6')).toMatchObject({ won: false, attackers: 4, defenders: 4 });
    expect(c.planTarget.w).toBeNull();
  });
});

describe('the piece counterplay', () => {
  it('alive: the best line plays the threat, and it is said', () => {
    const fen = '4k3/8/8/1p6/8/8/8/R3K3 b - - 0 1';
    const lines: EngineLine[] = [{ moves: ['e8d7', 'a1b1', 'd7c6'], cp: 0, mate: null }];
    const r = counterplayOf(buildPicture([]), fen, lines, 'w');
    expect(r).toMatchObject({ kind: 'piece', piece: 'r', from: 'a1', to: 'b1', hits: ['b5'], state: 'alive', ply: 1 });
    expect(counterplayText(r!, 'b', fen, lines)).toMatch(/b1.*your pawn on b5.*(It is coming: the best line plays it\.|Nothing stops it in the best line\.)$/);
  });

  it('the rook lift #2: Rh5 is no resource with the queen on g6 (it takes the rook); after …Qf6 it hits g5, until …g4', () => {
    const now = counterplaysOf(pictureOfBoard(factsOn(ROOK_LIFT), ROOK_LIFT.fen), ROOK_LIFT.fen, ROOK_LIFT.lines, 'w');
    expect(now.some((x) => x.from === 'h2' && x.to === 'h5')).toBe(false);
    // Danya: "…Qf6 is always met by the annoying Rh5". On the board after
    // …Qf6, Rh5 is a threat on g5. The engine's line there (the stored second
    // line) plays d4 instead, and Black's …g4 takes the pawn out of its reach.
    const afterQf6 = '2kr2r1/1b5p/p2pnq1B/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 w - - 1 26';
    const lines: EngineLine[] = [{ moves: ['d3d4', 'e5d4', 'c3d4', 'g5g4'], cp: 120, mate: null }];
    const g5 = fact('test:g5', 'attackerDefenderCount', afterQf6, ['g5']);
    const r = counterplaysOf(buildPicture([g5]), afterQf6, lines, 'w').find((x) => x.from === 'h2' && x.to === 'h5');
    expect(r).toMatchObject({ kind: 'piece', piece: 'r', hits: ['g5'], state: 'dead', ply: 3, stoppedBy: 'g5g4', factIds: ['test:g5'] });
    expect(counterplayText(r!, 'b', afterQf6, lines)).toMatch(/But it is dead: after g4 it no longer works\.$/);
    // Line without …g4: the line neither plays nor stops it — unsettled, unsaid.
    const short: EngineLine[] = [{ ...lines[0], moves: lines[0].moves.slice(0, 3) }];
    const u = counterplaysOf(buildPicture([g5]), afterQf6, short, 'w').find((x) => x.from === 'h2' && x.to === 'h5');
    expect(u?.state).toBe('unsettled');
    expect(counterplayText(u!, 'b', afterQf6, short)).toBeNull();
    // With a line that plays it, it is alive and said.
    const played: EngineLine[] = [{ moves: ['h2h5', 'f6g6'], cp: 120, mate: null }];
    const a = counterplaysOf(buildPicture([g5]), afterQf6, played, 'w').find((x) => x.from === 'h2' && x.to === 'h5');
    expect(a?.state).toBe('alive');
    expect(counterplayText(a!, 'b', afterQf6, played)).toMatch(/rook.*h5.*your pawn on g5/);
  });

  it('negative control: a piece move with no threat, the line playing it, is not counterplay', () => {
    const fen = '4k3/8/8/8/8/8/8/R3K3 b - - 0 1';
    const lines: EngineLine[] = [{ moves: ['e8d7', 'a1b1', 'd7c6'], cp: 0, mate: null }];
    expect(counterplayOf(buildPicture([]), fen, lines, 'w')).toBeNull();
  });
});

// Fischer–Spassky, Reykjavik 1972 (game 6), before 18.Nd4: Black's hanging
// pawns. "Black already has to concentrate most of his forces to keep his
// center intact" — c5 is held by the rook, the knight and the queen, no pawn of
// Black's can guard it (b7 and d6 are empty, nothing to push there), and White's
// b-pawn levers it with b4.
const HANGING: Board = {
  id: 'bobbys-overlooked-gem#1',
  fen: '2r3k1/r2nqpp1/p3b2p/2pp4/8/Q3PN2/PP2BPPP/2R2RK1 w - - 0 18',
  lines: [
    { moves: ['f3d4', 'a6a5', 'd4e6', 'f7e6', 'e3e4', 'd7f6', 'e4d5', 'e6d5', 'e2d3', 'c5c4'], cp: 37, mate: null },
    { moves: ['f1d1', 'e7f8', 'b2b3', 'a6a5', 'e2b5', 'f8d6', 'f3d4', 'd6b6', 'c1c2'], cp: 15, mate: null },
    { moves: ['h2h3', 'd7f6', 'f1d1', 'a6a5', 'c1c2', 'a5a4', 'd1c1', 'c5c4', 'a3e7', 'a7e7'], cp: 12, mate: null },
  ],
};

describe('a pawn held only by pieces, with a lever on it', () => {
  it('Fischer–Spassky 1972: c5 is held only by the rook, knight and queen, and b4 levers it — the target', () => {
    const facts = factsOn(HANGING);
    const c = pictureConclusions(facts, HANGING.fen, HANGING.lines);
    const c5 = c?.ledger.b.weaknesses.find((e) => e.object === 'bP@c5');
    expect(c5?.traits).toContain('piece-guarded');
    expect(c5?.tied?.guards.map((x) => `${x.piece}${x.square}`).sort()).toEqual(['nd7', 'qe7', 'rc8']);
    expect(c5?.tied?.levers).toEqual([{ from: 'b2', to: 'b4', san: 'b4' }]);
    expect(restsOnFacts(facts, c5?.factIds ?? [], 'bP@c5')).toBe(true);
    // It feeds the target like any weakness: the lever is one of its attackers.
    const t = c ? targetOf(c.ledger, 'w') : null;
    const cand = t?.candidates.find((x) => x.entry.object === 'bP@c5');
    expect(cand?.levers).toBe(1);
    expect(cand?.entry.tied).toBeDefined();
  }, 30_000);

  it('negative control: a pawn that can guard it by one push (…b6) — not tied down', () => {
    const fen = '2r3k1/rp1nqpp1/p3b2p/2pp4/8/Q3PN2/PP2BPPP/2R2RK1 w - - 0 18';
    const c = pictureConclusions(factsOn({ ...HANGING, fen }), fen, HANGING.lines);
    const all = c ? [...c.ledger.b.weaknesses, ...c.ledger.b.unreached] : [];
    const c5 = all.find((e) => e.object === 'bP@c5');
    expect(c5).toBeDefined();
    expect(c5?.traits).not.toContain('piece-guarded');
    expect(c5?.tied).toBeUndefined();
  }, 30_000);

  it('negative control: no lever can reach it — not an accessible weakness of this kind', () => {
    const fen = '2r3k1/r2nqpp1/p3b2p/2pp4/8/Q3PN2/P3BPPP/2R2RK1 w - - 0 18';
    const c = pictureConclusions(factsOn({ ...HANGING, fen }), fen, HANGING.lines);
    const all = c ? [...c.ledger.b.weaknesses, ...c.ledger.b.unreached] : [];
    const c5 = all.find((e) => e.object === 'bP@c5');
    expect(c5).toBeDefined();
    expect(c5?.traits).not.toContain('piece-guarded');
    expect(c5?.tied).toBeUndefined();
  }, 30_000);
});
