/**
 * NO TOOL DESCRIPTION BEGS THE MODEL NOT TO HALLUCINATE (2026-09-21).
 *
 * G0 states the test outright: *"if you are adding a validator, a gate, a
 * regen/retry, a claim-stripper, or a prompt that says 'use exactly these
 * squares / don't hallucinate / cite only the context' — STOP. Every one of
 * those exists only because the LLM is still deciding."*
 *
 * `set_board_position` carried the purest example for months — "Do NOT
 * hand-write an opening FEN from memory … never one you recalled" — sitting
 * next to a validator that measured the wrong property. Both are gone; the tool
 * now takes `moves` (replayed), `named` (resolved from app data) or a `fen` the
 * app provably produced. This keeps the shape from growing back somewhere else,
 * because a begging sentence is cheap to write and reads like diligence.
 *
 * 🚨 WHAT THIS DOES **NOT** BAN, and the distinction is the whole point.
 * A tool's DESCRIPTION is read before the model acts: a plea there is
 * pre-emptive and unenforceable, and it is the disease. A message returned from
 * `execute` is read AFTER code already refused: `chess.js` rejected the move,
 * the corpus had no such position. That is feedback explaining a refusal that
 * already happened, which is exactly what a grounded tool SHOULD say. So this
 * scans declared descriptions only, never the execute body.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIRS = ['cerebrum', 'cerebellum'].map((d) => resolve(__dirname, 'tools', d));

/**
 * Phrases that only make sense as a plea to a deciding model.
 *
 * 🚨 BLAME BY STATEMENT, NOT BY PROXIMITY. A bare /from memory/ was the first
 * cut and it flagged `restoreSavedPosition`, whose description says "The tool
 * reads from memory and calls set_board_position internally" — the app's SAVED
 * position, and a sentence that says code supplies the value, which is the
 * exact opposite of begging. The begging sense always carries a prohibition
 * aimed at the model, so the prohibition is part of the pattern. (Same lesson
 * `perspectiveRule.test.ts` learned when its first cut named four innocent
 * files whose only sin was a comment describing the rule.)
 */
const BEGGING = [
  /(?:do ?n['o]?t|never|avoid)\b[^.]{0,60}\bfrom (?:memory|training)/i,
  /do ?n['o]?t hallucinate/i,
  /never one you recalled/i,
  /do ?n['o]?t (?:hand-?write|make up|fabricate|invent)/i,
  /only the context/i,
];

/** Every `description:` string literal declared in a file — the tool's own
 *  description and each parameter's. Deliberately NOT the execute body. */
function describedStrings(src: string): string[] {
  const out: string[] = [];
  const re = /description:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

function toolFiles(): { path: string; src: string }[] {
  return DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
      .map((f) => ({ path: join(dir, f), src: readFileSync(join(dir, f), 'utf8') })));
}

describe('tool descriptions do not beg', () => {
  it('finds the tools non-vacuously', () => {
    const files = toolFiles();
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => describedStrings(f.src).length > 0)).toBe(true);
  });

  it('no declared description asks the model not to hallucinate', () => {
    const offenders: string[] = [];
    for (const { path, src } of toolFiles()) {
      for (const lit of describedStrings(src)) {
        for (const re of BEGGING) {
          if (re.test(lit)) {
            offenders.push(`${path.split('/').slice(-2).join('/')}: ${lit.slice(0, 110)}`);
          }
        }
      }
    }
    expect(
      offenders,
      'A tool description is read BEFORE the model acts, so a plea there is '
      + 'unenforceable — G0 names it as the disease, not the cure. Compute the '
      + 'value in code and take a reference (a name, a move line, a handle) '
      + 'instead of asking for restraint. `setBoardPosition` is the worked '
      + 'example: `moves` / `named` / a provably app-produced `fen`.',
    ).toEqual([]);
  });

  it('CAN FIRE — the negative control is the sentence that was really there', () => {
    const wasReallyThere = `description: "Do NOT hand-write an opening FEN from memory — opening-phase raw FENs are rejected."`;
    const hits = describedStrings(wasReallyThere).filter((l) => BEGGING.some((re) => re.test(l)));
    expect(hits.length).toBe(1);
  });

  it('does NOT flag a refusal returned from execute', () => {
    // The lie has already collapsed by then; saying why is correct.
    const refusal = `return { ok: false, error: 'this line is not real — do not invent moves.' };`;
    expect(describedStrings(refusal)).toEqual([]);
  });
});
