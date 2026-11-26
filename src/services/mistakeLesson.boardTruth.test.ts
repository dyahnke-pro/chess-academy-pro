// BOARD TRUTH ON DAVID'S GAMES: every costly move (≥ 50 cp, both seats) of the
// 12 saved games (audit-reports/teaching-census-data/g-*.jsonl, engine reads
// saved) is run through errorWhy → composeMistakeLesson with the game's memory
// chained move by move. Every piece-on-square the spoken turn names must hold
// on the board it describes (`boardTrue`), and their seat never names a square.
// Skipped when the saved games are not on disk. MISTAKE_LESSON_SAMPLE=1 also
// writes the turns to /tmp/mistake-lesson-sample.json for the sample report.
import { describe, it, expect, vi } from 'vitest';
vi.mock('./appAuditor', () => ({ logAppAudit: () => Promise.resolve() }));
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Chess } from 'chess.js';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';
import { boardTrue, composeGoodDecision, composeMistakeLesson, nextGameMemory, NEW_GAME_MEMORY } from './mistakeLesson';

const DIR = 'audit-reports/teaching-census-data';
interface Line { uci: string; cp: number | null; mate: number | null; pv: string[] }
interface G { id: string; studentSide: 'white' | 'black'; sans: string[]; reads: Array<{ ply: number; before: Line[]; after: Line[] }> }
const white = (l: Line | undefined): number | null => (!l ? null : l.mate !== null ? (l.mate > 0 ? 10000 : -10000) : l.cp);

describe.runIf(existsSync(`${DIR}/g-0.jsonl`))('mistake lessons on David\'s games', () => {
  it('every spoken turn is true on its board', () => {
    const rows: Array<Record<string, unknown>> = []; const good: Array<Record<string, unknown>> = [];
    let turns = 0; let dropped = 0; const false_: string[] = [];
    for (const f of ['g-0.jsonl', 'g-1.jsonl', 'g-2.jsonl']) {
      if (!existsSync(`${DIR}/${f}`)) continue;
      for (const raw of readFileSync(`${DIR}/${f}`, 'utf8').split('\n')) {
        if (!raw.trim()) continue;
        const g = JSON.parse(raw) as G; const c = new Chess(); let prior: { fenBefore: string; san: string } | null = null; let mem = NEW_GAME_MEMORY;
        const student = g.studentSide === 'white' ? 'w' : 'b';
        g.sans.forEach((san, i) => {
          const fen = c.fen(); const mover = c.turn() === 'w' ? 'white' : 'black'; const sgn = mover === 'white' ? 1 : -1;
          const r = g.reads.find((x) => x.ply === i + 1);
          try { c.move(san); } catch { return; }
          const pm = prior; prior = { fenBefore: fen, san };
          if (!r) return;
          const b = white(r.before[0]); const a = white(r.after[0]);
          if (b === null || a === null) return;
          const cost = sgn * (b - a);
          const seat = mover === g.studentSide ? 'you' : 'them';
          let bestSan: string | null = null;
          try { const u = r.before[0].uci; bestSan = new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { bestSan = null; }
          const after2 = new Chess(c.fen()); try { if (g.sans[i + 1]) after2.move(g.sans[i + 1]); } catch { /* end */ }
          const mv = `${Math.ceil((i + 1) / 2)}${mover === 'white' ? '.' : '…'}${san}`;
          if (cost < 50 || bestSan === san) {
            if (seat === 'you') {
              const gd = composeGoodDecision({ fenBefore: fen, playedSan: san, lines: r.before.map((l) => ({ evaluation: l.cp ?? ((l.mate ?? 0) > 0 ? 100000 : -100000), mate: l.mate, moves: l.pv })), holdOf: () => undefined, ply: i + 1, memory: mem, priorMove: pm });
              if (gd) { good.push({ game: g.id, ply: i + 1, move: mv, kind: gd.kind, text: gd.text }); mem = { ...mem, lastStems: new Set([gd.stem]) }; }
            }
            return;
          }
          const allowedMate = r.after[0].mate !== null && Math.sign(r.after[0].mate) === -sgn ? Math.abs(r.after[0].mate) : null;
          const ew = errorWhy({ secondReads: NO_SECOND_READ, fenBefore: fen, playedSan: san, moverColor: mover, bestSan, bestLineUci: r.before[0].pv, replyLineUci: r.after[0].pv, replySan: g.sans[i + 1] ?? null,
            missedMate: null, allowedMate, bestMate: null, quality: cost >= 300 ? 'blunder' : cost >= 100 ? 'mistake' : 'inaccuracy', priorMove: pm, namesBetterMove: false, costCp: cost });
          turns += 1;
          const out = composeMistakeLesson({ ew, fenBefore: fen, playedSan: san, replyLineUci: r.after[0].pv, bestSan, bestLineUci: r.before[0].pv, seat, costCp: cost, evalBeforeCp: sgn * b, surface: 'learn', holdOf: () => undefined, log: false, ply: i + 1, memory: mem, theirReplySan: seat === 'you' ? g.sans[i + 1] ?? null : null });
          dropped += out.dropped ?? 0;
          if (out.text) {
            const boards = [new Chess(c.fen())]; if (seat === 'you') { boards.push(after2); const e = new Chess(c.fen()); try { const u = r.after[0].pv[0]; if (u) e.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); boards.push(e); } catch { /* none */ } }
            if (!boardTrue(out.text, boards, student)) false_.push(`${g.id} ${i + 1} ${out.text}`);
            if (seat === 'them' && /\b[a-h][1-8]\b/.test(out.slots.lesson ?? '')) false_.push(`their seat names a square: ${g.id} ${i + 1}`);
          }
          rows.push({ game: g.id, ply: i + 1, seat, move: mv, cost, cause: ew.cause.kind, motif: ew.cause.motif, tag: ew.cause.tag, heat: out.heat, text: out.text, silentWhy: out.silentWhy, slots: Object.keys(out.slots) });
          mem = nextGameMemory(mem, out, after2.fen(), student);
        });
      }
    }
    if (process.env.MISTAKE_LESSON_SAMPLE === '1') writeFileSync('/tmp/mistake-lesson-sample.json', JSON.stringify({ turns, dropped, rows, good }));
    expect(turns).toBe(242);
    expect(false_).toEqual([]);
  }, 600000);
});
