// 🔒 EVERY SEAT RESOLVER READS THE DECLARED SEAT FIRST (WO-LOOP-01, 2026-09-20).
// `GameRecord.studentSide` exists so no path has to guess the student's side
// from names. Four functions resolve a game's seat; on 2026-09-20 only one read
// the field, and the weakness spine used one of the other three — so a game the
// app KNEW still had an unknown opponent in every recurrence sentence. A
// convention rots; this gate blames by STATEMENT: each resolver's body must
// test `studentSide` before its first name comparison.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const RESOLVERS: Array<{ file: string; fn: string }> = [
  { file: 'src/services/playerIdentity.ts', fn: 'export function resolvePlayerColor(' },
  { file: 'src/services/conversionDetector.ts', fn: 'export function resolvePlayerColor(' },
  { file: 'src/services/tacticClassifierService.ts', fn: 'function resolvePlayerColor(' },
  { file: 'src/services/mistakePuzzleService.ts', fn: 'export function determinePlayerColor(' },
  { file: 'src/services/gameInsightsService.ts', fn: 'function getPlayerColorWithUsername(' },
];

describe('seat resolvers read GameRecord.studentSide before guessing from names', () => {
  for (const { file, fn } of RESOLVERS) {
    it(`${file} — ${fn.trim()}`, () => {
      const src = readFileSync(file, 'utf8');
      const start = src.indexOf(fn);
      expect(start, `resolver not found: ${fn}`).toBeGreaterThan(-1);
      const body = src.slice(start, start + 1400);
      const seatAt = body.indexOf('studentSide');
      const nameAt = Math.min(...['game.white', 'game.black', 'profile.name'].map((t) => { const i = body.indexOf(t); return i < 0 ? Infinity : i; }));
      expect(seatAt, 'reads studentSide').toBeGreaterThan(-1);
      expect(seatAt, 'studentSide is read BEFORE the first name comparison').toBeLessThan(nameAt);
    });
  }
});
