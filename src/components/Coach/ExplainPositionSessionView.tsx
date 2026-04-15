/**
 * ExplainPositionSessionView
 * --------------------------
 * The `/coach/session/explain-position` route body. Shows the board
 * the user just asked about, runs Stockfish in the background, and
 * streams an LLM explanation of what's going on.
 *
 * FEN source priority:
 *   1. `?fen=...` URL param (passed explicitly, e.g. from a game-review
 *      "Explain this" button or a direct link).
 *   2. The persistent `lastBoardSnapshot` in the store, kept fresh by
 *      every board screen via `useBoardContext`. Lets users navigate
 *      from a board to the chat and still say "explain this".
 *   3. Neither → friendly empty state telling the user to open a board
 *      first. No silent "explain the starting position" default.
 *
 * Lives inside `ChessLessonLayout` + `ConsistentChessboard` like every
 * other lesson-style surface in the app.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, Loader } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { ChessLessonLayout } from '../Layout/ChessLessonLayout';
import { ChatInput } from './ChatInput';
import { useAppStore, selectFreshBoardSnapshot } from '../../stores/appStore';
import { stockfishEngine } from '../../services/stockfishEngine';
import { getCoachCommentary } from '../../services/coachApi';
import { voiceService } from '../../services/voiceService';
import type { StockfishAnalysis } from '../../types';

const EXPLAIN_DEPTH = 18;
/** Cap voice playback to one paragraph so we don't read a 400-word essay aloud. */
const VOICE_SNIPPET_CHARS = 220;

export interface ExplainPositionSessionViewProps {
  /** FEN passed via URL. Takes priority over the store snapshot. */
  urlFen: string | null;
  /** Optional tag for where the FEN came from (for display). */
  source?: string;
  onExit: () => void;
}

export function ExplainPositionSessionView({
  urlFen,
  source,
  onExit,
}: ExplainPositionSessionViewProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const snapshot = useAppStore((s) => selectFreshBoardSnapshot(s));

  // Resolve the FEN we'll actually use. URL wins — if the caller passed
  // one explicitly, that's what the user wants analyzed, even if a
  // fresher snapshot exists in the store.
  const resolved = useMemo(() => {
    if (urlFen && isLikelyFen(urlFen)) {
      return { fen: urlFen, source: source ?? 'url', label: undefined as string | undefined };
    }
    if (snapshot) {
      return { fen: snapshot.fen, source: snapshot.source, label: snapshot.label };
    }
    return null;
  }, [urlFen, source, snapshot]);

  const [analysis, setAnalysis] = useState<StockfishAnalysis | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [explaining, setExplaining] = useState<boolean>(false);
  const [followUpLoading, setFollowUpLoading] = useState<boolean>(false);

  // Kick off analysis + LLM explanation on mount. Stockfish first so
  // the LLM can use the eval + top lines when composing its answer.
  useEffect(() => {
    if (!resolved) return;
    // Use a ref-like object so the closure sees mutations. (Plain
    // booleans get narrowed by TS control flow and trip the
    // no-unnecessary-condition lint.)
    const run = { cancelled: false };

    void (async () => {
      setExplanation('');
      setExplaining(true);
      let sfAnalysis: StockfishAnalysis | null = null;
      try {
        sfAnalysis = await stockfishEngine.analyzePosition(resolved.fen, EXPLAIN_DEPTH);
        if (run.cancelled) return;
        setAnalysis(sfAnalysis);
      } catch {
        // Stockfish unavailable — LLM will still try to explain.
      }

      const ctx = buildContext(resolved.fen, sfAnalysis, activeProfile?.currentRating ?? 1420);

      let streamed = '';
      try {
        await getCoachCommentary('deep_analysis', ctx, (chunk) => {
          if (run.cancelled) return;
          streamed += chunk;
          setExplanation(streamed);
        });
      } catch (error) {
        console.error('[ExplainPosition] LLM error:', error);
        if (!run.cancelled) {
          setExplanation(
            "I couldn't reach the coach to explain this one. Stockfish evaluation is still shown above.",
          );
        }
      } finally {
        if (!run.cancelled) {
          setExplaining(false);
          if (streamed) {
            void voiceService.speak(streamed.slice(0, VOICE_SNIPPET_CHARS));
          }
        }
      }
    })();

    return () => { run.cancelled = true; };
  }, [resolved, activeProfile?.currentRating]);

  const handleFollowUp = useCallback(async (question: string): Promise<void> => {
    if (!resolved) return;
    setFollowUpLoading(true);
    const ctx = buildContext(resolved.fen, analysis, activeProfile?.currentRating ?? 1420);
    const followCtx = { ...ctx, additionalContext: `User follow-up: ${question}` };

    let streamed = '';
    try {
      await getCoachCommentary('position_analysis_chat', followCtx, (chunk) => {
        streamed += chunk;
        setExplanation((prev) => `${prev}\n\n${streamed}`);
      });
      if (streamed) void voiceService.speak(streamed.slice(0, VOICE_SNIPPET_CHARS));
    } catch (error) {
      console.error('[ExplainPosition] follow-up failed:', error);
    } finally {
      setFollowUpLoading(false);
    }
  }, [resolved, analysis, activeProfile?.currentRating]);

  if (!resolved) {
    return (
      <ChessLessonLayout
        header={
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-theme-text">Explain this position</h1>
              <p className="text-sm text-theme-text-muted mt-1">
                Open a game, puzzle, or analysis board first, then ask the coach to
                explain what&rsquo;s going on.
              </p>
            </div>
            <button
              onClick={onExit}
              className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-sm"
              aria-label="Back to chat"
            >
              <ArrowLeft size={16} />
              Chat
            </button>
          </div>
        }
        board={<div className="aspect-square rounded-lg bg-theme-surface/50" data-testid="explain-empty-board" />}
        controls={
          <button
            onClick={onExit}
            className="px-5 h-12 rounded-full bg-theme-surface border border-theme-border text-sm"
          >
            Back to chat
          </button>
        }
      />
    );
  }

  const turn = resolved.fen.split(' ')[1] === 'b' ? 'Black' : 'White';
  const evalText = analysis ? formatEval(analysis) : null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-theme-text truncate">Explain this position</h1>
        <div className="text-xs text-theme-text-muted uppercase tracking-wide">
          {resolved.label ?? `${turn} to move`}
          {evalText ? ` · ${evalText}` : ''}
        </div>
        {explaining && !explanation && (
          <p className="text-sm text-theme-text-muted mt-2 flex items-center gap-2">
            <Loader size={14} className="animate-spin" />
            Working out what&rsquo;s happening&hellip;
          </p>
        )}
        {explanation && (
          <p
            className="text-sm text-theme-text mt-2 leading-snug whitespace-pre-wrap"
            data-testid="explain-position-text"
          >
            {explanation}
          </p>
        )}
      </div>
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
    <div className="w-full">
      <ChatInput
        onSend={(text) => void handleFollowUp(text)}
        disabled={explaining || followUpLoading}
        placeholder="Ask a follow-up about this position…"
      />
    </div>
  );

  return (
    <ChessLessonLayout
      header={header}
      board={
        <ConsistentChessboard
          fen={resolved.fen}
          interactive={false}
        />
      }
      controls={controls}
    />
  );
}

/** Quick FEN shape check — 6 space-separated fields, board has 8 ranks. */
function isLikelyFen(fen: string): boolean {
  try {
    // chess.js throws if the FEN is unparseable.
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

function buildContext(
  fen: string,
  analysis: StockfishAnalysis | null,
  rating: number,
): import('../../types').CoachContext {
  return {
    fen,
    lastMoveSan: null,
    moveNumber: 0,
    pgn: '',
    openingName: null,
    stockfishAnalysis: analysis,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating,
      weaknesses: [],
    },
  };
}

function formatEval(analysis: StockfishAnalysis): string {
  if (analysis.isMate && typeof analysis.mateIn === 'number') {
    const n = Math.abs(analysis.mateIn);
    const side = analysis.mateIn > 0 ? '+' : '−';
    return `Mate in ${side}${n}`;
  }
  const cp = analysis.evaluation;
  if (typeof cp !== 'number') return '';
  const pawns = cp / 100;
  const sign = pawns >= 0 ? '+' : '';
  return `${sign}${pawns.toFixed(1)}`;
}
