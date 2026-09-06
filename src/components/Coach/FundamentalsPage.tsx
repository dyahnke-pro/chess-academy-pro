import { useNavigate } from 'react-router-dom';
import { Compass, Crosshair, Rocket, Shield, Layers, Swords, Crown, Play, Square, Clapperboard, Target, ArrowLeft } from 'lucide-react';
import { PageHelp } from '../Layout/PageHelp';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { useProseReader, type ProseUnit } from '../../hooks/useProseReader';
import { assembleFundamentalsAnswer, type FundamentalsTopic } from '../../services/groundedAnswer';
import type { JSX, ReactNode } from 'react';

/**
 * FundamentalsPage — the walkable Fundamentals track, rebuilt to the app hub
 * standard (David 2026-09-06: "match the standards of the rest of the app" +
 * "add more puzzles to this tab"). The 25 board-provable fundamentals the
 * review computer names (principleAttribution) roll up into SEVEN phase
 * sections here. Each section: authored, grounded prose read aloud through the
 * sanctioned read-aloud path (useProseReader → speakReadAloud, G0/G5) + a Drill
 * button that hands the student real practice — a themed Lichess-puzzle drill
 * where one fits the fundamental, otherwise their OWN flagged positions
 * (/tactics/mistakes), produced automatically once the review computer fires.
 *
 * Grounding (G0): every word of teaching is authored classical principle
 * (Capablanca / Lasker / Tarrasch, public domain) — the four legacy pillars via
 * assembleFundamentalsAnswer, the newer sections inline below — never
 * LLM-invented, never a claim about a specific board.
 */

// Prose for the sections the legacy 4-pillar `FundamentalsTopic` set does not
// cover. Authored classical principle, house voice (you/they, never we/our), no
// claim about any specific position.
const SECTION_PROSE: Record<string, string> = {
  'opening-play':
    "Every opening is trying to do the same three things: put a piece on a good square with each move, get your king to safety by castling, and fight for the centre. Bring out a new piece every move, don't go pawn-hunting while your pieces are still at home, and don't move the same piece twice when another one hasn't moved at all. Win the race to a finished position and the middlegame is already in your favour.",
  'pawn-structure':
    "Pawns are the only piece that never moves backward, so every pawn move is permanent — it gives up a square forever. Keep your pawns healthy: avoid doubled and isolated pawns when you can, and try to place them on squares the opposite colour of your bishop so it stays free. A passed pawn — one no enemy pawn can stop — is a long-term asset; push it, and it forces the defender to tie down a piece just to hold it back.",
  'tactics-threats':
    "Almost every tactic is a double attack — one move that hits two things at once, so the defender can only save one. Before you commit, run the checklist in order, for both sides: every check, every capture, every threat. And before you trust an attack or a sacrifice, count the attackers against the defenders on the target square — if their defenders arrive first, the combination doesn't work.",
  'endgame-technique':
    "In the endgame your king stops hiding and becomes a fighting piece — march it toward the centre and the pawns. Rooks belong behind passed pawns and on the seventh rank, never sitting passive in front of a pawn. And when the kings face off in a pawn ending, whoever is forced to move first gives ground — that is the opposition, and it decides who queens.",
};

type DrillTarget =
  | { kind: 'themes'; themes: string[] }   // a themed Lichess-puzzle drill
  | { kind: 'mistakes' };                  // the student's own flagged positions

interface Section {
  id: string;
  title: string;
  blurb: string;
  icon: ReactNode;
  bgClass: string;
  borderClass: string;
  textClass: string;
  /** Legacy pillar whose grounded prose this section reads; else SECTION_PROSE[id]. */
  topic?: Exclude<FundamentalsTopic, 'general'>;
  drill: DrillTarget;
}

const SECTIONS: Section[] = [
  { id: 'opening-play', title: 'Opening play', blurb: 'Develop, castle, and fight for the centre — win the race to a finished position.', icon: <Compass size={26} />, bgClass: 'bg-sky-500/10', borderClass: 'border-sky-500/30', textClass: 'text-sky-400', drill: { kind: 'mistakes' } },
  { id: 'center', title: 'The centre', blurb: "Control the four central squares — classically or hypermodern — and your pieces reach everywhere.", icon: <Crosshair size={26} />, bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', textClass: 'text-emerald-400', topic: 'center', drill: { kind: 'mistakes' } },
  { id: 'development', title: 'Development & activity', blurb: 'A new piece every move; put your worst piece to work before you start anything.', icon: <Rocket size={26} />, bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30', textClass: 'text-cyan-400', topic: 'development', drill: { kind: 'mistakes' } },
  { id: 'king-safety', title: 'King safety', blurb: "Castle early, and don't push the pawns in front of your king without a reason.", icon: <Shield size={26} />, bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/30', textClass: 'text-rose-400', topic: 'king-safety', drill: { kind: 'mistakes' } },
  { id: 'pawn-structure', title: 'Pawn structure', blurb: 'Pawns never move back — keep them healthy, and push your passed pawns.', icon: <Layers size={26} />, bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', textClass: 'text-amber-400', drill: { kind: 'themes', themes: ['passedPawn', 'advancedPawn', 'promotion'] } },
  { id: 'tactics-threats', title: 'Tactics & threats', blurb: 'Checks, captures, threats — the double attack is behind almost every tactic.', icon: <Swords size={26} />, bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/30', textClass: 'text-violet-400', drill: { kind: 'themes', themes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'backRankMate'] } },
  { id: 'endgame-technique', title: 'Endgame technique', blurb: 'Active king, rook behind the passer, and the opposition in pawn endings.', icon: <Crown size={26} />, bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/30', textClass: 'text-indigo-400', drill: { kind: 'themes', themes: ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame'] } },
];

function proseFor(section: Section): string {
  if (section.topic) return assembleFundamentalsAnswer(section.topic)?.facts ?? '';
  return SECTION_PROSE[section.id] ?? '';
}

export function FundamentalsPage(): JSX.Element {
  const navigate = useNavigate();

  // One ProseUnit per section — read aloud one at a time (the sanctioned
  // read-aloud path; bypasses verbosity per G5).
  const units: ProseUnit[] = SECTIONS.map((s) => ({ id: s.id, text: proseFor(s) }));
  const reader = useProseReader(units);

  const startDrill = (section: Section): void => {
    if (section.drill.kind === 'themes') {
      void navigate('/tactics/drill', { state: { filterThemes: section.drill.themes } });
    } else {
      void navigate('/tactics/mistakes');
    }
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
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
              { label: 'Seven ideas', body: 'The whole game rests on seven ideas — from the opening to the endgame. Each one is a section here.' },
              { label: 'Hear it', body: 'Tap Listen on any section to have the coach read the principle aloud.' },
              { label: 'Drill it', body: 'Tap Drill to practise it — a themed puzzle set where one fits, or your own flagged positions from real games.' },
            ]}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar placeholder="Search openings, games, puzzles..." />
      </div>

      <p className="text-sm text-center max-w-lg mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        The seven ideas every strong move rests on. Listen to one, then drill it.
      </p>

      <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
        {SECTIONS.map((s) => {
          const reviewId = s.topic ? (assembleFundamentalsAnswer(s.topic)?.exampleReviewId ?? null) : null;
          const reading = reader.currentId === s.id && reader.isPlaying;
          return (
            <div
              key={s.id}
              className={`rounded-2xl border-2 ${s.bgClass} ${s.borderClass} p-4 flex flex-col gap-3`}
              data-testid={`fundamental-section-${s.id}`}
            >
              <div className="flex items-center gap-2">
                <span className={s.textClass}>{s.icon}</span>
                <h2 className={`text-base font-bold ${s.textClass}`}>{s.title}</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                {proseFor(s)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => (reading ? reader.stop() : reader.playOne(s.id))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${s.borderClass} ${s.textClass} hover:opacity-80 transition-opacity`}
                  data-testid={`fundamental-listen-${s.id}`}
                >
                  {reading ? <Square size={14} /> : <Play size={14} />}
                  {reading ? 'Stop' : 'Listen'}
                </button>
                <button
                  type="button"
                  onClick={() => startDrill(s)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${s.bgClass} border ${s.borderClass} ${s.textClass} hover:opacity-80 transition-opacity`}
                  data-testid={`fundamental-drill-${s.id}`}
                >
                  <Target size={14} />
                  {s.drill.kind === 'themes' ? 'Drill puzzles' : 'Drill my mistakes'}
                </button>
                {reviewId && (
                  <button
                    type="button"
                    onClick={() => { void navigate(`/coach/review/${reviewId}`); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${s.borderClass} ${s.textClass} hover:opacity-80 transition-opacity`}
                    data-testid={`fundamental-walk-${s.id}`}
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
