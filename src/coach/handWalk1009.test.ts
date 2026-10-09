/**
 * The hand walk of 2026-10-09 (Learn, live prod): every question here was
 * typed by hand into a real game and answered wrong. Each test holds the exact
 * position, and several wordings of the same question.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readTurnInCode } from './chatTurnCodeReader';
import { validateChatTurn } from './chatTurn';
import { theirPlanAnswer } from './boardTurnAnswer';
import { answerIsLoose } from './chatTurnAnswers';
import { coerceChatTurn } from './chatTurnParser';

const GAME = 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6 d4 Na5 Bb5+ c6 Be2 Nf6'.split(' ');
function at(n: number): { fen: string; history: string[] } {
  const c = new Chess();
  for (const m of GAME.slice(0, n)) c.move(m);
  return { fen: c.fen(), history: GAME.slice(0, n) };
}
const board = (n: number) => ({ ...at(n), studentColor: 'white' as const });

describe('a move the student wants to play is never read as a past move', () => {
  // Before 7.d4: the d3 pawn and the f3 knight can both reach d4.
  it.each(['should i push d4 now?', 'can I play d4?', 'should I go d4 here', 'is d4 good now?'])('%s', (q) => {
    const t = readTurnInCode(q, board(12));
    expect(t?.kind).toBe('candidate-move');
    expect(t?.referents).toEqual([{ type: 'move', san: 'd4' }]);
  });
  it('a move already made is still read as made', () => {
    expect(readTurnInCode('why did I play d4?', board(18))?.kind).toBe('retrospective-move');
  });
});

describe('two moves, one typed and one named by its square', () => {
  it.each([
    'is Bb5 check actually good or should i just retreat to d3?',
    'Bb5+ or back to d3?',
    'should I play Bb5 or retreat to d3',
  ])('%s', (q) => {
    const t = readTurnInCode(q, board(14));
    expect(t?.kind).toBe('compare-moves');
    expect(t?.referents.map((r) => (r.type === 'move' ? r.san : ''))).toEqual(['Bb5+', 'Bd3']);
  });
});

describe('their plan — the side named by colour or pronoun', () => {
  it.each([
    'what is black trying to do here?',
    "what's black up to?",
    'what does black want to do?',
    'what are they planning?',
    "what is my opponent's plan?",
  ])('%s → plan, their seat', (q) => {
    const t = readTurnInCode(q, board(18));
    expect(t?.kind).toBe('plan');
    expect(t?.seat).toBe('them');
  });
  it("my own colour is my plan", () => {
    expect(readTurnInCode("what's white's plan here?", board(18))?.seat).toBe('me');
  });
  it('a piece colour is not a side', () => {
    expect(readTurnInCode('what is the black bishop doing?', board(18))?.seat).not.toBe('them');
  });
  it('their plan names what they hit and their levers, never your pieces', () => {
    const text = theirPlanAnswer(board(18)) ?? '';
    expect(text).toContain('Their knight on f6 is after your pawn on e4, which nothing guards.');
    expect(text).not.toMatch(/\byour (?:knight|bishop) on [a-h][1-8] into the game/);
    expect(text).toMatch(/they want to/i);
  });
});

describe('can they take my pawn — the safety of the piece, on whose move', () => {
  it.each(['can they just take my e4 pawn?', 'can black take my pawn on e4?', 'can he win my e4 pawn'])('%s', (q) => {
    const t = readTurnInCode(q, board(18));
    expect(t?.kind).toBe('is-piece-loose');
  });
  it('on your own move the answer says you can still save it — never that it is won now', () => {
    const c = new Chess(at(18).fen);
    const text = answerIsLoose(c, 'e4', 'w');
    expect(text).toBe('Your pawn on e4 is loose and attacked by the knight on f6. It is your move, so you can still save it.');
  });
});

describe('the piece under fire is the one meant', () => {
  it('"the bishop" right after Bb5+ c6 is the attacked bishop on b5', () => {
    const b = board(16);
    const v = validateChatTurn({ kind: 'piece-options', referents: [{ type: 'piece', piece: 'b', square: null, seat: null }], seat: null, topic: null }, b);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.turn.referents[0]).toMatchObject({ type: 'piece', square: 'b5', seat: 'me' });
  });
});

describe('how do I defend it — every move that leaves the piece safe', () => {
  it('the e4 pawn after …Nf6: guard it or move it, each move board-checked', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    const c = new Chess(at(18).fen);
    const text = answerDefend(c, 'e4', 'w') ?? '';
    expect(text).toMatch(/^To save your pawn on e4, /);
    // Bd3, Nbd2, Qc2 and Qd3 guard e4 (Re1 does not: the e2 bishop is in the way).
    expect(text).toBe('To save your pawn on e4, guard it with Bd3, Nbd2, Qc2 or Qd3.');
    // A move that leaves e4 en prise is never offered.
    expect(text).not.toContain('a3');
  });
  it('no piece named: the one in danger', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    expect(answerDefend(new Chess(at(18).fen), null, 'w')).toMatch(/pawn on e4/);
  });
  it('on their move it says so', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    expect(answerDefend(new Chess(at(17).fen), 'e4', 'w')).toMatch(/^It is their move/);
  });
});

describe('defend questions are read as saving a piece', () => {
  it.each(['how do I defend it?', 'how can I save my pawn on e4?', 'what can I do to protect it', 'how should I guard my e4 pawn'])('%s', (q) => {
    expect(readTurnInCode(q, board(18))?.kind).toBe('defend-piece');
  });
  it('king safety is not a single piece', () => {
    expect(readTurnInCode('how do I protect my king?', board(18))?.kind).not.toBe('defend-piece');
  });
});

it('a count of defenders is not a defend question', () => {
  expect(readTurnInCode('how many defend c6', board(18))?.kind).not.toBe('defend-piece');
  expect(readTurnInCode('how many pieces defend my e4 pawn?', board(18))?.kind).not.toBe('defend-piece');
});

describe('why did they play that — what it saved comes first', () => {
  it('2…Nc6 guards the e5 pawn the f3 knight was hitting', async () => {
    const { assembleOpponentMoveAnswer } = await import('../services/groundedAnswer');
    const h = ['e4', 'e5', 'Nf3', 'Nc6'];
    const c = new Chess(); for (const m of h) c.move(m);
    const a = assembleOpponentMoveAnswer({ fen: c.fen(), moveHistory: h, studentColor: 'white' });
    expect(a?.facts).toMatch(/^They played Nc6 — it guards their pawn on e5, which your knight on f3 was attacking/);
  });
  it('a move that saved nothing does not claim to', async () => {
    const { assembleOpponentMoveAnswer } = await import('../services/groundedAnswer');
    const h = ['e4', 'e5'];
    const c = new Chess(); for (const m of h) c.move(m);
    expect(assembleOpponentMoveAnswer({ fen: c.fen(), moveHistory: h, studentColor: 'white' })?.facts).not.toMatch(/guards/);
  });
});

describe('each move keeps its own reason (hand walk 2: "d4 is fine … it guards e4")', () => {
  it('d4 beside the engine d3: the reasons are never swapped', async () => {
    const { moveWhy, namedMoveAnswer } = await import('../services/deliberation');
    const c = new Chess(); for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6'.split(' ')) c.move(m);
    const fen = c.fen();
    const bestWhy = moveWhy(fen, 'd3', 'w', 'Nf6');
    const namedWhy = moveWhy(fen, 'd4', 'w', 'Nf6');
    const text = namedMoveAnswer({
      best: { san: 'd3', evalCp: 40, deltaCp: 0 }, alternatives: [], isRealChoice: false,
      bestWhy, bestLine: null, named: { san: 'd4', evalCp: 30, deltaCp: 10, shortfall: 'less-precise' }, namedWhy,
    }, 'is-it-good') ?? '';
    const d4Part = text.split('d3 is the engine')[0];
    expect(d4Part).toMatch(/^d4 is fine/);
    // d4 does not touch e4: no claim of guarding it in d4's sentence.
    expect(d4Part).not.toMatch(/e4/);
  });
});

describe('their move is explained from your seat (hand walk 2: "f2 … beside their king")', () => {
  it('3…Bc5: f2 is beside YOUR king', async () => {
    const { assembleOpponentMoveAnswer } = await import('../services/groundedAnswer');
    const h = 'e4 e5 Nf3 Nc6 Bc4 Bc5'.split(' ');
    const c = new Chess(); for (const m of h) c.move(m);
    const facts = assembleOpponentMoveAnswer({ fen: c.fen(), moveHistory: h, studentColor: 'white' })?.facts ?? '';
    expect(facts).not.toMatch(/f2[^.]*their king/);
    expect(facts).toMatch(/f2[^.]*your king/);
  });
  it('the swap keeps the sentence grammatical', async () => {
    const { toObserverSeat } = await import('../services/groundedAnswer');
    expect(toObserverSeat('the pawn kicks their knight off c6, so they spend a move while you gain one'))
      .toBe('the pawn kicks your knight off c6, so you spend a move while they gain one');
    expect(toObserverSeat('Your king is safe')).toBe('Their king is safe');
  });
});

describe('a move that opens a sentence is capitalised in words', () => {
  it('O-O and Bb5+ at the start; mid-sentence untouched', async () => {
    const { movesInWords } = await import('../utils/sanToSpeech');
    expect(movesInWords('O-O is fine. c3 is the engine choice.')).toBe('Castles kingside (O-O) is fine. c3 is the engine choice.');
    expect(movesInWords('Bb5+ is the best move. Then Nxe5 wins.')).toMatch(/^Bishop to b5 with check \(Bb5\+\) is the best move\. Then knight takes on e5 \(Nxe5\) wins\.$/);
    expect(movesInWords('play Nf3 here')).toBe('play knight to f3 (Nf3) here');
  });
});

describe('pass 1 (QGD, 1.d4 d5 2.c4 e6 3.Nc3 dxc4)', () => {
  const H = 'd4 d5 c4 e6 Nc3 dxc4'.split(' ');
  const b6 = () => { const c = new Chess(); for (const m of H) c.move(m); return { fen: c.fen(), history: H, studentColor: 'white' as const }; };
  it.each(['can i win the pawn back?', 'can I get my pawn back?', 'how do I win back the pawn', 'can I win the c4 pawn?'])('%s → win-piece on c4', (q) => {
    const t = readTurnInCode(q, b6());
    expect(t?.kind).toBe('win-piece');
    expect(t?.referents).toEqual([{ type: 'square', square: 'c4' }]);
  });
  it('the answer names the moves that open the bishop onto c4', async () => {
    const { answerWin } = await import('./chatTurnAnswers');
    const text = answerWin(new Chess(b6().fen), 'c4', 'w') ?? '';
    expect(text).toMatch(/^Not this move/);
    expect(text).toMatch(/\be3\b/);
    expect(text).toMatch(/\be4\b/);
    expect(text).toMatch(/bishop on f1/);
  });
  it('why did they take on c4: the capture is said once', async () => {
    const { assembleOpponentMoveAnswer } = await import('../services/groundedAnswer');
    const facts = assembleOpponentMoveAnswer({ fen: b6().fen, moveHistory: H, studentColor: 'white' })?.facts ?? '';
    expect(facts.match(/on c4/g)?.length).toBe(1);
  });
  it('"can I take on e5" is still a question about that move', () => {
    expect(readTurnInCode('can i take on c4?', b6())?.kind).toBe('candidate-move');
  });
});

it('pass 1: "Bxc4 now?" says why it is clearly worse — the d4 pawn the c6 knight hits', async () => {
  const { buildDeliberation, namedMoveAnswer } = await import('../services/deliberation');
  const c = new Chess(); for (const m of 'd4 d5 c4 e6 Nc3 dxc4 e4 Nc6'.split(' ')) c.move(m);
  const d = buildDeliberation({
    analysis: { topLines: [{ rank: 1, evaluation: 60, moves: ['g1f3'], mate: null }] },
    fenBefore: c.fen(), moverColor: 'w', opponentLastSan: 'Nc6',
    named: { lineUci: ['f1c4', 'c6d4'], evaluation: -120, mate: null },
  });
  const text = d ? namedMoveAnswer(d, 'is-it-good') ?? '' : '';
  expect(text).toMatch(/^Bxc4 is clearly worse than Nf3/);
  expect(text).toMatch(/leaves your pawn on d4 under fire from their knight on c6/);
});

describe('pass 2 (1.d4 Nf6 2.c4 d5 3.Nc3 Bf5)', () => {
  const H = 'd4 Nf6 c4 d5 Nc3 Bf5'.split(' ');
  const b = () => { const c = new Chess(); for (const m of H) c.move(m); return { fen: c.fen(), history: H, studentColor: 'white' as const }; };
  it.each(['can I attack the b7 pawn?', 'how do I go after their b7 pawn', 'what can I use to hit b7?'])('%s → attack-piece on b7', (q) => {
    const t = readTurnInCode(q, b());
    expect(t?.kind).toBe('attack-piece');
    expect(t?.referents).toEqual([{ type: 'square', square: 'b7' }]);
  });
  it('the attack answer names Qb3 bringing the queen onto b7', async () => {
    const { answerAttack } = await import('./chatTurnAnswers');
    expect(answerAttack(new Chess(b().fen), 'b7', 'w')).toMatch(/Qb3 brings your queen on d1 onto it/);
  });
  it('"should I take on d5?" with two captures weighs both, the pawn first', () => {
    const t = readTurnInCode('should I take on d5?', b());
    expect(t?.kind).toBe('compare-moves');
    expect(t?.referents).toEqual([{ type: 'move', san: 'cxd5' }, { type: 'move', san: 'Nxd5' }]);
  });
});

it('pass 2: "can I win their knight" and "can they attack my b2 pawn" read the actor, not the possessive', () => {
  const c = new Chess(); for (const m of 'd4 Nf6 c4 d5 Nc3 Bf5'.split(' ')) c.move(m);
  const b = { fen: c.fen(), history: 'd4 Nf6 c4 d5 Nc3 Bf5'.split(' '), studentColor: 'white' as const };
  expect(readTurnInCode('can I win their bishop?', b)?.kind).toBe('win-piece');
  expect(readTurnInCode('can they attack my b2 pawn?', b)?.kind).not.toBe('attack-piece');
});

describe('pass 2: a safety question about a pawn', () => {
  it('"is my c4 pawn safe?" is not a pawn-strength question', async () => {
    const { pawnStrengthAsk } = await import('./questionIntents');
    expect(pawnStrengthAsk('is my c4 pawn safe?')).toBeNull();
    expect(pawnStrengthAsk('is my d4 pawn weak?')).toEqual({ file: 'd' });
  });
  it('a model reading that drops the square takes the one the student typed', async () => {
    const c = coerceChatTurn({ kind: 'is-piece-loose', referents: [{ type: 'piece', piece: 'pawn', seat: 'me' }], seat: 'me' }, 'is my c4 pawn safe?');
    expect(c?.turn.referents[0]).toMatchObject({ type: 'piece', piece: 'p', square: 'c4' });
  });
});

describe('pass 2: a move only they can play', () => {
  const H = 'd4 e5 c4 exd4 Nc3 Bb4'.split(' ');
  const fenOf = () => { const c = new Chess(); for (const m of H) c.move(m); return c.fen(); };
  it('"what does Nc6 do?" is not read as your move, and is not refused as illegal', async () => {
    const { illegalNamedMove } = await import('../services/whyNotLegal');
    expect(readTurnInCode('what does Nc6 do?', { fen: fenOf(), history: H, studentColor: 'white' })).toBeNull();
    expect(illegalNamedMove('what does Nc6 do?', fenOf(), 'white', H)).toBeNull();
  });
  it('"can I play Nc6?" is still refused — the student said it is theirs', async () => {
    const { illegalNamedMove } = await import('../services/whyNotLegal');
    expect(illegalNamedMove('can I play Nc6?', fenOf(), 'white', H)).toMatch(/c6/);
  });
});

describe('pass 3 (1.e4 d5 2.Nf3 dxe4 3.d4 exf3)', () => {
  const H = 'e4 d5 Nf3 dxe4 d4 exf3'.split(' ');
  const b = () => { const c = new Chess(); for (const m of H) c.move(m); return { fen: c.fen(), history: H, studentColor: 'white' as const }; };
  it('"is Ng5 good?" is never swapped for Bg5', () => {
    const t = readTurnInCode('is Ng5 good here?', b());
    expect(t?.referents).not.toContainEqual({ type: 'move', san: 'Bg5' });
  });
  it.each(['did I just lose a pawn?', 'did I just hang something', 'have I lost a piece?'])('%s → material-change', (q) => {
    expect(readTurnInCode(q, b())?.kind).toBe('material-change');
  });
  it('says the knight was taken', async () => {
    const { answerMaterialChange } = await import('./chatTurnAnswers');
    expect(answerMaterialChange(H, 'w')).toBe('Yes — they took your knight on f3 with exf3.');
  });
  it('a trade is said as a trade', async () => {
    const { answerMaterialChange } = await import('./chatTurnAnswers');
    expect(answerMaterialChange('e4 d5 exd5 Qxd5'.split(' '), 'w')).toMatch(/^It was a trade: they took your pawn on d5 with Qxd5, and you took their pawn on d5 with exd5 — an even trade\.$/);
  });
});

describe('"stop what?" reads the coach\'s own last line', () => {
  const H = 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6'.split(' ');
  const fen = () => { const c = new Chess(); for (const m of H) c.move(m); return c.fen(); };
  const LINE = 'Play h3 first, to stop …Bg4.';
  it.each(['stop what?', 'what?', 'what do you mean?', 'how so?'])('%s → explain-last', (q) => {
    expect(readTurnInCode(q, { fen: fen(), history: H, studentColor: 'white', lastCoachLine: LINE })?.kind).toBe('explain-last');
  });
  it('without a last line it is not read this way', () => {
    expect(readTurnInCode('stop what?', { fen: fen(), history: H, studentColor: 'white' })?.kind).not.toBe('explain-last');
  });
  it('explains h3 and what …Bg4 would do — the pin on f3', async () => {
    const { answerExplainLast } = await import('./chatTurnAnswers');
    const text = answerExplainLast(new Chess(fen()), LINE, 'w', H) ?? '';
    expect(text).toMatch(/^h3 /);
    expect(text).toMatch(/If they get …Bg4 in, it pins the knight on f3 to the queen on d1\./);
  });
});

it('"what are they threatening?" names their next-move pin (…Bg4)', async () => {
  const { assembleThreatAnswer } = await import('../services/groundedAnswer');
  const c = new Chess(); for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6'.split(' ')) c.move(m);
  const facts = assembleThreatAnswer(c.fen(), 'what are they threatening?', 'white', 'opponent')?.facts ?? '';
  expect(facts).toMatch(/…Bg4 would pin the knight on f3 to the queen on d1/);
});

describe('walk 4 (Ruy Lopez, 1.e4 e5 2.Nf3 Nc6 3.Bb5 d6)', () => {
  const H = 'e4 e5 Nf3 Nc6 Bb5 d6'.split(' ');
  const b = () => { const c = new Chess(); for (const m of H) c.move(m); return { fen: c.fen(), history: H, studentColor: 'white' as const }; };
  it.each(['should I take the knight?', 'can I capture their knight', 'is taking the knight good?'])('%s → Bxc6', (q) => {
    const t = readTurnInCode(q, b());
    expect(t?.referents).toContainEqual({ type: 'move', san: 'Bxc6+' });
  });
  it('"take with the knight" keeps the knight as the mover', () => {
    expect(readTurnInCode('should I take with the knight?', b())?.referents ?? []).not.toContainEqual({ type: 'move', san: 'Bxc6+' });
  });
  it.each(['what are they threatening?', 'any threats?', 'what is the threat here?'])('%s → threats', (q) => {
    expect(readTurnInCode(q, b())?.kind).toBe('threats');
  });
});

it('walk 4: "what if I castle?" with the b5 bishop hanging says so, and never "fine" in a lost position', async () => {
  const { buildDeliberation, namedMoveAnswer } = await import('../services/deliberation');
  const c = new Chess(); for (const m of 'e4 d5 Nf3 dxe4 Bb5+ c6'.split(' ')) c.move(m);
  const d = buildDeliberation({
    analysis: { topLines: [{ rank: 1, evaluation: -280, moves: ['b5c4'], mate: null }] },
    fenBefore: c.fen(), moverColor: 'w', opponentLastSan: 'c6',
    named: { lineUci: ['e1g1', 'c6b5'], evaluation: -300, mate: null },
  });
  const text = d ? namedMoveAnswer(d, 'is-it-good') ?? '' : '';
  expect(text).not.toMatch(/is fine/);
  expect(text).toMatch(/leaves your (?:bishop on b5|knight on f3) under fire/);
});

it('walk 4: "should I take the knight?" with no knight in reach is a win-piece question', () => {
  const c = new Chess(); for (const m of 'e4 d5 Nf3 dxe4 Bb5+ c6'.split(' ')) c.move(m);
  const t = readTurnInCode('should I take the knight?', { fen: c.fen(), history: [], studentColor: 'white' });
  expect(t?.kind === 'win-piece' || t === null).toBe(true);
});
