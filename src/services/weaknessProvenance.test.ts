// CAPABILITY PARITY — provenance on EVERY weakness signal (David 2026-09-16:
// "if tactics and puzzles have something so should everything else").
//
// `MistakePuzzle` and `ClassifiedTactic` carried `opponentName` + `gameDate` all
// along; the spine threw them away, and six other sources never had them. These
// tests prove a REAL value comes OUT of each aggregator, per CLAUDE.md's "a wire
// that does not fire is not a wire" — the shape existing is not the point.
import { describe, it, expect } from 'vitest';
import {
  aggregateMistakePuzzles, aggregateClassifiedTactics, aggregateOpeningWeakSpots,
  aggregateConversionFailures, aggregateTimeTrouble, playedAtMs,
  type GameProvenanceIndex,
} from './weaknessSpine';
import { aggregateBookDepartures, type BookDepartureRow } from './bookDepartureWeakness';
import { buildMistakePuzzle } from '../test/factories';
import type { ClassifiedTactic, OpeningWeakSpot } from '../types';

const INDEX: GameProvenanceIndex = new Map([
  ['game_1', { opponentName: 'KaiserlicheHoheit', playedAt: Date.parse('2024-03-02') }],
]);

describe('provenance — the sources that always had it', () => {
  it('mistake puzzles carry the opponent and the PLAY date', () => {
    const rows = aggregateMistakePuzzles([
      buildMistakePuzzle({ opponentName: 'KaiserlicheHoheit', gameDate: '2024-03-02' }),
    ]);
    const from = rows[0].positions[0].from;
    expect(from.origin).toBe('game');
    expect(from.opponentName).toBe('KaiserlicheHoheit');
    expect(from.playedAt).toBe(Date.parse('2024-03-02'));
    expect(from.gameId).toBe('game_1');
  });

  it('classified tactics carry theirs too', () => {
    const t = {
      id: 't1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      tacticType: 'fork', playerMoveSan: 'd3', bestMoveSan: 'Ng5', createdAt: '2026-01-01',
      opponentName: 'Hikaru', gameDate: '2024-05-05', puzzleSuccesses: 0,
    } as unknown as ClassifiedTactic;
    const from = aggregateClassifiedTactics([t])[0].positions[0].from;
    expect(from.opponentName).toBe('Hikaru');
    expect(from.playedAt).toBe(Date.parse('2024-05-05'));
  });
});

describe('provenance — the sources that had a gameId but no names', () => {
  it('conversion failures resolve the opponent through the game index', () => {
    const rows = aggregateConversionFailures(
      [{ gameId: 'game_1', fen: '8/8/8/8/8/8/8/K6k w - - 0 1', peakCp: 400, finalCp: 0, date: '2024-03-02' } as never],
      [],
      INDEX,
    );
    expect(rows[0].positions[0].from.opponentName).toBe('KaiserlicheHoheit');
  });

  it('time-trouble hits resolve BOTH the opponent and the date through the index', () => {
    const rows = aggregateTimeTrouble([{ gameId: 'game_1', fen: '8/8/8/8/8/8/8/K6k w - - 0 1' } as never], INDEX);
    const from = rows[0].positions[0].from;
    expect(from.opponentName).toBe('KaiserlicheHoheit');
    expect(from.playedAt).toBe(Date.parse('2024-03-02'));
  });

  it('book departures resolve the opponent through the injected lookup', () => {
    const row: BookDepartureRow = {
      gameId: 'game_1', departurePly: 5, departedSan: 'Nb6', mainSan: 'e6',
      bookFen: 'r1bqkb1r/pp2pppp/2n5/3n4/3P4/2N2N2/PP3PPP/R1BQKB1R b KQkq - 1 7',
      evalCostCp: 200, openingId: 'alapin', openingName: 'Alapin', playedAt: Date.parse('2024-03-02'),
    };
    const rows = aggregateBookDepartures([row, { ...row, gameId: 'game_1' }], 1400, (id) => INDEX.get(id)?.opponentName ?? null);
    expect(rows[0].positions[0].from.opponentName).toBe('KaiserlicheHoheit');
    expect(rows[0].positions[0].from.playedAt).toBe(Date.parse('2024-03-02'));
  });
});

describe('provenance — honest answers, never guesses', () => {
  it('a repertoire DRILL says drill, and names no opponent', () => {
    const spot = {
      id: 'w1', openingId: 'alapin', openingName: 'Alapin',
      fen: 'r1bqkb1r/pp2pppp/2n5/3n4/3P4/2N2N2/PP3PPP/R1BQKB1R b KQkq - 1 7',
      correctMoveSan: 'e6', failCount: 3, lastFailedAt: '2026-02-02', lastDrilledAt: null,
    } as unknown as OpeningWeakSpot;
    const from = aggregateOpeningWeakSpots([spot], Date.parse('2026-03-01'))[0].positions[0].from;
    expect(from.origin).toBe('drill');
    expect(from.opponentName).toBeUndefined();
  });

  it('an unresolvable game yields NO name rather than the wrong one', () => {
    const rows = aggregateTimeTrouble([{ gameId: 'never-seen', fen: '8/8/8/8/8/8/8/K6k w - - 0 1' } as never], INDEX);
    expect(rows[0].positions[0].from.opponentName).toBeNull();
    expect(rows[0].positions[0].from.playedAt).toBeUndefined();
  });
});

// 🔒 THE CLOCK RULE. `createdAt` is when the APP recorded the slip; on an
// imported archive that is the day the user hit Import, so a three-year archive
// would every row read "earlier today". Anything the student hears must come
// from the PLAY clock.
describe('provenance reads the play clock, never the capture clock', () => {
  it('a slip analyzed today from a game played years ago dates to the GAME', () => {
    const rows = aggregateMistakePuzzles([
      buildMistakePuzzle({ gameDate: '2021-06-01', createdAt: '2026-09-16T12:00:00.000Z' }),
    ]);
    expect(rows[0].positions[0].from.playedAt).toBe(Date.parse('2021-06-01'));
  });

  it('playedAtMs refuses to invent a time', () => {
    expect(playedAtMs(null)).toBeUndefined();
    expect(playedAtMs('')).toBeUndefined();
    expect(playedAtMs('not-a-date')).toBeUndefined();
  });
});
