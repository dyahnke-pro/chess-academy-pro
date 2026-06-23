import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Play, SkipForward, MessageCircle } from 'lucide-react';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { StarDisplay } from './StarDisplay';
import { voiceService } from '../../services/voiceService';
import { GUIDED_GAMES } from '../../data/guidedGames';
import {
  generateKidMoveNarration,
  generateKidMoveInstruction,
  generateKidWrongMoveHint,
  answerKidGameQuestion,
} from '../../services/kidGameCoach';
import type { GuidedMove } from '../../types';
import type { MoveResult } from '../../hooks/useChessGame';

type GamePhase = 'intro' | 'playing' | 'complete';

interface CoachChatMsg {
  role: 'kid' | 'coach';
  text: string;
}

// Quick-tap questions so a young child can talk to the coach without typing.
const QUICK_ASKS: ReadonlyArray<{ label: string; question: string }> = [
  { label: 'Why?', question: 'Why is this a good move?' },
  { label: 'What now?', question: 'What should I do next?' },
  { label: 'Help!', question: 'Can you help me find a good move?' },
];

// The dynamic LLM coach falls back to the authored line internally on any
// failure, but a slow model shouldn't leave the child waiting — cap the wait
// and use the authored text if the model is taking too long.
const COACH_NARRATION_TIMEOUT_MS = 4500;
function withCoachTimeout(p: Promise<string>, fallback: string): Promise<string> {
  return Promise.race([
    p,
    new Promise<string>((resolve) => setTimeout(() => resolve(fallback), COACH_NARRATION_TIMEOUT_MS)),
  ]);
}

const AUTO_PLAY_DELAY_MS = 1200;
// Long enough for the dynamic (LLM) wrong-move hint to land while the box is
// still visible; the hint falls back to authored text well within this window.
const WRONG_MOVE_DISPLAY_MS = 3600;
// Per non-negotiable #5, per-move voice praise is banned. The
// on-screen flash carries the per-move feedback; voice fires
// only on milestone moves ('You earned a star!') and the
// game-complete outro narration.
const MILESTONE_VOICE = 'You earned a star!';
// Visual-only celebration banner (no voice). Variety prevents
// the flash text from going stale across a 20-move walkthrough.
const CELEBRATION_TEXT = [
  'Great move!',
  'Perfect!',
  'You got it!',
  'Excellent!',
  'Well done!',
];

export function GuidedGamePage(): JSX.Element {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const game = GUIDED_GAMES.find((g) => g.id === gameId);

  const [phase, setPhase] = useState<GamePhase>('intro');
  const [moveIndex, setMoveIndex] = useState(-1);
  const [boardFen, setBoardFen] = useState(game?.startFen ?? 'start');
  const [boardKey, setBoardKey] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [wrongText, setWrongText] = useState('');
  const [starsEarned, setStarsEarned] = useState(0);
  const [celebrationText, setCelebrationText] = useState('');
  const [narrationText, setNarrationText] = useState('');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [coachThinking, setCoachThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<CoachChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const chatHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chessRef = useRef(new Chess(game?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      voiceService.stop();
    };
  }, []);

  const totalMilestones = game?.moves.filter((m) => m.isMilestone).length ?? 0;

  const kidSpeak = useCallback((text: string): void => {
    if (voiceOn) {
      void voiceService.speak(text);
    }
  }, [voiceOn]);

  const handleToggleVoice = useCallback((): void => {
    setVoiceOn((prev) => {
      if (prev) voiceService.stop();
      return !prev;
    });
  }, []);

  // ─── Live LLM coach (kid-safe, grounded) ───────────────────────────────
  // The coach VOICE is now dynamic: the LLM rephrases the code-computed move
  // (describeKidMove via chess.js) into fresh kid prose, routed through the
  // kid-safe lane (getKidLlmResponse → Ruth, no SAN). The scripted move stays
  // the source of truth (kid #17); the authored narration is the GROUNDED seed
  // AND the fallback on any anomaly (kid P0). Mirrors the adult Play-with-Coach
  // live commentary.
  const narratePlayedMove = useCallback(
    async (
      fenBefore: string,
      san: string,
      isPlayerMove: boolean,
      teachingConcept: string | undefined,
      authored: string | undefined,
    ): Promise<void> => {
      const fallback = authored ?? '';
      // Show the authored text instantly (no dead air / instant for tests),
      // then swap in the dynamic version + speak it once it lands.
      if (fallback) setNarrationText(fallback);
      setCoachThinking(true);
      let text = fallback;
      try {
        text = await withCoachTimeout(
          generateKidMoveNarration({ fenBefore, san, isPlayerMove, teachingConcept, authoredNarration: authored }),
          fallback,
        );
      } catch {
        text = fallback;
      }
      setCoachThinking(false);
      if (text) {
        setNarrationText(text);
        kidSpeak(text);
      }
    },
    [kidSpeak],
  );

  // Dynamic, kid-safe instruction for the move the child should play next
  // (a guided game GUIDES). Grounded by the scripted move; authored fallback.
  const narrateInstruction = useCallback(
    async (
      fenBefore: string,
      expectedSan: string,
      teachingConcept: string | undefined,
      authored: string | undefined,
    ): Promise<void> => {
      const fallback = authored ?? '';
      // Instant authored display (no dead air / instant for tests), then the
      // dynamic instruction swaps in + speaks when it lands.
      if (fallback) setNarrationText(fallback);
      setCoachThinking(true);
      let text = fallback;
      try {
        text = await withCoachTimeout(
          generateKidMoveInstruction({ fenBefore, expectedSan, teachingConcept, authored }),
          fallback,
        );
      } catch {
        text = fallback;
      }
      setCoachThinking(false);
      if (text) {
        setNarrationText(text);
        kidSpeak(text);
      }
    },
    [kidSpeak],
  );

  // "Ask the coach" — kid-mode Learn-with-Coach chat. Grounded by code-computed
  // board facts + the scripted next move; kid-safe; safe canned fallback.
  const handleAskCoach = useCallback(
    async (question: string): Promise<void> => {
      const q = question.trim();
      if (!q || chatBusy) return;
      setChatInput('');
      setChatMessages((prev) => [...prev, { role: 'kid', text: q }]);
      setChatBusy(true);
      const nextMove = game?.moves[moveIndex + 1];
      try {
        const answer = await answerKidGameQuestion({
          question: q,
          fen: boardFen,
          expectedNextSan: nextMove && !nextMove.autoPlay ? nextMove.san : undefined,
          gameTitle: game?.title ?? 'our game',
          history: chatHistoryRef.current.slice(-6),
        });
        chatHistoryRef.current.push({ role: 'user', content: q });
        chatHistoryRef.current.push({ role: 'assistant', content: answer });
        setChatMessages((prev) => [...prev, { role: 'coach', text: answer }]);
        kidSpeak(answer);
      } catch {
        setChatMessages((prev) => [...prev, { role: 'coach', text: "Let's keep looking at the board together!" }]);
      } finally {
        setChatBusy(false);
      }
    },
    [chatBusy, game, moveIndex, boardFen, kidSpeak],
  );

  // Get the current move to play (next move after moveIndex)
  const currentMoveIdx = moveIndex + 1;
  const currentMove: GuidedMove | undefined = game?.moves[currentMoveIdx];
  const isPlayerTurn = currentMove ? !currentMove.autoPlay : false;

  // Get highlight arrows for hint display
  const getHintArrows = useCallback((): Array<{ startSquare: string; endSquare: string; color: string }> => {
    if (!currentMove || !isPlayerTurn || wrongAttempts < 1) return [];
    // After 1 wrong attempt, show a green arrow hint
    try {
      const chess = new Chess(boardFen);
      const result = chess.move(currentMove.san);
      return [{ startSquare: result.from, endSquare: result.to, color: 'rgba(34, 197, 94, 0.7)' }];
    } catch {
      // Position may not accept the move — no hint arrow
    }
    return [];
  }, [currentMove, isPlayerTurn, wrongAttempts, boardFen]);

  // Auto-play opponent moves
  const playAutoMove = useCallback((idx: number): void => {
    if (!game) return;
    const moves = game.moves;
    if (idx < 0 || idx >= moves.length) return;
    const move = moves[idx];

    setIsAutoPlaying(true);

    autoPlayTimeoutRef.current = setTimeout(() => {
      // Capture the position BEFORE the move for grounded coach narration.
      const fenBefore = chessRef.current.fen();
      // Apply the move
      try {
        chessRef.current.move(move.san);
      } catch {
        // Position might be out of sync, reset
        chessRef.current = new Chess(move.fen);
      }

      setBoardFen(move.fen);
      setBoardKey((k) => k + 1);
      setMoveIndex(idx);
      setWrongAttempts(0);

      // Dynamic, kid-safe coach commentary on the opponent's move (falls back
      // to the authored narration). The opponent move IS narration-worthy.
      if (move.narration) {
        void narratePlayedMove(fenBefore, move.san, false, move.teachingConcept, move.narration);
      }

      if (move.isMilestone) {
        setStarsEarned((s) => s + 1);
      }

      setIsAutoPlaying(false);

      // Check if next move is also auto-play
      const nextIdx = idx + 1;
      if (nextIdx < moves.length && moves[nextIdx].autoPlay) {
        playAutoMove(nextIdx);
      }

      // Check if game is complete
      if (nextIdx >= moves.length) {
        autoPlayTimeoutRef.current = setTimeout(() => {
          setPhase('complete');
          kidSpeak(game.storyOutro);
          setNarrationText(game.storyOutro);
        }, 800);
      }
    }, AUTO_PLAY_DELAY_MS);
  }, [game, kidSpeak, narratePlayedMove]);

  // Start the game
  const handleStartGame = useCallback((): void => {
    if (!game) return;
    setPhase('playing');
    chessRef.current = new Chess(game.startFen);
    setBoardFen(game.startFen);
    setBoardKey((k) => k + 1);
    setMoveIndex(-1);
    setStarsEarned(0);
    setWrongAttempts(0);
    setChatMessages([]);
    chatHistoryRef.current = [];

    // First move: opponent → dynamic commentary + auto-play; kid → dynamic
    // "what to play" instruction. Both kid-safe, grounded, authored fallback.
    if (game.moves[0]?.autoPlay) {
      playAutoMove(0);
    } else if (game.moves[0]) {
      void narrateInstruction(game.startFen, game.moves[0].san, game.moves[0].teachingConcept, game.moves[0].narration);
    }
  }, [game, playAutoMove, narrateInstruction]);

  // Handle player move
  const handlePlayerMove = useCallback((moveResult: MoveResult): void => {
    if (!game || !currentMove || currentMove.autoPlay || isAutoPlaying) return;

    const expectedSan = currentMove.san;
    const playerSan = moveResult.san;
    // Position the child moved in — the grounded `fenBefore` for coach voice.
    const fenBefore = boardFen;

    // Normalize: strip + and # for comparison, then compare
    const normalize = (s: string): string => s.replace(/[+#]/g, '');
    const isCorrect = normalize(playerSan) === normalize(expectedSan);

    if (isCorrect) {
      // Correct move!
      setFeedback('correct');
      const celebration = CELEBRATION_TEXT[Math.floor(Math.random() * CELEBRATION_TEXT.length)];
      setCelebrationText(celebration);
      setWrongAttempts(0);

      // Update board state
      try {
        chessRef.current = new Chess(currentMove.fen);
      } catch {
        // fallback
      }
      setBoardFen(currentMove.fen);
      setMoveIndex(currentMoveIdx);

      if (currentMove.isMilestone) {
        setStarsEarned((s) => s + 1);
        kidSpeak(MILESTONE_VOICE);
      }
      // Non-milestone correct moves: visual celebration only. The dynamic
      // coach voice fires after the feedback timeout below.

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        setCelebrationText('');

        const nextIdx = currentMoveIdx + 1;
        if (nextIdx >= game.moves.length) {
          // Final move — dynamic commentary on the child's move, then the outro.
          void (async () => {
            await narratePlayedMove(fenBefore, currentMove.san, true, currentMove.teachingConcept, currentMove.narration);
            autoPlayTimeoutRef.current = setTimeout(() => {
              setPhase('complete');
              kidSpeak(game.storyOutro);
              setNarrationText(game.storyOutro);
            }, 900);
          })();
          return;
        }

        if (game.moves[nextIdx].autoPlay) {
          // Dynamic commentary on the child's move, then the opponent replies
          // (auto-play narrates the opponent's move itself).
          void narratePlayedMove(fenBefore, currentMove.san, true, currentMove.teachingConcept, currentMove.narration);
          playAutoMove(nextIdx);
        } else {
          // Next is the child's move — guide them to it with a dynamic,
          // kid-safe instruction (grounded by the scripted move).
          void narrateInstruction(
            currentMove.fen,
            game.moves[nextIdx].san,
            game.moves[nextIdx].teachingConcept,
            game.moves[nextIdx].narration,
          );
        }
      }, 1000);
    } else {
      // Wrong move — dynamic, kind, kid-safe nudge toward the right idea
      // (grounded by the expected move; falls back to the authored response).
      setFeedback('wrong');
      setWrongAttempts((w) => w + 1);
      const authoredWrong = currentMove.wrongMoveResponse ?? 'Not quite — try again!';
      setWrongText(authoredWrong);
      void (async () => {
        let hint = authoredWrong;
        try {
          hint = await withCoachTimeout(
            generateKidWrongMoveHint({ fenBefore, expectedSan, authoredResponse: authoredWrong }),
            authoredWrong,
          );
        } catch {
          hint = authoredWrong;
        }
        setWrongText(hint);
        kidSpeak(hint);
      })();

      // Reset the board to before this move
      setBoardKey((k) => k + 1);

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        setWrongText('');
      }, WRONG_MOVE_DISPLAY_MS);
    }
  }, [
    game, currentMove, currentMoveIdx, isAutoPlaying, boardFen,
    kidSpeak, playAutoMove, narratePlayedMove, narrateInstruction,
  ]);

  // Handle replay
  const handleReplay = useCallback((): void => {
    if (!game) return;
    setPhase('intro');
    setMoveIndex(-1);
    setBoardFen(game.startFen);
    setBoardKey((k) => k + 1);
    setStarsEarned(0);
    setFeedback(null);
    setNarrationText('');
    setWrongAttempts(0);
    setChatMessages([]);
    chatHistoryRef.current = [];
  }, [game]);

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-lg font-bold">Game not found</p>
        <button
          onClick={() => void navigate('/kid/play-games')}
          className="px-4 py-2 rounded-lg font-bold"
          style={{ background: 'var(--color-accent)', color: 'white' }}
        >
          Back to Games
        </button>
      </div>
    );
  }

  const boardOrientation = game.playerColor === 'w' ? 'white' : 'black';
  const progressPercent = game.moves.length > 0
    ? Math.round(((moveIndex + 1) / game.moves.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto" data-testid="guided-game-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { voiceService.stop(); void navigate('/kid/play-games'); }}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--color-surface)' }}
            data-testid="guided-game-back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold truncate">{game.title}</h2>
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
          data-testid="guided-game-voice-toggle"
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* ─── Intro Phase ──────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="text-6xl">{game.difficulty === 1 ? '🌱' : game.difficulty === 2 ? '⭐' : '🏆'}</div>
          <h3 className="text-2xl font-bold text-center">{game.title}</h3>
          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            {game.description}
          </p>
          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span>~{game.estimatedMinutes} min</span>
            <span>You play as {game.playerColor === 'w' ? 'White' : 'Black'}</span>
          </div>

          <div
            className="rounded-2xl p-5 border-2 text-center max-w-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p className="text-base leading-relaxed">{game.storyIntro}</p>
          </div>

          <button
            onClick={handleStartGame}
            className="px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)', color: 'white' }}
            data-testid="guided-game-start"
          >
            <Play size={20} fill="white" />
            Play!
          </button>
        </motion.div>
      )}

      {/* ─── Playing Phase ────────────────────────────────────────────── */}
      {phase === 'playing' && (
        <>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-secondary)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--color-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
              {moveIndex + 1}/{game.moves.length}
            </span>
            <StarDisplay earned={starsEarned} total={totalMilestones} size="sm" />
          </div>

          {/* Narration box */}
          <AnimatePresence mode="wait">
            {narrationText && (
              <motion.div
                key={narrationText}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl p-4 border-2 text-center"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-accent)',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                }}
                data-testid="guided-game-narration"
              >
                <p className="text-sm leading-relaxed font-medium">{narrationText}</p>
                {currentMove?.teachingConcept && (
                  <span
                    className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'var(--color-accent)', color: 'white' }}
                  >
                    {currentMove.teachingConcept}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback overlays */}
          <AnimatePresence>
            {feedback === 'correct' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center text-2xl font-bold"
                style={{ color: 'var(--color-accent)' }}
                data-testid="guided-game-correct"
              >
                {celebrationText}
              </motion.div>
            )}
            {feedback === 'wrong' && (
              <motion.div
                initial={{ x: -10 }}
                animate={{ x: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl p-3 text-center text-sm font-medium"
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}
                data-testid="guided-game-wrong"
              >
                {wrongText}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chess board */}
          <div className="w-full md:max-w-[420px] mx-auto">
            <KidChessboard
              key={boardKey}
              initialFen={boardFen}
              orientation={boardOrientation}
              interactive={isPlayerTurn && !isAutoPlaying && feedback !== 'correct'}
              onMove={handlePlayerMove}
              arrows={getHintArrows()}
              annotationHighlights={
                currentMove?.highlightSquares?.map((sq) => ({
                  square: sq,
                  color: 'rgba(245, 158, 11, 0.4)',
                })) ?? []
              }
            />
          </div>

          {/* Turn indicator */}
          <div className="text-center text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {isAutoPlaying ? (
              <span className="flex items-center justify-center gap-2">
                <SkipForward size={14} className="animate-pulse" />
                Opponent is moving...
              </span>
            ) : isPlayerTurn ? (
              'Your turn — make a move!'
            ) : coachThinking ? (
              <span className="flex items-center justify-center gap-2" data-testid="guided-game-coach-thinking">
                <MessageCircle size={14} className="animate-pulse" />
                Coach is thinking...
              </span>
            ) : (
              'Watch and learn!'
            )}
          </div>

          {/* ─── Ask the coach (kid-safe Learn-with-Coach chat) ───────────── */}
          <div
            className="rounded-2xl border-2 p-3 flex flex-col gap-2"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            data-testid="guided-game-coach-chat"
          >
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              <MessageCircle size={16} style={{ color: 'var(--color-accent)' }} />
              Ask the Coach
            </div>

            {chatMessages.length > 0 && (
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto" data-testid="guided-game-chat-log">
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    data-testid={m.role === 'coach' ? 'chat-msg-coach' : 'chat-msg-kid'}
                    className={`text-sm rounded-xl px-3 py-2 ${m.role === 'kid' ? 'self-end' : 'self-start'}`}
                    style={
                      m.role === 'kid'
                        ? { background: 'var(--color-accent)', color: 'white', maxWidth: '85%' }
                        : { background: 'var(--color-secondary)', color: 'var(--color-text)', maxWidth: '90%' }
                    }
                  >
                    {m.text}
                  </div>
                ))}
                {chatBusy && (
                  <div className="self-start text-sm rounded-xl px-3 py-2" style={{ background: 'var(--color-secondary)', color: 'var(--color-text-muted)' }}>
                    …
                  </div>
                )}
              </div>
            )}

            {/* Quick-tap questions so a young child can ask without typing */}
            <div className="flex flex-wrap gap-2">
              {QUICK_ASKS.map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  disabled={chatBusy}
                  onClick={() => void handleAskCoach(qa.question)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                  data-testid={`guided-game-quickask-${qa.label.replace(/\W+/g, '').toLowerCase()}`}
                >
                  {qa.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void handleAskCoach(chatInput); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question…"
                disabled={chatBusy}
                className="flex-1 rounded-xl px-3 py-2 text-sm border-2 disabled:opacity-50"
                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                data-testid="guided-game-chat-input"
                maxLength={120}
              />
              <button
                type="submit"
                disabled={chatBusy || !chatInput.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: 'white' }}
                data-testid="guided-game-chat-send"
              >
                Ask
              </button>
            </form>
          </div>
        </>
      )}

      {/* ─── Complete Phase ───────────────────────────────────────────── */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 py-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
            className="text-7xl"
          >
            🎉
          </motion.div>
          <h3 className="text-2xl font-bold text-center">Game Complete!</h3>

          <StarDisplay earned={starsEarned} total={totalMilestones} size="lg" />

          <div
            className="rounded-2xl p-5 border-2 text-center max-w-sm"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-accent)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p className="text-base leading-relaxed">{game.storyOutro}</p>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={handleReplay}
              className="px-6 py-3 rounded-xl font-bold border-2 hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
              data-testid="guided-game-replay"
            >
              Play Again
            </button>
            <button
              onClick={() => void navigate('/kid/play-games')}
              className="px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              style={{ background: 'var(--color-accent)', color: 'white' }}
              data-testid="guided-game-next"
            >
              More Games
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
