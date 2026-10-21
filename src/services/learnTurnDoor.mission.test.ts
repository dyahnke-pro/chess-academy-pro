/**
 * The Learn door under a mission (WO-MISSIONS-01): while the phase's mission
 * is unresolved the door speaks nothing and holds every lane as `mission`;
 * with the mission open it decides exactly as before.
 */
import { describe, expect, it } from 'vitest';
import { coachTurn } from './coachDecider';
import { decidePhaseWave, type LaneFact } from './learnTurnDoor';
import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FACTS: LaneFact[] = [
  { lane: 'threat', text: 'Watch e4 — their knight could take it.', fen: FEN, squares: ['e4'], stakes: { points: 1, plies: 1 }, proof: NO_PROOF.stated, namesStudentMove: NAMES_NO_MOVE },
  { lane: 'openingIdea', text: 'Both sides aim for the d-pawn break in this opening.', fen: FEN, squares: ['d4'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE },
];
const turn = { kind: 'late' as const, ply: 4, slipCp: null, priceSettled: true, price: null, midExchange: null };

describe('the Learn door under a mission', () => {
  it('missions OFF (open): the door speaks as before', () => {
    const d = coachTurn({ posture: 'learn', turn, facts: FACTS, priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'open' });
    expect(d.pkg.spoken).toMatch(/Watch e4/);
    expect(d.spoke.length).toBeGreaterThan(0);
  });

  it('an unresolved mission: zero lines, every lane held as `mission`, and the row still emitted', () => {
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const d = coachTurn({ posture: 'learn', turn, facts: FACTS, priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'mission' });
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
    const open = decidePhaseWave(report, FEN, live, { priorKeys: new Set(), priorLead: null, green: null, beginner: false, owner: 'open' });
    const silent = decidePhaseWave(report, FEN, { ...live, holds: new Set<string>() }, { priorKeys: new Set(), priorLead: null, green: null, beginner: false, owner: 'mission' });
    expect(open?.pkg.spoken).toMatch(/opening is over/);
    expect(silent?.pkg.spoken).toBe('');
  });

  it('a Learn focus game: zero lines; a lane about the focus is `focus-voice`, the rest `off-focus` (WO-LEARN-FOCUS-01)', () => {
    const rows: LearnTurnRow[] = [];
    const off = onLearnTurn((r) => rows.push(r));
    const d = coachTurn({ posture: 'learn', turn, facts: FACTS, priorLead: null, green: null, beginner: false, turnHolds: new Set(), owner: 'focus:loose-pieces' });
    off();
    expect(d.pkg.spoken).toBe('');
    expect(d.spoke).toEqual([]);
    // The threat lane teaches missed-opponents-threat — a loose-pieces skill.
    expect(rows[0].heldWhy).toEqual({ threat: 'focus-voice', openingIdea: 'off-focus' });
  });
});
