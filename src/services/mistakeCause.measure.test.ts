// MEASURE (saved data only, no engine): the cause errorWhy hands over on every
// costly live move of David's 12 games (audit-reports/teaching-census-data/g-*.jsonl).
// Run: MISTAKE_CAUSE_MEASURE=1 npx vitest run src/services/mistakeCause.measure.test.ts
import { describe, it } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { Chess } from 'chess.js';
import { errorWhy } from './inaccuracyCall';

const DIR = 'audit-reports/teaching-census-data';
const on = process.env.MISTAKE_CAUSE_MEASURE === '1' && existsSync(`${DIR}/g-0.jsonl`);

interface Line { uci: string; cp: number | null; mate: number | null; pv: string[] }
interface Read { ply: number; before: Line[]; after: Line[] }
interface G { id: string; studentSide: 'white' | 'black'; sans: string[]; reads: Read[] }

const white = (l: Line | undefined): number | null => (!l ? null : l.mate !== null ? (l.mate > 0 ? 10000 : -10000) : l.cp);

describe.runIf(on)('mistake cause on saved games', () => {
  it('counts causes', () => {
    const counts: Record<string, number> = {};
    const rows: unknown[] = [];
    for (const f of ['g-0.jsonl', 'g-1.jsonl', 'g-2.jsonl']) {
      if (!existsSync(`${DIR}/${f}`)) continue;
      for (const raw of readFileSync(`${DIR}/${f}`, 'utf8').split('\n')) {
        if (!raw.trim()) continue;
        const g = JSON.parse(raw) as G;
        const c = new Chess();
        g.sans.forEach((san, i) => {
          const fen = c.fen();
          const mover = c.turn() === 'w' ? 'white' : 'black';
          const sgn = mover === 'white' ? 1 : -1;
          const r = g.reads.find((x) => x.ply === i + 1);
          try { c.move(san); } catch { return; }
          if (!r) return;
          const b = white(r.before[0]); const a = white(r.after[0]);
          if (b === null || a === null || Math.abs(b) >= 500) return;
          const cost = sgn * (b - a);
          if (cost < 100) return;
          const best = new Chess(fen);
          let bestSan: string | null = null;
          try { const u = r.before[0].uci; bestSan = best.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { bestSan = null; }
          if (bestSan === san) return;
          const allowedMate = r.after[0].mate !== null && Math.sign(r.after[0].mate) === -sgn ? Math.abs(r.after[0].mate) : null;
          const ew = errorWhy({
            fenBefore: fen, playedSan: san, moverColor: mover, bestSan,
            bestLineUci: r.before[0].pv, replyLineUci: r.after[0].pv, replySan: g.sans[i + 1] ?? null,
            missedMate: null, allowedMate, bestMate: null, quality: cost >= 300 ? 'blunder' : 'mistake', priorMove: null, namesBetterMove: false,
          } as never);
          counts[ew.cause.kind] = (counts[ew.cause.kind] ?? 0) + 1;
          rows.push({ game: g.id, ply: i + 1, san, seat: mover === g.studentSide ? 'you' : 'them', cost, cause: ew.cause, fen });
        });
      }
    }
    writeFileSync('audit-reports/mistake-cause-measure.json', JSON.stringify({ counts, rows }, null, 1));
    console.log(JSON.stringify(counts));
  }, 600000);
});
