import { describe, it, expect } from 'vitest';
import {
  DANYA_BEHAVIORS,
  detectBehaviors,
  BehaviorScheduler,
  type BehaviorHit,
} from './danyaBehaviors';

describe('danyaBehaviors — registry fires board-true facts', () => {
  it('every registered behavior has a positive corpus weight and a stable id', () => {
    const ids = new Set<string>();
    for (const b of DANYA_BEHAVIORS) {
      expect(b.weight).toBeGreaterThan(0);
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
    }
    expect(ids.size).toBe(DANYA_BEHAVIORS.length);
  });

  it('detects the opponent-intent (prophylaxis) threat and names the square', () => {
    // Student white; black Bg4 threatens to win Nf3.
    const hits = detectBehaviors({ fen: 'r3k3/8/8/8/6b1/5N2/8/4K3 w - - 0 1', studentColor: 'white' });
    const proph = hits.find((h) => h.id === 'prophylaxis');
    expect(proph).toBeDefined();
    expect(proph!.fact).toContain('f3');
    expect(proph!.squares).toContain('f3');
  });

  it('detects the bishop pair as a positional asset', () => {
    const hits = detectBehaviors({ fen: '4k3/8/8/8/8/8/1B3B2/4K3 w - - 0 1', studentColor: 'white' });
    expect(hits.find((h) => h.id === 'bishop-pair')).toBeDefined();
  });

  it('detects a passed pawn', () => {
    const hits = detectBehaviors({ fen: '6k1/5ppp/8/P7/8/8/5PPP/6K1 w - - 0 1', studentColor: 'white' });
    const passer = hits.find((h) => h.id === 'passed-pawn');
    expect(passer).toBeDefined();
    expect(passer!.fact).toContain('a5');
  });

  it('detects pressure on a target with the attacker/defender frame', () => {
    // Black to be the student pressing white Re2 with Re8 (undefended).
    const hits = detectBehaviors({ fen: '4r1k1/8/8/8/8/8/4R3/6K1 b - - 0 1', studentColor: 'black' });
    const pressure = hits.find((h) => h.id === 'pressure');
    expect(pressure).toBeDefined();
    expect(pressure!.fact).toContain('e2');
  });

  it('every fact is non-empty and names concrete content (no interface talk)', () => {
    const hits = detectBehaviors({ fen: 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', studentColor: 'white' });
    for (const h of hits) {
      expect(h.fact.length).toBeGreaterThan(0);
      expect(h.fact.toLowerCase()).not.toMatch(/\b(tap|click|button|press next|the app)\b/);
    }
  });

  it('returns [] on an invalid FEN', () => {
    expect(detectBehaviors({ fen: 'garbage', studentColor: 'white' })).toEqual([]);
  });
});

describe('BehaviorScheduler — fires at the corpus RATE (stride scheduling)', () => {
  // Two behaviors, weights 3:1 → over many always-applicable turns the spoken
  // share must converge to 3:1.
  function hit(id: string, weight: number): BehaviorHit {
    return { id, fact: id, squares: [], weight };
  }

  it('reproduces the target weight ratio when both behaviors always fire', () => {
    const sched = new BehaviorScheduler([
      { id: 'a', weight: 3, detect: () => null },
      { id: 'b', weight: 1, detect: () => null },
    ]);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i += 1) {
      const picked = sched.pick([hit('a', 3), hit('b', 1)])!;
      counts[picked.id] += 1;
    }
    const ratio = counts.a / counts.b;
    expect(ratio).toBeGreaterThan(2.6);
    expect(ratio).toBeLessThan(3.4);
  });

  it('picks the only fired behavior when just one is applicable', () => {
    const sched = new BehaviorScheduler([
      { id: 'a', weight: 3, detect: () => null },
      { id: 'b', weight: 1, detect: () => null },
    ]);
    expect(sched.pick([hit('b', 1)])!.id).toBe('b');
    expect(sched.pick([hit('b', 1)])!.id).toBe('b');
  });

  it('returns null when nothing fires', () => {
    const sched = new BehaviorScheduler();
    expect(sched.pick([])).toBeNull();
  });

  it('is deterministic — the same fired stream yields the same picks twice', () => {
    const stream = () => [hit('a', 1039), hit('b', 927), hit('c', 135)];
    const run = (): string[] => {
      const s = new BehaviorScheduler([
        { id: 'a', weight: 1039, detect: () => null },
        { id: 'b', weight: 927, detect: () => null },
        { id: 'c', weight: 135, detect: () => null },
      ]);
      return Array.from({ length: 200 }, () => s.pick(stream())!.id);
    };
    expect(run()).toEqual(run());
  });

  it('over a realistic mixed stream, the high-weight behavior dominates spoken share', () => {
    const sched = new BehaviorScheduler();
    const counts: Record<string, number> = {};
    // Simulate: piece-activity(1039) + prophylaxis(927) always fire; pressure(135) rarely.
    for (let i = 0; i < 3000; i += 1) {
      const hits: BehaviorHit[] = [hit('piece-activity', 1039), hit('prophylaxis', 927)];
      if (i % 8 === 0) hits.push(hit('pressure', 135));
      const p = sched.pick(hits)!;
      counts[p.id] = (counts[p.id] ?? 0) + 1;
    }
    // piece-activity and prophylaxis get the lion's share; both far exceed pressure.
    expect(counts['piece-activity']).toBeGreaterThan(counts['pressure']);
    expect(counts['prophylaxis']).toBeGreaterThan(counts['pressure']);
    // Their ratio tracks 1039:927 (within tolerance).
    const r = counts['piece-activity'] / counts['prophylaxis'];
    expect(r).toBeGreaterThan(0.95);
    expect(r).toBeLessThan(1.3);
  });
});

describe('danyaBehaviors — INTENT regressions (David 2026-08-23: "give suggestions that actually match the intent")', () => {
  it('NEVER says "your queen is your most active piece"', () => {
    // Open position where the queen has the widest scope.
    const hits = detectBehaviors({ fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1', studentColor: 'white' });
    const pa = hits.find((h) => h.id === 'piece-activity');
    if (pa) expect(pa.fact.toLowerCase()).not.toContain('queen');
  });

  it('does NOT cry "enemy king exposed, attack" on move 1', () => {
    const hits = detectBehaviors({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', studentColor: 'white' });
    expect(hits.find((h) => h.id === 'king-safety')).toBeUndefined();
  });

  it('does NOT warn about a check that just loses the piece (phantom Bxf2+ fork)', () => {
    // Italian: Bc5 "eyes" f2, but Bxf2+ Kxf2 just drops the bishop — not a threat.
    const hits = detectBehaviors({ fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 0 1', studentColor: 'white' });
    const proph = hits.find((h) => h.id === 'prophylaxis');
    if (proph) expect(proph.fact.toLowerCase()).not.toContain('f2');
  });

  it('does NOT surface a pinned PAWN as a tactic (Bc4 "pins" f7)', () => {
    const hits = detectBehaviors({ fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1', studentColor: 'white' });
    const t = hits.find((h) => h.id === 'tactics');
    if (t) expect(t.fact.toLowerCase()).not.toMatch(/pins pawn|skewers pawn/);
  });

  it('does NOT call an active fianchetto/outside bishop "bad"', () => {
    // Black Bf5 developed outside the chain.
    const hits = detectBehaviors({ fen: 'rn1qkbnr/pp2pppp/2p5/3p1b2/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 1', studentColor: 'black' });
    const pa = hits.find((h) => h.id === 'piece-activity');
    if (pa) expect(pa.fact).not.toMatch(/f5.*bad bishop/);
  });
});

describe('danyaBehaviors — knight-maneuver + x-ray fire on REAL cases, silent otherwise', () => {
  it('x-ray fires for a rook bearing on the enemy king through one blocker', () => {
    const hits = detectBehaviors({ fen: '4k3/8/8/4p3/8/8/8/4R1K1 w - - 0 1', studentColor: 'white' });
    const xr = hits.find((h) => h.id === 'x-ray');
    expect(xr).toBeDefined();
    expect(xr!.fact).toContain('e8');
  });
  it('x-ray does NOT fire for a bishop merely pointing at f7/the king (the every-ply noise)', () => {
    // Italian, after castling: Bc4 "aims" at f7/g8 — not a teaching x-ray.
    const hits = detectBehaviors({ fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQR1K1 w - - 0 1', studentColor: 'white' });
    expect(hits.find((h) => h.id === 'x-ray')).toBeUndefined();
  });
  it('knight-maneuver fires only for a RIM knight with an outpost, in the middlegame', () => {
    // move 12+, white Na4 with b4 pawn guarding the c5 outpost.
    const hits = detectBehaviors({ fen: '4k3/8/8/8/NP6/8/8/4K3 w - - 0 12', studentColor: 'white' });
    const km = hits.find((h) => h.id === 'knight-maneuver');
    expect(km?.fact ?? '').toContain('c5');
  });
  it('knight-maneuver does NOT fire for a developed central knight', () => {
    const hits = detectBehaviors({ fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 12', studentColor: 'white' });
    expect(hits.find((h) => h.id === 'knight-maneuver')).toBeUndefined();
  });
})
