import { describe, it, expect } from 'vitest';
import { buildGameRecord } from '../test/factories';
import { resolvePlayerColor, resolveGameOutcome, opponentName } from './playerIdentity';

describe('resolvePlayerColor — one resolver for "which side is the student"', () => {
  it('coach games: the side named as the engine is the opponent', () => {
    const g = buildGameRecord({ source: 'coach', white: 'David', black: 'Stockfish Bot' });
    expect(resolvePlayerColor(g, {})).toBe('white');
    const g2 = buildGameRecord({ source: 'coach', white: 'AI Coach', black: 'David' });
    expect(resolvePlayerColor(g2, {})).toBe('black');
  });

  it('imports match the PLATFORM handle, not the app profile name', () => {
    const g = buildGameRecord({ source: 'chesscom', white: 'KaiserlicheHoheit', black: 'Knight_Mare_01' });
    expect(resolvePlayerColor(g, { profileName: 'David', chessComUsername: 'knight_mare_01' })).toBe('black');
  });

  it('exact match wins over a loose substring on the other side', () => {
    const g = buildGameRecord({ source: 'lichess', white: 'dave', black: 'davey' });
    expect(resolvePlayerColor(g, { lichessUsername: 'Dave' })).toBe('white');
  });

  it('loose match catches decorated names', () => {
    const g = buildGameRecord({ source: 'chesscom', white: 'someone (1500)', black: 'david (1200)' });
    expect(resolvePlayerColor(g, { chessComUsername: 'david' })).toBe('black');
  });

  it('returns null when the identity genuinely cannot be resolved — never guesses a badge', () => {
    const g = buildGameRecord({ source: 'chesscom', white: 'alice', black: 'bob' });
    expect(resolvePlayerColor(g, {})).toBeNull();
    expect(resolvePlayerColor(g, { chessComUsername: 'carol' })).toBeNull();
  });
});

describe('resolveGameOutcome / opponentName', () => {
  it('flips with the colour the student played', () => {
    const g = buildGameRecord({ result: '0-1', white: 'alice', black: 'bob' });
    expect(resolveGameOutcome(g, 'black')).toBe('win');
    expect(resolveGameOutcome(g, 'white')).toBe('loss');
    expect(resolveGameOutcome(buildGameRecord({ result: '1/2-1/2' }), 'white')).toBe('draw');
    expect(resolveGameOutcome(buildGameRecord({ result: '*' }), 'white')).toBeNull();
    expect(opponentName(g, 'black')).toBe('alice');
  });
});
