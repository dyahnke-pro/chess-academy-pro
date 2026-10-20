// PROD AUDIT 2026-10-20 (David's record): "Ignore this and the game is gone —
// your queen on d5 is attacked… The Modern is a position built around a
// fianchettoed bishop on the long diagonal." Three defects in one line:
//   · the road was named "the Modern" — no position a student can look up;
//   · one road's aim was compared against nothing (the student's road had none);
//   · the beat's first sentence was cut as a repeat and its second spoke alone.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { openingStoryAt } from './openingStory';
import { setOpeningIdentity } from './openingIdentity';
import { variationLabel } from './openingRoads';
import { buildVoicePackage } from './voicePackage';
import type { MovesAt } from './mastersPlanRead';
import type { LocalDbMove } from './masterPlayLookup';

type IdentityMap = Parameters<typeof setOpeningIdentity>[0];
const REAL = JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')) as NonNullable<IdentityMap>;
const SCAN = ['e4', 'd5', 'exd5'];
const forkFen = (() => { const c = new Chess(); for (const s of SCAN) c.move(s); return c.fen(); })();
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
// The masters' split at the Scandinavian crossroads, as the explorer gives it.
const movesAt: MovesAt = (fen) => key(fen) === key(forkFen)
  ? [{ san: 'Qxd5', games: 6000 } as LocalDbMove, { san: 'Nf6', games: 4000 } as LocalDbMove]
  : null;
const choice = (): string | undefined => openingStoryAt({ history: [...SCAN, 'Qxd5'], student: 'b', namesStudentMoves: false, movesAt })
  .find((f) => f.beat === 'branch-choice')?.text;
const FIANCHETTO = [{ kind: 'fianchetto' }] as unknown as NonNullable<IdentityMap>[string]['aims'];
const LOCKED = [{ kind: 'locked-centre', advanced: 'w', squares: ['e5', 'e6'] }] as unknown as NonNullable<IdentityMap>[string]['aims'];

function withAims(mine: typeof FIANCHETTO, theirs: typeof FIANCHETTO): void {
  // Every Scandinavian name: the Modern Variation (…Nf6) is their road, the rest
  // (…Qxd5) the student's.
  const map = { ...REAL };
  for (const n of Object.keys(map)) if (n.startsWith('Scandinavian Defense')) map[n] = { ...map[n], aims: /Modern Variation/.test(n) ? theirs : mine };
  setOpeningIdentity(map);
}

describe('the road names a position a student can look up', () => {
  it('keeps "Variation" in the name', () => {
    expect(variationLabel('Scandinavian Defense: Modern Variation')).toBe('Modern Variation');
    expect(variationLabel('Sicilian Defense: Najdorf Variation')).toBe('Najdorf Variation');
  });
});

describe('the aims line compares two roads or says nothing', () => {
  afterAll(() => setOpeningIdentity(REAL));
  it('one road with an aim and the other without: no aims sentence', () => {
    withAims([] as unknown as typeof FIANCHETTO, FIANCHETTO);
    expect(choice() ?? '').not.toMatch(/built around/);
  });
  it('both roads with an aim: both are said, the alternative by its full name', () => {
    withAims(LOCKED, FIANCHETTO);
    expect(choice()).toMatch(/The Modern Variation is a position built around a fianchettoed bishop on the long diagonal; yours is built around a locked centre\./);
  });
});

describe('a story beat speaks whole or not at all', () => {
  beforeAll(() => setOpeningIdentity(REAL));
  const FEN = new Chess().fen();
  const first = 'You chose a sharp road here.';
  const second = 'The other road builds slowly.';
  it('a whole beat whose first sentence was already said is dropped, not halved', () => {
    const pkg = buildVoicePackage([{ kind: 'computed', text: `${first} ${second}`, fen: FEN, whole: true }], first);
    expect(pkg.kept).toHaveLength(0);
    expect(pkg.dropped[0]?.reason).toBe('part already said');
  });
  it('NEGATIVE CONTROL: a plain fact still keeps its fresh sentence', () => {
    const pkg = buildVoicePackage([{ kind: 'computed', text: `${first} ${second}`, fen: FEN }], first);
    expect(pkg.kept[0]?.text).toBe(second);
  });
});
