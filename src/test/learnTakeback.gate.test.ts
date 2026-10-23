import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LEARN'S TAKEBACK TAKES BACK THE STUDENT'S MOVE (David's iPhone, 2026-10-23:
 * "Now I can't move the pieces"). The bar's button undid ONE ply; once the
 * coach had replied that ply was the coach's, it was the coach's turn and
 * nothing makes the coach move but a student move — the board stuck. Every
 * student takeback on the page goes through `takeBackMine` (the one rule,
 * `ownTakebackPlies`). Fails on the old button, which called `game.undoMove()`.
 */
const PAGE = readFileSync(join(process.cwd(), 'src/components/Coach/CoachTeachPage.tsx'), 'utf8');

describe('Learn\'s Takeback lands on the student\'s turn', () => {
  it('the bar\'s Takeback button takes back through takeBackMine, never a bare undo', () => {
    const button = PAGE.split('\n').find((l) => l.includes('data-testid="teach-takeback"'));
    expect(button).toBeDefined();
    expect(button).toMatch(/onClick=\{\(\) => \{[^}]*takeBackMine\(\)/);
    expect(button).not.toMatch(/undoMove\(/);
    expect(button).toMatch(/disabled=\{[^}]*ownTakebackPlies\(/);
  });

  it('the typed "take that back" step takes back through takeBackMine', () => {
    const step = PAGE.slice(PAGE.indexOf("case 'take-back': {"), PAGE.indexOf("case 'take-back': {") + 200);
    expect(step).toContain('takeBackMine()');
  });

  it('takeBackMine counts with ownTakebackPlies', () => {
    const fn = PAGE.slice(PAGE.indexOf('const takeBackMine = useCallback('), PAGE.indexOf('const takeBackMine = useCallback(') + 400);
    expect(fn).toContain('ownTakebackPlies(');
    expect(fn).toContain('takeBackPlies(n, true)');
  });
});
