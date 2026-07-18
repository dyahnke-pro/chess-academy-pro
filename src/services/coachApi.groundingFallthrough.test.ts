import { describe, it, expect } from 'vitest';
import { hasChessContentSignal, stripChessyStraySentences, buildOpeningSuggestionReply } from './coachApi';

// Dead-end rescue (David 2026-07-17): when a coach turn would serve the honest
// stock fallback because the student just NAMED an opening the surface never
// resolved, offer the DB-grounded candidates as a tappable [CHOICES:] picker
// instead of the brick wall. G0-safe: candidates come from the opening DB.
describe('buildOpeningSuggestionReply', () => {
  it('offers a single-candidate teach for an autoAccept name (the home-chat "Panov" wall)', () => {
    const reply = buildOpeningSuggestionReply('panov');
    expect(reply).not.toBeNull();
    expect(reply).toContain('[CHOICES:');
    expect(reply).toMatch(/Panov/);
    expect(reply).toMatch(/walk you through/i);
  });

  it('offers a "did you mean" picker for a misspelling with multiple candidates', () => {
    const reply = buildOpeningSuggestionReply('Najdorff');
    expect(reply).not.toBeNull();
    expect(reply).toMatch(/did you mean/i);
    // The marker carries >1 pipe-separated DB candidate, all Najdorf lines.
    const inner = /\[CHOICES:\s*([\s\S]*?)\]/.exec(reply ?? '')?.[1] ?? '';
    expect(inner.split('|').length).toBeGreaterThan(1);
    expect(inner).toMatch(/Najdorf/);
  });

  it('returns null for a genuine non-opening question (keeps the honest stock line)', () => {
    expect(buildOpeningSuggestionReply('what are my weaknesses')).toBeNull();
    expect(buildOpeningSuggestionReply('who is winning here')).toBeNull();
  });

  it('is empty-safe and does not fire on a long sentence that merely mentions an opening', () => {
    expect(buildOpeningSuggestionReply('')).toBeNull();
    expect(buildOpeningSuggestionReply('   ')).toBeNull();
    // >5 words → a real question, not a name lookup; no teach picker.
    expect(
      buildOpeningSuggestionReply('can you please tell me all about the sicilian dragon today'),
    ).toBeNull();
  });

  it('does NOT hijack a conceptual QUESTION into a teach picker (David 2026-07-18)', () => {
    // "what is the Sicilian?" wants an ANSWER, not a "did you mean? tap to
    // teach" deflection — the picker over-reached onto interrogatives and
    // stole the books/grounded answer. A short opening-name QUESTION now
    // falls through to the honest answer path.
    expect(buildOpeningSuggestionReply('what is the Sicilian?')).toBeNull();
    expect(buildOpeningSuggestionReply('what about the Caro-Kann?')).toBeNull();
    expect(buildOpeningSuggestionReply('how do I play the London?')).toBeNull();
    // …but a bare unresolved NAME still gets the rescue picker.
    expect(buildOpeningSuggestionReply('Caro Cann')).not.toBeNull();
  });
});

// Phase 1 of the coach grounding build (RIP #2): the fall-through no longer
// calls a free LLM for chess. These two deterministic guards decide the lane —
// a chess turn goes to the computed default / stock line, a non-chess turn to
// the constrained conversational lane whose output is swept for stray chess.

describe('hasChessContentSignal', () => {
  it('flags explicit move/position questions as chess', () => {
    for (const q of [
      "what's the best move here?",
      'is Nf3 good?',
      'what about exd5?',
      'who is winning?',
      'what should I play?',
      'give me a plan',
      'is my knight hanging?',
      "what's the threat?",
      'how do masters play this?',
      'teach me the Caro-Kann', // "opening"-family vocab
      'is this a good trap?',
    ]) {
      expect(hasChessContentSignal(q), q).toBe(true);
    }
  });

  it('treats genuine non-chess conversation as non-chess', () => {
    for (const q of [
      'hi!',
      'thanks, that was helpful',
      'you rock',
      'how are you today?',
      'can you speak louder?',
      'what is your name?',
      'ok cool',
    ]) {
      expect(hasChessContentSignal(q), q).toBe(false);
    }
  });

  it('is empty-safe', () => {
    expect(hasChessContentSignal('')).toBe(false);
    expect(hasChessContentSignal('   ')).toBe(false);
  });
});

describe('stripChessyStraySentences', () => {
  it('drops sentences that stray into chess content', () => {
    const input = "You're doing great! Play Nf3 to develop. Keep it up.";
    const out = stripChessyStraySentences(input);
    expect(out).not.toMatch(/Nf3/);
    expect(out).toContain("You're doing great!");
    expect(out).toContain('Keep it up.');
  });

  it('drops stat / eval / masters-play claims', () => {
    expect(stripChessyStraySentences('Masters play this 55% of the time.')).toBe('');
    expect(stripChessyStraySentences('You are +2.3 here.')).toBe('');
    expect(stripChessyStraySentences('Grandmasters prefer the quiet line.')).toBe('');
  });

  it('keeps a clean conversational reply untouched', () => {
    const input = 'Anytime! Ask me whenever you want a hand.';
    expect(stripChessyStraySentences(input)).toBe(input);
  });

  it('returns empty when every sentence is chessy', () => {
    expect(stripChessyStraySentences('Play e4. Then Bc4. Then Qh5.')).toBe('');
  });

  it('never severs a directive marker', () => {
    const input = 'Nice work. [BOARD: arrow:e2-e4:green]';
    const out = stripChessyStraySentences(input);
    expect(out).toContain('[BOARD: arrow:e2-e4:green]');
  });
});
