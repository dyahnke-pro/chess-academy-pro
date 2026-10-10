/**
 * ONE TRAPPED-PIECE COMPUTER (census 2026-10-10). The whole-board detector and
 * the missed-tactic service each kept their own "trapped" rules beside
 * `trappedPiece.trappedAt`; the missed-tactic copy never asked whether another
 * move saved the piece and called a defended escape a trap. Every function
 * that decides "trapped" now goes through trappedAt (directly, or through a
 * function that does); one with its own rule fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = 'src/services/trappedPiece.ts';
const THROUGH = /trappedAt\(|trappedOnBoard\(|isPieceTrapped\(|detectTactics\(/;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('one trapped-piece computer', () => {
  it('every trapped detector decides through trappedAt', () => {
    const offenders: string[] = [];
    for (const f of walk('src', [])) {
      if (f === HOME) continue;
      const src = readFileSync(f, 'utf8');
      const re = /function\s+(\w*[Tt]rapped\w*)\s*\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const body = src.slice(src.indexOf('{\n', m.index), src.indexOf('\n}\n', m.index));
        // A function's own name inside its body is a recursive call, not a delegate.
        const others = body.replace(new RegExp(`\\b${m[1]}\\(`, 'g'), '');
        if (!THROUGH.test(others)) offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
