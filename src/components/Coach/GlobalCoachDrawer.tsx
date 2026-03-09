import { useCallback, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { usePracticePosition } from '../../hooks/usePracticePosition';
import { GameChatPanel } from './GameChatPanel';
import { ChessBoard } from '../Board/ChessBoard';
import type { BoardAnnotationCommand, BoardArrow } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Global coach chat drawer — mounted in AppLayout, available on every page.
 * Slides up from the bottom (mobile) or in from the right (desktop).
 * Reads board context from Zustand; publishes practice positions back.
 */
export function GlobalCoachDrawer(): JSX.Element | null {
  const isOpen = useAppStore((s) => s.coachDrawerOpen);
  const setOpen = useAppStore((s) => s.setCoachDrawerOpen);
  const boardCtx = useAppStore((s) => s.globalBoardContext);
  const setGlobalPractice = useAppStore((s) => s.setGlobalPracticePosition);

  const [annotationArrows, setAnnotationArrows] = useState<BoardArrow[]>([]);
  const [temporaryFen, setTemporaryFen] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const {
    practicePosition,
    practiceAttempts,
    handlePracticeMove: evaluatePracticeMove,
    exitPractice,
    setPracticeFromAnnotation,
  } = usePracticePosition();

  // Inject coach messages into the chat panel
  const chatRef = useRef<{ injectAssistantMessage: (text: string) => void } | null>(null);
  const coachSay = useCallback((text: string) => {
    chatRef.current?.injectAssistantMessage(text);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMinimized(false);
  }, [setOpen]);

  const handleClear = useCallback(() => {
    setAnnotationArrows([]);
    setTemporaryFen(null);
    exitPractice();
    setGlobalPractice(null);
  }, [exitPractice, setGlobalPractice]);

  const handleBoardAnnotation = useCallback((commands: BoardAnnotationCommand[]) => {
    const newArrows: BoardArrow[] = [];
    let hasClear = false;
    let hasPractice = false;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'arrow':
          newArrows.push(...(cmd.arrows ?? []));
          break;
        case 'show_position':
          if (cmd.fen) setTemporaryFen(cmd.fen);
          break;
        case 'practice':
          hasPractice = true;
          break;
        case 'clear':
          hasClear = true;
          break;
      }
    }

    if (hasClear) {
      handleClear();
    } else {
      if (hasPractice) {
        setPracticeFromAnnotation(commands);
        const practiceCmd = commands.find((c) => c.type === 'practice' && c.fen);
        if (practiceCmd?.fen) {
          setGlobalPractice({ fen: practiceCmd.fen, label: practiceCmd.label ?? 'Practice position' });
        }
      }
      if (newArrows.length > 0) setAnnotationArrows(newArrows);
    }
  }, [handleClear, setPracticeFromAnnotation, setGlobalPractice]);

  const handlePracticeMove = useCallback(async (moveResult: MoveResult) => {
    const result = await evaluatePracticeMove(moveResult);
    coachSay(result.message);
    if (result.type === 'correct' || result.type === 'reveal') {
      setGlobalPractice(null);
    }
  }, [evaluatePracticeMove, coachSay, setGlobalPractice]);

  // Context for GameChatPanel — use global board context or defaults
  const fen = practicePosition?.fen ?? temporaryFen ?? boardCtx?.fen ?? START_FEN;
  const pgn = boardCtx?.pgn ?? '';
  const moveNumber = boardCtx?.moveNumber ?? 1;
  const playerColor: 'white' | 'black' = boardCtx?.playerColor === 'black' ? 'black' : 'white';
  const turn: 'w' | 'b' = boardCtx?.turn === 'b' ? 'b' : 'w';

  // Show inline board when there's a practice position but no external board context
  const showInlineBoard = (practicePosition || temporaryFen) && !boardCtx;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="coach-drawer"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={minimized
            ? { y: 'calc(100% - 48px)', opacity: 1 }
            : { y: 0, opacity: 1 }
          }
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 md:inset-x-auto md:right-0 md:top-0 z-50 flex flex-col"
          style={{
            height: minimized ? 48 : 'min(85dvh, 700px)',
            maxHeight: '85dvh',
            background: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            borderLeft: 'none',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}
          data-testid="global-coach-drawer"
        >
          {/* Drawer handle / header */}
          <div
            className="flex items-center justify-between px-4 py-2 shrink-0 border-b"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              >
                C
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                Coach
              </span>
              {boardCtx && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                  Watching board
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(!minimized)}
                className="p-1.5 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <Minus size={16} />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close coach"
                data-testid="close-coach-drawer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Practice position banner */}
          {practicePosition && !minimized && (
            <div
              className="flex items-center justify-between px-4 py-2 text-sm"
              style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-text)' }}
            >
              <span>Practice: {practicePosition.label}</span>
              <button
                onClick={() => { exitPractice(); setGlobalPractice(null); }}
                className="text-xs underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Exit
              </button>
            </div>
          )}

          {/* Inline mini board (shown when no external board + practice/position active) */}
          {showInlineBoard && !minimized && (
            <div className="px-4 py-2 shrink-0">
              <div className="max-w-[200px] mx-auto">
                <ChessBoard
                  key={`drawer-${practicePosition?.fen ?? temporaryFen ?? ''}-${practiceAttempts}`}
                  initialFen={practicePosition?.fen ?? temporaryFen ?? START_FEN}
                  interactive={!!practicePosition}
                  showFlipButton={false}
                  showUndoButton={false}
                  showResetButton={false}
                  onMove={practicePosition ? (m: MoveResult) => void handlePracticeMove(m) : undefined}
                  arrows={annotationArrows.length > 0 ? annotationArrows : undefined}
                />
              </div>
            </div>
          )}

          {/* Chat panel */}
          {!minimized && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <GameChatPanel
                ref={chatRef}
                fen={fen}
                pgn={pgn}
                moveNumber={moveNumber}
                playerColor={playerColor}
                turn={turn}
                isGameOver={false}
                gameResult=""
                onBoardAnnotation={handleBoardAnnotation}
                className="h-full"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
