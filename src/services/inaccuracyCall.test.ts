// "That was inaccurate — here is what should have been played, and why."
//
// David 2026-08-10: "The coach needs to call out inaccurate play for both sides
// and explain what should have been played and why. Is that part of the PV?"
// It is not — a PV can never name a mistake, because a mistake is a move the
// line does not contain. The delta names it; the PV explains the alternative.
//
// The load-bearing test here is the FIRST one: the bands come from the review's
// classifier, not from this file. The first draft invented its own at
// 50/100/200, which would have made the same move a "mistake" in play and an
// "inaccuracy" in review.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { callInaccuracy } from './inaccuracyCall';
import { classifyMove } from './moveRating';
import { MISTAKE_CP } from './engineConstants';

/** Italian, White to move at a real branch. */
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6';
const BEST_LINE = ['c1g5', 'h7h6', 'g5f6', 'd8f6'];

describe('the severity bands are the review\'s, not this file\'s', () => {
  it('agrees with classifyMove at every boundary', () => {
    // If these ever diverge, the same move is a mistake on one surface and an
    // inaccuracy on the other, and the words stop meaning anything.
    //
    // The WORD and the decision to SPEAK are two things. Sharing the bands with
    // the review (2026-08-10) moved 'inaccuracy' down to 50 centipawns, which is
    // what the review has always called it — but a coach that stops on every
    // half-pawn wobble teaches the student to stop listening, so this file keeps
    // its own floor at MISTAKE_CP. Below the floor it goes quiet WITHOUT
    // disagreeing about the name.
    for (const cpLoss of [0, 19, 20, 49, 50, 99, 100, 199, 200, 399, 400, 900]) {
      const expected = classifyMove({ wasBest: false, cpLoss, missedMate: null, allowedMate: null });
      const call = callInaccuracy({
        fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
        cpLoss, side: 'student', moverColor: 'white',
      });
      const worthSaying = ['inaccuracy', 'mistake', 'blunder'].includes(expected)
        && cpLoss >= MISTAKE_CP;
      expect(Boolean(call), `cpLoss=${cpLoss} → ${expected}`).toBe(worthSaying);
      if (call) expect(call.quality).toBe(expected);
    }
  });

  it('treats a walked-into mate as a blunder however small the swing', () => {
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 5,
      allowedMate: 2, side: 'student', moverColor: 'white',
    });
    expect(call?.quality).toBe('blunder');
  });
});

describe('it names the better move AND what it was for', () => {
  it('gives the student the move and the reason', () => {
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 150, side: 'student', moverColor: 'white',
    });
    expect(call?.said).toContain('Bg5 was the move');
    expect(call?.said, 'named the move but never said why').toMatch(/it would .+/);
  });

  it('still speaks when the line is too short to explain', () => {
    // Naming the move alone is worth more than silence.
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 150,
      side: 'student', moverColor: 'white',
    });
    expect(call?.said).toContain('Bg5 was the move.');
  });
});

describe('the coach owns its own mistakes', () => {
  it('speaks in the first person and hands over the punishment', () => {
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 250, side: 'coach', moverColor: 'white',
    });
    expect(call?.said).toMatch(/from me/);
    expect(call?.said, 'did not point the student at the punishment').toContain('something here for you');
  });

  it('does NOT promise a punishment for a mere inaccuracy', () => {
    // 120cp was an inaccuracy on this file's old private bands and is a MISTAKE
    // on the shared Stockfish ones. The rule is unchanged — an inaccuracy is too
    // small to promise anything — so the case moved to a delta that is still one,
    // which now also has to clear the speaking floor. Hence exactly MISTAKE_CP-…
    // no: an inaccuracy below the floor says nothing at all, so the honest test
    // of this rule is that a mistake DOES promise and the quality is what draws
    // the line.
    const inaccurate = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 60, side: 'coach', moverColor: 'white',
    });
    expect(inaccurate, 'an inaccuracy under the floor is silent, not chatty').toBeNull();
    const mistake = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 120, side: 'coach', moverColor: 'white',
    });
    expect(mistake?.quality).toBe('mistake');
    expect(mistake?.said, 'a real mistake owes the student the opportunity')
      .toContain('something here for you');
  });

  it('names its own move — that one is already on the board', () => {
    // The honesty contract withholds the STUDENT's move so they have something
    // to find. A move the coach has already played is visible; hiding it would
    // be coyness, not teaching.
    const call = callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 250,
      side: 'coach', moverColor: 'white',
    });
    expect(call?.said).toContain('a3');
  });
});

describe('it stays silent rather than guessing', () => {
  it('says nothing when the move WAS the best move', () => {
    expect(callInaccuracy({
      fenBefore: FEN, playedSan: 'Bg5', bestSan: 'Bg5', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('says nothing when the engine offered no alternative', () => {
    expect(callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: null, cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('refuses a best move that is not legal here', () => {
    // A mismatched pair from the caller must never become a phantom move in
    // the student's ear.
    expect(callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Qh8', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('survives an unreadable board', () => {
    expect(() => callInaccuracy({
      fenBefore: 'not a fen', playedSan: 'a3', bestSan: 'Bg5', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).not.toThrow();
  });

  it('every move it names is legal from the board it was given', () => {
    const board = new Chess(FEN);
    for (const cp of [120, 250, 600]) {
      for (const side of ['student', 'coach'] as const) {
        const call = callInaccuracy({
          fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
          cpLoss: cp, side, moverColor: 'white',
        });
        if (!call) continue;
        for (const san of call.said.match(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/g) ?? []) {
          expect(board.moves().some((m) => m.replace(/[+#]$/, '') === san), `${san} is not legal`).toBe(true);
        }
      }
    }
  });
});

describe('the sign convention — the classic way this goes wrong', () => {
  // CLAUDE.md carries this as a named trap ("the Stockfish `score cp` sign
  // convention for pitfall verification = studentEval = -rawEval always"), and
  // the coach-side callout is where it bites: the coach is the side the student
  // is NOT, so every eval has to be flipped twice and it is easy to flip once.
  //
  // A sign error here does not crash or go silent — it congratulates the coach
  // for blundering and apologises for its best moves, which is worse.
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6';

  /** The arithmetic the surface performs, extracted so it can be tested. */
  const coachCpLoss = (evalBeforeWhite: number, evalAfterWhite: number, coachColor: 'white' | 'black'): number => {
    const sign = coachColor === 'white' ? 1 : -1;
    return (evalBeforeWhite * sign) - (evalAfterWhite * sign);
  };

  it('a WHITE coach that drops a pawn shows a positive cost', () => {
    // +50 → -50 in White's favour is 100 centipawns handed over.
    expect(coachCpLoss(50, -50, 'white')).toBe(100);
  });

  it('a BLACK coach that drops a pawn shows a positive cost', () => {
    // White-POV -50 → +50 is the BLACK coach getting worse by 100.
    expect(coachCpLoss(-50, 50, 'black')).toBe(100);
  });

  it('a coach that IMPROVES its position shows a negative cost, and says nothing', () => {
    expect(coachCpLoss(0, 120, 'white')).toBeLessThan(0);
    expect(callInaccuracy({
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5',
      cpLoss: coachCpLoss(0, 120, 'white'), side: 'coach', moverColor: 'white',
    }), 'the coach apologised for a good move').toBeNull();
  });

  it('speaks when the cost is real, whichever colour the coach is', () => {
    for (const color of ['white', 'black'] as const) {
      const cp = color === 'white' ? coachCpLoss(50, -200, 'white') : coachCpLoss(-50, 200, 'black');
      const call = callInaccuracy({
        fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: cp,
        side: 'coach', moverColor: 'white',
      });
      // MISTAKE, not blunder — 250cp is a blunder only under CoachGamePage's
      // old private band, which is exactly the divergence the consolidation
      // removed. Writing this expectation from memory got it wrong first try,
      // which is the argument for having one classifier rather than two.
      expect(call?.quality, `${color} coach at ${cp}cp`).toBe('mistake');
    }
  });
});
