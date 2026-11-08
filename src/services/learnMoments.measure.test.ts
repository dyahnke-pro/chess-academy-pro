/**
 * L5 — TODAY'S LEARN ON HIS TEACHING MOVES, PER MOMENT (PLAN.md § PHASE 2
 * REDESIGN, L5). Reads Learn replays of his games through the real app
 * (`scripts/audit-learn-replay.mjs` with the hand driver's EVERYTHING=1: every
 * fact each deciding place weighed this turn, with whether it was said) and
 * his own teaching moves at the same plies (`scripts/scoreboard/his-bank-tags.json`,
 * the live game only — his analysis after it is Review's yardstick).
 *
 * A turn is the student's move at ply p and the coach's reply at p+1; his
 * teaching moves are the codes on his words at those two plies. Ours are read
 * off each fact's kind through the one kind → teaching-move table
 * (`TEACHING_MOVES`), and each fact is placed in its part of the turn by the
 * one table the door reads (`coachMoment.GROUP_PART`):
 *   SAID     — what the turn door kept (the one voice, door `learn-turn`);
 *   COMPUTED — every fact any deciding place weighed, said or held.
 * Per part: how many of his teaching moves a fact of that part made (said /
 * computed), and how many teaching moves that part said where he made none.
 * Per moment kind (the L2 moment table's split: the student's move — quiet,
 * capture, check, castle — and the phase): the same rates.
 *
 *   LEARN_MOMENTS=1 LEARN_MOMENTS_REPLAYS=<dir> npx vitest run src/services/learnMoments.measure.test.ts
 *
 * Writes audit-reports/learn-moments.json.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FACT_GROUP, isCoachFactKind } from './coachFact';
import { turnPartOf, type TurnPart } from './coachMoment';
import { TEACHING_MOVES } from './teachingMoves';
import { classifyPhase } from './gamePhaseService';

const DIR = process.env.LEARN_MOMENTS_REPLAYS ?? 'audit-reports/learn-replays-l5';
const TAGS = 'scripts/scoreboard/his-bank-tags.json';
const RUN = process.env.LEARN_MOMENTS === '1' && existsSync(DIR) && existsSync(TAGS);

interface Line { kind?: string; said?: boolean; fen?: string; text: string; computer?: string }
interface Turn { ply?: number; move?: string; reply?: string | null; lines?: string[]; everything?: Array<{ door: string; lines: Line[] }> }
interface Replay { game: string; seat: 'white' | 'black'; turns: Turn[] }
interface Tag { ply: number; segment: string; codes: string[] }

const PARTS: TurnPart[] = ['your-move', 'their-move', 'question', 'build', 'bait', 'aside'];

/** The student's move by the L2 moment table's split. */
function moveKind(san: string): 'castle' | 'check' | 'capture' | 'quiet' {
  if (san.startsWith('O-O')) return 'castle';
  if (/[+#]$/.test(san)) return 'check';
  if (san.includes('x')) return 'capture';
  return 'quiet';
}

interface Rate { his: number; said: number; computed: number; ours: number; notHis: number }
const rate = (): Rate => ({ his: 0, said: 0, computed: 0, ours: 0, notHis: 0 });
const pct = (a: number, b: number): string => (b ? `${Math.round((100 * a) / b)}%` : '–');

describe.skipIf(!RUN)('L5 — today\'s Learn on his teaching moves, per moment', () => {
  it('reports said and computed against his moves, by part and by moment kind', () => {
    const tags = JSON.parse(readFileSync(TAGS, 'utf8')) as Record<string, Tag>;
    const his = new Map<string, Set<string>>();
    for (const [key, v] of Object.entries(tags)) {
      if (v.segment !== 'game') continue;
      const k = `${key.slice(0, key.lastIndexOf(':'))}:${v.ply}`;
      const s = his.get(k) ?? new Set<string>();
      for (const c of v.codes) if (c !== 'X-NARRATION') s.add(c);
      his.set(k, s);
    }
    const byPart = Object.fromEntries(PARTS.map((p) => [p, rate()])) as Record<TurnPart, Rate>;
    const byKind = new Map<string, Rate>();
    const total = rate();
    const perMove = new Map<string, Rate>();
    let turns = 0; let withHis = 0; let silent = 0; let unknown = 0;
    const games: string[] = [];
    for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
      const r = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Replay;
      // Only his own games are scored: a game with no words of his tagged has
      // no yardstick (a fixture game is not his).
      if (![...his.keys()].some((k) => k.startsWith(`${r.game}:`))) continue;
      games.push(r.game);
      const me = r.seat === 'white' ? 'w' : 'b';
      for (const t of r.turns) {
        if (typeof t.ply !== 'number') continue;
        turns += 1;
        if (!(t.lines ?? []).length) silent += 1;
        const H = new Set([...(his.get(`${r.game}:${t.ply}`) ?? []), ...(his.get(`${r.game}:${t.ply + 1}`) ?? [])]);
        const saidBy = new Map<TurnPart, Set<string>>(PARTS.map((p) => [p, new Set<string>()]));
        const compBy = new Map<TurnPart, Set<string>>(PARTS.map((p) => [p, new Set<string>()]));
        const S = new Set<string>(); const C = new Set<string>();
        let fen: string | null = null;
        for (const e of t.everything ?? []) {
          for (const l of e.lines ?? []) {
            if (!l.kind || !isCoachFactKind(l.kind)) { unknown += 1; continue; }
            fen ??= l.fen ?? null;
            const seat = (l.fen?.split(' ')[1] ?? me) === me ? 'student' : 'opponent';
            const part = turnPartOf(FACT_GROUP[l.kind], seat);
            const said = e.door === 'learn-turn' && l.said === true;
            for (const m of TEACHING_MOVES[l.kind]) {
              compBy.get(part)!.add(m); C.add(m);
              if (said) { saidBy.get(part)!.add(m); S.add(m); }
            }
          }
        }
        const san = (t.move ?? '').replace(/^\d+\.(\.\.)?/, '');
        let phase = 'middlegame';
        try { if (fen) phase = classifyPhase(fen, { ply: t.ply }); } catch { /* keep the default */ }
        const kind = `${moveKind(san)} · ${phase}`;
        const k = byKind.get(kind) ?? rate();
        // Lines said where he made no such move: counted on every turn.
        for (const p of PARTS) for (const m of saidBy.get(p)!) { byPart[p].ours += 1; if (!H.has(m)) byPart[p].notHis += 1; }
        for (const m of S) { total.ours += 1; k.ours += 1; if (!H.has(m)) { total.notHis += 1; k.notHis += 1; } }
        if (H.size) {
          withHis += 1;
          for (const m of H) {
            total.his += 1; k.his += 1;
            if (S.has(m)) { total.said += 1; k.said += 1; }
            if (C.has(m)) { total.computed += 1; k.computed += 1; }
            const pm = perMove.get(m) ?? rate();
            pm.his += 1; if (S.has(m)) pm.said += 1; if (C.has(m)) pm.computed += 1;
            perMove.set(m, pm);
            for (const p of PARTS) {
              if (saidBy.get(p)!.has(m)) byPart[p].said += 1;
              if (compBy.get(p)!.has(m)) byPart[p].computed += 1;
            }
          }
        }
        byKind.set(kind, k);
      }
    }
    const out: string[] = [];
    out.push(`${games.length} games (${games.join(', ')}) · ${turns} turns (${silent} silent) · ${withHis} with his words · ${unknown} lines with no fact kind`);
    out.push(`his teaching moves ${total.his} · SAID ${total.said} = ${pct(total.said, total.his)} · COMPUTED ${total.computed} = ${pct(total.computed, total.his)} · we said ${total.ours}, ${total.notHis} where he made no such move (${pct(total.notHis, total.ours)})`);
    out.push('', 'part        his-moves-made: said / computed · ours said · not his');
    for (const p of PARTS) {
      const x = byPart[p];
      out.push(`${p.padEnd(11)} ${String(x.said).padStart(4)} (${pct(x.said, total.his)}) / ${String(x.computed).padStart(4)} (${pct(x.computed, total.his)}) · ${x.ours} · ${x.notHis} (${pct(x.notHis, x.ours)})`);
    }
    out.push('', 'moment kind            his · said · computed · ours · not his');
    for (const [kk, x] of [...byKind.entries()].sort((a, b) => b[1].his - a[1].his)) {
      out.push(`${kk.padEnd(22)} ${String(x.his).padStart(4)} · ${pct(x.said, x.his).padStart(4)} · ${pct(x.computed, x.his).padStart(4)} · ${x.ours} · ${pct(x.notHis, x.ours)}`);
    }
    out.push('', 'his teaching move      his · said · computed');
    for (const [m, x] of [...perMove.entries()].sort((a, b) => b[1].his - a[1].his)) {
      out.push(`${m.padEnd(22)} ${String(x.his).padStart(4)} · ${pct(x.said, x.his).padStart(4)} · ${pct(x.computed, x.his).padStart(4)}`);
    }
    console.log(out.join('\n'));
    writeFileSync('audit-reports/learn-moments.json', `${JSON.stringify({ games, turns, silent, withHis, unknown, total, byPart, byKind: Object.fromEntries(byKind), perMove: Object.fromEntries(perMove) }, null, 1)}\n`);
    expect(turns).toBeGreaterThan(0);
  });
});
