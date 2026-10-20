// CORPUS SCOPE — where farmed/voiced corpus notes may speak (David 2026-09-23:
// "remove corpus notes for learn with coach (free play) and review with coach"
// … "keep chat corpus notes, that's not narration" … the play-out after a
// walkthrough "is now free play").
//
// KEPT:    "teach me X opening" (the walkthrough — openingGenerator), coach chat
//          (buildDanyaTeachingBlock in coachService), the tactics drill and
//          /coach/endgame lessons, and the masterclass beats (curatedBeatAt —
//          hand-authored lesson prose, not corpus).
// REMOVED: Learn free play (the live reply narration, the play-out, fork talk,
//          think-aloud, and the Learn mounts of read-position + phase-change
//          narration) and the post-game review WALK.
// KEPT (David 2026-10-19: "it needs to match the video corpus we have"): the
//          review's THEORY lecture — a lesson the student asked for by tapping
//          Theory — speaks the voiced note at each position it has one.
//
// This REPLACES reviewCorpusReach.test.ts, which asserted the opposite ("review
// can reach the corpus") — the contract changed, so the gate changed with it.
// Scanned by STATEMENT: comments are stripped first, so a comment that names a
// retrieval function (to explain why it is gone) never trips the gate.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from './loadFullCorpus';

const read = (p: string): string => readFileSync(p, 'utf8');
/** Source with comments removed — the gate judges code, not prose. */
function code(p: string): string {
  return read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Every call that fetches a corpus note for a board. */
const RETRIEVAL = /\b(noteAtPosition|teachingSourceForBoard|teachingNoteForBoard|noteArrowSourceAt|transitionTeachingSourceForGame|transitionTeachingForGame|supportNoteForPly|buildDanyaTeachingBlock|spokenTacticNote)\s*\(/;

describe('corpus notes stay where David put them', () => {
  it.each([
    ['review', 'src/services/coachFeatureService.ts'],
    ['Learn free play', 'src/components/Coach/CoachTeachPage.tsx'],
  ])('%s fetches no corpus note', (_surface, file) => {
    const hit = RETRIEVAL.exec(code(file));
    expect(hit?.[0] ?? null, `${file} calls ${hit?.[0]} — corpus notes are off here (2026-09-23)`).toBeNull();
  });

  it('the shared read-position and phase-change hooks REQUIRE the switch — no default a new mount can inherit', () => {
    expect(code('src/hooks/usePositionNarration.ts')).toMatch(/\bcorpusNotes: boolean;/);
    expect(code('src/hooks/usePhaseNarration.ts')).toMatch(/\bcorpusNotes: boolean;/);
    expect(code('src/services/positionReadComposer.ts')).toMatch(/\bcorpusNotes: boolean;/);
    // …and the composer only reaches the corpus behind it.
    expect(code('src/services/positionReadComposer.ts')).toMatch(/if \(i\.corpusNotes\)[\s\S]{0,40}teachingSourceForBoard\(/);
  });

  it('Learn turns both off', () => {
    const teach = code('src/components/Coach/CoachTeachPage.tsx');
    expect((teach.match(/corpusNotes: false/g) ?? []).length).toBe(2);
    expect(teach).not.toMatch(/corpusNotes: true/);
  });

  // POSITIVE CONTROLS — a gate that passes because everything was deleted is
  // not a gate. The surfaces David KEPT must still reach the corpus.
  it('"teach me X opening" still splices its notes', () => {
    expect(code('src/services/openingGenerator.ts')).toMatch(/\bnoteArrowSourceAt\(/);
  });
  it('the review Theory lecture speaks the voiced corpus — and only the lecture', () => {
    const review = code('src/components/Coach/CoachGameReview.tsx');
    expect(review).toMatch(/buildTheoryLectureBeats\([\s\S]{0,200}noteArrowSourceAt\(/);
    expect((review.match(/\bnoteArrowSourceAt\(/g) ?? []).length).toBe(1);
  });
  it('the lecture gets a real voiced note at a real position (e4 c5 Nf3 Nc6, Black\'s seat)', async () => {
    loadFullCorpus();
    const { buildOpeningTheoryLecture, buildTheoryLectureBeats } = await import('../services/reviewOpeningTheory');
    const { noteArrowSourceAt } = await import('../services/openingGenerator');
    const c = new Chess();
    const sans = ['e4', 'c5', 'Nf3', 'Nc6'];
    const fens = [c.fen()];
    for (const s2 of sans) { c.move(s2); fens.push(c.fen()); }
    const at: Record<number, Array<[string, number]>> = { 0: [['e4', 600], ['d4', 400]], 1: [['c5', 500], ['e5', 400]], 2: [['Nf3', 500], ['Nc3', 200]], 3: [['d6', 500], ['Nc6', 400]] };
    const lookup = async (fen: string) => {
      const i = fens.indexOf(fen);
      const moves = (at[i] ?? []).map(([san, games]) => ({ san, uci: '', games, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 }));
      return { fen, totalGames: moves.reduce((n, m) => n + m.games, 0), moves, source: 'local' as const };
    };
    const lec = await buildOpeningTheoryLecture(fens, sans, 'Sicilian Defense: Old Sicilian', { lookup, studentColor: 'black', movesAt: () => null });
    const seen = new Set<string>();
    const beats = buildTheoryLectureBeats(lec!, [], 'black', (p, f) => noteArrowSourceAt(p, f, seen, 'Sicilian Defense: Old Sicilian', 'black'));
    expect(seen.size).toBeGreaterThan(0);
    expect(beats.some((b) => /\bc5\b/.test(b.fact) && /knight to c6/.test(b.fact))).toBe(true);
  }, 60_000);
  it('coach chat still gets its corpus block', () => {
    expect(code('src/coach/coachService.ts')).toMatch(/\bbuildDanyaTeachingBlock\(/);
  });
});
