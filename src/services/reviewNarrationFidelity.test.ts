// Fidelity nets for the house-voice pass, pinned on the exact lines the
// 2026-07-21 scrutiny caught in the Opera walk: a seat flip ("your queen on
// e6" for the OPPONENT's queen) and a fact-number drift ("two more" for a
// 3-point knight). Board accuracy alone passes both — these guards close it.
import { describe, it, expect } from 'vitest';
import { royalDefenderTarget } from './reviewTeachingPoints';
import { seatPieceReferences } from './groundedAnswer';
import { Chess } from 'chess.js';

describe('seatPieceReferences — the deterministic mine/yours package', () => {
  // Trap after 5.O-O: Black bishop c5, White bishop c4 — the detector's
  // seatless pin descriptions must come out SEATED so the model never
  // invents the possessive (David 2026-07-21: "ship the correct answer").
  const trapP9 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(s);
    return c.fen();
  })();

  it('stamps computed owners onto seatless detector descriptions', () => {
    const det = 'Bishop on c5 pins pawn on f2 against king on g1. Bishop on c4 pins pawn on f7 against knight on g8.';
    const seated = seatPieceReferences(det, trapP9, 'w');
    expect(seated).toContain('Their bishop on c5');
    expect(seated).toContain('your pawn on f2');
    expect(seated).toContain('your king on g1');
    expect(seated).toContain('Your bishop on c4');
    expect(seated).toContain('their pawn on f7');
  });

  it('leaves already-seated and mismatched references untouched', () => {
    const det = 'Their bishop on c5 is active. Plant a knight on d6 to blockade.';
    const seated = seatPieceReferences(det, trapP9, 'w');
    expect(seated).toContain('Their bishop on c5'); // already seated — unchanged
    expect(seated).toContain('a knight on d6');     // d6 is empty — untouched
  });

  it('absorbs a leading "the" instead of doubling articles', () => {
    const seated = seatPieceReferences('the bishop on c5 eyes f2.', trapP9, 'w');
    expect(seated).toBe('their bishop on c5 eyes f2.');
  });
});

describe('describeMoveInfluence — every move gets its own computed beat (David 2026-07-22)', () => {
  it('speaks what a QUIET developing move now does', async () => {
    const { describeMoveInfluence } = await import('./reviewFullData');
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const before = c.fen();
    c.move('Nf3');
    const out = describeMoveInfluence(before, c.fen(), 'Nf3');
    expect(out ?? '').toMatch(/knight on f3/);
    expect(out ?? '').toMatch(/eyes the pawn on e5/);
    expect(out ?? '').toMatch(/(?:fights for|joins the fight for|adds its weight to) d4, backing the d-pawn's push there/);
  });

  it('stays silent when the move creates no influence worth naming', async () => {
    const { describeMoveInfluence } = await import('./reviewFullData');
    const c = new Chess();
    const before = c.fen();
    c.move('a3');
    // a3: the a-pawn attacks b4 (empty, non-central) — nothing to say.
    expect(describeMoveInfluence(before, c.fen(), 'a3')).toBeNull();
  });
});

describe('royalDefenderTarget names every royal guard', () => {
  it('says "king and queen" when both guard (Opera after 13.Rxd7)', () => {
    // White rook on d7 attacks the d8 rook; d8 is defended by Ke8 AND Qe7.
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7']) c.move(s);
    const t = royalDefenderTarget(c.fen(), 'w');
    expect(t).toMatch(/guarded only by the king and queen/);
  });
});

describe('explainBestMoveGrounded — SEE claims verified against counter-tactics', () => {
  // David 2026-07-21 (Berlin review): "let White take on e5 and pick up a pawn
  // for nothing" — but taking e5 walked into a king-rook fork. SEE-on-e5 is
  // positive yet the win is refuted one move later; the claim must not ship.
  // Position: Black plays quiet ...a6; White CAN take dxe5 (SEE +1), but then
  // ...Nc2+ forks Ke1 and Ra1 from an untouchable square.
  const FEN_FORK = '6k1/p6p/8/4p3/1n1P4/8/P6P/R3K3 b - - 0 1';
  // Control: same position WITHOUT the b4 knight — dxe5 really is free.
  const FEN_FREE = '6k1/p6p/8/4p3/3P4/8/P6P/R3K3 b - - 0 1';

  it('suppresses the "wins the pawn" claim when the capture walks into a royal fork', async () => {
    const { explainBestMoveGrounded } = await import('./groundedAnswer');
    const why = explainBestMoveGrounded(FEN_FORK, 'a6', 'b4c2', 'black', null, null, 'mover');
    expect(why ?? '').not.toContain('dxe5');
  });

  it('still names a genuinely free capture when no counter-tactic exists', async () => {
    const { explainBestMoveGrounded } = await import('./groundedAnswer');
    // The better move must actually save the pawn: a loss that was already on
    // the board and stays after the better move is not this move's doing
    // (errorWhy causedByTheMove, 2026-10-10) — so the control compares a6
    // with …exd4, which keeps it.
    const why = explainBestMoveGrounded(FEN_FREE, 'a6', 'e5d4', 'black', null, null, 'mover');
    expect(why ?? '').toContain('dxe5');
  });
});

describe('describeStudentThreat — the threat call-out (David 2026-07-21)', () => {
  const fenBefore = 'rnbqkb1r/pp3ppp/2p5/3pp3/B3n3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 6';
  const fenAfter = 'rnbqk2r/pp3ppp/2p5/2bpp3/B3n3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 0 7';

  it('names the Nxf2 fork threat after the Berlin ...Bc5', async () => {
    const { describeStudentThreat } = await import('./groundedAnswer');
    const t = describeStudentThreat(fenBefore, fenAfter, 'b');
    expect(t).toMatch(/threatening Nxf2/);
    // Seat-neutral by design: the detector is side-agnostic (baking "their"
    // caused a seat bug), and the "you're now threatening" wrapper already
    // establishes whose pieces these are (board-awareness sweep, 2026-07-22).
    expect(t).toMatch(/forks the queen on d1 and rook on h1/);
  });

  it('stays silent on the starting position (no threat created)', async () => {
    const { describeStudentThreat } = await import('./groundedAnswer');
    const start = new Chess().fen();
    const c = new Chess(); c.move('e4');
    expect(describeStudentThreat(start, c.fen(), 'w')).toBeNull();
  });

  it('does not re-narrate a threat that already existed before the move', async () => {
    const { describeStudentThreat } = await import('./groundedAnswer');
    // When the pre-move position already carries the same Nxf2 threat, the
    // move did not CREATE it — the detector stays silent (repetition guard).
    const standing = fenAfter.replace(' w ', ' b ');
    expect(describeStudentThreat(standing, standing, 'b')).toBeNull();
  });
});

describe('opponent-threat teaching — identify, recognize, prevent (David 2026-07-22)', () => {
  // The Berlin position mirrored: the STUDENT is White; the opponent (Black)
  // just played ...Bc5, creating the Nxf2 fork threat. The coach must name
  // it, teach the pattern, and explain how d4 — the engine's stored answer,
  // which strikes the c5 bishop GUARDING f2 — defuses it.
  const fenBefore = 'rnbqkb1r/pp3ppp/2p5/3pp3/B3n3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 6';
  const fenAfter = 'rnbqk2r/pp3ppp/2p5/2bpp3/B3n3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 0 7';

  it('detectNewThreat returns the structured package — kind, landing, targets, guards', async () => {
    const { detectNewThreat } = await import('./groundedAnswer');
    const t = detectNewThreat(fenBefore, fenAfter, 'b');
    expect(t?.san).toBe('Nxf2');
    expect(t?.kind).toBe('fork');
    expect(t?.landing).toBe('f2');
    expect(t?.guards).toContain('c5'); // the bishop holding the combination together
  });

  it('recognition names the geometry to spot', async () => {
    const { detectNewThreat, describeThreatRecognition } = await import('./groundedAnswer');
    const t = detectNewThreat(fenBefore, fenAfter, 'b');
    const r = describeThreatRecognition(t!, fenAfter, 'w', true);
    expect(r).toMatch(/knight's-hop from f2/);
    expect(r).toMatch(/queen on d1 and rook on h1/);
  });

  // THE SEAT IS A PARAMETER, NOT AN ASSUMPTION. Same board, same threat — only
  // who is being forked changes. When the student is the MOVER (this is the shot
  // they missed, not the one they walked into), every possessive has to flip; a
  // "yours" surviving here is the function teaching the wrong perspective.
  it('flips every possessive when the student is the mover, not the victim', async () => {
    const { detectNewThreat, describeThreatRecognition } = await import('./groundedAnswer');
    const t = detectNewThreat(fenBefore, fenAfter, 'b');
    const victimSeat = describeThreatRecognition(t!, fenAfter, 'w', true);
    const moverSeat = describeThreatRecognition(t!, fenAfter, 'w', false);
    expect(moverSeat).toBeTruthy();
    // The geometry is seat-invariant — it is a fact about the board.
    expect(moverSeat).toMatch(/knight's-hop from f2/);
    expect(moverSeat).toMatch(/queen on d1 and rook on h1/);
    // The possessives are not.
    expect(moverSeat).not.toMatch(/\byours\b|\byou cover\b|\btheir piece\b/);
    expect(moverSeat).not.toBe(victimSeat);
  });

  it('prevention explains d4 as undermining the guard', async () => {
    const { detectNewThreat, describeThreatPrevention } = await import('./groundedAnswer');
    const t = detectNewThreat(fenBefore, fenAfter, 'b');
    const p = describeThreatPrevention(fenAfter, t!, 'd4', 'b');
    expect(p).toMatch(/hitting the bishop on c5/);
    expect(p).toMatch(/holding the whole thing together/);
  });
});

// ── A DEMONSTRATIVE IS A DETERMINER (David's Alapin, plies 34 and 44) ───────
// "the plan from here is to make that knight on d4 the boss of the board" came
// back as "…make that YOUR KNIGHT on d4…". `seatPieceReferences` knew the leads
// your/their/the/a/an and NOT that/this, so the bare noun matched, no lead was
// captured, and the possessive was stamped in front of the NOUN instead of
// replacing the determiner. Untested until now, which is how it shipped.
describe('seatPieceReferences and determiners', () => {
  // Black knight on d4, white to move — so from Black's seat it is "your".
  const FEN = 'r1bqkb1r/pppp1ppp/5n2/8/3n4/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 5';

  it('REPLACES a demonstrative rather than stacking a possessive after it', async () => {
    const { seatPieceReferences } = await import('./groundedAnswer');
    const out = seatPieceReferences('make that knight on d4 the boss of the board', FEN, 'b');
    expect(out).toContain('your knight on d4');
    expect(out).not.toMatch(/that your|this your/);
  });

  it('keeps the seat — dropping the possessive would lose who owns the piece', async () => {
    const { seatPieceReferences } = await import('./groundedAnswer');
    const out = seatPieceReferences('make that knight on d4 the boss', FEN, 'w');
    expect(out).toContain('their knight on d4'); // same board, other seat
  });

  it('still leaves an author possessive and an indefinite article alone', async () => {
    const { seatPieceReferences } = await import('./groundedAnswer');
    expect(seatPieceReferences('your knight on d4 holds', FEN, 'b')).toContain('your knight on d4');
    expect(seatPieceReferences('creates a passed pawn on d4', FEN, 'b')).toContain('a passed pawn on d4');
  });
});

describe('a lowercased colour possessive is a determiner too (hand walk 2340, move 14)', () => {
  it('"white\'s king on g1" becomes "your king on g1", never "white\'s your king"', () => {
    const fen = '4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 20';
    const out = seatPieceReferences("watch out — white's king on g1 has no escape square", fen, 'w');
    expect(out).toContain('your king on g1');
    expect(out).not.toMatch(/white's/i);
  });
});

describe('a detector description is seat-free at the source (hand walk 2340)', () => {
  it('the back-rank description names "the king", which the seater then owns', async () => {
    const { detectTactics } = await import('./tacticsDetector');
    // White king g1 boxed by f2/g2/h2, black rook on e8 can check on e1 (the
    // d1 rook covers it, so it is a weakness, not a mate).
    const fen = '4r1k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 20';
    const br = detectTactics(fen).tactics.find((t) => t.type === 'back_rank');
    expect(br?.description).toMatch(/^The king on g1/);
    expect(seatPieceReferences(br!.description, fen, 'w')).toMatch(/^Your king on g1/);
  });
});
