// The coach teaches from the books when asked (David 2026-10-05). The REAL
// coachService.ask path: a typed book request is answered with the book's own
// passage and a reader chip, and no model is called.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { coachService } from './coachService';

const llm = vi.fn();
function installMocks(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/llm/') || url.includes('deepseek') || url.includes('anthropic')) llm(url);
    return new Response('{}', { status: 404 });
  });
}

const ask = (text: string) => coachService.ask({
  surface: 'standalone-chat',
  ask: text,
  liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat' },
} as unknown as Parameters<typeof coachService.ask>[0], {});

describe('coachService — teaching from the books', () => {
  afterEach(() => { vi.restoreAllMocks(); llm.mockReset(); });

  it('"what does Lasker say about defence?" quotes Common Sense in Chess and offers the page', async () => {
    installMocks();
    const a = await ask('What does Lasker say about defence?');
    expect(a.text).toMatch(/^Emanuel Lasker, \*Common Sense in Chess\*/);
    expect(a.text).toMatch(/the defence is the art of strengthening them/);
    expect(a.servedIntent).toBe('book-teaching');
    expect(a.actionOffer?.[0]).toMatchObject({ type: 'read_book' });
    expect(a.actionOffer?.[0].id).toMatch(/^emanuel-lasker-common-sense-in-chess@\d+$/);
    expect(llm).not.toHaveBeenCalled();
  });

  it('an ask that is not a book request is not answered from the books', async () => {
    installMocks();
    const a = await ask('what does the engine say about this move').catch(() => null);
    expect(a?.servedIntent).not.toBe('book-teaching');
  });
});
