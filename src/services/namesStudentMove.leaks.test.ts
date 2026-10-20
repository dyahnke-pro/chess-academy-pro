/**
 * LEARN NAMES NO MOVE UNASKED, in words (prod Learn audit on David's record,
 * 2026-10-20). Three producers built a sentence FROM the student's next move
 * and declared it named none, so the door never held them:
 *   (a) "You play castle queenside first, so that a pawn push can hit their pawn on g4"
 *   (b) "Your e-pawn break against their pawn on d4 is ready now"
 *   (c) "How do you find a plan? … So the plan: take their pawn on g4 first"
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skipMiddleman } from './speedRunReads';
import { methodLine, methodPlan, methodRead } from './planChoice';

describe('(b) the break that is ready is announced, not named', () => {
  // Black to move; …c5 is a pawn break against White's pawn on d4.
  const FEN = 'rnbqkbnr/pppp1ppp/4p3/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 1 2';
  it('the idea names neither the pawn nor its target', () => {
    const r = skipMiddleman(FEN, 'c5');
    expect(r?.idea).toBe('A pawn break is ready now — find it. No need to prepare it; every preparing move is a move they get too.');
    expect(r?.idea).not.toMatch(/c-pawn|d4|c5/);
  });
});

describe('(c) the plan method holds the capture it would hand over', () => {
  // White to move; the knight on f2 takes Black's undefended knight on g4.
  const FEN = '4k3/8/8/8/6n1/8/5N2/4K3 w - - 0 1';
  it('held before the move: no square, no "take their pawn on g4"', () => {
    const read = methodRead(FEN, 'w', true)!;
    const said = `${methodLine(read, FEN)} ${methodPlan(read, FEN)?.text ?? ''}`;
    expect(said).not.toMatch(/g4/);
    expect(said).toMatch(/free to take — find it/);
  });
  it('after the move (the review, or once played), the capture is named', () => {
    const read = methodRead(FEN, 'w', false)!;
    expect(methodPlan(read, FEN)?.text).toMatch(/take their knight on g4 first/);
  });
});

describe('(a) a Learn line that draws a "play" arrow declares the move it names', () => {
  it('no queueSpokenHint passes NAMES_NO_MOVE beside a play arrow', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const calls: string[] = [];
    for (let i = src.indexOf('queueSpokenHint('); i >= 0; i = src.indexOf('queueSpokenHint(', i + 1)) {
      let depth = 0; let j = i + 'queueSpokenHint'.length;
      for (; j < src.length; j++) { if (src[j] === '(') depth++; else if (src[j] === ')') { depth--; if (depth === 0) break; } }
      calls.push(src.slice(i, j + 1));
    }
    expect(calls.length).toBeGreaterThan(5);
    // The fifth argument is the naming; a literal NAMES_NO_MOVE there beside a
    // play arrow is the contradiction (a held line that draws nothing may pass it).
    const fifthArg = (call: string): string => {
      const body = call.slice(call.indexOf('(') + 1, -1);
      const args: string[] = []; let depth = 0; let cur = '';
      for (const ch of body) {
        if ('([{'.includes(ch)) depth++;
        if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { args.push(cur); cur = ''; } else cur += ch;
      }
      args.push(cur);
      return (args[4] ?? '').trim();
    };
    const offenders = calls.filter((c) => fifthArg(c) === 'NAMES_NO_MOVE' && /role: 'play'/.test(c));
    expect(offenders).toEqual([]);
  });
});
