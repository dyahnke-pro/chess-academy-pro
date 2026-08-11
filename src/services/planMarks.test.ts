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
import { planMarks } from './planMarks';
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

/** THE PARTS THE CALLER HANDS OVER — the same shape `CoachTeachPage` builds
 *  after grading each part separately. Marks are drawn from THIS, never from the
 *  utterance, so the tests exercise the real coupling (David 2026-08-10: "It
 *  needs to be deterministic, handed in the package"). */
type Said = Array<{ squares: string[]; side: 'key' | 'mine' | 'theirs' }>;
function saidAll(plan: LookaheadPlan): Said {
  const parts: Said = [];
  if (keySquareLine(plan.keySquares) && plan.keySquares[0]) {
    parts.push({ squares: [plan.keySquares[0].square], side: 'key' });
  }
  if (plan.theirs.text) parts.push({ squares: plan.theirs.spokenClauses.flatMap((c) => c.squares), side: 'theirs' });
  if (plan.mine.text) parts.push({ squares: plan.mine.spokenClauses.flatMap((c) => c.squares), side: 'mine' });
  return parts;
}
function saidTheirs(plan: LookaheadPlan): Said {
  return saidAll(plan).filter((p) => p.side !== 'mine');
}

describe('marks are drawn only for what was spoken', () => {
  it('marks the squares of the utterance', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.highlights.length, 'the board stayed bare while the coach named squares').toBeGreaterThan(0);
    expect(marks.arrows.length, 'no future move was drawn').toBeGreaterThan(0);
  });

  it('draws NOTHING when the plan said nothing', () => {
    const plan = italianPlan('black');
    expect(planMarks({ plan, saidParts: [], fen: ITALIAN, studentColor: 'black' }))
      .toEqual({ arrows: [], highlights: [] });
  });

  it('drops a clause the caller left out of the utterance', () => {
    // The caller slices the plan's sentences by hint register, so half the plan
    // routinely goes unspoken. Marking it anyway would put a claim on the board
    // that was never made out loud.
    const plan = italianPlan('black');
    const full = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    const theirsOnly = planMarks({
      plan,
      saidParts: saidTheirs(plan),
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
    //
    // Under the old prose-scanning contract this was a live risk: the marks read
    // the whole utterance and a note's square looked exactly like a plan's. It
    // is now structural — a lane can only offer the squares it was handed, and
    // the plan is handed the plan's — so the test asserts the property still
    // holds rather than guarding a scan that no longer exists.
    const plan = italianPlan('black');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.highlights.some((h) => h.square === 'h7')).toBe(false);
    expect(marks.arrows.some((a) => a.endSquare === 'h7')).toBe(false);
  });
});

describe('every arrow is true of the board it is drawn on', () => {
  it('starts on a real piece of the moving side', () => {
    for (const side of ['white', 'black'] as const) {
      const plan = italianPlan(side);
      const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: side });
      const board = new Chess(ITALIAN);
      for (const a of marks.arrows) {
        const piece = board.get(a.startSquare as never) as { color?: string } | undefined;
        expect(piece, `arrow from ${a.startSquare} — that square is empty`).toBeTruthy();
      }
    }
  });

  it('points where the line really goes', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    for (const a of marks.arrows) {
      expect(
        plan.path.some((s) => s.to === a.endSquare),
        `arrow to ${a.endSquare}, which no move in the line reaches`,
      ).toBe(true);
    }
  });

  it('never draws an arrow onto its own start square', () => {
    const plan = italianPlan('black');
    for (const a of planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' }).arrows) {
      expect(a.startSquare).not.toBe(a.endSquare);
    }
  });

  it('says nothing at all about an unreadable board', () => {
    const plan = italianPlan('black');
    expect(planMarks({ plan, saidParts: saidAll(plan), fen: 'not a fen', studentColor: 'black' }))
      .toEqual({ arrows: [], highlights: [] });
  });
});

describe('the student\'s own next move is never handed over', () => {
  it('draws no arrow for the first ply when it is theirs to play', () => {
    // White is to move in the fixture, so a WHITE student is the one on move —
    // and the first ply of the line is the move they have to find.
    const plan = italianPlan('white');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'white' });
    const first = plan.path[0];
    expect(
      marks.arrows.some((a) => a.startSquare === first.from && a.endSquare === first.to),
      'the arrow drew the student\'s own best move',
    ).toBe(false);
  });

  it('still highlights that square — led, not told', () => {
    const plan = italianPlan('white');
    const said = saidAll(plan);
    const marks = planMarks({ plan, saidParts: said, fen: ITALIAN, studentColor: 'white' });
    if (said.some((p) => p.squares.includes(plan.path[0].to))) {
      expect(marks.highlights.some((h) => h.square === plan.path[0].to)).toBe(true);
    }
  });

  it('does draw the OPPONENT\'s next move — that is the warning', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    expect(marks.arrows.some((a) => a.color === '#ef4444'), 'nothing was drawn about what is coming').toBe(true);
  });
});

describe('the board does not turn into a diagram', () => {
  it('NO CAP — every square the coach named gets its highlight', () => {
    // This asserted the opposite until 2026-08-10: two arrows and three
    // highlights, with whatever ranked lowest silently dropped. David: "Any move
    // the coach states as a future or possible move/plan needs to be arrowed and
    // key squares mentioned need to be highlighted… No caps." A named square
    // with a bare board is the same defect as a mark nobody spoke, pointing the
    // other way — the student hears d5 and finds nothing to look at.
    const plan = italianPlan('black');
    const said = saidAll(plan);
    const marks = planMarks({ plan, saidParts: said, fen: ITALIAN, studentColor: 'black' });
    const named = [...new Set(said.flatMap((p) => p.squares))].filter((sq) => /^[a-h][1-8]$/.test(sq));
    for (const sq of named) {
      expect(marks.highlights.some((h) => h.square === sq), `named ${sq} and never marked it`).toBe(true);
    }
    expect(named.length, 'the fixture named nothing — it proves nothing').toBeGreaterThan(0);
  });

  it('never marks the same square twice', () => {
    const plan = italianPlan('black');
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen: ITALIAN, studentColor: 'black' });
    expect(new Set(marks.highlights.map((h) => h.square)).size).toBe(marks.highlights.length);
  });
});

// `squaresNamedIn` and its three tests are GONE (2026-08-10). It existed to
// recover the plan's squares by sweeping the utterance for anything
// square-shaped — a validator on prose, and the thing David called out: "It
// needs to be deterministic, handed in the package." The producer knows its
// squares and hands them over now, so there is nothing left to parse and no
// parser left to test.

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
      const said = saidAll(plan);
      const marks = planMarks({ plan, saidParts: said, fen, studentColor });
      // What the caller handed over IS what may be marked — plus the squares a
      // stated piece walk passes through, which the walk itself claims.
      const allowed = new Set<string>(said.flatMap((p) => p.squares));
      for (const side2 of [plan.mine, plan.theirs]) {
        for (const sq of side2.maneuver?.path ?? []) allowed.add(sq);
      }
      for (const h of marks.highlights) {
        expect(allowed.has(h.square), `${san}: marked ${h.square}, which nothing handed over claims`).toBe(true);
      }
      for (const a of marks.arrows) {
        expect(allowed.has(a.endSquare), `${san}: arrow to ${a.endSquare}, unclaimed`).toBe(true);
        // A walk's later hops start from a square the piece has not reached yet,
        // so only the arrows claiming to be playable NOW must start on a piece.
        const isHop = [plan.mine, plan.theirs].some((sp) => {
          const path = sp.maneuver?.path ?? [];
          return path.some((sq, i) => i > 0 && sq === a.startSquare && path[i + 1] === a.endSquare);
        });
        if (isHop) continue;
        const piece = board.get(a.startSquare as never) as { color?: string } | undefined;
        expect(piece, `${san}: arrow from the empty square ${a.startSquare}`).toBeTruthy();
      }
      checked += 1;
    }
    expect(checked, 'the sweep never computed a plan — the fixture is broken').toBeGreaterThan(5);
  }, 30_000);
});

describe('an arrow is a move somebody could actually play', () => {
  // David 2026-08-10, from a live screenshot: "bad arrows, not deterministically
  // made." The board drew `f6-b6` and `f6-c4` — a knight on f6 reaching neither
  // square in one move, two straight lines out of the same piece.
  //
  // The cause was this file's own cleverness: `originOf` walks the chain back so
  // a knight going f3→d4→b5 is drawn from where the student can SEE it. That
  // reads well in prose and draws a line through squares the piece never
  // travels, which is indistinguishable from a hallucination.
  const positions: Array<[string, 'white' | 'black']> = [
    ['rnbqk2r/1p2bppp/p3pn2/3p4/3PP3/2NBBN2/PP3PPP/R2QK2R w KQkq - 0 9', 'white'],
    ['r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 5', 'black'],
    ['r3k2r/1b2bppp/p3p3/1p2P3/1P2B3/P1B5/4nPPP/R3NRK1 w kq - 1 20', 'white'],
  ];

  it('THE REGRESSION: never draws a move that is not legal right now', () => {
    for (const [fen, side] of positions) {
      const board = new Chess(fen);
      // Drive real engine-shaped lines: the first legal move and five replies.
      const probe = new Chess(fen);
      const uci: string[] = [];
      for (let i = 0; i < 8; i += 1) {
        const ms = probe.moves({ verbose: true });
        if (!ms.length) break;
        const m = ms[i % ms.length];
        probe.move(m.san);
        uci.push(`${m.from}${m.to}`);
      }
      const plan = planFromUci(fen, uci, side);
      if (!plan) continue;
      const marks = planMarks({ plan, saidParts: saidAll(plan), fen, studentColor: side });
      // A PIECE WALK IS A CHAIN, AND ITS LATER HOPS ARE NOT LEGAL YET.
      //
      // The rule this test was written for stands: an arrow claiming to be
      // playable NOW must really be playable now — that is what killed the
      // f6-b6 / f6-c4 pair David saw, one straight line drawn across a
      // three-move route. But he then asked for the route itself: "Including
      // piece walks." Drawn hop by hop it is honest — every arrow is a real ply
      // of the engine's line, in order — and only the FIRST hop can be legal on
      // this board, because the later ones start where the piece has not
      // arrived yet. So: legal now, or a consecutive pair of a real route.
      const routeHops = new Set<string>();
      for (const side2 of [plan.mine, plan.theirs]) {
        const path = side2.maneuver?.path ?? [];
        for (let i = 0; i + 1 < path.length; i += 1) routeHops.add(`${path[i]}${path[i + 1]}`);
      }
      // LEGAL FOR THE PIECE THAT OWNS IT, not for whoever is on move.
      //
      // This asked `board.moves()`, which only returns the side to move — so it
      // demanded that a plan about the OPPONENT be playable on the student's
      // turn, which is never. It passed only because the marks had the same bug:
      // David's game log showed "They want to walk the bishop round to b2" with
      // zero arrows, four times. A plan is about what happens NEXT, so the
      // question is whether the piece could play that move when it is its turn.
      const legalForMover = (from: string, to: string): boolean => {
        const piece = board.get(from as never) as { color?: 'w' | 'b' } | undefined;
        if (!piece?.color) return false;
        const parts = board.fen().split(' ');
        parts[1] = piece.color;
        parts[3] = '-';
        try {
          return new Chess(parts.join(' ')).moves({ verbose: true })
            .some((m) => m.from === from && m.to === to);
        } catch { return false; }
      };
      for (const a of marks.arrows) {
        expect(
          legalForMover(a.startSquare, a.endSquare) || routeHops.has(`${a.startSquare}${a.endSquare}`),
          `${a.startSquare}-${a.endSquare} is neither playable by its own piece nor a hop of a stated walk in ${fen}`,
        ).toBe(true);
      }
    }
  });

  it('never draws two arrows out of the same piece', () => {
    // "f6-b6 AND f6-c4" — even when both are legal, one piece going to two
    // places at once is not a thing a board can show.
    for (const [fen, side] of positions) {
      const probe = new Chess(fen);
      const uci: string[] = [];
      for (let i = 0; i < 8; i += 1) {
        const ms = probe.moves({ verbose: true });
        if (!ms.length) break;
        probe.move(ms[i % ms.length].san);
        uci.push(`${ms[i % ms.length].from}${ms[i % ms.length].to}`);
      }
      const plan = planFromUci(fen, uci, side);
      if (!plan) continue;
      const marks = planMarks({ plan, saidParts: saidAll(plan), fen, studentColor: side });
      const origins = marks.arrows.map((a) => a.startSquare);
      expect(new Set(origins).size, `two arrows from ${origins.join(', ')}`).toBe(origins.length);
    }
  });

  it('still HIGHLIGHTS a destination it will not arrow', () => {
    // Losing the arrow must not lose the lead-the-eye. A journey the piece
    // cannot make in one move still marks where the play is going.
    const fen = 'rnbqk2r/1p2bppp/p3pn2/3p4/3PP3/2NBBN2/PP3PPP/R2QK2R w KQkq - 0 9';
    const probe = new Chess(fen);
    const uci: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const ms = probe.moves({ verbose: true });
      if (!ms.length) break;
      probe.move(ms[0].san);
      uci.push(`${ms[0].from}${ms[0].to}`);
    }
    const plan = planFromUci(fen, uci, 'white');
    if (!plan) return;
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen, studentColor: 'white' });
    if (marks.highlights.length === 0) return; // nothing was claimed this ply
    expect(marks.highlights.length).toBeGreaterThanOrEqual(marks.arrows.length);
  });
});

describe('a piece walk is drawn hop by hop', () => {
  // David 2026-08-10: "Any move the coach states as a future or possible
  // move/plan needs to be arrowed and key squares mentioned need to be
  // highlighted… Including piece walks."
  //
  // This is also what resolves his earlier complaint — "bad arrows, not
  // deterministically made", from a board showing f6-b6 and f6-c4 out of one
  // knight. A route is WRONG as one straight line from start to finish: that
  // line is not a move, and it skips the square the whole idea turns on. It is
  // RIGHT as a chain, where every arrow is a real ply of the engine's line.
  const walkPlan = (): { plan: LookaheadPlan; fen: string } | null => {
    // Find a position whose best-ish line reroutes a piece through three squares.
    const game = new Chess();
    for (const san of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']) game.move(san);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const fen = game.fen();
      const probe = new Chess(fen);
      const uci: string[] = [];
      for (let i = 0; i < 8; i += 1) {
        const ms = probe.moves({ verbose: true });
        if (!ms.length) break;
        const m = ms[(i * 3 + attempt) % ms.length];
        probe.move(m.san);
        uci.push(`${m.from}${m.to}`);
      }
      const side = game.turn() === 'w' ? 'white' : 'black';
      const plan = planFromUci(fen, uci, side);
      if (plan && (plan.mine.maneuver || plan.theirs.maneuver)) return { plan, fen };
      const next = game.moves()[0];
      if (!next) break;
      game.move(next);
    }
    return null;
  };

  it('draws each leg of the route, never one line across it', () => {
    const found = walkPlan();
    expect(found, 'no fixture produced a piece walk — the test proves nothing').not.toBeNull();
    const { plan, fen } = found!;
    const side = new Chess(fen).turn() === 'w' ? 'white' : 'black';
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen, studentColor: side });
    for (const sp of [plan.mine, plan.theirs]) {
      const path = sp.maneuver?.path ?? [];
      if (path.length < 3) continue;
      // The straight line from where the piece starts to where it ends is
      // exactly the arrow that must NOT exist.
      const shortcut = marks.arrows.find(
        (a) => a.startSquare === path[0] && a.endSquare === path[path.length - 1],
      );
      expect(shortcut, `the route ${path.join('→')} was flattened into one arrow`).toBeUndefined();
    }
  }, 30_000);

  it('every arrow it draws is a real consecutive step of the line', () => {
    const found = walkPlan();
    if (!found) return;
    const { plan, fen } = found;
    const side = new Chess(fen).turn() === 'w' ? 'white' : 'black';
    const marks = planMarks({ plan, saidParts: saidAll(plan), fen, studentColor: side });
    const board = new Chess(fen);
    const hops = new Set<string>();
    for (const sp of [plan.mine, plan.theirs]) {
      const path = sp.maneuver?.path ?? [];
      for (let i = 0; i + 1 < path.length; i += 1) hops.add(`${path[i]}${path[i + 1]}`);
    }
    for (const a of marks.arrows) {
      const legalNow = board.moves({ verbose: true })
        .some((m) => m.from === a.startSquare && m.to === a.endSquare);
      expect(
        legalNow || hops.has(`${a.startSquare}${a.endSquare}`),
        `${a.startSquare}-${a.endSquare} is neither playable now nor a step of a stated walk`,
      ).toBe(true);
    }
  }, 30_000);
});

describe("the OPPONENT's plan gets arrows too", () => {
  // David's game log, 2026-08-11: "No arrows when talking about future plans or
  // piece walks." Four turns in one game spoke "They want to walk the bishop
  // round to b2, by way of f6" and drew ZERO arrows.
  //
  // `isLegalNow` asked `board.moves()`, which only ever returns moves for the
  // side TO MOVE. Every arrow about the opponent's plan was therefore impossible
  // by construction — and so was every arrow about the student's own plan
  // whenever it was the opponent's turn, which is half of all turns.
  it('draws a walk for the side that is NOT on move', () => {
    // White to move; the plan is about BLACK's bishop walking g5 → f6 → b2.
    const fen = '4rrk1/5pp1/p6q/1p4bQ/3RB3/P5PP/1P3P2/3R2K1 w - - 3 30';
    const plan = italianPlan('white');
    // Hand the walk in directly — this is a rule about legality, not about
    // whether this particular engine line happens to produce that route.
    plan.theirs.maneuver = { piece: 'bishop', path: ['g5', 'f6', 'b2'] };
    const marks = planMarks({
      plan,
      saidParts: [{ squares: ['b2'], side: 'theirs' }],
      fen,
      studentColor: 'white',
    });
    expect(marks.arrows.length, "the opponent's walk drew nothing").toBeGreaterThan(0);
    expect(marks.arrows.map((a) => `${a.startSquare}-${a.endSquare}`)).toContain('g5-f6');
  });

  it('still refuses a first hop the piece could not make on its own turn', () => {
    const fen = '4rrk1/5pp1/p6q/1p4bQ/3RB3/P5PP/1P3P2/3R2K1 w - - 3 30';
    const plan = italianPlan('white');
    // g5 to a1 is not a bishop move from there — colour of the square aside, the
    // path is blocked. Flipping the turn must not become "anything goes".
    plan.theirs.maneuver = { piece: 'bishop', path: ['g5', 'a1', 'b2'] };
    const marks = planMarks({
      plan,
      saidParts: [{ squares: ['b2'], side: 'theirs' }],
      fen,
      studentColor: 'white',
    });
    expect(marks.arrows.map((a) => `${a.startSquare}-${a.endSquare}`)).not.toContain('g5-a1');
  });
});
