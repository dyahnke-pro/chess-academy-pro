import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Eye, Swords, Wrench, Lightbulb, ChevronRight } from 'lucide-react';
import { getStoredTacticalProfile } from '../../services/tacticalProfileService';
import { getTacticDrillCounts } from '../../services/tacticDrillService';
import { getContextDepth } from '../../services/tacticCreateService';
import { db } from '../../db/schema';
import type { TacticalProfile } from '../../types';

interface LayerCardProps {
  number: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  stat?: string;
  locked?: boolean;
  onClick: () => void;
}

function LayerCard({ number, title, subtitle, description, icon: Icon, color, stat, locked, onClick }: LayerCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="w-full rounded-xl border p-5 text-left transition-all hover:opacity-90 disabled:opacity-50"
      style={{
        borderColor: locked ? 'var(--color-border)' : `color-mix(in srgb, ${color} 30%, var(--color-border))`,
        background: locked ? 'var(--color-surface)' : `color-mix(in srgb, ${color} 4%, var(--color-surface))`,
      }}
      data-testid={`layer-${number}-card`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          <Icon size={20} style={{ color: locked ? 'var(--color-text-muted)' : color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              Layer {number}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</span>
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: locked ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
            {title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
          {stat && (
            <span
              className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-lg"
              style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
            >
              {stat}
            </span>
          )}
        </div>
        <ChevronRight size={16} style={{ color: locked ? 'var(--color-text-muted)' : color }} className="shrink-0 mt-1" />
      </div>
    </button>
  );
}

export function TacticsPage(): JSX.Element {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TacticalProfile | null>(null);
  const [drillCount, setDrillCount] = useState(0);
  const [setupCount, setSetupCount] = useState(0);
  const [createDepth, setCreateDepth] = useState(8);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    const stored = await getStoredTacticalProfile();
    setProfile(stored);

    const counts = await getTacticDrillCounts();
    let total = 0;
    counts.forEach((c) => { total += c; });
    setDrillCount(total);

    const setups = await db.setupPuzzles
      .filter((sp) => sp.status !== 'mastered')
      .count();
    setSetupCount(setups);

    const depth = await getContextDepth();
    setCreateDepth(depth);
  }

  const weakestLabel = profile?.weakestTypes
    .slice(0, 2)
    .map((t) => t.replace(/_/g, ' '))
    .join(', ');

  return (
    <motion.div
      className="max-w-2xl mx-auto w-full p-6 pb-20 md:pb-6 flex flex-col gap-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crosshair size={24} style={{ color: 'var(--color-accent)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Tactics Training</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            4-layer program built from your games
          </p>
        </div>
      </div>

      {/* Layer Cards */}
      <div className="flex flex-col gap-3">
        <LayerCard
          number={1}
          title="Spot"
          subtitle="Tactic Classifier"
          description="See exactly what tactics you miss in your games — forks, pins, skewers — broken down by opening and game phase. The gap between puzzle accuracy and game performance reveals your blind spots."
          icon={Eye}
          color="var(--color-accent)"
          stat={profile ? `${profile.stats.length} tactic types tracked` : undefined}
          onClick={() => void navigate('/tactics/profile')}
        />

        <LayerCard
          number={2}
          title="Drill"
          subtitle="Missed Opportunity Puzzles"
          description="Your own games become your puzzle set. Every missed fork, pin, and skewer is a drill position — tagged by type, opening, and opponent. More targeted than any puzzle database."
          icon={Swords}
          color="var(--color-warning)"
          stat={drillCount > 0 ? `${drillCount} tactic drills available` : undefined}
          onClick={() => void navigate('/tactics/drill')}
        />

        <LayerCard
          number={3}
          title="Setup"
          subtitle="Tactic Setup Trainer"
          description="Not 'find the fork' — 'engineer the fork.' Start 1-3 moves before the tactic and find the quiet preparatory moves that make it inevitable."
          icon={Wrench}
          color="var(--color-success)"
          stat={setupCount > 0 ? `${setupCount} setup puzzles` : undefined}
          onClick={() => void navigate('/tactics/setup')}
        />

        <LayerCard
          number={4}
          title="Create"
          subtitle="Full Game Replay"
          description="Replay your actual games from the opening. Stay alert through quiet positions and find the tactic when it appears. Context depth grows as you succeed."
          icon={Lightbulb}
          color="#a78bfa"
          stat={profile ? `Context: ${createDepth} moves` : undefined}
          onClick={() => void navigate('/tactics/create')}
        />
      </div>

      {/* Summary */}
      {profile && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {profile.totalGamesAnalyzed} games analyzed &middot;{' '}
            {profile.totalGamesMissed} tactical positions found
            {weakestLabel && (
              <> &middot; Weakest: <span style={{ color: 'var(--color-warning)' }}>{weakestLabel}</span></>
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
