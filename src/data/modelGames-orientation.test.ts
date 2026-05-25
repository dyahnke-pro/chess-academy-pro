import { describe, it, expect } from 'vitest';
import modelGamesRaw from './model-games.json';
import { isNarratedModelGame } from '../services/modelGameService';
import type { ModelGame } from '../types';

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
// (= the student's color, and the game MUST be a WIN for that side — NOT a
// draw, NOT a loss; David 2026-05-25: "wins only. replace the draws!") and
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
function studentDrew(g: ModelGameLike): boolean {
  return Boolean(g.studentSide) && /^(1\/2-1\/2|½-½)$/.test((g.result ?? '').trim());
}

describe('model-games orientation — wins only, never the student losing OR drawing', () => {
  it('no model game with studentSide set shows that side losing', () => {
    const offenders = games
      .filter(studentLost)
      .map((g) => `${g.id} (${g.openingId} ${String(g.studentSide)} ${g.result})`);
    expect(
      offenders,
      `These games declare a studentSide but show it LOSING — relocate or remove: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('no model game with studentSide set is a DRAW — model games showcase a WIN (David 2026-05-25)', () => {
    const offenders = games
      .filter(studentDrew)
      .map((g) => `${g.id} (${g.openingId} ${String(g.studentSide)} ${g.result})`);
    expect(
      offenders,
      `These studentSide games are DRAWS — a model game must show the student WINNING. Replace with a real student-side win: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  // Masterclass openings whose model games are all curated student-wins and
  // tagged so the coach-injection filter protects them. Add a new opening here
  // once its model games declare studentSide.
  const PROTECTED = ['vienna-game', 'caro-kann', 'ruy-lopez', 'italian-game', 'scotch-game', 'kings-gambit', 'sicilian-dragon', 'four-knights-game', 'london-system', 'catalan-opening', 'english-opening', 'reti-opening'];
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

// Narration gate: only games with a REAL authored overview surface in
// ModelGamesSection (no thin-narration ships — David 2026-05-24). This proves
// isNarratedModelGame correctly rejects the auto-import boilerplate, so a
// templated game can never render.
describe('model-games narration — boilerplate games never surface', () => {
  const full = modelGamesRaw as unknown as ModelGame[];

  it('every boilerplate-overview game is rejected by isNarratedModelGame', () => {
    const re = /Master game from the Lichess masters database|Walk through the moves to see how masters handled/i;
    const leaked = full
      .filter((g) => re.test(g.overview ?? ''))
      .filter((g) => isNarratedModelGame(g))
      .map((g) => g.id);
    expect(leaked, 'These boilerplate games would still surface — tighten the filter').toEqual([]);
  });

  it('authored games pass the filter (sanity — the bar is not rejecting everything)', () => {
    const narrated = full.filter((g) => isNarratedModelGame(g)).length;
    expect(narrated).toBeGreaterThan(0);
  });
});
