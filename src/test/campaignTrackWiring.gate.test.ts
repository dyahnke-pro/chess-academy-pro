// THE TRACK IS WIRED (G8.5) — David 2026-10-21: "intermediates need a way to
// bypass the first easy levels". A track picker that saves a choice the game
// never reads is green in its own tests and does nothing in the app. Scanned
// with comments stripped, so a comment naming a call is not a call.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const PAGE = strip(readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8'));
const MAP = strip(readFileSync(resolve(__dirname, '../components/Campaign/CampaignMapPage.tsx'), 'utf8'));

describe('the Campaign track reaches the game', () => {
  it.each([
    ['the game reads the stored track', PAGE, /preferences\.campaignTrack/],
    ["the game's missions come from the track's cards only", PAGE, /missionForPhase\(phase, record, trackCards\)/],
    ['a track with no mission plays a silent, owned game', PAGE, /missionRef\.current\.start\(p\.cards, p\.watchers, p\.silent\)/],
    ['the map saves the choice on the profile, key by key', MAP, /db\.profiles\.update\(profile\.id, preferencesPatch\(\{ campaignTrack: next \}\)\)/],
    ['the map draws the chosen track', MAP, /campaignMap\(record, attempts, undefined, track\)/],
  ])('%s', (_, src, pattern) => {
    expect(src).toMatch(pattern);
  });
});
