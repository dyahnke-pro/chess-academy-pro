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
  setupHintIdea: (): string => 'Look for the idea.',
  setupHintPiece: (): string => 'Your knight moves.',
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
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-board')).toBeInTheDocument();
    expect(screen.getByText('Find the quiet setup move')).toBeInTheDocument();
  });

  it('shows hint button when showHints is enabled', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    expect(screen.getByTestId('setup-hint-area')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    expect(screen.getByTestId('hint-button')).toHaveTextContent('Hint');
  });

  it('hides hint button when showHints is disabled', () => {
    mockSettings.showHints = false;
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    expect(screen.queryByTestId('setup-hint-area')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
  });

  it('climbs the ladder one tier per tap — the answer only on the third (hand walk 2026-10-03)', async () => {
    // The first tap used to hand over the whole move. The Setup Trainer's
    // hint is graduated: idea → piece → move (TacticSetupBoard.ladder.test).
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    const hintButton = screen.getByTestId('hint-button');
    expect(hintButton).toHaveAttribute('data-level', '0');

    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '1');
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '2');
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-button')).toHaveAttribute('data-level', '3');
  });

  it('shows the computed answer nudge once the third tier resolves', async () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-nudge')).toHaveTextContent('Look for the idea.');
    fireEvent.click(screen.getByTestId('hint-button'));
    expect(screen.getByTestId('hint-nudge')).toHaveTextContent('Your knight moves.');
    fireEvent.click(screen.getByTestId('hint-button'));

    // Tier 3 = the shared one-tap answer (engine-computed, no LLM).
    await waitFor(() => {
      expect(screen.getByTestId('hint-nudge')).toHaveAttribute('data-tier', '3');
      expect(screen.getByTestId('hint-nudge').textContent).not.toBe('Your knight moves.');
    });
  });

  it('speaks intro narration on mount', () => {
    const puzzle = buildSetupPuzzle();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    expect(mockSpeak).toHaveBeenCalledWith('Find the setup move.');
  });

  it('shows move indicator for player turn', () => {
    const puzzle = buildSetupPuzzle({ difficulty: 1 });
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={vi.fn()} />);

    expect(screen.getByText(/find the quiet move that sets up the/)).toBeInTheDocument();
  });

  // THE FAIL PATH (2026-10-01 tactics walk): a setup the student cannot find
  // used to have no way out but "End session", and nothing could ever be
  // counted missed. Show Solution plays the line out and reports a miss.
  it('Show Solution plays the line out and completes as a miss', async () => {
    const puzzle = buildSetupPuzzle();
    const onComplete = vi.fn();
    render(<TacticSetupBoard puzzle={puzzle} sequence={0} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('setup-show-solution'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(false), { timeout: 8000 });
    expect(onComplete).toHaveBeenCalledTimes(1);
  }, 10000);
});
