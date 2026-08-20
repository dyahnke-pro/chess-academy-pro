// GEM LINES MUST FORK OUT OF "TEACH ME X OPENING" AND SNAP BACK.
//
// David 2026-08-20: *"I want the gem lines to be included in the teach me x
// opening. I haven't seen that yet. I want the coach to provide a fork line into
// the gems and then snap back to the position when it's done."*
//
// He had never seen it because `findMatchingTraps` rejected every punish lesson
// carrying a `setupFen`, and a curated gem carries one. The filter was written
// for PUZZLE-derived punishes, whose FEN is an unrelated mid-game position and
// whose moves are illegal at the walkthrough board — a real defect, audited in
// production (an Italian walkthrough firing five trap prompts with unplayable
// SANs). A gem's FEN is derived from its own setupMoves, so it is the very
// position the lesson is standing on.
//
// Both halves are pinned here: the gem fires, and the puzzle-derived one still
// does not.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { _findMatchingTraps } from './useTeachWalkthrough';
import { gemPunishLessonsForOpeningName } from '../services/gemPunishLessons';
import type { PunishLesson } from '../types/walkthroughTree';

describe('gem lines inside the taught walkthrough', () => {
  it('fires a curated gem at the position its own line reaches', () => {
    // Any opening with gems will do — the claim is about the mechanism.
    let fired = false;
    for (const name of ['Vienna Game', 'Italian Game', 'Ruy Lopez', 'Caro-Kann Defence', "Queen's Gambit"]) {
      const gems = gemPunishLessonsForOpeningName(name);
      for (const gem of gems) {
        // The walkthrough stands exactly where the gem's line ends.
        const matches = _findMatchingTraps(gem.setupMoves, gems);
        if (matches.some((m) => m.name === gem.name)) { fired = true; break; }
      }
      if (fired) break;
    }
    expect(fired, 'no curated gem matched at its own setup position').toBe(true);
  });

  it('every fired gem plays its inaccuracy legally on the board it fires at', () => {
    // The whole reason the filter existed. A gem that fires must be playable,
    // or the coach narrates a move that cannot be made.
    const bad: string[] = [];
    for (const name of ['Vienna Game', 'Italian Game', 'Ruy Lopez', 'Caro-Kann Defence']) {
      for (const gem of gemPunishLessonsForOpeningName(name)) {
        if (!_findMatchingTraps(gem.setupMoves, [gem]).length) continue;
        const board = new Chess();
        let ok = true;
        for (const san of gem.setupMoves) { try { if (!board.move(san)) { ok = false; break; } } catch { ok = false; break; } }
        if (!ok) { bad.push(`${gem.name}: setup illegal`); continue; }
        try { if (!board.move(gem.inaccuracy)) bad.push(`${gem.name}: ${gem.inaccuracy} illegal at its own board`); }
        catch { bad.push(`${gem.name}: ${gem.inaccuracy} illegal at its own board`); }
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('still refuses a puzzle-derived punish whose FEN is not its own line', () => {
    const puzzle: PunishLesson = {
      name: 'puzzle punish',
      kind: 'trap',
      // A mid-game position unrelated to the moves below — the shape the filter
      // was written for.
      setupFen: '2r3k1/pp3ppp/8/8/8/8/PP3PPP/2R3K1 w - - 0 1',
      setupMoves: ['e4', 'e5'],
      inaccuracy: 'Rxc8',
      punishment: 'Rxc8',
      whyBad: '',
      whyPunish: '',
    } as PunishLesson;
    expect(_findMatchingTraps(['e4', 'e5'], [puzzle])).toEqual([]);
  });
});
