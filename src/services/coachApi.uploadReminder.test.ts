// David 2026-09-01: "coach reminding users to upload their lichess and chess.com
// games!" — the no-data weakness reply MUST verbally name where to get games.
// Locks the two message variants so a refactor can't silently drop the platforms.
import { describe, it, expect } from 'vitest';
import { uploadGamesReminder } from './coachApi';

describe('uploadGamesReminder', () => {
  it('names BOTH Lichess and Chess.com when nothing is imported', () => {
    const msg = uploadGamesReminder('your weaknesses', { totalGames: 0, analyzedGameCount: 0 });
    expect(msg.toLowerCase()).toContain('lichess');
    expect(msg.toLowerCase()).toMatch(/chess\.?com/);
    expect(msg.toLowerCase()).toContain('import');
    expect(msg).toContain('your weaknesses');
  });

  it('tells the student to analyze when games are imported but unanalyzed', () => {
    const msg = uploadGamesReminder('your endgame weaknesses', { totalGames: 12, analyzedGameCount: 0 });
    expect(msg).toContain('12 games');
    expect(msg.toLowerCase()).toContain('analy'); // analyze / analysis
    expect(msg.toLowerCase()).toContain('import');
    expect(msg).toContain('your endgame weaknesses');
  });

  it('handles the singular game count', () => {
    const msg = uploadGamesReminder('your weaknesses', { totalGames: 1, analyzedGameCount: 0 });
    expect(msg).toContain('1 game');
    expect(msg).not.toContain('1 games');
  });
});
