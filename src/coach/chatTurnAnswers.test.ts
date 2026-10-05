import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { answerIsLoose, answerCount, answerWhyTarget, answerAboutPiece, directAnswer } from './chatTurnAnswers';
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
    expect(answerIsLoose(new Chess(LOOSE), null, 'b')).toMatch(/^Loose: your knight on c6/);
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

  it('what about a piece: its safety and how many moves it has', () => {
    expect(answerAboutPiece(new Chess(LOOSE), 'b5', 'w')).toMatch(/Your bishop on b5 .* It has \d+ legal moves\./);
  });

  it('"how many defend it?" uses the piece the conversation was about', () => {
    const memory = { ...EMPTY_CONVERSATION, lastPiece: { piece: 'n' as const, square: 'c6', seat: 'me' as const } };
    expect(directAnswer(turn('count-defenders', null), RUY, memory, 'b')).toMatch(/^Two defend your knight on c6/);
    expect(directAnswer(turn('count-defenders', null), RUY, EMPTY_CONVERSATION, 'b')).toBeNull();
    expect(directAnswer(turn('plan', 'c6'), RUY, EMPTY_CONVERSATION, 'b')).toBeNull();
  });
});
