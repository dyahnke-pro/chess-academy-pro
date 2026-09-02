import { describe, it, expect } from 'vitest';
import { isBestMoveQuestion, isNameOpeningQuestion, typedMoveListInAsk, recordVsTarget, isRecordVsQuestion } from './questionIntents';
import { matchEndgameLesson } from '../services/endgameLessonsService';
import { detectConceptsInText } from '../services/chessConceptService';

/**
 * Routing regressions caught by the coach capability battery (David 2026-09-02:
 * "throw every question at coach ... all fixes verified with a different
 * question"). Each block pins the ROOT CAUSE, then re-checks with phrasings the
 * bug was NOT found on, so the fix has to generalize — not paper over one string.
 */
describe('battery routing regressions', () => {
  describe('isBestMoveQuestion no longer false-fires on "is a good X"', () => {
    // The SAN token [A-Za-z0-9+#=-]{1,6} matched the article "a", so "is A good
    // bishop vs a bad bishop" hijacked a pure concept question into best-move.
    it('does not fire on concept questions containing "is a good/best"', () => {
      for (const q of [
        'what is a good bishop vs a bad bishop?',
        'is a good pawn structure worth a pawn',
        'what is a good plan in this structure',
        'is a good knight better than a bad bishop',
        'what is a strong outpost',
      ]) expect(isBestMoveQuestion(q), q).toBe(false);
    });
    it('still fires on real move-soundness / best-move asks', () => {
      for (const q of [
        'is Nf3 good?', 'is Bxh7 sound?', 'is e4 the best move?',
        'is O-O good here?', 'is this the best move?', 'is it winning?',
        'what is the best move?', 'is Qxd5 a good move?',
      ]) expect(isBestMoveQuestion(q), q).toBe(true);
    });
  });

  describe('a named endgame technique is matched even when only a concept question', () => {
    // "rule of the square" set only isConceptQuestion; the concept corpus had no
    // passage, so it fell to a position default ("the best move is e4"). The
    // technique lane now also fires on a conceptQuestion — matchEndgameLesson is
    // the guard (null for any non-endgame concept).
    it('matchEndgameLesson resolves the named techniques the concept lane misses', () => {
      expect(matchEndgameLesson('what is the rule of the square?')?.id).toBe('rule-of-the-square');
      expect(matchEndgameLesson('how does triangulation work')?.id).toBe('triangulation');
      expect(matchEndgameLesson('explain key squares')?.id).toBe('key-squares');
      expect(matchEndgameLesson('what is outflanking')?.id).toBe('outflanking');
    });
    it('stays null for ordinary (non-endgame) concepts so it never steals them', () => {
      for (const q of ['what is a good bishop vs a bad bishop?', 'how do I play against an IQP', 'why control the centre']) {
        expect(matchEndgameLesson(q), q).toBeNull();
      }
    });
  });

  describe('name-the-opening recognizes a TYPED move list', () => {
    it('fires on "what/which opening is <moves>" and "what do you call <moves>"', () => {
      for (const q of [
        'what opening is 1.e4 e5 2.Nf3 Nc6 3.Bb5?',
        'what do you call 1.e4 c5?',
        'which opening is 1.e4 e6?',
        'name this opening: 1.d4 d5 2.c4',
        'what opening is e4 c5 Nf3',
      ]) expect(isNameOpeningQuestion(q), q).toBe(true);
    });
    it('does NOT hijack recommendations, profile, or move-free chat', () => {
      for (const q of [
        'what opening should I play against 1.e4?',
        'what is my best opening?',
        'what opening is good for attackers?',
        'what opening should I learn',
        'what can you help me with?',
      ]) expect(isNameOpeningQuestion(q), q).toBe(false);
    });
    it('typedMoveListInAsk detects move numbers and move runs, not prose', () => {
      expect(typedMoveListInAsk('1.e4 e5 2.Nf3')).toBe(true);
      expect(typedMoveListInAsk('e4 c5 Nf3')).toBe(true);
      expect(typedMoveListInAsk('what is a good bishop')).toBe(false);
      expect(typedMoveListInAsk('how do I play the sicilian')).toBe(false);
    });
  });

  describe('"best play" is a verdict phrase, not an opponent', () => {
    // "what's the result with best play?" on an endgame board answered "no games
    // against 'best play' logged" — the record-vs lane captured the chess phrase
    // after "with" as an opponent (endgame-live audit 2026-09-02).
    it('rejects play-quality phrases as opponents', () => {
      for (const q of ["what's the result with best play?", 'what is the result with perfect play', 'how do I do against optimal play', 'what happens with best moves', 'result with the engine']) {
        expect(recordVsTarget(q), q).toBeNull();
        expect(isRecordVsQuestion(q), q).toBe(false);
      }
    });
    it('still resolves a real opponent / opening', () => {
      expect(recordVsTarget('what is my record against magnus')).toBe('magnus');
      expect(recordVsTarget('how do I do vs the london')).toBe('london');
    });
  });

  describe('concept detection tolerates plurals ("how do skewers work")', () => {
    // \bskewer\b did not match "skewerS", so a plural tactic-concept ask detected
    // nothing and fell to the live-board scan ("nothing is hanging") instead of
    // teaching the motif. detectConceptsInText now allows a trailing e?s.
    it('detects the motif whether singular or plural', () => {
      expect(detectConceptsInText('how do skewers work?')).toContain('tac-skewer');
      expect(detectConceptsInText('what is a skewer?')).toContain('tac-skewer');
      expect(detectConceptsInText('how do forks work')).toContain('tac-fork');
      expect(detectConceptsInText('what is a fork')).toContain('tac-fork');
    });
  });
});
