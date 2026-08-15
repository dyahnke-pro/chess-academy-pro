// IS THE DELTA WORKING, AND DOES IT SAY WHY THE BETTER MOVE IS BETTER?
//
// David 2026-08-15. Two separate questions and they fail separately:
//
//   1. THE DELTA — is `cpLoss` the real Stockfish difference, and does
//      `classifyMove` band it correctly (50 / 100 / 300)?
//   2. THE WHY — does the callout say what the better move was FOR, or does it
//      stop at naming it? `inaccuracyCall.whyBetter` reads the leading clause of
//      the plan the best move produces; when the line is too short to describe
//      it returns null and the callout names the move and stops.
//
// Driven on REAL blunders, deliberately: the lane is silent below 50cp by
// design, so a probe on clean games measures nothing. Every position below is a
// known error with a known refutation.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { backwardLook } from './backwardLook';
import { classifyMove } from './moveRating';
import { gradeNarrationText } from './coachAnswerGates';

const DEPTH = 14;

interface Read { evalCp: number; mate: number | null; bestUci: string | null; pv: string[] }

class Engine {
  private p: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiting: ((r: Read) => void) | null = null;
  private cur: Read = { evalCp: 0, mate: null, bestUci: null, pv: [] };

  constructor() {
    this.p = spawn('node', ['node_modules/stockfish/bin/stockfish-18-lite-single.js']);
    this.p.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      const lines = this.buf.split('\n');
      this.buf = lines.pop() ?? '';
      for (const raw of lines) {
        const l = raw.trim();
        if (l.startsWith('info ') && l.includes(' pv ')) {
          const cp = /score cp (-?\d+)/.exec(l);
          const mate = /score mate (-?\d+)/.exec(l);
          const pv = /\bpv (.+)$/.exec(l);
          if (cp) { this.cur.evalCp = Number(cp[1]); this.cur.mate = null; }
          if (mate) { this.cur.mate = Number(mate[1]); this.cur.evalCp = Number(mate[1]) > 0 ? 30000 : -30000; }
          if (pv) this.cur.pv = pv[1].split(/\s+/).filter(Boolean);
        } else if (l.startsWith('bestmove')) {
          this.cur.bestUci = l.split(/\s+/)[1] ?? null;
          const done = this.waiting;
          this.waiting = null;
          if (done) done({ ...this.cur, pv: [...this.cur.pv] });
        }
      }
    });
    this.p.stdin.write('uci\nisready\n');
  }

  async read(fen: string): Promise<Read> {
    this.cur = { evalCp: 0, mate: null, bestUci: null, pv: [] };
    const stm = fen.split(' ')[1];
    const r = await new Promise<Read>((resolve) => {
      this.waiting = resolve;
      this.p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    });
    const flip = stm === 'b' ? -1 : 1;
    return { ...r, evalCp: r.evalCp * flip, mate: r.mate === null ? null : r.mate * flip };
  }

  stop(): void { try { this.p.kill(); } catch { /* gone */ } }
}

/** Known errors with known refutations — the lane must speak on every one. */
const CASES: Array<{ name: string; setup: string[]; blunder: string; student: 'white' | 'black' }> = [
  // Legal's Mate: ...Bxd1 grabs the queen and gets mated.
  { name: 'Legal — ...Bxd1 (grabs the queen, gets mated)', student: 'black',
    setup: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5'], blunder: 'Bxd1' },
  // Scholar's-shape: ...Nf6?? allows Qxf7#.
  { name: 'Scholar — ...Nf6 allows mate on f7', student: 'black',
    setup: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], blunder: 'Nf6' },
  // Fried Liver invitation: ...Nxd5 loses to Nxf7.
  { name: 'Two Knights — ...Nxd5 walks into Nxf7', student: 'black',
    setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'], blunder: 'Nxd5' },
  // Hanging a piece outright in a quiet Italian.
  { name: 'Italian — Ng5 hangs to the queen', student: 'white',
    setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Qf6'], blunder: 'Ng5' },
  // Noah's Ark shape: a quiet positional concession, not a tactic.
  { name: 'Ruy — a4 (quiet, small)', student: 'white',
    setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'b5', 'Bb3', 'Na5'], blunder: 'a4' },
  // Queen grab that loses material back.
  { name: 'Englund — ...Qxb2 grabs and traps', student: 'black',
    setup: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2'], blunder: 'Qxb2' },
];

describe('delta probe', () => {
  let eng: Engine;
  beforeAll(() => { eng = new Engine(); });
  afterAll(() => { eng?.stop(); });

  it('measures the centipawn delta and whether the callout says WHY', async () => {
    const rows: Array<Record<string, unknown>> = [];

    for (const c of CASES) {
      const board = new Chess();
      let ok = true;
      for (const s of c.setup) { try { if (!board.move(s)) { ok = false; break; } } catch { ok = false; break; } }
      if (!ok) { rows.push({ case: c.name, error: 'setup illegal' }); continue; }

      const fenBefore = board.fen();
      const before = await eng.read(fenBefore);
      let played;
      try { played = board.move(c.blunder); } catch { played = null; }
      if (!played) { rows.push({ case: c.name, error: `blunder ${c.blunder} illegal` }); continue; }
      const fenAfter = board.fen();
      const after = await eng.read(fenAfter);

      const sign = c.student === 'white' ? 1 : -1;
      const cpLoss = (before.evalCp * sign) - (after.evalCp * sign);
      const bestSan = (() => {
        if (!before.bestUci) return null;
        try {
          return new Chess(fenBefore).move({
            from: before.bestUci.slice(0, 2), to: before.bestUci.slice(2, 4),
            promotion: before.bestUci.slice(4, 5) || undefined,
          })?.san ?? null;
        } catch { return null; }
      })();

      const quality = classifyMove({
        cpLoss,
        wasBest: bestSan === played.san,
        missedMate: before.mate,
        allowedMate: after.mate,
      });

      const look = backwardLook({
        fenBefore,
        fenAfter,
        playedSan: played.san,
        bestSan,
        bestPvUci: before.pv,
        replyPvUci: after.pv,
        cpLoss,
        studentColor: c.student,
        missedMate: before.mate,
        allowedMate: after.mate,
      });

      // Does the sentence go past naming the move? `whyBetter` appends an
      // "— it would …" / ", to …" clause; without it the callout stops at the
      // move name, which is the half that teaches nothing.
      const said = look?.line ?? '';
      const hasWhy = /—\s*it would |,\s*to /.test(said);
      const graded = said ? gradeNarrationText(said, fenAfter, 'deltaProbe')?.trim() ?? '' : '';

      rows.push({
        case: c.name,
        played: played.san,
        bestSan,
        evalBeforeCp: before.evalCp,
        evalAfterCp: after.evalCp,
        cpLoss: Math.round(cpLoss),
        missedMate: before.mate,
        allowedMate: after.mate,
        band: quality,
        spoke: Boolean(look),
        lane: look?.kind ?? null,
        hasWhy,
        boardTrue: said ? graded.length >= said.length * 0.6 : null,
        line: said,
      });
    }

    const spoke = rows.filter((r) => r.spoke === true);
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      engine: `stockfish-18-lite-single @ depth ${DEPTH}`,
      cases: rows.length,
      spoke: spoke.length,
      withWhy: spoke.filter((r) => r.hasWhy === true).length,
      boardTrue: spoke.filter((r) => r.boardTrue === true).length,
      rows,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/delta-probe.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    expect(rows.length).toBe(CASES.length);
  }, 600_000);
});
