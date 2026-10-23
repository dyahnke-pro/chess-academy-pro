/**
 * useFocusRunner — applies the focus state machine's effects on the Learn
 * board (WO-LEARN-FOCUS-01 → WO-FOCUS-TACTICS-01). Every decision is
 * `stepFocus`'s; this hook only carries them out through the page's own
 * hands, and emits the two algo rows (`learn-focus-chosen`,
 * `learn-focus-turn`) so a focus game can be audited from its decisions, not
 * only from its prose.
 *
 * The focus owns its RECORD here, not the page: the setup read off the
 * user's record, every answer filed on the lane-evidence door, the deciding
 * miss and the game's result row. The page lends only what it alone knows —
 * the game's id and the engine's best move — so a surface never writes the
 * focus record by hand.
 */
import { fileTakenBack } from '../../services/takenBackPuzzles';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Color } from 'chess.js';
import { logAppAudit } from '../../services/appAuditor';
import { FOCUS_IDLE, focusOwnsGame, focusPlantAsk, stepFocus, type FocusEffect, type FocusEvent, type FocusResult, type FocusRunState, type PlantedSeat, type SayLine } from './focusRunner';
import type { FocusPlantAsk } from './focusPlant';
import type { CastleProbe } from './castlingWatch';
import type { FocusMove, ReadLine } from './focusChances';
import type { RewardKind } from '../../services/rewardEvents';
import { setUpFocusGame, type FocusSetup } from './focusSetup';
import type { FocusId } from './focusCard';
import { RUNG_TIERS, type TacticsRung } from './focusRung';
import type { MotifLevel } from '../../data/tacticMotifs';
import { loadFocusSetupInput, recordDecidingMiss, recordFocusAnswer, writeLearnFocusResult } from '../../services/learnFocusRecord';

export interface FocusRunnerHands {
  say: (text: string, line: SayLine) => void;
  /** File the ply in `promptedPlies` (a question was asked, or a miss told). */
  prompt: (ply: number) => void;
  /** File the ply in `steeredPlies`. */
  steered: (ply: number) => void;
  /** The id of the game being played (the record's join key). */
  gameId: () => string | null;
  /** The engine's best move on this board, when the page holds a read of it. */
  bestUciAt: (fen: string) => string | null;
  /** Take back the user's last move (only theirs — the coach has not replied). */
  undo: () => void;
  /** "Go back and castle": take back to the board the student's move at
   *  board `ply` is played from. */
  rewind: (ply: number) => void;
  /** Draw the answer from the board before the miss (Show me). */
  show: (uci: string, fen: string) => void;
  /** Let the coach reply to the move that stands. */
  replyToHeldMove: (punish: boolean) => void;
  /** The game ended: the end line, the rung's progress, the recap's list. */
  end: (result: FocusResult & { text: string }) => void;
  /** Pay a focus find (coins + burst), or break the streak on a miss
   *  (`null`) — the page's reward layer, which in a focus game rewards
   *  nothing else (checkmate aside). */
  reward: (reward: RewardKind | null, square: string | null, ply: number, label?: string) => void;
}

export interface FocusView {
  focus: FocusId | null;
  rung: TacticsRung | null;
  /** The board waits on the student: the first decision (Try again / Play
   *  on), or — rung 0, after a second miss — Show me / Play on, or a castling
   *  STOP (Go back and castle / Play on). */
  paused: null | { deciding: boolean; showMe: boolean; castle: number | null };
  /** A costly move is held while the castled what-if is read: the board waits
   *  (no takeback mid-read). */
  probing: boolean;
}

export interface FocusRunner {
  view: FocusView;
  /** Set this game up from the user's record (never a rating). */
  setUp: () => Promise<FocusSetup>;
  start: (setup: FocusSetup) => void;
  stop: () => void;
  board: (b: { fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean; planted: PlantedSeat }) => void;
  read: (fen: string, lines: readonly ReadLine[]) => void;
  /** A user move, before the coach replies: 'hold' — the miss is being taught
   *  and the coach waits; 'reply' — go on (`punish`: a focus miss stands);
   *  'probe' — the castling watch needs the what-if read first: hold the move,
   *  read `probe`'s boards and call `castleRead`. */
  moved: (move: FocusMove) => { verdict: 'hold' | 'reply' | 'probe'; punish: boolean; probe?: CastleProbe };
  /** The castling probe's reads (the student's view, cp; null when a read failed). */
  castleRead: (fenBefore: string, realCp: number | null, whatIfCp: number | null) => void;
  tryAgain: () => void;
  playOn: () => void;
  showMe: () => void;
  gameOver: () => void;
  ownsGame: () => boolean;
  focusId: () => FocusId | null;
  /** The student's open motif levels this game, for the coach's steering;
   *  empty off a focus game. */
  levels: () => readonly MotifLevel[];
  /** The runner is waiting on the student's tap. */
  paused: () => boolean;
  /** The game's rung (rung 0 lets the coach play a real opening gem slip). */
  rung: () => TacticsRung | null;
  /** May the coach plant a chance before board `ply`, from board `fen`, and
   *  what pattern (`focusPlant`); null = play its own move. */
  plantAsk: (ply: number, fen: string) => FocusPlantAsk | null;
}

const waiting = (s: FocusRunState): boolean => !!s.pause && s.pause.retries !== 1;

const viewOf = (s: FocusRunState): FocusView => ({
  focus: s.setup?.focus ?? null,
  rung: s.setup?.rung ?? null,
  paused: s.pause && waiting(s) ? { deciding: s.pause.chance === null && !s.pause.castle, showMe: s.pause.retries === 2, castle: s.pause.castle ? s.pause.castleMoves ?? 1 : null } : null,
  probing: !!s.castle.probe,
});

export function useFocusRunner(hands: FocusRunnerHands): FocusRunner {
  const stateRef = useRef<FocusRunState>(FOCUS_IDLE);
  const [view, setView] = useState<FocusView>(viewOf(FOCUS_IDLE));
  const handsRef = useRef(hands);
  handsRef.current = hands;

  const writeResult = useCallback((result: FocusResult) => {
    void writeLearnFocusResult({
      gameId: handsRef.current.gameId() ?? `learn-${Date.now()}`, focus: result.focus, rung: result.rung,
      tally: result.tally, atRung: result.atRung, presented: result.presented, tempoRun: result.tempo.longest, at: Date.now(),
    });
  }, []);

  const dispatch = useCallback((event: FocusEvent, opts: { replyIsInline: boolean }): FocusEffect[] => {
    const { state, effects } = stepFocus(stateRef.current, event);
    stateRef.current = state;
    setView(viewOf(state));
    const h = handsRef.current;
    for (const e of effects) {
      switch (e.kind) {
        case 'say': h.say(e.text, e.line); break;
        case 'prompt': h.prompt(e.ply); break;
        case 'steered': h.steered(e.ply); break;
        case 'record':
          for (const tag of e.chance.setupTag ? [e.chance.tag, e.chance.setupTag] : [e.chance.tag]) {
            recordFocusAnswer({ tag, outcome: e.outcome, fen: e.fen, san: e.san, prompted: e.prompted, steered: e.steered, takenBack: e.takenBack, gameId: h.gameId() });
          }
          break;
        case 'record-deciding':
          recordDecidingMiss({ fen: e.fen, san: e.san, bestUci: h.bestUciAt(e.fen), gameId: h.gameId() });
          break;
        case 'hold': break;
        case 'reward': h.reward(e.reward, e.square, e.ply, e.label); break;
        case 'undo': h.undo(); break;
        case 'taken-back': fileTakenBack(e.fen, e.san, h.gameId()); break;
        case 'rewind': h.rewind(e.ply); break;
        case 'probe': break;
        case 'record-castle':
          // THE KING IN THE MIDDLE COST THE EVAL: one vocabulary — the miss
          // reddens the Weaknesses tile and feeds the drills.
          recordFocusAnswer({ tag: 'king-stuck-center', outcome: 'broken', fen: e.fen, san: e.san, prompted: false, steered: false, takenBack: false, gameId: h.gameId() });
          break;
        case 'castle-row':
          void logAppAudit({
            kind: 'castle-watch',
            category: 'subsystem',
            source: 'useFocusRunner',
            summary: `ply ${e.row.ply}: ${e.row.verdict}${e.row.drop !== null ? ` — cost ${e.row.drop}cp, castled holds ${e.row.gain}cp` : ''}${e.row.verdict === 'stop' ? ` (${e.row.losing ? 'losing' : 'cost'}, ${e.row.attack ? 'attack' : 'quiet'}, rewind ${e.row.rewindPly ?? 'none'})` : ''}`,
            details: JSON.stringify(e.row),
          });
          break;
        case 'show': h.show(e.uci, e.fen); break;
        case 'reply': if (!opts.replyIsInline) h.replyToHeldMove(e.punish); break;
        case 'turn':
          void logAppAudit({
            kind: 'learn-focus-turn',
            category: 'subsystem',
            source: 'useFocusRunner',
            summary: `${e.row.focus} rung ${e.row.rung} ${e.row.seat}/${e.row.kind} (difficulty ${e.row.difficulty}) ply ${e.row.ply}: ${e.row.outcome} — spoke ${e.row.spoke}${e.row.held ? ' (held)' : ''}${e.row.prompted ? ' (prompted)' : ''}${e.row.steered ? ' (steered)' : ''}${e.row.planted ? ' (planted)' : ''}${e.row.retry ? ' (retry)' : ''}${e.row.reward ? ` — paid ${e.row.reward}` : ''}`,
            details: JSON.stringify(e.row),
          });
          break;
        case 'end':
          writeResult(e.result);
          h.end({ ...e.result, text: e.text });
          break;
      }
    }
    return effects;
  }, [writeResult]);

  const setUp = useCallback(async (): Promise<FocusSetup> => setUpFocusGame({ ...(await loadFocusSetupInput()), rand: Math.random }), []);
  const start = useCallback((setup: FocusSetup) => {
    void logAppAudit({
      kind: 'learn-focus-chosen',
      category: 'subsystem',
      source: 'useFocusRunner',
      summary: `${setup.focus} rung ${setup.rung} (${RUNG_TIERS[setup.rung].title}) — ${setup.reason}; window ${setup.window.length} game(s); defend ${setup.seatStates.defend}, exploit ${setup.seatStates.exploit}; levels ${setup.levels.join('+')}; target ply ${setup.targetPly}`,
      details: JSON.stringify(setup),
    });
    dispatch({ kind: 'start', setup }, { replyIsInline: true });
  }, [dispatch]);
  const stop = useCallback(() => { dispatch({ kind: 'stop' }, { replyIsInline: true }); }, [dispatch]);
  const board = useCallback((b: { fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean; planted: PlantedSeat }) => {
    dispatch({ kind: 'board', ...b }, { replyIsInline: true });
  }, [dispatch]);
  const read = useCallback((fen: string, lines: readonly ReadLine[]) => { dispatch({ kind: 'read', fen, lines }, { replyIsInline: true }); }, [dispatch]);
  const moved = useCallback((move: FocusMove): { verdict: 'hold' | 'reply' | 'probe'; punish: boolean; probe?: CastleProbe } => {
    const effects = dispatch({ kind: 'moved', move }, { replyIsInline: true });
    if (effects.some((e) => e.kind === 'hold')) return { verdict: 'hold', punish: false };
    const probe = effects.find((e): e is Extract<FocusEffect, { kind: 'probe' }> => e.kind === 'probe');
    if (probe) return { verdict: 'probe', punish: false, probe: probe.probe };
    const reply = effects.find((e): e is Extract<FocusEffect, { kind: 'reply' }> => e.kind === 'reply');
    return { verdict: 'reply', punish: !!reply?.punish };
  }, [dispatch]);
  const tryAgain = useCallback(() => { dispatch({ kind: 'try-again' }, { replyIsInline: false }); }, [dispatch]);
  const playOn = useCallback(() => { dispatch({ kind: 'play-on' }, { replyIsInline: false }); }, [dispatch]);
  const showMe = useCallback(() => { dispatch({ kind: 'show-me' }, { replyIsInline: false }); }, [dispatch]);
  const castleRead = useCallback((fenBefore: string, realCp: number | null, whatIfCp: number | null) => {
    dispatch({ kind: 'castle-read', fenBefore, realCp, whatIfCp }, { replyIsInline: false });
  }, [dispatch]);
  const gameOver = useCallback(() => { dispatch({ kind: 'game-over', at: Date.now() }, { replyIsInline: true }); }, [dispatch]);
  const ownsGame = useCallback(() => focusOwnsGame(stateRef.current), []);
  const focusId = useCallback(() => stateRef.current.setup?.focus ?? null, []);
  const levels = useCallback((): readonly MotifLevel[] => stateRef.current.setup?.levels ?? [], []);
  const paused = useCallback(() => waiting(stateRef.current), []);
  const rung = useCallback((): TacticsRung | null => stateRef.current.setup?.rung ?? null, []);
  const plantAsk = useCallback((ply: number, fen: string): FocusPlantAsk | null => focusPlantAsk(stateRef.current, ply, fen), []);

  return useMemo(() => ({ view, setUp, start, stop, board, read, moved, castleRead, tryAgain, playOn, showMe, gameOver, ownsGame, focusId, levels, paused, rung, plantAsk }),
    [view, setUp, start, stop, board, read, moved, castleRead, tryAgain, playOn, showMe, gameOver, ownsGame, focusId, levels, paused, rung, plantAsk]);
}
