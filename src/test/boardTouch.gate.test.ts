import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ONE TOUCH RULE FOR EVERY BOARD THAT TAKES A MOVE (`boardTouch.ts`). The
 * rule was hand-copied into two boards (2026-06-19, 2026-10-02) and missing
 * from the third — the static board that runs an opening's Learn and Practice
 * — so on David's iPhone (2026-11-05) the pawn would not go to f4. A board
 * file that wires a move handler into react-chessboard without reading
 * `boardTouchStyle`, or that writes the rule by hand again, fails here.
 */
const SRC = join(process.cwd(), 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('every move-taking board reads the one touch rule', () => {
  const all = files(SRC).map((p) => ({ file: p.slice(SRC.length + 1), s: stripComments(readFileSync(p, 'utf8')) }));
  const boards = all
    .filter(({ s }) => /import \{[^}]*\bChessboard\b[^}]*\} from 'react-chessboard'/.test(s) && /<Chessboard\b/.test(s))
    .filter(({ s }) => /\bonPieceDrop\b|\bonSquareClick\b/.test(s));

  it('finds the move-taking boards (not vacuous)', () => {
    expect(boards.map((b) => b.file).sort()).toEqual(expect.arrayContaining([
      'components/Board/ChessBoard.tsx',
      'components/Board/ControlledChessBoard.tsx',
      'components/Chessboard/ConsistentChessboard.tsx',
    ]));
  });

  it('each one applies boardTouchStyle', () => {
    const missing = boards.filter((b) => !/boardTouchStyle\(/.test(b.s)).map((b) => b.file);
    expect(missing).toEqual([]);
  });

  it('no file writes the board touch rule by hand', () => {
    const handWritten = all
      .filter((f) => f.file !== 'components/Board/boardTouch.ts')
      .filter((f) => /<Chessboard\b/.test(f.s))
      .filter((f) => /touchAction:\s*'none'|\btouch-none\b|-webkit-touch-callout:none/.test(f.s))
      .map((f) => f.file);
    expect(handWritten).toEqual([]);
  });
});
