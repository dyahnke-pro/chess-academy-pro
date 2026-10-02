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
import { callInaccuracy, gambitFile } from './inaccuracyCall';
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
      const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
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
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 5,
      allowedMate: 2, side: 'student', moverColor: 'white',
    });
    expect(call?.quality).toBe('blunder');
  });
});

describe('it names the better move AND what it was for', () => {
  it('gives the student the move and the reason', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 150, side: 'student', moverColor: 'white',
    });
    expect(call?.said).toContain('Bg5 was the move');
    expect(call?.said, 'named the move but never said why').toMatch(/it would .+/);
  });

  it('still grades the move when the line is too short to explain — but names no move', () => {
    // NAMED WITH ITS REASON, OR NOT NAMED (David 2026-09-24; Learn walk
    // 2026-09-26 heard "exd5 was a mistake. e5 was the move." with no why).
    // The grade stands; an unexplained move is an order, not teaching.
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 150,
      side: 'student', moverColor: 'white',
    });
    expect(call?.said).toMatch(/^a3 was/);
    expect(call?.said).not.toContain('Bg5');
  });

  it('never a bare grade — with no reason and no punishment it says what the move cost (run B walk, Nf5)', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 150,
      side: 'student', moverColor: 'white',
    });
    expect(call?.said).toMatch(/^a3 was a mistake — it cost more than a pawn of advantage\.$/);
  });
});

describe('the coach owns its own mistakes', () => {
  it('speaks in the first person and hands over the punishment', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 250, side: 'coach', moverColor: 'white',
    });
    expect(call?.said).toMatch(/from me/);
    expect(call?.said, 'did not point the student at the punishment').toContain('something here for you');
    expect(call?.offersStudent, 'the offer travels as data, so Learn can reveal the answer after the move').toBe(true);
  });

  it('does NOT promise a punishment for a mere inaccuracy', () => {
    // 120cp was an inaccuracy on this file's old private bands and is a MISTAKE
    // on the shared Stockfish ones. The rule is unchanged — an inaccuracy is too
    // small to promise anything — so the case moved to a delta that is still one,
    // which now also has to clear the speaking floor. Hence exactly MISTAKE_CP-…
    // no: an inaccuracy below the floor says nothing at all, so the honest test
    // of this rule is that a mistake DOES promise and the quality is what draws
    // the line.
    const inaccurate = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE,
      cpLoss: 60, side: 'coach', moverColor: 'white',
    });
    expect(inaccurate, 'an inaccuracy under the floor is silent, not chatty').toBeNull();
    const mistake = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
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
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', cpLoss: 250,
      side: 'coach', moverColor: 'white',
    });
    expect(call?.said).toContain('a3');
  });
});

describe('it stays silent rather than guessing', () => {
  it('says nothing when the move WAS the best move', () => {
    expect(callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'Bg5', bestSan: 'Bg5', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('says nothing when the engine offered no alternative', () => {
    expect(callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: null, cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('refuses a best move that is not legal here', () => {
    // A mismatched pair from the caller must never become a phantom move in
    // the student's ear.
    expect(callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Qh8', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).toBeNull();
  });

  it('survives an unreadable board', () => {
    expect(() => callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: 'not a fen', playedSan: 'a3', bestSan: 'Bg5', cpLoss: 300,
      side: 'student', moverColor: 'white',
    })).not.toThrow();
  });

  it('every move it names is legal from the board it was given', () => {
    const board = new Chess(FEN);
    for (const cp of [120, 250, 600]) {
      for (const side of ['student', 'coach'] as const) {
        const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
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
    expect(callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5',
      cpLoss: coachCpLoss(0, 120, 'white'), side: 'coach', moverColor: 'white',
    }), 'the coach apologised for a good move').toBeNull();
  });

  it('speaks when the cost is real, whichever colour the coach is', () => {
    for (const color of ['white', 'black'] as const) {
      const cp = color === 'white' ? coachCpLoss(50, -200, 'white') : coachCpLoss(-50, 200, 'black');
      const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
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

// ── ONE REASON, NOT THE WHOLE WANT-LIST ───────────────────────────────────
// Caught on prod 2026-08-11, from a real game the audit drove:
//
//   "Nxe5 was the move — it would walk the bishop round to b3, by way of f7,
//    swing pieces toward their king, pull the pawns away from their king and
//    win a pawn."
//
// Every clause true and board-verified; the sentence still unusable. The plan
// is uncapped deliberately and stays that way — the callout is a different
// register and wants the single strongest reason, which the plan has already
// ranked for it.
describe('the callout gives one reason, the highest-ranked one', () => {
  // A real middlegame where the engine's best move does several things at once,
  // so the want-list has more than one clause to choose between.
  const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';

  const said = (): string => callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
    fenBefore: FEN,
    playedSan: 'a3',
    bestSan: 'O-O',
    bestLineUci: ['e1g1', 'e8g8', 'd2d3', 'd7d6', 'c1g5', 'c8g4'],
    cpLoss: 300,
    side: 'student',
    moverColor: 'white',
  })?.said ?? '';

  it('never runs four or more clauses together', () => {
    const line = said();
    if (!line.includes('it would ')) return; // no PV reason on this board
    const why = line.slice(line.indexOf('it would ') + 9);
    // The joined want-list is "A, B, C and D". A reason with three or more
    // separators is the run-on this test exists to prevent.
    const parts = why.split(/,| and /).filter((s) => s.trim());
    expect(parts.length, `run-on reason: ${why}`).toBeLessThanOrEqual(2);
  });

  it('still gives a reason rather than going quiet', () => {
    // The failure mode on the other side: "fixing" the run-on by dropping the
    // reason entirely leaves "O-O was the move." and teaches nothing.
    expect(said()).toMatch(/was the move/);
  });

  it('the coach half is held to the same bar', () => {
    const c = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: FEN,
      playedSan: 'a3',
      bestSan: 'O-O',
      bestLineUci: ['e1g1', 'e8g8', 'd2d3', 'd7d6', 'c1g5', 'c8g4'],
      cpLoss: 300,
      side: 'coach',
      moverColor: 'white',
    })?.said ?? '';
    if (!c.includes(', to ')) return;
    const why = c.slice(c.indexOf(', to ') + 5);
    const parts = why.split(/,| and /).filter((s) => s.trim());
    expect(parts.length, `run-on reason: ${why}`).toBeLessThanOrEqual(2);
  });
});

describe('a coach MISS is not a giveaway (walk 6, L4)', () => {
  it('when the coach declined a capture of the student piece, it warns — it does not say "go and take it"', () => {
    // Black (the coach) could take the White knight on g5 with the queen and
    // played …d6 instead; the knight is still hanging.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/6N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5';
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'd6', bestSan: 'Qxg5', cpLoss: 400, side: 'coach', moverColor: 'black' });
    expect(call?.said).toMatch(/knight on g5 is still hanging/);
    expect(call?.said).not.toMatch(/go and take it/);
    expect(call?.offersStudent, 'a still-hanging warning offers nothing to find').toBeUndefined();
  });
});

describe('a gambit is taught from both sides (hand walk 2026-09-24)', () => {
  // Naroditsky's 10.b4 against the long-castled king: "if Black takes, the
  // b-file opens straight onto the king". The coach said "b4 was a mistake".
  const fen = '2kr1b1r/pp1npppp/2p2n2/q6b/8/2NP2PP/PPP1NPB1/R1BQ1RK1 w - - 1 10';
  it('names the file the pawn offers to open, then the engine\'s preference', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'b4', bestSan: 'a3', cpLoss: 120, side: 'student', moverColor: 'white' });
    expect(call?.said).toContain('b-file opens toward their king');
    expect(call?.said).not.toMatch(/was a mistake/);
    expect(call?.said).toContain('a3');
  });
  it('NEGATIVE CONTROL: a push nobody can take is graded as before', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'a3', bestSan: 'b4', cpLoss: 120, side: 'student', moverColor: 'white' });
    expect(call?.said ?? '').not.toContain('offers a pawn');
  });
});

describe('a defended pawn is not a gambit (hand walk 2026-09-24)', () => {
  it('18.h3 against …Bg4: g2 guards h3, so nothing is offered', () => {
    const fen = 'r3qrk1/pp3ppp/2p1n3/4P2n/1b4b1/1BN1BN2/PPP3PP/3RQRK1 w - - 2 18';
    expect(gambitFile(fen, 'h3', 'white')).toBeNull();
  });
  it('NEGATIVE CONTROL: an undefended pawn a piece can take still is', () => {
    // g4 pushed with nothing guarding it and their bishop on f5 able to take.
    const fen = '6k1/5ppp/8/5b2/8/8/5PPP/6K1 w - - 0 20';
    expect(gambitFile(fen, 'g4', 'white')).not.toBeNull();
  });
});

describe('the better move\'s reason is what it TAKES (hand walk 2026-09-24)', () => {
  it('25.Bxf4 missed Bxd8, which takes the queen — not "win a rook"', () => {
    const call = callInaccuracy({
      fenBefore: '3q1r1k/pp4pp/2p1B3/4P1BP/1b3p2/2N2R1P/PPP5/4Q1K1 w - - 0 25', playedSan: 'Bxf4', bestSan: 'Bxd8', cpLoss: 600, moverColor: 'white', side: 'student',
      bestLineUci: ['g5d8', 'f8d8', 'f3f4', 'b4c5'], replyLineUci: [], replySan: null,
    } as never);
    expect(call?.said ?? '').toMatch(/take the queen on d8/);
  });
});

// Hand walk 1380, move 22: gxh5 won two pieces and left White +4.2 (engine
// depth 16); Rxf8+ was +6.8. "gxh5 was a mistake" graded a winning move; the
// teaching is the cleaner way.
describe('still winning after the move is said first', () => {
  const fen = '3R1rk1/pp2q1pp/2p1n3/4Pp1n/1b4P1/1BN1BR1P/PPP5/4Q1K1 w - - 1 22';
  const base = { fenBefore: fen, playedSan: 'gxh5', bestSan: 'Rxf8+', bestLineUci: ['d8f8', 'g8f8'], cpLoss: 261, side: 'student' as const, moverColor: 'white' as const };
  it('"still wins" when the mover stays clearly winning — no grade, and no unexplained move', () => {
    // The two-ply line proves no reason, so Rxf8+ is not named (named with its
    // reason, or not named — David 2026-09-24).
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, ...base, moverEvalAfterCp: 418 });
    expect(call?.said).toMatch(/^gxh5 still wins/);
    expect(call?.said).not.toMatch(/mistake|blunder|Rxf8/);
  });
  it('the grade stands when the position is no longer clearly won', () => {
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, ...base, moverEvalAfterCp: 120 });
    expect(call?.said).toMatch(/was a (mistake|blunder)/);
  });
  it('unknown eval keeps the grade', () => {
    expect(callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, ...base })?.said).toMatch(/was a (mistake|blunder)/);
  });
});

describe('let them in — only an entry the move opened', () => {
  it('Raf8 does not "let them in with Nxb6" when Nxb6 was already there (walk 2026-09-30)', () => {
    const call = callInaccuracy({ priorMove: null,
      fenBefore: 'r6k/ppp3pp/1bnp4/3Npr1n/2B5/3PBq1P/PPPQ1PRK/6R1 b - - 1 17', playedSan: 'Raf8', bestSan: 'Nd4',
      cpLoss: 180, side: 'student', moverColor: 'black',
      replyLineUci: ['d5b6', 'a7b6', 'c4e6', 'c6e7', 'd3d4', 'e5d4'], replySan: 'Nxb6',
    });
    expect(call?.said ?? '').not.toMatch(/let them in with Nxb6/);
  });
});

describe('clearly better after the move is a cleaner way, not a mistake', () => {
  it('Bxc5 +3.1 → +1.9 keeps you clearly on top (pass-2 walk 2026-09-30)', () => {
    const call = callInaccuracy({ priorMove: null,
      fenBefore: '5rk1/1qpn1pbp/prN3p1/2pP4/2P5/Q3B2P/P4PP1/3RR1K1 w - - 0 24', playedSan: 'Bxc5', bestSan: 'Bf4',
      cpLoss: 115, moverEvalAfterCp: 194, side: 'student', moverColor: 'white', replyLineUci: [], replySan: null,
    });
    expect(call?.said ?? '').not.toMatch(/mistake/);
    expect(call?.said ?? '').toMatch(/^Bxc5 keeps you clearly on top/);
  });
});

describe('a dictated move is said of them, never owned by the coach (David 2026-09-30)', () => {
  it('their Bb5 dropping e4 is "their mistake", not "from me"', () => {
    // Accelerated Dragon: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.Be3 Bg7 6.c3 Nf6 — White to move; Bb5 drops e4.
    const fen = 'r1bqk2r/pp1pppbp/2n2np1/8/3NP3/2P1B3/PP3PPP/RN1QKB1R w KQkq - 1 7';
    const call = callInaccuracy({ priorMove: null,
      fenBefore: fen, playedSan: 'Bb5', bestSan: 'Nd2', cpLoss: 160,
      side: 'coach', dictated: true, moverColor: 'white', replyLineUci: [], replySan: null,
    });
    expect(call?.said ?? '').toMatch(/^Their Bb5 is a mistake/);
    expect(call?.said ?? '').not.toMatch(/from me|\bmy\b|\bI\b/);
  });
});

describe('a take-back is the other half of a trade (Learn walk 2026-10-01, game 1 ply 68)', () => {
  it('Rxe2+ Kxe2 is never "it let them take your rook on e2"', () => {
    // Black's rook takes the rook on e2 with check; the king takes back. Rook
    // for rook — the cost is the worse ending, not a lost rook.
    const call = callInaccuracy({ priorMove: null,
      fenBefore: '4r2k/pp1R2pp/5r2/2P5/1P4P1/7P/3KR3/8 b - - 0 34',
      playedSan: 'Rxe2+', bestSan: 'Rc8', bestLineUci: ['e8c8', 'd7b7', 'h7h5', 'g4g5'],
      replyLineUci: ['d2e2', 'h7h5', 'd7b7', 'h5g4'], replySan: 'Kxe2',
      cpLoss: 110, moverEvalAfterCp: -430, side: 'student', moverColor: 'black',
    });
    expect(call).toBeTruthy();
    expect(call!.said).not.toMatch(/take your rook/);
  });
});

// unify-the-coach A1 (2026-10-01): Learn graded on centipawns and review in
// expected points, so 300cp given back at +12 was "a blunder" in Learn and not
// even flagged in review. Learn holds the mover's eval after the move, so the
// grade now uses the review's bands whenever that eval is a real read.
describe('one grade on every surface (A1)', () => {
  const base = { replyLineUci: [] as string[], replySan: null, fenBefore: FEN, playedSan: 'a3', bestSan: 'Bg5', bestLineUci: BEST_LINE, side: 'student' as const, moverColor: 'white' as const };
  it('a 300cp give-back in a won game is not called a blunder', () => {
    const call = callInaccuracy({ priorMove: null, ...base, cpLoss: 300, moverEvalAfterCp: 900 });
    const review = classifyMove({ wasBest: false, cpLoss: 300, missedMate: null, allowedMate: null, evalBefore: 1200, evalAfter: 900, isWhiteMove: true });
    expect(review).not.toBe('blunder');
    expect(call?.said ?? '').not.toMatch(/blunder/);
  });
  it('the same 300cp in a level game is still a blunder', () => {
    const call = callInaccuracy({ priorMove: null, ...base, cpLoss: 300, moverEvalAfterCp: -300 });
    expect(call?.said ?? '').toMatch(/blunder/);
  });
});

// unify-the-coach B3 — the grade carries the pattern the better move would
// have landed, structured, so Learn teaches its rule once a game from its one
// definition ledger. (The walk's "f6 was the move — it would win a piece" is
// NOT a fork: f6 hits the g5 bishop while d5 already hits the e4 knight — two
// pawns — and the detector rightly stays quiet; pinned below.)
describe('the grade carries the missed pattern (B3)', () => {
  it('a missed knight fork is carried as pattern "fork"', () => {
    const fen = 'r3k2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1';
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'a3', bestSan: 'Nxc7+',
      bestLineUci: ['d5c7', 'e8d7', 'c7a8', 'h8a8', 'a1d1', 'd7e7'], cpLoss: 400, moverEvalAfterCp: 0, side: 'student', moverColor: 'white' });
    expect(call?.pattern).toBe('fork');
  });
  it('two pawns attacking two pieces carries no pattern (walk 2026-10-01, 5…f6)', () => {
    const fen = 'r1bqkbnr/ppp2ppp/2n5/3p2B1/3PN3/5N2/PPP1PPPP/R2QKB1R b KQkq - 1 5';
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'Be7', bestSan: 'f6',
      bestLineUci: ['f7f6', 'e4f6', 'g8f6', 'e2e3', 'f8e7', 'c2c3', 'e8g8', 'f1d3'], cpLoss: 300, moverEvalAfterCp: -60, side: 'student', moverColor: 'black' });
    expect(call?.said).toMatch(/win a piece/);
    expect(call?.pattern).toBeUndefined();
  });
});

// Review walk 2026-10-01 (game 173849611894, ply 37): "Be3 was the move — it
// would walk the rook round to c4, by way of c1". A bishop move does not walk
// the rook; another piece's route is the IDEA the move serves.
describe('a route of another piece is the idea, not the move', () => {
  it('Be3 does not "walk the rook"', async () => {
    const { betterMoveReason } = await import('./inaccuracyCall');
    const fen = '2rq1rk1/p1p2pbp/1p2p1p1/3bP3/3P4/5N1P/PP3PP1/R1BQR1K1 w - - 0 19';
    const r = betterMoveReason(fen, 'Qd2', 'Be3', ['c1e3', 'd5b7', 'a1c1', 'd8d5', 'c1c4'], 'white', null) ?? '';
    expect(r).not.toMatch(/^it would walk the rook/);
    expect(r).toMatch(/^the idea is to walk the rook round to c4/);
  });
});

// Review walk 2026-10-01 (game 174083521118, ply 16): "Bf5 was the move — it
// would walk the bishop round to a4, by way of f5 and c2". The bishop's stop on
// c2 wins the pawn; the material is the reason, not the walk.
describe('a route that collects material says the material', () => {
  it('Bf5 would win a pawn', async () => {
    const { betterMoveReason } = await import('./inaccuracyCall');
    const fen = 'r1bqk2r/ppp1nppp/2n5/8/3PQ3/5N2/PPP1PPPP/R3KB1R b KQkq - 0 8';
    expect(betterMoveReason(fen, 'O-O', 'Bf5', ['c8f5', 'e4f4', 'f5c2', 'a1c1', 'c2a4'], 'black', null)).toBe('it would win a pawn');
  });
});

describe('a pawn their line takes is a lost square the caller can match (Learn walk 2026-10-01, Benoni ply 26)', () => {
  it('…b5 lets cxb5 win a pawn — lostSquare b5, so "your pawn on b5 hanging" is not said again', () => {
    const c = new Chess();
    for (const s of 'd4 c5 d5 d6 c4 Nf6 Nc3 e5 e4 Be7 Nf3 Bg4 h3 Bh5 Be2 O-O Be3 Nbd7 Nd2 Bg6 O-O a6 f4 exf4 Bxf4'.split(' ')) c.move(s);
    const fenBefore = c.fen();
    const call = callInaccuracy({ priorMove: null,
      replyLineUci: ['c4b5', 'a6b5', 'e2b5', 'd8b6'], replySan: 'b3',
      fenBefore, playedSan: 'b5', bestSan: 'Re8', cpLoss: 120, side: 'student', moverColor: 'black',
    });
    expect(call?.said ?? '').toMatch(/win a pawn/);
    expect(call?.lostSquare).toBe('b5');
  });
});

describe('a win the defender could dodge is not a reason (Learn walk 2026-10-01, recorded live lines)', () => {
  it('h3 with d5 best: the piece falls only to a deep defender blunder, so no "to win a piece"', () => {
    const call = callInaccuracy({ priorMove: null,
      replyLineUci: [], replySan: null, side: 'coach', dictated: true, moverColor: 'white', cpLoss: 180,
      fenBefore: 'r1bqk2r/ppppbppp/2n2n2/8/3PP3/2N5/PP3PPP/R1BQKBNR w KQkq - 3 6', playedSan: 'h3', bestSan: 'd5',
      bestLineUci: 'd4d5 c6e5 f2f4 e5g6 e4e5 e7c5 e5f6 e8g8 f6g7 f8e8 f1e2 d8h4'.split(' '),
    });
    expect(call?.said ?? '').not.toMatch(/win a piece/);
  });
  it('Bd5 with f5 best: the skewer needs White to walk the queen into it, so no "land a skewer"', () => {
    const call = callInaccuracy({ priorMove: null,
      replyLineUci: [], replySan: null, side: 'student', moverColor: 'black', cpLoss: 130,
      fenBefore: 'r2q1rk1/ppp2ppp/2n5/4P3/2bPp3/2P1B2P/P3NPP1/R2QR1K1 b - - 2 14', playedSan: 'Bd5', bestSan: 'f5',
      bestLineUci: 'f7f5 e5f6 d8f6 d1b1 b7b6 b1e4 a8e8 e4g4 f6f7'.split(' '),
    });
    expect(call?.said ?? '').not.toMatch(/skewer/);
  });
});

describe('the inaccuracy word follows the cost it states (Learn walk 2026-10-01, Rc8)', () => {
  it('a two-pawn drop graded an inaccuracy is "imprecise", never "a little imprecise" — and never "loose"', () => {
    const call = callInaccuracy({ priorMove: null,
      replyLineUci: [], replySan: null, side: 'student', moverColor: 'black', cpLoss: 210, moverEvalAfterCp: -800,
      fenBefore: '3r4/2R4p/p1rP2p1/2Pk1p2/NP6/7P/P5P1/6K1 b - - 2 36', playedSan: 'Rc8', bestSan: 'Rcxd6',
    });
    expect(call?.quality).toBe('inaccuracy');
    expect(call?.said).toBe('Rc8 was imprecise — it cost about two pawns of advantage.');
  });
});

describe('their slip is offered as what it really is (Learn walk 2026-10-02, 6.h3)', () => {
  // White (dictated, the opponent) played h3 from +2.06; Black, the student,
  // is still −0.45 after it — level-ish, not a prize to "go and take".
  const fen = 'r1bqk2r/ppppbppp/2n2n2/8/3PP3/2N5/PP3PPP/R1BQKBNR w KQkq - 3 6';
  const base = { priorMove: null, replyLineUci: [], replySan: null, fenBefore: fen, playedSan: 'h3', bestSan: 'd5', cpLoss: 160, side: 'coach' as const, moverColor: 'white' as const, dictated: true };
  it('still a little worse → level, not "go and take it"', () => {
    const said = callInaccuracy({ ...base, moverEvalAfterCp: 45 })?.said ?? '';
    expect(said).toMatch(/brings you level/);
    expect(said).not.toMatch(/go and take it/);
  });
  it('clearly worse → a way back', () => {
    expect(callInaccuracy({ ...base, moverEvalAfterCp: 140 })?.said ?? '').toMatch(/way back into the game/);
  });
  it('now better → go and take it', () => {
    expect(callInaccuracy({ ...base, moverEvalAfterCp: -120 })?.said ?? '').toMatch(/go and take it/);
  });
});
