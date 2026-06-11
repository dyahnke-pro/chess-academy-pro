// WeaknessTagDrillPage — drill ONE Thinking-Errors row (a misconception tag)
// as puzzles, in the SAME format as My Mistakes / My Weaknesses (David
// 2026-06-11: "i want them all to look and feel the same"). Reached by tapping a
// row on the Thinking Errors tab. Builds a queue of the student's OWN positions
// for that tag (getMisconceptionDrillPuzzles) and plays them through the shared
// MistakePuzzleBoard — board at the position before the slip, "find the better
// move", solution = the engine's best. On finishing, spaces the tag's SRS
// (recordTagDrillResult) exactly like the adaptive drill does.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Brain, Trophy } from 'lucide-react';
import { MistakePuzzleBoard } from './MistakePuzzleBoard';
import { getMisconceptionDrillPuzzles } from '../../services/mistakePuzzleService';
import { recordTagDrillResult } from '../../services/misconceptionService';
import { logAppAudit } from '../../services/appAuditor';
import type { MistakePuzzle } from '../../types';

interface WeaknessTagDrillState {
  misconceptionTag?: string;
  customLabel?: string;
  label?: string;
}

type Phase = 'loading' | 'empty' | 'solving' | 'summary';

export function WeaknessTagDrillPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as WeaknessTagDrillState;
  const tag = state.misconceptionTag;
  const customLabel = state.customLabel;
  const label = state.label ?? 'Weakness';

  const [phase, setPhase] = useState<Phase>('loading');
  const [puzzles, setPuzzles] = useState<MistakePuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const spacedRef = useRef(false);

  useEffect(() => {
    if (!tag) { setPhase('empty'); return; }
    let cancelled = false;
    void getMisconceptionDrillPuzzles(tag, customLabel)
      .then((q) => {
        if (cancelled) return;
        setPuzzles(q);
        setPhase(q.length > 0 ? 'solving' : 'empty');
        void logAppAudit({
          kind: 'weakness-report-search-routed',
          category: 'subsystem',
          source: 'WeaknessTagDrillPage.load',
          summary: `tag=${tag}${customLabel ? `:${customLabel}` : ''} queued=${q.length}`,
        });
      })
      .catch(() => { if (!cancelled) setPhase('empty'); });
    return () => { cancelled = true; };
  }, [tag, customLabel]);

  const finishSession = useCallback((finalCorrect: number, total: number): void => {
    if (tag && !spacedRef.current) {
      spacedRef.current = true;
      const accuracy = total > 0 ? finalCorrect / total : 0;
      void recordTagDrillResult(tag, accuracy >= 0.6);
    }
    setPhase('summary');
  }, [tag]);

  const handleComplete = useCallback((wasCorrect: boolean): void => {
    const nextCorrect = correct + (wasCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    if (index + 1 >= puzzles.length) {
      finishSession(nextCorrect, puzzles.length);
    } else {
      setIndex(index + 1);
    }
  }, [correct, index, puzzles.length, finishSession]);

  const restart = useCallback((): void => {
    spacedRef.current = false;
    setIndex(0);
    setCorrect(0);
    setPhase(puzzles.length > 0 ? 'solving' : 'empty');
  }, [puzzles.length]);

  if (phase === 'loading') {
    return (
      <div className="p-6 text-center text-theme-text-muted" data-testid="weakness-tag-drill-loading">
        Building your puzzles…
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="p-4 max-w-xl mx-auto space-y-4" data-testid="weakness-tag-drill-empty">
        <button onClick={() => void navigate(-1)} className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-500/15 flex items-center justify-center mb-4">
            <Brain size={26} className="text-violet-300" />
          </div>
          <h3 className="text-base font-semibold text-theme-text mb-1">No drillable positions yet</h3>
          <p className="text-sm text-theme-text-muted max-w-xs">
            These slips don’t have a recorded best move to solve against. Analyze
            more games and they’ll show up here.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const total = puzzles.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="p-4 max-w-xl mx-auto space-y-4" data-testid="weakness-tag-drill-summary">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Trophy size={40} className="text-amber-400 mb-3" />
          <h2 className="text-xl font-bold text-theme-text">{label}</h2>
          <p className="text-sm text-theme-text-muted mt-1">
            {correct} / {total} solved · {pct}%
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => void navigate(-1)}
              className="px-4 py-2 rounded-lg border border-theme-border text-theme-text hover:bg-theme-surface transition-colors"
            >
              Back to weaknesses
            </button>
            <button
              onClick={restart}
              className="px-4 py-2 rounded-lg bg-theme-accent text-white font-medium hover:opacity-90 transition-opacity"
              data-testid="weakness-tag-drill-again"
            >
              Drill again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Solving — identical shell to the My Mistakes solve view.
  const puzzle = puzzles[index];
  return (
    <div className="p-4 max-w-xl mx-auto space-y-4" data-testid="weakness-tag-drill-solving">
      <div className="flex items-center justify-between">
        <button onClick={() => void navigate(-1)} className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-xs font-semibold text-theme-text-muted" data-testid="weakness-tag-drill-progress">
          {label} · {index + 1} / {puzzles.length}
        </span>
      </div>
      <MistakePuzzleBoard
        key={puzzle.id}
        puzzle={puzzle}
        onComplete={(wasCorrect) => handleComplete(wasCorrect)}
      />
    </div>
  );
}
