import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { whyNotLegal } from './whyNotLegal';

const play = (s: string): string => { const c = new Chess(); for (const m of s.split(' ')) c.move(m); return c.fen(); };

describe('why the board refused the move', () => {
  it('a pinned knight: names the pinner', () => {
    // 1.e4 e5 2.Nc3 Nf6 3.d3 Bb4 — the c3-knight is pinned? No: e1 king, b4 bishop, c3 knight, d2 empty.
    const fen = play('e4 e5 Nc3 Nf6 d3 Bb4 Bg5 d6');
    // White to move; Nc3 is pinned to the king on e1 by the bishop on b4.
    expect(whyNotLegal(fen, 'b5', 'white')).toBe('Your knight on c3 is pinned — moving it would expose your king to their bishop on b4.');
  });
  it('not your turn', () => {
    expect(whyNotLegal(play('e4'), 'e5', 'white')).toMatch(/^It's their move/);
  });
  it('your own piece is on the square', () => {
    expect(whyNotLegal(new Chess().fen(), 'd2', 'white')).toMatch(/^d2 has your own pawn on it/);
  });
  it('a pawn cannot take an empty square', () => {
    expect(whyNotLegal(play('e4 a6'), 'd5', 'white')).toMatch(/nothing on d5 to take — a pawn moves diagonally only when it captures/);
  });
  it('in check: the move does not get out of it', () => {
    const fen = play('e4 e5 f4 Qh4+');
    expect(whyNotLegal(fen, 'f3', 'white')).toBe('Your king is in check from their queen on h4, and neither your queen nor your knight going to f3 gets it out.');
  });
  it('nothing reaches it', () => {
    expect(whyNotLegal(new Chess().fen(), 'e5', 'white')).toBe('None of your pieces can reach e5 from where they stand.');
  });
  it('a legal move has no complaint', () => {
    expect(whyNotLegal(new Chess().fen(), 'e4', 'white')).toBeNull();
  });
});

// ── THE SAME QUESTION, ANY WORDING (David 2026-10-09: "Root cause fixes.
// These need to hold up to different wording and other variables.") ─────────
import { illegalNamedMove } from './whyNotLegal';

const PIN_LINE = ['e4', 'e5', 'Nc3', 'Nf6', 'd3', 'Bb4', 'Bg5', 'd6'];
const PIN = play(PIN_LINE.join(' '));

describe('a refused move is explained whatever the wording', () => {
  it.each([
    "It's not letting me play Nb5",
    'why won\'t it let me move my knight to b5',
    'nb5 doesn\'t work?',
    'Is nb5 ok?',
    'can i play knight b5',
    "Why can't my night go to b5",
    'knight to b 5 isnt allowed??',
    'what about Nb5',
    'I tried Nd5 but it wont move',
    'Nxb5?',
  ])('%s', (q) => {
    expect(illegalNamedMove(q, PIN, 'white', PIN_LINE)).toMatch(/knight on c3 is pinned — moving it would expose your king to their bishop on b4/);
  });

  it.each([
    "what's on d5?",
    'what if they play Bxc3',
    'Is Bxf6 good?',
    'Why is d6 best?',
    "How's the position?",
    'My knight to e2 earlier, was that good?',
  ])('says nothing when no refused move is named: %s', (q) => {
    expect(illegalNamedMove(q, PIN, 'white', PIN_LINE)).toBeNull();
  });

  it('a piece that does not move that way, or is blocked, is said so', () => {
    expect(illegalNamedMove('is qf3 ok?', new Chess().fen(), 'white')).toBe('Queen to f3 is not possible: your queen on d1 is blocked by your pawn on e2.');
    expect(illegalNamedMove('can my bishop go to d3?', new Chess().fen(), 'white')).toBe('Bishop to d3 is not possible: your bishop on f1 is blocked by your pawn on e2.');
  });

  const CASTLE_LINE = ['e4', 'e5', 'Nf3', 'Nc6'];
  const NO_CASTLE = play(CASTLE_LINE.join(' '));
  it.each(['can I castle?', 'castle?', "why won't it let me castle", 'O-O?', 'o-o', 'Castling kingside possible?'])('castling, any wording: %s', (q) => {
    expect(illegalNamedMove(q, NO_CASTLE, 'white', CASTLE_LINE)).toMatch(/cannot castle kingside yet — your bishop on f1 is still in the way/);
  });
  it('castling that is legal is no refusal', () => {
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    expect(illegalNamedMove('can I castle?', play(line.join(' ')), 'white', line)).toBeNull();
  });
});
