import { CheckCircle2, CircleDashed, Eye, XCircle } from 'lucide-react';
import type { MissionCard, MissionOutcome, MissionPhase } from '../../missions/missionCard';

const PHASE_LABEL: Record<MissionPhase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

/** One FIXED phrase per outcome — the recap never improvises. */
export const RECAP_PHRASE: Record<MissionOutcome, string> = {
  'pass-first-try': 'Mission complete, first try.',
  'pass-retry': 'Mission complete.',
  'miss-shown': 'Shown — it comes back next game.',
  missed: 'Missed — it comes back next game.',
  incomplete: 'Not reached this game.',
};

function OutcomeIcon({ outcome }: { outcome: MissionOutcome | undefined }): JSX.Element {
  if (outcome === 'pass-first-try' || outcome === 'pass-retry') return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
  if (outcome === 'miss-shown' || outcome === 'missed') return <XCircle size={16} className="text-rose-400 shrink-0" />;
  return <CircleDashed size={16} className="text-theme-text-muted shrink-0" />;
}

interface RecapSheetProps {
  /** Each phase's card this game. */
  phaseCards: Partial<Record<MissionPhase, MissionCard>>;
  results: Partial<Record<MissionPhase, MissionOutcome>>;
  /** A boss game: the weaknesses it went after, and how each held. */
  /** null = the habit never came up this game. */
  targeted?: ReadonlyArray<{ label: string; held: boolean | null }>;
}

/** After a Campaign game: each phase's mission and how it went (Lane C). */
export function RecapSheet({ phaseCards, results, targeted }: RecapSheetProps): JSX.Element {
  const phases = (['opening', 'middlegame', 'endgame'] as const).filter((p) => phaseCards[p]);
  return (
    <div className="px-3 pb-2" data-testid="mission-recap">
      <div className="rounded-2xl border border-theme-border bg-theme-surface p-3 flex flex-col gap-2">
        <div className="text-sm font-semibold text-theme-text">This game's missions</div>
        {phases.map((p) => (
          <div key={p} className="flex items-center gap-2 text-sm" data-testid={`mission-recap-${p}`} data-outcome={results[p] ?? 'incomplete'}>
            <OutcomeIcon outcome={results[p]} />
            <span className="text-theme-text-muted w-24 shrink-0">{PHASE_LABEL[p]}</span>
            <span className="text-theme-text min-w-0 flex-1 truncate">{phaseCards[p]?.title}</span>
            <span className="text-xs text-theme-text-muted shrink-0">{RECAP_PHRASE[results[p] ?? 'incomplete']}</span>
          </div>
        ))}
        {targeted && targeted.length > 0 && (
          <div className="mt-1 flex flex-col gap-1" data-testid="mission-recap-targeted">
            <div className="flex items-center gap-2 text-xs text-theme-text-muted"><Eye size={14} />It went after:</div>
            {targeted.map((t) => (
              <div key={t.label} className="text-sm text-theme-text pl-6">
                {t.label} — {t.held === null ? 'it never came up' : t.held ? 'you held it' : 'it got through'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
