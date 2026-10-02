import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { setOpeningPositions, transposedOpening, openingAtPosition } from './openingPositions';
import { detectOpening } from './openingDetectionService';
import { openingAnnouncement, openingNameForBoard } from './openingAnnouncement';

const MAP = JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>;
const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('the transposition reader', () => {
  beforeAll(() => setOpeningPositions(MAP));

  it('the index is fresh: every DB entry is findable at the board it reaches', () => {
    const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8')) as Array<{ name: string; pgn: string }>;
    let missing = 0;
    for (const e of db) {
      const c = new Chess();
      try { for (const s of e.pgn.split(/\s+/).filter(Boolean)) c.move(s); } catch { continue; }
      if (!openingAtPosition(c.fen())) missing += 1;
    }
    expect(missing, 'public/data/opening-positions.json is stale — run scripts/build-opening-positions.mjs').toBe(0);
  }, 60000);

  it('a Queen\'s Gambit reached through the English is named as a transposition', () => {
    const sans = ['c4', 'e6', 'Nc3', 'd5', 'd4'];
    const byOrder = detectOpening(sans);
    const t = transposedOpening(fenOf(sans), sans.length, byOrder);
    expect(t).toMatch(/Queen's Gambit/);
    const { det, transposed } = openingNameForBoard(byOrder, fenOf(sans), sans.length);
    expect(transposed).toBe(true);
    expect(openingAnnouncement(det, null, byOrder?.name ?? 'English Opening', 'w', transposed)).toMatch(/^By a different move order, the game has transposed into the Queen's Gambit/);
  });

  it('the usual move order is not a transposition (negative control)', () => {
    const sans = ['d4', 'd5', 'c4', 'e6', 'Nc3'];
    expect(transposedOpening(fenOf(sans), sans.length, detectOpening(sans))).toBeNull();
  });
});
