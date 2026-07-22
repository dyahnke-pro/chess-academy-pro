// Fidelity nets for the house-voice pass, pinned on the exact lines the
// 2026-07-21 scrutiny caught in the Opera walk: a seat flip ("your queen on
// e6" for the OPPONENT's queen) and a fact-number drift ("two more" for a
// 3-point knight). Board accuracy alone passes both — these guards close it.
import { describe, it, expect } from 'vitest';
import { narrationSeatFaithful, narrationNumbersFaithful } from './coachFeatureService';
import { royalDefenderTarget } from './reviewTeachingPoints';
import { seatPieceReferences } from './groundedAnswer';
import { Chess } from 'chess.js';

describe('narrationSeatFaithful (board-truth possessives)', () => {
  // Opera after 14...Qe6 — Black queen on e6, White (student) queen on b3.
  const operaP28 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6']) c.move(s);
    return c.fen();
  })();

  it('rejects the Opera ply-28 seat flip — their queen voiced as yours', () => {
    const flipped = 'Your queen on e6 skewers your queen on b3 with the pawn on a2 behind it.';
    expect(narrationSeatFaithful(flipped, operaP28, 'w')).toBe(false);
  });

  it('accepts the correctly-seated version of the same claim', () => {
    const ok = 'Their queen on e6 skewers your queen on b3 with the pawn on a2 behind it.';
    expect(narrationSeatFaithful(ok, operaP28, 'w')).toBe(true);
  });

  // Trap after 5.O-O — Black bishop on c5, White (student) bishop on c4:
  // the warm pass invented BOTH possessives inverted (scrutiny 2026-07-21).
  const trapP9 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(s);
    return c.fen();
  })();

  it('rejects invented possessives the deterministic fact never carried', () => {
    const flipped = "Your bishop on c5 pins the f2-pawn to the king, and your opponent's bishop on c4 pins f7 to the knight.";
    expect(narrationSeatFaithful(flipped, trapP9, 'w')).toBe(false);
  });

  it('accepts the same pins seated correctly', () => {
    const ok = "Their bishop on c5 pins the f2-pawn to the king, and your bishop on c4 pins f7 to the knight.";
    expect(narrationSeatFaithful(ok, trapP9, 'w')).toBe(true);
  });

  it('ignores possessive claims about empty or mismatched squares (board-accuracy guard owns those)', () => {
    const w = 'Your rook on h5 dominates.';
    expect(narrationSeatFaithful(w, trapP9, 'w')).toBe(true);
  });
});

describe('narrationNumbersFaithful', () => {
  it('rejects a material number the fact never stated', () => {
    const det = 'cxb5 captures the knight, wins 3 points of material.';
    const drifted = 'then cxb5 grabs the knight for two more points of material';
    expect(narrationNumbersFaithful(det, drifted)).toBe(false);
  });

  it('accepts spelled-out versions of the same number', () => {
    const det = 'Bxb4+ captures the queen, wins 9 points of material.';
    const ok = 'Bxb4 takes the queen with check — nine points of material in the bag.';
    expect(narrationNumbersFaithful(det, ok)).toBe(true);
  });

  it('leaves meta-counts like "three pins" unguarded', () => {
    const det = 'Bishop pins d7 against the king. Bishop pins f6 against the queen. Rook pins d7 against the rook.';
    const ok = 'Three pins now — d7 held twice, f6 nailed to the queen.';
    expect(narrationNumbersFaithful(det, ok)).toBe(true);
  });
});

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

describe('narrationCoversFacets — the LLM never chooses which facts to state (David 2026-07-22)', () => {
  const det = "[move] You: the move Nf3 develops. [tactic] Their bishop on c5 pins your pawn on f2 against your king on g1. [does] The knight on f3 now fights for e5 and d4.";

  it('rejects a warm that dropped the pin facet entirely', async () => {
    const { narrationCoversFacets } = await import('./coachFeatureService');
    const w = 'The knight comes to f3, fighting for e5 and d4 — natural development.';
    expect(narrationCoversFacets(det, w)).toBe(false); // no c5/f2/g1 footprint — pin dropped
  });

  it('accepts a full reword that keeps a footprint of every facet', async () => {
    const { narrationCoversFacets } = await import('./coachFeatureService');
    const w = 'The knight lands on f3, staking a claim on e5 — but mind the bishop on c5: it has your f2 pawn nailed to the king on g1.';
    expect(narrationCoversFacets(det, w)).toBe(true);
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
    expect(out ?? '').toMatch(/fights for d4/);
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
    const why = explainBestMoveGrounded(FEN_FORK, 'a6', 'b4c2', 'black');
    expect(why ?? '').not.toContain('dxe5');
  });

  it('still names a genuinely free capture when no counter-tactic exists', async () => {
    const { explainBestMoveGrounded } = await import('./groundedAnswer');
    const why = explainBestMoveGrounded(FEN_FREE, 'a6', 'a7a5', 'black');
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
    expect(t).toMatch(/forks their queen on d1 and rook on h1/);
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
    const r = describeThreatRecognition(t!, fenAfter, 'w');
    expect(r).toMatch(/knight's-hop from f2/);
    expect(r).toMatch(/queen on d1 and rook on h1/);
  });

  it('prevention explains d4 as undermining the guard', async () => {
    const { detectNewThreat, describeThreatPrevention } = await import('./groundedAnswer');
    const t = detectNewThreat(fenBefore, fenAfter, 'b');
    const p = describeThreatPrevention(fenAfter, t!, 'd4', 'b');
    expect(p).toMatch(/striking the bishop on c5/);
    expect(p).toMatch(/holding the whole combination together/);
  });
});
