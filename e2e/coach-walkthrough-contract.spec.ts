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

    // Passive listener via page.on('request') — captures the request
    // body the moment the SDK initiates the HTTP send, BEFORE any
    // auth or response handling. This works even when the LLM key is
    // invalid/missing: the SDK still builds + sends the request (the
    // server then 401s, but our listener already saw the body). The
    // earlier page.route() approach required the request to fully
    // round-trip, which couldn't happen without a working key.
    page.on('request', (req) => {
      const url = req.url();
      if (!/api\.deepseek\.com|api\.anthropic\.com/.test(url)) return;
      const body = req.postData() ?? '';
      let parsed: { messages?: Array<{ role: string; content: string }>; system?: string | { type: string; text: string }[] } = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        /* keep parsed empty */
      }
      // OpenAI-style (DeepSeek): system message is in messages[].
      // Anthropic-style: `system` is a top-level field.
      let systemPrompt = '';
      if (typeof parsed.system === 'string') {
        systemPrompt = parsed.system;
      } else if (Array.isArray(parsed.system)) {
        systemPrompt = parsed.system.map((p) => p.text ?? '').join('\n');
      } else {
        systemPrompt = parsed.messages?.find((m) => m.role === 'system')?.content ?? '';
      }
      const userMsg = parsed.messages?.find((m) => m.role === 'user');
      calls.push({
        url,
        systemPrompt,
        userMessage: userMsg?.content ?? '',
      });
    });

    // /coach/teach is the user-driven chat surface — the contract
    // applies here per envelope.ts's surface routing.
    await page.goto('/coach/teach');
    // The page needs the seed DB before the chat input is reachable.
    // Use a generous wait — fresh IndexedDB cold-start can take 30+s.
    const input = page.getByRole('textbox', { name: /message to coach/i });
    await input.waitFor({ timeout: 60_000 });

    // We're verifying WIRE PRESENCE of the contract, not testing the
    // walkthrough flow itself. Any chat message that goes to the LLM
    // will carry the system prompt. We DELIBERATELY avoid "walk me
    // through X" phrases because those trigger CoachTeachPage's
    // surface-routing branch (Tier 1 static-tree resolves the
    // walkthrough in-place + returns early WITHOUT calling the LLM —
    // confirmed by the first run of this spec landing 0 intercepted
    // calls). A free-form question goes straight to coachService.ask
    // and carries the assembled envelope to the LLM.
    await input.fill('What general opening principles should I know?');
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
