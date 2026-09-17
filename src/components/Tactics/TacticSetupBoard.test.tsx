import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { TacticSetupBoard } from './TacticSetupBoard';
import { buildSetupPuzzle, resetFactoryCounter } from '../../test/factories';

// THE HINT NUDGE IS CODE-COMPUTED, NOT AN LLM ANSWER (G0 inversion 2026-09-06).
// This block used to mock `coachService.ask` and rely on its text BECOMING the
// nudge — the comment here said so. After the inversion `useHintSystem`'s one-tap
// tier-3 branch computes the answer from a real Stockfish read and never calls
// the brain, so the mock stopped mattering and the nudge row went red on `main`:
// with no engine mock, `analyzePosition` never resolves in jsdom, `bestMoveUci`
// is absent, and `nudgeText` stays null. The engine mock below is the dependency
// the computed path actually has. Mirrors useHintSystem.test.ts.
vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    analyzePosition: vi.fn().mockResolvedValue({
      bestMove: 'g1f3',
      evaluation: 30,
      isMate: false,
      mateIn: null,
      depth: 10,
      topLines: [],
      nodesPerSecond: 0,
    }),
    stop: vi.fn(),
  },
}));
vi.mock('../../hooks/stockfishFenCache', () => ({
  getCachedStockfish: vi.fn(() => undefined),
  setCachedStockfish: vi.fn(),
}));

// API-leak guard (WO-TEST-CLEANUP-01 Part A) — intercepts modern
// brain entry point + all 6 network-wrapping coachApi exports. Kept as a LEAK
// GUARD: nothing here should reach the brain, and a call means it did.
vi.mock('../../coach/coachService', () => ({
  coachService: {
    ask: vi.fn().mockResolvedValue({
      text: '[TEST MOCK] hint nudge text',
      toolCallIds: [],
      provider: 'deepseek',
    }),
  },
}));
vi.mock('../../services/coachApi', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../services/coachApi')>();
  return {
    ...orig,
    getCoachCommentary: vi.fn().mockResolvedValue(''),
    getCoachChatResponse: vi.fn().mockResolvedValue(''),
    getCoachStructuredResponse: vi.fn().mockResolvedValue({}),
    getKidLlmResponse: vi.fn().mockResolvedValue(''),
    callAnthropicWithTool: vi.fn().mockResolvedValue({}),
    callDeepseekWithTool: vi.fn().mockResolvedValue({}),
  };
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();

// The COMPLETE mock — every speak* the service has, so a path that starts
// calling a new one cannot throw here. This file is why it exists: it listed
// `speak` and not `speakForced`, the tier-3 hint moved onto `speakForced` in
// the 2026-09-06 G0 inversion, the call threw, and the nudge row went red
// reading as a product failure.
vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return {
    voiceService: buildVoiceServiceMock({
      speak: vi.fn((...args: unknown[]) => mockSpeak(...args) as Promise<void>),
      speakForced: vi.fn((...args: unknown[]) => mockSpeak(...args) as Promise<void>),
      stop: vi.fn(() => { mockStop(); }),
    }),
  };
});

vi.mock('../../services/tacticNarrationService', () => ({
  setupIntro: (): string => 'Find the setup move.',
  setupPrepPlanted: (): string => 'Now calculate the tactic.',
  setupRevealComplete: (): string => 'Tactic revealed!',
  setupIncorrect: (): string => 'Not quite right.',
}));

vi.mock('../../services/tacticalProfileService', () => ({
  tacticTypeLabel: (t: string): string => t.replace(/_/g, ' '),
  tacticTypeIcon: (): string => '',
}));

// Mock useSettings to control showHints
const mockSettings = { showHints: true };
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, updateSetting: vi.fn() }),
}));

describe('TacticSetupBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounter();
    mockSettings.showHints = true;
  });

  it('renders the board with status message', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-board')).toBeInTheDocument();
    expect(screen.getByText('Find the quiet setup move')).toBeInTheDocument();
  });

  it('shows hint button when showHints is enabled', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-hint-area')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Hint');
  });

  it('hides hint button when showHints is disabled', () => {
    mockSettings.showHints = false;
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.queryByTestId('setup-hint-area')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
  });

  it('jumps straight to the full answer (tier 3) on the first tap', async () => {
    // One-tap hint design (David 2026-05-26: "All hint sources I want to
    // just show the answer on first press") — no incremental 0→1→2
    // ladder; the first click jumps to Tier 3.
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const hintButton = screen.getByTestId('hint-button');
    expect(hintButton).toHaveAttribute('data-level', '0');

    fireEvent.click(hintButton);

    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '3');
    });
  });

  it('shows nudge text after the one-tap full-answer hint', async () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    const hintButton = screen.getByTestId('hint-button');

    // One tap → Tier 3; the async brain call then populates the nudge.
    fireEvent.click(hintButton);
    await waitFor(() => {
      expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '3');
    });

    // Nudge text should appear once the brain call resolves.
    await waitFor(() => {
      expect(screen.getByTestId('hint-nudge')).toBeInTheDocument();
    });
  });

  it('speaks intro narration on mount', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(mockSpeak).toHaveBeenCalledWith('Find the setup move.');
  });

  it('shows move indicator for player turn', () => {
    const puzzle = buildSetupPuzzle({ difficulty: 1 });
    render(<TacticSetupBoard puzzle={puzzle} onComplete={vi.fn()} />);

    expect(screen.getByText(/find the quiet move that sets up the/)).toBeInTheDocument();
  });
});
