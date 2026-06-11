import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { KidChessboard } from '../Chessboard/KidChessboard';
import { usePieceSound } from '../../hooks/usePieceSound';
import type { MoveResult } from '../../hooks/useChessGame';
import type { PuzzleRecord } from '../../types';

// KidPuzzleBoard — the kid-safe puzzle board for /kid/* puzzle surfaces.
//
// Why this exists (CLAUDE.md kid non-negotiables #10/#12/#3): the adult
// `Puzzles/PuzzleBoard` publishes to the global coach drawer via
// `useBoardContext`, runs the adult struggle-coach (speaking
// CoachingTier prose), and renders `ControlledChessBoard` — all banned
// under /kid/. It also assumes the Lichess multi-move format and
// auto-plays moves[0], which left single-move (training) puzzles with no
// move for the kid. This board is simple by construction:
//   - KidChessboard only, no coach-state coupling, no adult voice.
//   - One move to find (kids practice the KEY move, not a full line).
//   - Format-aware: Lichess (moves≥2) pre-advances past the opponent's
//     setup move so the kid sees the tactic position; training (1 move)
//     is solver-to-move already.
//   - Per-puzzle voice stays SILENT (#5) — the parent overlay carries
//     feedback; only move sound effects play here.

/** Minimal outcome the kid puzzle pages need. */
export interface KidPuzzleOutcome {
  correct: boolean;
}

interface KidPuzzleBoardProps {
  puzzle: PuzzleRecord;
  onComplete: (outcome: KidPuzzleOutcome) => void;
  /** Wrong attempts before the puzzle is marked failed (default 2). */
  maxWrongAttempts?: number;
}

interface ResolvedPuzzle {
  /** Position the kid plays from (after the opponent's setup move). */
  startFen: string;
  /** The one move the kid must find (from/to + optional promotion). */
  solve: { from: string; to: string; promotion?: string };
  /** The opponent's setup move, to highlight what just happened. */
  setupHighlight: { from: string; to: string } | null;
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  };
}

function resolvePuzzle(puzzle: PuzzleRecord): ResolvedPuzzle | null {
  const moves = puzzle.moves.trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) return null;
  const hasSetup = moves.length >= 2;
  const setup = hasSetup ? parseUci(moves[0]) : null;
  const solve = parseUci(hasSetup ? moves[1] : moves[0]);
  if (!solve) return null;
  try {
    const chess = new Chess(puzzle.fen);
    if (setup) {
      const applied = chess.move({ from: setup.from, to: setup.to, promotion: setup.promotion });
      if (!applied) return null;
    }
    return {
      startFen: chess.fen(),
      solve,
      setupHighlight: setup ? { from: setup.from, to: setup.to } : null,
    };
  } catch {
    return null;
  }
}

export function KidPuzzleBoard({
  puzzle,
  onComplete,
  maxWrongAttempts = 2,
}: KidPuzzleBoardProps): JSX.Element | null {
  const resolved = useMemo(() => resolvePuzzle(puzzle), [puzzle]);
  const { playMoveSound, playErrorPing, playSuccessChime } = usePieceSound();

  // boardKey remounts KidChessboard back to startFen after a wrong move.
  const [boardKey, setBoardKey] = useState(0);
  const [solved, setSolved] = useState(false);
  const wrongAttemptsRef = useRef(0);

  // Reset per puzzle.
  useEffect(() => {
    wrongAttemptsRef.current = 0;
    setSolved(false);
    setBoardKey((k) => k + 1);
  }, [puzzle.id]);

  const highlights = useMemo(() => {
    if (!resolved?.setupHighlight) return undefined;
    const { from, to } = resolved.setupHighlight;
    return [
      { square: from, color: 'rgba(250, 204, 21, 0.35)' },
      { square: to, color: 'rgba(250, 204, 21, 0.45)' },
    ];
  }, [resolved]);

  const handleMove = useCallback(
    (move: MoveResult): void => {
      if (!resolved || solved) return;
      const { solve } = resolved;
      const isCorrect =
        move.from === solve.from &&
        move.to === solve.to &&
        (!solve.promotion || move.promotion === solve.promotion);

      if (isCorrect) {
        setSolved(true);
        playSuccessChime();
        onComplete({ correct: true });
        return;
      }

      // Wrong — sound, reset the board to the tactic position, let the
      // kid try again. Fail the puzzle after maxWrongAttempts.
      wrongAttemptsRef.current += 1;
      playErrorPing();
      setBoardKey((k) => k + 1);
      if (wrongAttemptsRef.current >= maxWrongAttempts) {
        setSolved(true);
        onComplete({ correct: false });
      }
    },
    [resolved, solved, onComplete, maxWrongAttempts, playErrorPing, playSuccessChime],
  );

  // Degenerate data (no legal solver move) — surface nothing rather than
  // a broken board; the parent's batch skips past it.
  if (!resolved) return null;

  const kidColor: 'white' | 'black' =
    resolved.startFen.split(' ')[1] === 'w' ? 'white' : 'black';

  return (
    <div className="w-full md:max-w-[420px] mx-auto" data-testid="kid-puzzle-board">
      <KidChessboard
        key={boardKey}
        initialFen={resolved.startFen}
        orientation={kidColor}
        interactive={!solved}
        onMove={(m) => {
          playMoveSound(m.san);
          handleMove(m);
        }}
        annotationHighlights={highlights}
      />
    </div>
  );
}
