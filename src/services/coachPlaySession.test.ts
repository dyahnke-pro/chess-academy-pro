import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configFromTargetElo,
  resolveConfig,
  getCoachMove,
  buildOpeningSeed,
  nextSeededMove,
  __resetSkillCacheForTests,
} from './coachPlaySession';
import { stockfishEngine } from './stockfishEngine';

describe('configFromTargetElo', () => {
  it('scales skill and movetime up with target ELO', () => {
    const low = configFromTargetElo(800);
    const mid = configFromTargetElo(1500);
    const high = configFromTargetElo(2200);
    expect(low.skill).toBeLessThan(mid.skill);
    expect(mid.skill).toBeLessThan(high.skill);
    expect(low.moveTimeMs).toBeLessThan(high.moveTimeMs);
  });

  it('clamps values at the anchor extremes', () => {
    const underLow = configFromTargetElo(200);
    const overHigh = configFromTargetElo(3500);
    expect(underLow.skill).toBeGreaterThanOrEqual(0);
    expect(underLow.skill).toBeLessThanOrEqual(20);
    expect(overHigh.skill).toBeGreaterThanOrEqual(0);
    expect(overHigh.skill).toBeLessThanOrEqual(20);
  });

  it('carries the target ELO in the label and targetElo field', () => {
    const cfg = configFromTargetElo(1650);
    expect(cfg.targetElo).toBe(1650);
    expect(cfg.label).toContain('1650');
  });

  it('interpolates between anchors (not a hard threshold)', () => {
    // Asserted against the anchors the function ACTUALLY has, not against
    // numbers copied out of them — this test is about interpolation, and it
    // used to fail whenever the curve was corrected, which is the one thing
    // it should not care about. (It did exactly that when the skill→Elo scale
    // was fixed on 2026-08-11.)
    const lo = configFromTargetElo(1200).skill;
    const hi = configFromTargetElo(1500).skill;
    const mid = configFromTargetElo(1350).skill;
    expect(hi, 'the bracketing anchors must differ or there is nothing to interpolate').toBeGreaterThan(lo);
    expect(mid).toBeGreaterThanOrEqual(lo);
    expect(mid).toBeLessThanOrEqual(hi);
    // And it is a real interpolation, not a step: the midpoint is strictly
    // inside the bracket whenever the bracket is wide enough to hold a value.
    if (hi - lo >= 2) {
      expect(mid).toBeGreaterThan(lo);
      expect(mid).toBeLessThan(hi);
    }
  });
});

describe('resolveConfig — ELO relative difficulty', () => {
  it('easy subtracts ~300 ELO from the player', () => {
    const easy = resolveConfig('easy', 1500);
    expect(easy.targetElo).toBe(1200);
    expect(easy.label).toContain('Easy');
    expect(easy.label).toContain('1200');
  });

  it('medium matches the player', () => {
    const med = resolveConfig('medium', 1500);
    expect(med.targetElo).toBe(1500);
    expect(med.label).toContain('Medium');
    expect(med.label).toContain('1500');
  });

  it('hard adds ~300 ELO to the player', () => {
    const hard = resolveConfig('hard', 1500);
    expect(hard.targetElo).toBe(1800);
    expect(hard.label).toContain('Hard');
    expect(hard.label).toContain('1800');
  });

  it('auto acts as medium', () => {
    const auto = resolveConfig('auto', 1700);
    const med = resolveConfig('medium', 1700);
    expect(auto.targetElo).toBe(med.targetElo);
    expect(auto.skill).toBe(med.skill);
  });

  it('undefined difficulty falls back to auto (medium)', () => {
    const cfg = resolveConfig(undefined, 1200);
    expect(cfg.targetElo).toBe(1200);
  });

  it('easy difficulty produces a weaker config than hard for same player', () => {
    const easy = resolveConfig('easy', 1600);
    const hard = resolveConfig('hard', 1600);
    expect(easy.skill).toBeLessThan(hard.skill);
    expect(easy.moveTimeMs).toBeLessThanOrEqual(hard.moveTimeMs);
  });

  it('floors target ELO at a reasonable minimum', () => {
    const cfg = resolveConfig('easy', 400);
    expect(cfg.targetElo).toBeGreaterThanOrEqual(400);
  });
});

describe('getCoachMove', () => {
  beforeEach(() => {
    __resetSkillCacheForTests();
  });

  it('calls stockfish getBestMove and parses UCI', async () => {
    vi.spyOn(stockfishEngine, 'initialize').mockResolvedValue(undefined);
    vi.spyOn(stockfishEngine, 'getBestMove').mockResolvedValue('e2e4');

    const result = await getCoachMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      { skill: 10, moveTimeMs: 500, targetElo: 1500, label: 'Medium (~1500)' },
    );

    expect(result.uci).toBe('e2e4');
    expect(result.from).toBe('e2');
    expect(result.to).toBe('e4');
    expect(result.promotion).toBeUndefined();
  });

  it('parses promotion suffix', async () => {
    vi.spyOn(stockfishEngine, 'initialize').mockResolvedValue(undefined);
    vi.spyOn(stockfishEngine, 'getBestMove').mockResolvedValue('e7e8q');

    const result = await getCoachMove('8/4P3/8/8/8/8/8/k6K w - - 0 1', {
      skill: 20,
      moveTimeMs: 1000,
      targetElo: 2400,
      label: 'Hard (~2400)',
    });
    expect(result.promotion).toBe('q');
  });
});

describe('buildOpeningSeed / nextSeededMove', () => {
  it('compiles a PGN move list into a fen→san map', () => {
    const seed = buildOpeningSeed("King's Indian Attack", 'Nf3 Nf6 g3 d5');
    expect(seed).not.toBeNull();
    expect(seed!.byFen.size).toBe(4);
    // Starting position → Nf3
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    const startMove = nextSeededMove(seed!, `${startFen} 0 1`);
    expect(startMove).toBe('Nf3');
  });

  it('matches downstream positions and returns null when off-book', async () => {
    const seed = buildOpeningSeed('Test', 'Nf3 Nf6 g3');
    expect(seed).not.toBeNull();
    // Walk the line via chess.js so the FEN we look up matches what
    // the seed would have observed during compilation.
    const { Chess } = await import('chess.js');
    const game = new Chess();
    game.move('Nf3');
    expect(nextSeededMove(seed!, game.fen())).toBe('Nf6');
    game.move('Nf6');
    expect(nextSeededMove(seed!, game.fen())).toBe('g3');
    game.move('g3');
    // Past the end of the prepared line.
    expect(nextSeededMove(seed!, game.fen())).toBeNull();
    // Bogus FEN.
    expect(nextSeededMove(seed!, 'unknown-fen')).toBeNull();
  });

  it('returns null on empty PGN', () => {
    expect(buildOpeningSeed('Empty', '')).toBeNull();
    expect(buildOpeningSeed('Whitespace', '   ')).toBeNull();
  });

  it('stops gracefully on bad PGN tokens', () => {
    const seed = buildOpeningSeed('Bad', 'Nf3 garbage e4');
    // Only the first valid move is recorded; the rest is dropped.
    expect(seed!.byFen.size).toBe(1);
  });
});


// SKILL LEVEL IS NOT ELO (David 2026-08-11: "Computer seemed to be playing a
// lot of best moves").
//
// His game, read back from PostHog: through move 7 the coach played real
// amateur moves off the rating band, then the book ran dry and every move
// after that came from the engine at `skill=16` — while he is rated 1729.
// Stockfish's scale runs roughly 1320 at skill 0 to 2850 at skill 20, so 16 is
// around 2500. The anchors had been written as though the scale ran 800→2400.
describe('the engine plays at the rating it was asked for', () => {
  /** Stockfish's own approximate skill→Elo relationship, ~75 Elo per level
   *  from a floor near 1320. The assertion is deliberately loose (±1 level) —
   *  what must hold is the SCALE, not a specific interpolation. */
  const eloOfSkill = (skill: number): number => 1320 + 75 * skill;

  for (const elo of [1500, 1729, 1800, 2100, 2400]) {
    it(`a ${elo} opponent is not hundreds of points stronger than ${elo}`, () => {
      const { skill } = configFromTargetElo(elo);
      const implied = eloOfSkill(skill);
      expect(implied, `skill ${skill} plays ~${implied}, asked for ${elo}`)
        .toBeLessThanOrEqual(elo + 120);
    });
  }

  it("David's exact rating no longer maps to a ~2500 opponent", () => {
    const { skill } = configFromTargetElo(1729);
    expect(skill, 'skill 16 was ~800 Elo too strong').toBeLessThanOrEqual(7);
  });

  it('is still monotonic — a stronger target is never a weaker engine', () => {
    let last = -1;
    for (let elo = 800; elo <= 2400; elo += 50) {
      const { skill } = configFromTargetElo(elo);
      expect(skill).toBeGreaterThanOrEqual(last);
      last = skill;
    }
  });

  it('bottoms out at 0 rather than pretending it can go lower', () => {
    // Skill 0 still plays around 1320. Below that the honest levers are
    // elsewhere (breaking book, the amateur bands) — the number cannot lie.
    expect(configFromTargetElo(600).skill).toBe(0);
    expect(configFromTargetElo(1000).skill).toBe(0);
  });

  it('the coach engine asks THIS module rather than keeping its own ladder', async () => {
    // Two copies answered 16 and 12 for the same 1729 player, and Learn
    // happened to call the harsher one. CLAUDE.md already names the owner.
    const src = await import('node:fs').then((fs) => fs.readFileSync('src/services/coachGameEngine.ts', 'utf8'));
    expect(src).toMatch(/configFromTargetElo\(targetElo\)\.skill/);
    expect(src, 'the second ladder has grown back').not.toMatch(/targetElo < 1600\) return 14/);
  });
});
