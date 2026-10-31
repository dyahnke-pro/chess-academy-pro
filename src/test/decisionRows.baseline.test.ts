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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { onCoachDecision, type CoachDecisionRow } from '../services/coachDecisionEvents';
import { computePositionFacts, type PositionFactsResult } from '../services/positionFacts';
import { lastMoveIfOpponent, lastMoveIfStudent } from '../services/lastMoveOfLine';
import { mateContext } from '../utils/mateContext';
import { analysisOf, lessonLines, linesOf, replayPlies, reviewSegments, type ReplayGame } from './replayGame';

const SNAPSHOT = 'src/test/fixtures/decision-baseline.json';
const UPDATE = process.env.DECISION_BASELINE_UPDATE === '1';

interface FixtureGame extends ReplayGame { id: string; rating: number }

function loadGames(): FixtureGame[] {
  const jelena = JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame;
  const replays = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: FixtureGame[] }).games;
  return [...replays, { ...jelena, id: 'gotham-jelena', rating: 1500 }];
}

/** One source's record: the door's rows and the lines it let speak. */
interface SourceRecord { rows: CoachDecisionRow[]; spoken: string[] }

/** Runs `fn`, keeping every decision the one door emitted while it ran. */
async function withRows<T>(fn: () => T | Promise<T>): Promise<{ rows: CoachDecisionRow[]; result: T }> {
  const rows: CoachDecisionRow[] = [];
  const off = onCoachDecision((r) => { rows.push(r); });
  try { return { rows, result: await fn() }; } finally { off(); }
}

const clausesSaid = (pf: PositionFactsResult): string => pf.clauses.map((c) => `[${c.kind}] ${c.text}`).join(' ');

async function reviewSource(g: FixtureGame): Promise<SourceRecord> {
  const { rows, result } = await withRows(() => reviewSegments(g, g.rating));
  return { rows, spoken: result.map((s) => `${s.ply}: ${s.narration ?? ''}`) };
}

/** Learn's live lane after each of the student's moves and the coach's reply:
 *  the arguments CoachTeachPage hands `computePositionFacts` (posture `walk`,
 *  its own board computers, the reads of the student's move, the reply that
 *  made the board), with the said set carried move to move. */
async function learnSource(g: FixtureGame): Promise<SourceRecord> {
  const plies = replayPlies(g);
  const student: 'w' | 'b' = g.studentSide === 'white' ? 'w' : 'b';
  const said = new Set<string>();
  // The story's structure thread: the plan the student last heard.
  let planHeard: string | null = null;
  const out: SourceRecord = { rows: [], spoken: [] };
  for (let k = 0; k + 1 < plies.length; k++) {
    const p = plies[k];
    const r = plies[k + 1];
    if (!p.own || r.after.length === 0) continue;
    const historySans = g.sans.slice(0, k + 1);
    const { rows, result } = await withRows(() => computePositionFacts({
      boardComputers: 'surface',
      posture: 'walk',
      fen: r.fenAfter,
      history: g.sans.slice(0, k + 2),
      moverColor: student,
      studentColor: student,
      rating: g.rating,
      analysis: analysisOf(r.after),
      lastMove: {
        fenBefore: p.fenBefore, san: p.san, cpLoss: p.costCp, historySans,
        reads: p.best ? {
          historySans, bestMoveUci: p.best.uci, bestPvUci: p.best.pv, playedPvUci: p.reply?.pv ?? [], price: null,
          ...mateContext(analysisOf(p.before), analysisOf(p.after), g.studentSide),
        } : null,
        fanBefore: linesOf(p.before),
      },
      alreadySaid: new Set(said),
      structurePlanHeard: planHeard,
      opponentLastMove: { fenBefore: r.fenBefore, san: r.san },
    }));
    for (const t of result.remember) said.add(t);
    planHeard = result.structurePlanSaid ?? planHeard;
    out.rows.push(...rows);
    out.spoken.push(`${r.ply}: ${clausesSaid(result)}`);
  }
  return out;
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
    const { rows, result } = await withRows(() => computePositionFacts({
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
        [`learn:${g.id}`]: await learnSource(g),
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
    }, 600_000);
  }

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
