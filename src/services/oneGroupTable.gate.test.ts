// ONE GROUP TABLE (WO-STORY-MATRIX-01 P1-4). A fact's step is read from ONE
// table, `FACT_GROUP` (coachFact.ts), through `GROUP_STEP`. Four step tables
// used to answer it — Review's facets, the live clauses, their spread and
// Learn's lanes — and they disagreed: `[timing]` was "not yet" on Review's
// walk and "your move" at the door on the same surface. This gate fails on any
// other table that maps a kind, a lane or a story beat to a step or a group.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { decide } from './coachDecider';
import { CALM_BOARD } from './boardState';
import { ALL_GREY } from './teachingLayers';
import { NO_BOOST } from './studentMomentBoost';
import type { ImportanceSignals } from './narrationImportance';
import { doorFact } from '../test/doorFact';

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'test') out.push(...sources(p)); continue; }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const STEP = `'(?:danger|name|yours|theirs|choices|notYet|line|board|verdict|habit)'`;
const GROUP = `'(?:story|name|structure|verdict|danger|theirSide|notYet|move|choices|line|tactics|technique|concepts|habit)'`;
/** A table typed to give a step or a group. */
const TYPED = /(?:const|let)\s+([A-Z_]+)\s*:\s*Record<[^>]+,\s*(?:ThoughtStep|FactGroup)\s*>/g;
/** An untyped literal of five or more entries whose values are all steps or
 *  all groups — the same table without its type. */
const LITERAL = new RegExp(`(?:const|let)\\s+([A-Z_]+)\\s*=\\s*\\{((?:\\s*['\\w-]+\\s*:\\s*(?:${STEP}|${GROUP})\\s*,?){5,})\\s*\\}`, 'g');
/** A story beat relabelled to a fact kind — only the producer names its own. */
const BEAT_TO_KIND = /(?:const|let)\s+([A-Z_]+)\s*:\s*Record<StoryBeat,\s*(?:FacetTag|ClauseKind|FactKind|CoachFactKind)\s*>/g;

/** The one table, and the step each group is said in. */
const ALLOWED = new Set(['src/services/coachFact.ts:FACT_GROUP']);
/** The story's producer names each beat's kind (`STORY_KIND`). */
const BEAT_KIND_HOME = 'src/services/openingStory.ts';

describe('one group table (WO-STORY-MATRIX-01 P1-4)', () => {
  it('no table other than FACT_GROUP maps a kind, a lane or a beat to a step or a group', () => {
    const offenders: string[] = [];
    for (const file of sources('src')) {
      const code = readFileSync(file, 'utf8');
      for (const re of [TYPED, LITERAL]) {
        for (const m of code.matchAll(re)) {
          const id = `${file}:${m[1]}`;
          if (!ALLOWED.has(id)) offenders.push(id);
        }
      }
      for (const m of code.matchAll(BEAT_TO_KIND)) {
        if (file !== BEAT_KIND_HOME) offenders.push(`${file}:${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the gate sees a step table when there is one (negative control)', () => {
    const planted = "const PLANTED: Record<LearnLane, ThoughtStep> = { a: 'yours' };\nconst LOOSE = { a: 'yours', b: 'theirs', c: 'board', d: 'habit', e: 'name' };";
    expect([...planted.matchAll(TYPED)].map((m) => m[1])).toEqual(['PLANTED']);
    expect([...planted.matchAll(LITERAL)].map((m) => m[1])).toEqual(['LOOSE']);
  });
});

describe('[timing] is one step everywhere (WO-STORY-MATRIX-01 P1-4)', () => {
  const REFUTED = '[refuted] Most people play Bc4 here, and it walks into …Nxe4.';
  const TIMING = '[timing] Nf3 first: the knight has to leave g1 before the king can castle.';
  const student = { rating: 1500, weaknesses: [], need: null, moveAdvice: null, momentBoost: NO_BOOST, layers: ALL_GREY, fade: new Map() };
  const blunder: ImportanceSignals = { decision: null, cpLossCp: 300, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
  it('the door says "not yet, first this" after the choices — the step Review\'s walk gives it', () => {
    const bundle = { board: CALM_BOARD, facts: [doorFact(TIMING, { squares: ['f3', 'g1'] }), doorFact(REFUTED, { squares: ['c4', 'e4'] })] };
    const d = decide(blunder, student, bundle, 'walk');
    expect(d.spoken).toContain(TIMING);
    expect(d.spoken).toContain(REFUTED);
    expect(d.spoken.indexOf(REFUTED)).toBeLessThan(d.spoken.indexOf(TIMING));
  });
});
