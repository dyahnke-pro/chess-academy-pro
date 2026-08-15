// The bake teaches every ply of a baked opening — in a GAME, not only a lesson.
//
// David 2026-08-09: "the entire opening needs teaching." Two full games driven
// against prod got roughly two plies in eight taught, most of it general rather
// than about the move on the board — while 220 plies of authored, reviewed
// opening prose sat in `walkthrough-narrations.json`, one idea per move across
// 23 openings, reachable only by asking to be TAUGHT the opening.
//
// `bakedNarrationFor` asks whether a whole line is baked, which a game three
// moves in can never satisfy. `bakedTeachingForPly` asks the question a game
// has: is the move I just played on a baked line, and what does the bake say
// about it.
import { describe, it, expect } from 'vitest';
import bakedData from '../data/walkthrough-narrations.json';
import { Chess } from 'chess.js';
import { bakedTeachingForPly, bakedNarrationFor, bakedSpineNextMove } from './bakedWalkthroughNarration';

const DATA = bakedData as {
  narrations: Record<string, { openingName: string; spine: string[]; ideas: { text: string }[] }>;
};

describe('teaching for the move just played', () => {
  it('THE GAP: a game on a baked line got nothing from the bake', () => {
    // Three moves into the Latvian, the lesson-shaped lookup is empty — it
    // wants the entire spine — while the ply lookup has authored prose.
    const partial = ['e4', 'e5', 'Nf3'];
    expect(bakedNarrationFor('Latvian Gambit', partial)).toBeNull();
    expect(bakedTeachingForPly('Latvian Gambit', partial)?.text).toBeTruthy();
  });

  it('teaches EVERY ply of a baked line, not a scattering', () => {
    const entry = DATA.narrations['latvian gambit'];
    for (let n = 1; n <= entry.spine.length; n += 1) {
      const hit = bakedTeachingForPly('Latvian Gambit', entry.spine.slice(0, n));
      expect(hit, `ply ${n} of ${entry.spine.length} has no teaching`).not.toBeNull();
      expect(hit?.ply).toBe(n);
      expect(hit?.text.length ?? 0).toBeGreaterThan(20);
    }
  });

  it('every baked opening teaches every one of its plies', () => {
    // The whole point is coverage, so it is asserted over the whole bake
    // rather than one sample. 23 openings today.
    const missing: string[] = [];
    for (const entry of Object.values(DATA.narrations)) {
      for (let n = 1; n <= entry.spine.length; n += 1) {
        if (!bakedTeachingForPly(entry.openingName, entry.spine.slice(0, n))) {
          missing.push(`${entry.openingName} ply ${n}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('reports how much teaching is still ahead', () => {
    const entry = DATA.narrations['latvian gambit'];
    const hit = bakedTeachingForPly('Latvian Gambit', entry.spine.slice(0, 3));
    expect(hit?.remaining).toBe(entry.spine.length - 3);
  });
});

describe('it can never narrate a line that is not being played', () => {
  it('a deviation from the spine ends the teaching', () => {
    // The name match is fuzzy; the MOVES are not. One move off the line and the
    // bake has nothing to say — which is what makes the fuzzy name safe.
    expect(bakedTeachingForPly('Latvian Gambit', ['e4', 'e5', 'Nc3'])).toBeNull();
  });

  it('a line longer than the bake is past its teaching', () => {
    const entry = DATA.narrations['latvian gambit'];
    expect(bakedTeachingForPly('Latvian Gambit', [...entry.spine, 'a3'])).toBeNull();
  });

  it('no moves, no teaching', () => {
    expect(bakedTeachingForPly('Latvian Gambit', [])).toBeNull();
  });
});

// The name arrives late — detection cannot call it the Latvian until f5 — so
// requiring it left the first plies of every game untaught. The moves decide;
// the name only breaks ties.
describe('the board picks the teaching, the name breaks ties', () => {
  it('teaches a line only one bake can be on, with no name at all', () => {
    // e4 e5 Nf3 f5 is the Latvian and nothing else in the bake.
    const hit = bakedTeachingForPly(null, ['e4', 'e5', 'Nf3', 'f5']);
    expect(hit?.openingName).toBe('Latvian Gambit');
  });

  it('stays silent while several baked openings still share the moves', () => {
    // e4 e5 Nf3 is the Latvian, the Glek and the Elephant alike. Naming one
    // would be the invention; the game has not committed yet.
    expect(bakedTeachingForPly(null, ['e4', 'e5', 'Nf3'])).toBeNull();
  });

  it('a name the student gave resolves that ambiguity', () => {
    const hit = bakedTeachingForPly('Latvian Gambit', ['e4', 'e5', 'Nf3']);
    expect(hit?.openingName).toBe('Latvian Gambit');
    expect(hit?.ply).toBe(3);
  });

  it('an unrelated name never overrides the moves', () => {
    // The name agrees with nothing on this line, so it falls back to what the
    // board says — and the board says exactly one bake.
    expect(bakedTeachingForPly('Not A Real Opening', ['e4', 'e5', 'Nf3', 'f5'])?.openingName)
      .toBe('Latvian Gambit');
    // …and a line no bake is on stays null whatever it is called.
    expect(bakedTeachingForPly('Latvian Gambit', ['a4', 'a5'])).toBeNull();
  });
});

describe('the corpus is measured, not assumed', () => {
  it('holds the count of per-ply opening teaching as a floor', () => {
    const plies = Object.values(DATA.narrations).reduce((n, e) => n + e.spine.length, 0);
    // Shrink-only: baking more openings raises this, and losing teaching that
    // already shipped should fail loudly rather than quietly go quiet.
    expect(plies).toBeGreaterThanOrEqual(220);
    expect(Object.keys(DATA.narrations).length).toBeGreaterThanOrEqual(23);
  });
});

// The coach had a book continuation, and the book and the bake are two
// different continuations of the same opening. Asked for the Latvian, the book
// answered Nxe5 where the authored spine runs Bc4 — so the game left the taught
// line at move three and most of its reviewed prose was unreachable in the very
// game the student asked to be shown.
describe('the coach plays the line it has teaching for', () => {
  const play = (sans: string[]) => {
    const board = new Chess();
    for (const s of sans) board.move(s);
    return board.fen();
  };

  it('answers with the baked spine move, not the book one', () => {
    expect(bakedSpineNextMove('Latvian Gambit', play(['e4', 'e5', 'Nf3', 'f5']))).toBe('Bc4');
  });

  it('follows the whole line to its end and then stops', () => {
    const entry = DATA.narrations['latvian gambit'];
    for (let n = 0; n < entry.spine.length; n += 1) {
      expect(bakedSpineNextMove('Latvian Gambit', play(entry.spine.slice(0, n))))
        .toBe(entry.spine[n]);
    }
    expect(bakedSpineNextMove('Latvian Gambit', play(entry.spine))).toBeNull();
  });

  it('picks the line up through a transposition', () => {
    // Same position, other move order — a bake is about the board, not the
    // route taken to it.
    expect(bakedSpineNextMove('Latvian Gambit', play(['Nf3', 'f5', 'e4', 'e5']))).toBe('Bc4');
  });

  it('never steers a game that is somewhere the bake does not go', () => {
    expect(bakedSpineNextMove('Latvian Gambit', play(['d4', 'd5']))).toBeNull();
    expect(bakedSpineNextMove(null, play(['e4', 'e5']))).toBeNull();
  });
});

// A BAKE RECORDS WHOSE TEACHING IT IS, AND THE RUNTIME MUST HONOUR IT.
//
// David 2026-08-15, from the 12-opening transcript. `bakedTeachingForPly` read
// neither `studentSide` nor the `ideasFlipped` register beside it, so the
// primary register went to whoever was listening:
//
//   QGD (bake authored for White), student playing BLACK:
//     "We offer the gambit with c4, inviting Black to take on c4 and surrender
//      the center. If Black accepts, we can recapture with the pawn…"
//
// The coach calls the student "Black" and itself "we" in one sentence. Every
// claim is true of the board, so board-truth grading passes it and always
// will — whose teaching this is cannot be settled by looking at the position.
describe('the bake speaks to the side it was written for', () => {
  const TAIMANOV = DATA.narrations['sicilian defense taimanov variation'];
  const QGD = DATA.narrations['queen s gambit declined'];

  it('gives the primary register to the side it was authored for', () => {
    const hit = bakedTeachingForPly(TAIMANOV.openingName, TAIMANOV.spine.slice(0, 2), 'black');
    expect(hit?.text).toBe(TAIMANOV.ideas[1].text.trim());
  });

  it('gives the FLIPPED register to the other side when the bake has one', () => {
    expect(TAIMANOV.studentSide).toBe('black');
    expect(TAIMANOV.ideasFlipped?.length).toBe(TAIMANOV.spine.length);
    const hit = bakedTeachingForPly(TAIMANOV.openingName, TAIMANOV.spine.slice(0, 2), 'white');
    expect(hit?.text).toBe(TAIMANOV.ideasFlipped?.[1].text.trim());
    expect(hit?.text).not.toBe(TAIMANOV.ideas[1].text.trim());
  });

  it('STAYS SILENT rather than read the wrong side, when there is no flipped register', () => {
    // 21 of the 23 bakes have no opposite register. Silence costs a little
    // authored prose and buys teaching that is about the right player — the
    // corpus tier below reaches most of these plies anyway.
    expect(QGD.studentSide).toBe('white');
    expect(QGD.ideasFlipped ?? []).toHaveLength(0);
    expect(bakedTeachingForPly(QGD.openingName, QGD.spine.slice(0, 2), 'black')).toBeNull();
    // …and still teaches the side it was written for.
    expect(bakedTeachingForPly(QGD.openingName, QGD.spine.slice(0, 2), 'white')?.text).toBeTruthy();
  });

  it('is unchanged when the caller names no side', () => {
    const named = bakedTeachingForPly(QGD.openingName, QGD.spine.slice(0, 2), 'white');
    expect(bakedTeachingForPly(QGD.openingName, QGD.spine.slice(0, 2))?.text).toBe(named?.text);
  });
});
