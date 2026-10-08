import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  mateOrMaterial, stopsCastling, ownCastlingBlocked, lureKing, probingCheck, breakChooser,
  sacrificeTarget, sacrificeConditions, kingSquareByChecks, ownPieceShelter, kingDiagonalWalk,
  stormRace, kingAttackReads, kingReadsForBestLine,
} from './kingAttackReads';
import { detectPlanRace, planRaceClause, planRaceProof } from './planRace';
import { depthClauses } from './thinkAloud';
import { positionPosed } from './moveInsight';

const line = (moves: string[], mate: number | null = null, evaluation = 0) => ({ moves, evaluation, mate });
/** Every proof line must replay on the board it starts from. */
function replays(fen: string, sans: readonly string[]): boolean {
  try { const c = new Chess(fen); for (const s of sans) c.move(s); return true; } catch { return false; }
}

describe('mateOrMaterial — mate beats material, and the honest converse', () => {
  // Back rank: Re8 mates; their rook on d4 hangs to the knight.
  const BACK_RANK = '6k1/5ppp/8/8/3r4/5N2/5PPP/4R1K1 w - - 0 30';
  it('leaves the hanging rook when a mate is on the board', () => {
    const r = mateOrMaterial(BACK_RANK, 'w', [line(['e1e8'], 1)]);
    expect(r?.id).toBe('mate-over-material');
    expect(r?.text).toMatch(/their rook on d4/);
    expect(r?.text).toMatch(/mate beats any material/);
    expect(r?.proof.exact).toBe(true);
    expect(r?.stakes?.points).toBe(100);
    expect(replays(BACK_RANK, r?.lines?.[0].sans ?? [])).toBe(true);
  });
  it('is silent when the best line does not mate', () => {
    expect(mateOrMaterial(BACK_RANK, 'w', [line(['f3d4'], null, 500)])).toBeNull();
  });
  it('says the division of labour when two pieces share the mate', () => {
    // Rook to h7 cuts the seventh, the other rook mates on a8.
    const LADDER = '3k4/8/8/8/8/8/R7/6KR w - - 0 1';
    const r = mateOrMaterial(LADDER, 'w', [line(['h1h7', 'd8e8', 'a2a8'], 2)]);
    expect(r?.id).toBe('mate-division');
    expect(r?.text).toMatch(/your rook goes to h7 and your other rook to a8 — mate/i);
  });
  // Queen takes the rook with check, no mate in any line, the king under fire.
  const NO_MATE = 'r5k1/5pp1/7p/8/2B5/8/5PPP/Q5K1 w - - 0 30';
  it('says "no mate here: take the rook with check" only when no line mates', () => {
    const r = mateOrMaterial(NO_MATE, 'w', [line(['a1a8', 'g8h7'], null, 600), line(['c4f7', 'g8f7'], null, 0)]);
    expect(r?.id).toBe('material-not-mate');
    expect(r?.text).toMatch(/No mate here|no mate|no mate in it/i);
    expect(r?.text).toMatch(/rook with check/);
  });
  it('stays silent on the converse when another line mates', () => {
    expect(mateOrMaterial(NO_MATE, 'w', [line(['a1a8', 'g8h7'], null, 600), line(['a1a8'], 3)])).toBeNull();
  });
});

describe('castling geometry and the lure', () => {
  it('Bxb4 sees f8, so they cannot castle short', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/4p3/1b6/8/PPPBPPPP/RN1QKBNR w KQkq - 0 4';
    const r = stopsCastling(fen, 'w', 'Bxb4');
    expect(r?.id).toBe('stops-castling');
    expect(r?.text).toMatch(/sees f8, so they can't castle short/);
    expect(r?.proof.squares).toEqual(['b4', 'f8']);
  });
  it('is silent when they have already lost the right', () => {
    const fen = 'rnbq1k1r/pppp1ppp/5n2/4p3/1b6/8/PPPBPPPP/RN1QKBNR w KQ - 0 4';
    expect(stopsCastling(fen, 'w', 'Bxb4')).toBeNull();
  });
  it('names your own castling blocked by their bishop', () => {
    const fen = 'rnbqk1nr/pppp1ppp/8/4p3/2b1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    const r = ownCastlingBlocked(fen, 'w');
    expect(r?.text).toMatch(/can't castle short/);
    expect(r?.text).toMatch(/bishop on c4 sees f1/);
  });
  it('the lure: the knight steps off and your bishop aims at h7', () => {
    const fen = 'rnbqk2r/ppppbppp/5n2/4p3/4N3/3B4/PPPP1PPP/R1BQK1NR w KQkq - 0 5';
    const r = lureKing(fen, 'w', 'Ng5');
    expect(r?.id).toBe('lure-king');
    expect(r?.text).toMatch(/bishop on d3 toward h7/);
  });
  it('no lure once their king has castled', () => {
    const fen = 'rnbq1rk1/ppppbppp/5n2/4p3/4N3/3B4/PPPP1PPP/R1BQK1NR w KQ - 0 5';
    expect(lureKing(fen, 'w', 'Ng5')).toBeNull();
  });
});

describe('the probing check', () => {
  const fen = '4k3/8/8/8/8/8/8/3QK3 w - - 0 40';
  it('check first when the king must choose', () => {
    const r = probingCheck(fen, 'w', [line(['d1a4', 'e8f7'], null, 900)]);
    expect(r?.id).toBe('probing-check');
    expect(r?.text).toMatch(/See where it goes/);
    expect(r?.proof.squares?.length).toBeGreaterThan(2);
  });
  it('silent when the line is a mate (that is the mate read)', () => {
    expect(probingCheck(fen, 'w', [line(['d1a4', 'e8f7'], 5)])).toBeNull();
  });
});

describe('the break chooser', () => {
  it('a flank build-up is met in the centre', () => {
    const fen = 'rnbqkbnr/pppp1p2/8/4p1pp/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 4';
    const r = breakChooser(fen, 'w', 'dxe5');
    expect(r?.id).toBe('centre-strike');
    expect(r?.text).toMatch(/kingside — the answer to a flank attack is a strike in the centre/);
  });
  it('a locked centre sends the play to the wing', () => {
    const fen = 'rnbqkbnr/pp3ppp/4p3/2ppP3/3P1P2/8/PPP3PP/RNBQKBNR w KQkq - 0 5';
    const r = breakChooser(fen, 'w', 'f5');
    expect(r?.id).toBe('wing-lever');
  });
  it('silent on a quiet developing move', () => {
    const fen = 'rnbqkbnr/pppp1p2/8/4p1pp/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 4';
    expect(breakChooser(fen, 'w', 'Nf3')).toBeNull();
  });
});

describe('the king and its squares', () => {
  it('king to a2, not where the queen checks', () => {
    const fen = '7k/8/8/8/8/8/1PP4q/1K6 w - - 0 40';
    const r = kingSquareByChecks(fen, 'w', 'Ka2');
    expect(r?.id).toBe('king-square-checks');
    expect(r?.text).toMatch(/^King to a2, not (a1|c1)/);
    expect(replays(fen, r?.lines?.[0].sans ?? [])).toBe(true);
  });
  it('silent when the best king square is the one with the most checks', () => {
    expect(kingSquareByChecks('7k/8/8/8/8/8/1PP4q/1K6 w - - 0 40', 'w', 'Kc1')).toBeNull();
  });
  it('their king sheltering behind your own bishop', () => {
    const r = ownPieceShelter('5k2/5B2/8/8/8/8/6PP/5RK1 w - - 0 30', 'w');
    expect(r?.text).toMatch(/hiding behind your own bishop on f7 — it's on your rook's f-file/);
  });
  it('silent when the blocker is a pawn', () => {
    expect(ownPieceShelter('5k2/5P2/8/8/8/8/6PP/5RK1 w - - 0 30', 'w')).toBeNull();
  });
  it('the diagonal walk heads for both pawns at once', () => {
    const r = kingDiagonalWalk('8/8/8/5P2/1p6/8/4K3/7k w - - 0 50', 'w', 'Kd3');
    expect(r?.id).toBe('king-diagonal-walk');
    expect(r?.text).toMatch(/their pawn on b4 and toward yours on f5/);
    expect(r?.proof.exact).toBe(true);
  });
  it('silent when a straight step does just as well', () => {
    expect(kingDiagonalWalk('8/8/8/4P3/2p5/8/4K3/7k w - - 0 50', 'w', 'Kd3')).toBeNull();
  });
});

describe('sacrifices', () => {
  it('the bishop sacrifice on h2 falls short with no knight to follow', () => {
    const fen = 'r2qk2r/ppp2ppp/3b4/8/8/5N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
    const r = sacrificeConditions(fen, 'w', 'O-O');
    expect(r?.id).toBe('sacrifice-conditions');
    expect(r?.text).toMatch(/no knight of theirs can reach g4/);
    expect(r?.proof.exact).toBe(true);
  });
  it('falls short when their queen cannot reach the h-file', () => {
    const fen = 'r2qk2r/ppp1pppp/3b1n2/8/8/5N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
    const r = sacrificeConditions(fen, 'w', 'O-O');
    expect(r?.text).toMatch(/queen can't reach the h-file/);
  });
  it('silent when the sacrifice has everything it needs', () => {
    const fen = 'r2qk2r/ppp2ppp/3b1n2/8/8/5N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
    expect(sacrificeConditions(fen, 'w', 'O-O')).toBeNull();
  });
  it('h6: three of your pieces against one pawn, and no plain capture wins', () => {
    const fen = '5rk1/5pp1/7p/8/6N1/8/PPP1Q3/2B1K2R w K - 0 20';
    const r = sacrificeTarget(fen, 'w');
    expect(r?.id).toBe('sacrifice-target');
    expect(r?.text).toMatch(/converge on h6 — three of them against one of theirs/);
    expect(r?.proof.squares).toContain('h6');
  });
  it('a standing target needs more attackers than defenders and no plain win', () => {
    // f7 is attacked by the queen, the bishop and the knight, held by the king alone,
    // but taking it with check is not a plain gain — a target, not a hanging pawn.
    const quiet = '6k1/8/8/8/8/8/8/6K1 w - - 0 1';
    expect(sacrificeTarget(quiet, 'w')).toBeNull();
  });
});

describe('the attack race across wings (planRace)', () => {
  const STORM = 'r4rk1/1pp2ppp/8/p5P1/8/8/PPP2P1P/2KR3R w - - 0 15';
  it('races two storms on opposite wings in pushes to contact', () => {
    const race = detectPlanRace(STORM, 'w');
    expect(race?.kind).toBe('storm-race');
    if (race?.kind !== 'storm-race') return;
    expect(race.yourPushes).toBe(1);
    expect(race.theirPushes).toBe(2);
    expect(race.youFirst).toBe(true);
    expect(planRaceClause(STORM, 'w', 'live')).toMatch(/their queenside play is too slow — keep pushing on the kingside/);
    expect(planRaceProof(STORM, 'w')?.exact).toBe(true);
    expect(stormRace(STORM, 'w')?.text).not.toMatch(/\d+ push/);
  });
  it('is silent when both kings sit on the same wing', () => {
    const same = 'r4rk1/1pp2ppp/8/p5P1/8/8/PPP2P1P/R4RK1 w - - 0 15';
    expect(stormRace(same, 'w')).toBeNull();
  });
});

describe('wired both ways', () => {
  it('TEACH: the one producer hands a king-read with its proof to the door', () => {
    const fen = '6k1/5ppp/8/8/3r4/5N2/5PPP/4R1K1 w - - 0 30';
    const out = depthClauses({ fen, history: [], topLines: [line(['e1e8'], 1)], studentColor: 'w', nameMove: true });
    const k = out.find((d) => d.kind === 'king-read');
    expect(k?.text).toMatch(/mate beats any material/);
    expect(k?.proof && 'kind' in k.proof).toBe(true);
  });
  it('TEACH, move held back: the idea speaks and the proof waits', () => {
    const fen = '6k1/5ppp/8/8/3r4/5N2/5PPP/4R1K1 w - - 0 30';
    const out = depthClauses({ fen, history: [], topLines: [line(['e1e8'], 1)], studentColor: 'w', nameMove: false });
    const k = out.find((d) => d.kind === 'king-read');
    expect(k?.text).toMatch(/look for it before you take/);
    expect(k?.proof).toEqual({ none: 'withheld' });
  });
  it('DIAGNOSE: the board posing mate-over-material records missed-tactic', () => {
    const fen = '6k1/5ppp/8/8/3r4/5N2/5PPP/4R1K1 w - - 0 30';
    expect(positionPosed(fen, { bestSan: 'Re8#' }).map((p) => p.tag)).toContain('missed-tactic');
  });
  it('review reads only what one line can prove', () => {
    const NO_MATE = 'r5k1/5pp1/7p/8/2B5/8/5PPP/Q5K1 w - - 0 30';
    expect(kingReadsForBestLine(NO_MATE, 'w', ['a1a8', 'g8h7']).some((r) => r.id === 'material-not-mate')).toBe(false);
  });
  it('the producer is quiet on the starting position', () => {
    expect(kingAttackReads({ fen: new Chess().fen(), me: 'w', lines: [line(['e2e4'], null, 30)] })).toEqual([]);
  });
});
