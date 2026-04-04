import { useState } from 'react';
import { InsightsDonutChart } from './InsightsDonutChart';
import { InsightsBarChart } from './InsightsBarChart';
import { StrengthsCard } from './StrengthsCard';
import { OpeningDrilldown } from './OpeningDrilldown';
import type { OpeningInsights, OpeningAggregateStats } from '../../types';

interface OpeningsTabProps {
  data: OpeningInsights;
}

export function OpeningsTab({ data }: OpeningsTabProps): JSX.Element {
  const [drilldownOpening, setDrilldownOpening] = useState<OpeningAggregateStats | null>(null);

  if (drilldownOpening) {
    return (
      <OpeningDrilldown
        opening={drilldownOpening}
        onBack={() => setDrilldownOpening(null)}
      />
    );
  }

  const coverageData = [
    { name: 'In repertoire', value: data.repertoireCoverage.inBook, color: 'var(--color-accent)' },
    { name: 'Off-book', value: data.repertoireCoverage.offBook, color: 'var(--color-text-muted)' },
  ];
  const total = data.repertoireCoverage.inBook + data.repertoireCoverage.offBook;
  const coveragePct = total > 0 ? Math.round((data.repertoireCoverage.inBook / total) * 100) : 0;

  return (
    <div data-testid="openings-tab">
      {/* Repertoire Coverage */}
      <Section title="Repertoire Coverage">
        <div className="flex items-center gap-5 py-3.5">
          <InsightsDonutChart data={coverageData} centerValue={`${coveragePct}%`} centerLabel="In Book" />
          <div className="flex flex-col gap-1.5 flex-1">
            {coverageData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                {d.name}
                <span className="ml-auto font-semibold" style={{ color: 'var(--color-text)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Most Played as White */}
      {data.mostPlayedWhite.length > 0 && (
        <Section title="Most Played as White">
          {data.mostPlayedWhite.map((o) => (
            <OpeningRow key={o.eco ?? o.name} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </Section>
      )}

      {/* Most Played as Black */}
      {data.mostPlayedBlack.length > 0 && (
        <Section title="Most Played as Black">
          {data.mostPlayedBlack.map((o) => (
            <OpeningRow key={o.eco ?? o.name} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </Section>
      )}

      {/* Win Rate by Opening */}
      {data.winRateByOpening.length > 0 && (
        <Section title="Win Rate by Opening (3+ games)">
          <InsightsBarChart
            data={data.winRateByOpening.map((o) => ({
              label: o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name,
              value: o.winRate,
              color: o.winRate >= 60 ? 'var(--color-success)' : o.winRate >= 40 ? '#f59e0b' : 'var(--color-error)',
              suffix: '%',
            }))}
            maxValue={100}
          />
        </Section>
      )}

      {/* Drill Accuracy */}
      {data.drillAccuracyByOpening.length > 0 && (
        <Section title="Drill Accuracy">
          <InsightsBarChart
            data={data.drillAccuracyByOpening.map((o) => ({
              label: o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name,
              value: o.accuracy,
              color: o.accuracy >= 70 ? 'var(--color-success)' : o.accuracy >= 50 ? '#f59e0b' : 'var(--color-error)',
              suffix: '%',
            }))}
            maxValue={100}
          />
        </Section>
      )}

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

function OpeningRow({ opening, onClick }: { opening: OpeningAggregateStats; onClick: () => void }): JSX.Element {
  const winColor = opening.winRate >= 60 ? 'var(--color-success)' : opening.winRate >= 40 ? '#f59e0b' : 'var(--color-error)';

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full py-2 border-b text-sm hover:opacity-80 transition-opacity"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
      data-testid="opening-row"
    >
      <span style={{ color: 'var(--color-text)' }}>
        {opening.name}
        {opening.eco && (
          <span className="text-[11px] ml-1" style={{ color: 'var(--color-text-muted)' }}>{opening.eco}</span>
        )}
      </span>
      <span className="font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {opening.games} gm{' '}
        <span style={{ color: winColor }}>{opening.winRate}%</span>
        <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>›</span>
      </span>
    </button>
  );
}
