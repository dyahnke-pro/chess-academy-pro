import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { THINK_STEP, thinkStepOf } from './thinkingComputers';
import { THINKING_STEPS, type ThinkingStep } from './thinkingSteps';
import { BOARD_COMPUTERS } from './boardComputers';
import { stepThought } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { ComputerName } from './coachFact';

// ONE COACH, HOW TO THINK INCLUDED (David 2026-11-17, non-negotiable): every
// computer answers which thinking step it serves, and the step's teaching is
// the same facts every other surface says, kept to that step.
describe('every computer answers for Learn how to think', () => {
  it('a computer with no step says why, in words', () => {
    for (const [name, a] of Object.entries(THINK_STEP)) {
      if (typeof a !== 'string') expect(a.not.trim().length, name).toBeGreaterThan(20);
      else expect(THINKING_STEPS[a], name).toBeDefined();
    }
  });

  it('every step is served by computers', () => {
    const served = new Set(Object.values(THINK_STEP).filter((a): a is ThinkingStep => typeof a === 'string'));
    for (const step of Object.keys(THINKING_STEPS)) expect(served.has(step as ThinkingStep), step).toBe(true);
  });

  it('a board computer wired into the steps serves a step; one that serves a step and is not wired says why', () => {
    for (const [id, spec] of Object.entries(BOARD_COMPUTERS) as [string, { computer: ComputerName; surfaces: { think: { wired?: string; not?: string } } }][]) {
      const step = thinkStepOf(spec.computer);
      if (spec.surfaces.think.wired) expect(step, `${id} is wired into How to think but its computer serves no step`).not.toBeNull();
      else expect(spec.surfaces.think.not?.trim().length, id).toBeGreaterThan(10);
    }
  });

  it('on real boards the steps are taught, and only by their own computers', () => {
    const notes: Array<{ lineSan: string[] }> = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')).notes;
    const taught = new Set<ThinkingStep>();
    let checked = 0;
    notes.forEach((n, k) => {
      if (k % 500 !== 0 || n.lineSan.length < 2) return;
      const c = new Chess();
      let theirLast: { fenBefore: string; san: string } | null = null;
      try {
        for (let i = 0; i < n.lineSan.length - 1; i++) {
          const fb = c.fen();
          const mv = c.move(n.lineSan[i]);
          if (i === n.lineSan.length - 2) theirLast = { fenBefore: fb, san: mv.san };
        }
      } catch { return; }
      const fen = c.fen();
      let mv;
      try { mv = new Chess(fen).move(n.lineSan[n.lineSan.length - 1]); } catch { return; }
      const pv = [`${mv.from}${mv.to}${mv.promotion ?? ''}`];
      for (const step of Object.keys(THINKING_STEPS) as ThinkingStep[]) {
        const asked = step === 'their-move-changed'
          ? (theirLast ? { fenBefore: theirLast.fenBefore, san: theirLast.san, moverIsStudent: false } : null)
          : { fenBefore: fen, san: mv.san, moverIsStudent: true };
        const out = stepThought(step, { fen, pv, played: null, theirLast }, asked ? { register: 'review' as const, namesPlayedMove: true,
          ...asked, prev: NO_PREV_CAPTURE, line: null, theirLast: asked.moverIsStudent ? theirLast : null, history: [],
          story: false, reads: null, costCp: null, theory: false, plainThreatsSeen: false,
        } : null);
        for (const f of out.kept) expect(thinkStepOf(f.computer), `${step} said ${f.computer}: ${f.text}`).toBe(step);
        if (out.spoken.trim()) taught.add(step);
        if (process.env.THINK_PROBE && out.spoken.trim()) console.log('STEP', step, '|', fen, '|', out.spoken);
        checked += 1;
      }
    });
    expect(checked).toBeGreaterThan(80);
    // Not vacuous: most steps find something to teach on real boards.
    expect(taught.size, [...taught].join(', ')).toBeGreaterThanOrEqual(6);
  }, 60_000);
});
