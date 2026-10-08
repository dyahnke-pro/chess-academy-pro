import { describe, expect, it } from 'vitest';
import { resolveFollowUp } from './followUp';

describe('resolveFollowUp', () => {
  const best = 'The best move here is Nf3 — it develops and guards e5.';
  it.each(['why?', 'why tho', 'how so?', 'and why'])('"%s" after a named best move asks why it is best', (q) => {
    expect(resolveFollowUp(q, best)).toBe('why is that the best move?');
  });
  it.each(['what then?', 'and then?', 'then what', 'what happens next?'])('"%s" asks what follows the named move', (q) => {
    expect(resolveFollowUp(q, best)).toBe('what happens if I play Nf3?');
  });
  it('leaves a real question alone', () => {
    expect(resolveFollowUp('what is a fork?', best)).toBe('what is a fork?');
  });
  it('leaves a follow-up alone with nothing to resolve against', () => {
    expect(resolveFollowUp('what then?', null)).toBe('what then?');
    expect(resolveFollowUp('what then?', 'Nice game.')).toBe('what then?');
  });
});
