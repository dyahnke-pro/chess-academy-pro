/**
 * useMissionRunner — applies the mission state machine's effects on a Learn
 * board (WO-MISSIONS-01). All decisions are `stepMission`'s; this hook only
 * carries them out through the surface's own hands, and logs each one so a
 * mission can be audited from its decisions, not only from its prose.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { logAppAudit } from '../services/appAuditor';
import { IDLE, lineReply, liveCard, missionDials, missionOwnsGame, plantArmed, runnerReadsMoves, stepMission, type RunnerEffect, type RunnerEvent, type RunnerState } from './missionRunner';
import type { CoachDials, MissionCard, MissionGame, MissionOutcome, MissionPhase, MissReason, PlantedShot, PlantScan, ScenarioId, ShownMove } from './missionCard';

export interface MissionRunnerHands {
  /** Speak a mission line (and show it in the chat). */
  say: (text: string, line: 'announce' | 'miss' | 'pass') => void;
  /** Fire the reward layer: the full celebration, or the smaller retry one. */
  celebrate: (firstTry: boolean) => void;
  /** The card's target was just won (`found`): pay the find now, under its label. */
  found: (card: MissionCard) => void;
  /** Write the result row. */
  record: (card: MissionCard, r: { outcome: MissionOutcome; missPly?: number; reason?: MissReason; plantFound?: boolean; scenario?: boolean; watcher?: boolean }) => void;
  /** A card with a briefing is about to go live (the Campaign UI shows it). */
  briefing: (card: MissionCard) => void;
  /** Put a scenario's curated position on the board, then call
   *  `scenarioLoaded(fen)`. */
  loadPosition: (scenarioId: ScenarioId, card: MissionCard) => void;
  /** The game ended: every phase's result. */
  recap: (results: Partial<Record<MissionPhase, MissionOutcome>>) => void;
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
  /** A new game: at most one card per phase, plus the silent watchers. */
  /** `owned`: a boss game — silent even with no card and no watcher. */
  start: (cards: readonly MissionCard[], watchers?: readonly MissionCard[], owned?: boolean) => void;
  stop: () => void;
  /** A student move, before the coach replies: 'hold' — the rewind is up and
   *  the coach waits; 'board-replaced' — a scenario phase is loading a new
   *  position, so the coach does not answer this move. */
  moved: (game: Pick<MissionGame, 'sans' | 'studentColor'>, fenBefore: string, candidatesUci: readonly string[]) => 'reply' | 'hold' | 'board-replaced';
  /** The board entered `phase`; `ply` is its first ply. */
  phaseBoundary: (phase: MissionPhase, ply: number) => void;
  /** A scenario's position is on the board (plies count from it). */
  scenarioLoaded: (fen: string) => void;
  /** The card being played now, or none. */
  liveCard: () => MissionCard | null;
  /** The coach's reply landed at `ply` — with its slip's winning line (§6a),
   *  or why it found none. */
  coachMoved: (ply: number, plant?: { planted?: PlantedShot; scan?: PlantScan }) => void;
  /** May the coach play its slip with its move at `ply`? */
  plantArmed: (ply: number) => boolean;
  /** The coach's next move along the slip's line while the student is on it
   *  (`missionRunner.lineReply`); `sans` is the game so far. */
  lineReply: (sans: readonly string[]) => string | null;
  /** The game ended: a card still unresolved closes `incomplete`. */
  gameOver: () => void;
  tryAgain: () => void;
  playOn: () => void;
  rewind: (plies: number) => void;
  /** Does a mission own this game's voice (see `missionOwnsGame`)? */
  ownsGame: () => boolean;
  /** The dials the coach plays under now, or null. */
  dials: () => CoachDials | null;
  /** The runner reads the student's moves now: a card is live, waiting on
   *  its rewind, or a phase is watched in silence. */
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
    const card = before.card ?? state.card ?? (state.watchers.length > 0 ? state.watchers[0] : null);
    // The coach's own moves are logged only when they change something (a
    // plant, the window closing) — not every reply.
    const quietCoachMove = event.kind === 'coach-moved' && effects.length === 0 && state.context === before.context;
    // A resolving card hands the game on: its outcome is on its record row.
    const handedOn = !!before.card && state.card !== before.card && event.kind !== 'start';
    const outcome = effects.find((e): e is Extract<RunnerEffect, { kind: 'record' }> => e.kind === 'record')?.outcome ?? state.outcome;
    if (card && event.kind !== 'stop' && event.kind !== 'rewind' && !quietCoachMove) {
      void logAppAudit({
        kind: event.kind === 'start' ? 'mission-started' : event.kind === 'moved' || event.kind === 'coach-moved' ? 'mission-checked' : 'mission-answered',
        category: 'subsystem',
        source: 'useMissionRunner',
        summary: `${card.id} ${event.kind}: ${before.phase} → ${handedOn ? `${state.card?.id ?? ''} live` : state.phase}${outcome ? ` (${outcome})` : ''} — ${effects.map((e) => e.kind).join(',')}`,
        details: JSON.stringify({ mission: card.id, event: event.kind, from: before.phase, to: state.phase, outcome, next: handedOn ? state.card?.id : undefined, pause: state.pause, progress: state.progress, planted: state.context.planted, effects: effects.map((e) => ('card' in e ? { ...e, card: e.card.id } : e)) }),
      });
    }
    const h = handsRef.current;
    for (const e of effects) {
      switch (e.kind) {
        case 'say': h.say(e.text, e.line); break;
        case 'celebrate': h.celebrate(e.firstTry); break;
        case 'found': h.found(e.card); break;
        case 'record': h.record(e.card, {
          outcome: e.outcome,
          ...(e.missPly !== undefined ? { missPly: e.missPly } : {}),
          ...(e.reason ? { reason: e.reason } : {}),
          ...(e.plantFound !== undefined ? { plantFound: e.plantFound } : {}),
          ...(e.scenario !== undefined ? { scenario: e.scenario } : {}),
          ...(e.watcher ? { watcher: true } : {}),
        }); break;
        case 'briefing': h.briefing(e.card); break;
        case 'load-position': h.loadPosition(e.scenarioId, e.card); break;
        case 'recap': h.recap(e.results); break;
        case 'plant-none':
          void logAppAudit({
            kind: 'mission-plant-none',
            category: 'subsystem',
            source: 'useMissionRunner',
            summary: `${e.card.id}: the card closed with no free piece planted — ${Object.entries(e.reasons).map(([r, n]) => `${r}=${n}`).join(' ') || 'no scan'}`,
            details: JSON.stringify({ mission: e.card.id, reasons: e.reasons }),
          });
          break;
        case 'undo': h.undo(); break;
        case 'show': h.show(e.move); break;
        case 'reply': if (!opts.replyIsInline) h.replyToHeldMove(); break;
        case 'hold': break;
      }
    }
    return effects;
  }, []);

  const start = useCallback((cards: readonly MissionCard[], watchers?: readonly MissionCard[], owned?: boolean) => {
    dispatch({ kind: 'start', cards, ...(watchers ? { watchers } : {}), ...(owned ? { owned } : {}) }, { replyIsInline: true });
  }, [dispatch]);
  const stop = useCallback(() => { dispatch({ kind: 'stop' }, { replyIsInline: true }); }, [dispatch]);
  const moved = useCallback((game: Pick<MissionGame, 'sans' | 'studentColor'>, fenBefore: string, candidatesUci: readonly string[]): 'reply' | 'hold' | 'board-replaced' => {
    const effects = dispatch({ kind: 'moved', game, fenBefore, candidatesUci }, { replyIsInline: true });
    if (effects.some((e) => e.kind === 'hold')) return 'hold';
    return effects.some((e) => e.kind === 'load-position') ? 'board-replaced' : 'reply';
  }, [dispatch]);
  const phaseBoundary = useCallback((phase: MissionPhase, ply: number) => { dispatch({ kind: 'phase-boundary', phase, ply }, { replyIsInline: true }); }, [dispatch]);
  const scenarioLoaded = useCallback((fen: string) => { dispatch({ kind: 'scenario-loaded', fen }, { replyIsInline: true }); }, [dispatch]);
  const currentCard = useCallback(() => liveCard(stateRef.current), []);
  const tryAgain = useCallback(() => { dispatch({ kind: 'try-again' }, { replyIsInline: false }); }, [dispatch]);
  const playOn = useCallback(() => { dispatch({ kind: 'play-on' }, { replyIsInline: false }); }, [dispatch]);
  const rewind = useCallback((plies: number) => { dispatch({ kind: 'rewind', plies }, { replyIsInline: true }); }, [dispatch]);
  const coachMoved = useCallback((ply: number, plant?: { planted?: PlantedShot; scan?: PlantScan }) => {
    dispatch({ kind: 'coach-moved', ply, ...(plant?.planted ? { planted: plant.planted } : {}), ...(plant?.scan ? { scan: plant.scan } : {}) }, { replyIsInline: true });
  }, [dispatch]);
  const isPlantArmed = useCallback((ply: number) => plantArmed(stateRef.current, ply), []);
  const nextOnLine = useCallback((sans: readonly string[]) => lineReply(stateRef.current, sans), []);
  const gameOver = useCallback(() => { dispatch({ kind: 'game-over' }, { replyIsInline: true }); }, [dispatch]);
  const ownsGame = useCallback(() => missionOwnsGame(stateRef.current), []);
  const dials = useCallback(() => missionDials(stateRef.current), []);
  const holding = useCallback(() => runnerReadsMoves(stateRef.current), []);

  return useMemo(() => ({
    view, start, stop, moved, coachMoved, plantArmed: isPlantArmed, lineReply: nextOnLine, gameOver, phaseBoundary, scenarioLoaded,
    liveCard: currentCard, tryAgain, playOn, rewind, ownsGame, dials, holding,
  }), [view, start, stop, moved, coachMoved, isPlantArmed, nextOnLine, gameOver, phaseBoundary, scenarioLoaded, currentCard, tryAgain, playOn, rewind, ownsGame, dials, holding]);
}
