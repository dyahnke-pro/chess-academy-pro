import { PageHelp } from '../Layout/PageHelp';
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wrench, ChevronRight, TrendingUp } from 'lucide-react';
import {
  createSetupSession,
  pickSetupPuzzle,
  recordSetupResult,
  type SetupAdaptiveSession,
  type SetupTrainerItem,
} from '../../services/setupTrainerService';
import { seedPuzzles } from '../../services/puzzleService';
import { tacticTypeLabel, tacticTypeIcon } from '../../services/tacticalProfileService';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { TacticSetupBoard } from './TacticSetupBoard';
import { logAppAudit } from '../../services/appAuditor';
import type { SetupPuzzleDifficulty } from '../../types';

type Phase = 'select' | 'loading' | 'solving' | 'summary';

const SESSION_LENGTH = 10;

const DIFFICULTIES: Array<{ value: SetupPuzzleDifficulty; label: string; description: string }> = [
  { value: 1, label: 'Beginner', description: 'Quiet move, then a 1-move tactic — shallow calculation' },
  { value: 2, label: 'Intermediate', description: 'The tactic lands two moves out — deeper to see' },
  { value: 3, label: 'Advanced', description: 'The tactic is far out — calculate the whole line' },
];

export function TacticSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [phase, setPhase] = useState<Phase>('select');
  const [item, setItem] = useState<SetupTrainerItem | null>(null);
  const [displayRating, setDisplayRating] = useState<number>(activeProfile?.puzzleRating ?? 1200);
  const sessionRef = useRef<SetupAdaptiveSession | null>(null);
  const completedRef = useRef(false);

  const handleSelectDifficulty = useCallback(async (d: SetupPuzzleDifficulty): Promise<void> => {
    setPhase('loading');
    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: 'TacticSetupPage.difficulty-selected',
      summary: `setup-trainer started at level=${d}`,
    });

    // The corpus must be in Dexie before we can band-select.
    await seedPuzzles();

    const baseRating = activeProfile?.puzzleRating ?? 1200;
    const session = createSetupSession(d, baseRating);
    sessionRef.current = session;
    setDisplayRating(session.targetRating);

    const first = await pickSetupPuzzle(session);
    if (!first) {
      setItem(null);
      setPhase('summary');
      return;
    }
    completedRef.current = false;
    setItem(first);
    setPhase('solving');
  }, [activeProfile?.puzzleRating]);

  const handleComplete = useCallback(async (correct: boolean): Promise<void> => {
    const session = sessionRef.current;
    const current = item;
    if (!session || !current) return;
    if (completedRef.current) return; // guard double-fire
    completedRef.current = true;

    const playerRating = activeProfile?.puzzleRating ?? 1200;
    const { session: nextSession, newPlayerRating } = recordSetupResult(
      session,
      current.puzzle.id,
      current.rating,
      correct,
      playerRating,
    );
    sessionRef.current = nextSession;
    setDisplayRating(nextSession.targetRating);

    // Persist the adapted puzzle rating (consistent with AdaptivePuzzlePage).
    if (activeProfile) {
      const updated = { ...activeProfile, puzzleRating: newPlayerRating };
      setActiveProfile(updated);
      void db.profiles.update(activeProfile.id, { puzzleRating: newPlayerRating });
    }

    if (nextSession.attempted >= SESSION_LENGTH) {
      setPhase('summary');
      return;
    }

    const next = await pickSetupPuzzle(nextSession);
    if (!next) {
      setPhase('summary');
      return;
    }
    completedRef.current = false;
    setItem(next);
  }, [item, activeProfile, setActiveProfile]);

  const session = sessionRef.current;
  const solved = session?.solved ?? 0;
  const attempted = session?.attempted ?? 0;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 flex flex-col gap-4 min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => void navigate('/tactics')} className="p-2 rounded-lg hover:opacity-80" data-testid="back-btn">
          <ArrowLeft size={20} style={{ color: 'var(--color-text)' }} />
        </button>
        <Wrench size={24} style={{ color: 'var(--color-success)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Setup Trainer</h1>
        <div className="ml-auto">
          <PageHelp
            helpId="tactics-setup"
            title="How the Setup Trainer works"
            steps={[
              { label: 'What this trains', body: 'Calculation mixed with tactics spotting. Each position has a quiet preparatory move — no capture, no check — that sets up a tactic. You find it, then calculate and play the tactic all the way to the end.' },
              { label: 'Pick a depth', body: 'Beginner: the tactic lands one move after the setup. Advanced: it is several moves out, so you calculate the whole line before you commit.' },
              { label: 'It adapts', body: 'Puzzles are pulled near your tactic rating and get harder as you solve, easier as you miss — so the calculation stays at the edge of what you can see.' },
              { label: 'Where it fits', body: 'A deeper skill than spot-the-motif drilling: the move-before-the-move, calculated to the finish, is what wins real games.' },
            ]}
          />
        </div>
      </div>

      {/* Difficulty Select */}
      {phase === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Find the quiet move that sets up the tactic, then calculate it to the end.
            Not &ldquo;spot the fork&rdquo; — &ldquo;engineer the fork, then play it out.&rdquo;
          </p>
          <div className="flex flex-col gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => void handleSelectDifficulty(d.value)}
                className="w-full rounded-xl border p-4 text-left transition-all hover:opacity-90 flex items-center gap-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-success) 30%, var(--color-border))',
                  background: 'var(--color-surface)',
                }}
                data-testid={`difficulty-${d.value}`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}
                >
                  {d.value}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{d.label}</h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--color-success)' }} />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {phase === 'loading' && (
        <div className="flex items-center justify-center flex-1" data-testid="loading">
          <p style={{ color: 'var(--color-text-muted)' }}>Finding setup positions...</p>
        </div>
      )}

      {/* Solving */}
      {phase === 'solving' && item && (
        <AnimatePresence mode="wait">
          <motion.div
            key={item.puzzle.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ background: 'var(--color-accent)', width: `${Math.round((attempted / SESSION_LENGTH) * 100)}%` }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{Math.min(attempted + 1, SESSION_LENGTH)}/{SESSION_LENGTH}</span>
            </div>

            {/* Badge row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{tacticTypeIcon(item.puzzle.tacticType)}</span>
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}>
                Setup: {tacticTypeLabel(item.puzzle.tacticType)}
              </span>
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                <TrendingUp size={12} /> ~{displayRating}
              </span>
            </div>

            {/* Board */}
            <TacticSetupBoard
              puzzle={item.puzzle}
              onComplete={(correct) => void handleComplete(correct)}
            />

            {/* Stats */}
            <div className="flex justify-center gap-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span style={{ color: 'var(--color-success)' }}>{solved} solved</span>
              <span style={{ color: 'var(--color-error)' }}>{attempted - solved} missed</span>
              <button onClick={() => setPhase('summary')} className="underline opacity-70 hover:opacity-100" data-testid="end-session">
                End session
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Summary */}
      {phase === 'summary' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center flex-1 gap-6"
          data-testid="session-summary"
        >
          <Wrench size={40} style={{ color: 'var(--color-success)' }} />
          <div className="text-center">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Setup Training Complete</h2>
            {attempted > 0 ? (
              <p className="text-lg mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {solved}/{attempted} setups calculated ({Math.round((solved / attempted) * 100)}%)
              </p>
            ) : (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                No setup positions found at that depth right now. Try another level.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { sessionRef.current = null; setItem(null); setPhase('select'); }}
              className="px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="play-again"
            >
              Train Again
            </button>
            <button
              onClick={() => void navigate('/tactics')}
              className="px-6 py-3 rounded-xl font-semibold text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              Back to Tactics
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
