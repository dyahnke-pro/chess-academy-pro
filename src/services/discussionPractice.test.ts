import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateMove, buildWhyPrompt, captureMisconception } from './discussionPractice';
import { classifyMisconception } from './misconceptionClassifier';
import { logMisconception } from './misconceptionService';

vi.mock('./misconceptionClassifier', () => ({ classifyMisconception: vi.fn() }));
vi.mock('./misconceptionService', () => ({ logMisconception: vi.fn() }));

const mockedClassify = vi.mocked(classifyMisconception);
const mockedLog = vi.mocked(logMisconception);
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

beforeEach(() => {
  mockedClassify.mockReset();
  mockedLog.mockReset();
});

describe('evaluateMove', () => {
  it('delegates to the slip detector', () => {
    const r = evaluateMove({ inBook: false, playedSan: 'Qh5', evalBeforeCp: 0, evalAfterCp: -150, learned: true });
    expect(r.isSlip).toBe(true);
  });
});

describe('buildWhyPrompt', () => {
  // CLEAN PROBE contract (David 2026-07-06, LOCKED): the question is IDENTICAL
  // for good and bad moves and carries ZERO board facts — no "steps away from
  // the main line" tell, no square/piece/tactic. The old leaky behavior
  // (left-book → "main line") was the exact contamination this rule forbids.
  it('is a clean neutral probe — identical regardless of the move, no leak', () => {
    const a = buildWhyPrompt({ isSlip: true, reason: 'left-book', severity: 'mistake', cpLoss: 120, shouldCount: true });
    const b = buildWhyPrompt({ isSlip: true, reason: 'eval-drop', severity: 'blunder', cpLoss: 250, shouldCount: true });
    expect(a).toBe(b);
    expect(a).toBe("Why'd you play that?");
    expect(a).not.toMatch(/main line|fork|hang|nice|good|blunder|[a-h][1-8]/i);
  });
});

describe('captureMisconception', () => {
  it('logs a real misconception on a counted line', async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'overvalued-attack', coachNote: 'The attack has no follow-up.' });
    mockedLog.mockResolvedValueOnce({ id: 'x' } as never);

    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Bxf7+', userReason: 'I wanted to attack the king' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN, playedSan: 'Bxf7+', openingId: 'ruy-lopez' },
    });

    expect(r.logged).toBe(true);
    expect(r.coachNote).toContain('follow-up');
    expect(mockedLog).toHaveBeenCalledOnce();
    expect(mockedLog.mock.calls[0][0].tag).toBe('overvalued-attack');
    expect(mockedLog.mock.calls[0][0].userReason).toBe('I wanted to attack the king');
  });

  it('logs an unlearned-line slip for DISPLAY, but marked counted=false', async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'hung-material', coachNote: 'The knight is undefended.' });
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Ng4' },
      source: 'discussion-practice',
      shouldCount: false,
      context: { fen: FEN, playedSan: 'Ng4' },
    });
    expect(r.coachNote).toContain('undefended');
    // Now it LOGS so it shows in Thinking Errors — but counted=false, so the
    // weakness analysis ignores it (the learned/count-against gate moved onto
    // the flag instead of dropping the already-classified slip on the floor).
    expect(mockedLog).toHaveBeenCalledOnce();
    expect(mockedLog.mock.calls[0][0].counted).toBe(false);
  });

  it("does not log when the move was actually fine (tag 'none')", async () => {
    mockedClassify.mockResolvedValueOnce({ tag: 'none', coachNote: 'A solid developing move.' });
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'Bb5' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN, playedSan: 'Bb5' },
    });
    expect(r.logged).toBe(false);
    expect(mockedLog).not.toHaveBeenCalled();
  });

  it('returns empty coachNote and does not log when classification fails', async () => {
    mockedClassify.mockResolvedValueOnce(null);
    const r = await captureMisconception({
      classifyInput: { fen: FEN, playedSan: 'a3' },
      source: 'discussion-practice',
      shouldCount: true,
      context: { fen: FEN },
    });
    expect(r.classification).toBeNull();
    expect(r.coachNote).toBe('');
    expect(r.logged).toBe(false);
  });
});

describe('buildSlipReveal — classification + best move + engine why (David 2026-07-10)', () => {
  it('names the severity, the best move, and the engine reasoning (fork)', async () => {
    const { buildSlipReveal } = await import('./discussionPractice');
    // White Nb5; the student shuffled the king (a blunder), best = Nc7+ forking
    // the e8-king and a8-rook. cpLoss huge → blunder.
    const reveal = buildSlipReveal({
      cpLoss: 600,
      fenBefore: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
      fenAfter: 'r3k3/8/8/1N6/8/8/8/5K2 b - - 1 1',
      moverColor: 'w',
      bestSan: 'Nc7+',
      bestPvSan: ['Nc7+'],
      evalCp: 500,
    });
    expect(reveal).toMatch(/blunder/i);
    expect(reveal).toMatch(/best move was Nc7/i);
    expect(reveal).toMatch(/forks the king on e8 and the rook on a8/i);
  });

  it('falls back to naming the best move when there is no PV', async () => {
    const { buildSlipReveal } = await import('./discussionPractice');
    const reveal = buildSlipReveal({
      cpLoss: 120,
      fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      moverColor: 'w',
      bestSan: 'Nf3',
    });
    expect(reveal).toMatch(/mistake/i);
    expect(reveal).toMatch(/best move was Nf3/i);
  });
});

describe('post-answer grading — the reason-aware lead-in (§4)', () => {
  it('acknowledges a material-grab reason, then delivers the truth as one sentence', async () => {
    const { withReasonLead } = await import('./discussionPractice');
    const out = withReasonLead('That was a blunder. The best move was Nf3.', 'To win material', 'chip');
    expect(out).toMatch(/^I see the grab —/);
    // the reveal's first word is lower-cased so it reads continuously.
    expect(out).toMatch(/grab — that was a blunder/i);
  });

  it('is honest + gentle on a Hint (they could not say), keeping the reveal capitalized', async () => {
    const { withReasonLead } = await import('./discussionPractice');
    const out = withReasonLead('That was a mistake.', '(could not say)', 'hint');
    expect(out).toMatch(/no worries/i);
    expect(out).toContain('That was a mistake.'); // capital kept — lead ends a sentence
  });

  it('maps each reason category to its own warm lead', async () => {
    const { gradeReasonLead } = await import('./discussionPractice');
    expect(gradeReasonLead('To attack the king', 'chip')).toMatch(/king/i);
    expect(gradeReasonLead('To develop a piece', 'chip')).toMatch(/development/i);
    expect(gradeReasonLead('To keep my king safe', 'chip')).toMatch(/safe/i);
    expect(gradeReasonLead('some typed nonsense', 'typed')).toMatch(/hear the idea/i);
  });
});
