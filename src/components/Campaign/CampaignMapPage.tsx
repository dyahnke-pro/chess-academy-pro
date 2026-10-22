import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Crown, Lock, RotateCcw, Swords, Target, Hourglass, Play, EyeOff } from 'lucide-react';
import { loadMissionRecord } from '../../missions/missionRecord';
import { loadBossAttempts } from '../../missions/bosses/bossRecord';
import { isCampaignTrack, TRACKS, TRACK_ORDER, type CampaignTrack } from '../../missions/tracks';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
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

/** A boss not built yet: named, and honest that it is coming. */
function ComingBoss({ chapter: c }: { chapter: MapChapter }): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-theme-border bg-theme-surface px-4 py-3.5" data-testid={`campaign-boss-${c.chapter.boss}`} data-gate="coming">
      <Hourglass size={22} className="text-theme-text-muted shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-theme-text">Boss: {c.chapter.bossName}</div>
        <div className="text-xs text-theme-text-muted">Coming soon.</div>
      </div>
    </div>
  );
}

/** The boss closing a chapter: locked, ready, owed practice, or beaten. */
function BossNode({ chapter: c, onStart }: { chapter: MapChapter; onStart: () => void }): JSX.Element {
  if (!c.boss) return <ComingBoss chapter={c} />;
  const { gate } = c.boss;
  const open = gate.kind === 'ready' || gate.kind === 'beaten';
  const first = c.chapter.levels[0];
  const last = c.chapter.levels[c.chapter.levels.length - 1];
  const line = gate.kind === 'locked' ? `Unlocks when Levels ${first}–${last} are learned.`
    : gate.kind === 'practice' ? `Practise ${c.boss.practiceTitle ?? 'your weakest habit'} first — ${gate.remaining} more game${gate.remaining === 1 ? '' : 's'}.`
      : gate.kind === 'beaten' ? 'Beaten. Play it again any time.'
        : gate.attempts > 0 ? 'Rematch ready.' : 'Ready when you are.';
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 ${open ? 'border-rose-500/50 bg-rose-500/10' : 'border-theme-border bg-theme-surface'}`}
      data-testid={`campaign-boss-${c.boss.id}`}
      data-gate={gate.kind}
    >
      {gate.kind === 'beaten' ? <Crown size={22} className="text-amber-400 shrink-0" />
        : open ? <Swords size={22} className="text-rose-400 shrink-0" />
          : <Lock size={22} className="text-theme-text-muted shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-theme-text">Boss: {c.boss.name}</div>
        <div className="text-xs text-theme-text-muted">{line}</div>
      </div>
      {open && (
        <button onClick={onStart} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white min-h-[40px] shrink-0" data-testid={`campaign-boss-start-${c.boss.id}`}>
          {gate.kind === 'beaten' ? 'Play again' : 'Fight'}
        </button>
      )}
    </div>
  );
}

/** The Campaign map (WO-CAMPAIGN-MASTER, Lane C): chapters → levels → three
 *  mission slots → the boss closing each chapter, every status read off the
 *  student's record. */
export function CampaignMapPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const stored = profile?.preferences.campaignTrack;
  const [track, setTrack] = useState<CampaignTrack>(isCampaignTrack(stored) ? stored : 'beginner');
  const [chapters, setChapters] = useState<MapChapter[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([loadMissionRecord(), loadBossAttempts()])
      .then(([record, attempts]) => { if (live) setChapters(campaignMap(record, attempts, undefined, track)); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [track]);

  /** THE TRACK (David 2026-10-21: "intermediates need a way to bypass the
   *  first easy levels"): the student picks where to start; the next game
   *  plays that track's missions. Saved on the profile. */
  const chooseTrack = (next: CampaignTrack): void => {
    setTrack(next);
    if (!profile) return;
    const preferences = { ...profile.preferences, campaignTrack: next };
    setActiveProfile({ ...profile, preferences });
    void db.profiles.update(profile.id, { preferences }).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6" data-testid="campaign-map">
      <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-theme-text text-center">Campaign</h1>
        <div className="flex flex-col gap-2" data-testid="campaign-track-picker">
          <div className="grid grid-cols-3 gap-2">
            {TRACK_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => chooseTrack(t)}
                className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold min-h-[44px] ${t === track ? 'border-sky-500 bg-sky-500/15 text-theme-text' : 'border-theme-border bg-theme-surface text-theme-text-muted'}`}
                data-testid={`campaign-track-${t}`}
                aria-pressed={t === track}
              >
                {TRACKS[t].title}
              </button>
            ))}
          </div>
          <p className="text-xs text-theme-text-muted text-center" data-testid="campaign-track-blurb">
            Levels {TRACKS[track].first}–{TRACKS[track].last}: {TRACKS[track].blurb}
          </p>
        </div>
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
            {c.chapter.theme && (
              <div className="flex items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-3 py-3" data-testid={`campaign-theme-${c.chapter.tier}`}>
                <EyeOff size={16} className="text-theme-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-theme-text">Levels {c.chapter.levels[0]}–{c.chapter.levels[c.chapter.levels.length - 1]}: {c.chapter.theme}</div>
                  <div className="text-xs text-theme-text-muted">Silent games — the coach says nothing until the game ends.</div>
                </div>
              </div>
            )}
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
            <BossNode chapter={c} onStart={() => { if (c.boss) void navigate(`/coach/campaign?boss=${c.boss.id}`); }} />
          </section>
        ))}
      </div>
    </div>
  );
}
