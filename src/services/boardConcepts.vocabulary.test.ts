// The corpus-vocabulary tags are BOARD-PROVABLE, and they reach the corpus.
//
// The 2026-08-05 vocabulary exists because the board-reader and the corpus did
// not share a word: 115,267 middlegame/endgame concept tags, 4.5% reachable.
// Each tag added is provable from the board (judgement tags — prophylaxis,
// initiative — are deliberately NOT emitted). This pins every new tag to a
// position that trips it and a near-miss that must not, and holds the
// reachability floor so a vocabulary drift or corpus re-farm fails loudly.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { boardConcepts } from './boardConcepts';

const tags = (fen: string): Set<string> => new Set(boardConcepts(fen)?.concepts ?? []);

describe('corpus-vocabulary tags are board-provable', () => {
  it('pawn-structure: an isolated central pawn tags; the untouched start does not', () => {
    // Classic IQP shape — White's d-pawn with no c- or e-pawn beside it.
    expect(tags('r1bqkb1r/pp2pppp/2n2n2/8/3P4/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 6').has('pawn-structure')).toBe(true);
    expect(tags(new Chess().fen()).has('pawn-structure')).toBe(false);
  });

  it('knight-outpost: defended and unchallengeable yes; a c-pawn that can still hit it, no', () => {
    // Nd5 defended by e4; Black has NO c- or e-pawn left to ever challenge.
    const outpost = 'r1bqk2r/pp3ppp/3p1n2/3N4/4P3/8/PPP2PPP/R1BQK2R w KQkq - 0 10';
    // Same board plus a black c7-pawn — ...c6 evicts the knight someday.
    const challengeable = 'r1bqk2r/ppp2ppp/3p1n2/3N4/4P3/8/PPP2PPP/R1BQK2R w KQkq - 0 10';
    expect(tags(outpost).has('knight-outpost')).toBe(true);
    expect(tags(challengeable).has('knight-outpost')).toBe(false);
  });

  it('tactics: a real knight fork tags; the detector, not a second heuristic', () => {
    // Nc7+ forking king e8 and rook a8.
    expect(tags('r3k3/2N5/8/8/8/8/8/4K2R w K - 0 1').has('tactics')).toBe(true);
    expect(tags(new Chess().fen()).has('tactics')).toBe(false);
  });

  it('piece-activity: a rook on the seventh tags; rooks at home do not', () => {
    expect(tags('1q3rk1/1R3ppp/8/8/8/8/1PP2PPP/1Q4K1 w - - 0 20').has('piece-activity')).toBe(true);
    expect(tags(new Chess().fen()).has('piece-activity')).toBe(false);
  });

  it('pawn-storm: two advanced pawns at a flank king, middlegame only', () => {
    expect(tags('1q3rk1/5ppp/8/6PP/8/8/1PP2P2/1Q3RK1 w - - 0 20').has('pawn-storm')).toBe(true);
    // Queens off → endgame → the storm is a different conversation.
    expect(tags('5rk1/5ppp/8/6PP/8/8/1PP2P2/5RK1 w - - 0 30').has('pawn-storm')).toBe(false);
  });

  it('king-safety: a stripped shield with enemy heavies on tags; a covered king does not', () => {
    expect(tags('1q3rk1/1pp2ppp/8/8/8/8/1PP5/1Q3RK1 w - - 0 20').has('king-safety')).toBe(true);
    expect(tags('1q3rk1/1pp2ppp/8/8/8/8/1PP2PPP/1Q3RK1 w - - 0 20').has('king-safety')).toBe(false);
  });
});

describe('the vocabulary reaches the corpus', () => {
  it('holds the reachability floor across all four corpora', () => {
    // Measured 2026-08-05: 15,761 of 34,101 mg/eg notes (46.2%) carry at least
    // one emitted tag — up from 4.5% before the vocabulary work. The floor is
    // set under the measurement so a re-farm can breathe; dropping below it
    // means the corpus and the board-reader stopped sharing words again.
    const VOCAB = new Set([
      'rook-endgame', 'pawn-endgame', 'king-activity', 'passed-pawn', 'bishop-pair',
      'pawn-structure', 'knight-outpost', 'pawn-storm', 'king-safety', 'piece-activity', 'tactics',
    ]);
    const files = [
      'src/data/danya-teachings.json',
      'src/data/chessbrah-teachings.json',
      'public/data/hangingpawns-teachings.json',
      'public/data/saintlouis-teachings.json',
    ];
    let total = 0;
    let reachable = 0;
    for (const f of files) {
      // The two farmed corpora are fetched assets; a checkout without them
      // (fresh partial clone) measures what it has rather than failing on IO.
      if (!existsSync(f)) continue;
      const data = JSON.parse(readFileSync(f, 'utf8')) as {
        notes: Array<{ phase: string; concepts?: string[] }>;
      };
      for (const n of data.notes) {
        if (n.phase !== 'middlegame' && n.phase !== 'endgame') continue;
        total += 1;
        if ((n.concepts ?? []).some((c) => VOCAB.has(c))) reachable += 1;
      }
    }
    expect(total).toBeGreaterThan(30_000);
    expect(reachable, `${reachable}/${total} mg/eg notes reachable — the vocabulary drifted`).toBeGreaterThanOrEqual(15_000);
    console.log(`[reachability] ${reachable}/${total} mg/eg notes (${((reachable / total) * 100).toFixed(1)}%) reachable via the emitted vocabulary`);
  });
});
