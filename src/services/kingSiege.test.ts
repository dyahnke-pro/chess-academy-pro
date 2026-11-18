// kingSiege — the king attack and threats to your own king (WO-DANYA-READS-01
// group 1), on Danya's own article boards (Chess.com instructional articles,
// the positions only) and Lichess puzzles (CC0). Every claim is checked on
// the board; each read has a board where it must stay silent.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  kingSiege, siegeSpeaks, siegeLine, farFromHome,
  backRankWeakness, backRankLine,
  loadedDiscovery, discoverySpeaks, discoveryLine,
  kingSacrifice, kingSacrificeLine, kingReadsOn,
} from './kingSiege';
import { readBoardUrgency, urgencyLead } from './boardUrgency';
import { assemblePositionAssessment } from './groundedAnswer';
import { readBoardAll } from './boardComputers';

// "the knockout blow" #1 — White to move, four pieces on Black's king.
const KNOCKOUT = '1b3rk1/2r2qpp/p7/1p3B2/1P5P/P1Q1Pb2/1B3P2/3RK1R1 w - - 0 24';
// "positional combinations" #1 — White's king on h1 with no luft.
const NO_LUFT = 'r3r1k1/1pq2ppp/pnp2n2/5P2/5b2/1BN4P/PPQ2PP1/R1BR3K w - - 0 18';
// "rooks on the seventh revisited" #4 — Black's back rank, the a8 rook alone.
const SEVENTH = 'r6k/1R3R1p/r2p4/2pP4/3bN1P1/8/P6P/5K2 w - - 0 38';
// "how to play a brilliancy" #3 — the queen already by the king: no back rank.
const QUEEN_BY_KING = '4r1k1/1p4p1/pPp2r1p/P1Pp1p2/3P1Pn1/2NR1P2/3Q2Bq/R4K2 b - - 0 31';
// "the greek gift sacrifice lives on" #0 — Bxh7+ and the engine's line.
const GREEK = 'r1bq1rk1/pp1n1ppp/2n1p3/3pP3/3P4/P1PB1N2/5PPP/R1BQ1RK1 w - - 0 1';
const GREEK_LINE = ['g8h7', 'f3g5', 'h7g6', 'f1e1', 'f7f5', 'g5e6', 'd8h4'];
// "miracle on the chess board" #3 — White to move, …Qxd1 mate on the board.
const MIRACLE = '5Q2/5p1p/1pPr2p1/6k1/8/3pP2P/2q2PP1/3R1K2 w - - 0 44';
// Lichess puzzle 062Zq after 1…Rxf7?: the rook on f7 blocks the c4 bishop.
const DISCOVERY = 'r4rk1/ppp2Rpp/8/4n3/2B5/2P2R1P/P1P3P1/6K1 w - - 0 19';

describe('kingSiege — attackers against defenders', () => {
  it('counts the four pieces on their king and the bishop too far to help', () => {
    const s = kingSiege(KNOCKOUT, 'b');
    expect(s).not.toBeNull();
    expect(s!.attackers.map((p) => p.square).sort()).toEqual(['b2', 'c3', 'f5', 'g1']);
    expect(s!.defenders.map((p) => p.square).sort()).toEqual(['c7', 'f7', 'f8']);
    expect(farFromHome(s!).map((p) => p.square)).toEqual(['b8']);
    expect(siegeSpeaks(KNOCKOUT, s!, 300)).toBe(true);
    const line = siegeLine(s!, 'w', KNOCKOUT);
    expect(line).toMatch(/[Ff]our of your pieces|faces four of your pieces/);
    expect(line).toContain('bishop on b8 is two moves or more from helping');
  });

  it('the battery behind the queen bears through it (the b2 bishop, c3 queen)', () => {
    // Board truth: c3-d4-e5-f6-g7 is open and b2 stands behind c3.
    const c = new Chess(KNOCKOUT);
    for (const s of ['d4', 'e5', 'f6']) expect(c.get(s as never)).toBeFalsy();
    expect(c.get('b2')?.type).toBe('b');
  });

  it('stays silent when the defenders hold (the start of the game) and for a losing attacker', () => {
    const start = new Chess().fen();
    const s = kingSiege(start, 'b');
    expect(siegeSpeaks(start, s!, 0)).toBe(false);
    const k = kingSiege(KNOCKOUT, 'b');
    expect(siegeSpeaks(KNOCKOUT, k!, -300)).toBe(false);
  });
});

describe('backRankWeakness — no luft, one guard, mate without it', () => {
  it('reads the student\'s own back rank held by the d1 rook (Re1 mate)', () => {
    const b = backRankWeakness(NO_LUFT, 'w');
    expect(b).not.toBeNull();
    expect(b!.guard).toEqual({ square: 'd1', piece: 'r' });
    expect(b!.check.to).toBe('e1');
    // Proof on the board: the d1 rook off, Black to move, Re1 is mate.
    const c = new Chess(NO_LUFT);
    c.remove('d1');
    const probe = new Chess(c.fen().replace(' w ', ' b '));
    probe.move({ from: 'e8', to: 'e1' });
    expect(probe.isCheckmate()).toBe(true);
    expect(backRankLine(b!, 'w', NO_LUFT)).toMatch(/your rook on d1/);
  });

  it('reads their back rank (the a8 rook alone against Rb8)', () => {
    const b = backRankWeakness(SEVENTH, 'b');
    expect(b?.guard.square).toBe('a8');
    expect(b?.check.san).toMatch(/^Rb8/);
    expect(backRankLine(b!, 'w', SEVENTH)).toMatch(/[Tt]heir/);
  });

  it('is silent for a queen already by the king and for a king with luft', () => {
    expect(backRankWeakness(QUEEN_BY_KING, 'w')).toBeNull();
    expect(backRankWeakness(new Chess().fen(), 'w')).toBeNull();
    expect(backRankWeakness(NO_LUFT, 'b')).toBeNull(); // h7 is free for Black's king
  });
});

describe('loadedDiscovery — the piece that moves with check', () => {
  it('the f7 rook blocks the c4 bishop: every rook move is check, and it takes on f8', () => {
    const d = loadedDiscovery(DISCOVERY, 'w');
    expect(d).not.toBeNull();
    expect(d!.blocker.square).toBe('f7');
    expect(d!.slider.square).toBe('c4');
    expect(d!.takes[0].target.square).toBe('f8');
    expect(discoverySpeaks(d!)).toBe(true);
    const c = new Chess(DISCOVERY);
    expect(c.move('Rxf8').san).toBe('Rxf8#');
    expect(discoveryLine(d!, 'w', DISCOVERY)).toMatch(/every rook move is check/i);
  });

  it('is silent with nothing in the way of the line', () => {
    expect(loadedDiscovery(new Chess().fen(), 'w')).toBeNull();
    expect(loadedDiscovery(KNOCKOUT, 'w')).toBeNull();
  });
});

describe('kingSacrifice — what it opens and the line that proves it', () => {
  it('Bxh7+ drags their king out; Ng5+ follows; the attack is scored', () => {
    const k = kingSacrifice(GREEK, 'Bxh7+', GREEK_LINE, 319, null);
    expect(k).not.toBeNull();
    expect(k!.opens).toEqual({ kind: 'king-out', square: 'h7' });
    expect(k!.follow).toEqual(['Ng5+']);
    expect(k!.outcome).toBe('attack');
    expect(kingSacrificeLine(k!, 'w')).toBe('Bxh7+ gives up your bishop to drag their king out to h7. After …Kxh7, Ng5+ follows, and the attack is worth more than the piece.');
  });

  it('is silent when the engine does not score it, and for a quiet developing move', () => {
    expect(kingSacrifice(GREEK, 'Bxh7+', GREEK_LINE, 40, null)).toBeNull();
    expect(kingSacrifice(GREEK, 'Re1', ['f7f6'], 300, null)).toBeNull();
  });
});

describe('the reads reach the coach', () => {
  it('their mate threat leads the read before the hanging rook', () => {
    const u = readBoardUrgency(MIRACLE, 'white', 'f8d6');
    expect(u?.mate).toEqual(['Qxd1#']);
    expect(urgencyLead(u)).toMatch(/^They threaten mate: Qxd1 is mate/);
    const read = assemblePositionAssessment({ line: null, tempting: null, evalCp: 150, mateIn: null, studentColor: 'white', fen: MIRACLE, bestUci: 'f8d6' });
    expect(read?.facts).toContain('They threaten mate: Qxd1');
  });

  it('the position read says the back rank and the siege', () => {
    expect(kingReadsOn(NO_LUFT, 'w', 0).map((r) => r.text).join(' ')).toMatch(/no luft|back rank is thin/);
    const read = assemblePositionAssessment({ line: null, tempting: null, evalCp: 300, mateIn: null, studentColor: 'white', fen: KNOCKOUT, bestUci: null });
    expect(read?.facts).toMatch(/four of your pieces/i);
    expect(read?.keySquares).toContain('b8');
  });

  it('the registry speaks the sacrifice for the move, with its line', () => {
    const facts = readBoardAll('kingSacrifice', { fenBefore: GREEK, san: 'Bxh7+', student: 'w', replies: [{ cp: 319, mate: null, moves: GREEK_LINE }], seconds: [GREEK_LINE] });
    expect(facts).toHaveLength(1);
    expect(facts[0].text).toContain('drag their king out to h7');
    expect(facts[0].kind).toBe('sac-why');
  });

  it('the registry speaks the discovery the move loads, and not one already loaded', () => {
    // Bd3-c4 puts the bishop behind the f7 rook (the 062Zq board, Black to move).
    const before = 'r4rk1/ppp2Rpp/8/4n3/8/2PB1R1P/P1P3P1/6K1 w - - 0 19';
    const facts = readBoardAll('loadedDiscovery', { fenBefore: before, san: 'Bc4', student: 'w' });
    expect(facts.map((f) => f.text).join(' ')).toMatch(/Your rook on f7 is all that stands between your bishop on c4 and their king/);
    expect(facts[0].seat).toBe('student');
    // Lichess 062Zq itself: 1…Nxe5 walks past a discovery already loaded.
    expect(readBoardAll('loadedDiscovery', { fenBefore: 'r4rk1/ppp2Rpp/2n5/4P3/2B5/2P2R1P/P1P3P1/6K1 b - - 0 18', san: 'Nxe5', student: 'b' })).toHaveLength(0);
  });
});
