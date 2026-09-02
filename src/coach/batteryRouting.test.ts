import { describe, it, expect } from 'vitest';
import { isBestMoveQuestion, isNameOpeningQuestion, typedMoveListInAsk, recordVsTarget, isRecordVsQuestion, isMateQuestion, isWhoseTurnQuestion, isLiveColorQuestion, isDrawQuestion } from './questionIntents';
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

  describe('mate-distance queries are recognized (tablebase, not the tactic scan)', () => {
    // "can I force mate / how many moves to mate" on a KQ-vs-K board got the
    // live-tactic scan ("nothing is hanging, quiet position") because they set
    // only isTacticsQuestion; the tablebase knows the exact mate distance
    // (endgame-live audit 2026-09-02, batch 1).
    it('recognizes forced-mate / mate-distance phrasings', () => {
      for (const q of ['can I force mate here?', 'do I have a forced mate?', 'how many moves to mate?', 'can I mate the king?', 'is there a forced mate?', 'mate in how many?']) {
        expect(isMateQuestion(q), q).toBe(true);
      }
    });
    it('does not fire on ordinary board asks', () => {
      for (const q of ['what is the best move?', 'is this winning?', 'who is better here']) expect(isMateQuestion(q), q).toBe(false);
    });
    it('also recognizes fastest/quickest-win phrasings', () => {
      for (const q of ['what is the fastest win?', 'quickest way to mate?', 'how fast can I mate?']) expect(isMateQuestion(q), q).toBe(true);
    });
  });

  describe('board-verdict intents route to the COMPUTER, not the generic default', () => {
    // Hand-driven prod audit (David 2026-09-02): on a KQ-vs-K board EVERY board
    // question ("is this a draw?", "whose turn?", "mate in how many?", "what
    // colour am I?") returned the SAME "best move Qd6, White winning" readout.
    // Each now has its own detector so computeLiveBoardVerdict answers it.
    it('isWhoseTurnQuestion fires on side-to-move asks only', () => {
      for (const q of ['whose turn is it?', "who's to move?", 'is it my move?', 'am I to move?', 'whose move']) {
        expect(isWhoseTurnQuestion(q), q).toBe(true);
      }
      for (const q of ['what is the best move?', 'is this winning?', 'how am I improving?']) {
        expect(isWhoseTurnQuestion(q), q).toBe(false);
      }
    });
    it('isLiveColorQuestion fires on live-identity asks (not proficiency)', () => {
      for (const q of ['what colour am I playing?', 'what color am I?', 'which side am I on?', 'am I white or black?', 'do I have white?']) {
        expect(isLiveColorQuestion(q), q).toBe(true);
      }
      // proficiency phrasing is isColorQuestion's job, not the live-identity one
      for (const q of ['am I better as white or black?', 'is this winning?']) {
        expect(isLiveColorQuestion(q), q).toBe(false);
      }
    });
    it('isDrawQuestion fires on draw / stalemate asks', () => {
      for (const q of ['is this a draw?', 'is it drawn?', 'is there a stalemate risk?', 'can I still draw?', 'is this heading for a draw?']) {
        expect(isDrawQuestion(q), q).toBe(true);
      }
      for (const q of ['what is the best move?', 'is this winning?', 'whose turn is it?']) {
        expect(isDrawQuestion(q), q).toBe(false);
      }
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
