// GATE: the out-of-book SPINE-CONTINUATION tripwire (David 2026-06-29). The
// stage-2 check (scripts/ci/check-spine-continuation.cjs) finds lesson lines that
// leave the opening book and then play a move conceding >= 1.0 vs Stockfish's
// best — the "decaying tail" bug class (the Vienna dawdle: +1.0 -> -2.0 with the
// line never losing outright, so terminal-only checks miss it). It writes the
// committed summary src/data/grounding-continuation-flags.json. This gate pins
// that summary against a shrinking baseline: a NEW decaying-tail line (one not
// already grandfathered) fails the build, so the bug class can't silently return.
//
// To update after fixing content: re-run the sweep
//   node scripts/ci/check-spine-continuation.cjs --source lessons
//   (then regenerate grounding-continuation-flags.json) and the count drops.
// The baseline only ever SHRINKS — never add a new key to dodge a real flag.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(__dirname, '..');
const flagsPath = resolve(DATA, 'grounding-continuation-flags.json');
const baselinePath = resolve(DATA, 'grounding', 'groundingContinuation.baseline.json');

interface Flag { name: string; move: string; ply: number; loss: number; isGambit?: boolean }
const key = (f: Flag): string => `${f.name} :: ${f.move}@${f.ply}`;

describe('grounding gate: no new out-of-book decaying-tail lines', () => {
  const data = existsSync(flagsPath)
    ? (JSON.parse(readFileSync(flagsPath, 'utf8')) as { flags: Flag[] })
    : { flags: [] };
  const current = data.flags.map(key);

  it('has the continuation summary built', () => {
    expect(data.flags.length).toBeGreaterThan(0);
  });

  it('every flagged line is grandfathered (no NEW decaying tail)', () => {
    if (process.env.GROUNDING_WRITE_BASELINE === '1') {
      writeFileSync(baselinePath, JSON.stringify([...current].sort(), null, 2) + '\n');
      return;
    }
    const baseline = new Set(
      existsSync(baselinePath) ? (JSON.parse(readFileSync(baselinePath, 'utf8')) as string[]) : [],
    );
    const fresh = current.filter((k) => !baseline.has(k));
    expect(
      fresh,
      `NEW out-of-book decaying-tail line(s) — a lesson now plays a move conceding ` +
        `>= 1.0 vs best after leaving book. Re-spine the tail (DB-then-engine-best) ` +
        `or, if intentional (trap/showcase), justify and baseline:\n` +
        fresh.map((k) => `  ${k}`).join('\n'),
    ).toEqual([]);
  });
});
