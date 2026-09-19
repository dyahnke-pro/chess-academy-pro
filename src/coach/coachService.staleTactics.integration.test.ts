/**
 * coachService.staleTactics.integration.test
 * -------------------------------------------
 * THE ONE DOOR fires. `coachService.ask` builds the grounding object every lane
 * reads, and it is the only place `liveState.tactics` is checked against
 * `liveState.fen`. A stale package — one computed for a board the student is no
 * longer looking at — is refused there, WHOLE, before `assembleTacticsAnswer`
 * or `assemblePositionAssessment` can voice a word of it.
 *
 * Reproduces the reported defect through the REAL path (liveState → ask →
 * grounding → tactics lane), not by calling an assembler directly: on a 22-ply
 * Learn game the student heard "Your knight on b5 is hanging" fifteen plies
 * after `axb5` took it. Positive-controlled: the SAME package, offered for the
 * board it was built from, IS spoken — so the refusal is proven to be about the
 * fen and nothing else.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { coachService } from './coachService';
import { buildTacticsLiveContext } from '../services/liveTacticsContext';
import { logAppAudit } from '../services/appAuditor';

vi.mock('../services/appAuditor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/appAuditor')>()),
  logAppAudit: vi.fn(async () => {}),
}));

// The board the package was built from: White's knight on b5 is attacked by
// the a6 pawn and undefended — genuinely hanging.
const FEN_KNIGHT_ON_B5 = '4k3/8/p7/1N6/8/8/8/4K3 w - - 0 1';
// Fifteen plies later: no knights on the board at all.
const FEN_LATER = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

function installMocks(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/llm/')) {
      const body = (() => { try { return typeof init?.body === 'string' ? init.body : ''; } catch { return ''; } })();
      return new Response(JSON.stringify({
        id: 'c', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: `LLM_WAS_CALLED::${body.slice(0, 30)}` }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  });
}

async function ask(q: string, fen: string, tactics: ReturnType<typeof buildTacticsLiveContext>): Promise<string> {
  const ans = await coachService.ask(
    {
      surface: 'game-chat',
      ask: q,
      liveState: {
        surface: 'game-chat' as const,
        fen,
        whoseTurn: 'white' as const,
        studentColor: 'white' as const,
        moveHistory: [] as string[],
        currentRoute: '/coach/play',
        tactics,
      },
    },
    { maxToolRoundTrips: 3 },
  );
  return ans.text.toLowerCase();
}

beforeEach(() => { installMocks(); vi.mocked(logAppAudit).mockClear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('coachService refuses a TacticsLiveContext built for another board (David 2026-09-19)', () => {
  const pkg = buildTacticsLiveContext(FEN_KNIGHT_ON_B5, null, 'w', 1500);

  it('POSITIVE CONTROL — the same package, for the board it was built from, IS spoken', async () => {
    expect(pkg.hanging).toEqual(expect.arrayContaining([expect.objectContaining({ square: 'b5', piece: 'n', color: 'w' })]));
    const r = await ask('is anything hanging?', FEN_KNIGHT_ON_B5, pkg);
    // Whichever lane phrases it ("your knight on b5" / "careful — the knight on
    // b5"), the fresh package's fact reaches the student. The refusal below is
    // therefore about the fen and nothing else.
    expect(r).toMatch(/knight on b5 is hanging/);
    expect(vi.mocked(logAppAudit).mock.calls.some(([e]) => e.kind === 'tactics-context-stale')).toBe(false);
  });

  it('the board moved on → the package is refused whole, the b5 knight is never mentioned, and the audit says why', async () => {
    const r = await ask('is anything hanging?', FEN_LATER, pkg);
    expect(r).not.toContain('b5');
    expect(r).not.toContain('knight');
    const stale = vi.mocked(logAppAudit).mock.calls.map(([e]) => e).find((e) => e.kind === 'tactics-context-stale');
    expect(stale).toBeTruthy();
    expect(stale?.fen).toBe(FEN_LATER);
    expect(JSON.parse(stale?.details ?? '{}')).toMatchObject({ packageFen: FEN_KNIGHT_ON_B5, liveFen: FEN_LATER });
  });

  it('a position-assessment ask is protected by the same door — one gate, every lane', async () => {
    const r = await ask('how am i doing here?', FEN_LATER, pkg);
    expect(r).not.toContain('b5');
    expect(r).not.toContain('knight');
  });
});
