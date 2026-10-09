import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { ruleAsked, answerRuleQuestion } from './chessRules';
import { illegalNamedMove } from './whyNotLegal';

const play = (s: string): string => { const c = new Chess(); for (const m of s.split(' ')) c.move(m); return c.fen(); };

describe('which rule a question asks', () => {
  it('reads the replay questions and their spellings', () => {
    expect(ruleAsked('What is en passant?')).toBe('en-passant');
    expect(ruleAsked('what is en pasant')).toBe('en-passant');
    expect(ruleAsked('how does castling work')).toBe('castling');
    expect(ruleAsked('what is stalemate')).toBe('stalemate');
    expect(ruleAsked('what is checkmate')).toBe('checkmate');
    expect(ruleAsked('what is the fifty move rule')).toBe('fifty-move');
  });
  it('a move that gives check, or no rule at all, is not a rules question', () => {
    expect(ruleAsked('is Qh5 check good?')).toBeNull();
    expect(ruleAsked("what's the best move?")).toBeNull();
    expect(ruleAsked('castle')).toBeNull();
  });
});

describe('the rule on this board', () => {
  it('en passant: says when it is available and names the capture', () => {
    const fen = play('e4 a6 e5 d5');
    const a = answerRuleQuestion('What is en passant?', fen, 'w');
    expect(a?.facts).toMatch(/^En passant is a pawn capture/);
    expect(a?.facts).toMatch(/pawn on e5 can take on d6 \(exd6\)/);
  });
  it('en passant: says honestly when it is not', () => {
    expect(answerRuleQuestion('what is en passant', new Chess().fen(), 'w')?.facts).toMatch(/no en passant capture available/);
  });
  it('castling: names exactly why not, wing by wing', () => {
    const fen = play('e4 e5 Nf3 Nc6');
    const a = { facts: illegalNamedMove("why can't I castle?", fen, 'white', ['e4', 'e5', 'Nf3', 'Nc6']) };
    expect(a?.facts).toMatch(/cannot castle kingside yet — f1 is still occupied/);
    expect(a?.facts).toMatch(/cannot castle queenside yet — b1 and c1 and d1 are still occupied/);
  });
  it('castling: a moved king loses the right', () => {
    const fen = play('e4 e5 Ke2 Ke7 Ke1 Ke8');
    expect(illegalNamedMove('can I castle?', fen, 'white')).toMatch(/can no longer castle kingside — the king or the h-rook has already moved/);
  });
  it('castling: an attacked crossing square stops it', () => {
    // White king e1, rook h1, Black rook on f8 with the f-file open.
    const fen = '4kr2/8/8/8/8/8/8/4K2R w K - 0 1';
    expect(illegalNamedMove('can I castle?', fen, 'white')).toMatch(/cross or land on f1, which the enemy attacks/);
  });
});

describe('a rule is recognised whatever the wording', () => {
  it.each([
    ['en passant?', 'en-passant'], ['En passant', 'en-passant'], ['en passant confuses me', 'en-passant'],
    ['how does it work, en passant', 'en-passant'], ['tell me about en pasant', 'en-passant'], ['explain en passant pls', 'en-passant'],
    ['stalemate??', 'stalemate'], ['i dont get stalemate', 'stalemate'],
    ['promotion', 'promotion'], ['what can a pawn promote to', 'promotion'],
    ['threefold repetition', 'repetition'], ['50 move rule', 'fifty-move'],
    ['how does castling work', 'castling'], ['castling rules', 'castling'], ['explain castling', 'castling'],
    ['what does checkmate mean', 'checkmate'], ['define check', 'check'],
  ])('%s', (q, rule) => { expect(ruleAsked(q)).toBe(rule); });

  it.each(['castle here?', 'Probably just castle here right', 'is that check?', 'Qh5 is mate in 2', 'can I castle?', 'I promoted on e8, was that right?'])(
    'a move, not the rule: %s', (q) => { expect(ruleAsked(q)).toBeNull(); },
  );
});
