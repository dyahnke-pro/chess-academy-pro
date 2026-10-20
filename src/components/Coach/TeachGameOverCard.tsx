// THE GAME IS OVER AND THE BOARD IS STILL THERE.
//
// 🔒 THE NINETY-ONE SECONDS OF BLACK SCREEN (David 2026-08-11: "Screen went
// black with checkmate (didn't show the final move) I want the board to persist
// and an option to review to pop up instead of transitioning to black without
// showing the final move.").
//
// Learn used to call `navigate('/coach/review/…')` from an effect the instant
// `isGameOver` flipped. He never saw the mating move land, and then sat on an
// empty screen for a minute and a half while the review ran its Stockfish pass
// — measured on his own game: mate at 20:39:22, review usable at 20:40:53.
//
// The record is still written the moment the game ends, so nothing is lost.
// What changed is that LEAVING is a tap rather than a consequence: the mating
// move stays on the squares behind this card until he chooses to go.
//
// WHY THIS IS ITS OWN FILE. It shipped once with no proof and the same class of
// bug — a lane that looked wired and reached nobody — cost two rounds elsewhere
// in the same session. Ending a real game on demand is not reachable from the
// audit container (the headless Stockfish worker thrashes, so games stall out
// around ply 21), so the only way to hold this to a behavioural test rather
// than a source-grep is to make it a component small enough to render on its
// own. See `TeachGameOverCard.test.tsx`.
import { ChevronRight } from 'lucide-react';

/** `ended` = the student pressed End Lesson with a game in progress. The
 *  game is SAVED (result `*`, nobody lost) and the review offered exactly as
 *  after a mate — the board stays, leaving is a tap (C7, 2026-09-22). */
import { motion } from 'framer-motion';
import { RollingNumber } from '../ui/RollingNumber';
import type { LearnTally } from '../../services/learnReward';
import { useState } from 'react';
import { FirstRunContinue } from '../FirstRun/FirstRunContinue';
import { useFirstRunStep } from '../FirstRun/useFirstRunStep';

/** One skill's net move this game (`useLearnRecordWatch`, summed). */
export interface SkillRecapRow { label: string; delta: number; level: number; levelChange: -1 | 0 | 1 }

export type TeachGameResult = 'win' | 'loss' | 'draw' | 'ended';

interface TeachGameOverCardProps {
  result: TeachGameResult;
  /** Checkmate rather than resignation / flag / agreement. Only changes the
   *  wording — a mate is worth naming, a draw is a draw. */
  byMate: boolean;
  /** Tapped "Review this game". The ONLY route off this screen. */
  onReview: () => void;
  /** Tapped "Stay here" — dismisses the card and leaves the board. */
  onStay: () => void;
  /** The game's reward tally — the recap medals. Absent or empty = no row. */
  tally?: LearnTally;
  /** Each skill that moved this game. Absent or empty = no row. */
  skills?: readonly SkillRecapRow[];
}

/** The skills that moved this game, gold up and red down, with fireworks for
 *  a level gained (David 2026-10-18: "Fireworks at the end leveling up").
 *  Every animation on the card ends inside 10 seconds, and a tap ends it now
 *  (David: "That cannot take longer than 10 seconds … Yes tap to skip"). */
function SkillRecap({ skills, skipped }: { skills: readonly SkillRecapRow[]; skipped: boolean }): JSX.Element | null {
  if (skills.length === 0) return null;
  const ups = skills.filter((s) => s.levelChange === 1);
  return (
    <div className="relative space-y-1.5" data-testid="teach-recap-skills">
      {ups.length > 0 && (
        <div className="relative overflow-hidden rounded-lg border border-amber-300/60 bg-amber-400/10 px-3 py-2 text-center" data-testid="teach-recap-levelup">
          {!skipped && Array.from({ length: 14 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-amber-300"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos((i / 14) * 2 * Math.PI) * 90, y: Math.sin((i / 14) * 2 * Math.PI) * 40, opacity: 0 }}
              transition={{ duration: 1.1, repeat: 2, ease: 'easeOut' }}
              aria-hidden
            />
          ))}
          <div className="text-sm font-black uppercase tracking-wide text-amber-200">
            {ups.map((u) => `${u.label} Level ${u.level}`).join(' · ')}
          </div>
        </div>
      )}
      {skills.map((s) => (
        <div key={s.label} className="flex items-center justify-between px-1 text-xs" data-testid="teach-recap-skill">
          <span className="text-theme-text">{s.label} · Lv {s.level}</span>
          <span className={`font-mono tabular-nums ${s.delta >= 0 ? 'text-amber-200' : 'text-rose-300'}`}>
            {s.delta >= 0 ? '+' : '−'}{Math.max(1, Math.round(Math.abs(s.delta)))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The recap medals (David 2026-10-01): each counts up; only earned ones show. */
function Medals({ tally }: { tally: LearnTally }): JSX.Element | null {
  const medals: { key: string; label: string; value: number; of?: number }[] = [
    { key: 'found', label: 'Decisions found', value: tally.found, of: tally.posed },
    { key: 'streak', label: 'Best streak', value: tally.bestStreak },
    { key: 'saved', label: 'Threats parried', value: tally.saved },
    { key: 'punished', label: 'Punished', value: tally.punished },
    { key: 'gems', label: 'Gems', value: tally.gems },
    { key: 'proven', label: 'Fixed', value: tally.proven },
  ].filter((m) => m.value > 0);
  if (medals.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="teach-recap-medals">
      {medals.map((m) => (
        <div
          key={m.key}
          className="flex flex-col items-center rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-2 py-1.5 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
          data-testid={`medal-${m.key}`}
        >
          <span className="font-mono text-lg font-black tabular-nums text-cyan-100">
            <RollingNumber value={m.value} />{m.of !== undefined ? `/${m.of}` : ''}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function headline(result: TeachGameResult, byMate: boolean): string {
  if (result === 'win') return byMate ? 'Checkmate — you win.' : 'You win.';
  if (result === 'loss') return byMate ? "Checkmate — that's the game." : "That's the game.";
  if (result === 'ended') return 'Lesson ended — the game is saved.';
  return "That's a draw.";
}

export function TeachGameOverCard({ result, byMate, onReview, onStay, tally, skills }: TeachGameOverCardProps): JSX.Element {
  const [skipped, setSkipped] = useState(false);
  // THE FIRST GAME ENDS ON CONTINUE (David 2026-10-18): the recap is read at the
  // student's pace, then Continue leads to bringing in their games. Review stays
  // as the second choice. Every later game keeps Review / Stay.
  const firstRun = useFirstRunStep() === 'learn';
  return (
    <div className="px-3 pb-2 space-y-2" data-testid="teach-game-over" onPointerDown={() => setSkipped(true)}>
      <div className="text-sm font-semibold text-theme-text px-1">{headline(result, byMate)}</div>
      <div className="text-xs text-theme-text-muted px-1">
        The final position is on the board. Take a look before you move on.
      </div>
      {tally && <Medals tally={tally} />}
      {skills && <SkillRecap skills={skills} skipped={skipped} />}
      <div className="flex items-center gap-2">
        {firstRun && <FirstRunContinue />}
        <button
          onClick={onReview}
          className={firstRun
            ? 'px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors'
            : 'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[44px] transition-colors'}
          data-testid="teach-review-game"
        >
          {!firstRun && <ChevronRight size={16} />}
          Review this game
        </button>
        {!firstRun && (
          <button
            onClick={onStay}
            className="px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
            data-testid="teach-stay-on-board"
          >
            Stay here
          </button>
        )}
      </div>
    </div>
  );
}
