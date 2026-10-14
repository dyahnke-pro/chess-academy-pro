import { describe, it, expect, beforeEach } from 'vitest';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import { determinePlayerColor } from './mistakePuzzleService';
import { useAppStore } from '../stores/appStore';

// EVERY ANALYSED GAME REACHES THE RECORD (David 2026-10-14: "It should accept
// any analyzed games"). The record path resolved the seat with a private copy
// that matched only the game's own site's username, so these were dropped.
describe('the record resolves the seat through the ONE resolver', () => {
  beforeEach(() => {
    const p = buildUserProfile({ name: 'Player' });
    useAppStore.setState({ activeProfile: { ...p, preferences: { ...p.preferences, chessComUsername: 'DavidY', lichessUsername: undefined } } });
  });
  it('a pasted PGN (source import) under the chess.com name', () => {
    expect(determinePlayerColor(buildGameRecord({ source: 'import', white: 'DavidY', black: 'Opp', studentSide: undefined }))).toBe('white');
  });
  it('a Lichess game with only the chess.com name saved', () => {
    expect(determinePlayerColor(buildGameRecord({ source: 'lichess', white: 'Opp', black: 'DavidY', studentSide: undefined }))).toBe('black');
  });
  it('the declared seat still wins', () => {
    expect(determinePlayerColor(buildGameRecord({ source: 'import', white: 'DavidY', black: 'Opp', studentSide: 'black' }))).toBe('black');
  });
  it('nothing matches: null, never a guess', () => {
    expect(determinePlayerColor(buildGameRecord({ source: 'import', white: 'chessplayer99', black: 'Opp', studentSide: undefined }))).toBeNull();
  });
});
