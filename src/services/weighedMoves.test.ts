// THE MOVES A PLAYER WEIGHS (weighedMoves, 2026-11-05) — read on Naroditsky's
// own games. Each position is a move from his speedruns where he weighed
// another move out loud (the bank of his words, aligned per move; his words
// are not quoted here). The engine reads in the fixture are Stockfish 18 at
// depth 14, one per candidate the human model picks there (the same reads the
// review stores, `gameAnalysisService.weighedReads`). Before this file no
// computer said any of these: the natural move that fails with its line, the
// move of the same worth, the square a piece should not go to.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { candidateMoves, temptingRefuted, alsoGood, squareChoice, moveDifference, type WeighRead } from './weighedMoves';
import { readBoard } from './boardComputers';
import { isProof } from './proof';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { NO_SECOND_READ } from './inaccuracyCall';
import { facetLines } from '../test/reviewFacetLines';
import { buildRejectedTempting } from './playCommentary';

interface Fixture { video: string; ply: number; fenBefore: string; played: string; reads: WeighRead[] }
const FX = JSON.parse(readFileSync('src/test/fixtures/danya-weighed-reads.json', 'utf8')) as Fixture[];
const game = (video: string): Fixture => {
  const g = FX.find((x) => x.video === video);
  if (!g) throw new Error(`no fixture ${video}`);
  return g;
};
const seat = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w');
const other = (c: 'w' | 'b'): 'w' | 'b' => (c === 'w' ? 'b' : 'w');

describe('the candidate list is the human model\'s, quiet moves included', () => {
  it('his 11…Nd7 (RehhbTF00qQ): the knight\'s natural c6 is weighed — a quiet move no check-and-capture scan finds', () => {
    const fen = 'rn1q1rk1/ppp1bppp/4b3/3pP3/3P4/P1N2N2/1PPQB1PP/R4RK1 b - - 4 11';
    const c = candidateMoves(fen, 1500, { played: 'Nd7', scored: null });
    expect(c[0].san).toBe('Nc6');
    expect(c.some((x) => x.san === 'Nd7' && x.played)).toBe(true);
    // None of the eye's top candidates here is a check or a capture.
    expect(c.every((x) => !/[x+#]/.test(x.san))).toBe(true);
  });

  it('a move the engine scores as losing a piece drops out once every move is scored', () => {
    const g = game('8urm2D1HhX8');
    const scored = g.reads.map((r) => ({ uci: r.moves[0], cp: (seat(g.fenBefore) === 'w' ? 1 : -1) * r.evaluation }));
    const eye = candidateMoves(g.fenBefore, 1500, { played: g.played, scored: null });
    const full = candidateMoves(g.fenBefore, 1500, { played: g.played, scored });
    const nxe4 = (xs: typeof eye): number => xs.find((x) => x.san === 'Nxe4')?.p ?? 0;
    // The eye weighs the capture; the full model, knowing it drops the knight,
    // gives it a small share — the temptation that fails.
    expect(eye.some((x) => x.san === 'Nxe4')).toBe(true);
    expect(nxe4(full)).toBeLessThan(0.02);
  });
});

describe('one claim for one ruled-out move (wire-19)', () => {
  it('7…Ng4 (8urm2D1HhX8): Learn\'s "Why not Nxe4?" before the move and the weighed move after it share one key', () => {
    // Learn asks before the move (buildRejectedTempting) and weighs the move
    // after it (temptingRefuted); both rule out …Nxe4. They were keyed
    // 'tempting:Nxe4:<board>' and 'tempting:f6e4', so the say-once ledger
    // heard two claims.
    const g = game('8urm2D1HhX8');
    const s = seat(g.fenBefore) === 'w' ? 1 : -1;
    const lines = g.reads.map((r) => ({ uci: r.moves[0], replyUci: r.moves[1] ?? null, evalCp: s * r.evaluation })).sort((a, b) => b.evalCp - a.evalCp);
    const ask = buildRejectedTempting({ fen: g.fenBefore, studentColor: seat(g.fenBefore) === 'w' ? 'white' : 'black', lines });
    const weighed = temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null });
    expect(ask?.temptingSan).toBe('Nxe4');
    expect(ask?.claim).toBe('tempting:f6e4');
    expect(weighed?.claims).toContain(ask?.claim);
  });
});

describe('(A) the tempting move, refuted — on his games', () => {
  it('7…Ng4 (8urm2D1HhX8): …Nxe4 fails to dxe4', () => {
    const g = game('8urm2D1HhX8');
    const r = temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null });
    expect(r?.text).toBe('Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn.');
    // One loss is ruled out once, whichever computer said it (the
    // deliberation's claim for the same square).
    expect(r?.claims).toEqual(['tempting:f6e4', 'rule-out:e4']);
    // From the other seat the words turn: their temptation, your refutation.
    expect(temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: other(seat(g.fenBefore)), rating: 1500, reads: g.reads, priorMove: null })?.text)
      .toBe('Nxe4 was tempting for them, but it fails: you play dxe4 — you win a knight for a pawn.');
  });

  it('14.Nc3 (Di-5aO2lddU): e3 drops the knight on a4', () => {
    const g = game('Di-5aO2lddU');
    expect(temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null })?.text)
      .toBe("e3 looks natural, but it doesn't work: they play Qxa4 — they win a knight.");
  });

  it('17…Rb8 (HvrXmUORIcQ): …b6 drops the rook — and it is said before the queen capture that drops more', () => {
    const g = game('HvrXmUORIcQ');
    expect(temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null })?.text)
      .toBe("b6 looks natural, but it doesn't work: they play Qxa8 — they win a rook.");
  });

  it('3…g6 (HiCeU8tIh0U): …Nf6 does not stop the mate', () => {
    const g = game('HiCeU8tIh0U');
    const r = temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null });
    expect(r?.text).toBe("Nf6 is tempting here, but it fails: they play Qxf7#.");
    expect(r?.claims).toContain('rule-out:mate:f7');
  });

  it('23.Rb1 (Ust1WJO7KQ0): c3 loses a pawn three moves on', () => {
    const g = game('Ust1WJO7KQ0');
    expect(temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null })?.text)
      .toBe('c3 is tempting here, but it fails: they play dxc3, you answer bxc3 and they play Rxc3 — they win a pawn.');
  });

  it('nothing is ruled out without a read of the move played', () => {
    const g = game('8urm2D1HhX8');
    const played = new Chess(g.fenBefore).move(g.played);
    const reads = g.reads.filter((r) => r.moves[0] !== `${played.from}${played.to}`);
    expect(temptingRefuted({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads, priorMove: null })).toBeNull();
  });
});

describe('(L) two good moves — on his games', () => {
  it('20.f6+ (SXsVWpN8e1A) and 21.Bxf6+ (_X7t6o3o6JM): both keep the win, take your pick', () => {
    for (const v of ['SXsVWpN8e1A', '_X7t6o3o6JM']) {
      const g = game(v);
      const r = alsoGood({ fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads });
      expect(r?.text).toMatch(/^\S+ or \S+ — both keep the win, so take your pick\.$/);
    }
    expect(alsoGood({ fenBefore: game('SXsVWpN8e1A').fenBefore, san: 'f6+', student: 'w', rating: 1500, reads: game('SXsVWpN8e1A').reads })?.san).toBe('Qg4+');
  });

  it('the difference between two moves is a board fact, never the moved piece itself', () => {
    // 10…Nd5 vs …Nh5 (Fz0_pECE5vo): the knight on d5 is where it went, so it
    // is not "kept guarded" by the other move; the knight's reach is the point.
    const fen = 'r1bq1rk1/pp1pppbp/2n2np1/4P3/Q4B2/2P5/PP3PPP/RN2KBNR b KQ - 0 10';
    expect(moveDifference(fen, 'Nd5', 'Nh5', 'your')?.text).toBe('your knight does more on d5, with 7 squares from there against 3 on h5');
  });

  it('when the other move has the edge, the held form says the edge without naming it (prod audit 2026-11-07)', () => {
    // The old held line here was "the other one has a point of its own, so
    // weigh what each leaves behind" — no fact at all.
    const fen = 'r1bq1rk1/pp1pppbp/2n2np1/4P3/Q4B2/2P5/PP3PPP/RN2KBNR b KQ - 0 10';
    // Specific (David 2026-11-07: "Not a general statement"): the piece, its
    // square and its reach — and never the other move's square (d5).
    expect(moveDifference(fen, 'Nh5', 'Nd5', 'your')?.heldOther).toBe('your knight reaches only 3 squares from h5, against 7 from the other square it had');
    const reads: WeighRead[] = [
      { evaluation: -20, mate: null, moves: ['f6d5', 'f4g3'] },
      { evaluation: -25, mate: null, moves: ['f6h5', 'f4g3'] },
    ];
    const r = alsoGood({ fenBefore: fen, san: 'Nh5', student: 'b', rating: 1500, reads });
    expect(r?.heldText).toMatch(/^(Another move was worth the same here|A second move did just as well here|You had another move of the same worth) — your knight reaches only 3 squares from h5, against 7 from the other square it had\.$/);
    expect(r?.heldText).not.toMatch(/d5|Nd5/);
  });
});

describe('(C) which square for the piece — on his games, board reads only', () => {
  it('11.Na3 (25w0mYsx_Lk): Nd2 hangs the bishop on d3', () => {
    expect(squareChoice({ fenBefore: 'r1bq1rk1/ppp2pb1/5npp/4p3/4P2B/2PB4/PP3PPP/RN1Q1RK1 w - - 0 11', san: 'Na3', student: 'w', rating: 1500, reads: null, priorMove: null, beaten: null })?.text)
      .toBe('Your knight goes to a3. On d2 it leaves your light-squared bishop hanging.');
  });
  it('11…Nd7 (RehhbTF00qQ): …Nc6 blocks the c-pawn — from both seats', () => {
    const fen = 'rn1q1rk1/ppp1bppp/4b3/3pP3/3P4/P1N2N2/1PPQB1PP/R4RK1 b - - 4 11';
    expect(squareChoice({ fenBefore: fen, san: 'Nd7', student: 'b', rating: 1500, reads: null, priorMove: null, beaten: null })?.text)
      .toBe('Your knight goes to d7. On c6 it blocks your c-pawn.');
    expect(squareChoice({ fenBefore: fen, san: 'Nd7', student: 'w', rating: 1500, reads: null, priorMove: null, beaten: null })?.text)
      .toBe('Their knight went to d7. On c6 it blocks their c-pawn.');
  });
  it('14…Bf6 (WQFcuBCL1F4): …Bd6 hangs the knight on d5', () => {
    expect(squareChoice({ fenBefore: 'r4rk1/1ppqb1pp/2n5/p2npp2/6bP/P1NP1NP1/1PPBBP2/R2Q1RK1 b - - 0 14', san: 'Bf6', student: 'b', rating: 1500, reads: null, priorMove: null, beaten: null })?.text)
      .toBe('Why f6 for your bishop? On d6 it leaves your knight on d5 hanging.');
  });
  it('a kick is a reason only against a square at least as natural as the one chosen; a queen\'s squares are not weighed', () => {
    // 14…Bf6 again: c5 can be kicked by d4, but the eye weighs …Bc5 below
    // …Bf6, so the kick is not said (any fifth-rank square can be kicked).
    expect(squareChoice({ fenBefore: 'r4rk1/1ppqb1pp/2n5/p2npp2/6bP/P1NP1NP1/1PPBBP2/R2Q1RK1 b - - 0 14', san: 'Bf6', student: 'b', rating: 1500, reads: null, priorMove: null, beaten: null })?.text).not.toMatch(/kicked/);
    // A queen move asks no square question (a dozen squares, each "kicked").
    expect(squareChoice({ fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3', san: 'Qg4', student: 'w', rating: 1500, reads: null, priorMove: null, beaten: null })).toBeNull();
  });
  it('11.Bb2 (55gXMP9N5sM): every other square hangs the knight on a3 — said once', () => {
    expect(squareChoice({ fenBefore: 'r1b2rk1/pp2ppbp/2n2np1/q1p5/3P4/N1P2NPP/P3PPB1/R1BQR1K1 w - - 1 11', san: 'Bb2', student: 'w', rating: 1500, reads: null, priorMove: null, beaten: null })?.text)
      .toBe('Your bishop goes to b2. On its other squares it leaves your knight on a3 hanging.');
  });
  // Carlsen–Caruana 22…Nh5 (prod Review 2026-11-09): "Better was Ne2+" and
  // then "Why h5 for their knight? On h3 or e2 it hangs."
  const NH5 = 'r4rk1/1bp2pb1/3p2p1/pp1Pq1B1/PP2PnQ1/4N3/2B2PPP/R3R1K1 b - - 2 22';
  it('the engine took this piece to another square: no square question (the surface priced the move)', () => {
    expect(squareChoice({ fenBefore: NH5, san: 'Nh5', student: 'w', rating: 1400, reads: null, priorMove: null, beaten: null })?.text).toMatch(/e2/);
    expect(squareChoice({ fenBefore: NH5, san: 'Nh5', student: 'w', rating: 1400, reads: null, priorMove: null, beaten: 'f4e2' })).toBeNull();
    // Another piece's better move is not this piece's square.
    expect(squareChoice({ fenBefore: NH5, san: 'Nh5', student: 'w', rating: 1400, reads: null, priorMove: null, beaten: 'a8a7' })).not.toBeNull();
  });
  it('a square the engine reads no worse is never said to fail', () => {
    const reads: WeighRead[] = [
      { evaluation: 120, mate: null, moves: ['f4e2', 'e1e2'] },
      { evaluation: 160, mate: null, moves: ['f4h5', 'f2f4'] },
      { evaluation: 650, mate: null, moves: ['f4h3', 'g2h3'] },
    ];
    const t = squareChoice({ fenBefore: NH5, san: 'Nh5', student: 'w', rating: 1400, reads, priorMove: null, beaten: null })?.text ?? '';
    expect(t).not.toMatch(/e2/);
    expect(t).toMatch(/h3 it hangs/);
    // A read that beats the square played by an inaccuracy: not asked at all.
    expect(squareChoice({ fenBefore: NH5, san: 'Nh5', student: 'w', rating: 1400, reads: [{ ...reads[0], evaluation: 20 }, reads[1], reads[2]], priorMove: null, beaten: null })).toBeNull();
  });
  it('a pawn move or a capture asks no square question', () => {
    expect(squareChoice({ fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'e4', student: 'w', rating: 1500, reads: null, priorMove: null, beaten: null })).toBeNull();
  });
});

describe('through the one registry, to every surface', () => {
  it('the facts carry their kind, step, claims and proof', () => {
    const g = game('8urm2D1HhX8');
    const t = readBoard('temptingRefuted', { fenBefore: g.fenBefore, san: g.played, student: seat(g.fenBefore), rating: 1500, reads: g.reads, priorMove: null });
    expect(t?.kind).toBe('refuted');
    expect(t?.step).toBe('choices');
    expect(t && isProof(t.proof) && t.proof.kind).toBe('line');
    // The other move of the same worth may still be the student's to play: on
    // a live board it is held in a form that names no move and no square.
    const l = readBoard('alsoGood', { fenBefore: game('SXsVWpN8e1A').fenBefore, san: 'f6+', student: 'w', rating: 1500, reads: game('SXsVWpN8e1A').reads });
    expect(l?.namesStudentMove).toBe(true);
    expect(l?.heldForm?.text).toBe('Another move kept the win just as well — when you are winning, there is often more than one road.');
    expect(l?.heldForm?.squares).toEqual([]);
    // Their move, the same worth: nothing of the student's is named.
    expect(readBoard('alsoGood', { fenBefore: game('SXsVWpN8e1A').fenBefore, san: 'f6+', student: 'b', rating: 1500, reads: game('SXsVWpN8e1A').reads })?.namesStudentMove).toBe(false);
  });

  it('the lesson composer is handed them (the fan before the move stands in for the reads)', () => {
    const g = game('8urm2D1HhX8');
    const facts = moveThoughtFacts({ theory: true, tense: 'now', fenBefore: g.fenBefore, san: g.played, moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: [], phrases: null,
      reads: { before: g.reads.map((r, i) => ({ rank: i + 1, evaluation: r.evaluation, mate: r.mate, moves: [...r.moves] })), passBefore: [], after: [], passAfter: [] }, costCp: null });
    expect(facts.filter((f) => f.source === 'weighed').map((f) => f.text)).toContain('Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn.');
  });

  it('Review says them off the record\'s reads, both seats', () => {
    const g = game('8urm2D1HhX8');
    const after = new Chess(g.fenBefore);
    after.move(g.played);
    const lines = (student: 'w' | 'b'): string[] => facetLines(computeMoveFacets({ seenFundamentals: new Set(),
      teaching: { ...NO_TEACHING_CONTEXT, weigh: { rating: 1500, reads: g.reads } },
      fenBefore: g.fenBefore, fenAfter: after.fen(), san: g.played, ply: 14,
      moverColor: 'black', playerColor: student === 'w' ? 'white' : 'black', studentColorWB: student,
      evaluation: 78, preMoveEval: 70, costCp: null, heardVerdict: null,
      classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: [], forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
      replyBestSan: null, replyEvaluation: null,
    }));
    expect(lines('b').join('\n')).toContain('Nxe4 is tempting here, but it fails: they play dxe4 — they win a knight for a pawn.');
    expect(lines('w').join('\n')).toContain('Nxe4 was tempting for them, but it fails: you play dxe4 — you win a knight for a pawn.');
    // No reads on the record: the engine half is silent, never guessed.
    const bare = facetLines(computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: g.fenBefore, fenAfter: after.fen(), san: g.played, ply: 14,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 78, preMoveEval: 70, costCp: null, heardVerdict: null,
      classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0, net: 0 },
      allSans: [], forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], secondReads: NO_SECOND_READ,
      replyBestSan: null, replyEvaluation: null,
    }));
    expect(bare.join('\n')).not.toContain('tempting');
  });
});

describe('the same-worth opener rotates on the board (prod focus audit 2026-11-09)', () => {
  // Record game 3 said "Another move was worth the same here —" seven times.
  it('three stems, picked by the board, never by chance', () => {
    const fen = 'r1bq1rk1/pp1pppbp/2n2np1/4P3/Q4B2/2P5/PP3PPP/RN2KBNR b KQ - 0 10';
    const reads: WeighRead[] = [
      { evaluation: -20, mate: null, moves: ['f6d5', 'f4g3'] },
      { evaluation: -25, mate: null, moves: ['f6h5', 'f4g3'] },
    ];
    const stem = (f: string): string | undefined => alsoGood({ fenBefore: f, san: 'Nh5', student: 'b', rating: 1500, reads })?.heldText.split(' — ')[0];
    expect(stem(fen), 'the same board, the same words').toBe(stem(fen));
    // The same position on different move counters is a different key.
    const stems = new Set(Array.from({ length: 12 }, (_, i) => stem(fen.replace(/ 0 10$/, ` 0 ${10 + i}`))));
    expect(stems.size).toBeGreaterThan(1);
  });
});
