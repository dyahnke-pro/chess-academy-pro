import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { summarizeVerdict, pickKeyTactic, appealScore, pickTempting, toStudentCp, temptingFromAnalysis, tacticalReadFromLines, namedTacticClause, temptingTurnClause, uncertaintyClause, candidateCompareRead, type TacticalRead } from './tacticalRead';
import type { PvPly } from './pvPlayback';

/** The candidate-compare sentence, as the live surfaces read it. */
const candidateCompareClause = (
  fen: string,
  topLines: ReadonlyArray<{ moves: string[]; evaluation: number }>,
  studentColor: 'white' | 'black',
  opts: { spoken?: boolean; recaptureOn?: string | null } = {},
): string | null => candidateCompareRead(fen, topLines, studentColor, { ...opts, namesMoves: true })?.text ?? null;

// ── pure assemblers ─────────────────────────────────────────────────────────

describe('toStudentCp', () => {
  it('flips sign for black', () => {
    expect(toStudentCp(300, 'white')).toBe(300);
    expect(toStudentCp(300, 'black')).toBe(-300);
  });
});

// Real end boards for the material the verdict may name.
const PIECE_UP_B = { pawns: 3, fen: '4k3/8/8/3n4/8/8/8/4K3 w - - 0 1', side: 'b' as const };
const mat = (fen: string, pawns: number, side: 'w' | 'b' = 'w') => ({ pawns, fen, side });

describe('summarizeVerdict', () => {
  it('names a forced mate in words', () => {
    const v = summarizeVerdict(100000, 3);
    expect(v.kind).toBe('mate'); expect(v.mateIn).toBe(3);
    expect(v.text).toBe('a forced mate in three');
  });
  it('frames a won piece as winning', () => {
    expect(summarizeVerdict(445, null).kind).toBe('winning');
  });
  it('calls a dead-level position balanced', () => {
    expect(summarizeVerdict(10, null).kind).toBe('equal');
  });
  it('does NOT claim material from a positional edge — even material stays magnitude-only (B#3/G3)', () => {
    // +2.8 eval but the board shows even material: never "up a piece".
    const v = summarizeVerdict(280, null, mat('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 0));
    expect(v.kind).toBe('winning');
    expect(v.text).toBe('clearly better'); // +2.8 is clearly on the one ladder (evalBand)
    expect(v.text).not.toMatch(/piece|pawn|exchange|rook|queen/);
  });
  it('claims material ONLY when the board backs the count', () => {
    expect(summarizeVerdict(280, null, mat('4k3/8/8/8/8/8/8/3NK3 w - - 0 1', 3)).text).toBe('clearly better — up a piece');
    expect(summarizeVerdict(280, null, mat('3bk3/8/8/8/8/8/8/R3K3 w - - 0 1', 2)).text).toBe('clearly better — up the exchange');
    expect(summarizeVerdict(180, null, mat('4k3/8/8/8/8/8/P7/4K3 w - - 0 1', 1)).text).toBe('clearly better — up a pawn');
    expect(summarizeVerdict(600, null, mat('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 5)).text).toBe('a winning material advantage');
  });
  it('names a piece from the BOARD, never from the point count', () => {
    // The exchange and a pawn is 3 points — not "a piece".
    expect(summarizeVerdict(280, null, mat('3bk3/8/8/8/8/8/P7/R3K3 w - - 0 1', 3)).text).toBe('clearly better — up the exchange and a pawn');
    // Two knights for a pawn is 5 points — not "a rook".
    expect(summarizeVerdict(400, null, mat('4k3/7p/8/8/8/8/8/1N1NK3 w - - 0 1', 5)).text).toBe('a winning material advantage'); // +4.0 is winning and the board backs 5 points
  });
  it('a bare eval (no line/material) never invents material', () => {
    // The eval-only path (e.g. lineOutcomeClause) frames by magnitude only.
    expect(summarizeVerdict(600, null).text).toBe('a winning advantage');
    expect(summarizeVerdict(280, null).text).toBe('clearly better');
    expect(summarizeVerdict(180, null).text).toBe('clearly better');
  });
});

describe('appealScore', () => {
  it('ranks a capture-with-check above a quiet developing move', () => {
    const cap = appealScore({ san: 'Nxe3+', isCapture: true, isPromotion: false, piece: 'n', to: 'e3', from: 'd5' });
    const dev = appealScore({ san: 'Be2', isCapture: false, isPromotion: false, piece: 'b', to: 'e2', from: 'f1' });
    expect(cap.score).toBeGreaterThan(dev.score);
    expect(cap.appeal).toBe('capture');
  });
  it('flags a promotion as high appeal', () => {
    // "develop" only from home (walk 2065, 12…h6: Bf7-c4 was no development).
    expect(appealScore({ san: 'Bc4', isCapture: false, isPromotion: false, piece: 'b', to: 'c4', from: 'f7' }).appeal).not.toBe('central-develop');
    expect(appealScore({ san: 'Bc4', isCapture: false, isPromotion: false, piece: 'b', to: 'c4', from: 'f1' }).appeal).toBe('central-develop');
    expect(appealScore({ san: 'e8=Q', isCapture: false, isPromotion: true, piece: 'p', to: 'e8', from: 'e7' }).appeal).toBe('promotion');
  });
});

describe('pickTempting', () => {
  it('picks the eye-catching move that is clearly worse than best', () => {
    const t = pickTempting([
      { san: 'Qxb2', uci: 'd4b2', appeal: 'capture', appealScore: 5, studentCp: -50 }, // grabs a pawn, drops 350
      { san: 'Rd8', uci: 'a8d8', appeal: 'natural', appealScore: 1, studentCp: 280 },   // near-best, not tempting-wrong
    ], 300, 120);
    expect(t?.san).toBe('Qxb2');
    expect(t?.evalDropCp).toBe(350);
  });
  it('a capture that is worse than a mate but still wins big has not "fallen apart"', () => {
    // Naroditsky's 25.Rxb6 (hand walk 2026-09-24): a queen for a rook, ~+4,
    // while the engine had a forced mate. Not a warning.
    expect(pickTempting([{ san: 'Rxb6', uci: 'a6b6', appeal: 'capture', appealScore: 5, studentCp: 420 }], 10000, 120)).toBeNull();
    // NEGATIVE CONTROL: the same drop into a level position IS the warning.
    expect(pickTempting([{ san: 'Rxb6', uci: 'a6b6', appeal: 'capture', appealScore: 5, studentCp: 20 }], 10000, 120)?.san).toBe('Rxb6');
  });
  it('returns null when nothing eye-catching is inferior', () => {
    expect(pickTempting([{ san: 'Nf3', uci: 'g1f3', appeal: 'central-develop', appealScore: 2, studentCp: 300 }], 300, 120)).toBeNull();
  });
});

describe('pickKeyTactic', () => {
  it('names the pieces the landed fork hits (merged from the static scanner)', () => {
    // position after ...Nxe3: black knight on e3 forks Rd1 and Bc2
    const fenAfter = '1r2qb1k/3b2p1/3p1r2/ppp1nP1p/4P2P/P1P1nNQ1/1PBN3K/3R2R1 w - - 0 29';
    const line: PvPly[] = [{
      san: 'Nxe3', uci: 'g4e3', moverColor: 'black',
      fenBefore: '', fenAfter,
      facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, gaveBack: null, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
    }];
    const key = pickKeyTactic(line);
    expect(key?.type).toBe('fork');
    expect(key?.description.toLowerCase()).toContain('fork');
    expect(key?.squares).toEqual(expect.arrayContaining(['e3']));
  });
});

// ── engine-injected integration ─────────────────────────────────────────────

describe('namedTacticClause', () => {
  it('names the pieces the fork hits, lowercased for mid-sentence use', () => {
    const fenAfter = '1r2qb1k/3b2p1/3p1r2/ppp1nP1p/4P2P/P1P1nNQ1/1PBN3K/3R2R1 w - - 0 29';
    const clause = namedTacticClause([{
      san: 'Nxe3', uci: 'g4e3', moverColor: 'black', fenBefore: '', fenAfter,
      facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, gaveBack: null, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
    }]);
    expect(clause).toMatch(/^The point — knight on e3 forks/);
    expect(clause).toContain('d1');
    expect(clause).toContain('c2');
  });
  it('returns null when the line lands no named tactic', () => {
    expect(namedTacticClause([{
      san: 'Be2', uci: 'f1e2', moverColor: 'white', fenBefore: '', fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPBPPP/RNBQK1NR b KQkq - 0 1',
      facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, gaveBack: null, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
    }])).toBeNull();
  });
});


describe('temptingFromAnalysis (latency-safe, cached MultiPV)', () => {
  // Black to move; e5-knight. best = Ng4+ (e5g4). A cheaper top line grabs on
  // f3 (e5f3) — eye-catching capture-with-check but clearly worse.
  const fen = '1r2qb1k/3b2pn/3p1r2/ppp1nP1p/4P2P/P1P1BNQ1/1PBN3K/3R2R1 b - - 2 27';
  it('surfaces the eye-catching top line that is clearly worse than best', () => {
    const t = temptingFromAnalysis(fen, [
      { moves: ['e5g4', 'g1h1', 'g4e3'], evaluation: -445 }, // best: black +4.45
      { moves: ['e5f3', 'd2f3'], evaluation: 180 },          // tempting: black now worse (white +1.8)
    ], 'black');
    expect(t?.san).toBe('Nxf3+');
    expect(t?.appeal).toBe('capture');
    expect(t?.replySan).toBe('Nxf3');
    expect(t?.evalDropCp).toBeGreaterThan(300);
  });
  it('returns null when the second line is nearly as good (nothing to warn against)', () => {
    expect(temptingFromAnalysis(fen, [
      { moves: ['e5g4'], evaluation: -445 },
      { moves: ['d7c6'], evaluation: -430 },
    ], 'black')).toBeNull();
  });
});





describe('pickKeyTactic mate_threat downgrade (false-claim audit)', () => {
  it('rewords "has a checkmate available" to "threatens mate" (a threat is not a forced mate)', () => {
    // Real position where detectTactics reports a mate_threat (deterministic — no engine).
    // Black (side NOT to move) threatens Ra1#, and it is UNSTOPPABLE: White's only
    // legal moves are c3/c4, neither of which prevents the mate (verified with
    // chess.js). This is the shape detectTactics still emits after the 2026-09-12
    // C#3 gate (parryable not-to-move "mates" are no longer reported).
    const fenAfter = 'r5r1/8/8/2k5/8/7p/2P4P/7K w - - 0 1';
    const ply: PvPly = {
      san: 'Rga8', uci: 'g8a8', moverColor: 'black', fenBefore: '', fenAfter,
      facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: 'mate_threat', materialGained: 0, gaveBack: null, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
    };
    const key = pickKeyTactic([ply]);
    expect(key?.type).toBe('mate_threat');
    expect(key?.description.toLowerCase()).not.toContain('has mate in one');
    expect(key?.description.toLowerCase()).toContain('threatens mate');
  });
});

// ── tacticalReadFromLines (latency-safe assembler, NO engine) ────────────────
describe('tacticalReadFromLines', () => {
  const START = new Chess().fen();

  it('replays the PV into the read: best move, line, verdict — no engine', () => {
    const read = tacticalReadFromLines(
      START,
      [{ moves: ['e2e4', 'e7e5', 'g1f3'], evaluation: 30 }],
      'white',
    );
    expect(read).not.toBeNull();
    expect(read?.bestMoveSan).toBe('e4');
    expect(read?.line.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(read?.verdict.kind).toBe('equal');
    expect(read?.tempting).toBeNull();          // one line only — nothing to warn against
    expect(read?.closeAlternative).toBeNull();  // no runner-up given
  });

  it('flags a near-equal runner-up as the uncertainty signal', () => {
    const read = tacticalReadFromLines(
      START,
      [
        { moves: ['e2e4', 'e7e5'], evaluation: 40 },
        { moves: ['d2d4', 'd7d5'], evaluation: 20 },  // 20cp behind — within 40
      ],
      'white',
    );
    expect(read?.closeAlternative).toEqual({ san: 'd4', gapCp: 20 });
  });

  it('finds the tempting capture + its refutation (requireForcing keeps it)', () => {
    // White queen can grab the d5 pawn but it hangs to Nf6xd5.
    const fen = 'rnbqkb1r/ppp1pppp/5n2/3p4/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1';
    const read = tacticalReadFromLines(
      fen,
      [
        { moves: ['g1f3', 'b8c6'], evaluation: 20 },       // best — quiet
        { moves: ['d1d5', 'f6d5'], evaluation: -600 },     // Qxd5?? Nxd5
      ],
      'white',
      { requireForcing: true, dropThresholdCp: 150 },
    );
    expect(read?.bestMoveSan).toBe('Nf3');
    expect(read?.tempting?.san).toBe('Qxd5');
    expect(read?.tempting?.refutation[1]?.san).toBe('Nxd5');
  });

  it('requireForcing DROPS a non-forcing (central-develop) tempting move', () => {
    const lines = [
      { moves: ['e2e4', 'e7e5'], evaluation: 30 },
      { moves: ['b1c3', 'e7e5'], evaluation: -200 },  // Nc3 — central, worse, but quiet
    ];
    const forced = tacticalReadFromLines(START, lines, 'white', { requireForcing: true });
    expect(forced?.tempting).toBeNull();            // quiet move filtered out
    const open = tacticalReadFromLines(START, lines, 'white', { requireForcing: false });
    expect(open?.tempting?.san).toBe('Nc3');        // flagged when forcing not required
  });

  it('returns null when there is nothing to read', () => {
    expect(tacticalReadFromLines(START, [], 'white')).toBeNull();
    expect(tacticalReadFromLines(START, [{ moves: [], evaluation: 0 }], 'white')).toBeNull();
  });
});


describe('temptingTurnClause + uncertaintyClause (DNA register — David 2026-08-23)', () => {
  const read = {
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    studentColor: 'white',
    bestMoveSan: 'Nf3', bestMoveUci: 'g1f3',
    line: [], checkPlies: [], keyTactic: null,
    verdict: { kind: 'edge', mateIn: null, studentCp: 60, text: 'a pleasant edge' },
    tempting: {
      san: 'Nxe5', uci: 'f3e5', appeal: 'capture', evalDropCp: 220,
      refutation: [{ san: 'd6' }, { san: 'Qa4' }],
    },
    closeAlternative: { san: 'Bc4', gapCp: 20 },
  } as unknown as TacticalRead;

  it('builds the but-turn: affirm the tempting move, then refute it', () => {
    const c = temptingTurnClause(read)!;
    expect(c).toContain('Nxe5');
    expect(c).toMatch(/but they answer Qa4 and it falls apart/);
  });

  it('builds the honest hedge naming the close alternative', () => {
    const c = uncertaintyClause(read, { namesMoves: true })!;
    expect(c).toContain('Bc4');
    expect(c.toLowerCase()).toMatch(/close|about as good/);
  });

  it('returns null when there is no tempting move / no close alternative', () => {
    const clear = { ...read, tempting: null, closeAlternative: null } as unknown as TacticalRead;
    expect(temptingTurnClause(clear)).toBeNull();
    expect(uncertaintyClause(clear, { namesMoves: true })).toBeNull();
  });
});

describe('candidateCompareClause (his "X, not Y, because…", 2026-08-23)', () => {
  it('prefers the safer square when the same piece can go two ways', async () => {
    // Black queen d8 can go to c7 (safe) or b6 (attacked by a white piece).
    // Craft: white bishop on a5 attacks b6; nothing attacks c7. Best=Qc7 by 60cp.
    // Black queen d8; white knight c4 attacks b6 but NOT c7. So Qc7 is the safe
    // square, Qb6 walks into the knight. Best=Qc7 by 60cp.
    const fen = '3qk3/8/8/8/2N5/8/8/4K3 b - - 0 1';
    const clause = candidateCompareClause(fen, [
      { moves: ['d8c7'], evaluation: 20 },   // white-POV; black-POV = -20
      { moves: ['d8b6'], evaluation: 80 },   // black-POV = -80 → 60cp worse for Black
    ], 'black');
    expect(clause).toMatch(/Prefer Qc7 to Qb6/);
    expect(clause).toMatch(/safer|less exposed/);
  });
  it('returns null when the gap is a blunder-sized drop (that is the but-turn, not a compare)', async () => {
    const fen2 = '3qk3/8/8/8/2N5/8/8/4K3 b - - 0 1';
    expect(candidateCompareClause(fen2, [
      { moves: ['d8c7'], evaluation: 20 },
      { moves: ['d8b6'], evaluation: 300 },  // 280cp worse → but-turn territory
    ], 'black')).toBeNull();
  });
  it('two different plans with no board-read reason → SILENT, never "keeps more of the edge" (Learn walk 2026-09-23)', async () => {
    // 1.e4 c6 2.Nf3 d5 3.e5 Bg4 4.Be2 e6 — White to move; two quiet plans 60cp apart.
    const fen = 'rn1qkbnr/pp3ppp/2p1p3/3pP3/6b1/5N2/PPPPBPPP/RNBQK2R w KQkq - 0 5';
    expect(candidateCompareClause(fen, [
      { moves: ['e1g1'], evaluation: 40 },
      { moves: ['c2c3'], evaluation: -20 },
    ], 'white')).toBeNull();
  });
  it('returns null with a single line', async () => {
    expect(candidateCompareClause('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [{ moves: ['e2e4'], evaluation: 20 }], 'white')).toBeNull();
  });
});

// ─── GRAMMAR: A CLAUSE MUST NEVER LAND IN A NOUN SLOT ────────────────────────
// Read off a real 5-ply prod run, three times in it:
//
//     "It's genuinely close — the queen takes d5 is about as good."
//
// `sayMoveClause` renders a capture with a FINITE VERB, which is right after
// "but …" and wrong everywhere else. A QUIET move hid the fault — "the knight
// to d5 is about as good" is fine — so the defect only surfaces when the move
// happens to be a capture, which is exactly when the sentence matters most.
//
// This gate feeds a CAPTURE into every clause that puts a move in a subject or
// object-of-preposition slot, because a quiet move cannot fail it.
describe('a spoken move never reads as a clause where a noun belongs', () => {
  // Its OWN fixture — the fixture above is scoped to its describe, and reaching
  // for it would couple this gate to an unrelated test's shape.
  const quietPly = (san: string, mover: 'white' | 'black'): PvPly => ({
    san, uci: 'e5g4', moverColor: mover, fenBefore: '', fenAfter: '',
    facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, gaveBack: null, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
  });
  const base = {
    fen: 'x', studentColor: 'black' as const, bestMoveSan: 'Ng4+', bestMoveUci: 'e5g4',
    line: [quietPly('Ng4+', 'black'), quietPly('Kh1', 'white')],
    verdict: summarizeVerdict(439, null, PIECE_UP_B),
    keyTactic: null, checkPlies: [0], closeAlternative: null, tempting: null,
  };

  // "<piece> takes <square>" immediately followed by a verb/preposition that
  // needs a NOUN in front of it. Matching the SHAPE, not a fixed sentence, so a
  // new stem in the same slot is caught without being listed here.
  const CLAUSE_IN_NOUN_SLOT = /\b(?:pawn|knight|bishop|rook|queen|king) takes [a-h][1-8](?:\s+(?:is|reads|over|and it)\b)/;

  it('the close-call hedge takes a noun phrase, not a clause', () => {
    const out = uncertaintyClause(
      { ...base, tempting: null, closeAlternative: { san: 'Qxd5', gapCp: 20 } } as TacticalRead,
      { spoken: true, namesMoves: true },
    );
    expect(out, 'the hedge did not render').toBeTruthy();
    expect(out).not.toMatch(CLAUSE_IN_NOUN_SLOT);
    // The positive form: a gerund can be the subject of "is about as good".
    expect(out).toContain('taking on d5');
  });

  it('a quiet runner-up still reads correctly (the case that HID the bug)', () => {
    const out = uncertaintyClause(
      { ...base, tempting: null, closeAlternative: { san: 'Nd5', gapCp: 20 } } as TacticalRead,
      { spoken: true, namesMoves: true },
    );
    expect(out).toContain('the knight to d5');
    expect(out).not.toMatch(CLAUSE_IN_NOUN_SLOT);
  });

});

describe('uncertaintyClause rotates its stem on a stable key (WO-STANDARD-01 D-8, 2026-09-22)', () => {
  // "It's genuinely close — X is about as good, so don't agonise" fired four
  // times in seven moves on prod. The caller passes the ply; the same ply
  // always gets the same stem — never Math.random.
  const read = {
    fen: '8/8/8/8/8/8/8/8 w - - 0 1', studentColor: 'white', bestMoveSan: 'Nf3', bestMoveUci: 'g1f3',
    line: [], checkPlies: [], keyTactic: null, tempting: null,
    verdict: { kind: 'edge', mateIn: null, studentCp: 60, text: 'a pleasant edge' },
    closeAlternative: { san: 'Bc4', gapCp: 20 },
  } as unknown as TacticalRead;
  it('four consecutive plies get four different sentences, all naming the alternative', () => {
    const out = [0, 1, 2, 3].map((rotation) => uncertaintyClause(read, { rotation, namesMoves: true })!);
    expect(new Set(out).size).toBe(4);
    for (const s of out) expect(s).toContain('Bc4');
    // A sentence-initial spelled move is capitalised in the spoken register.
    expect(uncertaintyClause(read, { rotation: 1, spoken: true, namesMoves: true })).toMatch(/^The bishop to c4 is a fine alternative/);
  });
  it('is keyed, not rolled: the same ply repeats its stem, rotation 4 wraps to 0, no rotation means stem 0', () => {
    expect(uncertaintyClause(read, { rotation: 2, namesMoves: true })).toBe(uncertaintyClause(read, { rotation: 2, namesMoves: true }));
    expect(uncertaintyClause(read, { rotation: 4, namesMoves: true })).toBe(uncertaintyClause(read, { rotation: 0, namesMoves: true }));
    expect(uncertaintyClause(read, { namesMoves: true })).toBe(uncertaintyClause(read, { rotation: 0, namesMoves: true }));
  });
});

describe('a recapture is not "the forcing move first" (hand walk 2026-09-24)', () => {
  // 1.e4 e5 2.Nf3 d6 3.d4 exd4 — White to move; Nxd4 takes back, Bd3 is quiet.
  const fen = 'rnbqkbnr/ppp2ppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4';
  const lines = [
    { moves: ['f3d4'], evaluation: 40 },
    { moves: ['f1d3'], evaluation: -30 },
  ];
  it('stays silent when the best move just takes back on the square they captured on', () => {
    expect(candidateCompareClause(fen, lines, 'white', { spoken: true, recaptureOn: 'd4' })).toBeNull();
  });
  it('NEGATIVE CONTROL: the same pair still compares when it is not a recapture', () => {
    expect(candidateCompareClause(fen, lines, 'white', { spoken: true, recaptureOn: null })).not.toBeNull();
  });
});

describe('the hedge never reassures in a lost position (g9 walk 2026-09-27)', () => {
  it('two moves within 40cp of each other, both losing, carry no closeAlternative', async () => {
    const { tacticalReadFromLines } = await import('./tacticalRead');
    const fen = '2Qk1b1r/1p3ppp/p4q2/1B3n2/1P3B2/1P6/4NPPP/3QK2R b K - 0 26';
    const lost = tacticalReadFromLines(fen, [
      { moves: ['d8c8'], evaluation: 99_000 }, { moves: ['d8e7'], evaluation: 98_980 },
    ], 'black');
    expect(lost?.closeAlternative ?? null).toBeNull();
  });
});


describe('Learn holds the two moves of a close call (prod walk 2026-10-19)', () => {
  it('the held hedge says the choice is close and names neither move', () => {
    const read = { fen: '2kr3r/pp3ppp/2n1pn2/q4b2/2BP4/2N2N2/PPPB1PPP/R2QK2R b KQ - 3 9', bestMoveSan: 'e6', closeAlternative: { san: 'Bg6', gapCp: 12 }, tempting: null } as unknown as TacticalRead;
    for (const rotation of [0, 1, 2]) {
      const out = uncertaintyClause(read, { spoken: true, rotation, namesMoves: false })!;
      expect(out).toBeTruthy();
      expect(out).not.toMatch(/e6|g6|pawn|bishop/);
    }
  });
});

