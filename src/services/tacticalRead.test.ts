import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeTacticalRead, summarizeVerdict, pickKeyTactic, appealScore, pickTempting, toStudentCp, namedTacticClause,
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
