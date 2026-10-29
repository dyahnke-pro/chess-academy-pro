import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { clubRepliesOf, clubRepliesOnTab, valueAtBand, __resetClubReplies, type ClubReplyRecord } from './clubReplies';
import { positionOf } from '../utils/samePosition';
import type { ChapterSubline } from './openingCourse';
import type { FacedIndex } from './facedReplies';

const loadDataJson = vi.fn();
vi.mock('./dataFile', () => ({ loadDataJson: (p: string) => loadDataJson(p) }));

const board = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return positionOf(c.fen());
};
const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'];
const AFTER_BC4 = board(MAIN.slice(0, 5));
const REACH = { '1000,1200': 17.69, '1400,1600': 16.65, '1800,2000': 7.1 };
const rec = (over: Partial<ClubReplyRecord>): ClubReplyRecord => ({
  board: AFTER_BC4, san: 'h6', cont: ['d4', 'exd4', 'O-O', 'd6', 'Nxd4'], games: 35_139_125, pct: 15.1,
  reach: REACH, share: { '1000,1200': 17.7, '1400,1600': 16.7, '1800,2000': 7.1 }, endCp: 66, middlegame: true, ...over,
});
const base = {
  tabLine: MAIN, lineIndex: -1, from: 5, anchors: [] as ChapterSubline[], shown: [] as ChapterSubline[],
  reserved: new Set<string>(), studentBand: '1000,1200', faced: null as FacedIndex | null,
};

describe('valueAtBand — a measured number at the student\'s band', () => {
  it('reads the band that holds each of the student\'s buckets, or the nearest, averaged', () => {
    expect(valueAtBand(REACH, '1000,1200')).toBeCloseTo(17.69);
    expect(valueAtBand(REACH, '1200,1400')).toBeCloseTo((17.69 + 16.65) / 2);
    expect(valueAtBand(REACH, '1600,1800')).toBeCloseTo((16.65 + 7.1) / 2);
    expect(valueAtBand(REACH, '2200,2500')).toBeCloseTo(7.1);
    expect(valueAtBand(undefined, '1000,1200')).toBeNull();
  });
});

describe('clubRepliesOnTab', () => {
  it('shows a club reply on the tab\'s line, walked on, tagged with its club facts', () => {
    const [row] = clubRepliesOnTab({ ...base, records: [rec({})] });
    expect(row.moves).toEqual([...MAIN.slice(0, 5), 'h6', 'd4', 'exd4', 'O-O', 'd6', 'Nxd4']);
    expect(row).toMatchObject({ triggerMove: 'h6', atPly: 5, tab: -1, pct: 18, reachesMiddlegame: true });
    expect(row.via).toBeUndefined();
    expect(row.club).toEqual({ reach: 17.69, met: 0, endCp: 66 });
  });

  it('finds the board by POSITION — a record reached by another move order sits on the tab\'s own moves', () => {
    const transposed = board(['e4', 'e5', 'Bc4', 'Nc6', 'Nf3']);
    expect(transposed).toBe(AFTER_BC4);
    const [row] = clubRepliesOnTab({ ...base, records: [rec({ board: transposed })] });
    expect(row.moves.slice(0, 5)).toEqual(MAIN.slice(0, 5));
  });

  it('never sits before the tab\'s floor ply, and never where the tab itself plays the move', () => {
    expect(clubRepliesOnTab({ ...base, from: 6, records: [rec({})] })).toEqual([]);
    expect(clubRepliesOnTab({ ...base, records: [rec({ san: 'Bc5', cont: ['c3'] })] })).toEqual([]);
  });

  it('a reply inside a reply the tab shows carries that reply\'s line as its identity', () => {
    const twoKnights = { tab: 2, triggerMove: 'Nf6', atPly: 5, moves: [...MAIN.slice(0, 5), 'Nf6', 'd3', 'Be7', 'O-O', 'O-O'], pct: 30, games: 9, name: '', reachesMiddlegame: true } as ChapterSubline;
    const at = board(twoKnights.moves.slice(0, 7));
    const [row] = clubRepliesOnTab({ ...base, lineIndex: 2, anchors: [twoKnights], records: [rec({ board: at, san: 'h6', cont: ['O-O', 'd6', 'c3'] })] });
    expect(row).toMatchObject({ tab: 2, atPly: 7, via: 'Nf6 d3' });
    expect(row.moves).toEqual([...twoKnights.moves.slice(0, 7), 'h6', 'O-O', 'd6', 'c3']);
    // …and the reply line's own move there is never a club reply.
    expect(clubRepliesOnTab({ ...base, anchors: [twoKnights], records: [rec({ board: at, san: 'Be7', cont: ['O-O'] })] })).toEqual([]);
  });

  it('never repeats a reply the tab already shows, nor takes a curated reply\'s identity', () => {
    const shownH6 = { tab: -1, triggerMove: 'h6', atPly: 5, moves: [...MAIN.slice(0, 5), 'h6', 'd4'], pct: 2, games: 5, name: '', reachesMiddlegame: true } as ChapterSubline;
    expect(clubRepliesOnTab({ ...base, shown: [shownH6], records: [rec({})] })).toEqual([]);
    expect(clubRepliesOnTab({ ...base, reserved: new Set(['-1::h6@5']), records: [rec({})] })).toEqual([]);
  });

  it('drops a record whose line is not legal from the board', () => {
    expect(clubRepliesOnTab({ ...base, records: [rec({ cont: ['Ke8'] })] })).toEqual([]);
  });

  it('orders the replies the student met first, then by reach at THEIR band', () => {
    const d6 = rec({ san: 'd6', cont: ['d4', 'exd4', 'Nxd4'], reach: { '1000,1200': 6.86, '1400,1600': 7, '1800,2000': 5.9 }, games: 15_701_621 });
    const f6 = rec({ san: 'f6', cont: ['d4', 'd6', 'h3'], reach: { '1000,1200': 2.27, '1400,1600': 0.8, '1800,2000': 0.17 }, games: 2_666_750 });
    const faced: FacedIndex = new Map([[AFTER_BC4, new Map([['f6', 2]])]]);
    const rows = clubRepliesOnTab({ ...base, records: [d6, rec({}), f6], faced });
    expect(rows.map((r) => [r.triggerMove, r.club?.met])).toEqual([['f6', 2], ['h6', 0], ['d6', 0]]);
    // At 1800–2000 the order of the unmet replies follows that band's reach.
    const strong = clubRepliesOnTab({ ...base, records: [rec({ reach: { '1800,2000': 1 } }), d6], studentBand: '1800,2000' });
    expect(strong.map((r) => r.triggerMove)).toEqual(['d6', 'h6']);
  });
});

describe('clubRepliesOf — fetched per opening, never asked for when the index has none', () => {
  beforeEach(() => { __resetClubReplies(); loadDataJson.mockReset(); });

  it('reads the opening\'s file when the index lists it', async () => {
    loadDataJson.mockImplementation((p: string) => Promise.resolve(p.endsWith('index.json')
      ? { bands: [], openings: { 'italian-game': 1 } }
      : { openingId: 'italian-game', bands: [], replies: [rec({})] }));
    expect((await clubRepliesOf('italian-game')).map((r) => r.san)).toEqual(['h6']);
    expect(loadDataJson).toHaveBeenCalledWith('/data/club-replies/italian-game.json');
  });

  it('an opening the walk has none for costs no file request', async () => {
    loadDataJson.mockResolvedValue({ bands: [], openings: { 'italian-game': 1 } });
    expect(await clubRepliesOf('ruy-lopez')).toEqual([]);
    expect(loadDataJson).toHaveBeenCalledTimes(1);
  });
});
