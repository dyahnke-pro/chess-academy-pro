// BATCH 1 — opening equivalence, order and timing. Each computer is pinned on
// a real, chess.js-validated game position for the act it exists for, with a
// negative case where it must stay silent; then each wiring path (Learn's
// `studentMoveTeaching`, the one producer `depthClauses`, review's
// `computeMoveFacets`) is shown to carry the fact OUT, with its proof.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { tradeLedger, captureTooEarly } from './tempoCount';
import { notYetPlayed, notYetIdea } from './notYetPlayed';
import { heldResource, holdIdea } from './holdResource';
import { captureChoice, captureChoiceIdea } from './captureChoice';
import { kickOn, kickAfterRecapture, kickLineRead } from './kickMap';
import { pawnSquareRaceRead, pawnSquareTaken, pawnSquareRaces } from './planRace';
import { patternFails } from './patternFails';
import { openingEquivalence, flipFen } from './openingEquivalence';
import { setOpeningPositions } from './openingPositions';
import { studentMoveTeaching } from './learnBoardTeaching';
import { depthClauses } from './thinkAloud';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { isProof } from './proof';
import { COMPUTER_ROLES } from './computerRoles';
import { LEARN_LANES } from './learnTurnDoor';
import { FACT_ROLE, FACT_PROOF } from './reviewFacetRank';

const fenOf = (line: string): string => {
  const c = new Chess();
  for (const m of line.split(' ')) c.move(m);
  return c.fen();
};
/** No digits in anything spoken (no numbers in speech). */
const noDigits = (t: string): void => {
  const bare = t.replace(/\b[a-h][1-8]\b/g, '').replace(/[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?/g, '').replace(/O-O(-O)?/g, '');
  expect(bare, t).not.toMatch(/\d/);
};
/** Student = you/your, opponent = they/their — never we/our/us. */
const voice = (t: string): void => {
  expect(t).not.toMatch(/\b(we|our|us)\b/i);
  noDigits(t);
};

beforeAll(() => {
  setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
});

describe('move-count ledger for trades (tempoCount.tradeLedger)', () => {
  it('QGD: …dxc4 after Bd3 — taking back is the bishop\'s second move', () => {
    const r = tradeLedger('d4 d5 c4 e6 Nf3 Nf6 e3 Be7 Bd3 dxc4 Bxc4'.split(' '), 'b');
    expect(r?.kind).toBe('recapture-tempo');
    expect(r?.text).toMatch(/bishop had already gone to d3/);
    expect(r?.text).toMatch(/second move/);
    expect(r?.squares).toEqual(['f1', 'd3', 'c4']);
    voice(r!.text);
  });
  it('silent when the bishop takes back straight from home (its first move)', () => {
    expect(tradeLedger('d4 d5 c4 e6 Nf3 Nf6 e3 dxc4 Bxc4'.split(' '), 'b')).toBeNull();
  });
  it('a much-moved knight traded for a fresh bishop (Kan, Bxf5 exf5)', () => {
    const r = tradeLedger('e4 c5 Nf3 a6 d4 cxd4 Nxd4 e5 Nf5 d5 Bd3 Nc6 O-O Bxf5 exf5'.split(' '), 'b');
    expect(r?.kind).toBe('fresh-for-moved');
    expect(r?.text).toMatch(/knight/);
    voice(r!.text);
  });
  it('winning a queen with a rook is not a trade — silent', () => {
    expect(tradeLedger('d4 e6 Bf4 Nf6 e3 b6 Qf3 Bb7 Qxb7 Nc6 Bxc7 Qc8 Ba6 Nb4 Qxc8+ Rxc8 Bxc8'.split(' '), 'b')?.kind).not.toBe('fresh-for-moved');
  });
  it('the prospective half: …dxc4 now develops their bishop for free', () => {
    const fen = fenOf('d4 d5 c4 e6 Nf3 Nf6 e3');
    const r = captureTooEarly(fen, 'b', 'Be7');
    expect(r?.capture).toBe('dxc4');
    expect(r?.recapture).toBe('Bxc4');
    voice(r!.text);
    // …and silent when the engine's move IS the capture.
    expect(captureTooEarly(fen, 'b', 'dxc4')).toBeNull();
  });
});

describe('order from what they have NOT played (notYetPlayed)', () => {
  const fen = fenOf('c4 e5 Nc3');
  it('no knight on f3 yet, so nothing hits e5 — develop first', () => {
    const r = notYetPlayed(fen, 'Nf6', 'Nf6', 0);
    expect(r?.target).toBe('e5');
    expect(r?.theirMove).toBe('Nf3');
    expect(r?.squares).toEqual(['g1', 'f3', 'e5']);
    voice(r!.text);
    expect(notYetIdea(fen, 'b', 'Nf6')?.target).toBe('e5');
  });
  it('silent when the move was not the engine\'s, or cost', () => {
    expect(notYetPlayed(fen, 'Nf6', 'Nc6', 0)).toBeNull();
    expect(notYetPlayed(fen, 'Nf6', 'Nf6', 60)).toBeNull();
  });
  it('silent once their knight is already out (e5 is hit now)', () => {
    expect(notYetPlayed(fenOf('c4 e5 Nf3'), 'Nf6', 'Nf6', 0)).toBeNull();
  });
});

describe('hold a resource until it bites (holdResource)', () => {
  const fen = fenOf('c4 e6 Nf3 d5 d4');
  it('save the check on b4 until their knight is on c3', () => {
    const r = holdIdea(fen, 'b', 'Nf6');
    expect(r?.resource).toBe('Bb4');
    expect(r?.check).toBe(true);
    expect(r?.sans).toEqual(['Nc3', 'Bb4']);
    expect(r?.threat).toEqual(['Bxc3+', 'bxc3']);
    expect(r?.text).toMatch(/c3/);
    voice(r!.text);
    const kept = heldResource(fen, 'Nf6', 'Nf6', 0);
    expect(kept?.text).toMatch(/^(Keeping|Bb4)/);
  });
  it('silent when the engine wants the check now, or the knight is already on c3', () => {
    expect(holdIdea(fen, 'b', 'Bb4+')).toBeNull();
    expect(holdIdea(fenOf('d4 Nf6 c4 e6 Nc3'), 'b', 'd5')).toBeNull();
  });
});

describe('the off-book method: which capture (captureChoice)', () => {
  // Black to move: …exd5 or …dxe5. Taking on d5 hands White d4 for a knight.
  const fen = 'rnbqkb1r/pp3ppp/3pp3/3PP3/8/2P2N2/PP3PPP/RNBQKB1R b KQkq - 0 1';
  it('right capture: the other one hands them d4 for a knight', () => {
    expect(new Chess(fen).moves()).toContain('exd5');
    const r = captureChoice(fen, 'dxe5', 'dxe5', 0);
    expect(r?.square).toBe('d4');
    expect(r?.bad).toEqual(['exd5', 'Qxd5']);
    expect(r?.playedBad).toBe(false);
    voice(r!.text);
  });
  it('the wrong capture, when it cost, names the right one', () => {
    const r = captureChoice(fen, 'exd5', 'dxe5', 120);
    expect(r?.playedBad).toBe(true);
    expect(r?.text).toMatch(/…dxe5 was the capture/);
    expect(captureChoiceIdea(fen, 'dxe5')?.text).toMatch(/take on e5/);
  });
  it('silent when the engine prefers the capture that hands the square over', () => {
    expect(captureChoice(fen, 'exd5', 'exd5', 0)).toBeNull();
  });
});

describe('the kick map (kickMap)', () => {
  // Nimzowitsch Defence: 3.dxe5 Nxe5 4.f4 — the capture drags the knight to e5.
  const fen = fenOf('e4 Nc6 d4 e5');
  const pv = ['d4e5', 'c6e5', 'f2f4'];
  it('take on e5 so their knight retakes there, then f4 chases it', () => {
    const r = kickLineRead(fen, pv);
    expect(r?.sans).toEqual(['dxe5', 'Nxe5', 'f4']);
    expect(r?.kick.landings.sort()).toEqual(['c6', 'g6']);
    expect(r?.text).toMatch(/c6 and g6/);
    voice(r!.text);
    expect(kickAfterRecapture(fen, 'dxe5', 'Nxe5', pv)?.text).toMatch(/knight.*e5.*f4/);
  });
  it('silent when the recapture is a different piece than the line', () => {
    expect(kickAfterRecapture(fen, 'dxe5', 'Qe7', pv)).toBeNull();
  });
  it('no kick on a piece a pawn cannot safely hit', () => {
    expect(kickOn(fenOf('e4 e5'), 'e5')).toBeNull();
  });
});

describe('the mirror-structure race: two pawns, one square (planRace)', () => {
  // A reversed-KID-style setup: White's e4 against Black's e6 — e5 is one push
  // for each, and the move is White's.
  const fen = fenOf('Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O');
  it('both want a pawn on e5; the move is yours, so e5 is yours', () => {
    const races = pawnSquareRaces(fen, 'w');
    expect(races.map((r) => r.square)).toContain('e5');
    const read = pawnSquareRaceRead(fen, 'w', 'e5');
    expect(read?.race.square).toBe('e5');
    expect(read?.text).toMatch(/e5 is yours/);
    voice(read!.text);
    expect(pawnSquareTaken(fen, 'e5', 0)?.text).toMatch(/can never come now/);
  });
  it('never on the first moves (1.e4 e5 is not a lesson)', () => {
    expect(pawnSquareRaces(fenOf('e4'), 'b')).toEqual([]);
  });
  it('silent when the engine does not play the push', () => {
    expect(pawnSquareRaceRead(fen, 'w', 'h3')).toBeNull();
  });
});

describe('the pattern that fails here (patternFails)', () => {
  // A real puzzle: the free-looking queen on g4 is a back-rank trap.
  const fen = '5rk1/p5pp/2ppp3/4p2R/4N1q1/5Q2/PPP3P1/1K6 w - - 3 22';
  const lines = [
    { moves: ['h5h3'], evaluation: 0, mate: null },
    { moves: ['f3g4', 'f8f1', 'g4d1', 'f1d1'], evaluation: -100000, mate: -2 },
  ];
  it('the grab runs into mate, started by the counter-check', () => {
    const r = patternFails(fen, lines);
    expect(r?.tempting).toBe('Qxg4');
    expect(r?.counter).toBe('Rf1+');
    expect(r?.loses).toMatch(/mate/);
    expect(r?.proof.line?.sans.slice(0, 2)).toEqual(['Qxg4', 'Rf1+']);
    voice(r!.text);
  });
  it('silent when the tempting line is not much worse than the best', () => {
    expect(patternFails(fen, [lines[0], { ...lines[1], evaluation: -50, mate: null }])).toBeNull();
  });
  it('silent when the student played it (the grade owns that)', () => {
    expect(patternFails(fen, lines, 'Qxg4')).toBeNull();
  });
});

describe('opening equivalence (openingEquivalence)', () => {
  it('the English with …Nf6 is a reversed Sicilian, a move up', () => {
    const r = openingEquivalence('c4 e5 Nc3 Nf6'.split(' '), 'w');
    expect(r?.kind).toBe('reversed');
    expect(r?.name).toMatch(/^Sicilian Defense/);
    expect(r?.moveUp).toBe('w');
    expect(r?.text).toMatch(/extra move/);
    voice(r!.text);
  });
  it('an Alekhine with c3 and …c5 thrown in', () => {
    const r = openingEquivalence('e4 c5 c3 Nf6 e5 Nd5'.split(' '), 'b');
    expect(r?.kind).toBe('inserted');
    expect(r?.name).toMatch(/^Alekhine Defense/);
    expect(r?.inserted).toEqual(['c3', 'c5']);
    expect(r?.proof.exact).toBe(true);
    voice(r!.text);
  });
  it('silent on a symmetric opening and on a board with its own name', () => {
    expect(openingEquivalence('e4 e5 Nf3 Nc6'.split(' '), 'w')).toBeNull();
    expect(openingEquivalence('d4 Nf6 c4 e6 Nc3 Bb4'.split(' '), 'b')).toBeNull();
  });
  it('flipFen mirrors ranks and swaps colours', () => {
    expect(flipFen(new Chess().fen()).split(' ').slice(0, 3).join(' ')).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq');
  });
});

describe('WIRED BOTH WAYS — every lane answers, and each surface carries the fact out', () => {
  it('every batch-1 lane is in the Learn door and the dual-role table', () => {
    for (const lane of ['openingEquivalence', 'tradeLedger', 'notYetPlayed', 'holdResource', 'captureChoice', 'kickMap', 'breakRace', 'patternFails'] as const) {
      expect(LEARN_LANES[lane]).toBeTruthy();
      expect(COMPUTER_ROLES[lane]).toBeTruthy();
    }
    for (const k of ['equivalence', 'capture-choice', 'kick', 'plan-race', 'timing'] as const) {
      expect(FACT_ROLE[k]).toBe('teach');
      expect(FACT_PROOF[k]).toBe('proven');
    }
  });

  it('LEARN: the student\'s move carries the lane out, with a real proof and a held row', () => {
    const hints = studentMoveTeaching({
      fenBefore: fenOf('c4 e5 Nc3'), san: 'Nf6', history: 'c4 e5 Nc3 Nf6'.split(' '), cpLoss: 0, bothCp: true,
      bestSan: 'Nf6', bestLine: undefined, reply: null, cpAfter: 0,
    });
    const ny = hints.find((h) => h.lane === 'notYetPlayed');
    expect(ny, hints.map((h) => h.lane).join(',')).toBeTruthy();
    expect(isProof(ny!.proof)).toBe(true);
    expect(ny!.evidence?.tag).toBe('neglected-development');

    const cc = studentMoveTeaching({
      fenBefore: 'rnbqkb1r/pp3ppp/3pp3/3PP3/8/2P2N2/PP3PPP/RNBQKB1R b KQkq - 0 1', san: 'dxe5', history: [], cpLoss: 0, bothCp: true,
      bestSan: 'dxe5', bestLine: undefined, reply: null, cpAfter: 0,
    }).find((h) => h.lane === 'captureChoice');
    expect(cc && isProof(cc.proof)).toBe(true);
    expect(cc!.arrows.length).toBeGreaterThan(0);

    const pf = studentMoveTeaching({
      fenBefore: '5rk1/p5pp/2ppp3/4p2R/4N1q1/5Q2/PPP3P1/1K6 w - - 3 22', san: 'Rh3', history: [], cpLoss: 0, bothCp: true,
      bestSan: 'Rh3', bestLine: undefined, reply: null, cpAfter: 0,
      topLines: [{ rank: 1, moves: ['h5h3'], evaluation: 0, mate: null }, { rank: 2, moves: ['f3g4', 'f8f1', 'g4d1', 'f1d1'], evaluation: -100000, mate: -2 }],
    }).find((h) => h.lane === 'patternFails');
    expect(pf?.evidence?.tag).toBe('calculation-depth');
  });

  it('LEARN: the trade ledger rides on their reply', () => {
    const hist = 'd4 d5 c4 e6 Nf3 Nf6 e3 Be7 Bd3 dxc4'.split(' ');
    const h = studentMoveTeaching({
      fenBefore: fenOf(hist.slice(0, -1).join(' ')), san: 'dxc4', history: hist, cpLoss: 0, bothCp: true,
      bestSan: 'dxc4', bestLine: undefined, reply: 'Bxc4', cpAfter: 0,
    }).find((x) => x.lane === 'tradeLedger');
    expect(h && isProof(h.proof)).toBe(true);
  });

  it('POSITION READS (chat, read-position, Why, live coach): the one producer carries them', () => {
    const fen = fenOf('c4 e5 Nc3');
    const clauses = depthClauses({
      fen, history: 'c4 e5 Nc3'.split(' '),
      topLines: [{ moves: ['g8f6'], evaluation: 0, mate: null }],
      studentColor: 'b', nameMove: false,
    });
    const t = clauses.find((c) => c.kind === 'timing');
    expect(t?.text, clauses.map((c) => c.kind).join(',')).toMatch(/e5/);
    expect(t?.proof && isProof(t.proof)).toBe(true);

    const eq = depthClauses({ fen: fenOf('c4 e5 Nc3 Nf6'), history: 'c4 e5 Nc3 Nf6'.split(' '), topLines: [], studentColor: 'b', nameMove: false });
    expect(eq.find((c) => c.kind === 'equivalence')?.text).toMatch(/Sicilian/);
  });

  it('REVIEW: the student\'s ply speaks the facet with its proof', () => {
    const before = fenOf('c4 e5 Nc3');
    const after = fenOf('c4 e5 Nc3 Nf6');
    const proofs = new Map();
    const facets = computeMoveFacets({
      seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore: before, fenAfter: after, san: 'Nf6', ply: 4,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 0, preMoveEval: 0, costCp: 0, classification: 'good', bestMoveSan: 'Nf6',
      prevCap: { square: null, capturedValue: 0 }, allSans: 'c4 e5 Nc3 Nf6'.split(' '),
      forcedRunStartPly: null, playedLineUci: [], bestLineUci: [], replyBestSan: null,
    }, undefined, undefined, undefined, undefined, undefined, proofs);
    const f = facets.find((x) => x.startsWith('[timing]') && /nothing hits/.test(x));
    expect(f, facets.join('\n')).toBeTruthy();
    expect(isProof(proofs.get(f))).toBe(true);
    expect(facets.some((x) => x.startsWith('[equivalence]'))).toBe(true);
  });
});
