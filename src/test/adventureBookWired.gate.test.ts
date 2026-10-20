// THE ADVENTURE BOOK IS WIRED (David 2026-10-19): Learn asks the band for its
// most played move and raises the roads; Play stays the sparring partner; the
// chips and the typed correction swap the reply through ONE path; the roads
// walked are remembered across sessions.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const teach = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const play = readFileSync('src/components/Coach/CoachGamePage.tsx', 'utf8');
const opening = readFileSync('src/components/Openings/OpeningPlayMode.tsx', 'utf8');

describe('the adventure book in Learn free play', () => {
  it('Learn plays the band\'s most played move; Play and the opening Play rung keep sampling', () => {
    expect(teach).toMatch(/getAdaptiveMove\(fen, rating, \{[\s\S]{0,400}bookPolicy: 'most-played'/);
    expect(play).toMatch(/bookPolicy: 'weighted'/);
    expect(opening).toMatch(/bookPolicy: 'weighted'/);
  });
  it('the roads come only from the band, and are remembered', () => {
    expect(teach).toMatch(/adaptive\.source === 'amateur-band' && adaptive\.roads\)[\s\S]{0,120}noteTheirRoads\(fen, san, roadsFrom\(fen, historyBefore, adaptive\.roads\)\)/);
    // a home-opening steer asks the same band for this board, then raises the
    // roads only while the game is still at this reply
    expect(teach).toMatch(/adaptive\.source === 'home-steer'\)[\s\S]{0,400}warmAmateurPlay\(fen, rating, 'coach-teach'\)\.then[\s\S]{0,200}stillHere\(\)\) noteTheirRoads\(fen, san, roadsFrom\(fen, historyBefore, moves\)\)/);
    // a planned trap never offers a way out of the punish it sets up
    expect(teach).not.toMatch(/'taught-slip' \? /);
    expect(teach).toMatch(/remember\('learn-forks', roadForkId\(beforeFen\)/);
  });
  it('one swap path: the chips and the typed correction both call swapLastCoachMove', () => {
    expect((teach.match(/swapLastCoachMove\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(teach).toMatch(/const swapped = swapLastCoachMove\(cmd\.san\)/);
    expect(teach).toMatch(/const swapped = swapLastCoachMove\(r\.san\)/);
    // the old inline copy of the swap is gone
    expect(teach).not.toMatch(/for \(const s of priorSans\) probe\.move\(s\)/);
  });
});
