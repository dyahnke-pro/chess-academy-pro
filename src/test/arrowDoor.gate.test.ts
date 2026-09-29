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
]);

/** Unmigrated files → how many constructors they may still hold. SHRINK ONLY. */
const CEILING: Record<string, number> = {
  'src/components/Openings/PlayableLinePlayer.tsx': 5,
  'src/services/miniGameEngine.ts': 4,
  'src/services/tacticVisuals.ts': 2,
  'src/services/boardUtils.ts': 2,
  'src/components/Openings/OpeningPlayMode.tsx': 2,
  'src/components/Openings/ModelGameViewer.tsx': 2,
  'src/components/Openings/MiddlegamePractice.tsx': 2,
  'src/components/Openings/MiddlegamePlanStudy.tsx': 2,
  'src/components/Openings/LessonPlayer.tsx': 2,
  'src/components/Openings/CommonMistakesSection.tsx': 2,
  'src/components/Coach/EndgameTablebaseTrainer.tsx': 2,
  'src/services/coachMoveExtractor.ts': 1,
  'src/services/boardAnnotationService.ts': 1,
  'src/hooks/useHintSystem.ts': 1,
  'src/components/Play/BlindfolTrainer.tsx': 1,
  'src/components/Openings/WalkthroughMode.tsx': 1,
  'src/components/Coach/MiddlegamePlanInline.tsx': 1,
  'src/components/Coach/CoachesLibraryPage.tsx': 1,
  'src/components/Coach/CoachSessionPage.tsx': 1,
  'src/components/Board/VoiceChatMic.tsx': 1,
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
