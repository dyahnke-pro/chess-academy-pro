import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveOpeningToRepertoireTool } from './saveOpeningToRepertoire';
import { db } from '../../../db/schema';
import { buildOpeningRecord } from '../../../test/factories';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('save_opening_to_repertoire tool', () => {
  it('is a write cerebrum tool', () => {
    expect(saveOpeningToRepertoireTool.name).toBe('save_opening_to_repertoire');
    expect(saveOpeningToRepertoireTool.category).toBe('cerebrum');
    expect(saveOpeningToRepertoireTool.kind).toBe('write');
  });

  it('marks the resolved opening repertoire + favorite (drillable)', async () => {
    await db.openings.put(buildOpeningRecord({
      id: 'caro-kann-defense', name: 'Caro-Kann Defense', eco: 'B10',
      isRepertoire: false, isFavorite: false,
      variations: [{ name: 'Advance', pgn: 'e4 c6 d4 d5 e5', explanation: 'x' }],
    }));
    const r = await saveOpeningToRepertoireTool.execute({ name: 'Caro-Kann' });
    expect(r.ok).toBe(true);
    expect((r.result as { name: string }).name).toBe('Caro-Kann Defense');
    const after = await db.openings.get('caro-kann-defense');
    expect(after?.isRepertoire).toBe(true);
    expect(after?.isFavorite).toBe(true);
    // Flashcards were seeded for the now-repertoire opening.
    const cards = await db.flashcards.where('openingId').equals('caro-kann-defense').toArray();
    expect(cards.length).toBeGreaterThan(0);
  });

  it('errors cleanly when nothing matches', async () => {
    const r = await saveOpeningToRepertoireTool.execute({ name: 'Nonexistent Opening XYZ' });
    expect(r.ok).toBe(false);
  });

  it('requires name or ecoCode', async () => {
    const r = await saveOpeningToRepertoireTool.execute({});
    expect(r.ok).toBe(false);
  });
});
