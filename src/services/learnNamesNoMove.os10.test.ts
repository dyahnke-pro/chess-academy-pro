// OS-10 — LEARN NAMES NO MOVE UNASKED, at every producer (David's record,
// Smith-Morra replay 2026-10-19). Each Learn fact says which of the student's
// moves it names (REQUIRED); the door holds it while one is theirs to play.
// Every leak below is reproduced on a real board and fails on the old code.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { decideTurn, type LaneInput } from './learnTurnDoor';
import { computePositionFacts } from './positionFacts';
import { prizeTeaching } from './learnBoardTeaching';
import { flexibleFirst } from './speedRunReads';
import { latentForkClause, detectLatentFork, type LatentFork } from './latentFork';
import { namesMoves, namesPlayableStudentMove, namedSan, studentMovesInLine, NAMES_NO_MOVE } from './studentMoveNaming';
import { NO_PROOF } from './proof';

const fens = (moves: readonly string[]): string[] => {
  const c = new Chess();
  const out = [c.fen()];
  for (const m of moves) { c.move(m); out.push(c.fen()); }
  return out;
};
const flat = { topLines: [{ rank: 1, evaluation: 20, moves: [], mate: null }, { rank: 2, evaluation: 15, moves: [], mate: null }], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

// David's Smith-Morra, student White (teach-mvfhdihq-7i8vk5, from his data drop).
const GAME = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2 Rg5 Qxb3 axb3 Rxb2 Rxg6 Kf7 Rg5 Rf2 Nd5 Bd7 Rxg4 Rxg2+ Kxg2 Bxg4 Rf1+ Kg8 Nhf6+ exf6 Nxf6+ Kf8'.split(' ');
const F = fens(GAME);

describe('the door holds a fact that names a move the student can play next', () => {
  const fact = (namesStudentMove: LaneInput['namesStudentMove']): LaneInput => ({ lane: 'positionFacts', text: 'Bishop to c4 is a common try here.', fen: F[8], proof: NO_PROOF.description, namesStudentMove });
  it('held while the named move is legal for the student', () => {
    const d = decideTurn([fact(namesMoves('w', F[8], { from: 'f1', to: 'c4' }))], undefined, undefined, null, null, false, null);
    expect(d.held).toContain('positionFacts');
    expect(d.spoke).not.toContain('positionFacts');
  });
  it('spoken when it names no move, or a move no longer theirs to play', () => {
    expect(decideTurn([fact(NAMES_NO_MOVE)], undefined, undefined, null, null, false, null).spoke).toContain('positionFacts');
    // c3 was the student's pawn move two moves ago — not legal now.
    expect(namesPlayableStudentMove(namesMoves('w', F[8], { from: 'c2', to: 'c3' }))).toBe(false);
  });
  it('a line names only the student\'s plies, on the board they move on next', () => {
    const n = studentMovesInLine(F[8], ['Bc4', 'e6', 'Nf3'], 'w', F[8]);
    expect(n === 'none' ? [] : n.moves).toEqual([namedSan(F[8], 'Bc4'), { from: 'g1', to: 'f3' }]);
  });
});

describe('the leaks on David\'s record', () => {
  it('move 4: "Bishop to c4 is a common try here" names his coming Bc4 — the refuted clause declares it and is held', async () => {
    // He played 4.Nxc3 (…d6 came back); players at his level also try 4.Bc4 there.
    const fan = [{ evaluation: 0, mate: null, moves: ['b1c3'] }, { evaluation: -60, mate: null, moves: ['f1c4', 'c3b2'] }];
    const popular = [{ san: 'Nxc3', games: 70, pct: 70 }, { san: 'Bc4', games: 30, pct: 30 }];
    const r = await computePositionFacts({ boardComputers: 'surface', posture: 'walk', fen: F[8], moverColor: 'w', studentColor: 'w', analysis: flat, lastMove: { fenBefore: F[6], san: 'Nxc3', cpLoss: 0, historySans: null, reads: null, popular, fanBefore: fan } });
    const refuted = r.clauses.find((c) => c.kind === 'refuted');
    expect(refuted?.text).toMatch(/Bc4|Bishop to c4/);
    expect(refuted && namesPlayableStudentMove(refuted.namesStudentMove)).toBe(true);
  });

  it('a free piece is said without its square, and only the prize is marked (move 28: "Their bishop on g4 has nothing defending it")', () => {
    // After 27…Kf8 the bishop on g4 hangs to Nxg4 (his next move).
    const fen = F[54];
    for (const stem of [0, 1, 2]) {
      const p = prizeTeaching(fen, 'g4', 'w', stem);
      expect(p).not.toBeNull();
      expect(p?.text).not.toMatch(/g4|f6/);
      // The prize is marked; the taker (the knight on f6) never is.
      expect(p?.squares).toEqual(['g4']);
    }
  });

  it('the flexible-move idea names no piece (ply 13: "Commit the pawn last — a knight move now")', () => {
    // After 4…d6, White to move: Nf3 and the pawn push f4 about equal.
    const lines = [{ moves: ['g1f3'], evaluation: 30, mate: null }, { moves: ['f2f4'], evaluation: 20, mate: null }];
    // (the board after 4…d6: Nf3 and f4 about equal)
    const reads = [0, 1, 2, 3, 4, 5].map((k) => flexibleFirst(F[8].replace(/ \d+$/, ` ${5 + k}`), lines)).filter((r) => r !== null);
    expect(reads.length).toBeGreaterThan(0);
    for (const r of reads) expect(r?.idea).not.toMatch(/knight|bishop|rook|queen|castl/i);
  });

  it('the student\'s own fork names the square, never the route (move 27: "via b5, then c7")', () => {
    // After 14…Qb4 the knight on c3 reaches c7 by b5, forking king and rook.
    const fork = detectLatentFork(F[28], 'white') as LatentFork;
    expect(fork.via).toBe('b5');
    const line = latentForkClause(fork, 'white');
    expect(line).toMatch(/fork waiting on c7/);
    expect(line).not.toMatch(/b5|via/);
  });

  it('1.e4 "to free your bishop on f1 for Be2": Learn asks the reason computer to hold the prepared move', async () => {
    vi.resetModules();
    const seen: Array<{ seat: string; namesPreparedMove: boolean }> = [];
    vi.doMock('./decisiveReason', async (orig) => ({
      ...(await orig<typeof import('./decisiveReason')>()),
      decisiveReason: (i: { seat: string; namesPreparedMove: boolean }) => { seen.push({ seat: i.seat, namesPreparedMove: i.namesPreparedMove }); return null; },
    }));
    const { learnMoveReason } = await import('./learnBoardTeaching');
    const reads = { before: [], after: [], passBefore: [], passAfter: [] };
    learnMoveReason({ fenBefore: new Chess().fen(), san: 'e4', reads, seat: 'student', opponentLastSan: null });
    learnMoveReason({ fenBefore: F[1], san: 'c5', reads, seat: 'opponent', opponentLastSan: 'e4' });
    expect(seen).toEqual([{ seat: 'student', namesPreparedMove: false }, { seat: 'opponent', namesPreparedMove: true }]);
    vi.doUnmock('./decisiveReason');
  });
});
