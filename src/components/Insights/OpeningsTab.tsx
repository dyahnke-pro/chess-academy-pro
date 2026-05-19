import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InsightsDonutChart } from './InsightsDonutChart';
import { InsightsBarChart } from './InsightsBarChart';
import { InsightsSection } from './InsightsSection';
import { StrengthsCard } from './StrengthsCard';
import { OpeningDrilldown } from './OpeningDrilldown';
import { HeatmapGrid, type HeatmapRow } from './HeatmapGrid';
import { winRateColor } from './heatmapScales';
import { openingProficiencyMatrix, type OpeningProficiencyRow } from '../../services/analyticsService';
import { encodeFilters, type StatFilter } from '../../services/gameFilterService';
import { winRateTokens, drillAccuracyTokens } from '../../services/severityScale';
import type { OpeningInsights, OpeningAggregateStats } from '../../types';

interface OpeningsTabProps {
  data: OpeningInsights;
}

export function OpeningsTab({ data }: OpeningsTabProps): JSX.Element {
  const navigate = useNavigate();
  const [drilldownOpening, setDrilldownOpening] = useState<OpeningAggregateStats | null>(null);
  const [matrix, setMatrix] = useState<OpeningProficiencyRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void openingProficiencyMatrix()
      .then((rows) => { if (!cancelled) setMatrix(rows); })
      .catch(() => { /* analytics is read-only; safe to swallow */ });
    return () => { cancelled = true; };
  }, []);

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
      <InsightsSection title="Repertoire Coverage">
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
      </InsightsSection>

      {/* Most Played as White */}
      {data.mostPlayedWhite.length > 0 && (
        <InsightsSection title="Most Played as White">
          {data.mostPlayedWhite.map((o) => (
            <OpeningRow key={o.eco ?? o.name} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </InsightsSection>
      )}

      {/* Most Played as Black */}
      {data.mostPlayedBlack.length > 0 && (
        <InsightsSection title="Most Played as Black">
          {data.mostPlayedBlack.map((o) => (
            <OpeningRow key={o.eco ?? o.name} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </InsightsSection>
      )}

      {/* Win Rate by Opening — every bar tappable, drops the user
          into that opening's drilldown (David's "click anything"
          rule). Severity tokens replace the inline color ladder so
          critical-tier openings glow + show ‼. */}
      {data.winRateByOpening.length > 0 && (
        <InsightsSection title="Win Rate by Opening (3+ games)" urgent={data.winRateByOpening.some((o) => o.winRate < 25)}>
          <InsightsBarChart
            data={data.winRateByOpening.map((o) => ({
              label: o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name,
              value: o.winRate,
              severity: winRateTokens(o.winRate).tier,
              suffix: '%',
              onClick: () => setDrilldownOpening(o),
              testId: `win-rate-row-${o.eco ?? o.name}`,
            }))}
            maxValue={100}
          />
        </InsightsSection>
      )}

      {/* Best / worst results vs. opening — explicit callouts so the
          user sees "you crush the French" and "you fold to the Caro"
          at a glance. Tappable rows drop the user into the
          OpeningDrilldown for that opening. Defensive `?.` on the
          arrays so older test fixtures (pre PR #514) don't crash. */}
      {(data.bestResults?.length ?? 0) > 0 && (
        <InsightsSection title="Best results against (3+ games)">
          {(data.bestResults ?? []).map((o) => (
            <OpeningRow key={`best-${o.eco ?? o.name}`} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </InsightsSection>
      )}

      {(data.worstResults?.length ?? 0) > 0 && (
        <InsightsSection
          title="Worst results against (3+ games)"
          urgent={(data.worstResults ?? []).some((o) => o.winRate < 25)}
        >
          {(data.worstResults ?? []).map((o) => (
            <OpeningRow key={`worst-${o.eco ?? o.name}`} opening={o} onClick={() => setDrilldownOpening(o)} />
          ))}
        </InsightsSection>
      )}

      {/* Drill Accuracy — bars are clickable so the user can jump
          straight into that opening's drill history. Severity uses
          the drill-accuracy ladder (70/50/30/20) rather than the
          looser win-rate one. */}
      {data.drillAccuracyByOpening.length > 0 && (
        <InsightsSection
          title="Drill Accuracy"
          urgent={data.drillAccuracyByOpening.some((o) => o.accuracy < 30)}
        >
          <InsightsBarChart
            data={data.drillAccuracyByOpening.map((o) => ({
              label: o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name,
              value: o.accuracy,
              severity: drillAccuracyTokens(o.accuracy).tier,
              suffix: '%',
              onClick: () => {
                // Drill rows don't carry an ECO code (the analytics
                // groups by name only). The filter still requires
                // eco; passing null routes the drilldown to a
                // name-match instead of an ECO lookup.
                const filters: StatFilter[] = [{
                  source: 'opening',
                  eco: null,
                  label: `${o.name} — drill accuracy ${o.accuracy}%`,
                }];
                void navigate(`/weaknesses/games?f=${encodeFilters(filters)}`);
              },
              testId: `drill-accuracy-row-${o.eco ?? o.name}`,
            }))}
            maxValue={100}
          />
        </InsightsSection>
      )}

      {/* Opening proficiency matrix — answers "what works for you"
          in a single heatmap: rows are your top openings, columns
          split White / Black / Combined performance. Hidden until
          we have at least one row with ≥3 games. Row labels are
          clickable (opens drilldown for the opening); individual
          cells are also clickable (opens filtered games list). */}
      {matrix && matrix.length > 0 && (
        <InsightsSection
          title="Proficiency matrix"
          urgent={matrix.some((row) => row.combined.winRatePct < 25 && row.combined.games >= 3)}
        >
          <p className="text-[10px] -mt-1 mb-2 text-center md:text-left" style={{ color: 'var(--color-text-muted)' }}>
            Win-rate per opening, split by color. Tap a name to drill in; tap a cell to see those games.
          </p>
          <HeatmapGrid
            columns={['As White', 'As Black', 'Combined']}
            rows={matrix.map((row): HeatmapRow => ({
              label: row.name,
              sublabel: row.eco ?? undefined,
              // Tapping the row label opens the games list filtered
              // by this opening across BOTH colors — useful when the
              // user wants every game in this opening, not just one
              // color slice. Cells (next column) keep the per-color
              // filter behavior.
              onLabelClick: () => {
                const filters: StatFilter[] = [{
                  source: 'opening',
                  eco: row.eco,
                  label: `${row.name} (${row.combined.games} games)`,
                }];
                void navigate(`/weaknesses/games?f=${encodeFilters(filters)}`);
              },
              cells: [
                {
                  value: row.asWhite ? row.asWhite.winRatePct : null,
                  display: row.asWhite ? `${row.asWhite.winRatePct}%` : '—',
                  hint: row.asWhite ? `${row.asWhite.games} game${row.asWhite.games === 1 ? '' : 's'} as White` : 'No games as White',
                  severity: row.asWhite ? winRateTokens(row.asWhite.winRatePct).tier : undefined,
                },
                {
                  value: row.asBlack ? row.asBlack.winRatePct : null,
                  display: row.asBlack ? `${row.asBlack.winRatePct}%` : '—',
                  hint: row.asBlack ? `${row.asBlack.games} game${row.asBlack.games === 1 ? '' : 's'} as Black` : 'No games as Black',
                  severity: row.asBlack ? winRateTokens(row.asBlack.winRatePct).tier : undefined,
                },
                {
                  value: row.combined.winRatePct,
                  display: `${row.combined.winRatePct}%`,
                  hint: `${row.combined.games} game${row.combined.games === 1 ? '' : 's'} total`,
                  severity: winRateTokens(row.combined.winRatePct).tier,
                },
              ],
            }))}
            cellColor={winRateColor}
            labelColumnWidth="160px"
            testId="opening-proficiency-matrix"
            onCellClick={(rowIndex, colIndex, value) => {
              if (value === null) return;
              const row = matrix[rowIndex];
              const playerColor: 'white' | 'black' | undefined =
                colIndex === 0 ? 'white' : colIndex === 1 ? 'black' : undefined;
              const colLabel = colIndex === 0 ? 'as White' : colIndex === 1 ? 'as Black' : 'combined';
              const filters: StatFilter[] = [{
                source: 'opening',
                eco: row.eco,
                playerColor,
                label: `${row.name} ${colLabel} (${value}%)`,
              }];
              void navigate(`/weaknesses/games?f=${encodeFilters(filters)}`);
            }}
          />
        </InsightsSection>
      )}

      <StrengthsCard strengths={data.strengths} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OpeningRow({ opening, onClick }: { opening: OpeningAggregateStats; onClick: () => void }): JSX.Element {
  const tokens = winRateTokens(opening.winRate);
  // Critical and severe tiers pulse / glow so a really lacking stat
  // jumps off the screen.
  const isUrgent = tokens.tier === 'severe' || tokens.tier === 'critical';

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full py-2 border-b text-sm hover:opacity-80 transition-opacity ${tokens.animationClass}`}
      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
      data-testid="opening-row"
    >
      <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
        {isUrgent && (
          <span
            aria-label={tokens.ariaLabel}
            title={tokens.ariaLabel}
            style={{ color: tokens.color, textShadow: tokens.glow }}
          >
            {tokens.icon}
          </span>
        )}
        <span>{opening.name}</span>
        {opening.eco && (
          <span className="text-[11px] ml-1" style={{ color: 'var(--color-text-muted)' }}>{opening.eco}</span>
        )}
      </span>
      <span className="font-semibold text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {opening.games} gm{' '}
        <span style={{ color: tokens.color, textShadow: isUrgent ? tokens.glow : undefined }}>
          {opening.winRate}%
        </span>
        <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>›</span>
      </span>
    </button>
  );
}
