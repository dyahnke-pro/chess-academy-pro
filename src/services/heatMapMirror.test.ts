import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./analytics', () => ({ captureEvent: vi.fn() }));
import { captureEvent } from './analytics';
import { db } from '../db/schema';
import { mirrorHeatMap, heatMapEventProps } from './heatMapMirror';
import type { HeatTile } from './heatMap';

const tile = (tag: string, state: HeatTile['state'], open = 0): HeatTile => ({
  tag: tag as HeatTile['tag'], label: tag, state, hold: { posed: 0, held: 0, heldWeight: 0, missed: 0, rate: null }, openCount: open, openWeight: open, held: 0, broken: 0, heldStreak: 0, streakGames: 0, progress: 0,
});

describe('heat map mirror', () => {
  beforeEach(async () => { await db.delete(); await db.open(); vi.mocked(captureEvent).mockClear(); });

  it('counts the three states and names the red and green skills', () => {
    const p = heatMapEventProps([tile('hung-material', 'red', 4), tile('tempo-handed', 'green'), tile('no-plan', 'grey')]);
    expect(p).toMatchObject({ green: 1, red: 1, grey: 1, red_tags: 'hung-material', green_tags: 'tempo-handed', open_slips: 4 });
  });

  it('sends once, again only when the map changes or a day has passed', async () => {
    const a = [tile('hung-material', 'red', 4)];
    expect(await mirrorHeatMap(a, 1000)).toBe(true);
    expect(await mirrorHeatMap(a, 2000)).toBe(false);
    expect(await mirrorHeatMap([tile('hung-material', 'green')], 3000)).toBe(true);
    expect(await mirrorHeatMap([tile('hung-material', 'green')], 3000 + 25 * 3600 * 1000)).toBe(true);
    expect(vi.mocked(captureEvent)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(captureEvent).mock.calls[0][0]).toBe('heat_map_state');
  });
});
