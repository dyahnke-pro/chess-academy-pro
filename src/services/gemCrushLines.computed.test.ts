import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { ClubGem } from './clubGems';

// GEMS ARE TAUGHT ON THE OPENING PAGES — AND IN REVIEW, NEVER IN LEARN (David
// 2026-10-29: "it's not good to teach them in learn because that's free and I
// want a reason for ppl to buy the openings" → "Remove"; 2026-11-04, of the
// known mistakes and traps: "it needs to be in review for sure"; Learn is not
// decided). The opening tab's Play rung reads the hand-written gems, then the
// club gems the calculator found on the same board — a known mistake is never
// called a trap. Review reads the club gem index through ONE door: the board
// registry's `knownSlip` (services/knownSlips.ts), called from Review's facet
// builder alone. Learn with Coach (its chat trap menu included) and chat
// teach none of them, and the coach never walks into one.
const board = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen().split(' ').slice(0, 4).join(' '); };

// Real calculator output (2016-01..04), on boards no hand-written gem holds:
// the Scotch's 6.Nxc6?? Qxf2# (a trap) and the Budapest's 4.Ne5? (a known
// mistake, +2.7). The Englund's 6.Bc3 is hand-written, and the hand-written
// gem wins its board.
const SCOTCH = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 c3 Qf6';
const ENGLUND = 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2';
const BUDAPEST = 'd4 Nf6 c4 e5 Nf3 e4';
const boards: Record<string, ClubGem[]> = {
  [board(SCOTCH)]: [{ tier: 'trap', line: SCOTCH, slip: 'Nxc6', by: 'white', best: 'Be3', games: 59, share: 7.2, moverScore: 3, punish: 'Qxf2#', mate: true, won: 0, endCp: 100000, juice: 13.59 }],
  [board(ENGLUND)]: [{ tier: 'trap', line: ENGLUND, slip: 'Bc3', by: 'white', best: 'Nc3', games: 115, share: 33, moverScore: 20, punish: 'Bb4 Bd2 Qxa1 c3 Bc5 Qc2 Ba3 Kd1', mate: false, won: 5, endCp: 480, juice: 2.7 }],
  [board(BUDAPEST)]: [{ tier: 'known', line: BUDAPEST, slip: 'Ne5', by: 'white', best: 'Nfd2', games: 22, share: 33.8, moverScore: 20, punish: 'd6 Nxf7 Kxf7 Nc3 Be7 h3', mate: false, won: 2, endCp: 267, juice: 1 }],
};
vi.mock('./clubGems', async (orig) => ({ ...(await orig<typeof import('./clubGems')>()), clubGemBoards: () => Promise.resolve(boards) }));

const lines = await import('./gemCrushLines');
const fenAt = (sans: string): string => new Chess(`${board(sans)} 0 1`).fen();

async function warmed(): Promise<void> {
  lines.warmCalculatorGems();
  await vi.waitFor(() => {
    expect(lines.findLivePunishment(null, [...SCOTCH.split(' '), 'Nxc6'])).not.toBeNull();
  }, { timeout: 10000 });
}

describe('the opening\'s Play rung reads the hand-written gems and the calculator\'s', () => {
  beforeEach(() => { lines.__resetCalculatorGems(); });

  it('a calculator trap is found by its board, under any opening', async () => {
    await warmed();
    const live = lines.findLivePunishment('scotch-game', [...SCOTCH.split(' '), 'Nxc6']);
    expect(live).toMatchObject({ inaccuracy: 'Nxc6', punish: 'Qxf2#' });
    expect(live?.callout).toMatch(/^That's a known trap at club level\./);
  });

  it('a hand-written gem wins its board: the calculator\'s copy of the same slip is never read', async () => {
    await warmed();
    expect(lines.findLivePunishment(null, [...ENGLUND.split(' '), 'Bc3'])?.gemId.startsWith('englund-gambit:')).toBe(true);
  });

  it('a calculator known mistake is called out, never as a trap', async () => {
    await warmed();
    const live = lines.findLivePunishment('budapest-gambit', [...BUDAPEST.split(' '), 'Ne5']);
    expect(live?.callout).toMatch(/^That's a known mistake at club level\./);
  });

  it('the strength signal reads the hand-written gems alone', async () => {
    await warmed();
    lines.warmGemIndexes();
    await new Promise((r) => setTimeout(r, 1500));
    expect(lines.gemMoveSignal(fenAt(SCOTCH), 'Nxc6')).toBeNull();
  });
});

/** Production source under `src`, comments stripped, by repo path. */
async function productionSources(): Promise<Map<string, string>> {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(n) || /\.test\.(ts|tsx)$/.test(n)) continue;
      const code = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      out.set(p.replace(/\\/g, '/').replace(/^.*?\/src\//, 'src/'), code);
    }
  };
  walk(join(process.cwd(), 'src'));
  return out;
}

describe('gems: the Play rung callout stays on the opening pages; the coach reads the index through one door (gate)', () => {
  it('the live punish callout is called only from an opening screen', async () => {
    const callers = [...(await productionSources())].filter(([p, c]) => p !== 'src/services/gemCrushLines.ts' && /findLivePunishment\(/.test(c)).map(([p]) => p);
    // Non-vacuous: the Play rung still calls it.
    expect(callers).toContain('src/components/Openings/OpeningPlayMode.tsx');
    expect(callers.filter((p) => !p.startsWith('src/components/Openings/'))).toEqual([]);
  });

  it('only the opening screens and the strength signal import the gem lines', async () => {
    const importers = [...(await productionSources())].filter(([, c]) => /from '[./]*(?:services\/)?gemCrushLines'/.test(c)).map(([p]) => p);
    expect(importers).toContain('src/components/Openings/OpeningPlayMode.tsx');
    expect(importers.filter((p) => !p.startsWith('src/components/Openings/') && p !== 'src/services/gameStrength.ts')).toEqual([]);
  });

  // REPLACED 2026-11-12 (David: "You can have coach state those lines and
  // tactics … Let's not hold anything back"): gems are no longer kept off
  // Learn, the lessons and chat. What still holds is ONE DOOR — the
  // registry's knownSlip / trapAhead / slipsOnLine rows read the club index.
  it('every surface reads the club gem index through one door: the registry rows', async () => {
    const src = await productionSources();
    // Only Review's files (and the registry row itself) import the door; the
    // test harness (src/test/) reads the index off disk the way Review does.
    const importers = [...src].filter(([p, c]) => !p.startsWith('src/test/') && /from '[./]*(?:services\/)?knownSlips'/.test(c)).map(([p]) => p);
    expect(importers).toEqual(expect.arrayContaining(['src/services/reviewFullData.ts', 'src/services/coachFeatureService.ts', 'src/services/boardComputers.ts']));
    const REVIEW_FILES = ['src/services/reviewFullData.ts', 'src/services/coachFeatureService.ts', 'src/components/Coach/CoachGameReview.tsx'];
    // The index is read only where the registry rows are called.
    expect(importers.filter((p) => !REVIEW_FILES.includes(p) && p !== 'src/services/boardComputers.ts' && p !== 'src/services/moveThoughtFacts.ts')).toEqual([]);
    const callers = [...src].filter(([, c]) => /readBoard(?:All)?\('(?:knownSlip|trapAhead|slipsOnLine)'/.test(c)).map(([p]) => p).sort();
    expect(callers).toEqual(['src/components/Coach/CoachTeachPage.tsx', 'src/services/moveThoughtFacts.ts', 'src/services/reviewFullData.ts']);
    // Every coach surface that teaches a move is wired.
    const { BOARD_COMPUTERS } = await import('./boardComputers');
    for (const row of [BOARD_COMPUTERS.knownSlip, BOARD_COMPUTERS.trapAhead, BOARD_COMPUTERS.slipsOnLine]) {
      expect(row.surfaces.review).toEqual({ wired: 'services/reviewFullData.ts' });
      for (const s of ['lesson', 'learn', 'chat'] as const) expect('wired' in row.surfaces[s]).toBe(true);
    }
  });
});
