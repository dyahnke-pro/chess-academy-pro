// HOW OFTEN DOES THE FOCUS CHANCE ARRIVE, BY RUNG? (WO-FOCUS-TACTICS-01,
// PLAN.md "MEASURED BEFORE SHIP": a rung-3 chance must be plantable in ≥ 80%
// of games, else rung 3 falls back a rung for that game.) Replays David's own
// games — the boards his opponent moved from, from the target window on —
// through the real `findFocusPlant` with Node Stockfish reading the way the
// app does (the coach's every legal move at depth 10, the student's side at
// depth 12, time-boxed), and counts per rung the games in which a plant at
// that rung (one easier from move 20, as `wantedDifficulty` says) arrives.
// 2026-10-22: rung 3 at its own rung before move 20 in 11 of 21 games that
// reached move 20; with the fallback 20 of 21 → `TOP_RUNG_GRACE_PLIES`.
// (Measured with the grace off; the file passes the first board ply as the
// target, so a rerun measures the grace in.)
// Run: PLANT_ARRIVAL=1 [PLANT_GAMES=30] [PLANT_SHARD=i/n] npx vitest run src/coach/focus/focusPlant.arrival.measure.test.ts
// Writes audit-reports/focus-plant-arrival[-i].json as it goes (a kill loses
// one game, never the run).
import { describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import type { CoachLine, SlipRead } from '../../missions/earnedSlip';
import { findFocusPlant, wantedDifficulty } from './focusPlant';
import type { TacticsRung } from './focusRung';

const RUN = process.env.PLANT_ARRIVAL === '1';
const DROP = process.env.PLANT_DROP ?? 'audit-reports/.fixtures/data-drop-david.json';
const GAMES = Number(process.env.PLANT_GAMES ?? 30);
const [SHARD, SHARDS] = (process.env.PLANT_SHARD ?? '0/1').split('/').map(Number);
/** The app's per-read budget: PLANT_BUDGET_MS split over the coach read and
 *  PLANT_VERIFY_MAX student reads. */
const READ_MS = Number(process.env.PLANT_READ_MS ?? 600);
/** The board plies the guarantee looks from (the target window's start) to. */
const FROM_PLY = 11;
const TO_PLY = Number(process.env.PLANT_TO_PLY ?? 70);
const RUNGS: TacticsRung[] = [0, 1, 2, 3];
const ME = process.env.PLANT_ME ?? 'Knight_Mare_01';
const OUT = `audit-reports/focus-plant-arrival${SHARDS > 1 ? `-${SHARD}` : ''}.json`;
interface TopLine { evaluation: number; moves: string[]; mate: number | null }

class Engine {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private listeners: Array<(l: string) => void> = [];
  constructor() {
    this.proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js']);
    this.proc.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        for (const l of [...this.listeners]) l(line);
      }
    });
    this.send('uci\nisready');
  }
  send(cmd: string): void { this.proc.stdin.write(`${cmd}\n`); }
  /** Top lines, White's point of view, like the app's `analyzePosition`. */
  read(fen: string, multipv: number, depth: number): Promise<{ topLines: TopLine[] }> {
    const whiteToMove = fen.split(' ')[1] === 'w';
    return new Promise((resolve) => {
      const byRank = new Map<number, TopLine>();
      const finish = (): void => {
        this.listeners = this.listeners.filter((l) => l !== on);
        resolve({ topLines: [...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]) });
      };
      const timer = setTimeout(() => { this.send('stop'); }, READ_MS);
      const on = (line: string): void => {
        const m = /multipv (\d+) .*score (cp|mate) (-?\d+).* pv (.+)$/.exec(line);
        if (line.startsWith('info') && m) {
          const v = Number(m[3]);
          const sign = whiteToMove ? 1 : -1;
          byRank.set(Number(m[1]), m[2] === 'mate'
            ? { evaluation: 0, mate: v * sign, moves: m[4].split(' ') }
            : { evaluation: v * sign, mate: null, moves: m[4].split(' ') });
        }
        if (line.startsWith('bestmove')) { clearTimeout(timer); finish(); }
      };
      this.listeners.push(on);
      this.send(`setoption name MultiPV value ${multipv}\nposition fen ${fen}\ngo depth ${depth}`);
    });
  }
  stop(): void { try { this.send('quit'); this.proc.kill(); } catch { /* gone */ } }
}

interface DropGame { id: string; pgn: string; white: string; black: string }

/** The boards David's opponent (the coach's seat) moved from, ply FROM..TO. */
function games(): Array<{ id: string; coach: 'w' | 'b'; boards: Array<{ fen: string; ply: number }> }> {
  if (!existsSync(DROP)) return [];
  const drop = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: DropGame[] } };
  const mine = drop.stores.games.filter((g) => (g.white === ME || g.black === ME) && g.pgn);
  // Evenly spread over the record, so one month does not stand for all.
  const step = Math.max(1, Math.floor(mine.length / GAMES));
  const picked = mine.filter((_, i) => i % step === 0).slice(0, GAMES).filter((_, i) => i % SHARDS === SHARD);
  return picked.flatMap((g) => {
    const c = new Chess();
    try { c.loadPgn(g.pgn); } catch { return []; }
    const sans = c.history();
    const coach: 'w' | 'b' = g.white === ME ? 'b' : 'w';
    const r = new Chess();
    const boards: Array<{ fen: string; ply: number }> = [];
    for (const san of sans) {
      // The runner's ply: the student's NEXT move, one after the coach's.
      const ply = r.history().length + 2;
      if (r.turn() === coach && ply >= FROM_PLY && ply <= TO_PLY) boards.push({ fen: r.fen(), ply });
      r.move(san);
    }
    return boards.length > 0 ? [{ id: g.id, coach, boards }] : [];
  });
}

describe.runIf(RUN)('focus plant arrival by rung, on David\'s games', () => {
  it('counts the games a plant at each rung arrives in', async () => {
    const engine = new Engine();
    const all = games();
    expect(all.length).toBeGreaterThan(0);
    const arrived: Record<string, number> = Object.fromEntries(RUNGS.map((r) => [`rung${r}`, 0]));
    const perGame: Array<Record<string, unknown>> = [];
    for (const g of all) {
      const first: Record<string, number | null> = Object.fromEntries(RUNGS.map((r) => [`rung${r}`, null]));
      for (const b of g.boards) {
        if (RUNGS.every((r) => first[`rung${r}`] !== null)) break;
        const own = await engine.read(b.fen, 218, 10);
        const coachWhite = g.coach === 'w';
        const lines: CoachLine[] = own.topLines.filter((l) => l.moves.length > 0)
          .map((l) => ({ uci: l.moves[0], coachCp: (l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation) * (coachWhite ? 1 : -1), pv: l.moves }));
        const reads = new Map<string, ReturnType<Engine['read']>>();
        const read: SlipRead = (f) => {
          if (!reads.has(f)) reads.set(f, engine.read(f, 3, 12));
          return reads.get(f) as ReturnType<Engine['read']>;
        };
        for (const r of RUNGS) {
          if (first[`rung${r}`] !== null) continue;
          const { pick } = await findFocusPlant(b.fen, lines, { levels: ['beginner', 'intermediate', 'advanced'] }, { tag: null, difficulty: wantedDifficulty(r, b.ply, FROM_PLY), extra: false }, read);
          if (pick) first[`rung${r}`] = b.ply;
        }
      }
      for (const r of RUNGS) if (first[`rung${r}`] !== null) arrived[`rung${r}`] += 1;
      perGame.push({ game: g.id, boards: g.boards.length, firstAtPly: first });
      console.log(`[arrival] ${g.id}: ${JSON.stringify(first)}`);
      writeFileSync(OUT, JSON.stringify({ games: perGame.length, readMs: READ_MS, arrived, perGame }, null, 2));
    }
    engine.stop();
    console.log(`[arrival] ${all.length} games: ${JSON.stringify(arrived)}`);
  }, 7_200_000);
});
