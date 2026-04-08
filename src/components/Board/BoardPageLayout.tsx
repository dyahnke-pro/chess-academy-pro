import { useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { ChessBoard } from './ChessBoard';
import { GameChatPanel } from '../Coach/GameChatPanel';
import type { GameChatPanelHandle } from '../Coach/GameChatPanel';
import { MobileChatDrawer } from '../Coach/MobileChatDrawer';
import { useResizableDivider } from '../../hooks/useResizableDivider';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { MoveResult } from '../../hooks/useChessGame';
import type { BoardArrow, BoardHighlight, BoardAnnotationCommand, GhostMoveData } from '../../types';
import type { MoveQuality } from './ChessBoard';

interface BoardPageHeader {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightControls?: ReactNode;
}

interface EvalBarConfig {
  evaluation: number;
  isMate?: boolean;
  mateIn?: number | null;
}

interface ChatPanelConfig {
  fen: string;
  pgn: string;
  moveNumber: number;
  playerColor: 'white' | 'black';
  turn: 'w' | 'b';
  isGameOver: boolean;
  gameResult: string;
  lastMove?: { from: string; to: string; san: string } | null;
  history?: string[];
  onBoardAnnotation?: (commands: BoardAnnotationCommand[]) => void;
  initialPrompt?: string | null;
}

interface BoardPageLayoutProps {
  header?: BoardPageHeader;
  aboveBoard?: ReactNode;
  belowBoard?: ReactNode;
  boardOverlay?: ReactNode;
  customBoard?: ReactNode;
  boardFen: string;
  boardOrientation?: 'white' | 'black';
  boardInteractive?: boolean;
  boardKey?: string | number;
  onBoardMove?: (move: MoveResult) => void;
  showFlipButton?: boolean;
  showEvalBar?: boolean;
  evalBar?: EvalBarConfig;
  highlightSquares?: { from: string; to: string } | null;
  showLastMoveHighlight?: boolean;
  moveQualityFlash?: MoveQuality;
  arrows?: BoardArrow[];
  annotationHighlights?: BoardHighlight[];
  ghostMove?: GhostMoveData | null;
  rightPanelTop?: ReactNode;
  chat: ChatPanelConfig;
  chatRef?: RefObject<GameChatPanelHandle | null>;
  initialChatPercent?: number;
  className?: string;
  testId?: string;
}

export function BoardPageLayout({
  header,
  aboveBoard,
  belowBoard,
  boardOverlay,
  customBoard,
  boardFen,
  boardOrientation = 'white',
  boardInteractive = true,
  boardKey,
  onBoardMove,
  showFlipButton = false,
  showEvalBar = true,
  evalBar,
  highlightSquares,
  showLastMoveHighlight,
  moveQualityFlash,
  arrows,
  annotationHighlights,
  ghostMove,
  rightPanelTop,
  chat,
  chatRef,
  initialChatPercent = 80,
  className = '',
  testId,
}: BoardPageLayoutProps): JSX.Element {
  const isMobile = useIsMobile();
  const { chatPercent, rightColumnRef, dividerProps } = useResizableDivider(initialChatPercent);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const showDivider = rightPanelTop !== undefined;

  const chatPanel = (
    <GameChatPanel
      ref={chatRef}
      fen={chat.fen}
      pgn={chat.pgn}
      moveNumber={chat.moveNumber}
      playerColor={chat.playerColor}
      turn={chat.turn}
      isGameOver={chat.isGameOver}
      gameResult={chat.gameResult}
      lastMove={chat.lastMove}
      history={chat.history}
      onBoardAnnotation={chat.onBoardAnnotation}
      initialPrompt={chat.initialPrompt}
      className="h-full"
    />
  );

  return (
    <div
      className={`flex flex-col md:flex-row h-full overflow-hidden ${className}`}
      data-testid={testId}
    >
      {/* Left column: header + board + controls */}
      <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 overflow-y-auto">
        {header && (
          <div className="flex items-center justify-between p-4 border-b border-theme-border">
            <div className="flex items-center gap-3">
              <button
                onClick={header.onBack}
                className="p-2 rounded-lg hover:bg-theme-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Go back"
                data-testid="header-back-btn"
              >
                <ArrowLeft size={20} className="text-theme-text" />
              </button>
              <div>
                <h2 className="text-sm font-semibold text-theme-text">{header.title}</h2>
                {header.subtitle && (
                  <p className="text-xs text-theme-text-muted">{header.subtitle}</p>
                )}
              </div>
            </div>
            {header.rightControls && (
              <div className="flex items-center gap-2">
                {header.rightControls}
              </div>
            )}
          </div>
        )}

        {aboveBoard}

        <div className="px-1 py-1 md:px-2 flex justify-center flex-shrink-0">
          <div className="w-full md:max-w-[420px] relative">
            {customBoard ?? (
              <>
                <ChessBoard
                  key={boardKey}
                  initialFen={boardFen}
                  orientation={boardOrientation}
                  interactive={boardInteractive}
                  showEvalBar={showEvalBar}
                  evaluation={evalBar?.evaluation ?? 0}
                  isMate={evalBar?.isMate ?? false}
                  mateIn={evalBar?.mateIn ?? null}
                  onMove={onBoardMove}
                  showFlipButton={showFlipButton}
                  showUndoButton={false}
                  showResetButton={false}
                  highlightSquares={highlightSquares}
                  showLastMoveHighlight={showLastMoveHighlight}
                  moveQualityFlash={moveQualityFlash}
                  arrows={arrows}
                  annotationHighlights={annotationHighlights}
                  ghostMove={ghostMove}
                />
                {boardOverlay}
              </>
            )}
          </div>
        </div>

        {belowBoard}
      </div>

      {/* Mobile: swipeable chat drawer + toggle button */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileChatOpen(true)}
            className="fixed z-30 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-theme-accent text-white transition-transform hover:scale-105 active:scale-95"
            style={{
              right: '1rem',
              bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
            }}
            aria-label="Open chat"
            data-testid="mobile-chat-toggle"
          >
            <MessageCircle size={22} />
          </button>

          <MobileChatDrawer isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)}>
            {chatPanel}
          </MobileChatDrawer>
        </>
      )}

      {/* Desktop: right column with optional top panel + divider + chat */}
      {!isMobile && (
        <div
          ref={rightColumnRef}
          className="flex flex-col flex-1 border-l border-theme-border overflow-hidden"
          data-testid="right-panel"
        >
          {showDivider ? (
            <>
              <div
                className="min-h-0 overflow-hidden"
                style={{ height: `${100 - chatPercent}%` }}
                data-testid="right-panel-top"
              >
                {rightPanelTop}
              </div>

              <div
                className="flex-shrink-0 h-1.5 bg-theme-border hover:bg-theme-accent/50 cursor-row-resize flex items-center justify-center transition-colors"
                {...dividerProps}
                data-testid="panel-divider"
              >
                <div className="w-8 h-0.5 rounded-full bg-theme-text-muted/40" />
              </div>

              <div
                className="min-h-[120px] overflow-hidden"
                style={{ height: `${chatPercent}%` }}
                data-testid="chat-panel"
              >
                {chatPanel}
              </div>
            </>
          ) : (
            chatPanel
          )}
        </div>
      )}
    </div>
  );
}
