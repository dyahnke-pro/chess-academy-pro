import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { answerIsLoose, answerCount, answerWhyTarget, answerAboutPiece, answerAttack, directAnswer } from './chatTurnAnswers';
import { readTurnInCode } from './chatTurnCodeReader';
import { EMPTY_CONVERSATION, type ResolvedChatTurn } from './chatTurn';

// White: Bb5 pins nothing here; Black knight c6 guarded by b7 and d7 pawns.
// After 1.e4 e5 2.Nf3 Nc6 3.Bb5: the c6-knight is attacked once (Bb5),
// defended by the b7 and d7 pawns.
const RUY = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
// White to move: the black knight on c6 hangs to the d4-knight? Use a clean
// loose piece: black knight on c6, no defenders, white bishop b5 attacks it.
const LOOSE = '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1';

const turn = (kind: ResolvedChatTurn['kind'], sq: string | null): ResolvedChatTurn => ({
  kind, seat: null, topic: null,
  referents: sq ? [{ type: 'square', square: sq }] : [],
});

describe('chat answers for the lesson\'s board questions (computed)', () => {
  it('is it loose: guarded, loose-and-attacked, and the student\'s own list', () => {
    expect(answerIsLoose(new Chess(RUY), 'c6', 'b')).toBe('Your knight on c6 is guarded.');
    expect(answerIsLoose(new Chess(LOOSE), 'c6', 'w')).toBe('Their knight on c6 is loose and attacked by the bishop on b5.');
    // No piece named: what can be WON leads (live walk B13 listed home-rank
    // rooks nothing attacked). The bishop on b5 takes the unguarded knight.
    expect(answerIsLoose(new Chess(LOOSE), null, 'b')).toMatch(/^Hanging: your knight on c6 — Bxc6\+: they come out ahead, a knight\./);
    // "which of THEIR pieces are loose?" lists theirs, not yours.
    expect(answerIsLoose(new Chess(LOOSE), null, 'w', 'them')).toMatch(/^Hanging: their knight on c6/);
    expect(answerIsLoose(new Chess(LOOSE), null, 'w', 'me')).toMatch(/^(Hanging: your|Nothing of yours can be taken at a profit)/);
    // A home-rank piece nothing attacks is never offered as news.
    expect(answerIsLoose(new Chess(), null, 'w')).toBe('Nothing of yours can be taken at a profit right now.');
  });

  it('counts attackers from the other side and defenders from its own', () => {
    expect(answerCount(new Chess(RUY), 'c6', 'b', 'attackers')).toBe('One attacks your knight on c6: their bishop on b5.');
    expect(answerCount(new Chess(RUY), 'c6', 'b', 'defenders')).toBe('Two defend your knight on c6: your pawn on b7 and pawn on d7.');
    expect(answerCount(new Chess(LOOSE), 'c6', 'w', 'defenders')).toBe('Nothing defends their knight on c6.');
  });

  it('says why a piece is (or is not) a target', () => {
    expect(answerWhyTarget(new Chess(LOOSE), 'c6', 'w')).toBe('Their knight on c6 is attacked by the bishop on b5 and nothing guards it.');
    expect(answerWhyTarget(new Chess(RUY), 'c6', 'b')).toMatch(/attacked 1 time and defended 2 times, so taking it does not win material yet/);
  });

  it('what about a piece: its safety, never a filler move count', () => {
    const t = answerAboutPiece(new Chess(LOOSE), 'b5', 'w') ?? '';
    expect(t).toMatch(/Your bishop on b5 /);
    expect(t).not.toMatch(/legal move/);
  });

  it('"how many defend it?" uses the piece the conversation was about', () => {
    const memory = { ...EMPTY_CONVERSATION, lastPiece: { piece: 'n' as const, square: 'c6', seat: 'me' as const } };
    expect(directAnswer(turn('count-defenders', null), RUY, memory, 'b')).toMatch(/^Two defend your knight on c6/);
    expect(directAnswer(turn('count-defenders', null), RUY, EMPTY_CONVERSATION, 'b')).toBeNull();
    expect(directAnswer(turn('plan', 'c6'), RUY, EMPTY_CONVERSATION, 'b')).toBeNull();
  });
});

describe('who controls an empty square — both sides (live replay 2026-10-08)', () => {
  it('"who controls e5?" counts White\'s knight against Black\'s three', () => {
    const c = new Chess();
    for (const m of 'e4 e6 Nf3 h6 Bc4 Bb4 O-O Ba5 d3 d6 c3 c5 Nbd2 Nf6 Re1 Nbd7 h3 Bc7 Bb3 O-O Bc4 Nh7 Bb3 Rb8 Bc4 b6 Bb3 Bb7 Bc4 d5 Bb3 Qf6 Bc4 dxc4 Nf1 cxd3 Ng3 d2'.split(' ')) c.move(m);
    const a = answerCount(c, 'e5', 'w', 'attackers');
    expect(a).toMatch(/^On e5: your knight on f3 against their /);
    expect(a).toMatch(/They control it\.$/);
  });
});

describe('attack, both directions (WO-CHAT-01, live walk B11/B12)', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 — White's bishop on c4.
  const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  it('"can they attack my bishop?" names every move onto it — a costly one with its proof', () => {
    const out: { lines?: Array<{ label: string }> } = {};
    const a = answerAttack(new Chess(ITALIAN), 'c4' as never, 'w', out as never) ?? '';
    expect(a).toMatch(/^They can attack your bishop on c4: .*Na5/);
    // …d5 hits the bishop but drops the pawn: kept, with the capture that wins it.
    // Its cost is PROVEN: the capture played out and counted by the ledger.
    expect(a).toMatch(/d5 also hits it, but your (?:pawn on e4|bishop on c4) can take it \((?:exd5|Bxd5)\) — you come out ahead: a pawn\./);
    expect(out.lines?.some((l) => /^d5 (?:exd5|Bxd5)$/.test(l.label))).toBe(true);
  });
  it('"what does Nc6 attack?" is read as a question about Nc6, the attacker', () => {
    const t = readTurnInCode('what does Nc6 attack?', { fen: ITALIAN, history: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], studentColor: 'white' });
    expect(t?.kind).toBe('what-about-piece');
    expect(t?.referents).toEqual([{ type: 'square', square: 'c6' }]);
  });
});

describe('what a piece attacks, when it attacks nothing (live replay B12)', () => {
  it('a pawn names the squares it covers', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    expect(answerAboutPiece(new Chess(fen), 'e5' as never, 'w')).toMatch(/It attacks nothing of yours right now; it covers d4 and f4\./);
  });
});

describe('the rule asked as "how do I…" (live replay B18)', () => {
  it('"how do I castle?" gets the castling rule, not a passage about castling early', async () => {
    const { answerRuleQuestion } = await import('../services/chessRules');
    expect(answerRuleQuestion('how do I castle?', null, 'w')?.facts).toMatch(/two squares toward a rook/);
    expect(answerRuleQuestion('how to promote a pawn', null, 'w')?.rule).toBe('promotion');
  });
  it('"what does exf3 attack?" is about the pawn on f3', () => {
    const fen = 'rnbqkbnr/ppp2ppp/8/8/2B5/5p2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const t = readTurnInCode('what does exf3 attack?', { fen, history: ['e4', 'd5', 'Nf3', 'dxe4', 'Bc4', 'exf3'], studentColor: 'white' });
    expect(t?.kind).toBe('what-about-piece');
    expect(t?.referents).toEqual([{ type: 'square', square: 'f3' }]);
  });
});
