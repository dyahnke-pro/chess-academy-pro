import { describe, it, expect, vi } from 'vitest';
import { isSpokenSentenceGrounded } from './coachAnswerGates';
import type { TacticsLiveContext } from '../coach/types';

// The gate logs fire-and-forget audits; silence them in the test.
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(async () => {}) }));

const CTX_NO_TACTICS: TacticsLiveContext = {
  immediate: [],
  hanging: [],
  threats: [],
  opportunities: [],
  lookaheadDepth: 4,
};

// groundCoachReply tests DELETED with the function (David 2026-07-09 — "finish
// ripping"). The real-time SPOKEN-sentence gate (isSpokenSentenceGrounded) is
// the surviving tactic check; VoiceChatMic still uses it.
describe('isSpokenSentenceGrounded — tactic gate on the SPOKEN path (David 2026-06-16)', () => {
  const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('BLOCKS a spoken sentence claiming an out-of-vocab tactic', () => {
    // The false "knight fork" — not in the (empty) tactics context.
    expect(isSpokenSentenceGrounded("That's a knight fork winning the rook.", FEN, 'test', CTX_NO_TACTICS)).toBe(false);
  });

  it('ALLOWS a spoken sentence with no tactic claim', () => {
    expect(isSpokenSentenceGrounded('Develop your pieces toward the center.', FEN, 'test', CTX_NO_TACTICS)).toBe(true);
  });

  it('ALLOWS when no tactics context is supplied (board-only gate, prior behavior)', () => {
    expect(isSpokenSentenceGrounded("There's a fork coming.", FEN, 'test')).toBe(true);
  });
});

describe('gradeNarrationAcrossLine — branch-aware second chance (C5, 2026-08-06)', async () => {
  const { gradeNarrationAcrossLine } = await import('./coachAnswerGates');
  const { Chess } = await import('chess.js');

  // Italian shape: e4 e5 Nf3 Nc6 Bc4 — the line's own positions.
  const lineFens = (() => {
    const c = new Chess();
    const fens = [c.fen()];
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) {
      c.move(san);
      fens.push(c.fen());
    }
    return fens;
  })();

  // NB: fixtures must avoid the FUTURE_MARKER words (if/after/then/…) — a
  // sentence carrying one is skipped by the BASE gate and never reaches the
  // branch replay. The C5 casualties are hypotheticals phrased in PRESENT
  // tense ("Black plays Bc5, and the bishop on c5 …").

  it('keeps a claim true only on a HYPOTHETICAL branch the sentence names', () => {
    // Bc5 is never ON this line, so the bishop-on-c5 claim is false at every
    // line position; replaying the sentence's own named move makes it true.
    // The pre-C5 gate deleted exactly this class.
    const text = 'Black meets this with Bc5, and the bishop on c5 targets the f2 pawn.';
    const kept = gradeNarrationAcrossLine(text, lineFens, 'test.c5');
    expect(kept).toContain('Bc5');
  });

  it('still drops a claim false on the line AND on every named branch', () => {
    // e1 holds the white KING at every position on this line, and the named
    // Bc5 branch does not change that. (A claim about an EMPTY square is
    // deliberately not "provably false" — planning language — so the fixture
    // must name an occupied square.)
    const text = 'Black meets this with Bc5, and the queen on e1 dominates the board.';
    const kept = gradeNarrationAcrossLine(text, lineFens, 'test.c5');
    expect(kept ?? '').not.toContain('queen on e1');
  });

  it('sentences true on the line itself are untouched', () => {
    const text = 'The knight on f3 supports the centre. The bishop on c4 eyes f7.';
    expect(gradeNarrationAcrossLine(text, lineFens, 'test.c5')).toBe(text);
  });
});
