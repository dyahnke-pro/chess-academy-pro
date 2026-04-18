import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  routeChatIntent,
  __test__resolvePuzzleTheme,
  __test__extractFocus,
  __test__extractProposedOpening,
  __test__extractProposedUserSide,
} from './coachIntentRouter';

// Mock the resource-lookup layer so tests don't hit Dexie.
vi.mock('./walkthroughResolver', () => ({
  matchOpeningForSubject: vi.fn(),
}));
vi.mock('./middlegamePlanner', () => ({
  findPlanForOpening: vi.fn(),
  findPlanBySubject: vi.fn(),
}));
vi.mock('./gameContextService', () => ({
  findLastMatchingGame: vi.fn(),
}));
vi.mock('./openingService', () => ({
  getWeakestOpenings: vi.fn(async () => []),
}));

import { matchOpeningForSubject } from './walkthroughResolver';
import { findLastMatchingGame } from './gameContextService';
import { getWeakestOpenings } from './openingService';
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
    // "italian" now expands to "Italian Game" via the alias map so the
    // opening-book lookup downstream resolves.
    expect(routed!.path).toContain('subject=Italian+Game');
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

describe('review-game routing', () => {
  beforeEach(() => {
    vi.mocked(findLastMatchingGame).mockReset();
  });

  it('routes "review my last game" to /coach/play?review=<id>', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce({
      id: 'g-42',
      white: 'TestUser',
      black: 'Alice',
      result: '1-0',
      date: '2024-12-01',
      eco: 'E04',
    } as never);
    const routed = await routeChatIntent('review my last game');
    expect(routed).not.toBeNull();
    expect(routed!.path).toBe('/coach/play?review=g-42');
    expect(routed!.ackMessage).toContain('TestUser vs Alice');
    expect(routed!.ackMessage).toContain('White won');
  });

  it('passes subject filter to findLastMatchingGame', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce({
      id: 'g-99',
      white: 'U',
      black: 'O',
      result: '0-1',
      date: null,
      eco: 'E04',
    } as never);
    await routeChatIntent('run me through my last catalan');
    expect(findLastMatchingGame).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringMatching(/catalan/i) as string }),
    );
  });

  it('passes source filter when query names a site', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce({
      id: 'g-77',
      white: 'U',
      black: 'O',
      result: '1-0',
      date: null,
      eco: null,
    } as never);
    await routeChatIntent('review my last game on chess.com');
    expect(findLastMatchingGame).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'chesscom' }),
    );
  });

  it('returns a reply-only offer (no path) when no games match a subject', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce(null);
    const routed = await routeChatIntent('review my last catalan');
    expect(routed).not.toBeNull();
    expect(routed!.path).toBeUndefined();
    expect(routed!.ackMessage.toLowerCase()).toContain('catalan');
    expect(routed!.ackMessage.toLowerCase()).toContain("don't see");
    // Ack must end with a play-game offer so the affirmation flow
    // catches "yes" on the next turn.
    expect(routed!.ackMessage.toLowerCase()).toMatch(/want to play/);
  });

  it('returns a reply-only offer (no path) when no games match a source', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce(null);
    const routed = await routeChatIntent('review my last game on lichess');
    expect(routed).not.toBeNull();
    expect(routed!.path).toBeUndefined();
    expect(routed!.ackMessage.toLowerCase()).toContain('lichess');
  });

  it('returns a reply-only offer (no path) when no games at all', async () => {
    vi.mocked(findLastMatchingGame).mockResolvedValueOnce(null);
    const routed = await routeChatIntent('review my last game');
    expect(routed).not.toBeNull();
    expect(routed!.path).toBeUndefined();
    expect(routed!.ackMessage.toLowerCase()).toContain('history');
  });

  it('"yes" after the no-match offer routes to play-against (affirmation flow)', async () => {
    // Simulate the prior turn: coach already replied with the no-match
    // offer text (matches ASSISTANT_GAME_PROPOSAL_RE).
    const priorAck =
      "I don't see any catalan games in your history yet. Want to play a game from the catalan so you can build some experience to review later?";
    const routed = await routeChatIntent('yes', { lastAssistantMessage: priorAck });
    expect(routed).not.toBeNull();
    expect(routed!.path).toMatch(/^\/coach\/session\/play-against/);
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
    // "What is my repertoire size?" — genuine question, no dedicated
    // intent — should fall through to LLM chat.
    const routed = await routeChatIntent('What is my repertoire size?', {
      lastAssistantMessage: PROPOSAL,
    });
    expect(routed).toBeNull();
  });
});

describe('weakest-opening intent', () => {
  beforeEach(() => {
    vi.mocked(getWeakestOpenings).mockReset();
    vi.mocked(getWeakestOpenings).mockResolvedValue([]);
  });

  it('answers "What is my weakest opening?" without navigation', async () => {
    const routed = await routeChatIntent('What is my weakest opening?');
    expect(routed).not.toBeNull();
    expect(routed!.path).toBeUndefined();
    expect(routed!.ackMessage).toMatch(/opening|repertoire/i);
  });

  it('forwards an "as black" side filter to getWeakestOpenings', async () => {
    await routeChatIntent("What's my worst opening as black?");
    expect(getWeakestOpenings).toHaveBeenCalledWith(3, 'black');
  });

  it('formats the list when openings exist', async () => {
    vi.mocked(getWeakestOpenings).mockResolvedValue([
      { name: 'Sicilian Defense', color: 'black', drillAttempts: 10, drillAccuracy: 0.4 },
      { name: 'French Defense', color: 'black', drillAttempts: 0, drillAccuracy: 0 },
    ] as never);
    const routed = await routeChatIntent('What are my weakest openings?');
    expect(routed!.ackMessage).toContain('Sicilian Defense');
    expect(routed!.ackMessage).toContain('40% accuracy');
    expect(routed!.ackMessage).toContain('French Defense');
    expect(routed!.ackMessage).toContain('not drilled yet');
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

describe('extractProposedOpening', () => {
  it('picks up a specific Sicilian variation', () => {
    expect(
      __test__extractProposedOpening(
        "Let's play a game — I'll be White and play the Sicilian Najdorf.",
      ),
    ).toBe('Sicilian Najdorf');
  });

  it('falls back to the opening family when no variation is named', () => {
    expect(
      __test__extractProposedOpening("Ready to play? How about the Italian?"),
    ).toBe('Italian');
  });

  it('returns undefined when no known opening appears', () => {
    expect(
      __test__extractProposedOpening("Let's play a game focused on endgame technique."),
    ).toBeUndefined();
  });
});

describe('extractProposedUserSide', () => {
  it("flips \"I'll be White\" to black for the user", () => {
    expect(
      __test__extractProposedUserSide("Let's play — I'll be White, you play Black."),
    ).toBe('black');
  });

  it('returns the direct "you play Black" side', () => {
    expect(__test__extractProposedUserSide('You play Black.')).toBe('black');
  });

  it('returns the direct "you play White" side', () => {
    expect(__test__extractProposedUserSide('You play White.')).toBe('white');
  });

  it('returns undefined when no side is stated', () => {
    expect(__test__extractProposedUserSide("Let's play a game!")).toBeUndefined();
  });
});

describe('affirmation-after-proposal: structured extraction', () => {
  it('forwards opening + user side to /coach/session/play-against params', async () => {
    const routed = await routeChatIntent("let's do it", {
      lastAssistantMessage:
        "Let's play a game — I'll be White and play the Sicilian Najdorf, you play Black.",
    });
    expect(routed).not.toBeNull();
    expect(routed!.path).toContain('subject=Sicilian+Najdorf');
    expect(routed!.path).toContain('side=black');
  });

  it('still works when only the opening is named', async () => {
    const routed = await routeChatIntent('yes', {
      lastAssistantMessage: "Let's play the Italian Game.",
    });
    expect(routed!.path).toContain('subject=Italian+Game');
    expect(routed!.path).not.toContain('side=');
  });
});

describe('narrate vs review routing', () => {
  beforeEach(() => {
    vi.mocked(findLastMatchingGame).mockResolvedValue({
      id: 'game-123',
      white: 'Me',
      black: 'Opp',
      result: '1-0',
      date: '2026-01-01',
    } as never);
  });

  it('routes "Narrate my last game" to /coach/session/narrate', async () => {
    const routed = await routeChatIntent('Narrate my last game');
    expect(routed!.path).toMatch(/^\/coach\/session\/narrate/);
    expect(routed!.path).toContain('gameId=game-123');
  });

  it('keeps "Review my last game" on /coach/play?review=', async () => {
    const routed = await routeChatIntent('Review my last game');
    expect(routed!.path).toMatch(/^\/coach\/play\?review=game-123$/);
  });
});
