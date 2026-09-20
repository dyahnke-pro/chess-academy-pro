// WO-LOOP-01 — THE RECORD HALF OF THE LOOP HAS ONE DOOR, AND THE REVIEW PATH
// GOES THROUGH IT. `audit-loop-closes-prod` measured two real games opened in
// review on prod and found ZERO misconception rows: `analyzeSingleGame` wrote
// the annotations and never recorded. This proves a real row comes OUT of the
// door for a review-shaped game, and that the review path calls the door.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { generateInsightsForGame } from './gameAnalysisService';
import type { GameRecord, MoveAnnotation } from '../types';

// The review's own Alapin fixture: Black's 6...Nb6 is the flagged move (same
// piece for the third time, space on d5 conceded, a tempo handed over).
const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function annotations(): MoveAnnotation[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    const black = i % 2 === 1;
    const flagged = i === 11;
    return {
      moveNumber: Math.floor(i / 2) + 1,
      color: black ? 'black' : 'white',
      san,
      classification: flagged ? 'mistake' : 'book',
      evaluation: flagged ? 90 : 0,
      bestMoveEval: flagged ? -20 : 0,
      bestMove: flagged ? 'e7e6' : null,
      fen: c.fen(),
    } as unknown as MoveAnnotation;
  });
}

describe('generateInsightsForGame — the record half of the loop (WO-LOOP-01)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset?.();
  });

  it('a review-shaped imported game (declared seat, no username) records a fundamental row for the flagged student move', async () => {
    const ann = annotations();
    const game: GameRecord = {
      id: 'review-first-open', pgn: SANS.join(' '), white: 'Rossi, Anna', black: 'The Student', result: '1-0',
      date: '2026.09.03', source: 'chesscom', studentSide: 'black', annotations: ann, fullyAnalyzed: true,
    } as unknown as GameRecord;
    await db.games.add(game);

    const out = await generateInsightsForGame(game.id, game.source, ann, { habits: false });

    const rows = await db.misconceptionTags.where('sourceGameId').equals(game.id).toArray();
    expect(rows.length).toBeGreaterThan(0);
    expect(out.misconceptionsLogged).toBe(rows.length);
    const ids = rows.map((r) => r.fundamentalId).filter(Boolean);
    expect(ids).toEqual(expect.arrayContaining(['same-piece-twice']));
  });

  it('is idempotent per game — the deepening pass after the sweep does not double-record', async () => {
    const ann = annotations();
    const game = {
      id: 'twice', pgn: SANS.join(' '), white: 'Rossi, Anna', black: 'The Student', result: '1-0',
      date: '2026.09.03', source: 'chesscom', studentSide: 'black', annotations: ann, fullyAnalyzed: true,
    } as unknown as GameRecord;
    await db.games.add(game);
    await generateInsightsForGame(game.id, game.source, ann, { habits: false });
    const first = await db.misconceptionTags.where('sourceGameId').equals(game.id).count();
    await generateInsightsForGame(game.id, game.source, ann, { habits: false });
    const second = await db.misconceptionTags.where('sourceGameId').equals(game.id).count();
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it('negative control: a game with no flagged student move records nothing', async () => {
    const ann = annotations().map((a) => ({ ...a, classification: 'book', bestMove: null }));
    const game = {
      id: 'clean', pgn: SANS.join(' '), white: 'Rossi, Anna', black: 'The Student', result: '1-0',
      date: '2026.09.03', source: 'chesscom', studentSide: 'black', annotations: ann, fullyAnalyzed: true,
    } as unknown as GameRecord;
    await db.games.add(game);
    const out = await generateInsightsForGame(game.id, game.source, ann as MoveAnnotation[], { habits: false });
    expect(out.misconceptionsLogged).toBe(0);
    expect(await db.misconceptionTags.where('sourceGameId').equals(game.id).count()).toBe(0);
  });

  it('the review path records BEHIND the open — never in front of the student', () => {
    const src = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    const start = src.indexOf('export async function analyzeSingleGame(');
    // Bound by the NEXT export, not the first `\n}\n` — that lands inside a
    // nested block and silently reads an empty body.
    const end = src.indexOf('export function gameNeedsAnalysis', start);
    expect(end, 'the function boundary must be findable').toBeGreaterThan(start);
    const body = src.slice(start, end);
    // `analyzeSingleGame` is what the review page awaits before the walk is
    // startable. Awaiting the sweep here put puzzle generation, attribution and
    // a dossier refresh in front of the student — measured 2026-09-20 as ~250s
    // on the walk. It must be detached.
    expect(body, 'the recording must be fire-and-forget').toMatch(/void generateInsightsForGame\(/);
    expect(body, 'no awaited recording in the path the walk waits on').not.toMatch(/await generateInsightsForGame\(/);
  });

  it('the review path (analyzeSingleGame) calls the door — not only the batch', () => {
    const src = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    // The review path's call carries `game.source` + the sweepOnly-gated habits
    // flag; the batch path's carries `game.id, game.source, …annotations`. Both
    // must exist — one door, two callers.
    expect(src).toMatch(/generateInsightsForGame\(gameId, game\.source, annotations, \{ habits: !opts\?\.sweepOnly \}\)/);
    expect(src.match(/generateInsightsForGame\(game\.id, game\.source, /g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
