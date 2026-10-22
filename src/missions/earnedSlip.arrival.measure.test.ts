// HOW OFTEN DOES THE EARNED SLIP ARRIVE? (docs/CAMPAIGN.md §6a: the arrival bar
// is 80%, measured before a change to the slip ships.) Replays real Campaign
// games — the gate audit's tapes — through the real `findEarnedSlip`, with
// Node Stockfish reading at the app's depths, and counts per game whether a
// slip would have arrived in the middlegame window, under each variant:
//   kN       the coach's N candidates (SLIP_KS, e.g. 10,40,80 — 80 is every
//            legal move, what the app reads since 2026-10-21)
// The window is the app's: from the coach's PLANT_FIRST_COACH_MOVE-th move of
// the middlegame card to where the card ended in the real game.
// SLIP_DEPTH (default 1) is the dial: the key moves before the piece falls.
// Run: SLIP_ARRIVAL=1 npx vitest run src/missions/earnedSlip.arrival.measure.test.ts
// Writes audit-reports/earned-slip-arrival.json.
import { describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { PLANT_FIRST_COACH_MOVE, findEarnedSlip, type CoachLine, type SlipRead } from './earnedSlip';

const RUN = process.env.SLIP_ARRIVAL === '1';
const TAPES = process.env.SLIP_TAPES ?? 'audit-reports/campaign-master/gate1';
/** The app's reads: coach depth 10, student depth 12, each time-boxed. */
const READ_MS = Number(process.env.SLIP_READ_MS ?? 600);
/** The coach's own read may get its own budget (it reads many lines). */
const COACH_MS = Number(process.env.SLIP_COACH_MS ?? READ_MS);
/** The candidate counts to compare. */
const KS = (process.env.SLIP_KS ?? '10,20').split(',').map(Number);
const DEPTH = Number(process.env.SLIP_DEPTH ?? 1) as 1 | 2 | 3;
/** Shards: a tape-name filter and the report it writes. */
const ONLY = new RegExp(process.env.SLIP_ONLY ?? '.');
const OUT = process.env.SLIP_OUT ?? 'audit-reports/earned-slip-arrival.json';
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
  /** Top lines, white's point of view, like the app's `analyzePosition`. */
  read(fen: string, multipv: number, depth: number, ms = READ_MS): Promise<{ topLines: TopLine[] }> {
    const whiteToMove = fen.split(' ')[1] === 'w';
    return new Promise((resolve) => {
      const byRank = new Map<number, TopLine>();
      const finish = (): void => {
        this.listeners = this.listeners.filter((l) => l !== on);
        resolve({ topLines: [...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]) });
      };
      const timer = setTimeout(() => { this.send('stop'); }, ms);
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

interface Tape { seat: 'white' | 'black' | null; moves: Array<{ by: string; san: string }>; missionEvents?: string[] }

/** Each tape's middlegame: the positions the coach moved from while the card
 *  was live, in order. The tape logs a taken-back move as "(try again: …)"
 *  after it, and the K+Q scenario as "(scenario …)" — the card is over there. */
function games(): Array<{ name: string; coach: 'w' | 'b'; window: string[] }> {
  if (!existsSync(TAPES)) return [];
  return readdirSync(TAPES).filter((f) => /^tape-g\d+\.json$/.test(f) && ONLY.test(f)).sort().flatMap((f) => {
    const t = JSON.parse(readFileSync(`${TAPES}/${f}`, 'utf8')) as Tape;
    if (!t.seat || !Array.isArray(t.moves)) return [];
    const coach: 'w' | 'b' = t.seat === 'white' ? 'b' : 'w';
    // The opening card checks every student move; it went live-to-middlegame
    // after this many of them.
    const openingMoves = (t.missionEvents ?? []).filter((e) => /^mission-checked \| develop-and-castle moved:/.test(e)).length;
    const c = new Chess();
    let studentMoves = 0;
    let cardMoves = 0;
    const window: string[] = [];
    for (const m of t.moves) {
      if (m.san.startsWith('(scenario')) break;
      if (m.san.startsWith('(try again')) { c.undo(); continue; }
      if (m.san.startsWith('(')) continue;
      const fen = c.fen();
      if (m.by === 'coach' && studentMoves >= openingMoves) {
        cardMoves += 1;
        if (cardMoves >= PLANT_FIRST_COACH_MOVE) window.push(fen);
      }
      try { c.move(m.san); } catch { break; }
      if (m.by === 'student') studentMoves += 1;
    }
    return [{ name: f, coach, window }];
  });
}

describe.runIf(RUN)('earned slip arrival, measured on real Campaign games', () => {
  it('counts the games a slip arrives in, per count of coach candidates', async () => {
    const engine = new Engine();
    const variants: Record<string, number> = Object.fromEntries(KS.map((k) => [`k${k}`, 0]));
    const perGame: Array<Record<string, unknown>> = [];
    const all = games();
    expect(all.length).toBeGreaterThan(0);
    for (const g of all) {
      const hit: Record<string, number> = Object.fromEntries(KS.map((k) => [`k${k}`, 0]));
      let coachMoves = 0;
      for (const fen of g.window) {
        expect(fen.split(' ')[1]).toBe(g.coach);
        coachMoves += 1;
        const studentReads = new Map<string, ReturnType<Engine['read']>>();
        const read: SlipRead = (f) => {
          if (!studentReads.has(f)) studentReads.set(f, engine.read(f, 3, 12));
          return studentReads.get(f) as ReturnType<Engine['read']>;
        };
        for (const k of KS) {
          if (hit[`k${k}`]) continue;
          const own = await engine.read(fen, k, 10, COACH_MS);
          const coachWhite = g.coach === 'w';
          const lines: CoachLine[] = own.topLines.filter((l) => l.moves.length > 0)
            .map((l) => ({ uci: l.moves[0], coachCp: (l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation) * (coachWhite ? 1 : -1), pv: l.moves }));
          const { pick } = await findEarnedSlip(fen, lines, DEPTH, read);
          if (pick) hit[`k${k}`] = coachMoves;
        }
        if (KS.every((k) => hit[`k${k}`])) break;
      }
      for (const v of Object.keys(variants)) if (hit[v]) variants[v] += 1;
      perGame.push({ game: g.name, window: g.window.length, firstAtCoachMove: hit });
      console.log(`[arrival] ${g.name} window ${g.window.length}: first slip at card coach move ${JSON.stringify(hit)} (0 = none)`);
    }
    engine.stop();
    const report = { games: all.length, depth: DEPTH, readMs: READ_MS, coachMs: COACH_MS, arrived: variants, perGame };
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`[arrival] ${all.length} games: ${JSON.stringify(variants)}`);
  }, 3_600_000);
});
