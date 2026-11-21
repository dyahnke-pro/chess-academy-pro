// GATE: ONE SHORTENER (David 2026-11-21: "Unify the shortener"). How much of a
// line the student hears is decided by `recordShortening.shortenLevel` and
// nothing else. Four doors each read the record their own way before this —
// Learn by skill only, the board read and the lesson composer not at all — so
// a proven skill was quiet in Review and taught in full everywhere else.
//
// It fails when: a file reads a raw fade level outside the shortener (a fifth
// rule), or a door stops calling the one shortener.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}
const strip = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// The raw lookup lives in the leaf and the shortener. Learn's POINTER rule
// reads it by design: a pointer at a skill is said while THAT skill is not
// proven (`pointerSpeaks`) — a question, not a line being shortened.
const RAW_ALLOWED = new Set(['src/services/fadeText.ts', 'src/services/recordShortening.ts', 'src/services/learnTurnDoor.ts']);

/** The four doors: each must shorten through the one rule. */
const DOORS = ['src/services/coachDecider.ts', 'src/services/learnTurnDoor.ts', 'src/services/readDecider.ts', 'src/services/thoughtComposer.ts'];

describe('one shortener', () => {
  it('no file reads a raw fade level outside the shortener', () => {
    const bad = files(ROOT).filter((p) => !RAW_ALLOWED.has(p) && /\bfadeLevelOf\(/.test(strip(readFileSync(p, 'utf8'))));
    expect(bad).toEqual([]);
  });
  it('Learn reads the raw level only for its pointer', () => {
    const uses = strip(readFileSync('src/services/learnTurnDoor.ts', 'utf8')).match(/fadeLevelOf\(/g) ?? [];
    expect(uses.length).toBe(1);
  });
  // A question the student asked is answered in full (`chatAnswersInFull`):
  // the shortener is for narration the coach volunteers, never an answer.
  it('the live board read hands the shortener the record', () => {
    expect(readFileSync('src/services/positionReadComposer.ts', 'utf8')).toMatch(/levels: i\.studentNeedContext/);
  });
  it('every door calls the one shortener', () => {
    const missing = DOORS.filter((p) => !/\bshortenLevel\(/.test(strip(readFileSync(p, 'utf8'))));
    expect(missing).toEqual([]);
  });
});
