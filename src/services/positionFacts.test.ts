import { describe, it, expect, vi } from 'vitest';
import { computePositionFacts, clauseText, statusBandChange } from './positionFacts';

describe('statusBandChange — the general STATUS line', () => {
  it('speaks a directional line when the assessment crosses a band', () => {
    expect(statusBandChange(120, 0)).toMatch(/better side/i);      // level → better
    expect(statusBandChange(400, 120)).toMatch(/winning/i);        // better → winning
    expect(statusBandChange(-150, 0)).toMatch(/worse side/i);      // level → worse
    expect(statusBandChange(0, 150)).toMatch(/edge is gone/i);     // better → level
    expect(statusBandChange(-400, -100)).toMatch(/slipped away/i); // worse → lost
  });
  it('is silent when the band did not change (no per-ply drumbeat)', () => {
    expect(statusBandChange(120, 100)).toBe('');   // both "better"
    expect(statusBandChange(10, -20)).toBe('');    // both "level"
    expect(statusBandChange(500, 350)).toBe('');   // both "winning"
  });
});

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

describe('computePositionFacts — the composer', () => {
  it('stays SILENT in a quiet position (no clause earns voice)', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat });
    expect(r.importance.speak).toBe(false);
    expect(r.clauses).toHaveLength(0);
  });

  // A WIRE THAT DOES NOT FIRE IS NOT A WIRE (CLAUDE.md). The method beat reached
  // post-game review only; these four surfaces share this composer and taught no
  // method at all. This proves a real habit comes OUT, and that it CLOSES the
  // briefing rather than preaching before the evidence.
  // NB fullmove 14: the method beat sits BELOW the opening gate ("in the opening
  // nothing but a real hanging threat speaks"), on purpose — the habit rides a
  // middlegame briefing, it does not add a second sentence to move five.
  it('closes the briefing with the METHOD — the habit, last', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat });
    const method = r.clauses.filter((c) => c.kind === 'method');
    expect(method).toHaveLength(1);
    expect(method[0].text).toMatch(/their|they/i);
    // LAST — the board fact, then the idea, then the routine.
    expect(r.clauses[r.clauses.length - 1].kind).toBe('method');
    // It teaches the ROUTINE; the must-defend clause already named the threat,
    // so the method beat must not restate the piece or the square.
    expect(method[0].text).not.toMatch(/knight|e5/i);
  });

  // THE DOOR IS WIRED — and a wire that does not fire is not a wire. These
  // prove steps 3-6 of `coachDecider` actually ran over this composer's output,
  // not that the import exists.
  it('the door orders by computed stakes — the hanging piece leads the habit', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat });
    // The hanging knight carries stakes (3 points, two plies away) and the habit
    // carries none, so the computed order puts the knight first — and every
    // staked clause ahead of every unstaked one.
    const kinds = r.clauses.map((c) => c.kind);
    expect(kinds.indexOf('must-defend')).toBeLessThan(kinds.indexOf('method'));
    const firstUnstaked = r.clauses.findIndex((c) => !c.stakes);
    const lastStaked = r.clauses.map((c) => !!c.stakes).lastIndexOf(true);
    expect(firstUnstaked === -1 || lastStaked < firstUnstaked).toBe(true);
  });

  it('returns the quiet trail — silence is a verdict you can read back', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(Array.isArray(r.quiet)).toBe(true);
    for (const q of r.quiet) expect(['subsumed', 'below-bar', 'importance', 'need']).toContain(q.why);
  });

  it('the METHOD beat is never subsumed — it carries no squares, and it is not a restatement of a fact', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.clauses.some((c) => c.kind === 'method')).toBe(true);
    expect(r.quiet.some((q) => /habit|order of operations/i.test(q.text))).toBe(false);
  });

  it('couples the geometry at emission — a must-defend names the square it is about', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat });
    const md = r.clauses.find((c) => c.kind === 'must-defend');
    expect(md?.squares).toEqual(['e5']);
  });

  // SAY-ONCE. The repetition these surfaces actually suffer from is a STANDING
  // fact re-earned every ply, not duplicate geometry.
  it('says a standing fact once and hands the caller what to remember', async () => {
    // A standing pin: …Bg4 holds the f3-knight to the d1-queen. (The Alapin
    // fixture this used measured a PAWN pinned down its own file, which is not
    // a pin — it can still push — and stopped speaking 2026-09-24.)
    const fen = 'r2qk2r/ppp2ppp/2np1n2/2b1p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 2 12';
    const first = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis: flat });
    const standing = first.clauses.filter((c) => c.kind === 'structure-plan' || c.kind === 'latent-danger' || c.kind === 'student-leans' || c.kind === 'opponent-leans');
    // The fixture must actually produce one, or this test proves nothing.
    expect(standing.length, 'no standing clause at this position — pick another fixture').toBeGreaterThan(0);
    expect(first.remember).toEqual(standing.map((c) => c.text));

    const again = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis: flat, alreadySaid: new Set(first.remember) });
    for (const t of first.remember) {
      expect(again.clauses.some((c) => c.text === t), `still speaking: ${t}`).toBe(false);
      expect(again.quiet.some((q) => q.text === t && q.why === 'said-already')).toBe(true);
    }
  });

  it('a piece that is STILL hanging says so again — urgency is not a standing fact', async () => {
    const fen = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14';
    const first = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis: flat });
    const hang = first.clauses.find((c) => c.kind === 'must-defend');
    expect(hang).toBeTruthy();
    // It is deliberately NOT in `remember`, so it can never be suppressed…
    expect(first.remember).not.toContain(hang!.text);
    // …and even if a caller wrongly fed it back, it still speaks? No: the door
    // honours the set it is given. The protection is that it never gets IN.
    const again = await computePositionFacts({ posture: 'walk', fen, moverColor: 'w', studentColor: 'w', analysis: flat, alreadySaid: new Set(first.remember) });
    expect(again.clauses.some((c) => c.kind === 'must-defend')).toBe(true);
  });

  it('teaches no method to a student who is not the one to move', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14', moverColor: 'w', studentColor: 'b', analysis: flat });
    expect(r.clauses.some((c) => c.kind === 'method')).toBe(false);
  });

  it('stays out of the opening — the habit rides a middlegame briefing', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.clauses.some((c) => c.kind === 'must-defend')).toBe(true);
    expect(r.clauses.some((c) => c.kind === 'method')).toBe(false);
  });

  it('names the standing must-defend, board-true', async () => {
    // White Ne5 hangs to …dxe5; inject a balanced analysis so the position reads contested.
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.mustDefend.net).toBe(3);
    expect(r.importance.speak).toBe(true);
    expect(r.clauses[0].text).toMatch(/threatening to win the knight on e5/);
  });

  it('speaks the delayed-castling warning IN the opening when the king is stuck in the centre (§9)', async () => {
    // Move 8, White king still on e1, e4/d5 tension, Black rook aimed down the
    // e-file — the "castle now" moment must speak even inside the opening window.
    const r = await computePositionFacts({ posture: 'walk', fen: '4r1k1/8/8/3p4/4P3/8/8/4K2R w K - 0 8', moverColor: 'w', studentColor: 'w', analysis: flat });
    const ck = r.clauses.find((c) => /king is still in the centre/i.test(c.text));
    expect(ck).toBeTruthy();
    expect(ck?.text).toMatch(/e-file/);
  });

  it('speaks the king-safety clause when a castled king is exposed under fire (§9)', async () => {
    // Broken kingside shelter (f2/g2 gone), Black queen h4 + rook g8 on it; past
    // the opening so §9 fires.
    const r = await computePositionFacts({ posture: 'walk', fen: '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 20', moverColor: 'w', studentColor: 'w', analysis: flat });
    const ke = r.clauses.find((c) => /king's cover is thin/i.test(c.text));
    expect(ke).toBeTruthy();
  });

  it('reframes the SAME threat as prophylaxis when the student is clearly winning (§9)', async () => {
    // Same hanging-knight board, but the student is up big and on move — the
    // teaching shifts from "you must survive" to "don't let them punch back".
    const winning = { ...flat, topLines: [line(1, 260), line(2, 240), line(3, 220)], evaluation: 260, wdl: { win: 600, draw: 260, loss: 140 } };
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: winning });
    expect(r.mustDefend.net).toBe(3);
    const md = r.clauses.find((c) => c.kind === 'must-defend');
    expect(md?.text).toMatch(/don't let them punch back/);
    expect(md?.text).toMatch(/knight on e5/); // still board-true — names the real piece
  });

  it('frames the decision as the OPPONENT’s intent when the opponent is on move', async () => {
    // Opponent (White) is to move in a sharp MIDDLEGAME position; student is Black.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ posture: 'walk', fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    // No "your critical moment" — it's the opponent's decision, framed as theirs.
    expect(r.clauses.some((c) => c.kind === 'opponent-intent')).toBe(true);
    expect(r.clauses.some((c) => /this is the moment to slow down/i.test(c.text))).toBe(false);
  });

  const SHARP_FEN = 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14';
  const keyMoment = (r: { clauses: Array<{ kind: string; text: string }> }): string | null =>
    r.clauses.find((c) => c.kind === 'key-moment')?.text ?? null;

  it('calls a critical moment when one move stands far ahead (mover-POV)', async () => {
    // White to move in a MIDDLEGAME, best line +300 vs the field at +20/+10 → only-move.
    // ASSERT THE CLAIM, NOT THE STEM: the wrapper rotates on the ply by design
    // (David 2026-09-18), so a test pinned to one opener fails on a healthy
    // build — which is exactly what it did when the rotation landed.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ posture: 'walk', fen: SHARP_FEN, moverColor: 'w', studentColor: 'w', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    const text = keyMoment(r);
    expect(text, 'no key-moment clause at a one-move position').toBeTruthy();
    // THE COUNT and THE STAKE are the facts; both must be in the sentence.
    expect(text).toMatch(/\bone move\b/i);
    expect(text).toContain('keeps the win');   // +300 mover-POV — NOT "equality"
  });

  it('says TWO moves when two hold, and agrees grammatically with its own count', async () => {
    // 0 / -40 / -900 at the default band (tol 100cp) → exactly two hold.
    const forgiving = { ...flat, topLines: [line(1, 0), line(2, -40), line(3, -900)], evaluation: 0, wdl: { win: 330, draw: 340, loss: 330 } };
    const r = await computePositionFacts({ posture: 'walk', fen: SHARP_FEN, moverColor: 'w', studentColor: 'w', analysis: forgiving });
    const text = keyMoment(r);
    expect(text, 'no key-moment clause at a two-move fork').toBeTruthy();
    expect(text).toMatch(/\btwo moves\b/i);
    expect(text).toContain('keep you level');
    expect(text).not.toMatch(/two moves keeps/);
  });

  it('says NOTHING when three moves hold — nothing hinges', async () => {
    const settled = { ...flat, topLines: [line(1, 30), line(2, 10), line(3, -20)], evaluation: 30, wdl: { win: 340, draw: 340, loss: 320 } };
    const r = await computePositionFacts({ posture: 'walk', fen: SHARP_FEN, moverColor: 'w', studentColor: 'w', analysis: settled });
    expect(keyMoment(r)).toBeNull();
  });

  it('NEVER claims "equality" when the mover is LOST — the stake is read off the line', async () => {
    const losing = { ...flat, topLines: [line(1, -500), line(2, -900), line(3, -1400)], evaluation: -500, wdl: { win: 40, draw: 160, loss: 800 } };
    const r = await computePositionFacts({ posture: 'walk', fen: SHARP_FEN, moverColor: 'w', studentColor: 'w', analysis: losing });
    const text = keyMoment(r);
    if (text) {
      expect(text).toContain('limits the damage');
      expect(text).not.toMatch(/equality|keeps you level|keeps the win/);
    }
  });

  it('stays quiet of campaign/decision talk in the OPENING — only a real hanging piece speaks (David 2026-08-26 regression)', async () => {
    // A sharp analysis on a MOVE-2 board must NOT produce "critical moment" /
    // "knife-edge" / "best piece, trade it off" — that flooded move one.
    const evalBoard = vi.fn().mockResolvedValue('');
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moverColor: 'w', studentColor: 'w', analysis: sharp, evalBoard });
    expect(r.clauses.some((c) => c.kind === 'key-moment' || c.kind === 'opponent-intent')).toBe(false);
    expect(r.clauses.some((c) => c.kind === 'student-leans' || c.kind === 'opponent-leans')).toBe(false);
    expect(evalBoard).not.toHaveBeenCalled(); // no perturbation probe in the opening
  });

  it('runs the expensive perturbation ONLY when the moment matters (and out of the opening)', async () => {
    const evalBoard = vi.fn().mockResolvedValue('');
    // Quiet → not called.
    await computePositionFacts({ posture: 'walk', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat, evalBoard });
    expect(evalBoard).not.toHaveBeenCalled();
    // Must-defend (important) in a MIDDLEGAME → called. (Ne5 hangs to …dxe5.)
    await computePositionFacts({ posture: 'walk', fen: 'r1bqk2r/ppp2ppp/3p1n2/4N3/1bB1P3/2N5/PPPP1PPP/R1BQ1RK1 w kq - 0 12', moverColor: 'w', studentColor: 'w', analysis: flat, evalBoard });
    expect(evalBoard).toHaveBeenCalled();
  });

  it('emits the FUNDAMENTAL clause (the plan the best move serves) in the ranked briefing', async () => {
    // David 2026-09-06: tie the fundamentals into the main computer voice. A
    // teaching beat on the student's move → the best move (Rf1-d1, taking the
    // open d-file) surfaces as a woven, fundamental-first plan clause. The clause
    // teaches the IDEA, never the SAN, so it never hands over the move.
    const lineWithMoves = { rank: 1, evaluation: 20, moves: ['f1d1'], mate: null };
    const analysis = { ...flat, topLines: [lineWithMoves, line(2, 15), line(3, 10)] };
    const r = await computePositionFacts({ posture: 'walk',
      fen: 'r4rk1/pp3ppp/2n1bn2/2b5/8/2N1BN2/PP3PPP/R4RK1 w - - 0 14',
      moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true,
    });
    const fund = r.clauses.find((c) => c.kind === 'fundamental');
    expect(fund).toBeTruthy();
    expect(fund!.text).toMatch(/open d-file/);
    expect(fund!.text).not.toMatch(/Rd1|f1d1/); // teaches the idea, never the SAN
    // clauseText carries it in rank order, and a surface can exclude it by kind.
    expect(clauseText(r.clauses)).toContain(fund!.text);
    expect(clauseText(r.clauses, ['fundamental'])).not.toContain(fund!.text);
  });

  it('goes quiet in a DECIDED game — a swing there is not important', async () => {
    const decided = { ...flat, topLines: [line(1, 800), line(2, 780), line(3, 760)], evaluation: 800, wdl: { win: 980, draw: 18, loss: 2 } };
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: decided, cpLossCp: 300 });
    expect(r.importance.contested).toBe(false);
    expect(r.clauses).toHaveLength(0); // the swing is silenced by the contested gate
  });
});

describe('the concrete opponent-intent clause (fires through positionFacts)', () => {
  const lineM = (rank: number, evaluation: number, moves: string[]) => ({ rank, evaluation, moves, mate: null });
  it('names the opponent\'s move (guide-don\'t-tell: withholds your reply) when they\'re on move', async () => {
    // White (the opponent) to move, sharp (only-move) so importance speaks; the
    // fan names Re1 with ...a6, Bg5 with ...h6. Student is Black.
    const sharp = {
      ...flat,
      topLines: [lineM(1, 300, ['f1e1', 'a7a6']), lineM(2, 20, ['c1g5', 'h7h6'])],
      evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 },
    };
    const r = await computePositionFacts({ posture: 'walk',
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14',
      moverColor: 'w', studentColor: 'b', analysis: sharp,
    });
    expect(r.opponentIntent).not.toBeNull();
    expect(r.opponentIntent!.plans[0]).toMatchObject({ opponentMove: 'Re1', studentReply: 'a6' });
    const oi = r.clauses.find((c) => c.kind === 'opponent-intent')!;
    expect(oi.text).toMatch(/opponent's Re1/);
    expect(oi.text).not.toMatch(/\ba6\b/); // reply withheld on your own game
  });
});

describe('the latent-danger prevention clause (fires through positionFacts)', () => {
  it('warns about a pin IN WAITING — the student\'s own knight shields bishop and king', async () => {
    // White (student) to move, move 14. Black rook e8; white knight e5 shields
    // the bishop on e3 in front of Ke1. Moving the knight opens the pin.
    const r = await computePositionFacts({ posture: 'walk',
      fen: '4r1k1/8/8/4N3/8/4B3/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.latentDanger).toMatchObject({ frontSquare: 'e3', backPiece: 'k', latent: true });
    const texts = clauseText(r.clauses);
    expect(texts.some((t) => /bishop on e3.*king.*file.*open the line/i.test(t))).toBe(true);
  });

  it('a STANDING pin is not restated as a latent danger (hand walk 2340: said twice)', async () => {
    // Bishop e5 already pinned to Ke1 by the rook — the tactic/threat lanes own it.
    const r = await computePositionFacts({ posture: 'walk',
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.latentDanger).toBeNull();
    expect(clauseText(r.clauses).some((t) => /share that file/i.test(t))).toBe(false);
  });

  it('does not warn when it is the opponent\'s move (not the student\'s concern)', async () => {
    const r = await computePositionFacts({ posture: 'walk',
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: flat,
    });
    expect(r.latentDanger).toBeNull();
  });

  it('warns about a TRADE that would create a pin (v2), preferring it over the standing warning', async () => {
    // White to move: Bxe5 would line the bishop up in front of its own king on
    // the open e-file with the black rook — a pin the trade creates.
    const r = await computePositionFacts({ posture: 'walk',
      fen: '4r1k1/8/8/4n3/3B4/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.tradeDanger).not.toBeNull();
    expect(r.tradeDanger).toMatchObject({ tradeTo: 'e5', frontPiece: 'b', backPiece: 'k' });
    const clause = r.clauses.find((c) => c.kind === 'latent-danger')!;
    expect(clause.text).toMatch(/before you trade on e5/);
  });
});

describe('B1 — the pre-gate and the door judge ONE signals object (2026-09-22)', () => {
  // The Italian-shaped middlegame where the student can set up a knight fork
  // in two quiet moves: `standingChance` opens the pre-gate (teaching, rank 45)
  // on an INTERRUPT surface. Until B1 the door built its own signals literal
  // WITHOUT standingChance, so the same ply was then closed as an 'importance'
  // silence — the T5 fork two moves out was dead on every live surface and the
  // emission called it a legitimate close. Negative control: hand the door a
  // literal without `standingChance` again → `decision.speak` reads false.
  // Walk 6: the queen was on d8 here, guarding c7, so Nb5–c7 was never a fork
  // (a vacuous safety gate passed it). With the queen on g6 it is one.
  const FORK_IN_TWO = 'r1b1kb1r/pp3ppp/2np1nq1/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 14';

  it('a fork the student can set up SPEAKS through the door on an interrupt surface', async () => {
    const r = await computePositionFacts({ posture: 'interrupt', fen: FORK_IN_TWO, moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.latentFork).not.toBeNull();
    expect(r.importance.tier).toBe('teaching');
    expect(r.clauses.some((c) => c.kind === 'latent-chance')).toBe(true);
    expect(r.quiet.filter((q) => q.why === 'importance')).toHaveLength(0);
  });

  it('BLAMES BY STATEMENT: judgeMoment and decide take the same identifier, never two literals', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/positionFacts.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/judgeMoment\(momentSignals,/);
    expect(src).toMatch(/decide\(\s*momentSignals,/);
    // One construction site for the moment's signals.
    expect((src.match(/const momentSignals: ImportanceSignals = \{/g) ?? []).length).toBe(1);
  });
});

describe('clauseText', () => {
  it('drops kinds a surface already covers (no walk-over)', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    const withMd = clauseText(r.clauses);
    const withoutMd = clauseText(r.clauses, ['must-defend']);
    expect(withMd.some((t) => /threatening to win/.test(t))).toBe(true);
    expect(withoutMd.some((t) => /threatening to win/.test(t))).toBe(false);
  });
});

describe('positionFacts — the computed CONCEPT joins the spoken briefing (one computer)', () => {
  const rookEndingFen = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 40';
  const analysis = {
    bestMove: 'c1c8', evaluation: 500, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0,
    topLines: [{ rank: 1, moves: ['c1c8'], evaluation: 500, mate: null }, { rank: 2, moves: ['b8a7'], evaluation: 400, mate: null }],
  } as unknown as import('../types').StockfishAnalysis;

  it('adds a ranked "concept" clause for an ending, above the fundamental tier', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: rookEndingFen, moverColor: 'w', studentColor: 'w', analysis, rating: 1500 });
    const concept = r.clauses.find((c) => c.kind === 'concept');
    expect(concept).toBeDefined();
    expect(concept!.rank).toBeGreaterThanOrEqual(39);
    expect(concept!.text.toLowerCase()).toMatch(/lucena|rook ending/); // the fixture is a Lucena → the named technique leads
  });

  it('speaks no concept in the opening (nothing but a real threat speaks there)', async () => {
    const r = await computePositionFacts({ posture: 'walk', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis });
    expect(r.clauses.find((c) => c.kind === 'concept')).toBeUndefined();
  });
});

describe('the verdict and its plan echo are one fact (hand walk 2340)', () => {
  const line = (rank: number, evaluation: number, uci: string) => ({ rank, evaluation, moves: [uci], mate: null });
  const analysis = { evaluation: 30, bestMove: 'e1g1', depth: 16, topLines: [line(1, 30, 'e1g1'), line(2, -250, 'f3e5'), line(3, 10, 'd2d3')] } as never;
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 14';
  const hole = [{ clusterId: 'analysis:phase:middlegame', bucket: 'middlegame', label: 'x', openCount: 2, severity: 50, puzzleThemes: [], total: 3 }] as never;

  it('where "The move is O-O — it castles…" speaks, "The plan here: castle…" does not', async () => {
    const r = await computePositionFacts({ posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: hole });
    const kinds = r.clauses.map((c) => c.kind);
    expect(kinds).toContain('deliberation');
    expect(kinds).not.toContain('fundamental');
  });

  it('where the verdict is held back, the plan still teaches the idea', async () => {
    const r = await computePositionFacts({ posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: [] });
    expect(r.clauses.map((c) => c.kind)).toEqual(expect.arrayContaining(['fundamental']));
    expect(r.clauses.some((c) => c.kind === 'deliberation')).toBe(false);
  });
});

describe('a structure plan is said once by its PLAN, not its words (hand walk 1200)', () => {
  const flatAnalysis = { evaluation: 0, bestMove: '', depth: 12, topLines: [], nodesPerSecond: 0 } as unknown as Parameters<typeof computePositionFacts>[0]['analysis'];
  it('the pawn race does not repeat when only the counts move', async () => {
    // White passer d4→d5, Black passer a7; queens on. Same verdict both plies.
    const a = '4r1k1/p4ppp/8/8/3P4/8/5PPP/3Q2K1 w - - 0 30';
    const b = '4r1k1/p4ppp/8/3P4/8/8/5PPP/3Q2K1 w - - 0 31';
    const first = await computePositionFacts({ posture: 'walk', fen: a, moverColor: 'w', studentColor: 'w', analysis: flatAnalysis, teachingBeat: true });
    const plan = first.clauses.find((c) => c.kind === 'structure-plan');
    expect(plan, 'fixture must speak a plan').toBeTruthy();
    const second = await computePositionFacts({ posture: 'walk', fen: b, moverColor: 'w', studentColor: 'w', analysis: flatAnalysis, teachingBeat: true, alreadySaid: new Set(first.remember) });
    expect(second.clauses.some((c) => c.kind === 'structure-plan')).toBe(false);
  });
});

describe('when the structure plan changes, the coach says so (David 2026-09-25)', () => {
  const flatAnalysis = { evaluation: 0, bestMove: '', depth: 12, topLines: [], nodesPerSecond: 0 } as unknown as Parameters<typeof computePositionFacts>[0]['analysis'];
  it('a different plan is framed as a change; the same plan stays quiet', async () => {
    // Race (both runners) → then only THEIR passer is left.
    const race = '4r1k1/p4ppp/8/8/3P4/8/5PPP/3Q2K1 w - - 0 30';
    const theirsOnly = '4r1k1/p4ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 32';
    const first = await computePositionFacts({ posture: 'walk', fen: race, moverColor: 'w', studentColor: 'w', analysis: flatAnalysis, teachingBeat: true });
    const firstPlan = first.clauses.find((c) => c.kind === 'structure-plan');
    expect(firstPlan?.text).not.toMatch(/plan changes/);
    const said = new Set(first.remember);
    const second = await computePositionFacts({ posture: 'walk', fen: theirsOnly, moverColor: 'w', studentColor: 'w', analysis: flatAnalysis, teachingBeat: true, alreadySaid: said });
    const changed = second.clauses.find((c) => c.kind === 'structure-plan');
    expect(changed?.text).toMatch(/^The plan changes here: their passed pawn on a7/);
    for (const k of second.remember) said.add(k);
    const third = await computePositionFacts({ posture: 'walk', fen: theirsOnly, moverColor: 'w', studentColor: 'w', analysis: flatAnalysis, teachingBeat: true, alreadySaid: said });
    expect(third.clauses.some((c) => c.kind === 'structure-plan')).toBe(false);
  });
});
