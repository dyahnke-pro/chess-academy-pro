// THE THREE THINGS DAVID'S 2026-08-16 PROD GAME PROVED WERE BROKEN.
//
// He played a full game on the Learn surface and reported two things: the
// narration called out pieces that were not on the board, and the opponent
// "played way better than I was". His 300-event audit log carried the evidence
// for both, plus a third defect neither of us had noticed. All three are the
// same shape — a value computed correctly and then not delivered — and all
// three passed every existing test, because each of those tests supplied its
// own inputs and never asked whether the real ones arrive.
//
// So these assertions use HIS boards and HIS spoken sentences, verbatim from
// the log.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';
import { COACH_TURN_DEPTH, limitStrengthElo } from './engineConstants';

const ROOT = resolve(__dirname, '../..');
const src = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

// ── 1. THE WRONG PIECES ──────────────────────────────────────────────────────
// Findings 206/207, 255/256 and 68/72: spoken aloud, over a rook endgame, by
// the concept tier ("As a rule in these positions: …").
const ROOK_ENDING = '6k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/5RK1 w - - 0 27';
const ROOK_ENDING_2 = '3r2k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/3R1RK1 w - - 4 26';

describe('borrowed teaching may not name pieces the board does not have', () => {
  it('the boards really are knight-free and bishop-free (guards the guard)', () => {
    for (const fen of [ROOK_ENDING, ROOK_ENDING_2]) {
      const types = new Set(new Chess(fen).board().flat().filter(Boolean).map((p) => p!.type));
      expect([...types].sort()).toEqual(['k', 'p', 'q', 'r']);
    }
  });

  it.each([
    ['F207', ROOK_ENDING, 'The knight presses the pawn, but pushing it forward hands the opponent a blockade on the dark squares, where bishop and rook can trap the queen.'],
    ['F256', ROOK_ENDING_2, 'The bishop pins the rook to the king, so Black cannot trade rooks without losing the f-pawn.'],
  ])('%s is refused now', (_id, fen, spoken) => {
    const v = validateBoardClaims(spoken, fen, { requireNamedPiecesPresent: true });
    expect(v.violations.map((x) => x.kind)).toContain('piece-absent');
    expect(stripDisprovenSentences(spoken, fen, {
      strictHypotheticals: true, requireNamedPiecesPresent: true,
    }).clean).toBe('');
  });

  it('was NOT refused before — the option is what changed, not the sentence', () => {
    // Without the flag these sail through, which is exactly what happened: the
    // gate is square-anchored, and neither sentence names a square.
    for (const [fen, spoken] of [
      [ROOK_ENDING, 'The knight presses the pawn and the bishop can trap the queen.'],
      [ROOK_ENDING_2, 'The bishop pins the rook to the king.'],
    ] as const) {
      expect(validateBoardClaims(spoken, fen, { strictHypotheticals: true }).violations).toEqual([]);
    }
  });

  it('does not muzzle a piece that IS there', () => {
    // Over-blocking would be its own bug: the tier goes quiet and the coach
    // teaches less than the corpus knows. Rooks and queens are on this board.
    const fine = 'Trade the rooks and the queen has nothing to attack.';
    expect(stripDisprovenSentences(fine, ROOK_ENDING, {
      strictHypotheticals: true, requireNamedPiecesPresent: true,
    }).clean).toBe(fine);
    // And a knight sentence on a board WITH knights is still teaching.
    const opening = new Chess().fen();
    expect(validateBoardClaims('The knight eyes the outpost.', opening, {
      requireNamedPiecesPresent: true,
    }).violations).toEqual([]);
  });

  it('is wired into the borrowed chokepoint, not just available', () => {
    // The defect this whole file exists for is a capability that shipped and
    // was never called. `namedPiecesExistOnBoard` had asked this question since
    // 2026-08-05 — of the wrong field, at the wrong moment.
    const gate = src('src/services/coachAnswerGates.ts');
    const borrowed = gate.slice(gate.indexOf('export function gradeBorrowedTeaching'));
    expect(borrowed).toMatch(/requireNamedPiecesPresent:\s*true/);
  });
});

// ── 2. THE OPPONENT'S STRENGTH ───────────────────────────────────────────────
// `elo=1237` in his log sat next to a search that was never told an Elo.
describe('the coach opponent is told the rating it is supposed to play at', () => {
  const engine = src('src/services/coachGameEngine.ts');

  it('every opponent-move search passes targetElo to the engine', () => {
    const calls = [...engine.matchAll(/stockfishEngine\.getBestMove\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(0);          // guards the guard
    for (const args of calls) {
      // fen, movetime, skill, targetElo — four, not three.
      expect(args.split(',').length).toBeGreaterThanOrEqual(4);
      expect(args).toContain('targetElo');
    }
  });

  it('the Play surfaces pass it too', () => {
    for (const rel of ['src/services/coachPlaySession.ts', 'src/components/Coach/CoachGamePage.tsx']) {
      const calls = [...src(rel).matchAll(/getBestMove\(([^)]*config\.skill[^)]*)\)/g)].map((m) => m[1]);
      expect(calls.length).toBeGreaterThan(0);
      for (const args of calls) expect(args).toContain('config.targetElo');
    }
  });

  it('the engine arms UCI_LimitStrength only when it was given an Elo', () => {
    const eng = src('src/services/stockfishEngine.ts');
    const fn = eng.slice(eng.indexOf('async getBestMove('), eng.indexOf('queueAnalysis('));
    expect(fn).toMatch(/UCI_LimitStrength value true/);
    expect(fn).toMatch(/UCI_LimitStrength value false/);   // and disarms it otherwise
    expect(fn).toMatch(/UCI_Elo value \$\{limitStrengthElo\(targetElo\)\}/);
  });

  it('the audit prints the Elo the engine got, not the one we wished for', () => {
    // 1237 is below Stockfish's floor. The old line printed 1237 anyway, which
    // is how the dead wire stayed invisible.
    expect(limitStrengthElo(1237)).toBe(1320);
    expect(limitStrengthElo(1729)).toBe(1729);
    expect(limitStrengthElo(9999)).toBe(3190);
    expect(engine).toMatch(/source=stockfish-timed[^`]*limitStrengthElo\(targetElo\)/);
  });
});

// ── 3. ONE BOARD, ONE BEST MOVE ──────────────────────────────────────────────
// The hint lane said Kg2 (depth 12); the capture lane logged bestSan=Qc3
// (depth 14) for the same FEN, and the capture is what feeds My Mistakes.
describe('the hint lane and the grading lane read the turn at one depth', () => {
  it('both import the shared constant', () => {
    expect(src('src/components/Coach/CoachTeachPage.tsx')).toContain('COACH_TURN_DEPTH');
    expect(src('src/hooks/useDiscussionPractice.ts')).toContain('COACH_TURN_DEPTH');
  });

  it('no per-lane depth literal is left in the turn path', () => {
    const page = src('src/components/Coach/CoachTeachPage.tsx');
    // `analyzeWithBudget(fen, <number>, budget)` — a bare number here is a lane
    // choosing its own depth again, which is the whole defect.
    const literals = [...page.matchAll(/analyzeWithBudget\([^,]+,\s*(\d+)\s*,/g)].map((m) => m[1]);
    expect(literals).toEqual([]);
  });

  it('grades at least as deep as it advises', () => {
    // If these ever split again, the grading read must not be the shallower
    // one: the student may be marked wrong only by a search at least as good
    // as the one that gave the advice.
    expect(COACH_TURN_DEPTH).toBeGreaterThanOrEqual(14);
  });
});
