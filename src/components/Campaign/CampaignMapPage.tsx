import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, RotateCcw, Swords, Target, Hourglass, Play } from 'lucide-react';
import { loadMissionRecord } from '../../missions/missionRecord';
import { campaignMap, type MapChapter, type MapSlot, type SlotStatus } from './campaignMap';

const PHASE_LABEL: Record<MapSlot['phase'], string> = { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' };

const STATUS: Record<SlotStatus, { label: string; tone: string }> = {
  active: { label: 'Next game', tone: 'border-sky-500/40 bg-sky-500/10 text-theme-text' },
  reactivated: { label: 'Back for practice', tone: 'border-amber-500/40 bg-amber-500/10 text-theme-text' },
  graduated: { label: 'Learned', tone: 'border-emerald-500/40 bg-emerald-500/10 text-theme-text' },
  locked: { label: 'Locked', tone: 'border-theme-border bg-theme-surface text-theme-text-muted' },
  coming: { label: 'Coming soon', tone: 'border-theme-border bg-theme-surface text-theme-text-muted' },
};

function StatusIcon({ status }: { status: SlotStatus }): JSX.Element {
  switch (status) {
    case 'active': return <Target size={16} className="text-sky-400 shrink-0" />;
    case 'reactivated': return <RotateCcw size={16} className="text-amber-400 shrink-0" />;
    case 'graduated': return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
    case 'locked': return <Lock size={16} className="text-theme-text-muted shrink-0" />;
    case 'coming': return <Hourglass size={16} className="text-theme-text-muted shrink-0" />;
  }
}

/** The Campaign map (WO-CAMPAIGN-MASTER, Lane C): chapters → levels → three
 *  mission slots → the boss closing each chapter, every status read off the
 *  student's record. */
export function CampaignMapPage(): JSX.Element {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<MapChapter[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    loadMissionRecord()
      .then((record) => { if (live) setChapters(campaignMap(record)); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6" data-testid="campaign-map">
      <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-theme-text text-center">Campaign</h1>
        <button
          onClick={() => { void navigate('/coach/campaign'); }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3.5 text-base font-semibold text-white min-h-[48px]"
          data-testid="campaign-play"
        >
          <Play size={18} />Play the next game
        </button>
        {failed && <p className="text-sm text-theme-text-muted text-center" data-testid="campaign-map-error">Your record could not be read. Play a game and it will appear here.</p>}
        {!chapters && !failed && <p className="text-sm text-theme-text-muted text-center" data-testid="campaign-map-loading">Loading your campaign…</p>}
        {chapters?.map((c) => (
          <section key={c.chapter.tier} className="flex flex-col gap-3" data-testid={`campaign-chapter-${c.chapter.tier}`}>
            <h2 className="text-lg font-semibold text-theme-text">{c.chapter.title}</h2>
            {c.levels.map((l) => (
              <div key={l.level} className="rounded-2xl border border-theme-border bg-theme-surface p-3 flex flex-col gap-2" data-testid={`campaign-level-${l.level}`}>
                <div className="text-sm font-semibold text-theme-text">Level {l.level}</div>
                {l.slots.map((s) => (
                  <div
                    key={s.phase}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 min-h-[44px] ${STATUS[s.status].tone}`}
                    data-testid={`campaign-slot-${l.level}-${s.phase}`}
                    data-status={s.status}
                  >
                    <StatusIcon status={s.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wide text-theme-text-muted">{PHASE_LABEL[s.phase]}</div>
                      <div className="text-sm font-medium truncate">{s.title}</div>
                    </div>
                    <div className="text-[11px] text-theme-text-muted shrink-0">{STATUS[s.status].label}</div>
                  </div>
                ))}
              </div>
            ))}
            <div
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 ${c.boss.unlocked ? 'border-rose-500/50 bg-rose-500/10' : 'border-theme-border bg-theme-surface'}`}
              data-testid={`campaign-boss-${c.boss.id}`}
              data-unlocked={String(c.boss.unlocked)}
            >
              {c.boss.unlocked ? <Swords size={22} className="text-rose-400 shrink-0" /> : <Lock size={22} className="text-theme-text-muted shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-theme-text">Boss: {c.boss.name}</div>
                <div className="text-xs text-theme-text-muted">
                  {c.boss.unlocked ? 'Ready when you are.' : `Unlocks when Levels ${c.chapter.levels[0]}–${c.chapter.levels[c.chapter.levels.length - 1]} are learned.`}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
