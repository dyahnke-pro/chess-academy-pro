import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * THE ONE BOARD BAR ON EVERY BOARD SCREEN (WO-PLATFORM-01, David: "unified
 * means same name, looks, feel, code all the same. No exceptions"). Every
 * screen outside the kids section that renders a board the student moves on,
 * or a board with its own stepping / playback controls, renders
 * `CoachBoardBar` directly under it — the same six buttons in the same order,
 * a null handler greyed — and its own controls ride in the bar's extras row.
 * `LessonScaffold` counts: its `bar` prop is required and it renders the bar
 * itself, so every player built on it carries the bar by construction.
 *
 * The Play-line button is THE one button the bar owns: no screen renders a
 * `PlayLineButton` of its own.
 */
const COMPONENTS = join(process.cwd(), 'src', 'components');

/** The board primitives themselves, and the bar's own parts. */
const PRIMITIVES = new Set([
  'Board/ChessBoard.tsx',
  'Board/ControlledChessBoard.tsx',
  'Board/CoachBoardBar.tsx',
  'Board/PlayLineButton.tsx',
  'Chessboard/ConsistentChessboard.tsx',
  'Chessboard/KidChessboard.tsx',
]);

/** Genuine exceptions — each says why. Keep this tiny. */
const ALLOWLIST: Record<string, string> = {};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'Kid' ? [] : files(p);
    return /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [p] : [];
  });
}

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const BOARD_TAG = /<(ConsistentChessboard|ChessBoard|ControlledChessBoard|Chessboard)\b([\s\S]*?)\/>/g;
/** A board the student moves on: a move handler, or `interactive` not literally false. */
const TAKES_MOVES = /\bon(Move|PieceDrop|SquareClick)=|\binteractive(?!=\{false\})(?=[\s=>/])/;
/** A board screen with its own stepping / playback controls. */
const STEPS = /import \{[^}]*\b(ChevronLeft|ChevronsLeft|SkipBack|SkipForward|Pause)\b[^}]*\} from 'lucide-react'/;

interface Verdict { board: boolean; hasBar: boolean; ownPlayLine: boolean }

/** Pure: what one source file renders. */
export function scanSource(source: string): Verdict {
  const s = stripComments(source);
  const tags = [...s.matchAll(BOARD_TAG)];
  const takesMoves = tags.some((m) => TAKES_MOVES.test(m[2]));
  const board = tags.length > 0 && (takesMoves || STEPS.test(s) || /<PlayLineButton\b/.test(s));
  const hasBar = /<CoachBoardBar\b/.test(s) || /<LessonScaffold\b/.test(s);
  return { board, hasBar, ownPlayLine: /<PlayLineButton\b/.test(s) };
}

describe('one board bar on every board screen (WO-PLATFORM-01)', () => {
  const scanned = files(COMPONENTS)
    .map((p) => ({ file: p.slice(COMPONENTS.length + 1), ...scanSource(readFileSync(p, 'utf8')) }))
    .filter(({ file }) => !PRIMITIVES.has(file));
  const boards = scanned.filter((f) => f.board);

  it('finds the board screens (not vacuous)', () => {
    expect(boards.length).toBeGreaterThanOrEqual(25);
  });

  it('every board screen renders the one board bar', () => {
    const missing = boards.filter((f) => !f.hasBar && !(f.file in ALLOWLIST)).map((f) => f.file);
    expect(missing).toEqual([]);
  });

  it('no screen renders a Play-line button of its own — the bar owns it', () => {
    expect(scanned.filter((f) => f.ownPlayLine).map((f) => f.file)).toEqual([]);
  });

  it('the scaffold carries the bar by construction: a required `bar`, rendered', () => {
    const scaffold = readFileSync(join(COMPONENTS, 'Openings', 'LessonScaffold.tsx'), 'utf8');
    expect(scaffold).toMatch(/^\s*bar: CoachBoardBarProps;/m);
    expect(scaffold).toMatch(/<CoachBoardBar \{\.\.\.bar\} \/>/);
  });

  it('every allowlisted file is still a board screen without the bar (no stale entries)', () => {
    for (const file of Object.keys(ALLOWLIST)) {
      const hit = scanned.find((f) => f.file === file);
      expect(hit?.board && !hit.hasBar, file).toBe(true);
    }
  });

  it('negative control: a synthetic offender is flagged', () => {
    const offender = `
      import { ChevronLeft } from 'lucide-react';
      export function Offender() {
        return (<div>
          <ConsistentChessboard fen={fen} interactive={phase === 'move'} onPieceDrop={drop} />
          <button onClick={prev}><ChevronLeft /></button>
        </div>);
      }`;
    expect(scanSource(offender)).toEqual({ board: true, hasBar: false, ownPlayLine: false });
    expect(scanSource(offender.replace('<button', '<CoachBoardBar onBack={prev} /><button')).hasBar).toBe(true);
    // A static, buttonless thumbnail is not a board screen.
    expect(scanSource(`<ConsistentChessboard fen={fen} interactive={false} />`).board).toBe(false);
    // A screen with its own Play-line button is caught.
    expect(scanSource(`<ConsistentChessboard fen={f} /><PlayLineButton onPlay={p} />`).ownPlayLine).toBe(true);
  });
});
