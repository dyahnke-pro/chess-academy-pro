// "Tell me more about the a3 sicillian" (David 2026-10-27) through the REAL
// coachService.ask path, the one the chat runs. The unit tests passed while
// prod answered "There's no answer for that one yet": the door labelled the
// turn from his words and the answer was computed from the filler-stripped
// words, which carry no opening. Only the network is stubbed (no model, no
// masters' games), so every answer here is computed from the bundled data.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { coachService } from './coachService';

function offline(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
}

const ask = (text: string) => coachService.ask({
  surface: 'standalone-chat',
  ask: text,
  liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat' },
} as unknown as Parameters<typeof coachService.ask>[0], {});

const BRIEF = /^The .+ is [^.]+\. .*Want me to teach it\?$/s;

describe('the chat answers a named opening from the databases', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it.each([
    'Tell me more about the a3 sicillian',
    'what do you know about the a3 sicilian?',
    'tell me a bit about the Mengarini Sicilian',
    'can you tell me something about the Bowdler?',
  ])('%s → the line, and the lesson is offered', async (q) => {
    offline();
    const a = await ask(q);
    const want = /bowdler/i.test(q)
      ? { lead: 'The Sicilian Defense: Bowdler Attack is e4 c5 Bc4.', id: 'Sicilian Defense: Bowdler Attack' }
      : { lead: 'The Sicilian Defense: Mengarini Variation is e4 c5 a3.', id: 'Sicilian Defense: Mengarini Variation' };
    expect(a.text.startsWith(want.lead)).toBe(true);
    expect(a.text).toMatch(/Want me to teach it\?$/);
    expect(a.actionOffer?.[0]).toEqual({ type: 'teach_opening', id: want.id });
  }, 30_000);

  it('"tell me about the Mengarini" — three openings have one — asks which, by name', async () => {
    offline();
    const a = await ask('tell me about the Mengarini');
    expect(a.text).toMatch(/^Which one do you mean — /);
    for (const n of ['Sicilian Defense: Mengarini Variation', 'Vienna Game: Mengarini Variation', "King's Pawn Game: Mengarini's Opening"]) expect(a.text).toContain(n);
  }, 30_000);

  it.each([
    ['tell me about the Ponziani', 'The Ponziani Opening is e4 e5 Nf3 Nc6 c3.'],
    ['tell me about the Center Game', 'The Center Game is e4 e5 d4.'],
  ])('%s says what the opening IS — its defining moves, not the lesson spine', async (q, lead) => {
    offline();
    const a = await ask(q);
    expect(a.text.startsWith(lead)).toBe(true);
  }, 30_000);

  it.each([
    'tell me about the center',
    'tell me about the endgame',
    'tell me more about pins and forks',
    "what's the idea behind the fianchetto",
    'tell me about my weaknesses',
    'tell me more about this position',
  ])('negative control — a topic is not an opening: %s', async (q) => {
    offline();
    const a = await ask(q);
    expect(a.text).not.toMatch(BRIEF);
    expect(a.actionOffer?.some((o) => o.type === 'teach_opening') ?? false).toBe(false);
  }, 30_000);
});
