import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  describeKidMove,
  sanitizeKidCoachText,
  generateKidMoveNarration,
  generateKidMoveInstruction,
  generateKidWrongMoveHint,
  answerKidGameQuestion,
} from './kidGameCoach';
import * as coachApi from './coachApi';
import * as liveTactics from './liveTacticsContext';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Position after 1.e4 e5 2.Bc4 Nc6 (White to move, the Scholar's-Mate setup).
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3';

describe('describeKidMove', () => {
  it('spells out a piece move with no SAN', () => {
    const t = describeKidMove(SCHOLAR, 'Qf3');
    expect(t).toContain('queen');
    expect(t).toContain('f3');
    expect(t).not.toMatch(/Qf3/);
  });

  it('describes a capture', () => {
    // After 1.e4 d5, White plays exd5 — a pawn capture.
    const afterD5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    const t = describeKidMove(afterD5, 'exd5');
    expect(t).toContain('pawn');
    expect(t).toContain('captures on d5');
  });

  it('names checkmate', () => {
    // Classic Scholar's mate: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#.
    const beforeMate = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const t = describeKidMove(beforeMate, 'Qxf7#');
    expect(t.toLowerCase()).toContain('checkmate');
    expect(t).not.toMatch(/Qxf7/);
  });

  it('returns empty for an illegal move so callers can fall back', () => {
    expect(describeKidMove(START, 'Qh5')).toBe(''); // queen can't reach h5 from start
  });
});

describe('sanitizeKidCoachText', () => {
  it('strips leaked SAN tokens', () => {
    expect(sanitizeKidCoachText('Play Nf3 to develop')).not.toMatch(/Nf3/);
    expect(sanitizeKidCoachText('Then Bxc4 wins')).not.toMatch(/Bxc4/);
    expect(sanitizeKidCoachText('It is Qf7# mate')).not.toMatch(/Qf7#/);
    expect(sanitizeKidCoachText('castle with O-O now')).not.toMatch(/O-O/);
  });

  it('keeps plain square names and prose', () => {
    const t = sanitizeKidCoachText('Move your bishop to c4 and aim at f7!');
    expect(t).toContain('c4');
    expect(t).toContain('f7');
    expect(t).toContain('bishop');
  });

  it('drops the no-key banner entirely', () => {
    expect(sanitizeKidCoachText('⚠️ No API key configured.')).toBe('');
    expect(sanitizeKidCoachText('No API key found')).toBe('');
  });

  it('caps length at a sentence boundary', () => {
    const long = 'This is the first idea. ' + 'word '.repeat(100) + 'end.';
    const out = sanitizeKidCoachText(long, 60);
    expect(out.length).toBeLessThanOrEqual(60);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeKidCoachText('')).toBe('');
  });
});

describe('generateKidMoveNarration', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns sanitized LLM prose when the call succeeds', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Your bishop slides out to aim at the weak square.');
    const out = await generateKidMoveNarration({
      fenBefore: SCHOLAR, san: 'Qf3', isPlayerMove: true,
      teachingConcept: 'attacking a weakness', authoredNarration: 'Bring the queen to f3!',
    });
    expect(out).toBe('Your bishop slides out to aim at the weak square.');
  });

  it('falls back to authored narration when the LLM leaks only SAN', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Qf3');
    const out = await generateKidMoveNarration({
      fenBefore: SCHOLAR, san: 'Qf3', isPlayerMove: true,
      authoredNarration: 'Bring the queen to f3!',
    });
    expect(out).toBe('Bring the queen to f3!');
  });

  it('falls back when the LLM rejects', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockRejectedValue(new Error('network'));
    const out = await generateKidMoveNarration({
      fenBefore: SCHOLAR, san: 'Qf3', isPlayerMove: true, authoredNarration: 'Bring the queen to f3!',
    });
    expect(out).toBe('Bring the queen to f3!');
  });

  it('falls back to authored when the no-key banner surfaces', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('⚠️ No API key configured.');
    const out = await generateKidMoveNarration({
      fenBefore: SCHOLAR, san: 'Qf3', isPlayerMove: true, authoredNarration: 'Bring the queen to f3!',
    });
    expect(out).toBe('Bring the queen to f3!');
  });

  it('trusts the script (returns authored) when the move is illegal/desynced', async () => {
    const spy = vi.spyOn(coachApi, 'getKidLlmResponse');
    const out = await generateKidMoveNarration({
      fenBefore: START, san: 'Qf3', isPlayerMove: true, authoredNarration: 'authored',
    });
    expect(out).toBe('authored');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('generateKidMoveInstruction', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns sanitized instruction prose on success', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Bring your queen out toward the middle of the board!');
    const out = await generateKidMoveInstruction({
      fenBefore: SCHOLAR, expectedSan: 'Qf3', teachingConcept: 'development', authored: 'Bring the queen to f3!',
    });
    expect(out).toContain('queen');
    expect(out).not.toMatch(/Qf3/);
  });

  it('falls back to authored instruction on failure', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockRejectedValue(new Error('x'));
    const out = await generateKidMoveInstruction({
      fenBefore: SCHOLAR, expectedSan: 'Qf3', authored: 'Bring the queen to f3!',
    });
    expect(out).toBe('Bring the queen to f3!');
  });

  it('trusts the script when the move is illegal', async () => {
    const spy = vi.spyOn(coachApi, 'getKidLlmResponse');
    const out = await generateKidMoveInstruction({ fenBefore: START, expectedSan: 'Qf3', authored: 'authored' });
    expect(out).toBe('authored');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('generateKidWrongMoveHint', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns sanitized encouragement on success', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Try bringing your queen toward the middle!');
    const out = await generateKidWrongMoveHint({
      fenBefore: SCHOLAR, expectedSan: 'Qf3', authoredResponse: 'Move the queen to f3!',
    });
    expect(out).toContain('queen');
  });

  it('falls back to authored response on failure', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockRejectedValue(new Error('x'));
    const out = await generateKidWrongMoveHint({
      fenBefore: SCHOLAR, expectedSan: 'Qf3', authoredResponse: 'Move the queen to f3!',
    });
    expect(out).toBe('Move the queen to f3!');
  });
});

describe('answerKidGameQuestion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Avoid the engine in node test env — board facts compute sync from the FEN.
    vi.spyOn(liveTactics, 'buildFedTacticsContext').mockResolvedValue({
      immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 2,
      boardFacts: undefined,
    });
  });

  it('returns a sanitized kid-safe answer', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Your knight guards the center — keep developing your pieces!');
    const out = await answerKidGameQuestion({
      question: 'what should I do?', fen: SCHOLAR, expectedNextSan: 'Qf3',
      gameTitle: "The Scholar's Surprise", history: [],
    });
    expect(out).toContain('knight');
    expect(out).not.toMatch(/Qf3/);
  });

  it('falls back to a safe canned line on failure', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockRejectedValue(new Error('down'));
    const out = await answerKidGameQuestion({
      question: 'why?', fen: SCHOLAR, gameTitle: 'Game', history: [],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/⚠️/);
  });

  it('strips a SAN leak from the answer', async () => {
    vi.spyOn(coachApi, 'getKidLlmResponse').mockResolvedValue('Play Qf3 next, it is strong.');
    const out = await answerKidGameQuestion({
      question: 'what now?', fen: SCHOLAR, gameTitle: 'Game', history: [],
    });
    expect(out).not.toMatch(/Qf3/);
  });
});
