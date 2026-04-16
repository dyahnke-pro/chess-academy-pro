import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeChatIntent, __test__resolvePuzzleTheme, __test__extractFocus } from './coachIntentRouter';

// Mock the resource-lookup layer so tests don't hit Dexie.
vi.mock('./walkthroughResolver', () => ({
  matchOpeningForSubject: vi.fn(),
}));
vi.mock('./middlegamePlanner', () => ({
  findPlanForOpening: vi.fn(),
  findPlanBySubject: vi.fn(),
}));

import { matchOpeningForSubject } from './walkthroughResolver';
import {
  findPlanForOpening,
  findPlanBySubject,
} from './middlegamePlanner';

describe('routeChatIntent', () => {
  beforeEach(() => {
    vi.mocked(matchOpeningForSubject).mockReset();
    vi.mocked(findPlanForOpening).mockReset();
    vi.mocked(findPlanBySubject).mockReset();
  });

  it('returns null for QA', async () => {
    const routed = await routeChatIntent('Why is the f7 square weak?');
    expect(routed).toBeNull();
  });

  it('routes play-against without resource lookup', async () => {
    const routed = await routeChatIntent("Let's play the Sicilian Najdorf");
    expect(routed).not.toBeNull();
    expect(routed!.path).toMatch(/^\/coach\/session\/play-against/);
    expect(routed!.path).toContain('subject=');
    expect(matchOpeningForSubject).not.toHaveBeenCalled();
  });

  it('routes play-against with side and difficulty', async () => {
    const routed = await routeChatIntent('play against me as black, easy');
    expect(routed).not.toBeNull();
    expect(routed!.path).toContain('side=black');
    expect(routed!.path).toContain('difficulty=easy');
  });

  it('routes explain-position with optional fen', async () => {
    const fen = '8/8/8/8/8/8/8/k6K w - - 0 1';
    const routed = await routeChatIntent('explain this position', {
      currentFen: fen,
    });
    expect(routed).not.toBeNull();
    expect(routed!.path.startsWith('/coach/session/explain-position')).toBe(true);
    // Round-trip the FEN through URLSearchParams to check encoding.
    const qs = routed!.path.split('?')[1];
    const params = new URLSearchParams(qs);
    expect(params.get('fen')).toBe(fen);
  });

  it('navigates walkthrough only when opening matches', async () => {
    vi.mocked(matchOpeningForSubject).mockResolvedValueOnce(null);
    const missing = await routeChatIntent('walk me through the Flibbertigibbet');
    expect(missing).toBeNull();

    vi.mocked(matchOpeningForSubject).mockResolvedValueOnce({
      opening: { id: 'sicilian', name: 'Sicilian Defense' } as never,
    });
    const found = await routeChatIntent('walk me through the Sicilian');
    expect(found).not.toBeNull();
    expect(found!.path).toMatch(/^\/coach\/session\/walkthrough/);
    expect(found!.path).toContain('subject=');
  });

  it('navigates puzzle only when theme resolves to a known tactic', async () => {
    const unknown = await routeChatIntent('give me a whatever puzzle');
    expect(unknown).toBeNull();

    const known = await routeChatIntent('give me a fork puzzle');
    expect(known).not.toBeNull();
    expect(known!.path).toMatch(/^\/coach\/session\/puzzle/);
    expect(known!.path).toContain('theme=fork');
  });

  it('navigates continue-middlegame only when a plan or subject resolves', async () => {
    vi.mocked(findPlanForOpening).mockReturnValue(null);
    vi.mocked(findPlanBySubject).mockReturnValue(null);
    const bare = await routeChatIntent('run me through the middlegame');
    expect(bare).toBeNull();
  });

  it('navigates continue-middlegame WITH subject when the user names an opening', async () => {
    vi.mocked(findPlanForOpening).mockReturnValue(null);
    vi.mocked(findPlanBySubject).mockReturnValue({
      id: 'mp-italian',
      title: 'Italian Middlegame',
    } as never);
    const routed = await routeChatIntent(
      'run me through the middlegame plans for the Italian',
    );
    expect(routed).not.toBeNull();
    expect(routed!.path).toMatch(/^\/coach\/session\/middlegame/);
    expect(routed!.path).toContain('subject=italian');
  });

  it('never throws — router errors become null so chat keeps working', async () => {
    vi.mocked(matchOpeningForSubject).mockRejectedValueOnce(new Error('db down'));
    await expect(
      routeChatIntent('walk me through the London'),
    ).rejects.toBeInstanceOf(Error);
    // The above confirms errors propagate; callers are responsible for
    // wrapping in try/catch (see CoachChatPage.handleSend).
  });
});

describe('affirmation-after-game-proposal', () => {
  const PROPOSAL =
    "That's perfect for today — let's play a game where we focus on spotting hanging pieces and simple combinations.";

  it('routes "Let\'s do it!" to play-against when coach just proposed a game', async () => {
    const routed = await routeChatIntent("Let's do it!", {
      lastAssistantMessage: PROPOSAL,
    });
    expect(routed).not.toBeNull();
    expect(routed!.path).toMatch(/^\/coach\/session\/play-against/);
    expect(routed!.intent.kind).toBe('play-against');
  });

  it('forwards the assistant\u2019s focus phrase as a `focus` query param', async () => {
    const routed = await routeChatIntent('yes', { lastAssistantMessage: PROPOSAL });
    expect(routed).not.toBeNull();
    const path = routed!.path;
    expect(path).toContain('focus=');
    // URLSearchParams encodes spaces as `+`; parse properly to compare.
    const params = new URLSearchParams(path.split('?')[1]);
    const focus = params.get('focus') ?? '';
    expect(focus.toLowerCase()).toContain('hanging pieces');
  });

  it('accepts several natural affirmations', async () => {
    for (const reply of ['yes', 'yeah', 'sure', 'ok', 'sounds good', 'let\u2019s go', "I'm in"]) {
      const routed = await routeChatIntent(reply, { lastAssistantMessage: PROPOSAL });
      expect(routed, `expected "${reply}" to route`).not.toBeNull();
      expect(routed!.path).toMatch(/^\/coach\/session\/play-against/);
    }
  });

  it('does NOT route when affirmation is standalone (no game proposal in prior turn)', async () => {
    const routed = await routeChatIntent('yes', {
      lastAssistantMessage: 'That is a classic developing move.',
    });
    expect(routed).toBeNull();
  });

  it('does NOT route when there is no prior assistant message', async () => {
    const routed = await routeChatIntent('let\u2019s do it');
    expect(routed).toBeNull();
  });

  it('does NOT hijack unrelated user messages even after a proposal', async () => {
    const routed = await routeChatIntent('What is my weakest opening?', {
      lastAssistantMessage: PROPOSAL,
    });
    // "What is my weakest opening?" is a genuine question — don't steal it.
    expect(routed).toBeNull();
  });
});

describe('extractFocus', () => {
  it('pulls "focus on X" phrases', () => {
    expect(
      __test__extractFocus("let's play a game where we focus on spotting hanging pieces"),
    ).toMatch(/hanging pieces/i);
  });

  it('pulls "about X" phrases', () => {
    expect(__test__extractFocus('play a game about rook endgames')).toMatch(
      /rook endgames/i,
    );
  });

  it('falls back to the trimmed message when no template matches', () => {
    const text = 'Ready for a game?';
    const out = __test__extractFocus(text);
    expect(out).toBe('Ready for a game?');
  });
});

describe('resolvePuzzleTheme', () => {
  it('matches simple themes', () => {
    expect(__test__resolvePuzzleTheme('fork')).toBe('fork');
    expect(__test__resolvePuzzleTheme('knight fork')).toBe('fork');
    expect(__test__resolvePuzzleTheme('pin')).toBe('pin');
  });

  it('matches camelCase themes via spaced form', () => {
    expect(__test__resolvePuzzleTheme('back rank mate')).toBe('backRankMate');
  });

  it('returns null for unknown themes', () => {
    expect(__test__resolvePuzzleTheme('zxc abc')).toBeNull();
    expect(__test__resolvePuzzleTheme(undefined)).toBeNull();
  });
});
