import { describe, it, expect, vi } from 'vitest';
import { isSpokenSentenceGrounded, gradeNarrationText } from './coachAnswerGates';
import { logAppAudit } from './appAuditor';
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

// ── A GATE THAT CANNOT BE DIAGNOSED TEACHES NOTHING ───────────────────────
// A gate is a backup that should never fire (G0), so when one does the only
// useful question is which producer emitted a board-false sentence and WHAT IT
// SAID. The 2026-08-11 PostHog sweep found `CoachTeachPage.planMarks.narrationGate`
// tripping seven times in fourteen days with `narration_text` and `fen` both
// null — the summary carried a count, the refused text was nowhere, and the fen
// rode inside a `details` blob the analytics bridge does not forward for this
// kind. Seven real defects, none diagnosable from the only store that outlives
// a deploy.
describe('the gate reports what it refused', () => {
  // Kings only: "the knight on f6" cannot be true of this board, and the second
  // sentence names nothing, so exactly one sentence should be refused.
  const BARE = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
  const lastTrip = (): Record<string, unknown> | undefined => {
    const calls = vi.mocked(logAppAudit).mock.calls;
    for (let i = calls.length - 1; i >= 0; i--) {
      const a = calls[i][0] as Record<string, unknown>;
      if (a.kind === 'claim-validator-trip') return a;
    }
    return undefined;
  };

  it('carries the refused sentence in the field analytics forwards', () => {
    vi.mocked(logAppAudit).mockClear();
    const kept = gradeNarrationText('The knight on f6 is loose. Both kings are still at home.', BARE, 'testProducer');
    expect(kept ?? '', 'the false half survived').not.toContain('f6');
    const trip = lastTrip();
    expect(trip, 'no trip was logged for a refused sentence').toBeTruthy();
    expect(String(trip?.narrationText), 'the refused text is not reported')
      .toContain('knight on f6');
  });

  it('carries the board it judged against', () => {
    vi.mocked(logAppAudit).mockClear();
    gradeNarrationText('The knight on f6 is loose.', BARE, 'testProducer');
    expect(lastTrip()?.fen, 'a trip with no board cannot be reproduced').toBe(BARE);
  });

  it('names the producer, so a trip points at the code that caused it', () => {
    vi.mocked(logAppAudit).mockClear();
    gradeNarrationText('The knight on f6 is loose.', BARE, 'planMarks');
    expect(lastTrip()?.source).toBe('planMarks.narrationGate');
  });

  it('stays silent when every sentence is true', () => {
    vi.mocked(logAppAudit).mockClear();
    gradeNarrationText('Both kings are still at home.', BARE, 'testProducer');
    expect(lastTrip(), 'a gate that fires on true prose is worse than no gate').toBeUndefined();
  });
});
