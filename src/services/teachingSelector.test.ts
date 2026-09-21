import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { selectTeaching, renderThesis, pliesFromSans, summarizeTeaching, MAX_MOMENTS, type SelectorPly } from './teachingSelector';
import { buildTurningPointQuestion } from './reviewTurningPoint';

function pliesFrom(sans: readonly string[], evals?: readonly (number | null)[]): SelectorPly[] {
  const c = new Chess();
  const out: SelectorPly[] = [];
  let before = c.fen();
  let evalBefore: number | null = 0;
  sans.forEach((san, i) => {
    const mv = c.move(san);
    if (!mv) throw new Error(`illegal ${san}`);
    const evalAfter = evals ? (evals[i] ?? null) : undefined;
    out.push({
      ply: i + 1, san, fenBefore: before, fenAfter: c.fen(),
      playerColor: mv.color === 'w' ? 'white' : 'black',
      ...(evals ? { evalBefore, evalAfter } : {}),
    });
    before = c.fen();
    if (evals) evalBefore = evalAfter ?? evalBefore;
  });
  return out;
}

// The Scandinavian Lasker — the line the prod gameplay audit uses: …Bg4 (ply 10)
// pins the knight on f3 to the queen. No evals: only landed tactics can be moments.
const LASKER = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bg4'];

// A quiet game with an authored eval record (white-POV, after each ply): two
// real swings that COST their mover — ply 8 (Black, +30 → +240) and ply 13
// (White, +230 → −10) — and one blowout-to-blowout swing that must NOT count
// (ply 19: +900 → +650, both endpoints decided for White).
const GAME = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Nb8', 'd4', 'Nbd7', 'Nbd2', 'Bb7'];
const EVALS: (number | null)[] = [20, 20, 25, 25, 30, 30, 30, 240, 235, 235, 230, 230, -10, -10, -5, -5, 0, 900, 650, 650, 640, 640];

describe('teachingSelector — the ONE game-level read (unified-coach N1)', () => {
  it('a taught line with no evals: the thesis is the LANDED tactic, the moment is on the thread', () => {
    const pkg = selectTeaching({ plies: pliesFrom(LASKER), studentColor: 'black', kind: 'line' });
    expect(pkg.thesis.kind).toBe('landed');
    expect(pkg.thesis.ply).toBe(10);
    expect(pkg.thesis.tactic).toBe('pin');
    expect(pkg.moments.map((m) => m.ply)).toContain(10);
    expect(pkg.onThread.has(10)).toBe(true);
    expect(renderThesis(pkg.thesis, 'present')).toMatch(/Bg4.*pin/);
    expect(renderThesis(pkg.thesis, 'retrospective')).toMatch(/Bg4.*pin/);
  });

  it('a finished game with an eval record: moments are the review card\'s own candidates, biggest first, ≤ MAX_MOMENTS', () => {
    const plies = pliesFrom(GAME, EVALS);
    const pkg = selectTeaching({ plies, studentColor: 'white', rating: 1500, kind: 'game' });
    expect(pkg.thesis.kind).toBe('turned');
    expect(pkg.moments.length).toBeLessThanOrEqual(MAX_MOMENTS);
    // Same candidates the review card asks about — computed once, shared.
    const q = buildTurningPointQuestion(plies.map((p) => ({ ...p, moveNumber: Math.ceil(p.ply / 2), evalBefore: p.evalBefore ?? null, evalAfter: p.evalAfter ?? null, classification: null })), 1500);
    expect(q).not.toBeNull();
    expect(pkg.thesis.ply).toBe(q!.answer.ply);
    // The +900 → +650 blowout never "turned" (contested gate).
    expect(pkg.moments.map((m) => m.ply)).not.toContain(19);
    expect(pkg.moments.map((m) => m.ply)).toEqual(expect.arrayContaining([8, 13]));
    expect(renderThesis(pkg.thesis, 'retrospective')).toMatch(/^The game turned at .* points/);
  });

  it('is SURFACE-BLIND — the same input yields a deep-equal package whichever surface asks (invariant 1)', () => {
    const plies = pliesFrom(GAME, EVALS);
    const a = selectTeaching({ plies, studentColor: 'white', kind: 'game', surface: 'review' });
    const b = selectTeaching({ plies, studentColor: 'white', kind: 'game', surface: 'teach' });
    const c = selectTeaching({ plies, studentColor: 'white', kind: 'game', surface: 'phase-narration' });
    expect({ ...a, onThread: [...a.onThread] }).toEqual({ ...b, onThread: [...b.onThread] });
    expect({ ...a, onThread: [...a.onThread] }).toEqual({ ...c, onThread: [...c.onThread] });
  });

  it('a quiet taught line with no tactic and no evals: thesis is the structure→plan or honest silence', () => {
    const pkg = selectTeaching({ plies: pliesFrom(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']), studentColor: 'white', kind: 'line' });
    expect(['plan', 'none']).toContain(pkg.thesis.kind);
    if (pkg.thesis.kind === 'none') expect(renderThesis(pkg.thesis, 'present')).toBe('');
    expect(pkg.moments).toEqual([]);
  });

  it('a live game so far behaves like a game — the moments so far, nothing invented past the last ply', () => {
    const plies = pliesFrom(GAME.slice(0, 12), EVALS.slice(0, 12));
    const pkg = selectTeaching({ plies, studentColor: 'white', kind: 'live' });
    for (const m of pkg.moments) expect(m.ply).toBeLessThanOrEqual(12);
    for (const ply of pkg.onThread) expect(ply).toBeLessThanOrEqual(12);
  });

  it('empty input → the empty package, never a throw', () => {
    const pkg = selectTeaching({ plies: [], studentColor: 'white', kind: 'game' });
    expect(pkg.thesis.kind).toBe('none');
    expect(pkg.moments).toEqual([]);
    expect(pkg.chain).toBeNull();
  });
});

describe('helpers', () => {
  it('pliesFromSans replays a history and truncates at the first illegal SAN instead of throwing', () => {
    expect(pliesFromSans(['e4', 'e5', 'Nf3']).map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(pliesFromSans(['e4', 'Qxd8']).length).toBe(1);
  });
  it('summarizeTeaching is the serializable slice a cached tree carries', () => {
    const pkg = selectTeaching({ plies: pliesFromSans(LASKER), studentColor: 'black', kind: 'line' });
    const t = summarizeTeaching(pkg);
    expect(t.thesis.tactic).toBe('pin');
    expect(t.momentPlies).toContain(10);
    expect(t.onThread).toContain(10);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });
});

describe('N5 — the student\'s holes re-rank comparable moments', () => {
  const forkHole = {
    clusterId: 'analysis:tactic:fork', bucket: 'tactical' as const, label: 'Forks', openCount: 4, total: 4, severity: 70,
    lifecycleStatus: 'persistent' as const, trend: 'worsening' as const, puzzleThemes: ['fork'],
  };
  const swings = [{ ply: 8, label: '4… x', swingPawns: 2.0 }, { ply: 13, label: '7. y', swingPawns: 2.0 }];
  const landed = new Map<number, string>([[13, 'fork']]);
  it('equal swings: the moment that lands the student\'s hole leads', async () => {
    const { rankSwingCandidates, weaknessBoostCp } = await import('./teachingSelector');
    expect(weaknessBoostCp('fork', [forkHole])).toBeGreaterThan(0);
    expect(weaknessBoostCp('pin', [forkHole])).toBe(0);
    expect(rankSwingCandidates(swings, landed, [forkHole]).map((c) => c.ply)).toEqual([13, 8]);
  });
  it('an empty profile is the identity — the review card and the selector agree', async () => {
    const { rankSwingCandidates } = await import('./teachingSelector');
    expect(rankSwingCandidates(swings, landed, []).map((c) => c.ply)).toEqual([8, 13]);
  });
  it('a hole never vaults a subtlety over a real blunder (boost ≤ 0.3 pawns)', async () => {
    const { rankSwingCandidates } = await import('./teachingSelector');
    const big = [{ ply: 8, label: 'a', swingPawns: 3.0 }, { ply: 13, label: 'b', swingPawns: 1.0 }];
    expect(rankSwingCandidates(big, landed, [forkHole]).map((c) => c.ply)).toEqual([8, 13]);
  });
});
