// David 2026-09-01: "coach reminding users to upload their lichess and chess.com
// games!" — the no-data weakness reply MUST verbally name where to get games.
// Locks the two message variants so a refactor can't silently drop the platforms.
import { describe, it, expect } from 'vitest';
import { uploadGamesReminder, personalGameDataQuestion, type MasterGroundingOptions } from './coachApi';

// Build a grounding block with only the flags a case cares about.
const g = (partial: Partial<MasterGroundingOptions>): MasterGroundingOptions =>
  partial as MasterGroundingOptions;

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

// David 2026-09-06: "ANY question about personal game data, when we have no data
// uploaded, should prompt the upload-and-analyze reply." This locks WHICH intents
// route to that gate — the load-bearing scope. A future refactor that drops one
// (the opening-profile drift that told the Port Harcourt user to "drill a few
// opening lines") or wrongly adds a board/concept intent fails here.
describe('personalGameDataQuestion — the upload-your-games gate scope', () => {
  it('fires on every personal-game-history intent', () => {
    const fires: Array<Partial<MasterGroundingOptions>> = [
      { openingProfileQuestion: true, openingProfileKind: 'strongest' }, // the reported Bug #2 case
      { openingProfileQuestion: true, openingProfileKind: 'weakest' },
      { openingProfileQuestion: true, openingProfileKind: 'favorite' },
      { openingAccuracyQuestion: true },
      { strengthsQuestion: true },
      { tacticsProfileQuestion: true },
      { phaseQuestion: true },
      { repertoireGapQuestion: true },
      { accuracyQuestion: true },
      { consistencyQuestion: true },
      { convertingQuestion: true },
      { errorsBySituationQuestion: true },
      { misconceptionsQuestion: true },
      { recordsQuestion: true },
      { colorQuestion: true },
      { transferGapQuestion: true },
      { timeTroubleQuestion: true },
      { gameMistakeQuestion: true },
      { mistakesQuestion: true },
      { lastGameQuestion: true },
      { lastGameMistakeQuestion: true },
      { endgameWeaknessQuestion: true },
      { weaknessBriefingQuestion: true },
      { weaknessLifecycleKind: 'pressing' },
      { skillRadarQuestion: true },
      { trendQuestion: true },
      { recordVsTarget: 'the Sicilian' },
    ];
    for (const partial of fires) {
      expect(personalGameDataQuestion(g(partial), undefined), JSON.stringify(partial)).toBe(true);
    }
  });

  it('does NOT fire on board / concept / theory / training-command intents', () => {
    const skips: Array<Partial<MasterGroundingOptions>> = [
      { bestMoveQuestion: true },
      { whyBestMoveQuestion: true },
      { planQuestion: true },
      { tacticsQuestion: true },        // "is there a tactic HERE" — board, not profile
      { candidateMoveQuestion: true },
      { alternativesQuestion: true },
      { masterPlayQuestion: true },
      { conceptQuestion: true },
      { theoryQuestion: true },
      { openingTrapsQuestion: true },
      { counterRepertoireQuestion: true },
      { reviewDueQuestion: true },      // SRS cards, not game history
      { puzzleStatsQuestion: true },    // trainer, not games
      { settingsQuestion: true },
      { appHelpQuestion: true },
      { statsQuestion: true },          // excluded: also matches "what's my rating?" (calibration)
      {},
    ];
    for (const partial of skips) {
      expect(personalGameDataQuestion(g(partial), undefined), JSON.stringify(partial)).toBe(false);
    }
  });

  it('respects the progress carve-out: a training-area how-to keeps its own recommendation', () => {
    // "am I improving?" with no named area → the gate fires (game-history read).
    expect(personalGameDataQuestion(g({ progressQuestion: true }), 'am I improving?')).toBe(true);
    // "how do I improve my middlegame?" names a training AREA → NOT the upload nag;
    // its own focused-game recommendation stands.
    expect(personalGameDataQuestion(g({ progressQuestion: true }), 'how do I improve my middlegame?')).toBe(false);
    expect(personalGameDataQuestion(g({ progressQuestion: true }), 'how do I improve my endgame technique?')).toBe(false);
  });
});
