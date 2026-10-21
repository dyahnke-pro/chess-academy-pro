import { describe, expect, it } from 'vitest';
import modelGames from '../../src/data/model-games.json';
import { aggregate, gameFromPgn, minePatterns, parsePgn, scanGame, serializeReport, shrunkRate, splitPgnGames, type MineGame } from './mineCore';
import type { PatternId } from '../../src/missions/missionCard';

/** A small fixture PGN set: real master games from the app's own model-game
 *  file, written out as PGN with tags, move numbers, a comment, a NAG and a
 *  variation — the shapes the parser must survive. */
function fixturePgn(): string {
  const rows = (modelGames as Array<{ id: string; pgn: string }>).slice(0, 4);
  return rows.map((g, i) => {
    const sans = g.pgn.split(/\s+/).filter(Boolean);
    const moves = sans.map((s, j) => (j % 2 === 0 ? `${j / 2 + 1}. ${s}` : s));
    moves.splice(3, 0, '{a comment (with parentheses)}', '$1', `(${j0(sans)})`);
    return `[Event "fixture ${i}"]\n[Site "${g.id}"]\n[Result "*"]\n\n${moves.join(' ')} *\n`;
  }).join('\n');
}
const j0 = (sans: readonly string[]): string => `2... ${sans[3] ?? ''}`;

function fixtureGames(): MineGame[] {
  return splitPgnGames(fixturePgn()).map((pgn) => {
    const site = /\[Site "([^"]+)"\]/.exec(pgn)?.[1] ?? 'x';
    const g = gameFromPgn('fixture', site, pgn);
    if (!g) throw new Error('fixture game did not parse');
    return g;
  });
}

const FEW: readonly PatternId[] = ['free-piece', 'pin', 'connect-rooks', 'kr-box-mate'];

describe('the pattern miner core', () => {
  it('reads a PGN: tags kept, comments, NAGs, variations and move numbers dropped', () => {
    const { tags, sans } = parsePgn('[Event "x"]\n[White "a"]\n\n1. e4 {best by test} e5 $1 2. Nf3 (2. f4 exf4) Nc6!? 3. Bb5 1-0');
    expect(tags).toEqual({ Event: 'x', White: 'a' });
    expect(sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  });

  it('ranks openings shrunk toward the overall rate: one game seen once never tops a well-sampled family', () => {
    // The rare-pattern case from the real mine: 1 of 1 against 4 of 41, overall 0.6%.
    expect(shrunkRate(1, 1, 0.006)).toBeLessThan(shrunkRate(4, 41, 0.006));
    // A big family sits near its own rate, an unseen one at the overall rate.
    expect(shrunkRate(400, 1000, 0.1)).toBe(402 / 1020);
    expect(shrunkRate(0, 0, 0.1)).toBe(0.1);
  });

  it('a game set up from a position is not mined (the opening lookup needs move one)', () => {
    expect(gameFromPgn('x', 'y', '[SetUp "1"]\n[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n\n1. Kb1 *')).toBeNull();
  });

  it('the fixture PGNs parse back to the model games they were written from', () => {
    const games = fixtureGames();
    const rows = (modelGames as Array<{ id: string; pgn: string }>).slice(0, 4);
    expect(games.map((g) => g.id)).toEqual(rows.map((r) => r.id));
    games.forEach((g, i) => expect(g.sans).toEqual(rows[i].pgn.split(/\s+/).filter(Boolean)));
  });

  it('is deterministic: the same games give byte-identical reports, threaded or not', () => {
    const games = fixtureGames();
    const a = minePatterns(games, FEW).map(serializeReport);
    const b = minePatterns(games, FEW).map(serializeReport);
    expect(a).toEqual(b);
    // Scanned out of order (as worker shards do) and folded in game order: same bytes.
    const scans = [...games.keys()].reverse().map((i) => ({ i, scan: scanGame(games[i], FEW) }))
      .sort((x, y) => x.i - y.i).map(({ scan }) => scan);
    expect(aggregate(scans, FEW).map(serializeReport)).toEqual(a);
  }, 60_000);

  it('every reported board is a real board from those games, and every twin reads false', async () => {
    const { PATTERN_PROBES } = await import('../../src/missions/patterns/index');
    const reports = minePatterns(fixtureGames(), FEW);
    for (const r of reports) {
      expect(r.gamesScanned).toBe(4);
      expect(r.arrivalRate).toBe(Math.round((r.gamesWithPattern / 4) * 1e4) / 1e4);
      for (const t of r.failTwins) {
        expect(r.nearMissCodes).toContain(t.missing);
        expect(PATTERN_PROBES[r.id].present(t.fen, t.side), `${r.id} ${t.fen}`).toBe(false);
      }
    }
    // Connected rooks arise in master games: the miner must find them.
    expect(reports.find((r) => r.id === 'connect-rooks')?.gamesWithPattern).toBeGreaterThan(0);
  }, 60_000);
});
