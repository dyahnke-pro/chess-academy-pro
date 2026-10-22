/**
 * useFocusRunner — applies the focus state machine's effects on the Learn
 * board (WO-LEARN-FOCUS-01). Every decision is `stepFocus`'s; this hook only
 * carries them out through the page's own hands, and emits the two algo rows
 * (`learn-focus-chosen`, `learn-focus-turn`) so a focus game can be audited
 * from its decisions, not only from its prose.
 *
 * The focus owns its RECORD here, not the page: the pick read off the user's
 * record, every answer filed on the lane-evidence door, the deciding miss and
 * the game's result row. The page lends only what it alone knows — the game's
 * id and the engine's best move — so a surface never writes the focus record
 * by hand.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Color } from 'chess.js';
import { logAppAudit } from '../../services/appAuditor';
import { FOCUS_IDLE, focusOwnsGame, stepFocus, type FocusEffect, type FocusEvent, type FocusResult, type FocusRunState, type SayLine } from './focusRunner';
import type { FocusMove, ReadLine } from './focusChances';
import type { RewardKind } from '../../services/rewardEvents';
import { pickFocus, type FocusPick } from './focusPicker';
import type { FocusId } from './focusCard';
import type { MotifLevel } from '../../data/tacticMotifs';
import { loadFocusPickInput, recordDecidingMiss, recordFocusAnswer, writeLearnFocusResult } from '../../services/learnFocusRecord';

export interface FocusRunnerHands {
  say: (text: string, line: SayLine) => void;
  /** File the ply in `promptedPlies` (a question was asked, or the focus is revealed). */
  prompt: (ply: number) => void;
  /** File the ply in `steeredPlies`. */
  steered: (ply: number) => void;
  /** The id of the game being played (the record's join key). */
  gameId: () => string | null;
  /** The engine's best move on this board, when the page holds a read of it. */
  bestUciAt: (fen: string) => string | null;
  /** Take back the user's last move (only theirs — the coach has not replied). */
  undo: () => void;
  /** Draw the answer from the board before the miss. */
  show: (uci: string, fen: string) => void;
  /** Let the coach reply to the move that stands. */
  replyToHeldMove: (punish: boolean) => void;
  /** The game ended: the end line (the result row is written here). */
  end: (text: string) => void;
  /** Pay a focus find (coins + burst), or break the streak on a taught miss
   *  (`null`) — the page's reward layer, which in a focus game rewards
   *  nothing else (checkmate aside). */
  reward: (reward: RewardKind | null, square: string | null, ply: number) => void;
}

export interface FocusView {
  focus: FocusId | null;
  announced: boolean;
  paused: null | { deciding: boolean };
}

export interface FocusRunner {
  view: FocusView;
  /** Pick this game's focus from the user's record (never a rating). */
  pick: () => Promise<FocusPick>;
  start: (pick: FocusPick) => void;
  stop: () => void;
  board: (b: { fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean }) => void;
  read: (fen: string, lines: readonly ReadLine[]) => void;
  /** A user move, before the coach replies: 'hold' — the miss is being taught
   *  and the coach waits; 'reply' — go on (`punish`: a focus miss stands). */
  moved: (move: FocusMove) => { verdict: 'hold' | 'reply'; punish: boolean };
  tryAgain: () => void;
  playOn: () => void;
  gameOver: () => void;
  ownsGame: () => boolean;
  focusId: () => FocusId | null;
  /** The student's open motif levels this game (`FocusPick.levels`), for the
   *  coach's steering; empty off a focus game. */
  levels: () => readonly MotifLevel[];
  /** The runner is waiting on Try again / Play on. */
  paused: () => boolean;
}

const viewOf = (s: FocusRunState): FocusView => ({
  focus: s.pick?.focus ?? null,
  announced: s.announced,
  paused: s.pause && s.pause.retries === 0 ? { deciding: s.pause.chance === null } : null,
});

export function useFocusRunner(hands: FocusRunnerHands): FocusRunner {
  const stateRef = useRef<FocusRunState>(FOCUS_IDLE);
  const [view, setView] = useState<FocusView>(viewOf(FOCUS_IDLE));
  const handsRef = useRef(hands);
  handsRef.current = hands;

  const writeResult = useCallback((result: FocusResult, state: FocusRunState) => {
    const pick = state.pick;
    if (!pick) return;
    void writeLearnFocusResult({
      gameId: handsRef.current.gameId() ?? `learn-${Date.now()}`, focus: result.focus, mode: result.mode, state: pick.state,
      announced: result.announced, revealed: result.revealed, tally: result.tally, at: Date.now(),
    });
  }, []);

  const dispatch = useCallback((event: FocusEvent, opts: { replyIsInline: boolean }): FocusEffect[] => {
    const before = stateRef.current;
    const { state, effects } = stepFocus(before, event);
    stateRef.current = state;
    setView(viewOf(state));
    const h = handsRef.current;
    for (const e of effects) {
      switch (e.kind) {
        case 'say': h.say(e.text, e.line); break;
        case 'prompt': h.prompt(e.ply); break;
        case 'steered': h.steered(e.ply); break;
        case 'record':
          recordFocusAnswer({ tag: e.chance.tag, outcome: e.outcome, fen: e.fen, san: e.san, prompted: e.prompted, steered: e.steered, takenBack: e.takenBack, gameId: h.gameId() });
          break;
        case 'record-deciding':
          recordDecidingMiss({ fen: e.fen, san: e.san, bestUci: h.bestUciAt(e.fen), gameId: h.gameId() });
          break;
        case 'hold': break;
        case 'reward': h.reward(e.reward, e.square, e.ply); break;
        case 'undo': h.undo(); break;
        case 'show': h.show(e.uci, e.fen); break;
        case 'reply': if (!opts.replyIsInline) h.replyToHeldMove(e.punish); break;
        case 'turn':
          void logAppAudit({
            kind: 'learn-focus-turn',
            category: 'subsystem',
            source: 'useFocusRunner',
            summary: `${e.row.focus} ${e.row.seat}/${e.row.kind} ply ${e.row.ply}: ${e.row.outcome} — spoke ${e.row.spoke}${e.row.prompted ? ' (prompted)' : ''}${e.row.steered ? ' (steered)' : ''}${e.row.retry ? ' (retry)' : ''}${e.row.reward ? ` — paid ${e.row.reward}` : ''}`,
            details: JSON.stringify(e.row),
          });
          break;
        case 'end':
          writeResult(e.result, state.pick ? state : before);
          h.end(e.text);
          break;
      }
    }
    return effects;
  }, [writeResult]);

  const pick = useCallback(async (): Promise<FocusPick> => pickFocus(await loadFocusPickInput()), []);
  const start = useCallback((pick: FocusPick) => {
    void logAppAudit({
      kind: 'learn-focus-chosen',
      category: 'subsystem',
      source: 'useFocusRunner',
      summary: `${pick.focus} (${pick.state}, ${pick.mode}) — ${pick.reason}; defend ${pick.seatStates.defend}, exploit ${pick.seatStates.exploit}; levels ${pick.levels.join('+')}; ${pick.announced ? 'named' : 'unannounced'}`,
      details: JSON.stringify(pick),
    });
    dispatch({ kind: 'start', pick }, { replyIsInline: true });
  }, [dispatch]);
  const stop = useCallback(() => { dispatch({ kind: 'stop' }, { replyIsInline: true }); }, [dispatch]);
  const board = useCallback((b: { fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean }) => {
    dispatch({ kind: 'board', ...b }, { replyIsInline: true });
  }, [dispatch]);
  const read = useCallback((fen: string, lines: readonly ReadLine[]) => { dispatch({ kind: 'read', fen, lines }, { replyIsInline: true }); }, [dispatch]);
  const moved = useCallback((move: FocusMove): { verdict: 'hold' | 'reply'; punish: boolean } => {
    const effects = dispatch({ kind: 'moved', move }, { replyIsInline: true });
    if (effects.some((e) => e.kind === 'hold')) return { verdict: 'hold', punish: false };
    const reply = effects.find((e): e is Extract<FocusEffect, { kind: 'reply' }> => e.kind === 'reply');
    return { verdict: 'reply', punish: !!reply?.punish };
  }, [dispatch]);
  const tryAgain = useCallback(() => { dispatch({ kind: 'try-again' }, { replyIsInline: false }); }, [dispatch]);
  const playOn = useCallback(() => { dispatch({ kind: 'play-on' }, { replyIsInline: false }); }, [dispatch]);
  const gameOver = useCallback(() => { dispatch({ kind: 'game-over' }, { replyIsInline: true }); }, [dispatch]);
  const ownsGame = useCallback(() => focusOwnsGame(stateRef.current), []);
  const focusId = useCallback(() => stateRef.current.pick?.focus ?? null, []);
  const levels = useCallback((): readonly MotifLevel[] => stateRef.current.pick?.levels ?? [], []);
  const paused = useCallback(() => !!stateRef.current.pause && stateRef.current.pause.retries === 0, []);

  return useMemo(() => ({ view, pick, start, stop, board, read, moved, tryAgain, playOn, gameOver, ownsGame, focusId, levels, paused }),
    [view, pick, start, stop, board, read, moved, tryAgain, playOn, gameOver, ownsGame, focusId, levels, paused]);
}
