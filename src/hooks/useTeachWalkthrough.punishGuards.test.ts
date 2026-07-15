import { describe, it, expect } from 'vitest';
import {
  buildPunishWalkthroughTree,
  isStartablePunishLesson,
  isValidConceptsQuestion,
  isValidFindMoveQuestion,
  isValidDrillLine,
} from './useTeachWalkthrough';
import type {
  WalkthroughTree,
  PunishLesson,
  ConceptCheckQuestion,
  FindMoveQuestion,
  DrillLine,
} from '../types/walkthroughTree';

/**
 * Regression guard for the "keep learning → trap line fails to start"
 * bug (David 2026-07-15). A punish lesson that entered `tree.punish`
 * via a legacy Dexie tree or the shared Supabase cache — neither of
 * which re-runs `repairPunishStage` — can be missing `distractors` /
 * `setupMoves`. `buildPunishWalkthroughTree` used to do an unguarded
 * `lesson.distractors.map(...)` / `lesson.setupMoves.length`, so it
 * threw synchronously inside the picker's onClick and the lesson
 * silently never started. These tests prove the builder no longer
 * throws on malformed input and still builds a real fork for a valid
 * lesson.
 */

const parent: WalkthroughTree = {
  openingName: 'Italian Game',
  eco: 'C50',
  studentSide: 'white',
  intro: 'intro',
  outro: 'outro',
  root: { san: null, movedBy: null, idea: '', children: [] },
};

// The Damiano slip: after 1.e4 e5 2.Nf3, Black plays ...f6?, and White
// punishes with Nxe5 (a real, legal, well-known refutation).
const validLesson: PunishLesson = {
  name: 'Black plays the weakening ...f6',
  kind: 'trap',
  setupMoves: ['e4', 'e5', 'Nf3'],
  inaccuracy: 'f6',
  whyBad: 'It weakens the king and does nothing for development.',
  punishment: 'Nxe5',
  whyPunish: 'The knight grabs a pawn; ...fxe5 loses to Qh5+.',
  distractors: [
    { san: 'Bc4', label: 'too slow', explanation: 'Lets Black consolidate.' },
    { san: 'd4', label: 'ignores the gift', explanation: 'Misses the free pawn.' },
  ],
};

describe('buildPunishWalkthroughTree — malformed-lesson guards', () => {
  it('does not throw when distractors is missing', () => {
    const bad = { ...validLesson, distractors: undefined } as unknown as PunishLesson;
    expect(() => buildPunishWalkthroughTree(bad, parent)).not.toThrow();
  });

  it('does not throw when setupMoves is missing (and no setupFen)', () => {
    const bad = { ...validLesson, setupMoves: undefined } as unknown as PunishLesson;
    expect(() => buildPunishWalkthroughTree(bad, parent)).not.toThrow();
  });

  it('builds a fork with the punishment + distractors for a valid lesson', () => {
    const tree = buildPunishWalkthroughTree(validLesson, parent);
    // Walk to the fork node (root → setup moves → inaccuracy).
    let node = tree.root;
    while (node.children.length === 1) node = node.children[0].node;
    // The inaccuracy node forks to punishment + 2 distractors = 3 children.
    expect(node.children.length).toBe(3);
    const labels = node.children.map((c) => c.label);
    expect(labels).toContain('Nxe5');
  });
});

describe('isStartablePunishLesson — the picker/surface gate', () => {
  it('accepts a well-formed, legal lesson', () => {
    expect(isStartablePunishLesson(validLesson)).toBe(true);
  });

  it('rejects null / missing fields', () => {
    expect(isStartablePunishLesson(null)).toBe(false);
    expect(isStartablePunishLesson(undefined)).toBe(false);
    expect(isStartablePunishLesson({ ...validLesson, distractors: undefined } as unknown as PunishLesson)).toBe(false);
    expect(isStartablePunishLesson({ ...validLesson, setupMoves: undefined } as unknown as PunishLesson)).toBe(false);
  });

  it('rejects a degenerate lesson with no distractors (no real fork)', () => {
    expect(isStartablePunishLesson({ ...validLesson, distractors: [] })).toBe(false);
  });

  it('rejects an illegal inaccuracy or punishment', () => {
    // Qb7 is illegal from the Caro-Kann setup position.
    expect(isStartablePunishLesson({ ...validLesson, inaccuracy: 'Qb7' })).toBe(false);
    // Bxh8 is illegal after the (legal) inaccuracy.
    expect(isStartablePunishLesson({ ...validLesson, punishment: 'Bxh8' })).toBe(false);
  });

  it('accepts a setupFen-based lesson (puzzle-DB shape) without setupMoves replay', () => {
    const fenLesson: PunishLesson = {
      name: 'Fantasy Caro slip',
      // Black to move; ...Qb6 hits b2, White punishes with the natural reply.
      setupFen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/5P2/PPP3PP/RNBQKBNR b KQkq - 0 3',
      setupMoves: [],
      inaccuracy: 'dxe4',
      whyBad: 'Opens the center prematurely.',
      punishment: 'fxe4',
      whyPunish: 'White recaptures with a broad pawn center.',
      distractors: [{ san: 'Nc3', label: 'slower', explanation: 'Also fine but less direct.' }],
    };
    expect(isStartablePunishLesson(fenLesson)).toBe(true);
  });
});

// Sibling sweep (David 2026-07-15 — "did you test for similar points of
// failure?"). concepts/findMove/drill are loaded from the same cache
// paths as punish and skip their repair on legacy/shared-cache reads, so
// a malformed one would throw the same way (a render throw for the
// quizzes). These guard the count/picker gates.
describe('sibling stage validity gates', () => {
  const goodConcepts: ConceptCheckQuestion = {
    prompt: 'What does Nc3 do?',
    choices: [
      { text: 'Defends e4', correct: true, explanation: 'Braces the center.' },
      { text: 'Attacks h7', correct: false, explanation: 'No.' },
    ],
  };
  const goodFindMove: FindMoveQuestion = {
    path: ['e4', 'e5', 'Nf3'],
    prompt: 'Best move?',
    candidates: [
      { label: 'Nxe5', correct: true, explanation: 'Wins a pawn.' },
      { label: 'Bc4', correct: false, explanation: 'Too slow.' },
    ],
  };
  const goodDrill: DrillLine = { name: 'Main line', moves: ['e4', 'e5', 'Nf3', 'Nc6'] };

  it('accepts well-formed sibling entries', () => {
    expect(isValidConceptsQuestion(goodConcepts)).toBe(true);
    expect(isValidFindMoveQuestion(goodFindMove)).toBe(true);
    expect(isValidDrillLine(goodDrill)).toBe(true);
  });

  it('rejects malformed concepts (missing/short choices, no correct, no prompt)', () => {
    expect(isValidConceptsQuestion(null)).toBe(false);
    expect(isValidConceptsQuestion({ ...goodConcepts, choices: undefined } as unknown as ConceptCheckQuestion)).toBe(false);
    expect(isValidConceptsQuestion({ ...goodConcepts, choices: [goodConcepts.choices[0]] })).toBe(false); // only 1 choice
    expect(isValidConceptsQuestion({ ...goodConcepts, choices: goodConcepts.choices.map((c) => ({ ...c, correct: false })) })).toBe(false); // none correct
    expect(isValidConceptsQuestion({ ...goodConcepts, prompt: '' })).toBe(false);
  });

  it('rejects malformed findMove (missing/short candidates, none correct)', () => {
    expect(isValidFindMoveQuestion(null)).toBe(false);
    expect(isValidFindMoveQuestion({ ...goodFindMove, candidates: undefined } as unknown as FindMoveQuestion)).toBe(false);
    expect(isValidFindMoveQuestion({ ...goodFindMove, candidates: [goodFindMove.candidates[0]] })).toBe(false);
    expect(isValidFindMoveQuestion({ ...goodFindMove, candidates: goodFindMove.candidates.map((c) => ({ ...c, correct: false })) })).toBe(false);
  });

  it('rejects malformed drill (missing/empty moves)', () => {
    expect(isValidDrillLine(null)).toBe(false);
    expect(isValidDrillLine({ ...goodDrill, moves: undefined } as unknown as DrillLine)).toBe(false);
    expect(isValidDrillLine({ ...goodDrill, moves: [] })).toBe(false);
  });
});
