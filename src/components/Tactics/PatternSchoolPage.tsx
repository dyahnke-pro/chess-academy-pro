import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Shield, Crosshair, Swords } from 'lucide-react';
import { Chess } from 'chess.js';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { PATTERN_REGISTRY, type TacticPatternLesson } from '../../data/patternRegistry';
import { getPuzzlesByTheme } from '../../services/puzzleService';
import { captureEvent } from '../../services/analytics';

/**
 * PATTERN SCHOOL — /tactics/patterns (David 2026-07-22: "pattern recognition
 * is HUGE in chess!!! I want a section dedicated to teaching it!!!").
 *
 * Every pattern the app COMPUTES, taught in the coach's spine: IDENTIFY
 * (name it) → RECOGNIZE (the geometry to spot it a move early) → PREVENT
 * (defuse it, or exploit it when it's yours). Example positions come from
 * the CC0 Lichess puzzle corpus (DB = truth, engine-verified solutions) —
 * the pattern named on the card is ON the board shown. Drilling routes into
 * the adaptive trainer scoped to the pattern's themes.
 *
 * PostHog events: pattern_school_viewed {}, pattern_school_pattern_opened
 * { pattern }, pattern_school_drill_started { pattern }.
 */

interface ExampleBoard {
  fen: string;
  orientation: 'white' | 'black';
}

/** The Lichess puzzle `fen` is the position BEFORE the setup move; moves[0]
 *  (UCI) is the opponent's move that creates the tactic. Apply it so the
 *  board shows the position where the pattern is LIVE. */
function exampleFromPuzzle(fen: string, movesUci: string): ExampleBoard | null {
  try {
    const c = new Chess(fen);
    const first = movesUci.trim().split(/\s+/)[0];
    if (!first || first.length < 4) return null;
    const applied = c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.length > 4 ? first.slice(4) : undefined });
    if (!applied) return null;
    return { fen: c.fen(), orientation: c.turn() === 'w' ? 'white' : 'black' };
  } catch {
    return null;
  }
}

function PatternCard({ lesson }: { lesson: TacticPatternLesson }): JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState<ExampleBoard | null>(null);
  const [exampleState, setExampleState] = useState<'idle' | 'loading' | 'ready' | 'none'>('idle');
  // One fetch per card lifetime — a state-dep here would re-run the effect on
  // the 'loading' transition and its cleanup would cancel the in-flight fetch.
  const fetchStartedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    setExampleState('loading');
    let cancelled = false;
    void (async () => {
      try {
        const puzzles = await getPuzzlesByTheme(lesson.puzzleThemes[0], 24);
        for (const p of puzzles) {
          const ex = exampleFromPuzzle(p.fen, p.moves);
          if (ex) {
            if (!cancelled) { setExample(ex); setExampleState('ready'); }
            return;
          }
        }
        if (!cancelled) setExampleState('none');
      } catch {
        if (!cancelled) setExampleState('none');
      }
    })();
    return () => { cancelled = true; };
  }, [open, lesson.puzzleThemes]);

  const toggle = useCallback((): void => {
    setOpen((prev) => {
      if (!prev) captureEvent('pattern_school_pattern_opened', { pattern: lesson.id });
      return !prev;
    });
  }, [lesson.id]);

  const startDrill = useCallback((): void => {
    captureEvent('pattern_school_drill_started', { pattern: lesson.id });
    void navigate('/tactics/adaptive', { state: { forcedWeakThemes: lesson.puzzleThemes } });
  }, [navigate, lesson.id, lesson.puzzleThemes]);

  return (
    <div
      className="border-2 border-indigo-500/30 bg-indigo-500/10 rounded-2xl overflow-hidden"
      data-testid={`pattern-card-${lesson.id}`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        data-testid={`pattern-toggle-${lesson.id}`}
      >
        <span className="font-bold text-theme-text">{lesson.name}</span>
        {open ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex gap-2 items-start">
            <Eye size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-theme-text leading-relaxed"><span className="font-semibold text-indigo-300">Identify.</span> {lesson.identify}</p>
          </div>
          <div className="flex gap-2 items-start">
            <Crosshair size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-theme-text leading-relaxed"><span className="font-semibold text-indigo-300">Recognize.</span> {lesson.recognize}</p>
          </div>
          <div className="flex gap-2 items-start">
            <Shield size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-theme-text leading-relaxed"><span className="font-semibold text-indigo-300">Prevent.</span> {lesson.prevent}</p>
          </div>
          {exampleState === 'loading' && (
            <p className="text-xs text-theme-text-muted" data-testid={`pattern-example-loading-${lesson.id}`}>Loading a real example…</p>
          )}
          {exampleState === 'ready' && example && (
            <div data-testid={`pattern-example-board-${lesson.id}`}>
              <p className="text-xs text-theme-text-muted mb-1.5">A real position — the pattern is on the board. {example.orientation === 'white' ? 'White' : 'Black'} to move.</p>
              <div className="max-w-[320px] mx-auto">
                <ConsistentChessboard fen={example.fen} boardOrientation={example.orientation} interactive={false} />
              </div>
            </div>
          )}
          <p className="text-[11px] text-theme-text-muted leading-relaxed">
            Computed live by: {lesson.detector}
          </p>
          <button
            type="button"
            onClick={startDrill}
            className="w-full py-2.5 rounded-xl border-2 border-indigo-500/50 bg-indigo-500/20 font-semibold text-sm text-theme-text hover:bg-indigo-500/30 transition-colors"
            data-testid={`pattern-drill-${lesson.id}`}
          >
            Drill this pattern →
          </button>
        </div>
      )}
    </div>
  );
}

export function PatternSchoolPage(): JSX.Element {
  const navigate = useNavigate();

  useEffect(() => {
    captureEvent('pattern_school_viewed', {});
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6" data-testid="pattern-school-page">
      <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void navigate('/tactics')}
            className="p-2 rounded-lg border border-theme-border"
            aria-label="Back to tactics"
            data-testid="pattern-school-back"
          >
            <ArrowLeft size={18} className="text-theme-text" />
          </button>
          <div className="flex items-center gap-2">
            <Swords size={22} className="text-indigo-400" />
            <h1 className="text-xl font-bold text-theme-text">Pattern Recognition</h1>
          </div>
        </div>
        <p className="text-sm text-theme-text-muted leading-relaxed">
          Every pattern here is one the coach computes on your boards, live. Learn each three ways:
          identify it when it lands, recognize the geometry one move early, and prevent it — or turn it
          around and play it yourself.
        </p>
        {PATTERN_REGISTRY.map((lesson) => (
          <PatternCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
