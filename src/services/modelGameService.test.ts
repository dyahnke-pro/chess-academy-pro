import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import {
  getModelGamesForOpening,
  getModelGameById,
  getAllModelGames,
  storeModelGames,
  countModelGames,
} from './modelGameService';
import { buildModelGame } from '../test/factories';

describe('modelGameService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('stores and retrieves model games by opening', async () => {
    const game1 = buildModelGame({ id: 'g1', openingId: 'italian-game' });
    const game2 = buildModelGame({ id: 'g2', openingId: 'italian-game' });
    const game3 = buildModelGame({ id: 'g3', openingId: 'ruy-lopez' });

    await storeModelGames([game1, game2, game3]);

    const italianGames = await getModelGamesForOpening('italian-game');
    expect(italianGames).toHaveLength(2);

    const ruyGames = await getModelGamesForOpening('ruy-lopez');
    expect(ruyGames).toHaveLength(1);
  });

  it('retrieves a single game by ID', async () => {
    const game = buildModelGame({ id: 'test-game' });
    await storeModelGames([game]);

    const result = await getModelGameById('test-game');
    expect(result).toBeDefined();
    expect(result?.white).toBe('Morphy');
  });

  it('returns undefined for missing game', async () => {
    const result = await getModelGameById('nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns all model games', async () => {
    const games = [
      buildModelGame({ id: 'a' }),
      buildModelGame({ id: 'b' }),
    ];
    await storeModelGames(games);

    const all = await getAllModelGames();
    expect(all).toHaveLength(2);
  });

  it('counts model games for an opening', async () => {
    await storeModelGames([
      buildModelGame({ id: '1', openingId: 'italian-game' }),
      buildModelGame({ id: '2', openingId: 'italian-game' }),
      buildModelGame({ id: '3', openingId: 'ruy-lopez' }),
    ]);

    expect(await countModelGames('italian-game')).toBe(2);
    expect(await countModelGames('ruy-lopez')).toBe(1);
    expect(await countModelGames('french-defence')).toBe(0);
  });

  it('upserts on duplicate IDs', async () => {
    const original = buildModelGame({ id: 'dup', white: 'Player A' });
    await storeModelGames([original]);

    const updated = buildModelGame({ id: 'dup', white: 'Player B' });
    await storeModelGames([updated]);

    const result = await getModelGameById('dup');
    expect(result?.white).toBe('Player B');
    expect(await countModelGames('italian-game')).toBe(1);
  });
});
