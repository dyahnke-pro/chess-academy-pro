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
