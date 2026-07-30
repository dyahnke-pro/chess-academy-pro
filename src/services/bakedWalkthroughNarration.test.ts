// Tier 2 lookup: the NAME match is fuzzy, the SPINE match never is.
//
// The resolver and the bake key drift apart constantly — the runtime hands back
// a deeper sub-variation than the bake was filed under, or the app's British
// spelling meets the DB's American one — and an exact-key lookup silently
// misses a perfectly good bake, dropping the coach to Tier 3.

import { describe, it, expect } from 'vitest';
import { bakedNarrationFor } from './bakedWalkthroughNarration';
import baked from '../data/walkthrough-narrations.json';

interface Entry { openingName: string; spine: string[]; ideas: unknown[] }
const entries = Object.entries((baked as { narrations: Record<string, Entry> }).narrations);
const [, sample] = entries[0];

describe('bakedNarrationFor', () => {
  it('finds a bake by its exact name', () => {
    expect(bakedNarrationFor(sample.openingName, sample.spine)).not.toBeNull();
  });

  it('finds it through a deeper sub-variation name', () => {
    const deeper = `${sample.openingName}, Some Deeper Variation`;
    expect(bakedNarrationFor(deeper, sample.spine)).not.toBeNull();
  });

  it('finds it across the Defence/Defense spelling split', () => {
    const british = sample.openingName.replace(/Defense/g, 'Defence');
    expect(bakedNarrationFor(british, sample.spine)).not.toBeNull();
  });

  it('never matches on a generic token alone', () => {
    // "Polish Opening" shares only "opening" with anything filed here.
    expect(bakedNarrationFor('Polish Opening', sample.spine)).toBeNull();
  });

  it('rejects a name hit whose moves are not the moves on the board', () => {
    const wrongLine = ['h4', 'h5', 'a4', 'a5'];
    expect(bakedNarrationFor(sample.openingName, wrongLine)).toBeNull();
  });

  it('rejects a spine deeper than the bake covers', () => {
    expect(bakedNarrationFor(sample.openingName, [...sample.spine, 'Qd2'])).toBeNull();
  });
});
