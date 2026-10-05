import { describe, it, expect } from 'vitest';
import { conceptPassageFor, corpusHitFor } from './weaknessConceptPassage';
import { conceptForCluster } from './weaknessConceptMap';
import { searchTheoryPassage } from './chessConceptService';

describe('weakness concept passages come by id, never by text search (walk 2026-10-04 defect 3)', () => {
  it('"missed hanging pieces" has no corpus passage, so none is read — not the pin passage', () => {
    const concept = conceptForCluster('analysis:tactic:hanging_piece', 'tactical');
    expect(concept).not.toBeNull();
    // The old path: a text search lands on a DIFFERENT concept.
    const searched = searchTheoryPassage(concept!.conceptQuery);
    expect(searched?.conceptId).not.toBe(undefined);
    expect(searched?.conceptId).not.toMatch(/hanging|loose/);
    // The new path: empty, not wrong.
    expect(conceptPassageFor(concept)).toBe('');
  });

  it('a concept the corpus covers reads its own passage', () => {
    const fork = conceptForCluster('analysis:tactic:fork', 'tactical');
    expect(corpusHitFor(fork?.corpusConceptId)?.conceptId).toBe('tac-fork');
    expect(conceptPassageFor(fork).length).toBeGreaterThan(40);
  });

  it('an unknown id is empty', () => {
    expect(corpusHitFor('nope')).toBeNull();
    expect(corpusHitFor(undefined)).toBeNull();
  });
});
