/**
 * HALLUCINATION AUDIT — MARKER SAFETY + GENERATOR GATE (pass 11)
 * =============================================================
 * David: "make each test harder than the last."
 *
 * (A) MARKER SAFETY — a coach reply interleaves prose with directive markers
 *     ([BOARD: arrow:e4-f6:green], [[ACTION: navigate]], [CHOICES: ...]) that
 *     carry square-like tokens. The gate must strip a PROSE lie without
 *     mangling a marker, and must NOT treat a square inside a marker as a
 *     board claim. Breaking a marker would corrupt arrows/actions the UI runs.
 * (B) GENERATOR GATE — the offline content generators (openingGenerator,
 *     walkthroughLlmNarrator, middlegamePlanner) gate per-move narration via
 *     gradeNarrationText, not groundCoachReply. A generated board lie must be
 *     dropped there too (one gate, no drift).
 */
import { describe, it, expect } from 'vitest';
import { groundCoachReply, gradeNarrationText } from './coachAnswerGates';

const BUG_FEN = 'r1b1kbnr/pp3ppp/1qn1p3/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 3 6'; // f6 empty, c6 black knight

describe('HALLUCINATION AUDIT pass 11A — marker safety', () => {
  it('strips a prose board lie but leaves an adjacent [BOARD: arrow] marker intact', () => {
    const text = 'The knight on f6 covers e4. [BOARD: arrow:c6-d4:green] Keep the tension.';
    const r = groundCoachReply(text, { fen: BUG_FEN, source: '/audit/marker' });
    expect(r).not.toMatch(/knight on f6/i);                  // prose lie gone
    expect(r).toMatch(/\[BOARD:\s*arrow:c6-d4:green\]/);     // marker untouched
    expect(r).toMatch(/Keep the tension/i);
  });

  it('does NOT treat a square INSIDE a marker as a board claim', () => {
    // f6 appears only inside the arrow marker; there is no prose lie, so the
    // reply must pass through unchanged (no phantom "f6 is empty" strip).
    const text = 'Develop with tempo. [BOARD: arrow:g8-f6:green]';
    const r = groundCoachReply(text, { fen: BUG_FEN, source: '/audit/marker' });
    expect(r).toMatch(/Develop with tempo/i);
    expect(r).toMatch(/\[BOARD:\s*arrow:g8-f6:green\]/);
  });

  it('preserves an [[ACTION:]] marker while stripping a neighbouring lie', () => {
    const text = "Solid. The rook on f6 dominates. [[ACTION: navigate /coach/play]]";
    const r = groundCoachReply(text, { fen: BUG_FEN, source: '/audit/marker' });
    expect(r).not.toMatch(/rook on f6/i);
    expect(r).toMatch(/\[\[ACTION:\s*navigate \/coach\/play\]\]/);
  });

  it('keeps a TRUE board claim that sits right next to a marker', () => {
    const text = 'The knight on c6 hits d4. [BOARD: arrow:c6-d4:green] Press the centre.';
    const r = groundCoachReply(text, { fen: BUG_FEN, source: '/audit/marker' });
    expect(r).toMatch(/knight on c6/i);  // c6 IS a black knight → kept
    expect(r).toMatch(/\[BOARD:\s*arrow:c6-d4:green\]/);
  });
});

describe('HALLUCINATION AUDIT pass 11B — generator gate (gradeNarrationText)', () => {
  it('drops a generated board lie (one gate shared with the live path)', () => {
    const out = gradeNarrationText('The bishop on d5 rakes the long diagonal.', BUG_FEN, 'openingGenerator');
    expect(out ?? '').not.toMatch(/bishop on d5/i);  // d5 empty → dropped
  });

  it('keeps a generated TRUE claim', () => {
    const out = gradeNarrationText('The knight on c6 pressures d4.', BUG_FEN, 'middlegamePlanner');
    expect(out).toMatch(/knight on c6/i);
  });

  it('drops a generated eval lie when an engine eval is supplied', () => {
    const out = gradeNarrationText('White is completely winning here.', BUG_FEN, 'walkthroughLlmNarrator', -650);
    expect(out ?? '').not.toMatch(/winning/i);
  });

  it('passes a generated line through untouched when there is no board to check', () => {
    const out = gradeNarrationText('A flexible setup that keeps options open.', BUG_FEN, 'openingGenerator');
    expect(out).toMatch(/flexible setup/i);
  });
});
