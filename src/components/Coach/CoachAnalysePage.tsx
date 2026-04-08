import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChessBoard } from '../Board/ChessBoard';
import { ChatInput } from './ChatInput';
import { useChessGame } from '../../hooks/useChessGame';
import { useBoardContext } from '../../hooks/useBoardContext';
import { useAppStore } from '../../stores/appStore';
import { stockfishEngine } from '../../services/stockfishEngine';
import { getCoachCommentary } from '../../services/coachApi';
import { voiceService } from '../../services/voiceService';
import type { StockfishAnalysis } from '../../types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function CoachAnalysePage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);

  const game = useChessGame();

  // Publish board context for global coach drawer
  const turn = game.fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const lastSan = game.history.length > 0 ? game.history[game.history.length - 1] : undefined;
  const ctxLastMove = game.lastMove && lastSan ? { ...game.lastMove, san: lastSan } : undefined;
  useBoardContext(game.fen, '', 0, 'white', turn, ctxLastMove, game.history);

  const [fenInput, setFenInput] = useState('');
  const [analysis, setAnalysis] = useState<StockfishAnalysis | null>(null);
  const [coachExplanation, setCoachExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidateMoves, setCandidateMoves] = useState<string[]>([]);

  const analysePosition = useCallback(async (fen: string) => {
    setLoading(true);
    setCoachExplanation('');

    try {
      // Run Stockfish analysis
      const sfAnalysis = await stockfishEngine.analyzePosition(fen, 18);
      setAnalysis(sfAnalysis);

      // Extract candidate moves
      const moves = sfAnalysis.topLines.map((line) => line.moves[0]).filter((m): m is string => Boolean(m));
      setCandidateMoves(moves);

      // Get coach explanation
      const context = {
        fen,
        lastMoveSan: null,
        moveNumber: 0,
        pgn: '',
        openingName: null,
        stockfishAnalysis: sfAnalysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: {
          rating: activeProfile?.currentRating ?? 1420,

          weaknesses: activeProfile?.badHabits.filter((h) => !h.isResolved).map((h) => h.description) ?? [],
        },
      };

      let explanation = '';
      await getCoachCommentary('deep_analysis', context, (chunk) => {
        explanation += chunk;
        setCoachExplanation(explanation);
      });

      void voiceService.speak(explanation.slice(0, 200)); // First 200 chars only for voice
    } catch (error) {
      console.error('Analysis error:', error);
      setCoachExplanation('I had trouble analysing that position. Please check the FEN and try again.');
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  const handleLoadFen = useCallback(() => {
    const fen = fenInput.trim() || START_FEN;
    const loaded = game.loadFen(fen);
    if (loaded) {
      void analysePosition(fen);
    }
  }, [fenInput, game, analysePosition]);

  const handleMoveOnBoard = useCallback((moveResult: { fen: string }) => {
    void analysePosition(moveResult.fen);
  }, [analysePosition]);

  const handleFollowUp = useCallback(async (question: string) => {
    setLoading(true);

    const context = {
      fen: game.fen,
      lastMoveSan: null,
      moveNumber: 0,
      pgn: '',
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

    // Append question to context
    const questionContext = { ...context, pgn: `User question: ${question}` };

    let response = '';
    await getCoachCommentary('position_analysis_chat', questionContext, (chunk) => {
      response += chunk;
      setCoachExplanation((prev) => prev + '\n\n' + response);
    });

    setLoading(false);
    void voiceService.speak(response.slice(0, 200));
  }, [game.fen, analysis, activeProfile]);

  return (
    <div className="flex flex-col pb-20 md:pb-6 max-w-2xl mx-auto w-full" data-testid="coach-analyse-page">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-theme-border">
        <button onClick={() => void navigate('/coach')} className="p-1.5 rounded-lg hover:bg-theme-surface">
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-theme-text">
            Position Analysis
          </h2>
        </div>
      </div>

      {/* FEN Input */}
      <div className="flex gap-2 px-4 pt-4">
        <input
          type="text"
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
          placeholder="Paste FEN or use the board..."
          className="flex-1 px-3 py-2 rounded-lg border border-theme-border bg-theme-surface text-sm text-theme-text placeholder:text-theme-text-muted"
          data-testid="fen-input"
        />
        <button
          onClick={handleLoadFen}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium disabled:opacity-50"
          data-testid="load-fen-btn"
        >
          <Search size={14} />
          Analyse
        </button>
      </div>

      {/* Board */}
      <div className="px-2 py-1 flex justify-center">
        <div className="w-full md:max-w-[420px]">
          <ChessBoard
            initialFen={game.fen}
            interactive
            showEvalBar={!!analysis}
            evaluation={analysis?.evaluation}
            isMate={analysis?.isMate}
            mateIn={analysis?.mateIn}
            onMove={handleMoveOnBoard}
          />
        </div>
      </div>

      {/* Candidate Moves */}
      {candidateMoves.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-theme-text-muted">Candidate moves:</span>
            {candidateMoves.map((move, i) => (
              <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-text">
                {move}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Coach Explanation */}
      {(coachExplanation || loading) && (
        <motion.div
          className="mx-4 mb-2 bg-theme-surface rounded-lg p-4 border border-theme-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {loading && !coachExplanation && (
            <div className="flex items-center gap-2 text-theme-text-muted">
              <Loader size={14} className="animate-spin" />
              <span className="text-sm">Analysing position...</span>
            </div>
          )}
          {coachExplanation && (
            <p className="text-sm text-theme-text leading-relaxed whitespace-pre-wrap" data-testid="coach-explanation">
              {coachExplanation}
            </p>
          )}
        </motion.div>
      )}

      {/* Follow-up input */}
      <ChatInput
        onSend={(text) => void handleFollowUp(text)}
        disabled={loading}
        placeholder="Ask a follow-up question..."
      />
    </div>
  );
}
