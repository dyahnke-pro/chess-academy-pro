/**
 * WO-STANDARD-01 F4 — the ONE chokepoint speaks from ONE seat, in every
 * language, and still answers when the provider is dead.
 *
 * Three contracts on `voiceFacts`, each proven on OUTPUT through a mocked
 * `openai` client (the real `callDeepSeek` runs; only the wire is faked):
 *
 *  1. EVERY register (kid / review / warm / plain) carries `perspectiveRule`
 *     — the one string. Before this gate none of the four did, so the model
 *     was free to re-seat "your knight" as "his knight" on the way out.
 *  2. The TRANSLATED path runs containment (squares lexicon). It used to skip
 *     the net entirely, so a Spanish tangent onto a square the facts never
 *     gave reached the student while the same English tangent was refused.
 *  3. DEGRADE=llm — with the provider 401ing, the computed facts are served in
 *     the raw register. Under G0 the model only phrases; a dead phraser must
 *     never mean a silent coach.
 *
 * NEGATIVE CONTROL: drop the `perspective` append in coachApi.ts and (1) fails
 * on all four registers; restore the old `if (!translating)` guard and (2)
 * fails on the d5 tangent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type Params = { messages: Array<{ role: string; content: string }> };
const calls: Params[] = [];
let reply: (p: Params) => Promise<string> = async () => 'ok';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: async (params: Params) => {
          calls.push(params);
          const content = await reply(params);
          return { choices: [{ message: { content }, finish_reason: 'stop' }] };
        },
      },
    };
  },
}));

import { voiceFacts } from './coachApi';

const systemOf = (p: Params): string => p.messages.find((m) => m.role === 'system')?.content ?? '';

beforeEach(() => {
  calls.length = 0;
  reply = async () => 'ok';
});

describe('every register carries the ONE perspective string', () => {
  const facts = 'Your knight on f3 eyes e5.';
  const cases: Array<[string, Parameters<typeof voiceFacts>[1]]> = [
    ['kid', { kidSafe: true }],
    ['review', { warm: true, intent: 'review-intro' }],
    ['warm/live', { warm: true, intent: 'move-narration' }],
    ['plain', {}],
  ];
  for (const [name, opts] of cases) {
    it(`${name} register`, async () => {
      reply = async () => 'Your knight on f3 eyes e5.';
      await voiceFacts(facts, { ...opts, perspective: { mode: 'student', studentSide: 'black' } });
      expect(calls.length, 'the phrasing call never fired').toBe(1);
      const system = systemOf(calls[0]);
      expect(system).toMatch(/PERSPECTIVE — ONE STANDARD, NO EXCEPTIONS/);
      expect(system).toMatch(/playing as black/);
      expect(system).toMatch(/he \/ him \/ his/);
    });
  }

  it('defaults to the student seat when no perspective is given', async () => {
    await voiceFacts(facts, {});
    expect(systemOf(calls[0])).toMatch(/The student's OWN side is "you \/ your"/);
  });

  it('a surface where the coach IS the opponent says so', async () => {
    await voiceFacts(facts, { warm: true, intent: 'position-read', perspective: { mode: 'coach-is-opponent' } });
    expect(systemOf(calls[0])).toMatch(/your OWN pieces are "I \/ my"/);
  });
});

describe('the translated path keeps the board net', () => {
  const facts = 'Your knight on f3 eyes e5.';

  it('a Spanish reply that wanders to a square the facts never gave loses that sentence', async () => {
    reply = async () => 'Tu caballo en f3 mira e5. Y el peón en d5 está colgando.';
    const out = await voiceFacts(facts, { targetLanguage: 'Spanish' });
    // Proportionate: the offending sentence is stripped, the faithful one stays.
    expect(out).not.toMatch(/d5/);
    expect(out).toMatch(/f3/);
  });

  it('a faithful Spanish reply passes — the English concept lexicon is not applied to it', async () => {
    const spanish = 'Tu caballo en f3 mira e5, una horquilla en potencia.';
    reply = async () => spanish;
    expect(await voiceFacts(facts, { targetLanguage: 'Spanish' })).toBe(spanish);
  });
});

describe('DEGRADE=llm — the coach still answers in the computed register', () => {
  it('a 401 from the provider serves the computed facts, never null', async () => {
    reply = async () => { throw Object.assign(new Error('401 degraded-audit'), { status: 401 }); };
    const out = await voiceFacts('Your knight on f3 eyes e5.', { warm: true, intent: 'move-narration' });
    expect(out).toBe('Your knight on f3 eyes e5.');
  });
});
