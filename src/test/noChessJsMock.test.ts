/**
 * chess.js is never mocked.
 *
 * CLAUDE.md's mocking conventions have said so for a long time — "chess.js: Do
 * NOT mock — use the real library in tests" — and three test files did it
 * anyway. A stub of a library is a SECOND IMPLEMENTATION that has to be kept in
 * step with the first, and nothing makes anyone keep it:
 *
 *   - `AnalysisBoardPage.test.tsx` stubbed a `Chess` class with no `pgn()`. When
 *     `useChessGame` began returning `pgn: chess.pgn()`, every render threw and
 *     all 8 tests went red — on `main`, in no gate list, unnoticed.
 *   - `FlashcardStudyPage.test.tsx` carried the identical stub; 9 of its 15
 *     tests were red for the same reason.
 *   - `dataLoader.test.ts` stubbed `move()` to return a sentinel FEN that no
 *     assertion ever read. It existed only to stop a throw.
 *
 * All three passed against the real library the moment the stub was deleted. So
 * the rule stops being a convention in a markdown file and becomes a gate: real
 * chess.js needs no maintenance and cannot drift out of step with itself.
 *
 * Mock at a real seam instead — `react-chessboard` for rendering, the engine
 * service for analysis. Those are OUR boundaries, and we control their shape.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const MOCK_RE = /vi\.mock\(\s*['"]chess\.js['"]/;

function testFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) testFiles(p, out);
    else if (/\.test\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('chess.js is never mocked', () => {
  it('no test file stubs the chess.js module', () => {
    const files = [
      ...testFiles(join(ROOT, 'src')),
      ...(statSync(join(ROOT, 'api'), { throwIfNoEntry: false }) ? testFiles(join(ROOT, 'api')) : []),
    ];
    // Non-vacuous: if the walker ever stops finding tests, this fails loudly
    // rather than reporting a clean sweep of nothing.
    expect(files.length).toBeGreaterThan(500);
    const offenders = files
      .filter((f) => MOCK_RE.test(readFileSync(f, 'utf-8')))
      .map((f) => f.replace(`${ROOT}/`, ''));
    expect(offenders).toEqual([]);
  });
});
