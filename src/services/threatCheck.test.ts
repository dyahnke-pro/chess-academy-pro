import { describe, it, expect } from 'vitest';
import { buildThreatCheckQuestion, judgeThreatCheckPick } from './threatCheck';

// The Learn-surface "which of your pieces is in danger?" question (David
// 2026-07-11). Target + decoys computed with chess.js; the QUESTION carries
// no piece and no square (honesty contract rule 1).

// Black knight on d5 attacked by the e3-pawn(? no) — use a clean case:
// White to move next is irrelevant; the STUDENT is black, black knight on e5
// is attacked by the d4-pawn(?) — simplest: white pawn d4 attacks e5/c5.
// Position: black knight e5 attacked by pawn on d4, undefended. Black also
// has queen d8, rook a8, bishop c8 etc. as decoys. Black to move.
const HANGING_KNIGHT_FEN = 'rnbqkb1r/pppp1ppp/8/4n3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3';

describe('buildThreatCheckQuestion', () => {
  it('targets the hanging student piece; the question leaks no piece or square', () => {
    const q = buildThreatCheckQuestion(HANGING_KNIGHT_FEN, 'b');
    expect(q).not.toBeNull();
    expect(q!.answer).toBe('knight on e5');
    expect(q!.answerSquare).toBe('e5');
    // Rule 1 — the probe carries zero board facts.
    expect(q!.question).not.toMatch(/knight/);
    expect(q!.question).not.toMatch(/e5/);
    // The chips give a real choice, sorted by square (non-leaking order).
    expect(q!.options.length).toBeGreaterThanOrEqual(3);
    expect(q!.options).toContain('knight on e5');
    const squares = q!.options.map((o) => o.split(' on ')[1]);
    expect([...squares].sort()).toEqual(squares);
    // The reveal names the piece + the instruction.
    expect(q!.reveal).toContain('knight on e5');
  });

  it('returns null when no student piece hangs (empty > generic > invented)', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(buildThreatCheckQuestion(start, 'w')).toBeNull();
    expect(buildThreatCheckQuestion(start, 'b')).toBeNull();
  });

  it('ignores the OPPONENT\'s hanging pieces — the question is about the student\'s danger', () => {
    // Same position, but the student is WHITE — the hanging piece is black's.
    const q = buildThreatCheckQuestion(HANGING_KNIGHT_FEN, 'w');
    expect(q).toBeNull();
  });

  it('returns null on an unparseable FEN', () => {
    expect(buildThreatCheckQuestion('not a fen', 'w')).toBeNull();
  });
});

describe('judgeThreatCheckPick', () => {
  it('grades the pick against the computed answer', () => {
    const q = buildThreatCheckQuestion(HANGING_KNIGHT_FEN, 'b')!;
    expect(judgeThreatCheckPick(q, 'knight on e5')).toBe(true);
    const wrong = q.options.find((o) => o !== q.answer)!;
    expect(judgeThreatCheckPick(q, wrong)).toBe(false);
  });
});
