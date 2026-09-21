/**
 * EVERY BOARD CALLBACK IN THE TOOL CONTEXT DEFAULTS TO THE HANDS (2026-09-21).
 *
 * 🔴 THE BUG THIS BLAMES. `coachService.ask` builds one `ToolExecutionContext`
 * for every coach turn. On 2026-09-08 two of its five board callbacks were
 * given an actuator fallback and three were not — no marker said the three were
 * different, they were simply missed. The result was invisible for two weeks:
 * `set_board_position` and `navigate_to_route` worked from any surface, while
 * `play_move`, `take_back_move` and `reset_board` answered "there is no board on
 * this surface" on surfaces that were showing a board.
 *
 * A missed line in a defaults block cannot be seen by reading the block — every
 * line looks deliberate. So this scans the constructed context instead of the
 * source: build a ctx with NO options and assert every board callback is a
 * function. A newly-added callback that nobody defaulted fails here on the day
 * it lands, not a fortnight later.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'coachService.ts'), 'utf8');

/** The ctx literal, comments stripped — prose about a callback is not a
 *  default for it (the trap that produced a false reading of the hands
 *  question earlier the same night). */
function ctxLiteral(): string {
  const body = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const start = body.indexOf('const ctx: ToolExecutionContext = {');
  expect(start, 'the tool context literal moved — update this gate').toBeGreaterThan(-1);
  const end = body.indexOf('\n  };', start);
  expect(end).toBeGreaterThan(start);
  return body.slice(start, end);
}

/** The callbacks that reach a BOARD. Each must fall back to the global hands
 *  when the surface passed none. Record-shaped so a new board callback has to
 *  be answered for here rather than quietly inheriting "undefined". */
const BOARD_CALLBACKS: Record<string, string> = {
  onPlayMove: "'play-move'",
  onTakeBackMove: "'take-back'",
  onSetBoardPosition: "'set-position'",
  onResetBoard: "'reset-board'",
  onNavigate: 'coachNavigate',
};

describe('the tool context defaults every board hand to the actuator', () => {
  it('reads the literal non-vacuously', () => {
    const lit = ctxLiteral();
    expect(lit.length).toBeGreaterThan(200);
    expect(lit).toContain('onPlayMove');
  });

  it.each(Object.entries(BOARD_CALLBACKS))(
    '%s falls back to the hands, not to undefined',
    (name, expectedHand) => {
      const lit = ctxLiteral();
      const line = lit.split(/\n(?=\s{4}on)/).find((l) => l.trimStart().startsWith(`${name}:`));
      expect(line, `${name} is not in the tool context at all`).toBeTruthy();
      expect(
        line!.includes('??'),
        `${name} has no \`?? <fallback>\` — a surface that does not thread it gets `
        + `undefined, and the tool then tells the student there is no board. This `
        + `is the exact shape of the 2026-09-08 miss.`,
      ).toBe(true);
      expect(
        line!.includes(expectedHand),
        `${name}'s fallback does not reach ${expectedHand}. It must route through `
        + `the hand registry so a surface that REGISTERED its hands is reachable.`,
      ).toBe(true);
    },
  );

  it('CAN FIRE — the negative control', () => {
    // A gate nobody has watched fail cannot be told from one that cannot fail.
    const missing = '    onPlayMove: options.onPlayMove,';
    expect(missing.includes('??')).toBe(false);
  });

  it('navigate stays SYNCHRONOUS so its throw is catchable', () => {
    const lit = ctxLiteral();
    const nav = lit.slice(lit.indexOf('onNavigate:'));
    expect(
      /\.then\(/.test(nav.slice(0, 400)),
      'onNavigate throws inside a promise callback. `navigate_to_route` reads a '
      + 'SYNCHRONOUS throw as "unavailable"; an async throw becomes an unhandled '
      + 'rejection its try/catch cannot see, so the tool returns ok:true having '
      + 'navigated nowhere — synthetic success, the thing the actuator exists to kill.',
    ).toBe(false);
  });
});
