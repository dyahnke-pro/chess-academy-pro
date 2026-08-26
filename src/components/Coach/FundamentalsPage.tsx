import { useNavigate } from 'react-router-dom';
import { Scale, Rocket, Crosshair, Shield, Play, Square, Clapperboard, ArrowLeft } from 'lucide-react';
import { PageHelp } from '../Layout/PageHelp';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import { assembleFundamentalsAnswer, type FundamentalsTopic } from '../../services/groundedAnswer';
import type { JSX, ReactNode } from 'react';

/**
 * FundamentalsPage — the dedicated, walkable Fundamentals track (Phase 2 of the
 * "teach fundamentals + the fundamentals of a game" build, David 2026-08-26).
 *
 * Each principle is the SAME grounded, authored text the coach voices in chat
 * (assembleFundamentalsAnswer — G0: authored public-domain principles, never
 * LLM-invented), read aloud here through the sanctioned read-aloud path
 * (useProseReader → speakReadAloud, G5 exemption). Where a principle has a real
 * game that illustrates it (development → the Opera Game review sample), a
 * "Walk the Opera Game" button hands off to the app's own move-by-move
 * annotated review — so the student SEES the fundamental win a game.
 */

interface FundamentalCard {
  topic: Exclude<FundamentalsTopic, 'general'>;
  title: string;
  icon: ReactNode;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const CARDS: FundamentalCard[] = [
  { topic: 'piece-values', title: 'Piece values', icon: <Scale size={26} />, bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', textClass: 'text-amber-400' },
  { topic: 'center', title: 'Control the center', icon: <Crosshair size={26} />, bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', textClass: 'text-emerald-400' },
  { topic: 'development', title: 'Development', icon: <Rocket size={26} />, bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30', textClass: 'text-cyan-400' },
  { topic: 'king-safety', title: 'King safety', icon: <Shield size={26} />, bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/30', textClass: 'text-rose-400' },
];

export function FundamentalsPage(): JSX.Element {
  const navigate = useNavigate();

  // One ProseUnit per principle — read aloud sequentially or one at a time.
  const units: ProseUnit[] = CARDS.map((c) => {
    const ans = assembleFundamentalsAnswer(c.topic);
    return { id: c.topic, text: ans?.facts ?? '' };
  });
  const reader = useProseReader(units);

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="fundamentals-page"
    >
      <div className="relative mt-2">
        <button
          type="button"
          onClick={() => { void navigate('/coach/home'); }}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
          aria-label="Back to Coach"
          data-testid="fundamentals-back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-center">Fundamentals</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <PageHelp
            helpId="fundamentals"
            title="The fundamentals"
            steps={[
              { label: 'The four pillars', body: 'Piece values, the center, development, and king safety — the ideas every strong move rests on.' },
              { label: 'Hear it', body: 'Tap Listen on any card to have the coach read the principle aloud.' },
              { label: 'See it win a game', body: 'Where a principle has a famous game that shows it off, tap "Walk the Opera Game" to step through it move by move.' },
            ]}
          />
        </div>
      </div>

      <p className="text-sm text-center max-w-lg mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        The four ideas every strong move rests on. Tap Listen to hear one, or walk the game that shows it in action.
      </p>

      <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
        {CARDS.map((c) => {
          const ans = assembleFundamentalsAnswer(c.topic);
          const facts = ans?.facts ?? '';
          const reviewId = ans?.exampleReviewId ?? null;
          const reading = reader.currentId === c.topic && reader.isPlaying;
          return (
            <div
              key={c.topic}
              className={`rounded-2xl border-2 ${c.bgClass} ${c.borderClass} p-4 flex flex-col gap-3`}
              data-testid={`fundamental-card-${c.topic}`}
            >
              <div className="flex items-center gap-2">
                <span className={c.textClass}>{c.icon}</span>
                <h2 className={`text-base font-bold ${c.textClass}`}>{c.title}</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {facts}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => (reading ? reader.stop() : reader.playOne(c.topic))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${c.borderClass} ${c.textClass} hover:opacity-80 transition-opacity`}
                  data-testid={`fundamental-listen-${c.topic}`}
                >
                  {reading ? <Square size={14} /> : <Play size={14} />}
                  {reading ? 'Stop' : 'Listen'}
                </button>
                {reviewId && (
                  <button
                    type="button"
                    onClick={() => { void navigate(`/coach/review/${reviewId}`); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${c.borderClass} ${c.textClass} hover:opacity-80 transition-opacity`}
                    data-testid={`fundamental-walk-${c.topic}`}
                  >
                    <Clapperboard size={14} />
                    Walk the Opera Game
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
