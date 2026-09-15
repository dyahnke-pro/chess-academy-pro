/**
 * tacticTypeUnification — the gate for ONE tactic classifier (P4b, 2026-09-15;
 * David: "make sure this build is unified. One coach system, not 5").
 *
 * Before P4b the app had TWO tactic classifiers: the reality-gated concept
 * engine the coach TEACHES from, and an ungated one-ply geometry
 * (`missedTacticService.detectTacticType`) that TAGGED what a student is weak
 * at. The same board could be a "pin" in the weakness bucket and a "fork" in
 * the coach's mouth. Now `detectTacticType` is a projection of the engine's
 * answer through `tacticVocabulary`; the old geometry survives only as a
 * declared, shrink-only tail.
 *
 * Every fixture below was probed against the live engine before it was
 * pinned — none is authored from memory (G3 applies to test boards too).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { detectTacticType, legacyTacticGeometry, TACTIC_TYPE_AUTHORITY } from './missedTacticService';
import { conceptForLine, tacticInvariant } from './conceptEngine';
import { TACTIC_TO_PATTERN, toTacticType } from './tacticVocabulary';
import { getCoachingMessage } from './tacticAlertService';
import type { TacticType } from '../types';
import type { TacticPatternType } from '../types/tacticTypes';

/** The full analysis vocabulary — mirrors `TacticType` so a new member that
 *  is added to the type but not here fails the exhaustiveness check below. */
const ALL_TACTICS: TacticType[] = [
  'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank', 'hanging_piece',
  'promotion', 'deflection', 'overloaded_piece', 'trapped_piece', 'clearance',
  'interference', 'zwischenzug', 'x_ray', 'double_check', 'removing_the_guard',
  'checkmate', 'tactical_sequence',
];

/** One PROBED board per engine-authority motif: the move the engine names it on. */
const ENGINE_FIXTURES: Array<{ tactic: TacticType; fen: string; uci: string; note: string }> = [
  { tactic: 'fork', fen: '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1', uci: 'd3e5', note: 'royal fork: Ne5+ hits Kd7 and the winnable Rc6' },
  { tactic: 'fork', fen: '7k/5q2/2r5/8/8/3N4/8/K7 w - - 0 1', uci: 'd3e5', note: 'Ne5 forks Qf7 + Rc6, no check' },
  { tactic: 'pin', fen: 'k7/8/8/8/n7/8/R7/7K w - - 0 1', uci: 'a2a1', note: 'Ra1 pins Na4 to Ka8' },
  { tactic: 'skewer', fen: 'r6k/8/8/8/q7/8/8/1R5K w - - 0 1', uci: 'b1a1', note: 'Ra1 skewers Qa4 to Ra8' },
  { tactic: 'discovered_attack', fen: 'k7/4q3/8/8/4B3/8/8/K3R3 w - - 0 1', uci: 'e4f5', note: 'Bf5 unveils Re1 on Qe7 (move-based motif)' },
  { tactic: 'double_check', fen: '8/8/5k2/4N3/8/8/8/B5K1 w - - 0 1', uci: 'e5d7', note: 'Nd7+ with Ba1 unveiled (move-based motif)' },
  { tactic: 'removing_the_guard', fen: 'k7/8/2n5/3bN3/8/8/8/3R3K w - - 0 1', uci: 'd1d5', note: 'Rxd5 wins the bishop AND unguards Nc6 under Ne5 (move-based motif)' },
  { tactic: 'overloaded_piece', fen: 'k7/8/2q5/1n1b4/P7/8/8/4R1K1 w - - 0 1', uci: 'e1d1', note: 'Rd1 adds the 2nd attack: Qc6 is the sole guard of Nb5 and Bd5 (victim-first motif)' },
  { tactic: 'trapped_piece', fen: '7k/2R5/8/8/8/8/3N4/n5K1 w - - 0 1', uci: 'c7c1', note: 'Rc1 attacks the undefended Na1 whose only squares are covered (victim-first motif)' },
  { tactic: 'back_rank', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1', uci: 'a1a8', note: 'Ra8# — the back-rank mate keeps its own motif' },
  { tactic: 'back_rank', fen: '6k1/5ppp/2r5/8/8/8/8/Q6K w - - 0 1', uci: 'a1a8', note: 'Qa8+ Rc8 Qxc8# — a back-rank mate THREAT keeps the specific motif' },
  { tactic: 'checkmate', fen: '6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', uci: 'e5f7', note: 'Nf7# smothered — a delivered mate is a checkmate, never a "fork"' },
];

/** The SET of tags the engine's own concept for a move may honestly project to:
 *  a landed tactic → its bridged motif (a mate THREAT may keep back-rank
 *  specificity); a delivered mate → checkmate, or back_rank for the back-rank
 *  pattern. Anything outside this set means the tag drifted from the engine. */
function engineProjections(fen: string, uci: string): TacticType[] {
  const concepts = conceptForLine({ fen, uci: [uci], studentColor: fen.split(' ')[1] as 'w' | 'b', max: 4 });
  for (const c of concepts) {
    if (c.source === 'mate') return ['checkmate', 'back_rank'];
    if (c.source === 'tactic') {
      const t = toTacticType(c.id as TacticPatternType);
      if (!t) continue;
      return c.id === 'mate_threat' ? [t, 'back_rank'] : [t];
    }
  }
  return [];
}

describe('TACTIC_TYPE_AUTHORITY — who decides each motif is DECLARED, exhaustive, and the legacy tail only shrinks', () => {
  it('assigns every TacticType an authority (a new member cannot be added silently)', () => {
    expect(Object.keys(TACTIC_TYPE_AUTHORITY).sort()).toEqual([...ALL_TACTICS].sort());
  });

  it('the theme-only motifs are exactly the five no classifier produces', () => {
    const themeOnly = ALL_TACTICS.filter((t) => TACTIC_TYPE_AUTHORITY[t] === 'theme-only').sort();
    expect(themeOnly).toEqual(['clearance', 'deflection', 'interference', 'x_ray', 'zwischenzug']);
  });

  it('the old geometry is DEAD in product code — no non-test file imports it (source scan)', () => {
    const ROOT = resolve(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.(ts|tsx)$/.test(name)) continue;
        if (p.endsWith('missedTacticService.ts')) continue; // the definition itself
        if (readFileSync(p, 'utf8').includes('legacyTacticGeometry')) offenders.push(p.slice(ROOT.length + 1));
      }
    };
    walk(ROOT);
    expect(offenders, 'legacyTacticGeometry must have no product caller').toEqual([]);
  });

  it('every engine-authority motif is PROVEN by a fixture the engine actually names (a wire that does not fire is not a wire)', () => {
    const engineMembers = ALL_TACTICS.filter((t) => TACTIC_TYPE_AUTHORITY[t] === 'engine');
    const covered = new Set(ENGINE_FIXTURES.map((f) => f.tactic));
    for (const t of engineMembers) expect(covered.has(t), `no engine fixture proves '${t}'`).toBe(true);
  });
});

describe('detectTacticType — the tag IS the engine\'s answer (agreement, never drift)', () => {
  for (const f of ENGINE_FIXTURES) {
    it(`${f.tactic}: ${f.note}`, () => {
      expect(detectTacticType(f.fen, f.uci)).toBe(f.tactic);
      // …and it is a projection of the engine's own concept for the move,
      // so the coach's teaching and the student's weakness bucket agree.
      expect(engineProjections(f.fen, f.uci)).toContain(f.tactic);
    });
  }
});

describe('detectTacticType — the engine\'s reality gate holds (the legacy false positives are gone)', () => {
  it('a check plus ONE DEFENDED equal piece is not a fork (legacy said fork)', () => {
    // Rc8+ checks Ke8 and hits Nb8, but the knight is guarded by Ra8 — nothing is won.
    const fen = 'rn2k3/8/8/8/8/8/8/2R1K3 w - - 0 1';
    expect(legacyTacticGeometry(fen, 'c1c8')).toBe('fork');
    expect(detectTacticType(fen, 'c1c8')).not.toBe('fork');
  });

  it('a "fork" whose forker simply hangs to one of its targets is not a fork (legacy said fork)', () => {
    // Rd8+ "forks" Kf8 and Ra8 — and Ra8 takes the rook. Forker-safety gate.
    const fen = 'r4k2/8/8/8/8/8/8/3RK3 w - - 0 1';
    expect(legacyTacticGeometry(fen, 'd1d8')).toBe('fork');
    expect(detectTacticType(fen, 'd1d8')).not.toBe('fork');
  });

  it('capturing a guard that is itself defended by the guarded piece is a losing trade, not removing the guard (legacy said removing_the_guard)', () => {
    // Rxd5 Qxd5 — the "guard" was covered by the queen it guarded.
    const fen = 'k7/8/4q3/3b4/8/8/8/3R3K w - - 0 1';
    expect(legacyTacticGeometry(fen, 'd1d5')).toBe('removing_the_guard');
    expect(detectTacticType(fen, 'd1d5')).not.toBe('removing_the_guard');
  });

  it('a piece with a DEFENDED escape square is not trapped (legacy said trapped_piece)', () => {
    // Ra1 hits Ba2; b1/b3 are covered by Nd2 — but black\'s c4 pawn defends b3, so ...Bb3 holds.
    const fen = '7k/8/8/8/2p5/8/b2N4/4R1K1 w - - 0 1';
    expect(legacyTacticGeometry(fen, 'e1a1')).toBe('trapped_piece');
    expect(detectTacticType(fen, 'e1a1')).not.toBe('trapped_piece');
  });

  it('a delivered smothered mate is a checkmate, not the "fork" the legacy geometry saw', () => {
    expect(legacyTacticGeometry('6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', 'e5f7')).toBe('fork');
    expect(detectTacticType('6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', 'e5f7')).toBe('checkmate');
  });
});

describe('detectTacticType — mechanics tiers are board-certain facts of the move', () => {
  it('promotion (explicit suffix, and a pawn reaching the last rank)', () => {
    expect(detectTacticType('7k/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8q')).toBe('promotion');
    expect(detectTacticType('7k/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8')).toBe('promotion');
  });

  it('capture of an undefended piece is a hanging piece — unless the engine names a richer motif first', () => {
    expect(detectTacticType('7k/8/8/3b4/8/2N5/8/7K w - - 0 1', 'c3d5')).toBe('hanging_piece');
    // Rxd5 also wins a free bishop, but the engine sees the removal of the guard — the teaching point.
    expect(detectTacticType('k7/8/2n5/3bN3/8/8/8/3R3K w - - 0 1', 'd1d5')).toBe('removing_the_guard');
  });
});

describe('detectTacticType — the old geometry\'s answers are never surfaced', () => {
  it('theme-only motifs are never produced by the classifier, even where the old geometry named them', () => {
    // Its "clearance" also fires on a rook hanging on a defended square; its
    // "x-ray" is static geometry. Both stay Lichess-tag-only.
    expect(legacyTacticGeometry('6k1/8/8/5b2/3N4/8/8/3R2K1 w - - 0 1', 'd4e6')).toBe('clearance');
    expect(detectTacticType('6k1/8/8/5b2/3N4/8/8/3R2K1 w - - 0 1', 'd4e6')).toBe('tactical_sequence');
    expect(legacyTacticGeometry('7k/1r6/8/1P6/8/8/8/1R4K1 w - - 0 1', 'b1b4')).toBe('x_ray');
    expect(detectTacticType('7k/1r6/8/1P6/8/8/8/1R4K1 w - - 0 1', 'b1b4')).toBe('tactical_sequence');
  });

  it('an engine-silent board is the sentinel, whatever the old geometry said', () => {
    const fen = 'r4k2/8/8/8/8/8/8/3RK3 w - - 0 1';
    expect(legacyTacticGeometry(fen, 'd1d8')).toBe('fork');
    expect(detectTacticType(fen, 'd1d8')).toBe('tactical_sequence');
  });

  it('a quiet move is the honest sentinel', () => {
    expect(detectTacticType('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 1', 'd1e2')).toBe('tactical_sequence');
    expect(detectTacticType('not a fen', 'e2e4')).toBe('tactical_sequence');
    expect(detectTacticType('7k/8/8/8/8/8/8/7K w - - 0 1', '')).toBe('tactical_sequence');
  });
});

describe('detectTacticType — the solution LINE is walked, not just one ply', () => {
  it('a mate-in-2 handed as a line still lands on the back-rank motif', () => {
    const fen = '6k1/5ppp/2r5/8/8/8/8/Q6K w - - 0 1';
    expect(detectTacticType(fen, 'a1a8', ['a1a8', 'c6c8', 'a8c8'])).toBe('back_rank');
  });

  it('a pv that does not start with the classified move is ignored (one-ply contract)', () => {
    const fen = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1';
    expect(detectTacticType(fen, 'd3e5', ['g1h1'])).toBe(detectTacticType(fen, 'd3e5'));
  });
});

describe('ONE VOICE — the alert / struggle coaching defines a motif with the engine\'s invariant', () => {
  for (const t of ALL_TACTICS) {
    const pattern = TACTIC_TO_PATTERN[t];
    const inv = pattern ? tacticInvariant(pattern) : null;
    if (!inv) continue;
    it(`${t}: getCoachingMessage opens with the engine's invariant`, () => {
      const expected = inv.full.charAt(0).toUpperCase() + inv.full.slice(1);
      expect(getCoachingMessage(t, 'guide', 1500)?.startsWith(expected)).toBe(true);
    });
  }

  it('no motif definition uses the banned we/our/us perspective', () => {
    for (const t of ALL_TACTICS) {
      for (const tier of ['nudge', 'teach', 'guide'] as const) {
        expect(getCoachingMessage(t, tier, 1500) ?? '').not.toMatch(/\b(we|our|us)\b/i);
      }
    }
  });
});

describe('cost — the classifier walks the line, so it must stay cheap enough for the live alert path', () => {
  it('100 one-ply classifications of a quiet middlegame move stay under the budget', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 1';
    detectTacticType(fen, 'd1e2'); // warm the detector cache like a real session would
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) detectTacticType(fen, 'd1e2');
    const ms = Date.now() - t0;
    expect(ms, `100 calls took ${ms}ms`).toBeLessThan(1500);
  }, 30000);

  it('a legal board is never mutated by classification', () => {
    const fen = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1';
    const before = new Chess(fen).fen();
    detectTacticType(fen, 'd3e5', ['d3e5', 'd7d8', 'e5c6']);
    expect(new Chess(fen).fen()).toBe(before);
  });
});
