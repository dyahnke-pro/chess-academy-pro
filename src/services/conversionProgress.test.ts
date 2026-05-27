import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { addAddressedConversion, getAddressedConversions, conversionPosKey } from './conversionProgress';

beforeEach(async () => {
  await db.table('meta').clear();
});

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

describe('conversionProgress', () => {
  it('starts empty', async () => {
    expect((await getAddressedConversions()).size).toBe(0);
  });

  it('records an addressed conversion by position key (move counters stripped)', async () => {
    await addAddressedConversion(FEN);
    const set = await getAddressedConversions();
    expect(set.has(conversionPosKey(FEN))).toBe(true);
    // a same-position FEN with different move counters resolves to the same key
    const samePosLaterMove = FEN.replace(' 3 3', ' 9 12');
    expect(set.has(conversionPosKey(samePosLaterMove))).toBe(true);
  });

  it('is idempotent — recording twice keeps one entry', async () => {
    await addAddressedConversion(FEN);
    await addAddressedConversion(FEN);
    expect((await getAddressedConversions()).size).toBe(1);
  });
});
