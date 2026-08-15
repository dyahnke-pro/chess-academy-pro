// The computed narration tier, gated on the two ways it went wrong.
//
// Both were found by READING a walk rather than by a percentage, and both are
// the same species of error the farmed corpus died of: a sentence that is
// true of something other than the move it is spoken on. The difference is
// that a computed sentence can be fixed at the computer, which is why these
// are assertions about `assembleMovePurpose` and not a filter over its output.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assembleMovePurpose } from './groundedAnswer';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { gradeNarrationText } from './coachAnswerGates';

/** Play a line and hand back each ply's computed purpose, exactly as the
 *  walkthrough assembles it — tactics diffed against the previous position. */
function walk(pgn: string): Array<{ ply: number; san: string; fen: string; text: string }> {
  const board = new Chess();
  const out: Array<{ ply: number; san: string; fen: string; text: string }> = [];
  for (const san of pgn.split(' ')) {
    const fenBefore = board.fen();
    const moverColor: 'white' | 'black' = board.turn() === 'w' ? 'white' : 'black';
    board.move(san);
    const side = moverColor === 'white' ? 'w' : 'b';
    const after = buildTacticsLiveContext(board.fen(), null, side, 1500);
    const before = buildTacticsLiveContext(fenBefore, null, side, 1500);
    const was = new Set([...before.immediate, ...before.opportunities].map((t) => t.description));
    const purpose = assembleMovePurpose({
      fenBefore,
      san,
      moverColor,
      tactics: {
        ...after,
        immediate: after.immediate.filter((t) => !was.has(t.description)),
        opportunities: after.opportunities.filter((t) => !was.has(t.description)),
      },
    });
    out.push({
      ply: board.history().length, san, fen: board.fen(), text: purpose?.facts ?? '',
    });
  }
  return out;
}

const RUY = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7';
const CARO = 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3';

describe('computed narration speaks about the move it is spoken on', () => {
  it('every ply says something', () => {
    // The tier exists to end the silence, so a silent ply is a failure of it.
    // `Nxe4` went silent once already: the capture read "takes the pawn on e4"
    // and the board gate — correctly — refused a sentence putting a pawn on a
    // square now occupied by the knight that took it.
    for (const pgn of [RUY, CARO]) {
      for (const step of walk(pgn)) {
        expect(step.text.trim().length, `ply ${step.ply} (${step.san}) said nothing`)
          .toBeGreaterThan(0);
      }
    }
  });

  it('every ply survives the board-truth gate intact', () => {
    for (const pgn of [RUY, CARO]) {
      for (const step of walk(pgn)) {
        const graded = gradeNarrationText(step.text, step.fen, 'computedNarrationTruth');
        expect(graded?.trim(), `ply ${step.ply} (${step.san}) was refused: "${step.text}"`)
          .toBeTruthy();
      }
    }
  });

  it('never repeats one tactic as the point of move after move', () => {
    // THE DEFECT THIS EXISTS FOR. Handed the raw tactics context, the Ruy
    // announced "bishop on a4 skewers knight on c6" as the point of Ba4, then
    // Nf6, then O-O, then Be7, then Re1 — one unchanged fact, five moves, none
    // of them its cause. A tactic may only be spoken by the move that CREATED
    // it, so the same point twice in a row is the bug returning.
    for (const pgn of [RUY, CARO]) {
      const points = walk(pgn)
        .map((s) => /The point: ([^.]+)\./.exec(s.text)?.[1] ?? null);
      const seen = new Map<string, number>();
      points.forEach((p, i) => {
        if (!p) return;
        const prev = seen.get(p);
        expect(prev, `"${p}" was the point at ply ${(prev ?? 0) + 1} and again at ply ${i + 1}`)
          .toBeUndefined();
        seen.set(p, i + 1);
      });
    }
  });

  it('a capture is described as a capture', () => {
    // `dxe4` once came out as "the pawn goes to e4, staking out space in the
    // center" — a quiet advance, with the capture gone. The geometry describer
    // owns neither captures nor castling, and the fallbacks behind it spoke
    // about the destination square instead of the move.
    const caro = walk(CARO);
    for (const step of caro.filter((s) => s.san.includes('x'))) {
      expect(step.text, `${step.san} was not described as a capture: "${step.text}"`)
        .toMatch(/captures on|takes/);
    }
  });

  it('castling is described as castling, not as a king move', () => {
    for (const step of walk(RUY).filter((s) => s.san.startsWith('O-O'))) {
      expect(step.text, `${step.san}: "${step.text}"`).toMatch(/castles/);
      expect(step.text, `${step.san} described castling as a plain king move`)
        .not.toMatch(/king develops/);
    }
  });

  it('only claims a capture is unanswered when nothing recaptures', () => {
    // "wins" over a defended piece is the confident falsehood the whole
    // rewrite exists to stop, so the claim is checked against the board.
    for (const pgn of [RUY, CARO]) {
      for (const step of walk(pgn)) {
        if (!/nothing recaptures/.test(step.text)) continue;
        const board = new Chess(step.fen);
        const to = /captures on ([a-h][1-8])/.exec(step.text)?.[1];
        expect(to, `claimed an unanswered capture without naming a square`).toBeTruthy();
        const mover = board.turn() === 'w' ? 'b' : 'w';
        const enemy = mover === 'w' ? 'b' : 'w';
        expect(
          board.attackers(to as never, enemy).length,
          `ply ${step.ply} (${step.san}) claimed nothing recaptures on ${to}, but something does`,
        ).toBe(0);
      }
    }
  });
});
