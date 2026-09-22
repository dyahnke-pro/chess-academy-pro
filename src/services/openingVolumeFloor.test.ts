import { describe, it, expect } from 'vitest';
import { rankOpeningsByVolume, clearsVolumeFloor, HOME_OPENING_MIN_GAMES, homeOpening } from './openingVolumeFloor';

/**
 * THE VOLUME FLOOR (PLAN §E2/§E3, the A3 seam) — the Elephant Gambit gate.
 * David's real numbers: Pirc 63 games at 49%, Vienna 46 at 70%, Elephant
 * Gambit 3 at 0%. "Weakest" was answered Elephant Gambit. The NEGATIVE CONTROL
 * is the whole point: a 3-game 0% line can never lead a floor-clearing 63-game
 * 49% line, and when nothing clears the floor the row is flagged `thin`.
 */
const ROWS = [
  { name: 'Pirc Defence', color: 'black' as const, games: 63, winRate: 49 },
  { name: 'Vienna Game', color: 'black' as const, games: 46, winRate: 70 },
  { name: 'Elephant Gambit', color: 'black' as const, games: 3, winRate: 0 },
  { name: 'Scandinavian', color: 'black' as const, games: 40, winRate: 73 },
];
const COLOUR_GAMES = 460;

describe('clearsVolumeFloor', () => {
  it('≥10 games clears; 3 of 460 does not; 5% share clears', () => {
    expect(clearsVolumeFloor(HOME_OPENING_MIN_GAMES, COLOUR_GAMES)).toBe(true);
    expect(clearsVolumeFloor(3, COLOUR_GAMES)).toBe(false);
    expect(clearsVolumeFloor(5, 100)).toBe(true);   // 5% share on a small account
    expect(clearsVolumeFloor(0, 100)).toBe(false);
  });
});

describe('rankOpeningsByVolume — weakest', () => {
  it('NEGATIVE CONTROL: the 3-game 0% Elephant Gambit never leads the 63-game 49% Pirc', () => {
    const ranked = rankOpeningsByVolume(ROWS, 'weakest', COLOUR_GAMES);
    expect(ranked[0].name).toBe('Pirc Defence');
    expect(ranked[0].thin).toBe(false);
    expect(ranked.map((r) => r.name)).not.toContain('Elephant Gambit'); // floor-clearing rows only
  });
  it('strongest ranks by volume × surplus: Vienna 46@70 beats Scandinavian 40@73', () => {
    const ranked = rankOpeningsByVolume(ROWS, 'strongest', COLOUR_GAMES);
    expect(ranked[0].name).toBe('Vienna Game');
  });
  it('favorite is most games first', () => {
    expect(rankOpeningsByVolume(ROWS, 'favorite', COLOUR_GAMES)[0].name).toBe('Pirc Defence');
  });
  it('when NOTHING clears the floor the rows come back flagged thin, most-supported first', () => {
    const thin = [
      { name: 'Elephant Gambit', color: 'black' as const, games: 3, winRate: 0 },
      { name: 'Latvian', color: 'black' as const, games: 4, winRate: 25 },
    ];
    const ranked = rankOpeningsByVolume(thin, 'weakest', 200);
    expect(ranked.length).toBe(2);
    expect(ranked.every((r) => r.thin)).toBe(true);
    expect(ranked[0].name).toBe('Latvian');
  });
  it('returns [] with no rows', () => {
    expect(rankOpeningsByVolume([], 'weakest', 100)).toEqual([]);
  });
});

describe('homeOpening — the A3 seam', () => {
  it('is null until WO-HOME-OPENING-01 item 3 persists a home opening', () => {
    expect(homeOpening('white')).toBeNull();
    expect(homeOpening('black')).toBeNull();
  });
});
