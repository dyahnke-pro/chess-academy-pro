// REVIEW IS THE DEEPER DIVE AND NEVER REPEATS LEARN WORD FOR WORD (David
// 2026-11-18: "how do we ensure learn and review don't speak the same facts?
// Remember review is a deeper dive than learn"). Before this, Review's walk
// knew nothing of what Learn said in the same game, so a correction heard live
// was read out again, sentence for sentence, in the review of that game.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { dropHeardInLearn, type ReviewMoveSegment } from './coachFeatureService';
import { learnHeardFor } from './reviewNarrationBuild';

const seg = (ply: number, narration: string | null): ReviewMoveSegment =>
  ({ ply, narration } as unknown as ReviewMoveSegment);

describe('the review walk reads what Learn said', () => {
  it('a sentence Learn said is not said again; the deeper sentence stays', () => {
    const learn = ['Your move was a mistake: it let their knight take on e4.'];
    const s = [seg(13, 'Your move was a mistake: it let their knight take on e4. Bd3 was the move — it would guard e4 and keep the pawn, and after Nxe4 Bxe4 your bishop owns the long diagonal.')];
    dropHeardInLearn(s, learn);
    expect(s[0].narration).not.toMatch(/^Your move was a mistake/);
    expect(s[0].narration).toMatch(/Bd3 was the move/);
  });

  it('punctuation and case never make the same sentence look new', () => {
    const s = [seg(9, 'your knight on f3 now hits e5!')];
    dropHeardInLearn(s, ['Your knight on f3 now hits e5.']);
    expect(s[0].narration).toBeNull();
  });

  it('a game not played in Learn changes nothing', () => {
    const s = [seg(9, 'Your knight on f3 now hits e5.')];
    dropHeardInLearn(s, null);
    expect(s[0].narration).toBe('Your knight on f3 now hits e5.');
  });
});

describe('Learn\'s lines come off the game\'s own transcript', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('reads every spoken line and nothing else', async () => {
    const game = buildGameRecord({
      id: 'learn-game-1',
      coachTranscript: { seat: 'white', entries: [
        { t: 10, kind: 'coach-narration-spoken', source: 'CoachTeachPage.queueSpeak.spoken', summary: 'Your move was a mistake: it let their knight take on e4.' },
        { t: 11, kind: 'learn-turn-decision', source: 'learnTurnDoor', summary: 'lanes offered=[mistake]' },
      ] },
    });
    await db.games.put(game);
    expect(await learnHeardFor('learn-game-1')).toEqual(['Your move was a mistake: it let their knight take on e4.']);
    expect(await learnHeardFor('no-such-game')).toBeNull();
    expect(await learnHeardFor(null)).toBeNull();
  });

  it('the review build hands it to the walk (required)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/reviewNarrationBuild.ts', 'utf8');
    expect(src).toMatch(/learnHeard: await learnHeardFor\(req\.gameId\)/);
  });
});
