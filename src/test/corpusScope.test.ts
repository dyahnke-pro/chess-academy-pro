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
//          narration) and post-game review.
//
// This REPLACES reviewCorpusReach.test.ts, which asserted the opposite ("review
// can reach the corpus") — the contract changed, so the gate changed with it.
// Scanned by STATEMENT: comments are stripped first, so a comment that names a
// retrieval function (to explain why it is gone) never trips the gate.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

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
    ['fork talk (Learn only)', 'src/services/forkTalk.ts'],
    ['think-aloud (Learn only)', 'src/services/thinkAloud.ts'],
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
  it('coach chat still gets its corpus block', () => {
    expect(code('src/coach/coachService.ts')).toMatch(/\bbuildDanyaTeachingBlock\(/);
  });
});
