import { Eye, Play, Target } from 'lucide-react';
import type { MissionCard, MissionPhase } from '../../missions/missionCard';

const PHASE_LABEL: Record<MissionPhase, string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

interface MissionCardSheetProps {
  /** The phases' missions this game, in order. */
  cards: readonly MissionCard[];
  /** Learned habits running silently this game. */
  watchers: readonly MissionCard[];
  /** Cards whose briefing may be watched again ("Show me again"). */
  canReplay: readonly MissionCard[];
  onStart: () => void;
  onReplay: (card: MissionCard) => void;
}

/** Before a Campaign game: this game's missions, one line each (Lane C).
 *  The page floats it OVER the locked board — under it, it pushed the board
 *  to its smallest and the buttons under the nav. */
export function MissionCardSheet({ cards, watchers, canReplay, onStart, onReplay }: MissionCardSheetProps): JSX.Element {
  return (
    <div className="px-3 pb-2" data-testid="mission-card-sheet">
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 flex flex-col gap-2">
        <div className="text-sm font-semibold text-theme-text">This game's missions</div>
        {cards.length === 0 && <div className="text-xs text-theme-text-muted" data-testid="mission-card-none">No new mission — the coach watches the habits you have learned.</div>}
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm text-theme-text" data-testid={`mission-card-line-${c.phase}`}>
            <Target size={14} className="text-sky-400 shrink-0" />
            <span className="text-theme-text-muted w-24 shrink-0">{PHASE_LABEL[c.phase]}</span>
            <span className="truncate">{c.title}</span>
            {canReplay.some((r) => r.id === c.id) && (
              <button onClick={() => onReplay(c)} className="ml-auto text-xs text-sky-400 underline shrink-0 min-h-[32px]" data-testid={`mission-card-replay-${c.id}`}>
                Show me again
              </button>
            )}
          </div>
        ))}
        {watchers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-theme-text-muted" data-testid="mission-card-watching">
            <Eye size={14} className="shrink-0" />
            Also watching: {watchers.map((w) => w.title).join(', ')}
          </div>
        )}
        <button
          onClick={onStart}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white min-h-[44px]"
          data-testid="mission-card-start"
        >
          <Play size={16} />Start
        </button>
      </div>
    </div>
  );
}
