/**
 * 🔒 EVERY THINK PAUSE IS CLOSED (OS-8 gap 3, Smith-Morra replay 2026-10-19).
 *
 * A computer that asks a question puts THINK_MARK between the question and its
 * answer, and the answer waits for the student's move. Four producers wrote a
 * raw mark with no closing one, so every LATER sentence of the turn rode with
 * the answer and was heard a move late. `askThenAnswer` closes it; a package
 * that is a question and its answer carries `ask`, and the one package
 * renderer closes the span after every tier the register adds.
 *
 * Two halves: each producer closes its mark (a later sentence is said now),
 * and no production file writes the mark itself.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import { splitThink, THINK_MARK } from '../utils/thinkPause';
import { buildRejectedTempting, buildPriorityFirst } from '../services/playCommentary';
import { packageForRegister } from '../services/hintRegister';
import { methodLine, methodRead } from '../services/planChoice';
import { planFromUci } from '../services/lookaheadPlan';
import { aimsOf, stepArc, EMPTY_ARC } from '../services/planArc';

/** A sentence after the producer's text is said NOW, not held with the answer. */
function closes(text: string): void {
  expect(text).toContain(THINK_MARK);
  const split = splitThink(`${text} Later sentence.`);
  expect(split).not.toBeNull();
  expect(split?.[0]).toMatch(/Later sentence\.$/);
  expect(split?.[1]).not.toMatch(/Later sentence/);
}

describe('each producer closes its think pause', () => {
  it('rejected tempting move (playCommentary)', () => {
    const rt = buildRejectedTempting({
      fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      studentColor: 'white',
      lines: [{ uci: 'e4e5', replyUci: 'c7c5', evalCp: 40 }, { uci: 'e4d5', replyUci: 'd8d5', evalCp: -140 }],
    });
    expect(rt).not.toBeNull();
    closes(rt!.spoken);
    for (const reg of ['subtle', 'moderate', 'obvious'] as const) closes(packageForRegister(rt!.hint, reg));
    // The tiers the register adds are part of the answer, never said before it.
    expect(splitThink(packageForRegister(rt!.hint, 'obvious'))?.[0]).toBe('Why not exd5?');
  });

  it('priority first (playCommentary)', () => {
    const pf = buildPriorityFirst({ fen: '6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/1N4K1 w - - 0 20', studentColor: 'white', bestUci: 'b1c3' });
    expect(pf).not.toBeNull();
    closes(pf!.spoken);
    for (const reg of ['subtle', 'moderate', 'obvious'] as const) {
      const said = packageForRegister({ ...pf!.hint, detail: undefined }, reg);
      closes(said);
      expect(splitThink(said)?.[0]).toBe("What's the priority here?");
    }
  });

  it('the method question (planChoice)', () => {
    const read = methodRead('6k1/pp3ppp/8/3p4/8/8/PP3PPP/2R3K1 w - - 0 20', 'w');
    expect(read).not.toBeNull();
    closes(methodLine(read!));
  });

  it("their plan's next step (planArc)", () => {
    // The Blumenfeld game's white knight walk, read from Black's seat: the
    // advance is THEIR move, asked as a question.
    const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3'.split(' ');
    const c = new Chess();
    const uci: string[] = []; const fens = [c.fen()];
    const mv: Array<{ from: string; to: string; piece: string; promotion?: string }> = [];
    for (const s of GAME) { const m = c.move(s); uci.push(m.from + m.to + (m.promotion ?? '')); fens.push(c.fen()); mv.push({ from: m.from, to: m.to, piece: m.piece }); }
    let st = EMPTY_ARC; const asked: string[] = [];
    for (let i = 0; i < GAME.length; i += 2) {
      const plan = planFromUci(fens[i + 1], uci.slice(i + 1, i + 9), 'black', null);
      const r = stepArc(st, plan?.theirs ? aimsOf(plan.theirs, 'opponent') : [], mv[i], fens[i + 1], 'w', 'opponent');
      st = r.next;
      for (const e of r.events) if (e.text.includes(THINK_MARK)) asked.push(e.text);
    }
    expect(asked.length).toBeGreaterThan(0);
    for (const t of asked) closes(t);
  });
});

describe('no production file writes the think mark itself', () => {
  const ROOTS = ['src/coach', 'src/services', 'src/components', 'src/hooks', 'src/utils'];
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !p.endsWith(path.join('utils', 'thinkPause.ts'))) files.push(p);
    }
  };
  for (const r of ROOTS) walk(r);

  it('only askThenAnswer opens a pause (code, not comments)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((l, k) => {
        const t = l.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
        // Splitting or detecting the mark is reading it; writing it into a
        // string literal or template is producing one.
        if (/\$\{THINK_MARK\}|['"`][^'"`\n]*‖/.test(l)) offenders.push(`${f}:${k + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
