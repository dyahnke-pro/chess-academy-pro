/**
 * The Learn door under a mission (WO-MISSIONS-01): while the phase's mission
 * is unresolved the door speaks nothing and holds every lane as `mission`;
 * with the mission open it decides exactly as before. In a Learn focus game
 * the door is the one voice (David 2026-10-30), holding only what points at
 * the student's own chance until they have moved.
 */
import { describe, expect, it } from 'vitest';
import { coachTurn } from './coachDecider';

import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { NO_PROOF } from './proof';
import { mateStakes } from './factStakes';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { laneFacts, decidePhaseWave, type LaneFixture } from '../test/learnDoorFixtures';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FACTS: LaneFixture[] = [
  { lane: 'threat', text: 'Watch e4 — their knight could take it.', fen: FEN, squares: ['e4'], stakes: { points: 1, plies: 1 }, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
  { lane: 'openingIdea', text: 'Both sides aim for the d-pawn break in this opening.', fen: FEN, squares: ['d4'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE },
];
const turn = { kind: 'late' as const, ply: 4, slipCp: null, priceSettled: true, price: null, midExchange: null };

describe('the Learn door under a mission', () => {
  it('missions OFF (open): the door speaks as before', () => {
    const d = coachTurn({ posture: 'learn', turn, facts: laneFacts(FACTS), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'open', chance: null });
    expect(d.pkg.spoken).toMatch(/Watch e4/);
    expect(d.spoke.length).toBeGreaterThan(0);
  });

  it('an unresolved mission: zero lines, every lane held as `mission`, and the row still emitted', () => {
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const d = coachTurn({ posture: 'learn', turn, facts: laneFacts(FACTS), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'mission', chance: null });
    off();
    expect(d.pkg.spoken).toBe('');
    expect(d.pkg.kept).toEqual([]);
    expect(d.spoke).toEqual([]);
    expect(d.held.sort()).toEqual(['openingIdea', 'threat']);
    expect(rows).toHaveLength(1);
    expect(rows[0].heldWhy).toEqual({ threat: 'mission', openingIdea: 'mission' });
  });

  it('the phase wave is silenced the same way', () => {
    const live = { fen: FEN, ply: 4, slipCp: null, priceSettled: true, price: null, midExchange: null, said: '', holds: new Set<string>() };
    const report = [{ text: 'The opening is over: both sides are developed.', claims: ['phase:middlegame'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'speedrun-read' }];
    const open = decidePhaseWave(report, FEN, live, { priorKeys: new Set(), priorLead: null, green: null, beginner: false, owner: 'open', chance: null });
    const silent = decidePhaseWave(report, FEN, { ...live, holds: new Set<string>() }, { priorKeys: new Set(), priorLead: null, green: null, beginner: false, owner: 'mission', chance: null });
    expect(open?.pkg.spoken).toMatch(/opening is over/);
    expect(silent?.pkg.spoken).toBe('');
  });

  it('a Learn focus game: the door is the one voice (David 2026-10-30) — it decides as when open', () => {
    const d = coachTurn({ posture: 'learn', turn, facts: laneFacts(FACTS), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: null });
    expect(d.pkg.spoken).toMatch(/Watch e4/);
    expect(d.spoke.length).toBeGreaterThan(0);
  });

  it("a Learn focus game: a fact pointing at the student's own chance waits until they have moved (names-chance)", () => {
    // The student's chance on this board: their knight on d4 to take (the focus's exploit seat).
    const facts: LaneFixture[] = [
      { lane: 'openingIdea', text: 'Their knight on d4 is loose — nothing guards it.', fen: FEN, squares: ['d4'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE },
      { lane: 'threat', text: 'Watch e4 — their knight could take it.', fen: FEN, squares: ['e4'], stakes: { points: 1, plies: 1 }, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
    ];
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const d = coachTurn({ posture: 'learn', turn, facts: laneFacts(facts), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: { fen: FEN, squares: ['d4'], mate: false, theirMate: false } });
    off();
    expect(d.pkg.spoken).not.toMatch(/d4/);
    // A danger on no chance the focus poses still speaks.
    expect(d.pkg.spoken).toMatch(/Watch e4/);
    expect(rows[0].heldWhy.openingIdea).toBe('names-chance');
  });

  // EXPLAIN AT THE MISS (David 2026-11-05, WO-LEARN-SWING-01 P1): a danger on
  // a chance the student has yet to answer is the answer handed over before
  // the move. It waits; once the student has moved (no chance held on that
  // board any more) it speaks. The old door let every danger through.
  it('a danger on a chance the student has yet to answer waits, and speaks once they have moved', () => {
    const before = coachTurn({ posture: 'learn', turn, facts: laneFacts(FACTS), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: { fen: FEN, squares: ['e4'], mate: false, theirMate: false } });
    expect(before.pkg.spoken).not.toMatch(/e4/);
    const after = coachTurn({ posture: 'learn', turn, facts: laneFacts(FACTS), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: null });
    expect(after.pkg.spoken).toMatch(/Watch e4/);
  });
  // THE MISS IS SAID ONCE IT STANDS (prod focus audit 2026-11-09, rung 2, g3
  // ply 25): the coach left its queen on d7 to the knight on e5, the student
  // played Rf1, and the coach took the knight on e5. The explanation of the
  // miss names e5 — the student's knight that could have taken — and the next
  // board's chance is their knight on e5 to take back. Same square, another
  // piece: the explanation is not the answer to the next chance, and it was
  // held there as names-chance, so the miss went unsaid.
  it('a miss explained on its own board speaks when a new chance on the next board shares a square with another piece on it', () => {
    const missBoard = 'r1b2rk1/pppq1ppp/2n5/4N3/2NPp3/6K1/PPP3PP/R1BB1R2 b - - 2 13';
    const nextBoard = 'r1b2rk1/pppq1ppp/8/4n3/2NPp3/6K1/PPP3PP/R1BB1R2 w - - 0 14';
    const miss: LaneFixture = { lane: 'mistake', text: 'Your move was a blunder — your knight on e5 could have taken their queen on d7.', fen: missBoard, squares: ['e5', 'd7'], stakes: { points: 9, plies: 1 }, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE };
    const nextChance = { fen: nextBoard, squares: ['e5', 'c4'], mate: false, theirMate: false };
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const said = coachTurn({ posture: 'learn', turn: { ...turn, ply: 25, slipCp: 900 }, facts: laneFacts([miss]), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: nextChance });
    off();
    expect(said.pkg.spoken).toMatch(/queen on d7/);
    expect(rows[0].heldWhy.mistake).toBeUndefined();
    // CONTROL: the same square holding the same piece on both boards is the
    // next chance itself — the line waits.
    const same = coachTurn({ posture: 'learn', turn: { ...turn, ply: 25, slipCp: 900 }, facts: laneFacts([{ ...miss, fen: nextBoard }]), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: nextChance });
    expect(same.pkg.spoken).toBe('');
  });
  it('their mate threat waits too', () => {
    const mate: LaneFixture[] = [{ lane: 'threat', text: 'They threaten mate — cover f7.', fen: FEN, squares: ['h5'], stakes: mateStakes('them', 1, true), proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE }];
    const held = coachTurn({ posture: 'learn', turn, facts: laneFacts(mate), priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:tactics', chance: { fen: FEN, squares: [], mate: false, theirMate: true } });
    expect(held.pkg.spoken).toBe('');
  });
});
