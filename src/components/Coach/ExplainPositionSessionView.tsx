/**
 * ExplainPositionSessionView
 * --------------------------
 * Non-interactive analysis view. Shows a board locked to the target
 * FEN (or the starting position), runs Stockfish to depth 18, then
 * streams an LLM explanation via the existing coachApi channel.
 *
 * Unlike CoachAnalysePage this is a read-only lesson surface (lives
 * inside ChessLessonLayout, no FEN input, no drag-to-move). It's what
 * the coach drops you into when you say "explain this position" in
 * chat and we have — or pick up — a FEN to analyse.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader, Volume2, VolumeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { ChatInput } from './ChatInput';
import { stockfishEngine } from '../../services/stockfishEngine';
import { getCoachCommentary } from '../../services/coachApi';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import type { StockfishAnalysis } from '../../types';

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const ANALYSIS_DEPTH = 18;

export interface ExplainPositionSessionViewProps {
  fen?: string;
  orientation: 'white' | 'black';
  onExit: () => void;
}

export function ExplainPositionSessionView({
  fen,
  orientation,
  onExit,
}: ExplainPositionSessionViewProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const targetFen = fen && fen.trim() ? fen : START_FEN;

  const [analysis, setAnalysis] = useState<StockfishAnalysis | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(true);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      voiceService.stop();
    };
  }, []);

  // Run Stockfish + stream LLM commentary on mount / when FEN changes.
  useEffect(() => {
    // Ref-shaped flag; mutated in cleanup below. ESLint's flow analysis
    // can't see the mutation across awaits, so the check-is-always-false
    // warnings are suppressed at the call sites.
    const cancelled: { value: boolean } = { value: false };
    setLoading(true);
    setExplanation('');
    setAnalysis(null);

    void (async () => {
      try {
        const sf = await stockfishEngine.analyzePosition(targetFen, ANALYSIS_DEPTH);
        if (cancelled.value || !mountedRef.current) return;
        setAnalysis(sf);

        const context = {
          fen: targetFen,
          lastMoveSan: null,
          moveNumber: 0,
          pgn: '',
          openingName: null,
          stockfishAnalysis: sf,
          playerMove: null,
          moveClassification: null,
          playerProfile: {
            rating: activeProfile?.currentRating ?? 1420,
            weaknesses:
              activeProfile?.badHabits
                .filter((h) => !h.isResolved)
                .map((h) => h.description) ?? [],
          },
        };

        let streamed = '';
        await getCoachCommentary('deep_analysis', context, (chunk) => {
          if (cancelled.value || !mountedRef.current) return;
          streamed += chunk;
          setExplanation(streamed);
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (cancelled.value || !mountedRef.current) return;
        if (!voiceMuted && streamed) {
          void voiceService.speak(streamed.slice(0, 400));
        }
      } catch (err: unknown) {
        if (cancelled.value || !mountedRef.current) return;
        console.warn('[ExplainPositionSessionView] analysis failed:', err);
        setExplanation(
          'I had trouble analysing that position. Try a different FEN, or open the Analysis Board.',
        );
      } finally {
        if (!cancelled.value && mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled.value = true;
    };
    // voiceMuted is intentionally not a dep — muting mid-analysis
    // shouldn't restart the stream. The read inside the closure uses
    // the value at analysis time, matching CoachAnalysePage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFen, activeProfile]);

  const handleFollowUp = useCallback(
    async (question: string) => {
      if (!analysis) return;
      setLoading(true);

      const context = {
        fen: targetFen,
        lastMoveSan: null,
        moveNumber: 0,
        pgn: `User question: ${question}`,
        openingName: null,
        stockfishAnalysis: analysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: {
          rating: activeProfile?.currentRating ?? 1420,
          style: 'default',
          weaknesses: [] as string[],
        },
      };

      let response = '';
      await getCoachCommentary('position_analysis_chat', context, (chunk) => {
        if (!mountedRef.current) return;
        response += chunk;
        setExplanation((prev) => `${prev}\n\n${response}`);
      });

      if (!mountedRef.current) return;
      setLoading(false);
      if (!voiceMuted && response) {
        void voiceService.speak(response.slice(0, 400));
      }
    },
    [targetFen, analysis, activeProfile, voiceMuted],
  );

  const evalDisplay = analysis
    ? analysis.isMate
      ? `#${analysis.mateIn ?? ''}`
      : `${analysis.evaluation > 0 ? '+' : ''}${(analysis.evaluation / 100).toFixed(2)}`
    : null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">
          Position analysis
        </h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          Stockfish depth {ANALYSIS_DEPTH}
          {evalDisplay ? ` · ${evalDisplay}` : ''}
        </div>
      </div>
      <button
        onClick={() => setVoiceMuted((v) => !v)}
        className="shrink-0 p-2 rounded-lg bg-theme-surface border border-theme-border"
        aria-label={voiceMuted ? 'Unmute voice' : 'Mute voice'}
      >
        {voiceMuted ? (
          <VolumeOff size={16} className="text-theme-text-muted" />
        ) : (
          <Volume2 size={16} className="text-theme-accent" />
        )}
      </button>
      <button
        onClick={onExit}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-sm"
        aria-label="Back to chat"
      >
        <ArrowLeft size={16} />
        Chat
      </button>
    </div>
  );

  const controls = (
    <ChatInput
      onSend={(text) => void handleFollowUp(text)}
      disabled={loading}
      placeholder="Ask a follow-up about this position…"
    />
  );

  return (
    <ChessLessonLayout
      header={header}
      board={
        <ConsistentChessboard
          fen={targetFen}
          boardOrientation={orientation}
          interactive={false}
        />
      }
      controls={controls}
      belowControls={
        (explanation || loading) ? (
          <motion.div
            className="mt-2 rounded-lg border border-theme-border bg-theme-surface p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {loading && !explanation && (
              <div className="flex items-center gap-2 text-theme-text-muted">
                <Loader size={14} className="animate-spin" />
                <span className="text-sm">Thinking about the position…</span>
              </div>
            )}
            {explanation && (
              <p
                className="text-sm text-theme-text leading-relaxed whitespace-pre-wrap"
                data-testid="explain-position-text"
              >
                {explanation}
              </p>
            )}
          </motion.div>
        ) : undefined
      }
    />
  );
}
