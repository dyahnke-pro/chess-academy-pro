// computerOpponent — was this game played against a computer, not a person?
//
// Walk 6 (W3): the Insights card said "Beat a 2000 — Coach-David". Coach-David
// is chess.com's play-vs-coach bot at a fixed strength setting, so that
// "win over a 2000" is the student beating a slider, not a 2000-rated player.
//
// The signal is read off the chess.com record itself (verified against a real
// archive, 2026-09-23): those games carry `[Event "Play vs Coach"]` and
// `[TimeControl "-"]` — only a computer game has no clock at all (daily games
// carry "1/86400"). Read from the PGN, so games imported before this existed
// are covered without a migration.
import type { GameRecord } from '../types';

const VS_COMPUTER_EVENT = /\[Event "Play vs (?:Coach|Computer)"\]/;
const NO_CLOCK = /\[TimeControl "-"\]/;

export function isComputerOpponent(game: Pick<GameRecord, 'source' | 'pgn'>): boolean {
  if (game.source !== 'chesscom') return false;
  return VS_COMPUTER_EVENT.test(game.pgn) || NO_CLOCK.test(game.pgn);
}
