import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DIFFICULTY_OFFSET,
  STRENGTH_FLOOR,
  OPPONENT_PURPOSE,
  difficultyOffset,
  targetStrength,
  opponentStrength,
  engineEloFor,
  emitOpponentStrength,
  studentPlayingRating,
  type OpponentSurface,
} from './engineStrength';
import { onOpponentMove, type OpponentMoveRow } from './opponentMoveEvents';
import { DIFFICULTY_OFFSET as PUZZLE_OFFSET } from './studentPuzzleRating';
import { getTargetStrength } from './coachGameEngine';
import { resolveConfig } from './coachPlaySession';
import { LIVE_MIN } from './liveStrength';
import { DEFAULT_STUDENT_RATING } from './ratingBands';

describe('ONE engine strength — one table, one floor, one formula', () => {
  it('Easier −200 / Matched 0 / Harder +200', () => {
    expect(DIFFICULTY_OFFSET).toEqual({ easy: -200, medium: 0, hard: 200 });
    expect(difficultyOffset('auto')).toBe(0);
    expect(difficultyOffset(undefined)).toBe(0);
  });

  it('puzzles read the SAME table object, not a copy', () => {
    expect(PUZZLE_OFFSET).toBe(DIFFICULTY_OFFSET);
  });

  it('every opponent answers the same number for the same student + setting', () => {
    for (const elo of [300, 800, 1200, 1500, 2100]) {
      for (const d of ['easy', 'medium', 'hard'] as const) {
        const want = targetStrength(elo, d);
        expect(getTargetStrength(elo, d), `Learn/Openings ${elo} ${d}`).toBe(want);
        expect(resolveConfig(d, elo).targetElo, `Play/play-outs ${elo} ${d}`).toBe(want);
      }
    }
  });

  it('one floor, shared with the live estimate', () => {
    expect(targetStrength(300, 'easy')).toBe(STRENGTH_FLOOR);
    expect(LIVE_MIN).toBe(STRENGTH_FLOOR);
  });

  it('no other module declares its own offset table (it grew back three times)', () => {
    const root = resolve(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) continue;
        if (p.endsWith('engineStrength.ts')) continue;
        if (/const DIFFICULTY_OFFSET\b/.test(readFileSync(p, 'utf8'))) offenders.push(p);
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

describe('the purpose table — every surface declares one, no default', () => {
  it('demos play at FULL strength; sparring and play-outs are matched', () => {
    for (const surface of Object.keys(OPPONENT_PURPOSE) as OpponentSurface[]) {
      const s = opponentStrength(surface, 1200, 'hard');
      if (OPPONENT_PURPOSE[surface] === 'demo') {
        expect(s.target, surface).toBeNull();
        expect(engineEloFor(s)).toBeNull();
      } else {
        expect(s.target, surface).toBe(1400);
        expect(s.offset).toBe(200);
      }
    }
  });

  it('the five demo sites are declared demo, the three sparring surfaces spar', () => {
    for (const d of ['watch-play-out', 'punish-playout', 'opening-matchup', 'model-game-explore', 'middlegame-practice'] as const) {
      expect(OPPONENT_PURPOSE[d]).toBe('demo');
    }
    for (const sp of ['learn', 'play', 'opening-play'] as const) expect(OPPONENT_PURPOSE[sp]).toBe('spar');
    expect(OPPONENT_PURPOSE['endgame-playout']).toBe('play-out');
  });
});

describe('the structured emission', () => {
  let off: (() => void) | null = null;
  afterEach(() => { off?.(); off = null; });

  it('carries target, offset, purpose and surface — and the capped engine Elo', () => {
    const rows: OpponentMoveRow[] = [];
    off = onOpponentMove((r) => rows.push(r));
    emitOpponentStrength(opponentStrength('learn', 1000, 'easy'), 'stockfish-best');
    expect(rows).toEqual([{
      surface: 'learn', purpose: 'spar', studentElo: 1000, difficulty: 'easy',
      offset: -200, target: 800, engineElo: 1320, source: 'stockfish-best',
    }]);
  });
});

describe('studentPlayingRating — the playing rating, never the puzzle Elo', () => {
  it('prefers currentRating, falls back to puzzleRating, then the one default', () => {
    expect(studentPlayingRating({ currentRating: 1300, puzzleRating: 1729 })).toBe(1300);
    expect(studentPlayingRating({ currentRating: null, puzzleRating: 1729 })).toBe(1729);
    expect(studentPlayingRating(null)).toBe(DEFAULT_STUDENT_RATING);
  });
});
