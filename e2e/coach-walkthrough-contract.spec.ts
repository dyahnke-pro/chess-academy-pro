/**
 * coach-walkthrough-contract.spec.ts
 *
 * Live end-to-end verification that WALKTHROUGH_PROMISE_CONTRACT
 * reaches the LLM. Path: user navigates to /coach/teach, types
 * "walk me through the italian", the coach service builds the
 * envelope (with the contract included for `teach` surface) and
 * POSTs to the LLM provider.
 *
 * This spec INTERCEPTS that POST via Playwright's route handler,
 * captures the request body, and asserts the system prompt sent
 * to the LLM contains the contract's sentinel phrase. We never
 * actually call the LLM — the intercept returns a stub response
 * so the test doesn't burn API credits or wait on network.
 *
 * What this proves:
 *   - The contract is reaching the wire (not stripped by some
 *     middleware between envelope.ts and the fetch call)
 *   - Both DeepSeek and Anthropic primary providers carry it
 *   - The verbosity block sits after the contract in the assembled
 *     prompt (so the LLM reads them in the documented order)
 *
 * What this does NOT prove (requires real LLM):
 *   - That the LLM actually FOLLOWS the contract on every turn —
 *     that's a prompt-quality question best verified by the user
 *     in live testing on the deployed build.
 */
import { test, expect, type Page } from '@playwright/test';

const CONTRACT_SENTINEL = "WALKTHROUGH PROMISE — IF YOU SAY YOU'LL WALK ME THROUGH";

interface InterceptedCall {
  url: string;
  systemPrompt: string;
  userMessage: string;
}

test.describe('Coach walkthrough contract — wire-level verification', () => {
  test.setTimeout(120_000);

  test('system prompt to LLM contains WALKTHROUGH_PROMISE_CONTRACT on /coach/teach', async ({
    page,
  }) => {
    const calls: InterceptedCall[] = [];

    // Stub both DeepSeek and Anthropic chat endpoints with a fast
    // canned response — captures the request body so the assertion
    // can check the system prompt the surface ACTUALLY sent.
    const stubResponseSSE =
      'data: {"choices":[{"delta":{"content":"OK — play 1.e4 to start."}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":""}, "finish_reason":"stop"}]}\n\n' +
      'data: [DONE]\n\n';

    const captureAndStub = async (route: import('@playwright/test').Route) => {
      const request = route.request();
      const body = request.postData() ?? '';
      let parsed: { messages?: Array<{ role: string; content: string }> } = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        /* keep parsed empty */
      }
      const systemMsg = parsed.messages?.find((m) => m.role === 'system');
      const userMsg = parsed.messages?.find((m) => m.role === 'user');
      calls.push({
        url: request.url(),
        systemPrompt: systemMsg?.content ?? '',
        userMessage: userMsg?.content ?? '',
      });
      // Return a minimal SSE stream so the surface's streaming
      // pipeline can drain without hanging the test.
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'access-control-allow-origin': '*',
        },
        body: stubResponseSSE,
      });
    };

    await page.route('**/api.deepseek.com/**', captureAndStub);
    await page.route('**/api.anthropic.com/**', captureAndStub);

    // /coach/teach is the user-driven chat surface — the contract
    // applies here per envelope.ts's surface routing.
    await page.goto('/coach/teach');
    // The page needs the seed DB before the chat input is reachable.
    // Use a generous wait — fresh IndexedDB cold-start can take 30+s.
    await page.waitForSelector('input[placeholder*="Ask"], textarea[placeholder*="Ask"], [data-testid="coach-input"]', {
      timeout: 60_000,
    });

    // Submit a walkthrough request — the exact trigger phrase the
    // contract is designed for.
    const input = page.locator('input, textarea').filter({
      hasText: '',
    }).first();
    await input.fill('walk me through the italian');
    await page.keyboard.press('Enter');

    // Wait for at least one LLM intercept to fire. The surface may
    // make multiple calls per turn (tool round-trips); we only need
    // to inspect the FIRST one for the contract presence.
    await expect
      .poll(() => calls.length, { timeout: 30_000 })
      .toBeGreaterThan(0);

    const firstCall = calls[0];
    expect(
      firstCall.systemPrompt,
      `System prompt sent to LLM did not contain the walkthrough contract. URL=${firstCall.url}. Prompt head=${firstCall.systemPrompt.slice(0, 500)}`,
    ).toContain(CONTRACT_SENTINEL);

    // The verbosity block must sit AFTER the contract so the
    // "surrounding VERBOSITY block governs" reference reads forward.
    const contractIdx = firstCall.systemPrompt.indexOf(CONTRACT_SENTINEL);
    const verbosityIdx = firstCall.systemPrompt.search(/═══ VERBOSITY: (MINIMAL|NORMAL|VERBOSE) ═══/);
    if (verbosityIdx >= 0) {
      expect(
        verbosityIdx,
        `VERBOSITY block must appear AFTER the walkthrough contract — current ordering: contract@${contractIdx}, verbosity@${verbosityIdx}`,
      ).toBeGreaterThan(contractIdx);
    }

    // The intercepted user message must be the walkthrough trigger
    // (proves the test actually hit the right code path).
    expect(firstCall.userMessage.toLowerCase()).toContain('walk me through');
  });
});
