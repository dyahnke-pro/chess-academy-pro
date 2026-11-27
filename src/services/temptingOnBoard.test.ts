// WHY THE TEMPTING MOVE FAILS, ON THE BOARD BEFORE ANYONE MOVES
// (WO-DANYA-READS-01 group 4). Boards from Naroditsky's Chess.com articles
// (the diagrams, never his words), each with Stockfish 18 reads at depth 12:
// the engine's best line and one read per move the human model's eye weighs
// at 1500 — the reads `movePurposeEngine.temptingReads` takes in the app.
// Before this, the position read never said a tempting move: it held only the
// engine's three best lines, and the move a player is drawn to is almost never
// among them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { temptingOnBoard, temptingRefuted, bestOfReads, type WeighRead } from './weighedMoves';
import { assemblePositionAssessment } from './groundedAnswer';
import { readBoard } from './boardComputers';
import { lessonBoardFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { temptingKey } from './conceptKey';

import { oneStem } from '../test/temptingStem';
import { writerFor } from './writerRegister';


interface Board { id: string; fen: string; reads: WeighRead[] }
const FX = JSON.parse(readFileSync('src/test/fixtures/danya-article-tempting.json', 'utf8')) as Board[];
const board = (id: string): Board => {
  const b = FX.find((x) => x.id === id);
  if (!b) throw new Error(`no board ${id}`);
  return b;
};
const side = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w');
const first = (b: Board) => temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads: b.reads, priorMove: null })[0];
const sanOf = (fen: string, uci: string): string => new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;

describe('the tempting move on the board, refuted by its own line', () => {
  it('understanding-the-back-rank#4: Nd4 walks into the back rank — the rook on d6 takes it once the e1 rook falls', () => {
    const t = first(board('understanding-the-back-rank#4'));
    expect(oneStem(t?.text)).toBe(oneStem('Nd4 is tempting here, but it fails: they play Rxe1+, you answer Qxe1 and they play Rxd4 — they win a knight.'));
    // Every move of the line is legal from the board, in order.
    const c = new Chess(board('understanding-the-back-rank#4').fen);
    for (const san of ['Nd4', 'Rxe1+', 'Qxe1', 'Rxd4']) expect(() => c.move(san)).not.toThrow();
  });

  it('the-discovered-check-reloaded#1: every knight move off g5 uncovers the bishop on e7 against the queen on h4', () => {
    const b = board('the-discovered-check-reloaded#1');
    const said = temptingOnBoard({ fen: b.fen, student: 'w', rating: 1500, reads: b.reads, priorMove: null });
    // The most tempting is said first: Nxf7 takes a pawn and hits the rook.
    expect(oneStem(said[0]?.text)).toBe(oneStem("Nxf7 looks natural, but it doesn't work: they play Bxh4, you answer Nxd8 and they play Qxd8 — they win a queen and a knight for a rook and a pawn."));
    expect(said.map((t) => oneStem(t.text))).toContain(oneStem("Ne4 looks natural, but it doesn't work: they play Bxh4 — they win a queen."));
    expect(said[0]?.claims).toContain(temptingKey('g5f7'));
  });

  it('miracle-on-the-chess-board#3: the queen grabs the rook on d6 and the back rank falls', () => {
    const t = first(board('miracle-on-the-chess-board#3'));
    expect(oneStem(t?.text)).toBe(oneStem("Qxd6 looks natural, but it doesn't work: they play Qxd1#."));
    expect(t?.claims).toContain('rule-out:mate:d1');
  });

  it('from the other seat it is their temptation and your refutation', () => {
    const b = board('understanding-the-back-rank#4');
    const t = temptingOnBoard({ fen: b.fen, student: side(b.fen) === 'w' ? 'b' : 'w', rating: 1500, reads: b.reads, priorMove: null })[0];
    expect(t?.text).toMatch(/^Nd4 (was tempting for them|looked natural for them)/);
    expect(t?.text).toContain('you play Rxe1+');
  });

  it('the move said before the move and the same move ruled out after the best is played are one claim', () => {
    const b = board('understanding-the-back-rank#4');
    const best = bestOfReads(b.fen, b.reads);
    const after = temptingRefuted({ fenBefore: b.fen, san: best!.san, student: side(b.fen), rating: 1500, reads: b.reads, priorMove: null });
    expect(after?.key).toBe(first(b)?.key);
  });
});

describe('negative controls — a tempting move that works is never called refuted', () => {
  it('the best move is a capture that works (how-to-avoid-blunders#1: …Bxg5): it is never ruled out, the knight grab on a3 is', () => {
    const b = board('how-to-avoid-blunders-part-1#1');
    const said = temptingOnBoard({ fen: b.fen, student: 'b', rating: 1500, reads: b.reads, priorMove: null });
    expect(said.map((t) => t.san)).not.toContain('Bxg5');
    expect(oneStem(said[0]?.text)).toBe(oneStem("…Nxa3 looks natural, but it doesn't work: they play Bxa3 — they win a knight for a pawn."));
  });

  it('a queen simply given for a pawn is no temptation, and a loss the line does not explain is not said (Capablanca: Qxe6+, Bxe6+)', () => {
    const b = board('joseacute-rauacutel-capablancas-greatest-positional-wins-part-2#1');
    // Qxe6+ Nxe6 gives the queen away; Bxe6+ Qxe6 wins a bishop for a pawn,
    // but the move costs nearly five pawns — two do not explain it.
    expect(temptingOnBoard({ fen: b.fen, student: 'w', rating: 1500, reads: b.reads, priorMove: null })).toEqual([]);
  });

  it('a position loss with nothing won in the line is not a refutation (the-knockout-blow#1: Bxh7+ only gives the edge away)', () => {
    const b = board('the-knockout-blow#1');
    const said = temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads: b.reads, priorMove: null });
    expect(said.map((t) => t.san)).not.toContain('Bxh7+');
  });

  it('the engine\'s best move is never its own temptation, whatever it captures', () => {
    for (const b of FX) {
      const best = bestOfReads(b.fen, b.reads);
      const said = temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads: b.reads, priorMove: null });
      expect(said.map((t) => t.uci)).not.toContain(best!.read.moves[0]);
    }
  });

  it('a capture as good as the best move is not refuted: the cost against the best must be a pawn', () => {
    const b = board('understanding-the-back-rank#4');
    // Give Nd4 the best move's own score: nothing it loses is a cost any more.
    const best = bestOfReads(b.fen, b.reads)!.read;
    const reads = b.reads.map((r) => (r.moves[0] === 'f3d4' ? { ...r, evaluation: best.evaluation, mate: best.mate } : r));
    expect(temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads, priorMove: null }).map((t) => t.san)).not.toContain('Nd4');
  });

  it('one read a move: a fan that reports a move twice weighs it once', () => {
    const b = board('understanding-the-back-rank#4');
    const twice = [...b.reads, ...b.reads.filter((r) => r.moves[0] === 'f3d4')];
    expect(temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads: twice, priorMove: null }).filter((t) => t.san === 'Nd4')).toHaveLength(1);
  });

  it('no reads, no temptation', () => {
    const b = board('understanding-the-back-rank#4');
    expect(temptingOnBoard({ fen: b.fen, student: side(b.fen), rating: 1500, reads: [], priorMove: null })).toEqual([]);
  });
});

describe('wired to the surfaces that read a board', () => {
  it('chat\'s position read says it on the student\'s turn, from the reads it was handed', () => {
    const b = board('understanding-the-back-rank#4');
    const best = bestOfReads(b.fen, b.reads)!;
    const studentColor = side(b.fen) === 'w' ? 'white' : 'black';
    const a = assemblePositionAssessment({ line: null, fen: b.fen, evalCp: best.read.evaluation, mateIn: best.read.mate, studentColor, bestUci: best.read.moves[0], tempting: { rating: 1500, reads: b.reads } });
    expect(oneStem(a?.facts)).toContain(oneStem('Nd4 is tempting here, but it fails'));
    // Without the reads the read has no temptation to say (it never guesses one).
    const none = assemblePositionAssessment({ line: null, fen: b.fen, evalCp: best.read.evaluation, mateIn: best.read.mate, studentColor, bestUci: best.read.moves[0], tempting: null });
    expect(none?.facts ?? '').not.toContain('Nd4');
    // On the opponent's turn it would be their move not yet played: nothing.
    const theirs = assemblePositionAssessment({ line: null, fen: b.fen, evalCp: best.read.evaluation, mateIn: best.read.mate, studentColor: studentColor === 'white' ? 'black' : 'white', bestUci: best.read.moves[0], tempting: { rating: 1500, reads: b.reads } });
    expect(theirs?.facts ?? '').not.toContain('Nd4');
  });

  it('the registry fact: refuted, the step of the choices, the same claim, and held as the student\'s own move', () => {
    const b = board('understanding-the-back-rank#4');
    const f = readBoard('temptingNow', { fen: b.fen, student: side(b.fen), rating: 1500, reads: b.reads, priorMove: null });
    expect(f?.kind).toBe('refuted');
    expect(f?.computer).toBe('temptingOnBoard');
    expect(f?.namesStudentMove).toBe(true);
    expect(f?.claims).toContain(temptingKey('f3d4'));
    expect(f?.proof && typeof f.proof === 'object').toBe(true);
  });

  it('a lesson says it after their move, off the read of the board after it', () => {
    const b = board('understanding-the-back-rank#4');
    // The board before: Black's queen on h6, …Qh5 to the article's board.
    const before = '4r1k1/pp3ppp/2br1n1q/8/8/1PQ2NR1/P4PPP/2B1R1K1 b - - 0 21';
    const c = new Chess(before);
    c.move('Qh5');
    expect(c.fen().split(' ')[0]).toBe(b.fen.split(' ')[0]);
    const after = b.reads.map((r, i) => ({ rank: i + 1, evaluation: r.evaluation, mate: r.mate, moves: [...r.moves] }));
    const facts = lessonBoardFacts({ soundPlies: new Set<number>(), unpricedCredit: 'refused', register: 'review', moveReads: writerFor('review').moveReads, namesPlayedMove: true,
      fenBefore: before, san: 'Qh5', moverIsStudent: false, plainThreatsSeen: false, tense: 'past', theory: false, story: false,
      prev: NO_PREV_CAPTURE, line: [], history: [], theirLast: null,
      reads: { before: [], after, passBefore: [], passAfter: [] }, costCp: 0,
    });
    const t = facts.find((f) => f.computer === 'temptingOnBoard');
    expect(t?.text).toContain('Nd4');
    expect(sanOf(b.fen, 'f3d4')).toBe('Nd4');
  });
});
