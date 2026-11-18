// HIDDEN COMBINATIONS AND TRAPS (WO-DANYA-READS-01 group 8), on Danya's own
// article boards. The reads are Stockfish's (src/test/fixtures/
// danya-article-combinations.json — moves and scores, never his words): the
// depth-16 best line from the board, and every legal reply after the best
// move at depth 10.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess, type Square } from 'chess.js';
import { deepCombination, deepCombinationLine, combinationReadOn } from './deepCombination';
import { kingSacrifice } from './kingSiege';
import { ifTheyPlay, baitBranch, baitSentence, everyTakeLoses, everyTakeSentence, replyReadsFromFan, landedSquare } from './ifTheyPlay';
import { legalSeeGainFor } from './positionReadingService';
import { assemblePositionAssessment } from './groundedAnswer';
import { readBoardAll } from './boardComputers';

interface Line { id: string; fen: string; top: { evaluation: number; mate: number | null; moves: string[] } }
interface Fan { id: string; before: string; best: string; fen: string; reads: Array<{ evaluation: number; mate: number | null; moves: string[] }> }
const FIX = JSON.parse(readFileSync('src/test/fixtures/danya-article-combinations.json', 'utf8')) as { lines: Line[]; fans: Fan[] };
const line = (id: string): Line => FIX.lines.find((l) => l.id === id)!;
const fan = (id: string): Fan => FIX.fans.find((f) => f.id === id)!;

/** The best move's SAN and the mover's score, off the board's best line. */
function best(l: Line): { san: string; cp: number | null; mate: number | null; mover: 'w' | 'b' } {
  const c = new Chess(l.fen);
  const mover = c.turn();
  const u = l.top.moves[0];
  const san = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
  const sign = mover === 'w' ? 1 : -1;
  return { san, cp: l.top.mate === null ? l.top.evaluation * sign : null, mate: l.top.mate === null ? null : l.top.mate * sign, mover };
}

describe('deepCombination — the sacrifice the shallow read does not show', () => {
  it('the-tactical-detector#0: Nf6+ gives the knight, and Qxf8+ wins the material back with the better game', () => {
    const l = line('the-tactical-detector#0');
    const b = best(l);
    const d = deepCombination(l.fen, b.san, l.top.moves.slice(1), b.cp, b.mate);
    expect(d).toMatchObject({ outcome: 'back', given: { piece: 'n', square: 'f6' } });
    expect(d!.line.slice(0, 5)).toEqual(['Nf6+', 'Kf7', 'Qe8+', 'Kxf6', 'Qxf8+']);
    const text = deepCombinationLine(d!, b.mover, l.fen);
    expect(text).toContain('your knight on f6');
    expect(text).toContain('Qxf8+');
    expect(text).toMatch(/win the material back/);
  });
  it('the-blitz-chess-manifesto#1: the rook given on f7 comes back as a queen — what is won is named by piece', () => {
    const l = line('the-blitz-chess-manifesto#1');
    const b = best(l);
    const d = deepCombination(l.fen, b.san, l.top.moves.slice(1), b.cp, b.mate);
    expect(d).toMatchObject({ outcome: 'ahead', given: { piece: 'r', square: 'f7' }, offered: { san: 'Rhxf7+' } });
    // The proof stops where the queen is in, not at the checks after it.
    expect(d!.line.at(-1)).toBe('Qxf7+');
    const text = deepCombinationLine(d!, b.mover, l.fen);
    expect(text).toMatch(/^After Nc7\+ and …Kf8, /);
    expect(text).toContain('a queen and a pawn for a rook and a knight');
    expect(text).not.toMatch(/;/);
  });
  it('a trade is not a sacrifice: Rd8+ Rxd8 Rxd8+ takes straight back (the-art-of-time-management#5)', () => {
    const l = line('the-art-of-time-management#5');
    const b = best(l);
    expect(deepCombination(l.fen, b.san, l.top.moves.slice(1), b.cp, b.mate)).toBeNull();
    // …and the sacrifice at the king says no "gives up your rook" of it either.
    expect(kingSacrifice(l.fen, b.san, l.top.moves.slice(1), b.cp, b.mate)).toBeNull();
  });
  it('a sacrifice by the king is kingSacrifice\'s (the Greek gift), and a decoy taken straight back is held', () => {
    const g = line('the-greek-gift-sacrifice-lives-on#0');
    const gb = best(g);
    expect(deepCombination(g.fen, gb.san, g.top.moves.slice(1), gb.cp, gb.mate)).toBeNull();
    expect(combinationReadOn(g.fen, gb.mover, g.top.moves, g.top.evaluation, g.top.mate)?.key).toBe('king-sac:d3h7');
    const s = line('the-importance-of-solving-studies#0');
    const sb = best(s);
    expect(deepCombination(s.fen, sb.san, s.top.moves.slice(1), sb.cp, sb.mate)).toBeNull();
  });
  it('a positional sacrifice the line does not win back is not a combination (the-positional-sacrifice#0)', () => {
    const l = line('the-positional-sacrifice#0');
    expect(combinationReadOn(l.fen, best(l).mover, l.top.moves, l.top.evaluation, l.top.mate)).toBeNull();
  });
  it('the position read says the hidden sacrifice of the best line', () => {
    const l = line('the-tactical-detector#0');
    const read = assemblePositionAssessment({ tempting: null, evalCp: l.top.evaluation, mateIn: l.top.mate, studentColor: 'white', fen: l.fen, bestUci: l.top.moves[0], line: l.top.moves });
    expect(read?.facts).toContain('Nf6+ gives up your knight on f6');
    expect(read?.keySquares).toContain('f6');
  });
  it('the move thought reads it through the one registry, either seat', () => {
    const l = line('the-blitz-chess-manifesto#1');
    const b = best(l);
    const replies = [{ cp: l.top.evaluation, mate: l.top.mate, moves: l.top.moves.slice(1) }];
    // A second read that plays the same line, so the one naming rule names it.
    const seconds = [replies[0].moves];
    const [mine] = readBoardAll('deepCombination', { fenBefore: l.fen, san: b.san, student: 'w', replies, seconds });
    expect(mine).toMatchObject({ computer: 'deepCombination', seat: 'student' });
    expect(mine.stakes).toMatchObject({ points: 2 });
    const [theirs] = readBoardAll('deepCombination', { fenBefore: l.fen, san: b.san, student: 'b', replies, seconds });
    expect(theirs.seat).toBe('opponent');
    expect(theirs.text).toContain('their rook on f7');
    // On one read a line past two moves is not named (lineTrust).
    expect(readBoardAll('deepCombination', { fenBefore: l.fen, san: b.san, student: 'w', replies, seconds: [] })).toEqual([]);
  });
});

/** The tree after the best move, the read of every reply at 1500. */
function treeOf(f: Fan) {
  const student = new Chess(f.before).turn();
  const replies = replyReadsFromFan(f.fen, f.reads);
  const landed = f.best.slice(2, 4);
  return { student, replies, landed, t: ifTheyPlay({ fen: f.fen, replies, rating: 1500, student, seconds: [], played: null, landed })! };
}

describe('the bait taken — the natural capture of the piece that just landed', () => {
  it('modern-chess-technique#3: taking the knight on d6 looks natural, but Rxd6 wins the exchange', () => {
    const { t, student } = treeOf(fan('modern-chess-technique#3'));
    const b = baitBranch(t, student);
    expect(b?.reply.to).toBe('d6');
    // Below the frequency bar, said as the natural capture — never "many players".
    expect(b!.p).toBeLessThan(0.2);
    const text = baitSentence(t, b!, student, 'live', true)!;
    expect(text).toMatch(/^This sets a trap: taking the knight on d6 looks natural, but after …Rxd6, Rxd6 wins the exchange/);
    expect(text).not.toMatch(/many players/);
  });
  it('remembering-im-emory-tate#2: …Nxg6 walks into mate, and the answer is held while it is still the student\'s', () => {
    const { t, student } = treeOf(fan('remembering-im-emory-tate#2'));
    const b = baitBranch(t, student);
    expect(b?.kind).toBe('mate');
    expect(baitSentence(t, b!, student, 'live', false)).toBe('This sets a trap: taking the pawn on g6 looks natural, but …Nxg6 walks into mate.');
  });
  it('without the landed square the take is not read (the frequency bar alone)', () => {
    const f = fan('modern-chess-technique#3');
    const student = new Chess(f.before).turn();
    const t = ifTheyPlay({ fen: f.fen, replies: replyReadsFromFan(f.fen, f.reads), rating: 1500, student, seconds: [], played: null, landed: null })!;
    expect(baitBranch(t, student)).toBeNull();
  });
  it('landedSquare: the destination of a SAN, none for castling', () => {
    expect(landedSquare('Nxe5+')).toBe('e5');
    expect(landedSquare('…exd8=Q#')).toBe('d8');
    expect(landedSquare('O-O-O')).toBeNull();
  });
});

describe('poisonedPiece, by the line — every capture of the piece loses', () => {
  const read = (id: string) => {
    const f = fan(id);
    const { student, replies, landed } = treeOf(f);
    const replier = new Chess(f.fen).turn();
    const free = legalSeeGainFor(f.fen, landed as Square, replier) >= 1;
    return { f, student, replies, replier, landed, b: everyTakeLoses({ fen: f.fen, replies, rating: 1500, student, seconds: [], landed }, free) };
  };
  it('the-knockout-blow#0: the pawn on a4 looks free, but …Qxa4 drops the rook on b1', () => {
    const { f, student, replier, b } = read('the-knockout-blow#0');
    expect(b?.reply.san).toBe('Qxa4');
    const text = everyTakeSentence({ fen: f.fen, replier }, b!, 'pawn', student, true)!;
    expect(text).toContain('After …Qxa4, Rxb1 wins a rook for a pawn.');
  });
  it('mastering-the-queen-sacrifice#1: the knight on f2 cannot be taken — …Be6+ is a discovered check on the queen', () => {
    const { b } = read('mastering-the-queen-sacrifice#1');
    expect(b?.reply.san).toBe('Kxf2');
    expect(b?.motif).toBe('discovered_check');
  });
  it('not poisoned when one capture is safe (the-tactical-detector#0: …Qxf6 loses, the king can still take)', () => {
    expect(read('the-tactical-detector#0').b).toBeNull();
  });
  it('the registry says it, with the bait\'s claim, so the two never say one capture twice', () => {
    const f = fan('the-knockout-blow#0');
    const c = new Chess(f.before);
    const san = c.move({ from: f.best.slice(0, 2), to: f.best.slice(2, 4) }).san;
    const student = new Chess(f.before).turn();
    const [p] = readBoardAll('poisonedPiece', { fenBefore: f.before, san, student, fan: { replies: replyReadsFromFan(f.fen, f.reads), rating: 1500 } });
    expect(p.claims).toContain('bait-take:a4');
    const [bait] = readBoardAll('baitSet', { fen: f.fen, replies: replyReadsFromFan(f.fen, f.reads), rating: 1500, student, seconds: [], played: null, tense: 'live', liveBoard: null, madeBy: san });
    expect(bait.claims).toContain('bait-take:a4');
    // With no read of every reply, only the mate version can speak.
    expect(readBoardAll('poisonedPiece', { fenBefore: f.before, san, student, fan: null })).toEqual([]);
  });
});
