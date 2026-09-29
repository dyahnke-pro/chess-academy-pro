// THE ARROW DOOR IS THE ONLY PLACE AN ARROW IS BUILT (David 2026-09-29: "Can
// we reduce to one source for arrows?").
//
// A board arrow is `{ startSquare, endSquare, color }`. Before the door, ~90
// places built one, each with its own idea of what makes an arrow drawable —
// and the weakest let a green f3→d3 onto a board where the queen on c4 took it.
// Producers now hand CLAIMS to `admitArrows`; only `arrowDoor.ts` writes the
// object. This gate scans every source file for the literal that builds one.
//
// Files not yet migrated carry a CEILING that only shrinks: a file may lose
// constructors, never gain them, and an entry that reaches zero must be deleted
// (so the list cannot quietly keep a finished file). A NEW file building an
// arrow fails outright.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';

/** Not arrow PRODUCERS: the board primitives translate an admitted arrow into
 *  the renderer's shape, and the door is the door. Kid mode is not a coach
 *  surface (its boards draw no coach arrows). */
const EXEMPT = new Set([
  'src/services/arrowDoor.ts',
  'src/components/Board/ChessBoard.tsx',
  'src/components/Board/ControlledChessBoard.tsx',
  'src/components/Chessboard/ConsistentChessboard.tsx',
  'src/components/Kid/GuidedGamePage.tsx',
  // A DECODER, not a producer: turns `[BOARD: arrow:…]` text back into objects.
  // Every marker it reads is door output (chat candidates) or is sent through
  // the door straight after parsing (in-game chat).
  'src/services/boardAnnotationService.ts',
  // Kid mode only (Kid/MiniGamePage) — not a coach surface.
  'src/services/miniGameEngine.ts',
]);

/** Unmigrated files → how many constructors they may still hold. SHRINK ONLY. */
const CEILING: Record<string, number> = {
  // EMPTY (2026-09-29): every coach surface draws through the door. A new
  // producer must hand claims to `admitArrows`; this list is not a way around it.
};

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name) && !p.includes('/types/') && !p.includes('/test/')) out.push(p);
  }
  return out;
}

/** Constructors, with comments stripped so prose about arrows never counts. */
function constructors(src: string): number {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  // `startSquare:` and the shorthand `{ startSquare, … }` both build one.
  return (code.match(/\bstartSquare\s*:|\{\s*startSquare\s*[,}]/g) ?? []).length;
}

describe('only the arrow door builds an arrow', () => {
  const counts = new Map<string, number>();
  for (const f of walk(ROOT, [])) {
    if (EXEMPT.has(f)) continue;
    const n = constructors(readFileSync(f, 'utf8'));
    if (n > 0) counts.set(f, n);
  }

  it('no file outside the door builds more arrows than its ceiling', () => {
    const over = [...counts].filter(([f, n]) => n > (CEILING[f] ?? 0)).map(([f, n]) => `${f}: ${n} (ceiling ${CEILING[f] ?? 0}) — hand a claim to admitArrows instead`);
    expect(over).toEqual([]);
  });

  it('a migrated file leaves the list (the ceiling never holds a finished file)', () => {
    const stale = Object.entries(CEILING).filter(([f, n]) => (counts.get(f) ?? 0) < n).map(([f, n]) => `${f}: ${counts.get(f) ?? 0} now, ceiling ${n} — lower or delete the entry`);
    expect(stale).toEqual([]);
  });

  it('NEGATIVE CONTROL: the scanner sees a constructor', () => {
    expect(constructors("const a = { startSquare: 'e2', endSquare: 'e4', color: 'x' };")).toBe(1);
    expect(constructors('return [{ startSquare, endSquare, color }];')).toBe(1);
    expect(constructors('// { startSquare: 1 }\n/* startSquare: */')).toBe(0);
  });
});
