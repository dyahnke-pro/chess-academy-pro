// MEASUREMENT, not a gate: the main-thread cost of two pure computers on real
// boards (run with PHONE_COST=1). A phone is ~4x slower than the container,
// so a live surface wants p95 under ~16 ms here. Times are CPU time.
//   PHONE_COST_OUT=<file>   write every output (the proof the answers held)
//   PHONE_COST_CHECK=<file> compare every output against an earlier write
import { it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { counterplaysOf } from './pictureLedger';
import { buildPicture } from './positionPicture';
import { kpVerdict, kpClearCache, KP_FAST_BUDGET } from './kpSolver';

const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const DROP_MAIN = '/home/user/chess-academy-pro/audit-reports/.fixtures/data-drop-david.json';

interface Board { fen: string; pv: string[] }

function realBoards(): { mid: Board[]; kp: string[] } {
  const path = existsSync(DROP) ? DROP : DROP_MAIN;
  const games = JSON.parse(readFileSync(path, 'utf8')).stores.games as Array<{ pgn: string }>;
  const mid: Board[] = []; const kp = new Set<string>();
  for (const g of games) {
    const c = new Chess();
    try { c.loadPgn(g.pgn); } catch { continue; }
    const hist = c.history({ verbose: true });
    for (let i = 0; i < hist.length; i++) {
      const fen = hist[i].after;
      const r = new Chess(fen);
      if (i % 9 === 4 && mid.length < 400 && !r.isGameOver()) {
        mid.push({ fen, pv: hist.slice(i + 1, i + 9).map((m) => m.from + m.to + (m.promotion ?? '')) });
      }
      // A kings-and-pawns board of the game's own pawn structure: strip the
      // pieces, keep it when legal and not over the solver's men.
      if (i % 3 === 0 && kp.size < 300) {
        const rows = fen.split(' ')[0].replace(/[nbrqNBRQ]/g, '1').split('/')
          .map((row) => row.replace(/\d+/g, (d) => '1'.repeat(Number(d))).replace(/1+/g, (s) => String(s.length)));
        const placement = rows.join('/');
        const men = placement.replace(/[^a-zA-Z]/g, '').length;
        if (men < 4 || men > 7) continue;
        const f = `${placement} ${r.turn()} - - 0 40`;
        try { const t = new Chess(f); if (!t.isGameOver() && !t.inCheck()) kp.add(f); } catch { /* illegal */ }
      }
    }
  }
  return { mid, kp: [...kp] };
}

/** CPU time of this thread since `t` (wall clock is noisy on a shared box). */
function cpuMs(t: NodeJS.CpuUsage): number { const d = process.cpuUsage(t); return (d.user + d.system) / 1000; }

function stats(ms: number[]): { n: number; p50: number; p95: number; max: number } {
  const s = [...ms].sort((a, b) => a - b);
  const q = (p: number): number => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2);
  return { n: s.length, p50: q(0.5), p95: q(0.95), max: +s[s.length - 1].toFixed(2) };
}

it.runIf(process.env.PHONE_COST === '1' && (existsSync(DROP) || existsSync(DROP_MAIN)))('phone cost: counterplay + kp solver', () => {
  const { mid, kp } = realBoards();
  const out: Record<string, unknown> = {};
  const pic = buildPicture([]);
  // warm the JIT on a few boards
  for (const b of mid.slice(0, 5)) counterplaysOf(pic, b.fen, [{ moves: b.pv, cp: 0, mate: null }], 'w');
  const cpMs: number[] = [];
  for (const b of mid) {
    const lines = [{ moves: b.pv, cp: 0, mate: null }];
    for (const side of ['w', 'b'] as const) {
      const t = process.cpuUsage();
      const r = counterplaysOf(pic, b.fen, lines, side);
      cpMs.push(cpuMs(t));
      out[`cp|${b.fen}|${side}`] = r;
    }
  }
  // kp: cold (a fresh board's slices built) — the cache is cleared each board
  // so a hit on another board's slices never hides the cost.
  const kpMs: number[] = [];
  for (const fen of kp) {
    kpClearCache();
    const t = process.cpuUsage();
    const v = kpVerdict(fen);
    kpMs.push(cpuMs(t));
    out[`kp|${fen}`] = v;
  }
  // The live budget (futures.ts, boardComputers.ts), cold the same way.
  const kpFastMs: number[] = [];
  for (const fen of kp) {
    kpClearCache();
    const t = process.cpuUsage();
    const v = kpVerdict(fen, KP_FAST_BUDGET);
    kpFastMs.push(cpuMs(t));
    out[`kpfast|${fen}`] = v;
  }
  const report = { counterplay: stats(cpMs), kpVerdictCold: stats(kpMs), kpFastCold: stats(kpFastMs), kpBoards: kp.length, midBoards: mid.length };
  console.log(JSON.stringify(report, null, 1));
  if (process.env.PHONE_COST_OUT) writeFileSync(process.env.PHONE_COST_OUT, JSON.stringify(out));
  if (process.env.PHONE_COST_CHECK) {
    const was = JSON.parse(readFileSync(process.env.PHONE_COST_CHECK, 'utf8')) as Record<string, unknown>;
    const now = JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
    expect(Object.keys(now).sort()).toEqual(Object.keys(was).sort());
    for (const k of Object.keys(was)) expect(now[k], k).toEqual(was[k]);
  }
}, 1_800_000);
