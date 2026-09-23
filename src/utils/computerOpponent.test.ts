import { describe, it, expect } from 'vitest';
import { isComputerOpponent } from './computerOpponent';

// Headers as chess.com serves them (real archive, 2026-09-23).
const VS_COACH = '[Event "Play vs Coach"]\n[Site "Chess.com"]\n[TimeControl "-"]\n\n1. e4 e5 *';
const DAILY = '[Event "Let\'s Play!"]\n[Site "Chess.com"]\n[TimeControl "1/86400"]\n\n1. e4 e5 *';
const LIVE = '[Event "Live Chess"]\n[Site "Chess.com"]\n[TimeControl "600"]\n\n1. e4 e5 *';

describe('isComputerOpponent (walk 6, W3)', () => {
  it('flags chess.com play-vs-coach games', () => {
    expect(isComputerOpponent({ source: 'chesscom', pgn: VS_COACH })).toBe(true);
  });
  it('keeps human games — daily and live, whatever the opponent is called', () => {
    expect(isComputerOpponent({ source: 'chesscom', pgn: DAILY })).toBe(false);
    expect(isComputerOpponent({ source: 'chesscom', pgn: LIVE })).toBe(false);
  });
  it('reads chess.com records only', () => {
    expect(isComputerOpponent({ source: 'lichess', pgn: VS_COACH })).toBe(false);
  });
});
