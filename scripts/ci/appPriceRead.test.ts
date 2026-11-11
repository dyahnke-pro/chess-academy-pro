import { describe, it, expect } from 'vitest';
import { currentPrice, isFreePrice, readAppPriceRows } from './app-price-read.mjs';

const row = (customerPrice: string | null, startDate: string | null = null, endDate: string | null = null, territory: string | null = 'USA') =>
  ({ territory, startDate, endDate, customerPrice });

describe('what the app costs to download', () => {
  it('a row with no price point makes the read unknown, never "not free" (final check, 2026-11-11)', () => {
    const p = currentPrice([row(null)], '2026-11-11');
    expect(p).toEqual({ unknown: 'a USA price row carries no price point' });
  });

  it('reads free from a 0.00 price point', () => {
    const p = currentPrice([row('0.00')], '2026-11-11');
    expect(p).toEqual({ customerPrice: '0.00' });
    expect(isFreePrice('0.00')).toBe(true);
    expect(isFreePrice('0.99')).toBe(false);
  });

  it('the price in force today wins over an ended or future one', () => {
    const rows = [row('2.99', null, '2026-01-01'), row('0.00', '2026-01-01'), row('4.99', '2027-01-01')];
    expect(currentPrice(rows, '2026-11-11')).toEqual({ customerPrice: '0.00' });
  });

  it('reads the price point the API names, page by page', async () => {
    const replies: Record<string, unknown> = {
      '/v1/apps/A/appPriceSchedule': { data: { id: 'S' } },
      '/v1/appPriceSchedules/S/manualPrices?include=appPricePoint,territory&fields[appPricePoints]=customerPrice&limit=200': {
        data: [{ attributes: { startDate: null, endDate: null }, relationships: { appPricePoint: { data: { id: 'PP' } }, territory: { data: { id: 'USA' } } } }],
        included: [{ type: 'appPricePoints', id: 'PP', attributes: { customerPrice: '0.0' } }],
      },
    };
    const got = await readAppPriceRows(async (p: string) => replies[p] ?? { __error: 404 }, 'A');
    expect(got).toEqual({ rows: [row('0.0')] });
  });
});
