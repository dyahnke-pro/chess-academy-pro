// TWO vocabularies, TWO questions. The gate exists because ONE list answered
// both in four places, and the difference was the most-taught square in the
// opening: `Ng5` in the Two Knights eyes f7 and the coach was STRUCTURALLY
// incapable of saying so.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import {
  CENTRAL_SQUARES, keyTargetSquares, kingZoneSquares, kingZoneAmong,
  kingZoneClause, standingHoles,
} from './keySquares';
import { describeMoveMerit } from './groundedAnswer';

const START = new Chess();

describe('Q1 stays exactly as it was', () => {
  it('is the eight squares worth occupying with a pawn — and has no f7', () => {
    expect([...CENTRAL_SQUARES].sort()).toEqual(['c4', 'c5', 'd4', 'd5', 'e4', 'e5', 'f4', 'f5']);
    // Adding f7 here would produce "stakes out the centre with the pawn to f7".
    expect(CENTRAL_SQUARES).not.toContain('f7');
    expect(CENTRAL_SQUARES).not.toContain('f2');
  });
});

describe('Q2 is computed from the board, not decreed', () => {
  it('includes f7 for White at the start — because it is beside the black king', () => {
    expect(keyTargetSquares(START, 'white')).toContain('f7');
    expect(kingZoneSquares(START, 'white')).toContain('f7');
  });

  it('includes f2 for Black, mirrored', () => {
    expect(keyTargetSquares(START, 'black')).toContain('f2');
  });

  it('MOVES with the king — that is the whole reason it is computed', () => {
    // A first draft of this test asserted f7 LEAVES the zone once Black castles.
    // That is false chess: f7 is adjacent to g8 as well as to e8 — which is
    // exactly why Bxf7+ still exists against a castled king. What actually
    // changes is that h7 and g7 JOIN, and the queenside squares LEAVE. A
    // hardcoded ['f7','f2'] can do neither, which is why there isn't one.
    const castled = new Chess('rnbq1rk1/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQ - 6 5');
    const zone = kingZoneSquares(castled, 'white');
    expect(zone).toContain('h7');
    expect(zone).toContain('g7');
    expect(zone).not.toContain('d7'); // was in the zone with the king on e8
    expect(kingZoneSquares(new Chess(), 'white')).not.toContain('h7');
  });

  it('never includes the enemy king\'s OWN square — that is check, a better lane', () => {
    expect(kingZoneSquares(START, 'white')).not.toContain('e8');
  });

  it('scopes the standing holes by SEAT — d3 is White\'s own hole, not a target', () => {
    expect(standingHoles('white')).toEqual(['d6', 'e6']);
    expect(standingHoles('black')).toEqual(['d3', 'e3']);
    expect(keyTargetSquares(START, 'white')).not.toContain('d3');
    expect(keyTargetSquares(START, 'black')).not.toContain('d6');
  });
});

describe('the clause separates king pressure from central influence', () => {
  it('names only the king-zone squares, never the central ones', () => {
    const near = kingZoneAmong(['e4', 'e6', 'f7'], START, 'white');
    expect(near).toEqual(['f7']);
    expect(kingZoneClause(near)).toBe(' — f7 sits right beside their king');
  });

  it('is empty when nothing touches the king — no clause, no filler', () => {
    expect(kingZoneClause(kingZoneAmong(['d4', 'e5'], START, 'white'))).toBe('');
  });

  it('agrees in number', () => {
    expect(kingZoneClause(['f7', 'h7'])).toMatch(/f7 and h7 sit right beside/);
  });
});

describe('the real case — read the output, not the unit', () => {
  it('Ng5 in the Two Knights finally names f7', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 5 4';
    const out = describeMoveMerit(fen, 'Ng5', 'white', null);
    expect(out).toBeTruthy();
    expect(out!).toContain('f7');
    expect(out!).toContain('beside their king');
  });

  it('and does NOT claim to eye a square its own pawn sits on', () => {
    // Ng5 attacks e4, where White's own pawn stands. That is DEFENCE.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 5 4';
    expect(describeMoveMerit(fen, 'Ng5', 'white', null)!).not.toContain('e4');
  });

  it('a quiet developer with no king contact gains NO king clause', () => {
    const out = describeMoveMerit(new Chess().fen(), 'Nf3', 'white', null);
    expect(out!).not.toContain('beside their king');
  });
});

const SRC = join(process.cwd(), 'src');
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe('no fifth private copy', () => {
  it('nothing re-declares the central-squares literal', () => {
    // Four files carried their own: groundedAnswer (×2), moveFundamentals,
    // reviewMoveTeaching. A fifth would rot the same way.
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      // `src/data` is narration PROSE — a beat naming six squares in one
      // sentence is not a constant. A first cut flagged one, which is the same
      // over-broad-detector bug as blaming a comment for a prompt.
      if (f.endsWith('keySquares.ts') || f.includes('/data/')) continue;
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*')) return;
        // EXACTLY the eight — a deliberately different set (a 4-square core, a
        // 16-square extended centre) is not a copy of this one and must not be
        // dragged into it.
        const all = new Set(line.match(/'[a-h][1-8]'/g) ?? []);
        // Exactly these eight and nothing else. `mistakeNarration`'s 16-square
        // EXTENDED_CENTER contains all eight and is a genuinely different
        // vocabulary for a different question — counting only ranks 4-5 flagged
        // it, which is the detector being loose, not the code being wrong.
        const isTheEight = all.size === 8
          && ['c4', 'c5', 'd4', 'd5', 'e4', 'e5', 'f4', 'f5'].every((sq) => all.has(`'${sq}'`));
        if (isTheEight) offenders.push(`${f.replace(process.cwd() + '/', '')}:${i + 1}`);
      });
    }
    expect(offenders, `import from keySquares.ts instead:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });
});
