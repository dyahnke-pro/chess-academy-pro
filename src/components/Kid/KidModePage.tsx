import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, ArrowLeft, Map } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { voiceService } from '../../services/voiceService';
import { getGameProgress, getGameCompletedChapterCount } from '../../services/journeyService';
import { PAWNS_JOURNEY_CONFIG, FAIRY_TALE_CONFIG } from '../../data/kidGameConfigs';
import { ChessBoard } from '../Board/ChessBoard';
import type { ChessPiece, JourneyProgress } from '../../types';

interface PieceLesson {
  piece: ChessPiece;
  title: string;
  symbol: string;
  description: string;
  fen: string;
}

const PIECE_LESSONS: PieceLesson[] = [
  { piece: 'king', title: 'The King', symbol: '♔', description: 'Moves one square in any direction', fen: '4k3/8/8/8/3K4/8/8/8 w - - 0 1' },
  { piece: 'queen', title: 'The Queen', symbol: '♕', description: 'Moves any number of squares in any direction', fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1' },
  { piece: 'rook', title: 'The Rook', symbol: '♖', description: 'Moves in straight lines: up, down, left, right', fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1' },
  { piece: 'bishop', title: 'The Bishop', symbol: '♗', description: 'Moves diagonally any number of squares', fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1' },
  { piece: 'knight', title: 'The Knight', symbol: '♘', description: 'Moves in an L-shape: 2+1 squares', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1' },
  { piece: 'pawn', title: 'The Pawn', symbol: '♙', description: 'Moves forward one square, captures diagonally', fen: '4k3/8/8/3P4/8/8/8/4K3 w - - 0 1' },
];

const FIND_KING_FENS = [
  'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
  'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
];

type KidView = 'menu' | 'findKing';

export function KidModePage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const navigate = useNavigate();

  const [view, setView] = useState<KidView>('menu');
  const [findKingIdx, setFindKingIdx] = useState(0);
  const [findKingScore, setFindKingScore] = useState(0);
  const [findKingResult, setFindKingResult] = useState<'correct' | 'wrong' | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [journeyProgress, setJourneyProgress] = useState<JourneyProgress | null>(null);
  const [fairyTaleProgress, setFairyTaleProgress] = useState<JourneyProgress | null>(null);

  useEffect(() => {
    void getGameProgress('pawns-journey').then((p) => setJourneyProgress(p));
    void getGameProgress('fairy-tale').then((p) => setFairyTaleProgress(p));
  }, []);

  const kidSpeak = useCallback((text: string): void => {
    if (!voiceOn) return;
    void voiceService.speak(text);
  }, [voiceOn]);

  const handleToggleVoice = useCallback((): void => {
    voiceService.stop();
    setVoiceOn((v) => !v);
  }, []);

  const handleStartLesson = useCallback((lesson: PieceLesson): void => {
    void navigate(`/kid/${lesson.piece}`);
  }, [navigate]);

  const kingSquare = useMemo((): string => {
    const fen = FIND_KING_FENS[findKingIdx];
    const isWhiteKing = findKingIdx < 4;
    const kingChar = isWhiteKing ? 'K' : 'k';
    const ranks = fen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
      let col = 0;
      for (const ch of ranks[r]) {
        if (ch >= '1' && ch <= '8') {
          col += parseInt(ch);
        } else {
          if (ch === kingChar) {
            return `${String.fromCharCode(97 + col)}${8 - r}`;
          }
          col++;
        }
      }
    }
    return 'e1';
  }, [findKingIdx]);

  const handleFindKingClick = useCallback((square: string): void => {
    if (square === kingSquare) {
      setFindKingScore((s) => s + 1);
      setFindKingResult('correct');
      kidSpeak('Great job! You found the King!');
    } else {
      setFindKingResult('wrong');
      kidSpeak('Not quite. Try again!');
    }

    setTimeout(() => {
      setFindKingResult(null);
      if (findKingIdx < FIND_KING_FENS.length - 1) {
        setFindKingIdx((i) => i + 1);
      } else {
        setView('menu');
        setFindKingIdx(0);
        kidSpeak(`All done! You got ${findKingScore + (square === kingSquare ? 1 : 0)} out of ${FIND_KING_FENS.length}!`);
      }
    }, 1200);
  }, [findKingIdx, findKingScore, kingSquare, kidSpeak]);

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="kid-mode-page"
    >
      {view === 'menu' && (
        <>
          <div className="text-center">
            <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
              Hi {activeProfile.name}! You have {activeProfile.xp} XP
            </p>
          </div>

          {/* Pawn's Journey card */}
          <button
            onClick={() => void navigate(PAWNS_JOURNEY_CONFIG.routePrefix)}
            className="rounded-xl p-5 border-2 flex items-center gap-4 hover:opacity-80 transition-opacity w-full text-left"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            }}
            data-testid="journey-card"
          >
            <Map size={32} style={{ color: 'var(--color-accent)' }} />
            <div className="flex-1">
              <div className="font-bold text-lg">{PAWNS_JOURNEY_CONFIG.title}</div>
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {journeyProgress
                  ? `Chapter ${getGameCompletedChapterCount(journeyProgress, PAWNS_JOURNEY_CONFIG.chapterOrder) + 1} of ${PAWNS_JOURNEY_CONFIG.chapters.length}`
                  : 'Start your quest!'}
              </div>
            </div>
            <span className="text-2xl">{PAWNS_JOURNEY_CONFIG.icon}</span>
          </button>

          {/* Fairy Tale Quest card */}
          <button
            onClick={() => void navigate(FAIRY_TALE_CONFIG.routePrefix)}
            className="rounded-xl p-5 border-2 flex items-center gap-4 hover:opacity-80 transition-opacity w-full text-left"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            }}
            data-testid="fairy-tale-card"
          >
            <span className="text-3xl">{FAIRY_TALE_CONFIG.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-lg">{FAIRY_TALE_CONFIG.title}</div>
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {fairyTaleProgress
                  ? `Chapter ${getGameCompletedChapterCount(fairyTaleProgress, FAIRY_TALE_CONFIG.chapterOrder) + 1} of ${FAIRY_TALE_CONFIG.chapters.length}`
                  : 'Begin your fairy tale!'}
              </div>
            </div>
            <span className="text-2xl">{FAIRY_TALE_CONFIG.icon}</span>
          </button>

          {/* Piece lesson cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PIECE_LESSONS.map((lesson) => (
              <button
                key={lesson.piece}
                onClick={() => handleStartLesson(lesson)}
                className="rounded-xl p-5 border flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                data-testid={`lesson-card-${lesson.piece}`}
              >
                <span className="text-4xl">{lesson.symbol}</span>
                <span className="font-semibold text-sm">{lesson.title}</span>
                <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                  {lesson.description}
                </span>
              </button>
            ))}
          </div>

          {/* Find the King game */}
          <button
            onClick={() => { setView('findKing'); setFindKingIdx(0); setFindKingScore(0); kidSpeak('Find the King! Where is the White King? Tap it!'); }}
            className="rounded-xl p-5 border text-center hover:opacity-80 transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="find-king-btn"
          >
            <span className="text-2xl">👑</span>
            <div className="font-bold text-lg mt-1">Find the King!</div>
            <div className="text-sm opacity-80">Tap the King on the board</div>
          </button>

        </>
      )}

      {view === 'findKing' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { voiceService.stop(); setView('menu'); }}
                className="p-2 rounded-lg hover:opacity-80"
                style={{ background: 'var(--color-surface)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-xl font-bold">Find the King! 👑</h2>
            </div>
            <button
              onClick={handleToggleVoice}
              className="p-2 rounded-lg border transition-colors"
              style={{
                background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
              }}
              aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
              data-testid="kid-voice-toggle"
            >
              {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          <div
            className="rounded-2xl p-5 border-2 text-center"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}
            data-testid="kid-instruction-box"
          >
            <p className="text-xl font-bold leading-relaxed">
              {findKingIdx < 4 ? 'Where is the White King? Tap it!' : 'Where is the Black King? Tap it!'}
            </p>
          </div>
          <div className="text-center text-sm font-medium">
            {findKingIdx + 1}/{FIND_KING_FENS.length} · Score: {findKingScore}
          </div>
          {findKingResult && (
            <div className="text-center text-2xl" data-testid="find-king-result">
              {findKingResult === 'correct' ? '⭐ Correct!' : '❌ Try again!'}
            </div>
          )}
          <div className="max-w-md mx-auto w-full relative">
            <ChessBoard
              initialFen={FIND_KING_FENS[findKingIdx]}
              interactive={false}
              showFlipButton={false}
              showUndoButton={false}
              showResetButton={false}
            />
            {/* Clickable overlay grid for square tapping */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8" data-testid="find-king-overlay">
              {Array.from({ length: 64 }).map((_, i) => {
                const file = String.fromCharCode(97 + (i % 8));
                const rank = 8 - Math.floor(i / 8);
                const sq = `${file}${rank}`;
                return (
                  <button
                    key={sq}
                    onClick={() => handleFindKingClick(sq)}
                    className="w-full h-full opacity-0 hover:opacity-20 hover:bg-white"
                    data-testid={`sq-${sq}`}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
