import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { rerenderMistakeNarration } from './mistakePuzzleService';
import type { MistakePuzzle } from '../types';

// HOW DEEP DOES THE COACH GO WHEN A MOVE COST SOMETHING? (WO-DEPTH-01 step 4,
// David 2026-11-08: "Every part of the app needs to have deeper reasoning than
// a surface evaluation".) Over every spoken line of the decision baseline
// (Review, Learn, chat, lessons on four real games) and the live My Mistakes
// card over David's whole mistake record, it counts the turns that explain a
// costly move and splits them: SURFACE (a verdict or a consequence and nothing
// under it — "the bishop hangs", "that was a mistake", "it let them win the
// queen") against DEEP (how the piece fell, the line played out, the earlier
// cause, the game's main concept). Reported, never gated:
//   DEPTH_COUNT=1 npx vitest run src/services/depthCount.measure.test.ts
// writes audit-reports/depth-count.json.
const RUN = process.env.DEPTH_COUNT === '1';
const OUT = 'audit-reports/depth-count.json';

const SAN = /(?:^|[\s(…,:])(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?(?=[\s.,;:!?)—]|$)/g;
const COST = [
  /\b(was|is) an? (mistake|blunder|inaccuracy)\b/i,
  /\b(hung|hangs)\b/i,
  /\b(lose|loses|lost|drop|drops|dropped) (a|an|the|your|their|two|three) ?(pawn|piece|knight|bishop|rook|queen|exchange|material)\b/i,
  /\bcosting\b/i,
  /\b(It|That|This) let them\b|\blets them\b|\bThat cost\b/i,
  /\bwalked into\b/i,
  /\bthe (pawn|knight|bishop|rook|queen)( on [a-h][1-8])? is lost\b/i,
  /\byou lose (a|an|the|two)\b/i,
];
/** What the move allowed, concretely: the punishing reply named and what it
 *  does — more than a verdict, less than how the piece fell. */
const CONSEQUENCE = /\b(lets them play|let them (play|win|take)|It let them|lets them win|lets them take)\b/i;
/** How the piece fell: a guard taken, a recapture that does not come, a pin, a fork. */
const MECHANISM = /\b(just takes it|hanging — |takes? back|recaptur\w+|the only (guard|defender|thing guarding)|was (guarding|holding|defending)|lost (its|their) last (guard|defender)|just lost (its|their) last|pinned|forks?\b|skewer\w*|discover\w*|overload\w*|nothing guards|no guard|unguarded|undefended|left (your|their) [\w-]+( on [a-h][1-8])? (loose|hanging|undefended|to)|guard(s|ed)? (it|them) (no more|any more))\b/i;
/** The punishment played out: two or more moves joined into a line. */
const LINE_JOIN = /\b(then|after|starting with|followed by|and then|two moves later|next)\b/i;
/** The earlier move that set it up. */
const EARLIER = /\b(earlier|started with|back on move|the move before|set (it|this) up|that began|which pulled|pulled the guard)\b/i;
/** The idea the game's costly moves share (`slipDepth.mainConceptLine`). */
const CONCEPT = /\bof (your|their) costly moves\b|\bthe same (shot|idea)\b/i;

interface Tally { costly: number; deep: number; consequence: number; surface: number; mechanism: number; line: number; earlier: number; concept: number; samples: string[] }
const blank = (): Tally => ({ costly: 0, deep: 0, consequence: 0, surface: 0, mechanism: 0, line: 0, earlier: 0, concept: 0, samples: [] });

function sentencesOf(s: string): string[] {
  return s.split(/(?<=[.!?])\s+(?=[A-Z…"(])/).map((x) => x.trim()).filter(Boolean);
}

/** One turn (a spoken line): is it about a costly move, and how deep does it go? */
export function depthOf(turn: string): { costly: boolean; consequence: boolean; mechanism: boolean; line: boolean; earlier: boolean; concept: boolean } {
  const text = turn.replace(/^\d+:\s*/, '').replace(/\[[a-z-]+\]\s*/g, '');
  const costly = COST.some((r) => r.test(text));
  const line = sentencesOf(text).some((s) => (s.match(SAN) ?? []).length >= 2 && LINE_JOIN.test(s));
  return { costly, consequence: CONSEQUENCE.test(text), mechanism: MECHANISM.test(text), line, earlier: EARLIER.test(text), concept: CONCEPT.test(text) };
}

function add(t: Tally, turn: string): void {
  const d = depthOf(turn);
  if (!d.costly) return;
  t.costly += 1;
  if (d.mechanism) t.mechanism += 1;
  if (d.line) t.line += 1;
  if (d.earlier) t.earlier += 1;
  if (d.concept) t.concept += 1;
  if (d.mechanism || d.line || d.earlier || d.concept) t.deep += 1;
  else if (d.consequence) t.consequence += 1;
  else { t.surface += 1; if (t.samples.length < 12) t.samples.push(turn.slice(0, 260)); }
}

describe.skipIf(!RUN)('depth count — surface vs deep, per surface', () => {
  it('counts the baseline surfaces and My Mistakes', () => {
    const tallies: Record<string, Tally> = {};
    const baseline = JSON.parse(readFileSync('src/test/fixtures/decision-baseline.json', 'utf8')) as Record<string, { spoken: string[] }>;
    for (const [key, rec] of Object.entries(baseline)) {
      const surface = key.split(':')[0];
      tallies[surface] ??= blank();
      for (const line of rec.spoken) add(tallies[surface], line);
    }
    const drop = 'audit-reports/.fixtures/data-drop-david.json';
    if (existsSync(drop)) {
      // The live card: a stored row rebuilt the way My Mistakes rebuilds it,
      // with the move the opponent actually answered in the game.
      const stores = (JSON.parse(readFileSync(drop, 'utf8')) as { stores: { mistakePuzzles: MistakePuzzle[]; games: Array<{ id: string; pgn: string }> } }).stores;
      const pgnOf = new Map(stores.games.map((g) => [g.id, g.pgn]));
      tallies['my-mistakes'] = blank();
      for (const r of stores.mistakePuzzles) {
        try { add(tallies['my-mistakes'], rerenderMistakeNarration(r, pgnOf.get(r.sourceGameId ?? '') ?? null).intro); } catch { /* not counted */ }
      }
    }
    const table = Object.fromEntries(Object.entries(tallies).map(([k, t]) => [k, { ...t, surfaceShare: t.costly ? Math.round((t.surface / t.costly) * 100) : 0 }]));
    writeFileSync(OUT, JSON.stringify(table, null, 1));
    for (const [k, t] of Object.entries(table)) console.log(`${k.padEnd(12)} costly ${t.costly}  deep ${t.deep}  consequence ${t.consequence}  surface ${t.surface} (${t.surfaceShare}%)  mech ${t.mechanism} line ${t.line} earlier ${t.earlier} concept ${t.concept}`);
    expect(Object.keys(table).length).toBeGreaterThan(0);
  }, 600_000);
});
