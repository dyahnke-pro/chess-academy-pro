/**
 * useMissionRunner — applies the mission state machine's effects on a Learn
 * board (WO-MISSIONS-01). All decisions are `stepMission`'s; this hook only
 * carries them out through the surface's own hands, and logs each one so a
 * mission can be audited from its decisions, not only from its prose.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { logAppAudit } from '../services/appAuditor';
import { IDLE, missionDials, missionOwnsGame, stepMission, type RunnerEffect, type RunnerEvent, type RunnerState } from './missionRunner';
import type { CoachDials, MissionCard, MissionGame, MissionOutcome, MissReason, ShownMove } from './missionCard';

export interface MissionRunnerHands {
  /** Speak a mission line (and show it in the chat). */
  say: (text: string, line: 'announce' | 'miss' | 'pass') => void;
  /** Fire the reward layer: the full celebration, or the smaller retry one. */
  celebrate: (firstTry: boolean) => void;
  /** Write the result row. */
  record: (card: MissionCard, r: { outcome: MissionOutcome; missPly?: number; reason?: MissReason }) => void;
  /** Take back the student's last move (only theirs — the coach has not replied). */
  undo: () => void;
  /** Draw the move a second miss shows. */
  show: (move: ShownMove) => void;
  /** Let the coach reply to the move the student played on from. */
  replyToHeldMove: () => void;
}

export interface MissionRunner {
  /** What the banner draws. */
  view: RunnerState;
  start: (card: MissionCard) => void;
  stop: () => void;
  /** A student move, before the coach replies: 'hold' means the rewind is up
   *  and the coach waits. */
  moved: (game: Omit<MissionGame, 'forgiven'>, fenBefore: string, candidatesUci: readonly string[]) => 'reply' | 'hold';
  tryAgain: () => void;
  playOn: () => void;
  rewind: (plies: number) => void;
  /** Does a mission own this game's voice (see `missionOwnsGame`)? */
  ownsGame: () => boolean;
  /** The dials the coach plays under now, or null. */
  dials: () => CoachDials | null;
  /** A mission is live or waiting on its rewind. */
  holding: () => boolean;
}

export function useMissionRunner(hands: MissionRunnerHands): MissionRunner {
  const stateRef = useRef<RunnerState>(IDLE);
  const [view, setView] = useState<RunnerState>(IDLE);
  const handsRef = useRef(hands);
  handsRef.current = hands;

  const dispatch = useCallback((event: RunnerEvent, opts: { replyIsInline: boolean }): RunnerEffect[] => {
    const before = stateRef.current;
    const { state, effects } = stepMission(before, event);
    stateRef.current = state;
    setView(state);
    const card = state.card ?? before.card;
    if (card && event.kind !== 'stop' && event.kind !== 'rewind') {
      void logAppAudit({
        kind: event.kind === 'start' ? 'mission-started' : event.kind === 'moved' ? 'mission-checked' : 'mission-answered',
        category: 'subsystem',
        source: 'useMissionRunner',
        summary: `${card.id} ${event.kind}: ${before.phase} → ${state.phase}${state.outcome ? ` (${state.outcome})` : ''} — ${effects.map((e) => e.kind).join(',')}`,
        details: JSON.stringify({ mission: card.id, event: event.kind, from: before.phase, to: state.phase, outcome: state.outcome, pause: state.pause, progress: state.progress, effects }),
      });
    }
    const h = handsRef.current;
    for (const e of effects) {
      switch (e.kind) {
        case 'say': h.say(e.text, e.line); break;
        case 'celebrate': h.celebrate(e.firstTry); break;
        case 'record': if (card) h.record(card, { outcome: e.outcome, ...(e.missPly !== undefined ? { missPly: e.missPly } : {}), ...(e.reason ? { reason: e.reason } : {}) }); break;
        case 'undo': h.undo(); break;
        case 'show': h.show(e.move); break;
        case 'reply': if (!opts.replyIsInline) h.replyToHeldMove(); break;
        case 'hold': break;
      }
    }
    return effects;
  }, []);

  const start = useCallback((card: MissionCard) => { dispatch({ kind: 'start', card }, { replyIsInline: true }); }, [dispatch]);
  const stop = useCallback(() => { dispatch({ kind: 'stop' }, { replyIsInline: true }); }, [dispatch]);
  const moved = useCallback((game: Omit<MissionGame, 'forgiven'>, fenBefore: string, candidatesUci: readonly string[]): 'reply' | 'hold' => {
    const effects = dispatch({ kind: 'moved', game, fenBefore, candidatesUci }, { replyIsInline: true });
    return effects.some((e) => e.kind === 'hold') ? 'hold' : 'reply';
  }, [dispatch]);
  const tryAgain = useCallback(() => { dispatch({ kind: 'try-again' }, { replyIsInline: false }); }, [dispatch]);
  const playOn = useCallback(() => { dispatch({ kind: 'play-on' }, { replyIsInline: false }); }, [dispatch]);
  const rewind = useCallback((plies: number) => { dispatch({ kind: 'rewind', plies }, { replyIsInline: true }); }, [dispatch]);
  const ownsGame = useCallback(() => missionOwnsGame(stateRef.current), []);
  const dials = useCallback(() => missionDials(stateRef.current), []);
  const holding = useCallback(() => stateRef.current.phase === 'live' || stateRef.current.phase === 'paused', []);

  return useMemo(() => ({ view, start, stop, moved, tryAgain, playOn, rewind, ownsGame, dials, holding }),
    [view, start, stop, moved, tryAgain, playOn, rewind, ownsGame, dials, holding]);
}
