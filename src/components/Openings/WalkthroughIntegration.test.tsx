/**
 * Deep integration test: uses REAL annotationService (no mock) to verify
 * the full annotation pipeline end-to-end:
 *   JSON file → loadSubLineAnnotations → WalkthroughMode renders annotation text
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '../../test/utils';
import { WalkthroughMode } from './WalkthroughMode';
import { buildOpeningRecord } from '../../test/factories';
import { clearAnnotationCache } from '../../services/annotationService';
import { speechService } from '../../services/speechService';
import type { OpeningRecord } from '../../types';

// ── Mocks (everything except annotationService) ────────────────────────────

vi.mock('../../services/speechService', () => ({
  speechService: {
    speak: vi.fn(),
    stop: vi.fn(),
    warmupInGestureContext: vi.fn(),
    isKokoroActive: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/voicePackService', () => ({
  voicePackService: {
    speak: vi.fn().mockResolvedValue(false),
    stop: vi.fn(),
    isReady: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue('idle'),
    onStatusChange: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({ evaluation: 0, isMate: false, mateIn: null, topLines: [] }),
    init: vi.fn(),
    destroy: vi.fn(),
    onStatusChange: vi.fn(),
  },
}));

vi.mock('../../db/schema', () => ({
  db: {
    profiles: {
      get: vi.fn().mockResolvedValue({
        id: 'main',
        preferences: {
          voiceEnabled: true,
          kokoroEnabled: false,
          kokoroVoiceId: 'af_bella',
          masterAllOff: false,
        },
      }),
    },
  },
}));

vi.mock('../../hooks/useBoardContext', () => ({
  useBoardContext: vi.fn(),
}));

// ── Opening fixture matching london-system.json structure ─────────────────

const london: OpeningRecord = buildOpeningRecord({
  id: 'london-system',
  name: 'London System',
  pgn: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bxd6 Qxd6 Bd3 O-O O-O',
  color: 'white',
  overview: 'A solid, positional system for White.',
  variations: [
    { name: "London vs Queen's Pawn", pgn: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bxd6 Qxd6 Bd3 O-O O-O e4 Qe7', explanation: '' },
    { name: "London vs King's Indian", pgn: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 O-O Nbd7 h3 c5 c3', explanation: '' },
    { name: 'Jobava London', pgn: 'd4 Nf6 Bf4 d5 Nc3 e6 e3 c5 Nf3 Nc6 Be2 Bd6 Bxd6 Qxd6 O-O', explanation: '' },
    { name: 'London vs Grunfeld Setup', pgn: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 d5 Be2 O-O O-O Nbd7 h3 Re8 c3', explanation: '' },
    { name: 'London vs Dutch', pgn: 'd4 f5 Bf4 Nf6 e3 e6 Nf3 d5 Bd3 Bd6 Bxd6 cxd6 O-O', explanation: '' },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WalkthroughMode integration — real annotation data', () => {
  beforeEach(() => {
    clearAnnotationCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows overview on load', async () => {
    const { container } = render(
      <WalkthroughMode opening={london} onExit={vi.fn()} />,
    );

    // The title should be visible immediately
    expect(screen.getByText(/walkthrough.*london/i)).toBeTruthy();

    // Overview card shows on move 0
    await waitFor(() => {
      expect(screen.getByTestId('walkthrough-overview')).toBeTruthy();
    }, { timeout: 3000 });

    expect(container.textContent).toContain('A solid, positional system for White.');
  });

  it('main line: shows annotation text after advancing to move 1', async () => {
    render(<WalkthroughMode opening={london} onExit={vi.fn()} />);

    // Wait for overview to load
    await waitFor(() => screen.getByTestId('walkthrough-overview'), { timeout: 3000 });

    // Click Next to advance to move 1 (d4)
    const nextBtn = screen.getByRole('button', { name: /next/i });
    act(() => { fireEvent.click(nextBtn); });

    // Annotation card should now show (real data from london-system.json)
    await waitFor(() => {
      const text = document.body.textContent;
      // The annotation for d4 mentions controlling key squares / central space
      expect(text.length).toBeGreaterThan(200);
      expect(text).toMatch(/queen|pawn|d4|central|control|space/i);
    }, { timeout: 5000 });
  });

  it('main line: annotation changes per move for first 4 moves', async () => {
    render(<WalkthroughMode opening={london} onExit={vi.fn()} />);

    await waitFor(() => screen.getByTestId('walkthrough-overview'), { timeout: 3000 });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    const seenTexts: string[] = [];

    for (let i = 0; i < 4; i++) {
      act(() => { fireEvent.click(nextBtn); });

      await waitFor(() => {
        const text = document.body.textContent;
        expect(text.length).toBeGreaterThan(100);
      }, { timeout: 3000 });

      seenTexts.push((document.body.textContent).substring(0, 120));
    }

    // Each move should produce distinct text (annotation advances)
    const uniqueTexts = new Set(seenTexts);
    expect(uniqueTexts.size).toBeGreaterThanOrEqual(3);
  });

  it('Jobava London (variationIndex=2): loads variation-2 annotations', async () => {
    render(
      <WalkthroughMode
        opening={london}
        variationIndex={2}
        onExit={vi.fn()}
      />,
    );

    // Title confirms Jobava London
    await waitFor(() => {
      expect(screen.getByText(/jobava london/i)).toBeTruthy();
    }, { timeout: 3000 });

    // Advance to move 1 (d4 in Jobava London)
    const nextBtn = screen.getByRole('button', { name: /next/i });
    act(() => { fireEvent.click(nextBtn); });

    // Should show real annotation data for d4 from subLines[2]
    await waitFor(() => {
      const text = document.body.textContent;
      expect(text.length).toBeGreaterThan(200);
      expect(text).toMatch(/queen|pawn|d4|central|control|space/i);
    }, { timeout: 5000 });
  });

  it('Jobava London: annotation text is not empty for moves 1-5', async () => {
    render(
      <WalkthroughMode
        opening={london}
        variationIndex={2}
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => screen.getByTestId('walkthrough-overview'), { timeout: 3000 });

    const nextBtn = screen.getByRole('button', { name: /next/i });

    for (let moveNum = 1; moveNum <= 5; moveNum++) {
      act(() => { fireEvent.click(nextBtn); });

      await waitFor(() => {
        const text = document.body.textContent;
        expect(text.length).toBeGreaterThan(100);
      }, { timeout: 3000 });

      const snippet = (document.body.textContent).substring(0, 100).trim();
      console.log(`Jobava move ${moveNum}: "${snippet}"`);
    }
  });

  it('speechService.speak is called with annotation text on move advance', async () => {
    const mockSpeak = vi.mocked(speechService.speak);

    render(<WalkthroughMode opening={london} onExit={vi.fn()} />);

    await waitFor(() => screen.getByTestId('walkthrough-overview'), { timeout: 3000 });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    act(() => { fireEvent.click(nextBtn); });

    // Wait for the TTS useEffect to fire (reads DB, then calls speak)
    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    }, { timeout: 3000 });

    const firstCallText = mockSpeak.mock.calls[0][0];
    console.log(`speak() called with: "${firstCallText.substring(0, 80)}..."`);
    expect(typeof firstCallText).toBe('string');
    expect(firstCallText.length).toBeGreaterThan(20);
  });

  it('voice off when masterAllOff=true: speak is NOT called', async () => {
    // Voice prefs are now read from Zustand, not the DB — set the store directly
    const { useAppStore } = await import('../../stores/appStore');
    const { buildUserProfile } = await import('../../test/factories');
    useAppStore.getState().setActiveProfile(
      buildUserProfile({ preferences: { voiceEnabled: false, masterAllOff: true } }),
    );

    const mockSpeak = vi.mocked(speechService.speak);
    mockSpeak.mockClear();

    render(<WalkthroughMode opening={london} onExit={vi.fn()} />);

    await waitFor(() => screen.getByTestId('walkthrough-overview'), { timeout: 3000 });

    const nextBtn = screen.getByRole('button', { name: /next/i });
    act(() => { fireEvent.click(nextBtn); });

    // Give a moment for any async effects to fire
    await new Promise((r) => setTimeout(r, 300));

    // With voiceEnabled=false, speechService.speak should NOT be called
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
