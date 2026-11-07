/**
 * C0 — THE FOUR MOMENTS, MEASURED ON TODAY'S LEARN (WO-COACH-NEXT-TO-YOU-01).
 * Reads the head replays (the real app, his games, every computed line of
 * every turn with whether it was said — `scripts/audit-learn-replay.mjs` with
 * EVERYTHING=1) and reports, per moment: how many turns POSED it (a fact of
 * that part was computed), how many SAID it, and how many turns said more
 * than one moment (the build's rule is one).
 *
 *   COACH_MOMENT_MEASURE=1 [COACH_MOMENT_REPLAYS=<dir>] npx vitest run src/services/coachMoment.measure.test.ts
 *
 * Writes audit-reports/coach-moments.json.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FACT_GROUP, isCoachFactKind } from './coachFact';
import { turnPartOf, isMoment, type TurnPart } from './coachMoment';

const DIR = process.env.COACH_MOMENT_REPLAYS ?? 'audit-reports/learn-replays-head';
const RUN = process.env.COACH_MOMENT_MEASURE === '1' && existsSync(DIR);

interface Line { kind?: string; said?: boolean; fen?: string; text: string }
interface Replay { game: string; seat: 'white' | 'black'; turns: Array<{ ply?: number; move?: string; everything?: Array<{ door: string; lines: Line[] }> }> }

describe.skipIf(!RUN)('C0 — the four moments on today\'s Learn', () => {
  it('reports posed and said per moment', () => {
    const parts: TurnPart[] = ['your-move', 'their-move', 'question', 'build', 'bait', 'aside'];
    const tally = Object.fromEntries(parts.map((p) => [p, { turnsPosed: 0, turnsSaid: 0, linesComputed: 0, linesSaid: 0 }])) as Record<TurnPart, { turnsPosed: number; turnsSaid: number; linesComputed: number; linesSaid: number }>;
    let turns = 0; let turnsSpoke = 0; let multiMoment = 0; let unknownKinds = 0;
    const examples: Record<string, string[]> = {};
    for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
      const r = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Replay;
      const me = r.seat === 'white' ? 'w' : 'b';
      for (const t of r.turns) {
        if (typeof t.ply !== 'number') continue;
        turns += 1;
        const seen = new Set<string>();
        const posed = new Set<TurnPart>(); const said = new Set<TurnPart>();
        for (const e of t.everything ?? []) {
          if (e.door !== 'learn-turn') continue;
          for (const l of e.lines) {
            if (seen.has(l.text)) continue;
            seen.add(l.text);
            if (!l.kind || !isCoachFactKind(l.kind)) { unknownKinds += 1; continue; }
            const seat = (l.fen?.split(' ')[1] ?? me) === me ? 'student' : 'opponent';
            const part = turnPartOf(FACT_GROUP[l.kind], seat);
            posed.add(part); tally[part].linesComputed += 1;
            if (l.said) {
              said.add(part); tally[part].linesSaid += 1;
              const ex = (examples[part] ??= []);
              if (ex.length < 4) ex.push(`${r.game} ${t.move ?? ''} [${l.kind}] ${l.text.slice(0, 110)}`);
            }
          }
        }
        for (const p of posed) tally[p].turnsPosed += 1;
        for (const p of said) tally[p].turnsSaid += 1;
        if (said.size) turnsSpoke += 1;
        if ([...said].filter(isMoment).length > 1) multiMoment += 1;
      }
    }
    const report = { turns, turnsSpoke, turnsSayingMoreThanOneMoment: multiMoment, unknownKinds, parts: tally, examples };
    writeFileSync('audit-reports/coach-moments.json', `${JSON.stringify(report, null, 1)}\n`);
    console.log(`turns ${turns} · spoke ${turnsSpoke} · said >1 moment ${multiMoment} · lines with an unknown kind ${unknownKinds}`);
    for (const p of parts) {
      const x = tally[p];
      console.log(`${p.padEnd(11)} posed on ${x.turnsPosed} turns, said on ${x.turnsSaid} · lines computed ${x.linesComputed}, said ${x.linesSaid}`);
    }
    expect(turns).toBeGreaterThan(0);
  });
});
