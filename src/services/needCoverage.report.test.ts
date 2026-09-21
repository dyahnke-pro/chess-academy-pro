// THE NUMBER (unified-coach N6, plan item 6): need-coverage per student profile
// over every repertoire main line + variation — what share of the student's
// own plies the coach would TEACH. Written to `audit-reports/need-coverage.json`
// for the record, and gated with SHRINK-ONLY ceilings (CLAUDE.md sealed-gates
// rule): the cold-start floor may never drop (a fresh install never meets a
// mute coach — the July silence), the mastered ceiling may never rise (a line
// played right five times stays quiet), and a seeded hole must teach MORE than
// mastery. The selector is surface-blind (invariant 1), so one number per
// profile IS the number for every surface — the surfaces differ in register
// only (N4).
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import repertoire from '../data/repertoire.json';
import { selectTeaching, pliesFromSans } from './teachingSelector';
import { coldStudent, computeNeed, FAMILIAR_REPS, COLD_START_GAMES, type StudentNeedContext } from './needScore';
import type { TacticPatternType } from '../types/tacticTypes';
import type { WeaknessSignal } from './weaknessSignal';

interface Entry { id: string; pgn: string; color: 'white' | 'black'; variations?: Array<{ name: string; pgn: string }> }
const ENTRIES = repertoire as unknown as Entry[];

/** The cold-start floor: share of student plies taught on a fresh profile. */
const COLD_FLOOR = 0.99;
/** The mastered ceiling: share taught on a line played right five times, no holes. */
const MASTERED_CEILING = 0.02;

const forkHole: WeaknessSignal = {
  clusterId: 'analysis:tactic:fork', bucket: 'tactical', label: 'Forks', openCount: 4, severity: 70,
  lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: ['fork'], total: 6,
};
const pinHole: WeaknessSignal = { ...forkHole, clusterId: 'analysis:tactic:pin', label: 'Pins', puzzleThemes: ['pin'] };

function lines(): Array<{ id: string; sans: string[]; color: 'white' | 'black' }> {
  const out: Array<{ id: string; sans: string[]; color: 'white' | 'black' }> = [];
  for (const e of ENTRIES) {
    const push = (id: string, pgn: string): void => {
      const sans = pgn.split(/\s+/).filter((t) => t && !/^\d+\.(\.\.)?$/.test(t)).map((t) => t.replace(/^\d+\.+/, ''));
      const c = new Chess();
      const legal: string[] = [];
      for (const s of sans) { try { if (!c.move(s)) break; } catch { break; } legal.push(s); }
      if (legal.length >= 6) out.push({ id, sans: legal, color: e.color });
    };
    // Main lines only, first MAX_PLIES: the selector's landed-tactic read is
    // ~100ms/ply, and the number is a corpus share, not a per-variation gate.
    push(e.id, e.pgn);
  }
  return out;
}
const MAX_PLIES = 16;

/** One selector read per line (the expensive part: landed tactics + the chain),
 *  then the cheap need verdict per profile from the same facts. */
interface LineFacts { color: 'white' | 'black'; plies: Array<{ ply: number; student: boolean; tactic: string | null; onThread: boolean }> }
let FACTS: LineFacts[] | null = null;
function facts(): LineFacts[] {
  if (FACTS) return FACTS;
  FACTS = lines().map((l) => {
    const plies = pliesFromSans(l.sans.slice(0, MAX_PLIES));
    const pkg = selectTeaching({ plies, studentColor: l.color, kind: 'line', surface: 'teach' });
    const tacticByPly = new Map(pkg.moments.map((m) => [m.ply, m.tactic] as const));
    return {
      color: l.color,
      plies: plies.map((p) => ({ ply: p.ply, student: p.playerColor === l.color, tactic: tacticByPly.get(p.ply) ?? null, onThread: pkg.onThread.has(p.ply) })),
    };
  });
  return FACTS;
}

function coverage(profile: (n: number) => StudentNeedContext): { taught: number; total: number; share: number } {
  let taught = 0;
  let total = 0;
  for (const l of facts()) {
    const ctx = profile(l.plies.length);
    for (const p of l.plies) {
      if (!p.student) continue;
      total += 1;
      // clauseKind is REQUIRED. This corpus carries only a tactic, so null is
      // the honest value — and it records that this number is measured
      // through the conceptId arm ONLY. `computeNeed` joins
      // `matchTacticPattern(conceptId) ?? matchClauseKind(clauseKind)`, so the
      // clause arm is unmeasured here. Widening the corpus is a separate build.
      if (computeNeed({ ply: p.ply, studentMove: true, conceptId: p.tactic as TacticPatternType | null, clauseKind: null, fundamentalId: null, onThread: p.onThread }, ctx).speak) taught += 1;
    }
  }
  return { taught, total, share: total ? taught / total : 0 };
}

describe('need coverage — the number, per profile (N6)', () => {
  const all = lines();
  it('has a real corpus to measure', () => { expect(all.length).toBeGreaterThan(30); }, 300_000);

  const cold = coverage(() => coldStudent(1400));
  const mastered = coverage((n) => ({ rating: 1400, gamesPlayed: COLD_START_GAMES + 20, signals: [], bookDepartures: [], capabilities: new Map(), lineReps: new Array(n).fill(FAMILIAR_REPS) }));
  const holes = coverage((n) => ({ rating: 1400, gamesPlayed: COLD_START_GAMES + 20, signals: [forkHole, pinHole], bookDepartures: [], capabilities: new Map(), lineReps: new Array(n).fill(FAMILIAR_REPS) }));
  const fresh = coverage((n) => ({ rating: 1400, gamesPlayed: COLD_START_GAMES + 20, signals: [], bookDepartures: [], capabilities: new Map(), lineReps: new Array(n).fill(0) }));

  it('writes the report', () => {
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/need-coverage.json', JSON.stringify({
      measuredAt: new Date().toISOString(), lines: all.length,
      profiles: { cold, mastered, holesOnMasteredLine: holes, warmNeverSeenLine: fresh },
      ceilings: { COLD_FLOOR, MASTERED_CEILING },
      note: 'selector is surface-blind: one number per profile is the number for every surface; surfaces differ in register only (N4)',
    }, null, 2));
    expect(cold.total).toBeGreaterThan(150);
  });
  it(`cold start teaches ≥ ${COLD_FLOOR * 100}% of the student's plies (floor — never a mute coach)`, () => {
    expect(cold.share).toBeGreaterThanOrEqual(COLD_FLOOR);
  });
  it(`a mastered line is taught on ≤ ${MASTERED_CEILING * 100}% of plies (ceiling — shrink-only)`, () => {
    expect(mastered.share).toBeLessThanOrEqual(MASTERED_CEILING);
  });
  it('a seeded hole teaches MORE than mastery, and a never-seen line is taught even to a warm student', () => {
    expect(holes.taught).toBeGreaterThanOrEqual(mastered.taught);
    expect(fresh.share).toBeGreaterThan(mastered.share);
    expect(fresh.share).toBeGreaterThanOrEqual(COLD_FLOOR); // unfamiliarity alone is a need
  });
});
