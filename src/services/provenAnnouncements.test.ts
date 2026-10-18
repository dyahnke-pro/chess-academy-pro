import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { claimProvenAnnouncements, markProvenAnnounced } from './provenAnnouncements';

describe('a fixed skill is announced once, ever', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('the second claim of the same tag returns nothing', async () => {
    expect(await claimProvenAnnouncements(['hung-material'])).toEqual(['hung-material']);
    expect(await claimProvenAnnouncements(['hung-material'])).toEqual([]);
  });

  it('only the new tag of a mixed claim is announced', async () => {
    await claimProvenAnnouncements(['hung-material']);
    expect(await claimProvenAnnouncements(['hung-material', 'tempo-handed'])).toEqual(['tempo-handed']);
  });

  it('tags green before the memory existed are marked without announcing', async () => {
    await markProvenAnnounced(['no-plan']);
    expect(await claimProvenAnnouncements(['no-plan'])).toEqual([]);
  });
});
