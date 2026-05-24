import { describe, it, expect } from 'vitest';
import modelGamesRaw from './model-games.json';

// Model-game orientation gate (David 2026-05-21: "a masterclass can't showcase
// its own opening losing"). The coach grounds on these games via
// loadModelGamesForLive, and the model-game viewer renders them — so a game
// where the STUDENT'S side loses must never be in a masterclass opening's set.
//
// `studentSide` (the student's color in that opening) is the gate's hook: when
// set, loadModelGamesForLive filters out games where that side loses. This test
// proves (a) no studentSide-tagged game is actually a loss, and (b) the
// protected masterclass openings tag every game so the filter covers them.
//
// When you add a NEW masterclass opening, set studentSide on every model game
// (= the student's color, and the game MUST be a win/draw for that side) and
// add the openingId to PROTECTED below.

interface ModelGameLike {
  id: string;
  openingId: string;
  result: string;
  studentSide?: 'white' | 'black';
}

const games = modelGamesRaw as unknown as ModelGameLike[];

function studentLost(g: ModelGameLike): boolean {
  return (g.studentSide === 'white' && g.result === '0-1') ||
         (g.studentSide === 'black' && g.result === '1-0');
}

describe('model-games orientation — never showcase the student losing', () => {
  it('no model game with studentSide set shows that side losing', () => {
    const offenders = games
      .filter(studentLost)
      .map((g) => `${g.id} (${g.openingId} ${String(g.studentSide)} ${g.result})`);
    expect(
      offenders,
      `These games declare a studentSide but show it LOSING — relocate or remove: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  // Masterclass openings whose model games are all curated student-wins and
  // tagged so the coach-injection filter protects them. Add a new opening here
  // once its model games declare studentSide.
  const PROTECTED = ['vienna-game', 'caro-kann', 'ruy-lopez'];
  for (const oid of PROTECTED) {
    it(`${oid}: every model game declares studentSide (coach filter covers it)`, () => {
      const missing = games.filter((g) => g.openingId === oid && !g.studentSide).map((g) => g.id);
      expect(
        missing,
        `${oid} model games missing studentSide — the coach filter can't exclude a loss: ${missing.join(', ')}`,
      ).toEqual([]);
    });
  }
});
