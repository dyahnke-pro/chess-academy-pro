import { describe, expect, it } from 'vitest';
import { MISSIONS } from './registry';
import { cardsOfTrack, isCampaignTrack, trackOfLevel, TRACKS, TRACK_ORDER } from './tracks';

describe('the Campaign tracks (docs/CAMPAIGN.md §9)', () => {
  it('cover Levels 1–50 with no gap and no overlap', () => {
    for (let level = 1; level <= 50; level += 1) {
      expect(TRACK_ORDER.filter((t) => level >= TRACKS[t].first && level <= TRACKS[t].last), `L${level}`).toHaveLength(1);
    }
    expect(trackOfLevel(1)).toBe('beginner');
    expect(trackOfLevel(18)).toBe('beginner');
    expect(trackOfLevel(19)).toBe('intermediate');
    expect(trackOfLevel(36)).toBe('intermediate');
    expect(trackOfLevel(37)).toBe('advanced');
  });

  it('a track holds only its own levels’ cards — Level 1 is never an intermediate mission', () => {
    expect(Object.values(cardsOfTrack('beginner', MISSIONS)).every((c) => c.level <= 18)).toBe(true);
    expect(cardsOfTrack('intermediate', MISSIONS)['develop-and-castle']).toBeUndefined();
    expect(cardsOfTrack('beginner', MISSIONS)['develop-and-castle']).toBeDefined();
  });

  it('only the advanced track is silent', () => {
    expect(TRACK_ORDER.filter((t) => TRACKS[t].silent)).toEqual(['advanced']);
  });

  it('reads a stored choice and refuses anything else', () => {
    expect(isCampaignTrack('intermediate')).toBe(true);
    expect(isCampaignTrack('expert')).toBe(false);
    expect(isCampaignTrack(undefined)).toBe(false);
  });
});
