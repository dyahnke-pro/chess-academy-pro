import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { chancesAt, decidingBlunder, judgeChance, lineSans, solvePlies, leftLoose, legalCounts, type FocusMove, type ReadLine } from './focusChances';
import { clueLine, creditLine } from './focusLines';
import type { MotifLevel } from '../../data/tacticMotifs';

/** A student whose Beginner motifs are the only ones open (WO-MOTIFS-01). */
const BEGINNER: ReadonlySet<MotifLevel> = new Set<MotifLevel>(['beginner']);

// Every chance on a REAL board, each beside a FAIL TWIN — a board that looks
// like the pattern with one condition missing and must NOT pose it
// (docs/CAMPAIGN.md §3's card ship rule, applied to the focus checks).

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const keys = (fen: string, lines: ReadLine[] | null = null): string[] => {
  const student = fen.split(' ')[1] === 'w' ? 'w' : 'b';
  return chancesAt({ fen, prevFen: null, student, lines }, BEGINNER).map((c) => c.key);
};
const move = (fen: string, san: string, lines: ReadLine[] | null = null, cpLoss: number | null = null): FocusMove => ({
  fenBefore: fen, san, fenAfter: play(fen, san), student: fen.split(' ')[1] === 'w' ? 'w' : 'b', cpLoss, lines,
});

/** A knight on e5 with nothing guarding it; d4 takes it. */
const LOOSE_KNIGHT = '4k3/8/8/4n3/3P4/8/8/3QK3 w - - 0 1';
/** Twin: the knight is guarded by f6 and only the queen attacks it. */
const GUARDED_KNIGHT = '4k3/8/5p2/4n3/8/8/4Q3/4K3 w - - 0 1';
/** Your knight on e4 attacked by the d5 pawn. */
const KNIGHT_HIT = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1';
/** Twin: the rook on e8 attacks it, f3 guards it — the rook will not take. */
const KNIGHT_GUARDED = '4r1k1/8/8/8/4N3/5P2/8/4K3 w - - 0 1';
/** The queen guards d4 from d1; the black queen on d8 hits it. */
const QUEEN_GUARDS = '3qk3/8/8/8/3N4/8/8/3QK3 w - - 0 1';
/** Nc7+ forks the king and the queen. */
const FORK_SHOT = 'q3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
const FORK_LINES: ReadLine[] = [
  { moves: ['d5c7', 'e8d7', 'c7a8', 'd7c6'], evaluation: 900, mate: null },
  { moves: ['e1d2', 'a8a2'], evaluation: -800, mate: null },
];
/** The Fried Liver: 6.Nxf7 forks the queen and the rook — Black to answer. */
const FRIED = after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7']);
/** Scholar's mate threat: Qxf7# is threatened — Black to answer. */
const SCHOLAR = after(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4']);
/** Mate in one on f7. */
const SCHOLAR_MATE = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4';

/** The 2026-10-21 audit game, 26…Rf5: the knight on f4 is hit by the d5
 *  knight and the f5 rook; the e3 bishop "defends" it but is pinned to the
 *  king on e2 by the e8 rook. */
const PINNED_DEFENDER = '2k1r1n1/1p6/2p2b2/1p1n1r2/3P1N2/2P1B3/PP2KPNP/R6R w - - 11 27';
/** The same game, 36…Rgxh4: the rook on h1 is hit by the h4 rook; Rxh4 trades it. */
const ROOK_TRADE = '2kb3r/1p4R1/5n2/1p1p4/3P3r/P1P1B3/1P3P2/4NK1R w - - 2 37';

describe('a recapture is the trade finishing, never a piece to take (hand walk 2026-10-23)', () => {
  // The walked game: 4.d4 Nxc3 — their knight took yours; 5.bxc3 takes back.
  const PREV = after(['e4', 'c6', 'Nc3', 'Nf6', 'e5', 'Nd5']);
  const NOW = after(['e4', 'c6', 'Nc3', 'Nf6', 'e5', 'Nd5', 'd4', 'Nxc3']);
  it('their knight that just took a knight is not posed as loose', () => {
    expect(chancesAt({ fen: NOW, prevFen: PREV, student: 'w', lines: null }, BEGINNER).map((c) => c.key)).not.toContain('take:c3');
  });
  it('twin: a knight that took only a pawn and hangs is still free to take', () => {
    // …Nxe4?? into the d3 pawn: the knight took a pawn, d3 wins a knight for it.
    const prev = '4k3/8/5n2/8/4P3/3P4/8/4K3 w - - 0 1';
    const now = '4k3/8/8/8/4n3/3P4/8/3K4 w - - 0 2';
    expect(chancesAt({ fen: now, prevFen: prev, student: 'w', lines: null }, BEGINNER).map((c) => c.key)).toContain('take:e4');
  });
});

describe('the shot clue is true of a quiet shot (hand walk 2026-10-23)', () => {
  // 13.Nd5 uncovers the d2 bishop on the h6 queen and threatens Nc7+: a
  // threat, not a check or a capture.
  const FEN = after(['e4', 'c6', 'Nc3', 'Nf6', 'e5', 'Nd5', 'd4', 'Nxc3', 'bxc3', 'e6', 'Nf3', 'Qa5', 'Bd3', 'd6', 'Bd2', 'dxe5',
    'Nxe5', 'Nd7', 'Nc4', 'Qd5', 'Ne3', 'Qg5', 'a4', 'Qh6']);
  const LINES: ReadLine[] = [
    { moves: ['e3d5', 'h6h4', 'd5c7', 'e8d8', 'c7a8', 'f8d6'], evaluation: 600, mate: null },
    { moves: ['d1f3', 'd7f6'], evaluation: 80, mate: null },
  ];
  it('every rotation of the clue names threats, never "a check or a capture" alone', () => {
    const shot = chancesAt({ fen: FEN, prevFen: null, student: 'w', lines: LINES }, BEGINNER).find((c) => c.kind === 'shot');
    expect(shot?.answerSan).toBe('Nd5');
    for (const ply of [24, 25]) {
      expect(clueLine(shot!, ply)).toContain('threats');
      expect(clueLine(shot!, ply)).not.toMatch(/a check or a capture/);
    }
  });
});

describe('a loose piece is counted by who can really take', () => {
  it('a defender pinned to the king is named, never counted', () => {
    expect(legalCounts(PINNED_DEFENDER, 'f4', 'w')).toEqual({ attackers: 2, defenders: 1, pinned: [{ type: 'b', square: 'e3' }] });
    const ch = chancesAt({ fen: PINNED_DEFENDER, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.key === 'save:f4');
    expect(ch && clueLine(ch, 52)).toBe("Hold on — your knight on f4 is attacked twice and defended once — your bishop on e3 is pinned to your king. It's loose.");
  });
  it('twin: with nothing pinned the board count stands', () => {
    expect(legalCounts(QUEEN_GUARDS, 'd4', 'w')).toEqual({ attackers: 1, defenders: 1, pinned: [] });
  });
  it('trading the attacker off is a save, said as a trade (Nf4xd5 …cxd5)', () => {
    const ch = chancesAt({ fen: PINNED_DEFENDER, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.key === 'save:f4');
    expect(ch).toBeDefined();
    if (!ch) return;
    const m = move(PINNED_DEFENDER, 'Nxd5');
    expect(judgeChance(ch, m)).toBe('found');
    expect(creditLine(ch, 0, m)).toBe('There it is — that trade keeps the material level.');
  });
  it('taking the attacker that hits a loose rook is a save (Rh1xh4 …Rxh4)', () => {
    const ch = chancesAt({ fen: ROOK_TRADE, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.key === 'save:h1');
    expect(ch).toBeDefined();
    if (ch) expect(judgeChance(ch, move(ROOK_TRADE, 'Rxh4'))).toBe('found');
  });
  it('twin: a move that leaves the rook where it hangs is still a miss', () => {
    const ch = chancesAt({ fen: ROOK_TRADE, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.key === 'save:h1');
    if (ch) expect(judgeChance(ch, move(ROOK_TRADE, 'a4'))).toBe('missed');
  });
  it('a piece that moves to safety is said where it stands now', () => {
    const ch = chancesAt({ fen: KNIGHT_HIT, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.key === 'save:e4');
    expect(ch).toBeDefined();
    if (ch) expect(creditLine(ch, 1, move(KNIGHT_HIT, 'Nc3'))).toBe('Good — your knight is safe on c3 now.');
  });
});

/** A knight on d6, guarded by the queen, hit by the e7 pawn. */
const PAWN_HITS_KNIGHT = '7k/4p3/3N4/8/8/8/8/3QK3 w - - 0 1';

describe('a cheaper attacker is said as one', () => {
  it('a defended piece hit by a pawn: the clue names the pawn, not the count', () => {
    const ch = chancesAt({ fen: PAWN_HITS_KNIGHT, prevFen: null, student: 'w', lines: [{ moves: ['d6e4'], evaluation: 0, mate: null }] }, BEGINNER).find((c) => c.key === 'save:d6');
    expect(ch).toBeDefined();
    if (ch) expect(clueLine(ch, 0)).toBe('Hold on — their pawn on e7 attacks your knight on d6. A cheaper attacker wins it whatever defends it.');
  });
});

describe('loose pieces', () => {
  it('TAKE: a piece of theirs that can be won is posed; the capture finds it', () => {
    expect(keys(LOOSE_KNIGHT)).toEqual(['take:e5']);
    const [ch] = chancesAt({ fen: LOOSE_KNIGHT, prevFen: null, student: 'w', lines: null }, BEGINNER);
    expect(judgeChance(ch, move(LOOSE_KNIGHT, 'dxe5'))).toBe('found');
    expect(judgeChance(ch, move(LOOSE_KNIGHT, 'Kf2'))).toBe('missed');
  });
  it('TAKE twin: a guarded piece the exchange does not win is not loose', () => {
    expect(keys(GUARDED_KNIGHT)).toEqual([]);
  });
  it('TAKE with a read: a capture the engine does not back is bait, not a loose piece', () => {
    const bait: ReadLine[] = [{ moves: ['e1f2'], evaluation: 50, mate: null }, { moves: ['d4e5'], evaluation: -400, mate: null }];
    expect(keys(LOOSE_KNIGHT, bait)).toEqual([]);
  });
  it('SAVE: your attacked piece is posed; moving it to safety finds it, leaving it misses', () => {
    const [ch] = chancesAt({ fen: KNIGHT_HIT, prevFen: null, student: 'w', lines: null }, BEGINNER);
    expect(ch).toMatchObject({ kind: 'save', counts: { attackers: 1, defenders: 0 } });
    expect(judgeChance(ch, move(KNIGHT_HIT, 'Nc3'))).toBe('found');
    expect(judgeChance(ch, move(KNIGHT_HIT, 'Kd2'))).toBe('missed');
  });
  it('SAVE twin: an attacked piece the exchange does not lose is not loose', () => {
    expect(keys(KNIGHT_GUARDED)).toEqual([]);
  });
  it('LEAVE, answered: a retry that keeps the guard is a find; one that takes it away again is a miss', () => {
    const left = leftLoose(move(QUEEN_GUARDS, 'Qb3'));
    expect(left).not.toBeNull();
    if (!left) return;
    expect(judgeChance(left, move(QUEEN_GUARDS, 'Qd2'))).toBe('found');
    expect(judgeChance(left, move(QUEEN_GUARDS, 'Qb3'))).toBe('missed');
  });
  it('LEAVE: a move that takes a guard away leaves a piece loose; keeping the guard does not', () => {
    expect(leftLoose(move(QUEEN_GUARDS, 'Qb3'))?.key).toBe('leave:d4');
    expect(leftLoose(move(QUEEN_GUARDS, 'Qd2'))).toBeNull();
    // A check answered first: the capture is not legal for them, nothing is loose.
    expect(leftLoose(move(QUEEN_GUARDS, 'Qh5'))).toBeNull();
  });
});

describe('tactics', () => {
  it('SHOT: a forcing line that wins and stands clear of the next move is posed; playing it finds it', () => {
    const [ch] = chancesAt({ fen: FORK_SHOT, prevFen: null, student: 'w', lines: FORK_LINES }, BEGINNER);
    expect(ch).toMatchObject({ kind: 'shot', answerSan: 'Nc7+', gain: 9 });
    expect(judgeChance(ch, move(FORK_SHOT, 'Nc7+', FORK_LINES))).toBe('found');
    expect(judgeChance(ch, move(FORK_SHOT, 'Kd2', FORK_LINES))).toBe('missed');
  });
  it('SHOT, count both (WO-MOTIFS-01 M3d): a decoy before the fork files the answer under the deflection too', () => {
    // Lichess 0DHdu: …Rh1+ Kxh1 a1=Q+ Kh2 Qxd4 — the rook lures the king to
    // h1, the pawn queens with check and the new queen takes the d4 rook.
    const fen = '8/6pk/7p/8/3RP3/3P3P/p2N2PK/r7 b - - 1 39';
    const lines: ReadLine[] = [
      { moves: ['a1h1', 'h2h1', 'a2a1q', 'h1h2', 'a1d4'], evaluation: -900, mate: null },
      { moves: ['a1a8', 'd4a4'], evaluation: 0, mate: null },
    ];
    const ch = chancesAt({ fen, prevFen: null, student: 'b', lines }, BEGINNER).find((c) => c.kind === 'shot');
    expect(ch?.setupTag).toBe('missed-your-deflection');
    expect(ch?.tag).not.toBe('missed-your-deflection');
    // A shot with no set-up carries none.
    const [plain] = chancesAt({ fen: FORK_SHOT, prevFen: null, student: 'w', lines: FORK_LINES }, BEGINNER);
    expect(plain.setupTag).toBeUndefined();
  });
  it('SHOT twins: no read, or a second move nearly as good, poses no shot', () => {
    const shots = (lines: ReadLine[] | null): string[] => keys(FORK_SHOT, lines).filter((k) => k.startsWith('shot:'));
    expect(shots(null)).toEqual([]);
    const close: ReadLine[] = [FORK_LINES[0], { moves: ['d5c3'], evaluation: 850, mate: null }];
    expect(shots(close)).toEqual([]);
    // One focus, both seats: with no read the knight on d5, hit by the queen, is still a save.
    expect(keys(FORK_SHOT, null)).toEqual(['save:d5']);
  });
  it('MOTIF: their standing fork is posed; taking the forker finds it, ignoring it misses', () => {
    const all = chancesAt({ fen: FRIED, prevFen: null, student: 'b', lines: null }, BEGINNER);
    const ch = all.find((c) => c.kind === 'motif');
    expect(ch).toMatchObject({ kind: 'motif', tag: 'missed-their-fork' });
    if (!ch) return;
    expect(judgeChance(ch, move(FRIED, 'Kxf7'))).toBe('found');
    expect(judgeChance(ch, move(FRIED, 'Be6'))).toBe('missed');
    // One focus, both seats: the forking knight is also yours to take.
    expect(all.map((c) => c.key)).toContain('take:f7');
  });
  it('MOTIF twin: a motif already standing last turn is not a new question', () => {
    expect(chancesAt({ fen: FRIED, prevFen: FRIED, student: 'b', lines: null }, BEGINNER).filter((c) => c.kind === 'motif')).toEqual([]);
  });
});

describe('mates', () => {
  it('MATE THREAT: their mate threat is posed; covering f7 finds it, a developing move misses', () => {
    const ch = chancesAt({ fen: SCHOLAR, prevFen: null, student: 'b', lines: null }, BEGINNER).find((c) => c.kind === 'mate-threat');
    expect(ch?.tag).toBe('missed-their-mate');
    expect(judgeChance(ch!, move(SCHOLAR, 'g6'))).toBe('found');
    expect(judgeChance(ch!, move(SCHOLAR, 'Nf6'))).toBe('missed');
  });
  it('MATE FOR YOU: a short forced mate is posed; the mating move finds it', () => {
    const lines: ReadLine[] = [{ moves: ['h5f7'], evaluation: 0, mate: 1 }];
    const [ch] = chancesAt({ fen: SCHOLAR_MATE, prevFen: null, student: 'w', lines }, BEGINNER);
    expect(ch).toMatchObject({ kind: 'mate-for-you', answerSan: 'Qxf7#', mateIn: 1 });
    expect(judgeChance(ch, move(SCHOLAR_MATE, 'Qxf7#', lines))).toBe('found');
  });
  it('MATE FOR YOU twin: a mate too long to ask about is not posed', () => {
    expect(keys(SCHOLAR_MATE, [{ moves: ['h5f7'], evaluation: 0, mate: 7 }])).toEqual([]);
  });
});

describe('a motif is posed only when the record would score it', () => {
  it('their discovery that wins nothing is no question (prod tactics game 1, 19…Ke7)', () => {
    const fen = '1rbq3r/pp2k1p1/2n1p2p/8/3n4/P1N1Q3/1P3PPP/R2R2K1 w - - 2 20';
    const prev = '1rbq3r/pp4p1/2nkp2p/8/3n4/P1N1Q3/1P3PPP/R4RK1 w - - 0 19';
    expect(chancesAt({ fen, prevFen: prev, student: 'w', lines: null }, BEGINNER).filter((c) => c.kind === 'motif')).toEqual([]);
  });
  it('a pin is said with its pieces in order (prod tactics game 3: queen c5, knight c3, rook c1)', () => {
    const fen = '2r1r1kb/p4p1p/5BpP/p1q5/3p4/2N3Q1/PP3PP1/2R2bK1 w - - 0 26';
    const prev = '2r1r1kb/p4p1p/b5pP/p1q3B1/3p4/2N3Q1/PP3PP1/2R2RK1 w - - 0 25';
    const pin = chancesAt({ fen, prevFen: prev, student: 'w', lines: null }, BEGINNER).find((c) => c.pattern === 'pin');
    expect(pin).toBeDefined();
    if (pin) expect(clueLine(pin, 0)).toBe('Hold on — their queen on c5 pins your knight on c3 to your rook on c1, and that move lets it land.');
  });
  it('twin: a fork that wins material is still posed (the Fried Liver)', () => {
    expect(keys(FRIED).some((k) => k.startsWith('motif:fork'))).toBe(true);
  });
});

describe('a loose piece is one decision until a move answers it', () => {
  // Prod record game 1 (2026-10-21): the rook on c1 is attacked by the bishop
  // on a3 and defended once — loose. It was scored "found" on Nf6+, gxf6 and
  // Bxg6 in a row, then fell to …Bxc1.
  const CHECK = '1r2q1k1/3n1pp1/r3p1n1/p2pP1PN/2pP4/b1P3Q1/P1BB3P/2R1KR2 w - - 7 28';
  const RECAPTURE = '1r2q1k1/5pp1/r3pnn1/p2pP1P1/2pP4/b1P3Q1/P1BB3P/2R1KR2 w - - 0 29';
  // The game had an engine read (a rook for a bishop is posed only with one).
  const READ: ReadLine[] = [{ moves: ['h5f6'], evaluation: 100, mate: null }];
  const rookOn = (fen: string) => chancesAt({ fen, prevFen: null, student: 'w', lines: READ }, BEGINNER).find((c) => c.kind === 'save' && c.piece?.square === 'c1');
  it('a check elsewhere leaves the question open (the opponent cannot take while in check)', () => {
    const ch = rookOn(CHECK);
    expect(ch).toBeDefined();
    if (ch) expect(judgeChance(ch, move(CHECK, 'Nf6+'))).toBe('exempt');
  });
  it('taking material on another square leaves the piece still to be won: open, not found', () => {
    const ch = rookOn(RECAPTURE);
    expect(ch).toBeDefined();
    if (ch) expect(judgeChance(ch, move(RECAPTURE, 'gxf6'))).toBe('exempt');
  });
  const KNIGHT_PAWN = '4k3/8/4p3/3N4/8/8/8/R3K3 w - - 0 1';
  const knight = () => chancesAt({ fen: KNIGHT_PAWN, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.kind === 'save' && c.piece?.square === 'd5');
  it('the loose piece giving check from a square nothing attacks is a save', () => {
    const ch = knight();
    expect(ch).toBeDefined();
    if (ch) expect(judgeChance(ch, move(KNIGHT_PAWN, 'Nc7+'))).toBe('found');
  });
  // Prod record game 1 (tonight's build), move 35: their knight hits your
  // queen on g4 and their queen on e5 hangs to your pawn.
  const QUEEN_FOR_QUEEN = 'r6k/p3n2r/2p1Pn2/1p1pq3/3P2Q1/7p/PPP2P1P/4R1RK w - - 0 35';
  it('taking more than the loose piece is worth, elsewhere, is an answer (dxe5 won a queen)', () => {
    const ch = chancesAt({ fen: QUEEN_FOR_QUEEN, prevFen: null, student: 'w', lines: null }, BEGINNER).find((c) => c.kind === 'save' && c.piece?.square === 'g4');
    expect(ch).toBeDefined();
    if (ch) expect(judgeChance(ch, move(QUEEN_FOR_QUEEN, 'dxe5'))).toBe('found');
  });
  it('a check by another piece answers nothing', () => {
    const ch = knight();
    if (ch) expect(judgeChance(ch, move(KNIGHT_PAWN, 'Ra8+'))).toBe('exempt');
  });
});

describe('the deciding blunder', () => {
  it('an even trade is never a deciding blunder (prod audit 26.Rxd8+ …Nxd8, no read yet)', () => {
    const fen = '3r2k1/p3np2/2n1p1pp/2B1P3/4N3/8/1rB2PPP/3R1R1K w - - 0 26';
    expect(decidingBlunder(move(fen, 'Rxd8+'))).toBeNull();
  });
  const BEFORE = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
  it('hanging the queen decides the game (the engine read says it costs the game)', () => {
    expect(decidingBlunder(move(BEFORE, 'Qh5', null, 900))).toEqual({ kind: 'material', squares: ['h5'] });
  });
  it('with no engine read, losing material is never called game-deciding (prod game 3, 28.Qxb5 — the engine\'s best)', () => {
    expect(decidingBlunder(move(BEFORE, 'Qh5'))).toBeNull();
  });
  it('a read that does not list the move: worse than all its choices, and the exchange count decides', () => {
    const read: ReadLine[] = [{ moves: ['b1c3'], evaluation: 30, mate: null }, { moves: ['f1c4'], evaluation: 20, mate: null }];
    expect(decidingBlunder(move(BEFORE, 'Qh5', read))).toEqual({ kind: 'material', squares: ['h5'] });
  });
  it('a read that lists the move as best is never a blunder', () => {
    const read: ReadLine[] = [{ moves: ['d1h5'], evaluation: 30, mate: null }];
    expect(decidingBlunder(move(BEFORE, 'Qh5', read))).toBeNull();
  });
  it('a normal developing move does not', () => {
    expect(decidingBlunder(move(BEFORE, 'Nc3'))).toBeNull();
  });
  it('a position already lost has nothing left to decide', () => {
    const lost: ReadLine[] = [{ moves: ['b1c3'], evaluation: -600, mate: null }];
    expect(decidingBlunder(move(BEFORE, 'Qh5', lost))).toBeNull();
  });
});

describe('only the open motif levels are asked (WO-MOTIFS-01)', () => {
  // …Nc6 hits the d4 pawn, the only guard of the knight on e5 — removing the
  // guard, an Intermediate motif. White (the user) to move.
  const after = (): string => { const c = new Chess('1n4k1/8/3b4/4N3/3P4/8/8/6K1 b - - 0 1'); c.move('Nc6'); return c.fen(); };
  const INTERMEDIATE: ReadonlySet<MotifLevel> = new Set<MotifLevel>(['beginner', 'intermediate']);
  it('a locked motif is not asked; once its level is open it is, named in its own words', () => {
    const fen = after();
    expect(chancesAt({ fen, prevFen: null, student: 'w', lines: null }, BEGINNER).filter((c) => c.kind === 'motif')).toEqual([]);
    const ch = chancesAt({ fen, prevFen: null, student: 'w', lines: null }, INTERMEDIATE).find((c) => c.kind === 'motif');
    expect(ch?.tag).toBe('missed-their-guard-removal');
    expect(ch?.attacker).toEqual({ type: 'n', square: 'c6' });
    if (ch) {
      expect(clueLine(ch, 0)).toBe('Hold on — their knight on c6 can take your pawn on d4, the only guard of your knight on e5, and that move lets it land.');
      expect(creditLine(ch, 0)).toMatch(/nothing of yours falls\.$/);
    }
  });
});

// THE RUNG SCALE (WO-FOCUS-TACTICS-01): every chance, both seats, carries how
// hard it is to find; the coach's plant and the student's rung read it.
describe('every chance carries how hard it is to find, on the rung scale', () => {
  const ALL: ReadonlySet<MotifLevel> = new Set<MotifLevel>(['beginner', 'intermediate', 'advanced']);
  const at = (fen: string, prevFen: string | null, lines: ReadLine[] | null = null, open: ReadonlySet<MotifLevel> = BEGINNER): ReturnType<typeof chancesAt> =>
    chancesAt({ fen, prevFen, student: fen.split(' ')[1] === 'w' ? 'w' : 'b', lines }, open);

  it('a piece to take: the one that just moved (0) · one a guard left (1) · one that looks guarded (2)', () => {
    const FEN = '4k3/8/8/4n3/3P4/8/8/3QK3 w - - 0 1';
    const moved = at(FEN, '4k3/8/5n2/8/3P4/8/8/3QK3 b - - 0 1').find((c) => c.kind === 'take');
    expect(moved?.difficulty, 'the knight just came from f6').toBe(0);
    const stood = at(FEN, '4k3/8/3b4/4n3/3P4/8/8/3QK3 b - - 0 1').find((c) => c.kind === 'take');
    expect(stood?.difficulty, 'the knight stood there; its guard on d6 walked away').toBe(1);
    const guarded = at('4k3/8/3p4/4r3/3P4/8/8/K7 w - - 0 1', null).find((c) => c.kind === 'take');
    expect(guarded?.gain).toBeGreaterThanOrEqual(3);
    expect(guarded?.difficulty, 'the d6 pawn guards the rook — it still loses on the count').toBe(2);
  });

  it('a shot: a fork that takes next move is rung 1 (the two-move shot)', () => {
    const FEN = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const lines: ReadLine[] = [
      { moves: ['b5c7', 'e8d7', 'c7a8', 'd7c6'], evaluation: 500, mate: null },
      { moves: ['e1e2', 'a8a2'], evaluation: 0, mate: null },
    ];
    const shot = at(FEN, null, lines).find((c) => c.kind === 'shot');
    expect(shot?.tag).toBe('missed-your-fork');
    expect(shot?.difficulty).toBe(1);
  });

  // ONE PAWN, the top rung only (David 2026-10-22: "Advanced players might
  // only get the chance to win one pawn"): checks drive the king, the rook
  // takes a7 on your third move, and the pawn is still up at the line's end.
  const ONE_PAWN = '6k1/p7/8/8/8/8/8/3R2K1 w - - 0 1';
  const ONE_PAWN_LINE: ReadLine = { moves: ['d1d8', 'g8h7', 'd8d7', 'h7g6', 'd7a7', 'g6f6'], evaluation: 150, mate: null };
  it('a one-pawn shot three moves deep is rung 3', () => {
    const shot = at(ONE_PAWN, null, [ONE_PAWN_LINE, { moves: ['g1f2'], evaluation: 0, mate: null }], ALL).find((c) => c.kind === 'shot');
    expect(shot).toMatchObject({ gain: 1, difficulty: 3 });
  });
  it('one-pawn twins: a second move nearly as good, or a pawn grabbed at once, pose nothing', () => {
    expect(at(ONE_PAWN, null, [ONE_PAWN_LINE, { moves: ['g1f2'], evaluation: 80, mate: null }], ALL).filter((c) => c.kind === 'shot')).toEqual([]);
    const GRAB = '6k1/p2R4/8/8/8/8/8/6K1 w - - 0 1';
    expect(at(GRAB, null, [{ moves: ['d7a7', 'g8f8'], evaluation: 150, mate: null }, { moves: ['g1f2'], evaluation: 0, mate: null }], ALL).filter((c) => c.kind === 'shot')).toEqual([]);
  });

  it('a mate for you: in one (0) · in two (1) · in three (2) · in four (3)', () => {
    const FEN = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const mateIn = (n: number): number | undefined => at(FEN, null, [{ moves: ['a1a8'], evaluation: 0, mate: n }, { moves: ['g1f1'], evaluation: 0, mate: null }]).find((c) => c.kind === 'mate-for-you')?.difficulty;
    expect([mateIn(1), mateIn(2), mateIn(3), mateIn(4)]).toEqual([0, 1, 2, 3]);
  });

  it('your piece to save: hit by the piece that just moved (0) · by one already there (1)', () => {
    const FEN = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1';
    expect(at(FEN, '4k3/3p4/8/8/4N3/8/8/4K3 b - - 0 1').find((c) => c.kind === 'save')?.difficulty, 'the pawn just came from d7').toBe(0);
    expect(at(FEN, '4k3/8/8/3p4/4N3/8/8/3K4 b - - 0 1').find((c) => c.kind === 'save')?.difficulty).toBe(1);
  });

  it('their Beginner motif is rung 1 — the mirror of your two-move shot', () => {
    const fork = at(FRIED, null).find((c) => c.kind === 'motif');
    expect(fork?.difficulty).toBe(1);
  });

  it('a move that leaves a piece loose is rung 0', () => {
    expect(leftLoose(move(QUEEN_GUARDS, 'Qb3'))?.difficulty).toBe(0);
  });
});

// THE RECAP'S PLAY IT OUT (WO-FOCUS-TACTICS-01): the student finds the line
// from the board before the chance, to the move its point lands on.
describe('play it out walks the chance to where it lands', () => {
  it('a fork plays to the capture (your two moves, their one between)', () => {
    const [ch] = chancesAt({ fen: FORK_SHOT, prevFen: null, student: 'w', lines: FORK_LINES }, BEGINNER).filter((c) => c.kind === 'shot');
    expect(solvePlies(ch, FORK_SHOT)).toBe(3);
    expect(lineSans(FORK_SHOT, ch.line ?? [], 3)).toEqual(['Nc7+', 'Kd7', 'Nxa8']);
  });
  it('a mate in two plays three plies; a loose piece one', () => {
    const FEN = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const [mate] = chancesAt({ fen: FEN, prevFen: null, student: 'w', lines: [{ moves: ['a1a8'], evaluation: 0, mate: 2 }, { moves: ['g1f1'], evaluation: 0, mate: null }] }, BEGINNER);
    expect(solvePlies(mate, FEN)).toBe(3);
    const [take] = chancesAt({ fen: LOOSE_KNIGHT, prevFen: null, student: 'w', lines: null }, BEGINNER);
    expect(solvePlies(take, LOOSE_KNIGHT)).toBe(1);
  });
  it('a line is cut to end on the student\'s move, and stops where it stops being legal', () => {
    expect(lineSans(FORK_SHOT, ['d5c7', 'e8d7', 'c7a8', 'd7c6'], 4)).toEqual(['Nc7+', 'Kd7', 'Nxa8']);
    expect(lineSans(FORK_SHOT, ['d5c7', 'e8e8', 'c7a8'], 3)).toEqual(['Nc7+']);
  });
});
