import { describe, it, expect } from 'vitest';
import { blackShelfGroup, openingsForSide, shelfLabel, sortOpeningsAZ } from './openingShelf';
import { buildOpeningRecord } from '../test/factories';
import repertoire from '../data/repertoire.json';
import manifests from '../data/opening-manifests.json';
import type { OpeningRecord } from '../types';

describe('openingShelf', () => {
  it('sorts A–Z ignoring accents and apostrophes', () => {
    const names = ['Scotch Game', "King's Gambit", 'Grünfeld Defence', 'Caro-Kann Defence', 'Kings Indian Attack']
      .map((name, i) => buildOpeningRecord({ id: `o${i}`, name }));
    expect(sortOpeningsAZ(names).map((o) => o.name)).toEqual([
      'Caro-Kann Defence', 'Grünfeld Defence', "King's Gambit", 'Kings Indian Attack', 'Scotch Game',
    ]);
  });

  it('keeps one side only', () => {
    const list = [
      buildOpeningRecord({ id: 'w', name: 'Vienna Game', color: 'white' }),
      buildOpeningRecord({ id: 'b', name: 'Pirc Defence', color: 'black' }),
    ];
    expect(openingsForSide(list, 'black').map((o) => o.id)).toEqual(['b']);
  });

  it('groups Black by the first move it answers', () => {
    expect(blackShelfGroup(buildOpeningRecord({ pgn: 'e4 c6 d4 d5' }))).toBe('vs-e4');
    expect(blackShelfGroup(buildOpeningRecord({ pgn: '1. d4 Nf6 2. c4 g6' }))).toBe('vs-other');
    expect(blackShelfGroup(buildOpeningRecord({ pgn: 'c4 e5' }))).toBe('vs-other');
  });

  it('labels the Black Alapin course from Black’s side', () => {
    const alapin = (repertoire as unknown as OpeningRecord[]).find((o) => o.id === 'sicilian-alapin');
    expect(alapin?.color).toBe('black');
    expect(alapin && shelfLabel(alapin)).toBe('Sicilian vs the Alapin');
  });

  it('every masterclass lands in a real group on the real data', () => {
    const ids = Object.keys(manifests).filter((k) => !k.startsWith('_'));
    const records = (repertoire as unknown as OpeningRecord[]).filter((o) => ids.includes(o.id));
    expect(records.length).toBe(ids.length);
    const black = openingsForSide(records, 'black');
    const vsE4 = black.filter((o) => blackShelfGroup(o) === 'vs-e4').map((o) => o.id);
    expect(vsE4).toEqual(expect.arrayContaining(['caro-kann', 'french-defence', 'sicilian-najdorf']));
    expect(vsE4).not.toContain('kings-indian-defence');
  });
});
