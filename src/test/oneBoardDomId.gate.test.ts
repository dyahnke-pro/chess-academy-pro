import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EVERY BOARD MOUNT PASSES ITS OWN DOM ID (`boardDomId.ts`). react-chessboard
 * finds a touched square by element id and defaults that id to `chessboard`,
 * so a second board on screen took no taps on a phone (David's K+Q try board,
 * 2026-10-23). A new `<Chessboard` without `id: boardDomId` fails here.
 */
const SRC = join(process.cwd(), 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [p] : [];
  });
}

describe('one DOM id per board', () => {
  const mounts = files(SRC)
    .map((p) => ({ p, s: readFileSync(p, 'utf8') }))
    .filter(({ s }) => /import \{[^}]*\bChessboard\b[^}]*\} from 'react-chessboard'/.test(s))
    .flatMap(({ p, s }) => [...s.matchAll(/<Chessboard\b([\s\S]{0,200})/g)].map((m) => ({ file: p.slice(SRC.length + 1), head: m[1] })));

  it('finds the board mounts (not vacuous)', () => {
    expect(mounts.length).toBeGreaterThanOrEqual(4);
  });

  it('every react-chessboard mount passes `id: boardDomId`', () => {
    const missing = mounts.filter((m) => !/options=\{\{\s*id: boardDomId,/.test(m.head)).map((m) => m.file);
    expect(missing).toEqual([]);
  });
});
