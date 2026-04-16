import { Loader2, Sparkles } from 'lucide-react';
import { InsightsDonutChart } from './InsightsDonutChart';
import { InsightsBarChart } from './InsightsBarChart';
import { InsightsStackedBar } from './InsightsStackedBar';
import { StrengthsCard } from './StrengthsCard';
import type { OverviewInsights } from '../../types';

export interface AnalysisProgress {
  current: number;
  total: number;
  phase: 'analyzing' | 'computing_weaknesses' | 'done';
}

interface OverviewTabProps {
  data: OverviewInsights;
  /** Fired when the user taps "Analyze Now". Page-level handler runs the
   *  Stockfish batch and pipes progress via `analysisProgress`. */
  onAnalyze?: () => void;
  /** Live progress while a batch is running. When set, the CTA renders as
   *  a progress bar instead of a button. */
  analysisProgress?: AnalysisProgress | null;
}

export function OverviewTab({ data, onAnalyze, analysisProgress }: OverviewTabProps): JSX.Element {
  const wldData = [
    { name: 'Wins', value: data.wins, color: 'var(--color-success)' },
    { name: 'Losses', value: data.losses, color: 'var(--color-error)' },
    { name: 'Draws', value: data.draws, color: 'var(--color-text-muted)' },
  ];

  const cc = data.classificationCounts;
  const moveQuality = [
    { label: 'Brilliant', value: cc.brilliant, color: '#22d3ee' },
    { label: 'Great', value: cc.great, color: '#22c55e' },
    { label: 'Good', value: cc.good, color: '#6366f1' },
    { label: 'Book', value: cc.book, color: '#3f3f46' },
    { label: 'Inaccuracy', value: cc.inaccuracy, color: '#f59e0b' },
    { label: 'Mistake', value: cc.mistake, color: '#f97316' },
    { label: 'Blunder', value: cc.blunder, color: '#ef4444' },
  ];

  const phaseColors: Record<string, string> = {
    opening: 'var(--color-success)',
    middlegame: '#f59e0b',
    endgame: '#f97316',
  };

  return (
    <div data-testid="overview-tab">
      {data.gamesNeedingAnalysis > 0 && (
        <AnalyzeCta
          gamesNeedingAnalysis={data.gamesNeedingAnalysis}
          analyzedGameCount={data.analyzedGameCount}
          onAnalyze={onAnalyze}
          progress={analysisProgress}
        />
      )}

      {/* Results */}
      <Section title="Results">
        <div className="flex items-center gap-5 py-3.5">
          <InsightsDonutChart data={wldData} centerValue={data.totalGames} centerLabel="Games" />
          <div className="flex flex-col gap-1.5 flex-1">
            {wldData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.name}
                <span className="ml-auto font-semibold" style={{ color: 'var(--color-text)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
        <DataRow label="Win rate as White" value={`${data.winRateWhite}%`} />
        <DataRow label="Win rate as Black" value={`${data.winRateBlack}%`} />
        {data.highestBeaten && (
          <DataRow label="Highest rated beaten" value={`${data.highestBeaten.elo}`} color="var(--color-success)" />
        )}
        {data.lowestLostTo && (
          <DataRow label="Lowest rated lost to" value={`${data.lowestLostTo.elo}`} color="var(--color-error)" />
        )}
      </Section>

      {/* Move Quality */}
      <Section title="Move Quality">
        <InsightsStackedBar segments={moveQuality} />
      </Section>

      {/* Per Game Averages */}
      <Section title="Per Game Averages">
        <DataRow label="Accuracy" value={`${data.avgAccuracy}%`} />
        <DataRow label="Moves per game" value={`${data.avgMovesPerGame}`} />
        <DataRow label="Brilliant moves" value={`${data.avgBrilliantsPerGame}`} color="#22d3ee" />
        <DataRow label="Inaccuracies" value={`${data.avgInaccuraciesPerGame}`} color="#f59e0b" />
        <DataRow label="Mistakes" value={`${data.avgMistakesPerGame}`} color="#f97316" />
        <DataRow label="Blunders" value={`${data.avgBlundersPerGame}`} color="var(--color-error)" />
        <DataRow label="Best move agreement" value={`${data.bestMoveAgreement}%`} />
      </Section>

      {/* Accuracy by Phase */}
      {data.phaseAccuracy.length > 0 && (
        <Section title="Accuracy by Phase">
          <InsightsBarChart
            data={data.phaseAccuracy.map((p) => ({
              label: p.phase.charAt(0).toUpperCase() + p.phase.slice(1),
              value: p.accuracy,
              color: phaseColors[p.phase] ?? 'var(--color-accent)',
              suffix: '%',
            }))}
            maxValue={100}
          />
        </Section>
      )}

      {/* Accuracy by Color */}
      <Section title="Accuracy by Color">
        <div className="flex gap-5 py-3.5 justify-center">
          <AccuracyRing value={data.accuracyWhite} label="As White" />
          <AccuracyRing value={data.accuracyBlack} label="As Black" />
        </div>
      </Section>

      <StrengthsCard strengths={data.strengths} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="pt-4">
      <h3
        className="text-[10px] font-bold uppercase tracking-wider pb-2 border-b"
        style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color?: string }): JSX.Element {
  return (
    <div
      className="flex items-center justify-between py-2 border-b text-sm"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="font-semibold" style={{ color: color ?? 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function AnalyzeCta({
  gamesNeedingAnalysis,
  analyzedGameCount,
  onAnalyze,
  progress,
}: {
  gamesNeedingAnalysis: number;
  analyzedGameCount: number;
  onAnalyze?: () => void;
  progress?: AnalysisProgress | null;
}): JSX.Element {
  const totalToProcess = gamesNeedingAnalysis;
  const isRunning = progress != null && progress.phase !== 'done';
  const pct = isRunning && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  const heading =
    analyzedGameCount === 0
      ? `${gamesNeedingAnalysis} game${gamesNeedingAnalysis === 1 ? '' : 's'} not analyzed yet`
      : `${gamesNeedingAnalysis} of ${analyzedGameCount + gamesNeedingAnalysis} games not analyzed`;

  const body = isRunning
    ? progress.phase === 'computing_weaknesses'
      ? 'Computing weakness profile…'
      : `Analyzing ${progress.current} / ${progress.total}…`
    : 'Stockfish needs to score every move before accuracy and move-quality stats can populate. Your data stays on-device.';

  return (
    <div
      className="rounded-xl p-4 mb-2 border"
      style={{
        background: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)',
      }}
      data-testid="analyze-cta"
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 mt-0.5 p-1.5 rounded-lg"
          style={{ background: 'color-mix(in srgb, var(--color-warning) 25%, transparent)' }}
        >
          <Sparkles size={16} style={{ color: 'var(--color-warning)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {heading}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {body}
          </div>
          {isRunning ? (
            <div
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--color-warning) 18%, transparent)' }}
            >
              <div
                className="h-full transition-[width] duration-200"
                style={{ width: `${pct}%`, background: 'var(--color-warning)' }}
                data-testid="analyze-progress-bar"
              />
            </div>
          ) : (
            <button
              onClick={onAnalyze}
              disabled={!onAnalyze}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-warning)', color: '#000' }}
              data-testid="analyze-now-btn"
            >
              <Loader2 size={12} className="hidden" />
              Analyze {totalToProcess === 1 ? 'this game' : `all ${totalToProcess} games`} now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AccuracyRing({ value, label }: { value: number; label: string }): JSX.Element {
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="text-center">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="14" fill="none"
            stroke={value >= 70 ? 'var(--color-text)' : 'var(--color-text-muted)'}
            strokeWidth="3"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          {value}%
        </div>
      </div>
      <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}
