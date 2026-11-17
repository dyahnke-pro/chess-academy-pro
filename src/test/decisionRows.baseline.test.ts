// THE DECISION BASELINE (WO-STORY-MATRIX-01 P1-0). Phase 1 moves every fact
// onto one shape (P1-3 to P1-6): about 250 producer sites, four step tables,
// three doors. Most of that is on surfaces the Danya bench cannot see (Learn's
// live lane, chat), so a migration that silently changes what the coach
// decides would pass every bench number. This holds the answer byte for byte:
// every `coach-decision` row the one door emits (`coachDecisionEvents`) and
// every line spoken, over real games walked with their cached engine reads —
//   review — Review's walk (`buildReviewSegmentsForTests`), every move;
//   learn  — Learn's live lane (`computePositionFacts` as CoachTeachPage calls
//            it: the student's move, the coach's reply, the say-once and the
//            structure plan heard carried);
//   chat   — the asked read at every board where the student is to move (as
//            boardTurnAnswer calls it);
//   lesson — the lesson's line for every move (`lessonThought`, one voice).
// The games: the Learn replay fences (Colle 800, Sicilian 1200, Sicilian
// Closed 1000 — real games walked by hand) and the Gotham–Jelena short game.
//
// A step that must not change what is said reproduces the snapshot exactly. A
// step that changes it ON PURPOSE (P1-4's listed points) rewrites it and the
// diff is read line by line:
//   DECISION_BASELINE_UPDATE=1 npx vitest run src/test/decisionRows.baseline.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { computePositionFacts } from '../services/positionFacts';
import { lastMoveIfOpponent, lastMoveIfStudent } from '../services/lastMoveOfLine';
import { analysisOf, lessonLines, replayPlies, type ReplayGame } from './replayGame';
import { withRows, clausesSaid, reviewSource, learnSource, type FixtureGame, type SourceRecord } from './replaySources';

const SNAPSHOT = 'src/test/fixtures/decision-baseline.json';
const UPDATE = process.env.DECISION_BASELINE_UPDATE === '1';
// THE LEARN LANE IN NUMBERS (WO-LEARN-SWING-01 P0) — reported, never gated:
//   DECISION_STATS=1 npx vitest run src/test/decisionRows.baseline.test.ts
// writes audit-reports/learn-lane-stats.json. This lane is what Learn's door
// is HANDED (`computePositionFacts`); what the door says is read off the
// browser replays (`scripts/scoreboard/learn-turn-stats.mjs`).
const STATS = process.env.DECISION_STATS === '1';
const STATS_FILE = 'audit-reports/learn-lane-stats.json';

/** One game's learn lane: turns that spoke, their words and lines, the kinds
 *  said, and every idea said twice (same kind + same claim). */
interface LaneStats { turns: number; turnsSpoken: number; wordsPerSpokenTurn: number; maxLinesInTurn: number; kinds: Record<string, number>; repeats: string[] }
const laneStats: Record<string, LaneStats> = {};

function statsOf(turns: ReadonlyArray<ReadonlyArray<{ kind: string; text: string; claim: string }>>): LaneStats {
  const spokenTurns = turns.filter((t) => t.length > 0);
  const words = spokenTurns.reduce((n, t) => n + t.reduce((m, c) => m + c.text.split(/\s+/).filter(Boolean).length, 0), 0);
  const kinds: Record<string, number> = {};
  const seen = new Map<string, number>();
  const repeats: string[] = [];
  turns.forEach((t, i) => {
    for (const c of t) {
      kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
      const key = `${c.kind}|${c.claim}`;
      if (seen.has(key)) repeats.push(`${key} (turns ${seen.get(key)} and ${i})`);
      else seen.set(key, i);
    }
  });
  return {
    turns: turns.length, turnsSpoken: spokenTurns.length,
    wordsPerSpokenTurn: spokenTurns.length ? Math.round(words / spokenTurns.length) : 0,
    maxLinesInTurn: Math.max(0, ...turns.map((t) => t.length)), kinds, repeats,
  };
}


function loadGames(): FixtureGame[] {
  const jelena = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
  const replays = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
  return [...replays, { ...jelena, id: 'gotham-jelena', rating: 1500 }];
}

/** The asked read at every board where the student is to move — where a
 *  student asks "what's going on?" — as chat reads it (boardTurnAnswer). */
async function chatSource(g: FixtureGame): Promise<SourceRecord> {
  const out: SourceRecord = { rows: [], spoken: [] };
  for (const p of replayPlies(g)) {
    if (p.own || p.after.length === 0) continue;
    const sans = g.sans.slice(0, p.ply);
    const lm = lastMoveIfStudent(sans, g.studentSide, p.fenAfter);
    const om = lastMoveIfOpponent(sans, g.studentSide, p.fenAfter);
    const { rows, result } = await withRows(() => computePositionFacts({ theory: true, namesPlayedMove: true,
      boardComputers: 'composer', posture: 'asked', fen: p.fenAfter,
      moverColor: p.mover === 'w' ? 'b' : 'w', studentColor: g.studentSide === 'white' ? 'w' : 'b',
      analysis: analysisOf(p.after),
      ...(lm ? { lastMove: lm } : {}), ...(om ? { opponentLastMove: om } : {}), history: sans,
    }));
    out.rows.push(...rows);
    out.spoken.push(`${p.ply}: ${clausesSaid(result)}`);
  }
  return out;
}

/** One row a line, so a changed decision is one line of the diff. */
function serialize(b: Record<string, SourceRecord>): string {
  const parts = Object.entries(b).map(([k, v]) => [
    `  ${JSON.stringify(k)}: {`,
    `   "rows": [${v.rows.length ? `\n${v.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}\n   ` : ''}],`,
    `   "spoken": [${v.spoken.length ? `\n${v.spoken.map((s) => `    ${JSON.stringify(s)}`).join(',\n')}\n   ` : ''}]`,
    '  }',
  ].join('\n'));
  return `{\n${parts.join(',\n')}\n}\n`;
}

/** The first place two records differ, said in a line. */
function firstDifference(key: string, want: SourceRecord | undefined, got: SourceRecord): string | null {
  if (!want) return `${key}: not in the snapshot`;
  for (const field of ['rows', 'spoken'] as const) {
    const n = Math.max(want[field].length, got[field].length);
    for (let i = 0; i < n; i++) {
      const a = JSON.stringify(want[field][i]);
      const b = JSON.stringify(got[field][i]);
      if (a !== b) return `${key} ${field}[${i}]\n  snapshot: ${a}\n  now:      ${b}`;
    }
  }
  return null;
}

const GAMES = loadGames();
const now: Record<string, SourceRecord> = {};
const snapshot: Record<string, SourceRecord> | null = !UPDATE && existsSync(SNAPSHOT)
  ? JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Record<string, SourceRecord>
  : null;

describe('every decision and every spoken line on the baseline games is unchanged', () => {
  // One test a game, so a drift names its game and a slow walk its own budget.
  for (const g of GAMES) {
    it(g.id, async () => {
      const mine: Record<string, SourceRecord> = {
        [`review:${g.id}`]: await reviewSource(g),
        [`learn:${g.id}`]: await learnSource(g, STATS ? (turns) => { laneStats[g.id] = statsOf(turns); } : undefined),
        [`chat:${g.id}`]: await chatSource(g),
        [`lesson:${g.id}`]: { rows: [], spoken: lessonLines(g).map((l, k) => `${k + 1}: ${l}`) },
      };
      // NOT VACUOUS: every door ran and decided, and every source spoke. A
      // build that stopped emitting would otherwise "reproduce" an empty
      // snapshot, and an UPDATE would write one.
      for (const [key, rec] of Object.entries(mine)) {
        if (!key.startsWith('lesson:')) expect(rec.rows.length, `${key}: no coach-decision rows`).toBeGreaterThan(0);
        expect(rec.spoken.filter((s) => /^\d+: \S/.test(s)).length, `${key}: nothing spoken`).toBeGreaterThan(0);
        now[key] = rec;
      }
      if (!snapshot) return;
      for (const [key, rec] of Object.entries(mine)) expect(firstDifference(key, snapshot[key], rec)).toBeNull();
    }, 1_800_000);
  }

  it.runIf(STATS)('reports the learn lane in numbers', () => {
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync(STATS_FILE, `${JSON.stringify(laneStats, null, 1)}\n`);
    for (const [id, st] of Object.entries(laneStats)) {
      console.log(`${id}: ${st.turnsSpoken}/${st.turns} turns spoke, ${st.wordsPerSpokenTurn} words a spoken turn, max ${st.maxLinesInTurn} lines, ${st.repeats.length} repeats`);
    }
    expect(Object.keys(laneStats).length).toBe(GAMES.length);
  });

  it('the snapshot holds these games and no others', () => {
    if (!snapshot) {
      // A filtered run (-t one game) never writes a partial snapshot.
      expect(Object.keys(now).length, 'every game must have run to write the snapshot').toBe(GAMES.length * 4);
      writeFileSync(SNAPSHOT, serialize(now));
      if (!UPDATE) throw new Error(`${SNAPSHOT} was missing and has been written — commit it and run again`);
      return;
    }
    expect(Object.keys(now)).toEqual(Object.keys(snapshot));
  });
});
