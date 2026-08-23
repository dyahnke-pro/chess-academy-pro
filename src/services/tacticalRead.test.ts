import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeTacticalRead, summarizeVerdict, pickKeyTactic, appealScore, pickTempting, toStudentCp, narrateTacticalRead, temptingFromAnalysis, tacticalReadFromLines, speakTemptingTurn, tacticalReadFacts, voiceRejectsBestMove, lineOutcomeClause, voiceNamesUngroundedMove, groundedMoveKeys, namedTacticClause, temptingTurnClause, uncertaintyClause,
  type TacticalRead,
} from './tacticalRead';
import type { PvEngine, PvPly } from './pvPlayback';
import type { StockfishAnalysis } from '../types';

// ── pure assemblers ─────────────────────────────────────────────────────────

describe('toStudentCp', () => {
  it('flips sign for black', () => {
    expect(toStudentCp(300, 'white')).toBe(300);
    expect(toStudentCp(300, 'black')).toBe(-300);
  });
});

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
});

describe('appealScore', () => {
  it('ranks a capture-with-check above a quiet developing move', () => {
    const cap = appealScore({ san: 'Nxe3+', isCapture: true, isPromotion: false, piece: 'n', to: 'e3' });
    const dev = appealScore({ san: 'Be2', isCapture: false, isPromotion: false, piece: 'b', to: 'e2' });
    expect(cap.score).toBeGreaterThan(dev.score);
    expect(cap.appeal).toBe('capture');
  });
  it('flags a promotion as high appeal', () => {
    expect(appealScore({ san: 'e8=Q', isCapture: false, isPromotion: true, piece: 'p', to: 'e8' }).appeal).toBe('promotion');
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
      facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
    }];
    const key = pickKeyTactic(line);
    expect(key?.type).toBe('fork');
    expect(key?.description.toLowerCase()).toContain('fork');
    expect(key?.squares).toEqual(expect.arrayContaining(['e3']));
  });
});

// ── engine-injected integration ─────────────────────────────────────────────

/** Stub engine: replays a known SAN line as the PV for the root, echoes a flat
 *  eval for every other query (the terminal verify pass). No real search. */
function stubEngine(rootFen: string, sanLine: string[], whiteCp: number): PvEngine {
  const g = new Chess(rootFen);
  const uci = sanLine.map((s) => { const m = g.move(s); return m.lan; });
  return {
    async analyzePosition(fen: string): Promise<StockfishAnalysis> {
      const isRoot = fen.split(' ').slice(0, 2).join(' ') === rootFen.split(' ').slice(0, 2).join(' ');
      return {
        bestMove: uci[0] ?? '', evaluation: whiteCp, isMate: false, mateIn: null, depth: 18,
        topLines: isRoot ? [{ rank: 1, evaluation: whiteCp, moves: uci, mate: null }] : [{ rank: 1, evaluation: whiteCp, moves: [], mate: null }],
        nodesPerSecond: 0,
      };
    },
  };
}

describe('computeTacticalRead (engine-injected)', () => {
  it('reads the fork position: best move, verdict, named tactic, check plies', async () => {
    const fen = '1r2qb1k/3b2pn/3p1r2/ppp1nP1p/4P2P/P1P1BNQ1/1PBN3K/3R2R1 b - - 2 27';
    const read = await computeTacticalRead(fen, {
      engine: stubEngine(fen, ['Ng4+', 'Kh1', 'Nxe3', 'Rc1', 'Bc6', 'Bb1'], -445),
      findTempting: false,
    }) as TacticalRead;
    expect(read).not.toBeNull();
    expect(read.studentColor).toBe('black');
    expect(read.bestMoveSan).toBe('Ng4+');
    expect(read.verdict.kind).toBe('winning');
    expect(read.verdict.studentCp).toBeGreaterThan(300);       // black is winning
    expect(read.checkPlies).toContain(0);                       // Ng4+ is check
    expect(read.keyTactic?.type).toBe('fork');
    expect(read.keyTactic?.description.toLowerCase()).toContain('fork');
  });
});

describe('namedTacticClause', () => {
  it('names the pieces the fork hits, lowercased for mid-sentence use', () => {
    const fenAfter = '1r2qb1k/3b2p1/3p1r2/ppp1nP1p/4P2P/P1P1nNQ1/1PBN3K/3R2R1 w - - 0 29';
    const clause = namedTacticClause([{
      san: 'Nxe3', uci: 'g4e3', moverColor: 'black', fenBefore: '', fenAfter,
      facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
    }]);
    expect(clause).toMatch(/^The point — knight on e3 forks/);
    expect(clause).toContain('d1');
    expect(clause).toContain('c2');
  });
  it('returns null when the line lands no named tactic', () => {
    expect(namedTacticClause([{
      san: 'Be2', uci: 'f1e2', moverColor: 'white', fenBefore: '', fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPBPPP/RNBQK1NR b KQkq - 0 1',
      facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
    }])).toBeNull();
  });
});

describe('narrateTacticalRead (the computed voice)', () => {
  const forkPly: PvPly = {
    san: 'Nxe3', uci: 'g4e3', moverColor: 'black', fenBefore: '',
    fenAfter: '1r2qb1k/3b2p1/3p1r2/ppp1nP1p/4P2P/P1P1nNQ1/1PBN3K/3R2R1 w - - 0 29',
    facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
  };
  const base = {
    fen: 'x', studentColor: 'black' as const, bestMoveSan: 'Ng4+', bestMoveUci: 'e5g4',
    line: [
      { san: 'Ng4+', uci: 'e5g4', moverColor: 'black' as const, fenBefore: '', fenAfter: '', facts: { captured: null, isCheck: true, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: 'g4', shieldLost: 0 } },
      { san: 'Kh1', uci: 'g1h1', moverColor: 'white' as const, fenBefore: '', fenAfter: '', facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
      forkPly,
    ],
    verdict: summarizeVerdict(439, null),
    keyTactic: pickKeyTactic([forkPly]),
    checkPlies: [0], closeAlternative: null,
  };

  it('speaks the affirm→but→refute turn when a tempting move exists', () => {
    const out = narrateTacticalRead({
      ...base,
      tempting: { san: 'Nxf3+', uci: 'e5f3', appeal: 'capture', evalDropCp: 616, refutation: [
        { san: 'Nxf3+', uci: 'e5f3', moverColor: 'black', fenBefore: '', fenAfter: '', facts: { captured: 'knight', isCheck: true, isMate: false, promotion: null, tacticLanded: null, materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
        { san: 'Nxf3', uci: 'd2f3', moverColor: 'white', fenBefore: '', fenAfter: '', facts: { captured: 'knight', isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
      ] },
    });
    expect(out).toContain('Nxf3+');           // the tempting move is named
    expect(out.toLowerCase()).toContain('but'); // the turn fires
    expect(out).toContain('Instead, Ng4+');    // pivots to the real move
    expect(out.toLowerCase()).toContain('fork'); // names the point
    expect(out.toLowerCase()).toContain('up a piece'); // verdict last
  });

  it('leads with the move when there is no tempting alternative', () => {
    const out = narrateTacticalRead({ ...base, tempting: null });
    expect(out).toMatch(/^The move is Ng4\+/);
    expect(out.toLowerCase()).not.toContain('but');
  });

  it('spells moves for TTS when spoken:true', () => {
    const out = narrateTacticalRead({ ...base, tempting: null }, { spoken: true });
    expect(out).toContain('the knight');       // "Ng4+" → "the knight to g4"
    expect(out).not.toContain('Ng4');
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
  it('speakTemptingTurn phrases the affirm→but→refute turn', () => {
    const line = speakTemptingTurn({ san: 'Nxf3+', appeal: 'capture', replySan: 'Nxf3' });
    expect(line.toLowerCase()).toContain('but');
    expect(line).toContain('Nxf3');
  });
});

describe('tacticalReadFacts (facts for the voice model, not prose)', () => {
  const forkPly: PvPly = {
    san: 'Nxe3', uci: 'g4e3', moverColor: 'black', fenBefore: '',
    fenAfter: '1r2qb1k/3b2p1/3p1r2/ppp1nP1p/4P2P/P1P1nNQ1/1PBN3K/3R2R1 w - - 0 29',
    facts: { captured: 'bishop', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
  };
  it('states the tempting move, the line, the named tactic and the verdict as facts', () => {
    const line: PvPly[] = [
      { san: 'Ng4+', uci: 'e5g4', moverColor: 'black', fenBefore: '', fenAfter: '', facts: { captured: null, isCheck: true, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: 'g4', shieldLost: 0 } },
      { san: 'Kh1', uci: 'g1h1', moverColor: 'white', fenBefore: '', fenAfter: '', facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
      forkPly,
    ];
    const facts = tacticalReadFacts({
      fen: 'x', studentColor: 'black', bestMoveSan: 'Ng4+', bestMoveUci: 'e5g4',
      line,
      verdict: summarizeVerdict(439, null),
      keyTactic: pickKeyTactic(line),
      checkPlies: [0], closeAlternative: null,
      tempting: { san: 'Nxf3+', uci: 'e5f3', appeal: 'capture', evalDropCp: 616, refutation: [
        { san: 'Nxf3+', uci: 'e5f3', moverColor: 'black', fenBefore: '', fenAfter: '', facts: { captured: 'knight', isCheck: true, isMate: false, promotion: null, tacticLanded: null, materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
        { san: 'Nxf3', uci: 'd2f3', moverColor: 'white', fenBefore: '', fenAfter: '', facts: { captured: 'knight', isCheck: false, isMate: false, promotion: null, tacticLanded: null, materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
      ] },
    });
    expect(facts).toContain('Nxf3+');            // tempting move stated
    expect(facts).toContain('fails to Nxf3');    // refutation stated
    expect(facts).toContain('Ng4+ Kh1 Nxe3');    // the line stated
    expect(facts.toLowerCase()).toContain('fork'); // named tactic
    expect(facts).toContain('up a piece');       // verdict
    // it is FACTS, not the frozen template prose
    expect(facts).not.toContain('You’d love to');
  });
});

describe('voiceRejectsBestMove (recommendation guard)', () => {
  it('trips when the model argues against the best move', () => {
    expect(voiceRejectsBestMove('Verdict: avoid the flashy Be2; solidify instead.', 'Be2')).toBe(true);
    expect(voiceRejectsBestMove('The fork here is an illusion in practice; the stronger idea is to keep pressure.', 'Be2')).toBe(true);
    expect(voiceRejectsBestMove('Be2 is a mistake here.', 'Be2')).toBe(true);
  });
  it('passes a faithful read that endorses the best move', () => {
    expect(voiceRejectsBestMove('Instead, Be2 is the quiet venom, forking f3 and d1. You stand clearly better.', 'Be2')).toBe(false);
    expect(voiceRejectsBestMove('Qd4+ forks the rook and king; you win a piece.', 'Qd4+')).toBe(false);
  });
  it('is a no-op without a best move', () => {
    expect(voiceRejectsBestMove('anything at all', null)).toBe(false);
  });
});

describe('lineOutcomeClause (review outcome)', () => {
  it('names a decisive terminus from the student seat', () => {
    expect(lineOutcomeClause(-445, 'black')).toContain('up a piece');
    expect(lineOutcomeClause(500, 'white')).toContain('winning material advantage');
  });
  it('stays silent on a level or unclear terminus (no false claim)', () => {
    expect(lineOutcomeClause(30, 'white')).toBeNull();
    expect(lineOutcomeClause(-600, 'white')).toBeNull();
  });
});

describe('voiceNamesUngroundedMove (move-hallucination guard)', () => {
  const read = {
    fen: 'x', studentColor: 'black' as const, bestMoveSan: 'Ng4+', bestMoveUci: 'e5g4',
    line: [
      { san: 'Ng4+', uci: 'e5g4', moverColor: 'black' as const, fenBefore: '', fenAfter: '', facts: { captured: null, isCheck: true, isMate: false, promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
      { san: 'Nxe3', uci: 'g4e3', moverColor: 'black' as const, fenBefore: '', fenAfter: '', facts: { captured: 'b', isCheck: false, isMate: false, promotion: null, tacticLanded: 'fork', materialGained: 3, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 } },
    ],
    verdict: summarizeVerdict(439, null), keyTactic: null, checkPlies: [0], tempting: null, closeAlternative: null,
  };
  it('flags a fabricated move the line never makes', () => {
    expect(voiceNamesUngroundedMove('Instead, knight to g4, then the queen swings to a5.', read as never)).toBe(true);
  });
  it('flags a piece-mismatch on a real destination', () => {
    expect(voiceNamesUngroundedMove('The bishop takes e3, forking.', read as never)).toBe(true); // line is a KNIGHT to e3
  });
  it('passes a faithful transcription of the line', () => {
    expect(voiceNamesUngroundedMove('Knight to g4 with check, then knight takes e3.', read as never)).toBe(false);
  });
  it('does not false-positive on a spatial description (no move verb)', () => {
    expect(voiceNamesUngroundedMove('The bishop eyes f7 and the king sits on g8.', read as never)).toBe(false);
  });
  it('groundedMoveKeys lists the line destinations by piece', () => {
    const keys = groundedMoveKeys(read as never);
    expect(keys.has('knight:g4')).toBe(true);
    expect(keys.has('knight:e3')).toBe(true);
    expect(keys.has('bishop:e3')).toBe(false);
  });
});

describe('pickKeyTactic mate_threat downgrade (false-claim audit)', () => {
  it('rewords "has a checkmate available" to "threatens mate" (a threat is not a forced mate)', () => {
    // Real position where detectTactics reports a mate_threat (deterministic — no engine).
    const fenAfter = '4rr1k/pQp3pp/7q/6b1/6n1/2N3P1/PPP2P1P/3R1RK1 w - - 3 18';
    const ply: PvPly = {
      san: 'Qh6', uci: 'd6h6', moverColor: 'black', fenBefore: '', fenAfter,
      facts: { captured: null, isCheck: false, isMate: false, promotion: null, tacticLanded: 'mate_threat', materialGained: 0, newOpenFiles: [], newPassedPawns: [], outpostGained: null, shieldLost: 0 },
    };
    const key = pickKeyTactic([ply]);
    expect(key?.type).toBe('mate_threat');
    expect(key?.description.toLowerCase()).not.toContain('has a checkmate available');
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

describe('tacticalReadFacts inGame register', () => {
  it('phrases the but-turn second-person present-tense (never "the student")', () => {
    const read = tacticalReadFromLines(
      'rnbqkb1r/ppp1pppp/5n2/3p4/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1',
      [{ moves: ['g1f3', 'b8c6'], evaluation: 20 }, { moves: ['d1d5', 'f6d5'], evaluation: -600 }],
      'white', { requireForcing: true, dropThresholdCp: 150 },
    );
    const facts = tacticalReadFacts(read, { inGame: true });
    expect(facts).toMatch(/You'd love to play Qxd5/);
    expect(facts).toContain('Nxd5');
    expect(facts.toLowerCase()).not.toContain('the student');
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
    expect(c).toMatch(/but Qa4 and it falls apart/);
  });

  it('builds the honest hedge naming the close alternative', () => {
    const c = uncertaintyClause(read)!;
    expect(c).toContain('Bc4');
    expect(c.toLowerCase()).toMatch(/close|about as good/);
  });

  it('returns null when there is no tempting move / no close alternative', () => {
    const clear = { ...read, tempting: null, closeAlternative: null } as unknown as TacticalRead;
    expect(temptingTurnClause(clear)).toBeNull();
    expect(uncertaintyClause(clear)).toBeNull();
  });
});
