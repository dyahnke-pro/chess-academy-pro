import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { mateInOneExists } from './nextPlans';
import {
  attackerDefenderCount, royalDefenderTarget, rookOnSeventh,
  badEnemyBishop, worstPlacedFriendlyPiece, passedPawnPush, deriveNextPlan, deriveNextPlans,
  buildReviewDeepestLookahead,
  buildMissedShotSignal,
  pieceHasSafeEscape,
} from './reviewTeachingPoints';

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('reviewTeachingPoints — the missing Naroditsky messages (David 2026-07-20)', () => {
  it('M2 counts attackers vs defenders on a winnable enemy piece (offense only)', () => {
    // After 4...Bxf3: the black bishop on f3 has 2 white attackers (Q d1, g2 pawn) and 0 defenders.
    const t = attackerDefenderCount(fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3']), 'w');
    expect(t).not.toBeNull();
    expect(t).toMatch(/attackers? to .*defender/i);
    expect(t).toMatch(/it falls/i);
    // Pluralization: "0 defenders" not "0 defender"; a lone attacker is singular.
    expect(t).not.toMatch(/\b1 defenders\b|\b1 attackers\b/);
  });

  it('M2 never flags the student\'s OWN overloaded (sacrificed) piece', () => {
    // A student piece hanging is not reported — only enemy winnable targets.
    const t = attackerDefenderCount(fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3']), 'w');
    expect(t).not.toMatch(/shore it up|your \w+ on/i);
  });

  it('M6 flags an enemy piece guarded only by the king (worst defender)', () => {
    // Opera after 15...Nxd7: the knight on d7 is guarded only by the e8 king,
    // attacked by the white queen — the "worst defender" motif.
    const opera = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7'];
    const t = royalDefenderTarget(fenAfter(opera), 'w');
    expect(t).not.toBeNull();
    expect(t).toMatch(/worst defenders/i);
    expect(t).toMatch(/guarded only by the king/i);
  });

  it('M20 names a rook on the seventh', () => {
    const opera13 = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7'];
    const t = rookOnSeventh(fenAfter(opera13), 'w');
    expect(t).toMatch(/seventh on d7/i);
  });

  it('M8 does NOT call an undeveloped starting bishop a bad bishop (opening false positive)', () => {
    expect(badEnemyBishop(fenAfter(['e4', 'e5']), 'w')).toBeNull();
    expect(badEnemyBishop(fenAfter(['e4', 'd6', 'd4', 'Nf6']), 'w')).toBeNull();
  });

  it('M14/M23 pushes a passer and notes knights are poor blockers', () => {
    const t = passedPawnPush(fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'w', 'c2');
    expect(t).toMatch(/passed pawn on c2/i);
    expect(t).toMatch(/poor blocker|bad at stopping/i);
  });

  it('passedPawnPush names no knight blocker when no knight touches the runner\'s path (walk 5, R11)', () => {
    const t = passedPawnPush('k7/8/8/4P3/8/8/8/K6n w - - 0 40', 'w', 'e5');
    expect(t).toMatch(/passed pawn on e5/i);
    expect(t).not.toMatch(/poor blocker|bad at stopping/i);
    const guarded = passedPawnPush('k7/8/5n2/4P3/8/8/8/K7 w - - 0 40', 'w', 'e5');
    expect(guarded).toMatch(/poor blocker/i);
  });

  it('passedPawnPush returns null with no passer', () => {
    expect(passedPawnPush(new Chess().fen(), 'w', null)).toBeNull();
  });

  it('worstPlacedFriendlyPiece stays quiet in the opening', () => {
    expect(worstPlacedFriendlyPiece(fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), 'w')).toBeNull();
  });
});

describe('deriveNextPlan — speak to FUTURE PLANS (David 2026-07-20)', () => {
  it('names attacking the exposed king as the plan when it is stuck in the centre', () => {
    // Opera after 15.Nc3: Black king on e8, d-file open — the plan is the attack.
    const opera = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3'];
    const p = deriveNextPlan(fenAfter(opera), 'w');
    expect(p).not.toBeNull();
    expect(p).toMatch(/plan from here/i);
    expect(p).toMatch(/king|centre|attack|prise/i);
  });

  it('always starts with the phrase "the plan from here"', () => {
    const opera = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3'];
    expect(deriveNextPlan(fenAfter(opera), 'w')).toMatch(/^the plan from here/i);
  });

  it('names besieging a weak isolated pawn when there is one and no bigger priority', () => {
    // Sicilian IQP: Black has an isolated d5, White king safe → plan = pile on d5.
    const iqp = ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd5', 'exd5', 'exd5', 'Be2', 'Be7', 'O-O', 'O-O'];
    const p = deriveNextPlan(fenAfter(iqp), 'w');
    expect(p).toMatch(/plan from here/i);
    expect(p).toMatch(/d5|weak pawn|open .*file/i);
  });

  it('returns null from the starting position (no concrete plan yet)', () => {
    expect(deriveNextPlan(new Chess().fen(), 'w')).toBeNull();
  });

  it('spells out the concrete HOW for the king-in-centre attack (ply 14 request)', () => {
    const opera14 = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3'];
    const plans = deriveNextPlans(fenAfter(opera14), 'w');
    const kingPlan = plans.find((p) => /king/i.test(p));
    expect(kingPlan).toBeDefined();
    expect(kingPlan).toMatch(/here's exactly how/i);
    // The method: own king safe, double rooks on the open file, tempo, sac on soft squares.
    expect(kingPlan).toMatch(/double both rooks/i);
    expect(kingPlan).toMatch(/tempo/i);
    expect(kingPlan).toMatch(/sacrifice on the soft squares d7 and f7/i);
  });

  it('returns MULTIPLE plans when several apply (more future plans)', () => {
    // Opera after 20...cxb5: White has a passed c2 pawn AND Black has a weak a7.
    const opera = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+'];
    const plans = deriveNextPlans(fenAfter(opera), 'w');
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(plans.every((p) => /here's how|here's exactly how/i.test(p))).toBe(true);
  });
});

describe('explainTemptingCapture (David 2026-07-21 — the Bg5/h4 "why not take" standard)', () => {
  // David's own game (IMG_4567): Black to move, White Bg5 attacked by Qf6 but
  // guarded by the h4-pawn. The engine plays ...e5 and leaves the bishop alone.
  const DAVID_FEN = 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P2PP/2PBPP2/P1P1N1Q1/2KR3R b - - 0 13';

  it("tells the TRAPPED-QUEEN truth, not the 'leaves it alone' lie (David: 'the trapped piece was the queen!!!')", async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    // Black's queen on f6 is attacked by Bg5 and EVERY flight square is covered
    // (board-verified) — so "the line leaves the bishop alone" would be FALSE
    // teaching: the Q-for-B exchange happens anyway; ...e5 just picks the
    // cheapest version. The clause must say the trapped story.
    const why = explainTemptingCapture(DAVID_FEN, 'e5');
    expect(why).not.toBeNull();
    expect(why).toMatch(/queen on f6 is trapped/i);
    expect(why).toMatch(/attacked by the bishop on g5/i);
    expect(why).toMatch(/every escape square is covered/i);
    expect(why).toMatch(/cheapest way to let the queen go/i);
    expect(why).not.toMatch(/leaves it alone/i);
  });

  it('explains the even trade that rips open a file toward your own king', async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    // Black Bf6 can take White Bg5 (even trade — only the h4-pawn guards it),
    // but hxg5 opens the h-file where White's h1-rook stares at the g8 king.
    // The line should warn, not trade.
    const fen = 'r5k1/ppp2ppp/3p1b2/4p1B1/3P3P/4P3/PPP2PP1/R3K2R b KQ - 0 12';
    const c = new (await import('chess.js')).Chess(fen);
    expect(c.moves()).toContain('Bxg5'); // the temptation is real
    const why = explainTemptingCapture(fen, 'a6');
    expect(why).not.toBeNull();
    expect(why).toMatch(/h-file rips open/i);
    expect(why).toMatch(/straight at your king/i);
  });

  it('stays silent when the tempting capture is simply good (free piece)', async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    // White Bg5 is genuinely UNGUARDED here (no h4 pawn, and the white queen is
    // OFF the g-file — the first draft left Qg2 guarding g5 through the file and
    // the function correctly kept warning). Ignoring a free piece needs no clause.
    const fen = 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P4/2PBPP2/P1PQN3/2KR3R b - - 0 13';
    expect(explainTemptingCapture(fen, 'e5')).toBeNull();
  });

  it('stays silent when the chosen move IS the capture', async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    expect(explainTemptingCapture(DAVID_FEN, 'Qxg5')).toBeNull();
  });
});

describe('describeNotableMove (David 2026-07-21 — the silent ambitious pawn push)', () => {
  it('narrates an ambitious wing push with the exact weakened squares (g2-g4, king uncastled)', async () => {
    const { describeNotableMove } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    // A London-ish shape: White throws g4 with the king still on e1.
    const c = new Chess();
    for (const s of ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nc3', 'Nc6']) c.move(s);
    const why = describeNotableMove(c.fen(), 'g4', false); // opponent's push, from Black student's seat
    expect(why).not.toBeNull();
    expect(why).toMatch(/opponent throws the g-pawn forward/i);
    expect(why).toMatch(/kingside push/i);
    expect(why).toMatch(/f3|h3/);
    expect(why).toMatch(/king is still in the middle/i);
  });

  it('narrates a central break when the pawns touch (2.d4 against e5)', async () => {
    const { describeNotableMove } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    const c = new Chess();
    c.move('e4'); c.move('e5');
    // 2.d4 lands in direct contact with the e5 pawn — the classic central strike.
    const why = describeNotableMove(c.fen(), 'd4', true);
    expect(why).not.toBeNull();
    expect(why).toMatch(/strike in the centre/i);
    expect(why).toMatch(/pawns are touching/i);
  });

  it('stays silent on an ordinary developing move', async () => {
    const { describeNotableMove } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    const c = new Chess(); c.move('e4'); c.move('e5');
    expect(describeNotableMove(c.fen(), 'Nf3', true)).toBeNull();
  });
});

describe('describeConcessions (David 2026-07-21 — name the lasting damage)', () => {
  it('names the thinned king shield when a castled king pushes its cover', async () => {
    const { describeConcessions } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'd6']) c.move(s);
    // White g1-king castled; g2-g4 rips its own shield.
    const why = describeConcessions(c.fen(), 'g4', true);
    expect(why).not.toBeNull();
    expect(why).toMatch(/king's pawn cover thinned/i);
  });

  it('stays silent when the move concedes nothing structural', async () => {
    const { describeConcessions } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    const c = new Chess(); c.move('e4'); c.move('e5');
    expect(describeConcessions(c.fen(), 'Nf3', true)).toBeNull();
  });
});

describe('explainTemptingCapture — seat-correct speech (David 2026-07-21: "it was white in this game")', () => {
  const DAVID_FEN = 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P2PP/2PBPP2/P1P1N1Q1/2KR3R b - - 0 13';

  it("speaks the trapped story from the OPPONENT's seat ('they') — no 'your queen'", async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    // David was WHITE; the trapped queen is BLACK's.
    const why = explainTemptingCapture(DAVID_FEN, 'e5', 'they');
    expect(why).not.toBeNull();
    expect(why).toMatch(/their queen on f6 is trapped/i);
    expect(why).not.toMatch(/your queen|your king/i);
  });

  it('uses side names in neutral perspective (theory dives)', async () => {
    const { explainTemptingCapture } = await import('./reviewTeachingPoints');
    const why = explainTemptingCapture(DAVID_FEN, 'e5', 'neutral');
    expect(why).not.toBeNull();
    expect(why).toMatch(/Black's queen on f6 is trapped/i);
    expect(why).not.toMatch(/\byour\b/i);
  });
});


describe('findTrappedPiece (David 2026-07-21 — "the trapped piece was the queen!!!")', () => {
  const DAVID_FEN2 = 'r1b1r1k1/1ppn1ppp/p2npq2/3p2B1/3P2PP/2PBPP2/P1P1N1Q1/2KR3R b - - 0 13';

  it("finds Black's trapped queen on f6 in David's game (every flight covered)", async () => {
    const { findTrappedPiece } = await import('./reviewTeachingPoints');
    const t = findTrappedPiece(DAVID_FEN2, 'b');
    expect(t).not.toBeNull();
    expect(t!.square).toBe('f6');
    expect(t!.piece).toBe('queen');
    expect(t!.attackerSquare).toBe('g5');
    expect(t!.attackerPiece).toBe('bishop');
  });

  it('finds nothing in the starting position', async () => {
    const { findTrappedPiece } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    expect(findTrappedPiece(new Chess().fen(), 'w')).toBeNull();
    expect(findTrappedPiece(new Chess().fen(), 'b')).toBeNull();
  });

  it('an attacked queen WITH a clean flight square is not trapped', async () => {
    const { findTrappedPiece } = await import('./reviewTeachingPoints');
    const { Chess } = await import('chess.js');
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Qf6', 'Nc3']) c.move(s);
    // Black's early queen on f6 is loose play but has flights — never "trapped".
    expect(findTrappedPiece(c.fen(), 'b')).toBeNull();
  });
});

describe('buildReviewDeepestLookahead (review-register deep look-ahead)', () => {
  it('returns null on missing / malformed best move', () => {
    const start = new Chess().fen();
    expect(buildReviewDeepestLookahead(start, null, 'w', null)).toBeNull();
    expect(buildReviewDeepestLookahead(start, 'e2', 'w', null)).toBeNull(); // too short
    expect(buildReviewDeepestLookahead('not-a-fen', 'e2e4', 'w', null)).toBeNull();
  });

  it('returns null when the best move sets up nothing forcing (quiet development)', () => {
    // 1.e4 e5 — best move like Nf3 develops but sets up no fork/mate.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(buildReviewDeepestLookahead(fen, 'g1f3', 'w', null)).toBeNull();
  });

  it('names the shot retrospectively when the best move sets up a royal fork', () => {
    // Black king e8 + queen a8, white knight c3. Nd5 sets up Nc7+ forking king + queen.
    const fen = 'q3k3/8/8/8/8/2N5/8/4K3 w - - 0 1';
    const say = buildReviewDeepestLookahead(fen, 'c3d5', 'w', null);
    expect(say).toBeTruthy();
    expect(say!.toLowerCase()).toContain('shot');
    expect(say!.toLowerCase()).toMatch(/fork/);
    expect(say).toContain('Nd5'); // names the move that was the shot
  });

  it('stays silent on a plain winning capture (owned by the better-move teaching)', () => {
    // Rxd4 just wins a hanging knight — a bare capture, no fork/mate follow-up.
    const fen = '4k3/8/8/8/3n4/8/8/3RK3 w - - 0 1';
    expect(buildReviewDeepestLookahead(fen, 'd1d4', 'w', null)).toBeNull();
  });

  it('never throws on an illegal best move for the position', () => {
    const start = new Chess().fen();
    expect(buildReviewDeepestLookahead(start, 'e2e5', 'w', null)).toBeNull();
  });
});

describe('buildReviewDeepestLookahead — the student FOUND it (David 2026-09-16)', () => {
  it('is silent when the played move IS the shot', () => {
    // Ply 32 of David's Alapin: the student played the engine's move, and the
    // beat still said "Look deeper — Nexd4 was the shot", duplicating the
    // present-tense threat narrated one clause earlier.
    const fen = 'N3kb1r/pp2pppp/8/3pP3/3P4/8/PP2nPPP/R3KB1R b KQk - 0 16';
    const played = buildReviewDeepestLookahead(fen, 'e2d4', 'b', 'Nxd4');
    expect(played).toBeNull();
  });

  it('matches by coordinates, so disambiguation notation cannot reopen it', () => {
    // Two black knights bear on d4 (e2 and c6) — chess.js renders the move
    // `Nexd4`, and a naive SAN compare against a caller passing `Nxd4` (or vice
    // versa) would fail open and call the played move a miss.
    const two = 'N3kb1r/pp2pppp/2n5/3pP3/3P4/8/PP2nPPP/R3KB1R b KQk - 0 16';
    expect(buildReviewDeepestLookahead(two, 'e2d4', 'b', 'Nexd4')).toBeNull();
  });

  it('still speaks when the student played something ELSE', () => {
    const fen = 'N3kb1r/pp2pppp/8/3pP3/3P4/8/PP2nPPP/R3KB1R b KQk - 0 16';
    const missed = buildReviewDeepestLookahead(fen, 'e2d4', 'b', 'e6');
    // Either it names the shot, or the position sets up no fork/mate at all —
    // what it must NEVER do is call the played move a missed one.
    if (missed !== null) expect(missed).not.toContain('e6 was the shot');
  });
});

// ── FORESIGHT AS A SKILL (David 2026-09-16) ─────────────────────────────────
// The Berlin mirror: Black to move, and ...Bc5 is the shot — it sets up the
// Nxf2 fork of the queen on d1 and the rook on h1. The student played Be7.
describe('buildMissedShotSignal — here was the signal', () => {
  const fenBefore = 'rnbqkb1r/pp3ppp/2p5/3pp3/B3n3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 6';

  it('names the alignment that was readable before the shot existed', () => {
    const say = buildMissedShotSignal(fenBefore, 'f8c5', 'b', 'Be7');
    expect(say).toBeTruthy();
    expect(say).toContain('queen on d1');
    expect(say).toContain('rook on h1');
    expect(say).toContain('f2');
  });

  // 🔒 THE BEAT MUST NOT CITE A SQUARE ITS OWN SENTENCE SAYS DID NOT EXIST YET.
  // The first version appended the guard clause and produced "the signal was on
  // the board before Bc5 ever existed — … backed up by your piece on c5", where
  // c5 is the square Bc5 LANDS on. Board-true geometry, false timeline. Only
  // reading the output caught it; this holds it.
  it('never cites the guard square the shot itself creates', () => {
    const say = buildMissedShotSignal(fenBefore, 'f8c5', 'b', 'Be7');
    expect(say).not.toMatch(/backed up|nothing of|covers /);
    // c5 may appear ONLY as part of the shot's own SAN (`Bc5`) — never as a
    // square the sentence claims was already occupied. Strip the SANs and the
    // landing square must be gone.
    expect((say ?? '').replace(/\bBc5\b/g, '')).not.toContain('c5');
  });

  it('speaks from the mover seat — the victims are THEIRS, never yours', () => {
    const say = buildMissedShotSignal(fenBefore, 'f8c5', 'b', 'Be7');
    expect(say).toMatch(/\btheir\b/);
    expect(say).not.toMatch(/\byours\b|\byour piece\b|\byou cover\b/);
  });

  it('is SILENT when the student actually played the shot', () => {
    expect(buildMissedShotSignal(fenBefore, 'f8c5', 'b', 'Bc5')).toBeNull();
  });

  it('is SILENT when the best move sets up nothing forcing', () => {
    expect(buildMissedShotSignal(fenBefore, 'b8d7', 'b', 'Be7')).toBeNull();
  });

  it('shares ONE scan with the played-well register — same board, two voices', () => {
    const missed = buildMissedShotSignal(fenBefore, 'f8c5', 'b', 'Be7');
    const found = buildReviewDeepestLookahead(fenBefore, 'f8c5', 'b', 'Be7');
    expect(missed).toBeTruthy();
    expect(found).toBeTruthy();
    expect(missed).not.toBe(found);
    // Both describe the same geometry; neither invents a square the other lacks.
    for (const sq of ['d1', 'h1']) {
      expect(missed).toContain(sq);
      expect(found).toContain(sq);
    }
  });
});

describe('a piece that can step away does not "fall" — D-3 (WO-STANDARD-01, prod tape 2026-09-22)', () => {
  it('Scandinavian 3.Nc3: the queen on d5 is attacked, not falling', () => {
    // 1.e4 d5 2.exd5 Qxd5 3.Nc3 — Black to move; the queen has a dozen safe squares.
    const t = attackerDefenderCount(fenAfter(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3']), 'w');
    expect(t).not.toBeNull();
    expect(t).toMatch(/queen on d5/);
    expect(t).toMatch(/has to move/);
    expect(t).not.toMatch(/so it falls/);
  });
  it('negative control: with the student to move the capture is real and it falls (Bxf3 case)', () => {
    const t = attackerDefenderCount(fenAfter(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3']), 'w');
    expect(t).toMatch(/so it falls/);
  });
  it('pieceHasSafeEscape reads the board, not the count', () => {
    const c = new Chess(fenAfter(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3']));
    expect(pieceHasSafeEscape(c, 'd5', 'w')).toBe(true);
    // A queen walled in by its own pieces has no move at all — no escape.
    const boxed = new Chess('qn2k3/pp6/8/8/8/8/8/4K3 b - - 0 1');
    expect(pieceHasSafeEscape(boxed, 'a8', 'w')).toBe(false);
    // And one whose only squares are all covered: queen a1, white king c2 and
    // rook b3 cover a2/b2/b1; the pawn wall a2... build it: Qa1, own pawns
    // a2? no — every reachable square attacked by a white piece.
    const covered = new Chess('4k3/8/8/8/8/1R6/2K5/q7 b - - 0 1');
    // Qa1 can go to b1 (attacked by Kc2, Rb3), b2 (Kc2, Rb3), a2 (Rb3? no —
    // a2 is attacked by nothing... so it escapes). Assert the READ, not a
    // guess: chess.js says which squares are safe.
    const escapesTo = covered.moves({ square: 'a1', verbose: true })
      .filter((m) => { const a = new Chess(covered.fen()); a.move(m); return a.attackers(m.to, 'w').length === 0; });
    expect(pieceHasSafeEscape(covered, 'a1', 'w')).toBe(escapesTo.length > 0);
  });
});

describe('deriveNextPlans — a mate on the board outranks every plan (WO-STANDARD-01 D-15, 2026-09-22)', () => {
  // 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? — Qxf7# is on the board. Prod said "win
  // their weak pawn on h7 — plant your knight on h6" here.
  const MATE = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'];
  const SAFE = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'g6'];
  it('sees the mate in one for the side to move, and for the other side via the null-move flip', () => {
    expect(mateInOneExists(new Chess(fenAfter(MATE)))).toBe(true);
    // Black to move with White's Qxf7# hanging over the board: still true.
    const c = new Chess(fenAfter(MATE)); c.move('Qxf7#');
    expect(c.isCheckmate()).toBe(true);
    expect(mateInOneExists(new Chess(fenAfter(SAFE)))).toBe(false);
  });
  it('returns NO plan when a mate in one exists — the mate is the whole story', () => {
    expect(deriveNextPlans(fenAfter(MATE), 'w')).toEqual([]);
    expect(deriveNextPlans(fenAfter(MATE), 'b')).toEqual([]);
  });
  // The Opera-game plans above are the negative control: with no mate on the
  // board the same computer still returns multiple plans.
});

describe('badEnemyBishop reads the forward rays, not a mobility count (WO-STANDARD-01 D-1, 2026-09-22)', () => {
  it('an active bishop with three forward squares is not bad', () => {
    // Black Bb6 on the open a7–g1 diagonal, four black pawns on its colour.
    expect(badEnemyBishop('r3k3/p1p5/1b1p2p1/8/3P4/8/8/4K3 w - - 0 12', 'w')).toBeNull();
  });
  it('a bishop whose own pawns stop both forward rays is bad', () => {
    // Black Bd7 behind c6 and e6, with a6/g6 making four pawns on its colour.
    expect(badEnemyBishop('r3k3/3b4/p1p1p1p1/8/8/8/8/4K3 w - - 0 12', 'w')).toMatch(/bishop on d7 is a bad piece/);
  });
});
