// openingRecordBeat — review opens with the student's record in the opening
// (WO-HOME-OPENING-01 A8). Every number is read off the need context; a first
// game says nothing about its record.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { departureRecordSentence, openingRecordClause } from './openingRecordBeat';
import { lineFenKeys } from './studentNeedLoader';
import type { BookDepartureRow } from './bookDepartureWeakness';
import { openingKeyFor } from './openingKey';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const LINE = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'O-O', 'Bd3', 'Na6'];
const afterPlies = (n: number): string => { const c = new Chess(); for (const s of LINE.slice(0, n)) c.move(s); return c.fen(); };
const row = (gameId: string, over: Partial<BookDepartureRow> = {}): BookDepartureRow => ({
  gameId, departurePly: 12, departedSan: 'Na6', mainSan: 'Nc6', bookFen: afterPlies(11), evalCostCp: 80, openingId: PIRC, playedAt: 1, ...over,
});

describe('openingRecordClause', () => {
  it('names the count, the score when it exists, and the home opening', () => {
    expect(openingRecordClause({ family: 'Pirc Defense', gameId: 'g', ctx: { openingGames: 63, openingScore: 0.49, homeOpening: true, bookDepartures: [] } }))
      .toBe('your 63rd Pirc Defense, 49% so far — your home opening');
    expect(openingRecordClause({ family: 'Pirc Defense', gameId: 'g', ctx: { openingGames: 2, openingScore: null, homeOpening: false, bookDepartures: [] } }))
      .toBe('your 2nd Pirc Defense');
    expect(openingRecordClause({ family: 'Pirc Defense', gameId: 'g', ctx: { openingGames: 11, openingScore: 0.5, bookDepartures: [] } }))
      .toBe('your 11th Pirc Defense, 50% so far');
  });
  it('is silent on a first game or an unknown count (never "your 1st")', () => {
    expect(openingRecordClause({ family: 'Pirc Defense', gameId: 'g', ctx: { openingGames: 1, openingScore: null, bookDepartures: [] } })).toBeNull();
    expect(openingRecordClause({ family: 'Pirc Defense', gameId: 'g', ctx: { bookDepartures: [] } })).toBeNull();
  });
});

describe('departureRecordSentence', () => {
  const keys = lineFenKeys(LINE);
  it('this game left book, and the student has left book at the SAME board before', () => {
    const ctx = { bookDepartures: [row('this'), row('g1'), row('g2', { departedSan: 'Qe7' })], lineFenKeys: keys };
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: 'this', ctx }))
      .toBe('You left book at move 6 again — …Na6 instead of …Nc6, the 3rd time here.');
  });
  it('a first departure here says so without "again"', () => {
    const ctx = { bookDepartures: [row('this'), row('g1', { bookFen: afterPlies(7), departurePly: 8 })], lineFenKeys: keys };
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: 'this', ctx }))
      .toBe('You left book at move 6 — …Na6 instead of …Nc6.');
  });
  it('silent when this game has no departure row, the row is off this line, or the line is unknown', () => {
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: 'this', ctx: { bookDepartures: [row('g1')], lineFenKeys: keys } })).toBeNull();
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: 'this', ctx: { bookDepartures: [row('this', { bookFen: 'x' })], lineFenKeys: keys } })).toBeNull();
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: 'this', ctx: { bookDepartures: [row('this')] } })).toBeNull();
    expect(departureRecordSentence({ family: 'Pirc Defense', gameId: null, ctx: { bookDepartures: [row('this')], lineFenKeys: keys } })).toBeNull();
  });
});
