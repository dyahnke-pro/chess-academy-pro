// The S4 pawn computers answer on a real move through the ONE composer (a
// wire that does not fire is not a wire, G8.5): Review, the lessons and chat
// read them there and through the registry.
import { describe, expect, it } from 'vitest';
import { moveThoughtFacts, questionThought } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

const base = { plainThreatsSeen: false, tense: 'past' as const, prev: NO_PREV_CAPTURE, line: null, theirLast: null, story: false, history: [], phrases: null, reads: null, costCp: null, theory: false };

describe('S4 pawn computers in the composer', () => {
  it.each([
    ['pinnedPawnGuard', '3qkr2/p2n1p2/1p2pP2/3pNp1Q/1P1P4/P6P/5PP1/2R3K1 w - - 1 27', 'Rc6', true],
    ['chainBase', 'r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pP2/1P2N1P1/RN2KB1R b KQkq - 1 18', 'Bh6', true],
    ['pawnCutsGuard', 'r2q1rk1/pp3pbp/3p1np1/N3pb2/2p5/4B3/PP1QPPPP/R3KB1R b KQ - 1 13', 'c3', true],
  ] as const)('%s speaks on its board', (computer, fenBefore, san, moverIsStudent) => {
    const facts = moveThoughtFacts({ namesPlayedMove: true, ...base, fenBefore, san, moverIsStudent });
    expect(facts.some((f) => f.computer === computer)).toBe(true);
  });
});

// THE CHAT ANSWER (David 2026-11-17: every computer answers in chat): a
// question about the move, through `questionThought`, says the line.
describe('S4 pawn computers answer a question about the move', () => {
  const ask = { plainThreatsSeen: false, prev: NO_PREV_CAPTURE, line: null, theirLast: null, story: false, history: [], reads: null, costCp: null, theory: false };
  it.each([
    ['pinnedPawnGuard', 'tactics', '3qkr2/p2n1p2/1p2pP2/3pNp1Q/1P1P4/P6P/5PP1/2R3K1 w - - 1 27', 'Rc6', true, /pin(?:s|ned)\b.* to the king/],
    ['chainBase', 'structure', 'r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pP2/1P2N1P1/RN2KB1R b KQkq - 1 18', 'Bh6', true, /base of your (pawn )?chain/],
    ['pawnCutsGuard', 'tactics', 'r2q1rk1/pp3pbp/3p1np1/N3pb2/2p5/4B3/PP1QPPPP/R3KB1R b KQ - 1 13', 'c3', true, /knight on a5/],
  ] as const)('%s: questionThought (%s) carries its line', (computer, group, fenBefore, san, moverIsStudent, said) => {
    const t = questionThought({ namesPlayedMove: true, ...ask, fenBefore, san, moverIsStudent }, new Set([group]), null, null);
    const kept = t.kept.find((f) => f.computer === computer);
    expect(kept, `held: ${t.held.filter((h) => h.fact.computer === computer).map((h) => h.why).join(',')}`).toBeDefined();
    expect(t.spoken).toMatch(said);
  });
});
