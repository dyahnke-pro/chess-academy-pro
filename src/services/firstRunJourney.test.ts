import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { getFirstRunStep, advanceFirstRun, journeyShieldsPaywall, JOURNEY_SHIELD_MS } from './firstRunJourney';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('firstRunJourney', () => {
  it('a brand-new install starts in Learn', async () => {
    expect(await getFirstRunStep()).toBe('learn');
  });

  it('an install that already has games skips the journey (retroactive)', async () => {
    await db.games.put(buildGameRecord({ id: 'chesscom-1' }));
    expect(await getFirstRunStep()).toBe('done');
  });

  it('the review samples alone do not count as use', async () => {
    await db.games.put(buildGameRecord({ id: 'sample-italian' }));
    expect(await getFirstRunStep()).toBe('learn');
  });

  it('moves forward only', async () => {
    await getFirstRunStep();
    await advanceFirstRun('opening');
    await advanceFirstRun('import'); // a later screen visited early
    expect(await getFirstRunStep()).toBe('opening');
    await advanceFirstRun('done');
    expect(await getFirstRunStep()).toBe('done');
  });

  it('the step is decided once: games arriving later do not end a running journey', async () => {
    await getFirstRunStep();
    await db.games.put(buildGameRecord({ id: 'chesscom-2' }));
    expect(await getFirstRunStep()).toBe('learn');
  });

  it('shields the paywall for the first day of a new journey, never for an old install', async () => {
    await getFirstRunStep();
    expect(await journeyShieldsPaywall()).toBe(true);
    expect(await journeyShieldsPaywall(Date.now() + JOURNEY_SHIELD_MS + 1000)).toBe(false);
    await advanceFirstRun('done');
    expect(await journeyShieldsPaywall()).toBe(false);
  });

  it('an established install is never shielded', async () => {
    await db.games.put(buildGameRecord({ id: 'lichess-1' }));
    expect(await journeyShieldsPaywall()).toBe(false);
  });
});
