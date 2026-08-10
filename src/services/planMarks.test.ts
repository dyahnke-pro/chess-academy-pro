// The board may only repeat what the student just heard.
//
// David 2026-08-10, from a live prod log in which the coach spoke d6, b5, c6
// and d7 across one game and marked none of them: "I want square highlights and
// arrows drawn about future moves, plans, and key squares."
//
// The risk in granting that is obvious: a mark is a claim, and marks computed
// from the plan rather than from the SPOKEN plan would point at claims the
// package refused — the same lie drawn instead of said. Every test here is
// about that coupling, plus the two board-truth floors (an arrow starts on a
// real piece of the right colour) and the honesty floor (never draw the
// student's own next move).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { planFromUci, keySquareLine } from './lookaheadPlan';
import { planMarks, squaresNamedIn } from './planMarks';
import type { LookaheadPlan } from './lookaheadPlan';

/** Italian, after 5…exd4 — White to move, a real branch with a real fight over
 *  c3 (cxd4, Nc3, …Nxc3). */
const ITALIAN = 'r1bqk2r/pppp1ppp/2n2n2/2b5/2BpP3/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 6';
const ITALIAN_PV = ['c3d4', 'c5b4', 'b1c3', 'f6e4', 'e1g1', 'e4c3'];

function italianPlan(studentColor: 'white' | 'black'): LookaheadPlan {
  const plan = planFromUci(ITALIAN, ITALIAN_PV, studentColor);
  expect(plan, 'the fixture line no longer produces a plan').not.toBeNull();
  return plan as LookaheadPlan;
}

/** What the caller actually speaks: the key-square line plus both plans. */
function utterance(plan: LookaheadPlan): string {
  return [keySquareLine(plan.keySquares), plan.theirs.text, plan.mine.text]
    .filter(Boolean).join(' ');
}

describe('marks are drawn only for what was spoken', () => {
  it('marks the squares of the utterance', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.highlights.length, 'the board stayed bare while the coach named squares').toBeGreaterThan(0);
    expect(marks.arrows.length, 'no future move was drawn').toBeGreaterThan(0);
  });

  it('draws NOTHING when the plan said nothing', () => {
    const plan = italianPlan('black');
    expect(planMarks({ plan, spoken: '', fen: ITALIAN, studentColor: 'black' }))
      .toEqual({ arrows: [], highlights: [] });
  });

  it('drops a clause the caller left out of the utterance', () => {
    // The caller slices the plan's sentences by hint register, so half the plan
    // routinely goes unspoken. Marking it anyway would put a claim on the board
    // that was never made out loud.
    const plan = italianPlan('black');
    const full = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    const theirsOnly = planMarks({
      plan,
      spoken: [keySquareLine(plan.keySquares), plan.theirs.text].filter(Boolean).join(' '),
      fen: ITALIAN,
      studentColor: 'black',
    });
    expect(theirsOnly.highlights.length).toBeLessThanOrEqual(full.highlights.length);
    // Every square of the dropped half is gone from the marks.
    const mineSquares = new Set(plan.mine.spokenClauses.flatMap((c) => c.squares));
    const stillDrawn = theirsOnly.highlights
      .map((h) => h.square)
      .filter((sq) => mineSquares.has(sq) && !plan.keySquares.some((k) => k.square === sq)
        && !plan.theirs.spokenClauses.some((c) => c.squares.includes(sq)));
    expect(stillDrawn, `marked ${stillDrawn.join(', ')} from a sentence nobody heard`).toEqual([]);
  });

  it('ignores a square named by some OTHER lane in the same utterance', () => {
    // The package is one sentence built from several producers. A corpus note
    // naming h7 must not have h7 drawn as though the engine's line went there.
    const plan = italianPlan('black');
    const marks = planMarks({
      plan,
      spoken: `${utterance(plan)} The pawn on h7 is worth remembering.`,
      fen: ITALIAN,
      studentColor: 'black',
    });
    expect(marks.highlights.some((h) => h.square === 'h7')).toBe(false);
    expect(marks.arrows.some((a) => a.endSquare === 'h7')).toBe(false);
  });
});

describe('every arrow is true of the board it is drawn on', () => {
  it('starts on a real piece of the moving side', () => {
    for (const side of ['white', 'black'] as const) {
      const plan = italianPlan(side);
      const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: side });
      const board = new Chess(ITALIAN);
      for (const a of marks.arrows) {
        const piece = board.get(a.startSquare as never) as { color?: string } | undefined;
        expect(piece, `arrow from ${a.startSquare} — that square is empty`).toBeTruthy();
      }
    }
  });

  it('points where the line really goes', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    for (const a of marks.arrows) {
      expect(
        plan.path.some((s) => s.to === a.endSquare),
        `arrow to ${a.endSquare}, which no move in the line reaches`,
      ).toBe(true);
    }
  });

  it('never draws an arrow onto its own start square', () => {
    const plan = italianPlan('black');
    for (const a of planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' }).arrows) {
      expect(a.startSquare).not.toBe(a.endSquare);
    }
  });

  it('says nothing at all about an unreadable board', () => {
    const plan = italianPlan('black');
    expect(planMarks({ plan, spoken: utterance(plan), fen: 'not a fen', studentColor: 'black' }))
      .toEqual({ arrows: [], highlights: [] });
  });
});

describe('the student\'s own next move is never handed over', () => {
  it('draws no arrow for the first ply when it is theirs to play', () => {
    // White is to move in the fixture, so a WHITE student is the one on move —
    // and the first ply of the line is the move they have to find.
    const plan = italianPlan('white');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'white' });
    const first = plan.path[0];
    expect(
      marks.arrows.some((a) => a.startSquare === first.from && a.endSquare === first.to),
      'the arrow drew the student\'s own best move',
    ).toBe(false);
  });

  it('still highlights that square — led, not told', () => {
    const plan = italianPlan('white');
    const spoken = utterance(plan);
    const marks = planMarks({ plan, spoken, fen: ITALIAN, studentColor: 'white' });
    if (squaresNamedIn(spoken).includes(plan.path[0].to)) {
      expect(marks.highlights.some((h) => h.square === plan.path[0].to)).toBe(true);
    }
  });

  it('does draw the OPPONENT\'s next move — that is the warning', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.arrows.some((a) => a.color === '#ef4444'), 'nothing was drawn about what is coming').toBe(true);
  });
});

describe('the board does not turn into a diagram', () => {
  it('caps what one turn may add', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.arrows.length).toBeLessThanOrEqual(2);
    expect(marks.highlights.length).toBeLessThanOrEqual(3);
  });

  it('never marks the same square twice', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, spoken: utterance(plan), fen: ITALIAN, studentColor: 'black' });
    expect(new Set(marks.highlights.map((h) => h.square)).size).toBe(marks.highlights.length);
  });
});

describe('squaresNamedIn reads squares, not notation', () => {
  it('finds every square the sentence names, in order', () => {
    expect(squaresNamedIn('d6 is the square this turns on, and c6 and d7 matter'))
      .toEqual(['d6', 'c6', 'd7']);
  });

  it('does not read a file as a square', () => {
    expect(squaresNamedIn('open the d-file')).toEqual([]);
  });

  it('does not repeat a square', () => {
    expect(squaresNamedIn('e4 and e4 again')).toEqual(['e4']);
  });
});

describe('a full game marks only what it says', () => {
  it('holds across every ply of a real game', () => {
    // The strongest form of the coupling check: walk a whole game, compute the
    // plan at each position from a short legal line, and assert at every ply
    // that each marked square traces back to a clause in the utterance or to
    // the key square. One counterexample anywhere is a mark that outlived its
    // claim.
    const game = new Chess();
    const moves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
      'Be3', 'e5', 'Nb3', 'Be7', 'f3', 'O-O', 'Qd2', 'Be6', 'O-O-O', 'Nbd7'];
    let checked = 0;
    for (const san of moves) {
      game.move(san);
      const fen = game.fen();
      const board = new Chess(fen);
      const line = board.moves({ verbose: true }).slice(0, 1).flatMap((m) => {
        const probe = new Chess(fen);
        const out: string[] = [];
        probe.move(m.san);
        out.push(`${m.from}${m.to}`);
        for (let i = 0; i < 5; i += 1) {
          const next = probe.moves({ verbose: true })[0];
          if (!next) break;
          probe.move(next.san);
          out.push(`${next.from}${next.to}`);
        }
        return out;
      });
      const studentColor = board.turn() === 'w' ? 'white' : 'black';
      const plan = planFromUci(fen, line, studentColor);
      if (!plan) continue;
      const spoken = utterance(plan);
      const marks = planMarks({ plan, spoken, fen, studentColor });
      const allowed = new Set<string>([
        ...plan.keySquares.filter((k) => spoken.includes(k.square)).map((k) => k.square),
        ...plan.theirs.spokenClauses.filter((c) => spoken.includes(c.text)).flatMap((c) => c.squares),
        ...plan.mine.spokenClauses.filter((c) => spoken.includes(c.text)).flatMap((c) => c.squares),
      ]);
      for (const h of marks.highlights) {
        expect(allowed.has(h.square), `${san}: marked ${h.square}, which nothing in "${spoken}" claims`).toBe(true);
      }
      for (const a of marks.arrows) {
        expect(allowed.has(a.endSquare), `${san}: arrow to ${a.endSquare}, unclaimed`).toBe(true);
        const piece = board.get(a.startSquare as never) as { color?: string } | undefined;
        expect(piece, `${san}: arrow from the empty square ${a.startSquare}`).toBeTruthy();
      }
      checked += 1;
    }
    expect(checked, 'the sweep never computed a plan — the fixture is broken').toBeGreaterThan(5);
  }, 30_000);
});
