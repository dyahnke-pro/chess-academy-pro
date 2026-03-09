import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessBoard } from '../Board/ChessBoard';
import { stockfishEngine } from '../../services/stockfishEngine';
import { ArrowLeft, Play, Square, BarChart3, Zap } from 'lucide-react';
import { useBoardContext } from '../../hooks/useBoardContext';
import type { StockfishAnalysis, AnalysisLine } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DEFAULT_DEPTH = 18;

export function AnalysisBoardPage(): JSX.Element {
  const navigate = useNavigate();
  const [fen, setFen] = useState(DEFAULT_FEN);

  // Publish board context for global coach drawer
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  useBoardContext(fen, '', 0, 'white', turn);

  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StockfishAnalysis | null>(null);
  const [fenInput, setFenInput] = useState('');
  const unsubRef = useRef<(() => void) | null>(null);

  // Subscribe to live analysis updates
  useEffect(() => {
    unsubRef.current = stockfishEngine.onAnalysis((update) => {
      setAnalysis(update);
    });
    return () => {
      unsubRef.current?.();
      stockfishEngine.stop();
    };
  }, []);

  const startAnalysis = useCallback(
    async (analysisFen: string): Promise<void> => {
      stockfishEngine.stop();
      setIsAnalyzing(true);
      setAnalysis(null);
      const result = await stockfishEngine.analyzePosition(analysisFen, depth);
      setAnalysis(result);
      setIsAnalyzing(false);
    },
    [depth],
  );

  const stopAnalysis = useCallback((): void => {
    stockfishEngine.stop();
    setIsAnalyzing(false);
  }, []);

  const handleMove = useCallback(
    (move: MoveResult): void => {
      setFen(move.fen);
      void startAnalysis(move.fen);
    },
    [startAnalysis],
  );

  const handleLoadFen = useCallback((): void => {
    const trimmed = fenInput.trim();
    if (trimmed) {
      setFen(trimmed);
      void startAnalysis(trimmed);
    }
  }, [fenInput, startAnalysis]);

  const handleReset = useCallback((): void => {
    setFen(DEFAULT_FEN);
    setAnalysis(null);
    stockfishEngine.stop();
    setIsAnalyzing(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-y-auto pb-20 md:pb-6" data-testid="analysis-board">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => void navigate('/')}
          className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="text-lg font-bold text-theme-text">Analysis Board</h1>
        <div className="w-12" />
      </div>

      {/* FEN input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
          placeholder="Paste FEN to analyze..."
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-muted"
          data-testid="fen-input"
        />
        <button
          onClick={handleLoadFen}
          className="px-3 py-2 rounded-lg text-sm bg-theme-accent text-theme-bg font-medium"
          data-testid="load-fen-btn"
        >
          Load
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 rounded-lg text-sm border border-theme-border text-theme-text-muted hover:bg-theme-surface"
        >
          Reset
        </button>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <ChessBoard
            initialFen={fen}
            interactive={true}
            showFlipButton={true}
            showUndoButton={true}
            showResetButton={true}
            showEvalBar={true}
            evaluation={analysis?.evaluation ?? null}
            isMate={analysis?.isMate ?? false}
            mateIn={analysis?.mateIn ?? null}
            onMove={handleMove}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-theme-text-muted">Depth: {depth}</label>
        <input
          type="range"
          min={8}
          max={25}
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          className="flex-1"
          data-testid="depth-slider"
        />
        {isAnalyzing ? (
          <button
            onClick={stopAnalysis}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-red-600 text-white font-medium"
            data-testid="stop-btn"
          >
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            onClick={() => void startAnalysis(fen)}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-theme-accent text-theme-bg font-medium"
            data-testid="analyze-btn"
          >
            <Play size={14} />
            Analyze
          </button>
        )}
      </div>

      {/* Evaluation display */}
      {analysis && (
        <div className="bg-theme-surface rounded-lg p-4 border border-theme-border space-y-3" data-testid="analysis-result">
          <div className="flex items-center gap-3">
            <BarChart3 size={16} className="text-theme-accent" />
            <span className="text-sm font-semibold text-theme-text">
              {formatEval(analysis)}
            </span>
            <span className="text-xs text-theme-text-muted">
              Depth {analysis.depth}
            </span>
            {analysis.nodesPerSecond > 0 && (
              <span className="text-xs text-theme-text-muted flex items-center gap-1">
                <Zap size={10} />
                {(analysis.nodesPerSecond / 1000000).toFixed(1)}M nps
              </span>
            )}
          </div>

          {/* Best move */}
          <div className="text-sm text-theme-text">
            <span className="text-theme-text-muted">Best move: </span>
            <span className="font-mono font-medium">{analysis.bestMove}</span>
          </div>

          {/* Top lines */}
          {analysis.topLines.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-theme-text-muted font-medium uppercase tracking-wider">
                Top Lines
              </div>
              {analysis.topLines.map((line) => (
                <TopLineRow key={line.rank} line={line} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopLineRow({ line }: { line: AnalysisLine }): JSX.Element {
  const evalText = line.mate !== null ? `M${line.mate}` : (line.evaluation / 100).toFixed(2);

  return (
    <div className="flex items-start gap-2 text-sm" data-testid={`top-line-${line.rank}`}>
      <span className="text-xs text-theme-text-muted w-4 shrink-0">{line.rank}.</span>
      <span className={`text-xs font-mono font-bold w-12 shrink-0 ${line.evaluation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {evalText}
      </span>
      <span className="text-xs text-theme-text font-mono truncate">
        {line.moves.slice(0, 8).join(' ')}
        {line.moves.length > 8 ? '...' : ''}
      </span>
    </div>
  );
}

function formatEval(analysis: StockfishAnalysis): string {
  if (analysis.isMate && analysis.mateIn !== null) {
    return `Mate in ${Math.abs(analysis.mateIn)}`;
  }
  const pawns = analysis.evaluation / 100;
  const sign = pawns >= 0 ? '+' : '';
  return `${sign}${pawns.toFixed(2)}`;
}
