import { useNavigate } from 'react-router-dom';
import { Swords, BarChart3, Calendar, Search, MessageCircle, GraduationCap, History } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { useSettings } from '../../hooks/useSettings';
import { scaledShadow } from '../../utils/neonColors';
import type { CSSProperties, ReactNode } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function neonBorderStyle(rgb: string, gS: number): CSSProperties {
  return {
    borderTop: `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`,
    borderRight: `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`,
    borderLeft: `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`,
    borderBottom: `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`,
  };
}

function applyHoverBorder(el: HTMLElement, rgb: string, gS: number): void {
  el.style.borderLeft = `2px solid rgba(${rgb}, ${Math.min(1, 0.85 * gS)})`;
  el.style.borderBottom = `2px solid rgba(${rgb}, ${Math.min(1, 0.85 * gS)})`;
  el.style.borderTop = `1px solid rgba(${rgb}, ${Math.min(1, 0.2 * gS)})`;
  el.style.borderRight = `1px solid rgba(${rgb}, ${Math.min(1, 0.2 * gS)})`;
}

function applyRestBorder(el: HTMLElement, rgb: string, gS: number): void {
  el.style.borderLeft = `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`;
  el.style.borderBottom = `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`;
  el.style.borderTop = `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`;
  el.style.borderRight = `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function CoachHomePage(): JSX.Element {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const gB = settings.glowBrightness;
  const gS = gB / 100;

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="coach-home-page"
    >
      <h1 className="text-xl font-bold text-center mt-2">
        Coach
      </h1>

      {/* Search */}
      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar placeholder="Ask your coach or say what you want to do..." />
      </div>

      {/* Tile grid — same neon pattern the Dashboard and Tactics page
          use. Play + Learn are the two primary big aspect-square tiles
          with subtitle descriptions; Game Insights / Training Plan /
          Analyse / Chat fill the secondary row. The old "Work with
          Coach" tile was removed — it overlapped with Learn (live
          teach session) and Training Plan (structured plan). */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-start max-w-lg mx-auto w-full">
        <PrimaryTile
          icon={<Swords size={40} className="text-emerald-400" />}
          label="Play"
          subtitle="Vs the engine. Coach narrates each move."
          rgb="52, 211, 153"
          bgClass="bg-emerald-500/10"
          textColorClass="text-emerald-400"
          onClick={() => void navigate('/coach/play')}
          gB={gB}
          gS={gS}
          testId="coach-action-play"
        />
        <PrimaryTile
          icon={<GraduationCap size={40} className="text-cyan-400" />}
          label="Learn"
          subtitle="Guided lessons from Sonnet — pick a topic and dive in."
          rgb="6, 182, 212"
          bgClass="bg-cyan-500/10"
          textColorClass="text-cyan-400"
          onClick={() => void navigate('/coach/teach')}
          gB={gB}
          gS={gS}
          testId="coach-action-teach"
        />

        <SecondaryTile
          icon={<BarChart3 size={28} className="text-violet-400" />}
          label="Game Insights"
          rgb="139, 92, 246"
          bgClass="bg-violet-500/10"
          textColorClass="text-violet-400"
          onClick={() => void navigate('/coach/report')}
          gB={gB}
          gS={gS}
          testId="coach-action-report"
        />
        <SecondaryTile
          icon={<Calendar size={28} className="text-amber-400" />}
          label="Training Plan"
          rgb="245, 158, 11"
          bgClass="bg-amber-500/10"
          textColorClass="text-amber-400"
          onClick={() => void navigate('/coach/plan')}
          gB={gB}
          gS={gS}
          testId="coach-action-plan"
        />
        <SecondaryTile
          icon={<Search size={28} className="text-sky-400" />}
          label="Analyse"
          rgb="56, 189, 248"
          bgClass="bg-sky-500/10"
          textColorClass="text-sky-400"
          onClick={() => void navigate('/coach/analyse')}
          gB={gB}
          gS={gS}
          testId="coach-action-analyse"
        />
        <SecondaryTile
          icon={<MessageCircle size={28} className="text-rose-400" />}
          label="Chat"
          rgb="251, 113, 133"
          bgClass="bg-rose-500/10"
          textColorClass="text-rose-400"
          onClick={() => void navigate('/coach/chat')}
          gB={gB}
          gS={gS}
          testId="coach-action-chat"
        />
        <SecondaryTile
          icon={<History size={28} className="text-teal-400" />}
          label="Review with Coach"
          rgb="45, 212, 191"
          bgClass="bg-teal-500/10"
          textColorClass="text-teal-400"
          onClick={() => void navigate('/coach/review')}
          gB={gB}
          gS={gS}
          testId="coach-action-review"
        />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface TileProps {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  rgb: string;
  bgClass: string;
  textColorClass: string;
  onClick: () => void;
  gB: number;
  gS: number;
  testId: string;
}

/** Big aspect-square primary tile. Used for Play + Learn so they're
 *  the visual focus of the hub. Title + subtitle stacked. */
function PrimaryTile({ icon, label, subtitle, rgb, bgClass, textColorClass, onClick, gB, gS, testId }: TileProps): JSX.Element {
  const shadow = scaledShadow(rgb, gB);
  const shadowHover = scaledShadow(rgb, Math.min(200, gB * 1.4));
  return (
    <button
      onClick={onClick}
      className={`${bgClass} rounded-2xl flex flex-col items-center justify-center gap-2 px-3 py-4 transition-all duration-200 aspect-square`}
      style={{ ...neonBorderStyle(rgb, gS), boxShadow: shadow }}
      onMouseEnter={(e) => { applyHoverBorder(e.currentTarget, rgb, gS); e.currentTarget.style.boxShadow = shadowHover; }}
      onMouseLeave={(e) => { applyRestBorder(e.currentTarget, rgb, gS); e.currentTarget.style.boxShadow = shadow; }}
      data-testid={testId}
    >
      {icon}
      <span className={`text-base font-bold ${textColorClass}`}>{label}</span>
      {subtitle && (
        <span className="text-[11px] text-center leading-snug" style={{ color: 'var(--color-text-muted)' }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}

/** Smaller aspect-square secondary tile — for Game Insights, Training
 *  Plan, Analyse, Chat. Icon + label only, no subtitle. */
function SecondaryTile({ icon, label, rgb, bgClass, textColorClass, onClick, gB, gS, testId }: TileProps): JSX.Element {
  const shadow = scaledShadow(rgb, gB);
  const shadowHover = scaledShadow(rgb, Math.min(200, gB * 1.4));
  return (
    <button
      onClick={onClick}
      className={`${bgClass} rounded-2xl flex flex-col items-center justify-center gap-2 py-6 transition-all duration-200`}
      style={{ ...neonBorderStyle(rgb, gS), boxShadow: shadow }}
      onMouseEnter={(e) => { applyHoverBorder(e.currentTarget, rgb, gS); e.currentTarget.style.boxShadow = shadowHover; }}
      onMouseLeave={(e) => { applyRestBorder(e.currentTarget, rgb, gS); e.currentTarget.style.boxShadow = shadow; }}
      data-testid={testId}
    >
      {icon}
      <span className={`text-sm font-bold ${textColorClass}`}>{label}</span>
    </button>
  );
}
