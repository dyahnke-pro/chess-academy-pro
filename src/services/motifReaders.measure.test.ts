// MOTIF READERS, PROVEN ON THE PUZZLES THAT CARRY EACH THEME (WO-MOTIFS-01 M4).
// A line counts under its name AND the set-up it opens with (M3d, count both).
//
// Every motif row is filled by the ONE classifier (`detectTacticType` via
// `motifNaming`). This measures, per motif, over the 15,000 Lichess puzzles
// (CC0, `src/data/puzzles.json`): the CATCH rate — of the puzzles whose themes
// carry the motif, how many the classifier names as that motif from the
// solution's first move and line — and the FALSE-ALARM rate — of the puzzles
// that do NOT carry it, how many it names as that motif anyway. Not a gate: a
// measurement, written to audit-reports/motif-readers.json.
// Run: MOTIF_READERS=1 npx vitest run src/services/motifReaders.measure.test.ts
// Long (~15k engine-free reads, tens of minutes): shard it with
// MOTIF_READERS_SHARD=i/n — each shard writes its progress and its partial
// tallies to audit-reports/motif-readers.shard-i.json as it goes (vitest holds
// console output until the test ends, so the file IS the progress line), and
// `node scripts/motif-readers-merge.mjs` sums the shards.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import puzzles from '../data/puzzles.json';
import { detectTacticLine } from './missedTacticService';
import { MOTIFS, MOTIF_OF_TACTIC, type MotifId } from '../data/tacticMotifs';

interface Puzzle { id: string; fen: string; moves: string; themes: string[] }

const RUN = process.env.MOTIF_READERS === '1';

/** The Lichess themes that IDENTIFY each motif in a puzzle — broader than the
 *  drill themes (every mate puzzle carries "mate"). */
const IDENTIFY: Record<MotifId, readonly string[]> = {
  'free-piece': ['hangingPiece'],
  fork: ['fork'],
  pin: ['pin'],
  skewer: ['skewer'],
  'discovered-attack': ['discoveredAttack'],
  'discovered-check': ['discoveredCheck'],
  'x-ray': ['xRayAttack'],
  mate: ['mate'],
  promotion: ['promotion', 'underPromotion'],
  'double-check': ['doubleCheck'],
  'removing-the-guard': ['capturingDefender'],
  overload: ['overloading'],
  deflection: ['deflection', 'attraction'],
  zwischenzug: ['intermezzo'],
  'trapped-piece': ['trappedPiece'],
  clearance: ['clearance'],
  interference: ['interference'],
};
const LIMIT = Number(process.env.MOTIF_READERS_LIMIT ?? 0);
const [SHARD, SHARDS] = (process.env.MOTIF_READERS_SHARD ?? '0/1').split('/').map(Number);
/** Only the puzzles carrying these motifs (comma list) — a quick confusion run. */
const ONLY = (process.env.MOTIF_READERS_ONLY ?? '').split(',').filter(Boolean) as MotifId[];

/** The position the solver faces and the solution line from it. */
function solverStart(p: Puzzle): { fen: string; line: string[] } | null {
  const moves = p.moves.split(' ').filter(Boolean);
  if (moves.length < 2) return null;
  try {
    const c = new Chess(p.fen);
    const u = moves[0];
    c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return { fen: c.fen(), line: moves.slice(1) };
  } catch { return null; }
}

describe.skipIf(!RUN)('motif readers on their Lichess themes', () => {
  it('measures catch and false-alarm rates per motif', () => {
    const carriedBy = (p: Puzzle): Set<MotifId> => new Set((Object.keys(IDENTIFY) as MotifId[]).filter((id) => IDENTIFY[id].some((th) => p.themes.includes(th))));
    const all = (puzzles as unknown as Puzzle[]).slice(0, LIMIT > 0 ? LIMIT : undefined)
      .filter((p) => ONLY.length === 0 || ONLY.some((id) => carriedBy(p).has(id)))
      .filter((_, i) => i % SHARDS === SHARD);
    // What each carried motif was named instead: the classifier's own name
    // (`TacticType`), so a fix can see which reader took it.
    const namedAs = new Map<MotifId, Record<string, number>>();
    const named = new Map<MotifId, { carry: number; caught: number; consistent: number; without: number; falseAlarm: number }>();
    for (const id of Object.keys(MOTIFS) as MotifId[]) named.set(id, { carry: 0, caught: 0, consistent: 0, without: 0, falseAlarm: 0 });
    let read = 0;
    /** Each set-up the line opens with, by "set-up+name": how often, and how
     *  often the puzzle's own themes carry the set-up. */
    const setups: Record<string, { n: number; themed: number }> = {};
    mkdirSync('audit-reports', { recursive: true });
    const shardFile = `audit-reports/motif-readers.shard-${SHARD}.json`;
    const started = Date.now();
    const checkpoint = (done: boolean): void => writeFileSync(shardFile, JSON.stringify({
      shard: `${SHARD}/${SHARDS}`, read, of: all.length, done, seconds: Math.round((Date.now() - started) / 1000),
      tallies: Object.fromEntries(named),
      namedAs: Object.fromEntries(namedAs),
      setups,
    }, null, 1));
    for (const p of all) {
      const s = solverStart(p);
      if (!s) continue;
      // COUNT BOTH (M3d): a line counts under its name AND its set-up.
      const line = detectTacticLine(s.fen, s.line[0], s.line);
      const t = line.tacticType;
      const motifs = new Set([MOTIF_OF_TACTIC[t], line.setup ? MOTIF_OF_TACTIC[line.setup] : null].filter((m): m is MotifId => m !== null));
      read += 1;
      const carried = carriedBy(p);
      for (const id of carried) {
        const row = namedAs.get(id) ?? {};
        row[t] = (row[t] ?? 0) + 1;
        namedAs.set(id, row);
      }
      if (line.setup) {
        const key = `${line.setup}+${t}`;
        setups[key] = setups[key] ?? { n: 0, themed: 0 };
        setups[key].n += 1;
        const sm = MOTIF_OF_TACTIC[line.setup];
        if (sm && carried.has(sm)) setups[key].themed += 1;
      }
      for (const [id, tally] of named) {
        if (carried.has(id)) {
          tally.carry += 1;
          if (motifs.has(id)) tally.caught += 1;
          if ([...motifs].some((m) => carried.has(m))) tally.consistent += 1;
        } else { tally.without += 1; if (motifs.has(id)) tally.falseAlarm += 1; }
      }
      if (read % 250 === 0) checkpoint(false);
    }
    checkpoint(true);
    const rows = [...named.entries()].map(([id, t]) => ({
      motif: id, level: MOTIFS[id].level, themes: IDENTIFY[id],
      carry: t.carry, catchRate: t.carry ? Math.round((t.caught / t.carry) * 1000) / 10 : null,
      consistentRate: t.carry ? Math.round((t.consistent / t.carry) * 1000) / 10 : null,
      falseAlarmRate: t.without ? Math.round((t.falseAlarm / t.without) * 1000) / 10 : null,
    }));
    if (SHARDS === 1) writeFileSync('audit-reports/motif-readers.json', JSON.stringify({ puzzles: read, rows }, null, 2));
    for (const r of rows) console.log(`${r.motif.padEnd(20)} carry ${String(r.carry).padStart(5)}  exact ${r.catchRate ?? '—'}%  consistent ${r.consistentRate ?? '—'}%  false ${r.falseAlarmRate ?? '—'}%`);
    expect(read).toBeGreaterThan(0);
  }, 3_600_000);
});
