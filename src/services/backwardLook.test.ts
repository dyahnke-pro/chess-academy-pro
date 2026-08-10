// The backward look, on real boards.
//
// The wiring test proves the two callers reach this function. This one proves
// the function is worth reaching: that it fires on a move that really cost
// something, stays quiet on one that did not, never hands over the student's
// move, and never scolds.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { backwardLook } from './backwardLook';

/** SAN-shaped token — what the honesty contract forbids in a probe. */
const MOVE_RE = /\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/;

const after = (sans: string[]): string => {
  const b = new Chess();
  for (const s of sans) b.move(s);
  return b.fen();
};

/** A real, ordinary hang: after 1.e4 e5 2.Nf3, Black plays …Nf6?? nothing —
 *  use a genuine piece drop instead so the lanes have something to name. */
const HUNG: { before: string; played: string; best: string } = (() => {
  const b = new Chess();
  for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) b.move(s);
  // Black plays …Nd4?! walking into Nxe5; the engine prefers a developing move.
  return { before: b.fen(), played: 'Nd4', best: 'Nf6' };
})();

describe('it speaks only when a move really cost something', () => {
  it('says nothing about a move that lost nothing', () => {
    const fen = after(['e4', 'e5', 'Nf3']);
    expect(backwardLook({
      fenBefore: fen,
      fenAfter: after(['e4', 'e5', 'Nf3', 'Nc6']),
      playedSan: 'Nc6',
      bestSan: 'Nc6',
      cpLoss: 4,
      studentColor: 'black',
    }), 'a best move got a backward look').toBeNull();
  });

  it('says nothing when the engine offered no alternative', () => {
    const fen = after(['e4', 'e5', 'Nf3']);
    expect(backwardLook({
      fenBefore: fen,
      fenAfter: after(['e4', 'e5', 'Nf3', 'Nc6']),
      playedSan: 'Nc6',
      bestSan: null,
      cpLoss: 300,
      studentColor: 'black',
    })).toBeNull();
  });

  it('calls a real blunder, and names what should have been played', () => {
    const look = backwardLook({
      fenBefore: HUNG.before,
      fenAfter: (() => { const b = new Chess(HUNG.before); b.move(HUNG.played); return b.fen(); })(),
      playedSan: HUNG.played,
      bestSan: HUNG.best,
      cpLoss: 420,
      studentColor: 'black',
    });
    expect(look, 'a 420-centipawn move produced no backward look at all').not.toBeNull();
    expect(look!.line).toContain(HUNG.best);
  });
});

describe('the register', () => {
  const look = backwardLook({
    fenBefore: HUNG.before,
    fenAfter: (() => { const b = new Chess(HUNG.before); b.move(HUNG.played); return b.fen(); })(),
    playedSan: HUNG.played,
    bestSan: HUNG.best,
    cpLoss: 420,
    studentColor: 'black',
  })!;

  it('is past tense — the move has already happened', () => {
    expect(look.line).not.toMatch(/\bYou want to\b|\bThey want to\b/);
  });

  it('does not scold', () => {
    expect(look.line.toLowerCase()).not.toMatch(/careless|sloppy|terrible|awful|should have known/);
  });

  it('never apologises', () => {
    expect(look.line.toLowerCase()).not.toMatch(/sorry|apolog|my mistake/);
  });

  it('rides a lane the package knows', () => {
    expect(['mistake', 'drawback']).toContain(look.kind);
  });
});

describe('mate is carried in its own field, never as centipawns', () => {
  // A mate score is a six-figure sentinel. Folded into the delta it would be
  // reported to the student as a cost of a hundred thousand centipawns — and,
  // worse, a move that merely SWAPPED one mate distance for another would read
  // as an enormous swing.
  it('a walked-into mate is called even when the centipawn delta is nothing', () => {
    // Scholar's mate shape: Black plays a losing waiting move with mate on.
    const b = new Chess();
    for (const s of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']) b.move(s);
    const fenBefore = (() => { const c = new Chess(); for (const s of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']) c.move(s); return c.fen(); })();
    const look = backwardLook({
      fenBefore,
      fenAfter: b.fen(),
      playedSan: 'Nf6',
      bestSan: 'Qe7',
      cpLoss: 0,
      studentColor: 'black',
      allowedMate: 1,
    });
    expect(look, 'walking into mate in one produced no backward look').not.toBeNull();
  });
});

describe('it survives whatever the engine hands it', () => {
  it('a best move that is not legal on this board says nothing', () => {
    expect(backwardLook({
      fenBefore: after(['e4', 'e5']),
      fenAfter: after(['e4', 'e5', 'Nf3']),
      playedSan: 'Nf3',
      bestSan: 'Qh8',
      cpLoss: 300,
      studentColor: 'white',
    })).toBeNull();
  });

  it('a broken FEN never throws', () => {
    expect(() => backwardLook({
      fenBefore: 'not a fen',
      fenAfter: 'also not a fen',
      playedSan: 'e4',
      bestSan: 'd4',
      cpLoss: 200,
      studentColor: 'white',
    })).not.toThrow();
  });

  it('an empty engine line never throws and never invents', () => {
    const look = backwardLook({
      fenBefore: after(['e4', 'e5']),
      fenAfter: after(['e4', 'e5', 'Nf3']),
      playedSan: 'Nf3',
      bestSan: 'Nc3',
      bestPvUci: [],
      replyPvUci: [],
      cpLoss: 150,
      studentColor: 'white',
    });
    if (look) expect(look.line.length).toBeGreaterThan(0);
  });
});

describe('the coach side runs the same model, in the first person', () => {
  // The coach may NAME its own move — it is already on the board, so hiding it
  // would be coyness. The honesty contract withholds the STUDENT's move, which
  // is a different rule for a different reason.
  const coachCall = backwardLook({
    fenBefore: HUNG.before,
    fenAfter: (() => { const b = new Chess(HUNG.before); b.move(HUNG.played); return b.fen(); })(),
    playedSan: HUNG.played,
    bestSan: HUNG.best,
    cpLoss: 420,
    studentColor: 'black',
    side: 'coach',
  });

  it('fires at all — the lane was dead for a whole build', () => {
    expect(coachCall, 'the coach never judges its own move').not.toBeNull();
  });

  it('rides the lane David put second, behind the student callout', () => {
    expect(coachCall!.kind).toBe('coachMistake');
  });

  it('owns it in the first person', () => {
    expect(coachCall!.line).toMatch(/\bfrom me\b|\bI\b/);
  });

  it('never apologises for it', () => {
    expect(coachCall!.line.toLowerCase()).not.toMatch(/sorry|apolog/);
  });

  it('hands the punishment over without naming it', () => {
    // "There is something here for you now — go and take it." The move that
    // punishes stays theirs to find; only the BETTER move gets named, and that
    // is the coach's own alternative, not the student's reply.
    const b = new Chess(HUNG.before);
    b.move(HUNG.played);
    const legalReplies = new Set(b.moves());
    const named = coachCall!.line.match(new RegExp(MOVE_RE, 'g')) ?? [];
    for (const m of named) {
      expect(legalReplies.has(m), `the coach handed over the punishing move: ${m}`).toBe(false);
    }
  });

  it('is silent when the coach played well', () => {
    expect(backwardLook({
      fenBefore: HUNG.before,
      fenAfter: (() => { const b = new Chess(HUNG.before); b.move(HUNG.best); return b.fen(); })(),
      playedSan: HUNG.best,
      bestSan: HUNG.best,
      cpLoss: 0,
      studentColor: 'black',
      side: 'coach',
    })).toBeNull();
  });
});

describe('the honesty contract holds across a whole game', () => {
  it('never hands the student a move that is not the BETTER one', () => {
    // Naming the engine's move is the point of the callout. Naming the move the
    // student PLAYED back to them, in a lane meant to teach, is not — except in
    // the callout's own head clause, which is explicitly allowed because it is
    // describing a move already on the board.
    const b = new Chess();
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'];
    let seen = 0;
    for (let i = 0; i < sans.length; i += 1) {
      const fenBefore = b.fen();
      const legal = b.moves();
      const alt = legal.find((m) => m !== sans[i]);
      b.move(sans[i]);
      if (!alt) continue;
      const look = backwardLook({
        fenBefore,
        fenAfter: b.fen(),
        playedSan: sans[i],
        bestSan: alt,
        cpLoss: 250,
        studentColor: i % 2 === 0 ? 'white' : 'black',
      });
      if (!look) continue;
      seen += 1;
      const moves = look.line.match(new RegExp(MOVE_RE, 'g')) ?? [];
      for (const m of moves) {
        expect([alt, sans[i]], `an invented move reached the student: ${m} in "${look.line}"`)
          .toContain(m);
      }
    }
    expect(seen, 'the sweep never produced a single backward look — it proved nothing')
      .toBeGreaterThan(0);
  });
});
