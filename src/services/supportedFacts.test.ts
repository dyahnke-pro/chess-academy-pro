// TEACHING POINTS FIRST (David 2026-09-23) — the support rule, and the door's
// step 4b that runs it on review's tagged facts.
import { CALM_BOARD } from './boardState';
import { ALL_GREY } from './teachingLayers';
import { describe, it, expect } from 'vitest';
import { supportedFacts } from './factSelector';
import { FACT_ROLE } from './reviewFacetRank';
import { doorFact } from '../test/doorFact';
import type { DoorFact } from './coachDecider';

const roleOf = (f: DoorFact): 'teach' | 'describe' => FACT_ROLE[f.kind];
const texts = (fs: readonly DoorFact[]): string[] => fs.map((f) => f.text);

describe('supportedFacts — a description speaks only where it supports a teaching point', () => {
  const tactic = doorFact('[tactic] Your knight forks the king on e8 and the rook on a8.', { squares: ['c7', 'e8', 'a8'] });
  const countOnE8 = doorFact('[count] The king on e8 has one defender left.', { squares: ['e8'] });
  const structure = doorFact('[structure] Your pawns on the queenside are connected.', { squares: ['a2', 'b2', 'c2'] });

  it('keeps a description that points at a square the teaching point named', () => {
    const r = supportedFacts([tactic, countOnE8], roleOf);
    expect(texts(r.spoken)).toEqual([tactic.text, countOnE8.text]);
    expect(r.quiet).toEqual([]);
  });

  it('silences a description about somewhere else, and says why', () => {
    const r = supportedFacts([tactic, structure], roleOf);
    expect(texts(r.spoken)).toEqual([tactic.text]);
    expect(r.quiet).toEqual([{ text: structure.text, why: 'unsupported' }]);
  });

  it('a description with no coupled squares cannot be shown to support anything', () => {
    const eval_ = doorFact('[eval] The engine likes your position a little more now.');
    const r = supportedFacts([tactic, eval_], roleOf);
    expect(texts(r.spoken)).toEqual([tactic.text]);
    expect(r.quiet.map((q) => q.why)).toEqual(['unsupported']);
  });

  it('on a ply with NO teaching point, nothing speaks — a description is not a reason (WO-TEACH-02)', () => {
    const does = doorFact('[does] It develops the knight toward the centre and eyes e5.');
    const r = supportedFacts([structure, does], roleOf);
    expect(r.spoken).toEqual([]);
    expect(r.quiet.map((q) => q.why)).toEqual(['unsupported', 'unsupported']);
  });

  it('is a ROLE rule, not a cap — every teaching point speaks, however many', () => {
    const teach = Array.from({ length: 7 }, (_, i) => doorFact(`[threat] Threat number ${i} on the board.`));
    const r = supportedFacts(teach, roleOf);
    expect(r.spoken).toEqual(teach);
  });

  // Review tape 2026-10-21, 19…f4 (Firouzja–Carlsen): the threat to the bishop
  // on e3 was said by the kick lesson AND by the move's description.
  it('a description that only restates one teaching point is quiet — one claim, said once', () => {
    const timing = doorFact('[timing] That is the kick a quiet move would have stopped — f4 would hit your bishop on e3, and after g3 the pawn covers f4.', { squares: ['f4', 'e3', 'g3'] });
    const does = doorFact('[does] Their pawn on f4 now eyes your bishop on e3 — your bishop on e3 is worth more than the pawn.', { squares: ['f4', 'e3'] });
    const r = supportedFacts([timing, does], roleOf);
    expect(texts(r.spoken)).toEqual([timing.text]);
    expect(r.quiet).toEqual([{ text: does.text, why: 'subsumed', by: timing.text }]);
  });

  // Same rule, Alapin 11…Nd5: "…eyes their bishop on f4 — nothing guards their
  // bishop on f4" beside a rule that only says the move hits the bishop. The
  // loose piece is a claim of its own; the loose count reads it.
  it('a description that claims more than the teaching point — the piece is loose — still speaks', () => {
    const rule = doorFact('[rule] …Nd5 moves the same piece twice — usually a waste of time in the opening, but here it hits the bishop on f4.', { squares: ['d5', 'f4'] });
    const text = '[does] Your knight on d5 now eyes their bishop on f4 — nothing guards their bishop on f4.';
    const loose = doorFact(text, { squares: ['d5', 'f4'], claims: ['loose:f4'] });
    const plain = doorFact(text, { squares: ['d5', 'f4'] });
    expect(texts(supportedFacts([rule, loose], roleOf).spoken)).toEqual([rule.text, text]);
    expect(texts(supportedFacts([rule, plain], roleOf).spoken)).toEqual([rule.text]);
  });

  it('a description that reaches past the teaching point still speaks beside it', () => {
    const timing = doorFact('[timing] That is the kick a quiet move would have stopped — f4 would hit your bishop on e3, and after g3 the pawn covers f4.', { squares: ['f4', 'e3', 'g3'] });
    const does = doorFact('[does] Their pawn on f4 now eyes your bishop on e3 and your knight on g5.', { squares: ['f4', 'e3', 'g5'] });
    expect(texts(supportedFacts([timing, does], roleOf).spoken)).toEqual([timing.text, does.text]);
  });
});

// ONE COACH (David 2026-09-23: "Review should rank the same way as learn! And
// play!"). The live composer hands the door clauses, not `[tag]` facets; their
// role rides the clause KIND. Same rule, second vocabulary.
describe('decide — teaching points first on the LIVE vocabulary too', async () => {
  const { decide } = await import('./coachDecider');
  const { NO_BOOST } = await import('./studentMomentBoost');
  const { CLAUSE_ROLE } = await import('./reviewFacetRank');
  const student = { rating: 1500, weaknesses: [], need: null, moveAdvice: null, momentBoost: NO_BOOST, layers: ALL_GREY, fade: new Map() };
  const blunder = { decision: null, cpLossCp: 300, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
  const HANG = 'Your knight on f3 is hanging to the bishop on g4.';
  const LEANS_HERE = 'Their bishop on g4 is doing all the work.';
  const LEANS_ELSEWHERE = 'Your rook on a1 is carrying your whole position.';
  const live = (facts: DoorFact[]) => ({ board: CALM_BOARD, facts });

  it('a leans line speaks beside the teaching point it supports, and not beside one it does not', () => {
    const d = decide(blunder, student, live([
      doorFact(HANG, { kind: 'must-defend', squares: ['f3', 'g4'] }),
      doorFact(LEANS_HERE, { kind: 'opponent-leans', squares: ['g4'] }),
      doorFact(LEANS_ELSEWHERE, { kind: 'student-leans', squares: ['a1'] }),
    ]), 'interrupt');
    expect(d.spoken).toEqual([HANG, LEANS_HERE]);
    expect(d.quiet.find((q) => q.text === LEANS_ELSEWHERE)?.why).toBe('unsupported');
  });

  it('a ply of descriptions alone says nothing — and names the gate', () => {
    const d = decide(blunder, student, live([doorFact(LEANS_ELSEWHERE, { kind: 'student-leans', squares: ['a1'] })]), 'interrupt');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('unsupported');
  });

  it('the band-change status line is teaching, so it survives on its own', () => {
    expect(CLAUSE_ROLE.status).toBe('teach');
    const STATUS = "You're winning this now — technique from here.";
    const d = decide(blunder, student, live([doorFact(STATUS, { kind: 'status' })]), 'interrupt');
    expect(d.spoken).toEqual([STATUS]);
  });
});
