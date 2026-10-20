import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, OPENING_ANNOTATION_ADDITION } from './coachPrompts';

describe('coachPrompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('is a non-empty string', () => {
      expect(SYSTEM_PROMPT).toBeTruthy();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it('mentions key coaching traits', () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain('chess');
    });
  });



  describe('OPENING_ANNOTATION_ADDITION', () => {
    it('is a non-empty string with opening annotation content', () => {
      expect(OPENING_ANNOTATION_ADDITION).toBeTruthy();
      expect(OPENING_ANNOTATION_ADDITION.length).toBeGreaterThan(100);
    });

    it('enforces the 3-part structure', () => {
      expect(OPENING_ANNOTATION_ADDITION).toContain('LINE 1');
      expect(OPENING_ANNOTATION_ADDITION).toContain('LINE 2');
      expect(OPENING_ANNOTATION_ADDITION).toContain('LINE 3');
    });

    it('requires naming the opening and variation', () => {
      expect(OPENING_ANNOTATION_ADDITION).toContain('NAME THE OPENING');
      expect(OPENING_ANNOTATION_ADDITION).toContain('ALWAYS attempt to name the opening');
    });

    it('bans generic phrases', () => {
      expect(OPENING_ANNOTATION_ADDITION).toContain('NEVER use generic phrases');
      expect(OPENING_ANNOTATION_ADDITION).toContain('developing move');
      expect(OPENING_ANNOTATION_ADDITION).toContain('standard move');
      expect(OPENING_ANNOTATION_ADDITION).toContain('fighting for the center');
    });

    it('limits annotation length to 2-3 sentences', () => {
      expect(OPENING_ANNOTATION_ADDITION).toContain('2-3 sentences');
    });

    it('requires actionable next idea', () => {
      expect(OPENING_ANNOTATION_ADDITION).toContain('ACTIONABLE NEXT IDEA');
    });
  });




});
