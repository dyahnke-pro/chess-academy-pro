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
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat });
    expect(r.importance.speak).toBe(false);
    expect(r.clauses).toHaveLength(0);
  });

  it('names the standing must-defend, board-true', async () => {
    // White Ne5 hangs to …dxe5; inject a balanced analysis so the position reads contested.
    const r = await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.mustDefend.net).toBe(3);
    expect(r.importance.speak).toBe(true);
    expect(r.clauses[0].text).toMatch(/threatening to win the knight on e5/);
  });

  it('speaks the delayed-castling warning IN the opening when the king is stuck in the centre (§9)', async () => {
    // Move 8, White king still on e1, e4/d5 tension, Black rook aimed down the
    // e-file — the "castle now" moment must speak even inside the opening window.
    const r = await computePositionFacts({ fen: '4r1k1/8/8/3p4/4P3/8/8/4K3 w - - 0 8', moverColor: 'w', studentColor: 'w', analysis: flat });
    const ck = r.clauses.find((c) => /king is still in the centre/i.test(c.text));
    expect(ck).toBeTruthy();
    expect(ck?.text).toMatch(/e-file/);
  });

  it('speaks the king-safety clause when a castled king is exposed under fire (§9)', async () => {
    // Broken kingside shelter (f2/g2 gone), Black queen h4 + rook g8 on it; past
    // the opening so §9 fires.
    const r = await computePositionFacts({ fen: '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 20', moverColor: 'w', studentColor: 'w', analysis: flat });
    const ke = r.clauses.find((c) => /king's cover is thin/i.test(c.text));
    expect(ke).toBeTruthy();
  });

  it('reframes the SAME threat as prophylaxis when the student is clearly winning (§9)', async () => {
    // Same hanging-knight board, but the student is up big and on move — the
    // teaching shifts from "you must survive" to "don't let them punch back".
    const winning = { ...flat, topLines: [line(1, 260), line(2, 240), line(3, 220)], evaluation: 260, wdl: { win: 600, draw: 260, loss: 140 } };
    const r = await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: winning });
    expect(r.mustDefend.net).toBe(3);
    const md = r.clauses.find((c) => c.kind === 'must-defend');
    expect(md?.text).toMatch(/don't let them punch back/);
    expect(md?.text).toMatch(/knight on e5/); // still board-true — names the real piece
  });

  it('frames the decision as the OPPONENT’s intent when the opponent is on move', async () => {
    // Opponent (White) is to move in a sharp MIDDLEGAME position; student is Black.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    // No "your critical moment" — it's the opponent's decision, framed as theirs.
    expect(r.clauses.some((c) => c.kind === 'opponent-intent')).toBe(true);
    expect(r.clauses.some((c) => /this is the moment to slow down/i.test(c.text))).toBe(false);
  });

  it('calls a critical moment when one move stands far ahead (mover-POV)', async () => {
    // White to move in a MIDDLEGAME, best line +300 vs the field at +20/+10 → only-move.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    expect(r.clauses.some((c) => /critical moment|only one move/i.test(c.text))).toBe(true);
  });

  it('stays quiet of campaign/decision talk in the OPENING — only a real hanging piece speaks (David 2026-08-26 regression)', async () => {
    // A sharp analysis on a MOVE-2 board must NOT produce "critical moment" /
    // "knife-edge" / "best piece, trade it off" — that flooded move one.
    const evalBoard = vi.fn().mockResolvedValue('');
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moverColor: 'w', studentColor: 'w', analysis: sharp, evalBoard });
    expect(r.clauses.some((c) => c.kind === 'key-moment' || c.kind === 'opponent-intent')).toBe(false);
    expect(r.clauses.some((c) => c.kind === 'student-leans' || c.kind === 'opponent-leans')).toBe(false);
    expect(evalBoard).not.toHaveBeenCalled(); // no perturbation probe in the opening
  });

  it('runs the expensive perturbation ONLY when the moment matters (and out of the opening)', async () => {
    const evalBoard = vi.fn().mockResolvedValue('');
    // Quiet → not called.
    await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat, evalBoard });
    expect(evalBoard).not.toHaveBeenCalled();
    // Must-defend (important) in a MIDDLEGAME → called. (Ne5 hangs to …dxe5.)
    await computePositionFacts({ fen: 'r1bqk2r/ppp2ppp/3p1n2/4N3/1bB1P3/2N5/PPPP1PPP/R1BQ1RK1 w kq - 0 12', moverColor: 'w', studentColor: 'w', analysis: flat, evalBoard });
    expect(evalBoard).toHaveBeenCalled();
  });

  it('emits the FUNDAMENTAL clause (the plan the best move serves) in the ranked briefing', async () => {
    // David 2026-09-06: tie the fundamentals into the main computer voice. A
    // teaching beat on the student's move → the best move (Rf1-d1, taking the
    // open d-file) surfaces as a woven, fundamental-first plan clause. The clause
    // teaches the IDEA, never the SAN, so it never hands over the move.
    const lineWithMoves = { rank: 1, evaluation: 20, moves: ['f1d1'], mate: null };
    const analysis = { ...flat, topLines: [lineWithMoves, line(2, 15), line(3, 10)] };
    const r = await computePositionFacts({
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
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: decided, cpLossCp: 300 });
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
    const r = await computePositionFacts({
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
  it('warns when the student\'s own bishop is pinned to the king — even in a quiet spot', async () => {
    // White (student) to move, move 14. Bishop e5 lined in front of Ke1 down the
    // e-file, Black rook on e8. Flat/quiet analysis — the warning fires anyway.
    const r = await computePositionFacts({
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.latentDanger).not.toBeNull();
    const texts = clauseText(r.clauses);
    expect(texts.some((t) => /bishop on e5.*king.*file|share that file/i.test(t))).toBe(true);
    expect(r.clauses.some((c) => c.kind === 'latent-danger')).toBe(true);
  });

  it('does not warn when it is the opponent\'s move (not the student\'s concern)', async () => {
    const r = await computePositionFacts({
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: flat,
    });
    expect(r.latentDanger).toBeNull();
  });

  it('warns about a TRADE that would create a pin (v2), preferring it over the standing warning', async () => {
    // White to move: Bxe5 would line the bishop up in front of its own king on
    // the open e-file with the black rook — a pin the trade creates.
    const r = await computePositionFacts({
      fen: '4r1k1/8/8/4n3/3B4/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.tradeDanger).not.toBeNull();
    expect(r.tradeDanger).toMatchObject({ tradeTo: 'e5', frontPiece: 'b', backPiece: 'k' });
    const clause = r.clauses.find((c) => c.kind === 'latent-danger')!;
    expect(clause.text).toMatch(/before you trade on e5/);
  });
});

describe('clauseText', () => {
  it('drops kinds a surface already covers (no walk-over)', async () => {
    const r = await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    const withMd = clauseText(r.clauses);
    const withoutMd = clauseText(r.clauses, ['must-defend']);
    expect(withMd.some((t) => /threatening to win/.test(t))).toBe(true);
    expect(withoutMd.some((t) => /threatening to win/.test(t))).toBe(false);
  });
});
