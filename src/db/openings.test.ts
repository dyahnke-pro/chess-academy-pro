import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import type { OpeningRecord } from '../types';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeOpening(overrides: Partial<OpeningRecord> = {}): OpeningRecord {
  return {
    id: 'vienna-game',
    eco: 'C25',
    name: 'Vienna Game',
    pgn: 'e4 e5 Nc3',
    uci: 'e2e4 e7e5 b1c3',
    fen: STARTING_FEN,
    color: 'white',
    style: 'Classical',
    isRepertoire: false,
    overview: null,
    keyIdeas: null,
    traps: null,
    warnings: null,
    variations: null,
    drillAccuracy: 0,
    drillAttempts: 0,
    lastStudied: null,
    woodpeckerReps: 0,
    woodpeckerSpeed: null,
    woodpeckerLastDate: null,
    isFavorite: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Openings CRUD', () => {
  it('adds an opening and retrieves it by ID', async () => {
    const opening = makeOpening();
    await db.openings.add(opening);
    const retrieved = await db.openings.get('vienna-game');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Vienna Game');
    expect(retrieved?.eco).toBe('C25');
  });

  it('queries by ECO code', async () => {
    await db.openings.add(makeOpening({ id: 'vienna-game', eco: 'C25' }));
    await db.openings.add(makeOpening({ id: 'scotch-game', eco: 'C45', name: 'Scotch Game' }));

    const results = await db.openings.where('eco').equals('C25').toArray();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Vienna Game');
  });

  it('queries by isRepertoire returns only repertoire openings', async () => {
    await db.openings.add(makeOpening({ id: 'eco-entry', isRepertoire: false }));
    await db.openings.add(makeOpening({ id: 'rep-entry', isRepertoire: true }));

    const all = await db.openings.toArray();
    const repertoire = all.filter((o) => o.isRepertoire);
    expect(repertoire).toHaveLength(1);
    expect(repertoire[0].id).toBe('rep-entry');
  });

  it('queries by color returns correct subset', async () => {
    await db.openings.add(makeOpening({ id: 'white-1', color: 'white' }));
    await db.openings.add(makeOpening({ id: 'black-1', color: 'black', eco: 'B01', name: 'Scandinavian' }));

    const whites = await db.openings.where('color').equals('white').toArray();
    const blacks = await db.openings.where('color').equals('black').toArray();

    expect(whites).toHaveLength(1);
    expect(blacks).toHaveLength(1);
    expect(whites[0].id).toBe('white-1');
    expect(blacks[0].id).toBe('black-1');
  });

  it('updates drill accuracy and persists', async () => {
    await db.openings.add(makeOpening());
    await db.openings.update('vienna-game', { drillAccuracy: 0.75, drillAttempts: 4 });

    const updated = await db.openings.get('vienna-game');
    expect(updated?.drillAccuracy).toBe(0.75);
    expect(updated?.drillAttempts).toBe(4);
  });

  it('updates Woodpecker fields', async () => {
    await db.openings.add(makeOpening());
    const today = new Date().toISOString().split('T')[0];

    await db.openings.update('vienna-game', {
      woodpeckerReps: 3,
      woodpeckerSpeed: 45.5,
      woodpeckerLastDate: today,
    });

    const updated = await db.openings.get('vienna-game');
    expect(updated?.woodpeckerReps).toBe(3);
    expect(updated?.woodpeckerSpeed).toBe(45.5);
    expect(updated?.woodpeckerLastDate).toBe(today);
  });

  it('bulk adds multiple openings', async () => {
    const openings = Array.from({ length: 40 }, (_, i) =>
      makeOpening({ id: `opening-${i}`, eco: `C${i.toString().padStart(2, '0')}` }),
    );
    await db.openings.bulkAdd(openings);
    const count = await db.openings.count();
    expect(count).toBe(40);
  });

  it('deletes an opening', async () => {
    await db.openings.add(makeOpening());
    await db.openings.delete('vienna-game');
    const result = await db.openings.get('vienna-game');
    expect(result).toBeUndefined();
  });

  it('stores and retrieves variations correctly', async () => {
    const opening = makeOpening({
      isRepertoire: true,
      overview: 'Great opening',
      keyIdeas: ['Control center', 'Attack kingside'],
      variations: [
        {
          name: 'Main Line',
          pgn: 'e4 e5 Nc3 Nf6',
          explanation: 'Natural development',
        },
      ],
    });
    await db.openings.add(opening);
    const retrieved = await db.openings.get('vienna-game');
    expect(retrieved?.variations).toHaveLength(1);
    expect(retrieved?.variations?.[0].name).toBe('Main Line');
    expect(retrieved?.keyIdeas).toContain('Control center');
  });
});
