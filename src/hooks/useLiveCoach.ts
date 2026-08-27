/**
 * useLiveCoach
 * ------------
 * Live-coach interjections during play (WO-LIVE-COACH-01). The coach
 * speaks unprompted at meaningful moments — great moves, missed
 * tactics, opponent blunders, positional eval swings, recoveries.
 *
 * The hook does NOT run Stockfish itself. CoachGamePage's existing
 * per-move analysis pipeline produces eval-before, eval-after, best
 * move, classification, hung-piece detection. The hook receives the
 * relevant fields via two notify functions and runs pure trigger
 * detectors (`liveCoachTriggers.ts`) over them. When any trigger
 * fires, the hook calls the LLM, speaks the response, and appends to
 * the unified coach memory store's `conversationHistory`.
 *
 * Rate limits are intentionally OFF in this WO — the user wanted to
 * see the firehose first, then tune via Coach Settings UI in a future
 * WO. The hook does dedupe per-ply (no double-speak on the same ply
 * for the same trigger).
 */
import { useCallback, useRef } from 'react';
import { groundedMoveFeedback } from '../services/coachApi';
import { buildFedTacticsContext } from '../services/liveTacticsContext';
import { getCachedStockfish } from './stockfishFenCache';
import { applyCandidateArrows } from '../services/coachAnswerGates';
import type { TacticsLiveContext } from '../coach/types';
import { voiceService } from '../services/voiceService';
import { splitSpeakableSentences } from '../utils/sentenceSplit';
import { logAppAudit } from '../services/appAuditor';
import { useAppStore } from '../stores/appStore';
import { computePositionFacts, clauseText } from '../services/positionFacts';
import { stockfishEngine } from '../services/stockfishEngine';
import { alertSensitivityMultiplier } from '../services/skillScaling';
import {
  evaluateOpponentMoveTriggers,
  evaluatePlayerMoveTriggers,
  type PlayerMoveSignal,
  type OpponentMoveSignal,
  type TriggerResult,
} from '../services/liveCoachTriggers';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

export interface UseLiveCoachArgs {
  gameId: string;
  playerColor: 'white' | 'black';
  /** Master switch. This hook VOLUNTEERS speech — it predates the locked
   *  Play contract ("PLAY STAYS SILENT UNTIL THE STUDENT ASKS", David
   *  2026-07-06, re-confirmed 2026-08-16 on hearing it speak), and its
   *  "firehose first, tune later" rate-limit note is from that earlier era.
   *  Play passes false; the trigger machinery stays for surfaces that may
   *  legitimately interject (or a future opt-in setting). Off = the notify
   *  functions are inert: no triggers, no LLM call, no speech, no spend. */
  enabled?: boolean;
}

export interface PlayerMoveNotification {
  ply: number;
  san: string;
  fenAfter: string;
  /** White-perspective centipawn eval before the move. */
  evalBefore: number;
  /** White-perspective centipawn eval after the move. */
  evalAfter: number;
  /** White-perspective centipawn eval of the engine's best move from
   *  the position before this move. Null when no analysis was
   *  available. */
  bestMoveEval: number | null;
  /** SAN of the engine's best move from the pre-move position, used
   *  in the LLM context block for "missed tactic" and "great move"
   *  prompts. */
  bestMoveSan: string | null;
  /** True iff the played move equals the engine's best move. */
  isBestMove: boolean;
  /** True iff the engine's best move was tactical (capture, fork,
   *  pin, mate threat). Derived by the caller from the existing
   *  `tactic-classifier` output. */
  bestMoveWasTactical: boolean;
  /** True iff the played move left a piece hanging — used to
   *  suppress eval-swing-wrong (POLISH-02 blunder alert covers that
   *  case with dedicated prose). */
  hasHangingPiece: boolean;
}

export interface OpponentMoveNotification {
  ply: number;
  san: string;
  fenAfter: string;
  /** White-perspective centipawn evals around the opponent's move. */
  evalBefore: number;
  evalAfter: number;
}

export interface UseLiveCoachResult {
  notifyPlayerMove: (n: PlayerMoveNotification) => void;
  notifyOpponentMove: (n: OpponentMoveNotification) => void;
}

const LIVE_COACH_API_TIMEOUT_MS = 30_000;

/** Convert white-perspective eval into student-perspective. */
function toStudentEval(whitePerspectiveCp: number, color: 'white' | 'black'): number {
  return color === 'white' ? whitePerspectiveCp : -whitePerspectiveCp;
}

function speakStreamed(text: string): void {
  // splitSpeakableSentences, not the old global regex: that regex dies at a
  // decimal, restarts mid-number, and speaks the tail as its own utterance —
  // prod said "4 in their favor." out of "+0.4 in their favor" (run 17,
  // 2026-08-17), the same defect sentenceSplit.ts documents from 2026-08-09.
  const { sentences: split, rest } = splitSpeakableSentences(text);
  const sentences = split.length > 0 ? (rest ? [...split, rest] : split) : [text];
  if (sentences.length === 0) return;
  voiceService.stop();
  let chain: Promise<void> = Promise.resolve();
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    chain = chain
      .then(() => voiceService.speakForced(trimmed))
      .catch(() => undefined);
  }
}

export function useLiveCoach(args: UseLiveCoachArgs): UseLiveCoachResult {
  const { gameId, playerColor } = args;

  // student-perspective eval rolling window, oldest first; used by the
  // recovery detector. Capped at the last 12 plies to keep memory
  // stable.
  const evalHistoryRef = useRef<number[]>([]);
  // Per-ply dedupe so two notifies for the same ply (rare, but
  // possible if React re-renders) don't double-speak.
  const lastSpokenPlyRef = useRef<number>(-1);
  const inFlightRef = useRef<boolean>(false);

  const handleTrigger = useCallback(
    async (
      winner: TriggerResult,
      ctx: {
        ply: number;
        san: string;
        fenAfter: string;
        bestMoveSan: string | null;
        studentEvalBefore: number;
        studentEvalAfter: number;
        worstEval?: number;
        last3Moves?: string[];
      },
    ): Promise<void> => {
      if (inFlightRef.current) return;
      if (lastSpokenPlyRef.current === ctx.ply) return;
      // Store-backed dedup that SURVIVES a remount (David 2026-07-11: the
      // narration re-fire was also spiking DeepSeek). The two refs above are
      // per-component `useRef`s — they RESET when CoachGamePage remounts (an
      // OTA reload / route churn remounts it several times in ~1s), so the
      // same ply's trigger would re-fire `groundedMoveFeedback` → a duplicate
      // `grounded_voice` DeepSeek call. The Zustand conversation history is a
      // module singleton (survives remounts), so a prior live-coach utterance
      // on this exact gameId+ply proves we already spoke here — skip the call.
      const spokeThisPly = useCoachMemoryStore
        .getState()
        .conversationHistory.some(
          (m) => m.surface === 'live-coach' && m.gameId === gameId && m.ply === ctx.ply,
        );
      if (spokeThisPly) return;
      inFlightRef.current = true;
      lastSpokenPlyRef.current = ctx.ply;

      // ROOT-CAUSE GROUNDING (David 2026-07-09): the interjection content is
      // COMPUTED below (eval + best move + the live tactic) and voiced through
      // `groundedMoveFeedback` → voiceFacts. The trigger fired the WHEN; the
      // content is the grounded truth. No hand-built free-LLM message, no
      // trigger-flavored prompt — the LLM decides no chess content. Latency-
      // safe: reuse the eval bar's cached analysis, never a fresh engine read.
      let tactics: TacticsLiveContext | null = null;
      if (ctx.fenAfter) {
        // Adaptive grounding horizon: real rating + tactics skill, not a frozen
        // 1200 (David 2026-07-03: all training aids adaptive).
        const lcProfile = useAppStore.getState().activeProfile;
        tactics = (await buildFedTacticsContext(
          ctx.fenAfter,
          playerColor === 'white' ? 'w' : 'b',
          lcProfile?.currentRating ?? 1200,
          getCachedStockfish(ctx.fenAfter) ?? null,
          () => Promise.resolve(null),
          lcProfile?.skillRadar?.tactics,
        ).catch(() => undefined)) ?? null;
        // Tactics ride in liveState (below) so the spine injects + grounds them
        // — no longer hand-formatted into the prompt.
      }

      void logAppAudit({
        kind: 'live-coach-trigger-fired',
        category: 'subsystem',
        source: 'useLiveCoach',
        summary: `${winner.trigger} ply=${ctx.ply}`,
        details: JSON.stringify({ ...winner, ply: ctx.ply, san: ctx.san }),
        fen: ctx.fenAfter,
      });

      let response = '';
      try {
        // ROOT-CAUSE GROUNDING (David 2026-07-09: "no bandaids, root cause
        // fixes only"). The interjection is COMPUTED — the post-move eval +
        // best move + the live tactic — and voiced through the ONE chokepoint
        // (`groundedMoveFeedback` → assembler → voiceFacts). The LLM decides no
        // chess content, so the old free getCoachChatResponse + the post-hoc
        // groundCoachReply bandaid are both gone. Returns null (→ stay silent)
        // when there's no engine/tactic data to ground on.
        const cached = ctx.fenAfter ? getCachedStockfish(ctx.fenAfter) : null;
        // POSITION FACTS — Play is a PURE PLAYING surface, so this stays
        // DESCRIPTIVE commentary only: the opponent's INTENT and how their best
        // piece leans (teaching what's happening), NEVER "you must defend X" or
        // "slow down" — those would coach the student through their own live
        // game. Excludes must-defend + key-moment; the trigger `moment` already
        // conveys "this mattered". Rides the existing extraFacts chokepoint.
        let liveExtraFacts: string | undefined;
        try {
          if (cached?.topLines?.length && ctx.fenAfter) {
            const pf = await computePositionFacts({
              fen: ctx.fenAfter,
              moverColor: ctx.fenAfter.split(' ')[1] === 'b' ? 'b' : 'w',
              studentColor: playerColor === 'white' ? 'w' : 'b',
              rating: useAppStore.getState().activeProfile?.currentRating ?? 1200,
              analysis: cached,
              evalBoard: (f) => stockfishEngine.evalBoard(f),
              // Prior eval (student-POV cp → white-POV) so the STATUS band-change
              // line fires only when the assessment actually crossed a band —
              // descriptive commentary, which Play allows (Phase 1 slice).
              prevEvalCpWhitePov: playerColor === 'white' ? ctx.studentEvalBefore : -ctx.studentEvalBefore,
            });
            const cl = clauseText(pf.clauses, ['must-defend', 'key-moment']);
            if (cl.length) liveExtraFacts = cl.join(' ');
          }
        } catch { /* the position-facts lane is a bonus, never a blocker */ }
        const promise = groundedMoveFeedback({
          fen: ctx.fenAfter ?? '',
          bestMoveUci: cached?.bestMove ?? null,
          evalCp: cached?.evaluation ?? null,
          mateIn: cached?.isMate ? cached.mateIn : undefined,
          tactics: tactics ?? undefined,
          studentColor: playerColor,
          studentMessage: ctx.san ? `Played ${ctx.san}` : undefined,
          extraFacts: liveExtraFacts,
          // The trigger + eval numbers are COMPUTED (liveCoachTriggers); pass them
          // as a moment so the warm voice can say "nice recovery" TRUTHFULLY
          // (David 2026-07-09: "good recovery … when the eval swings up").
          warm: true,
          moment: {
            kind: winner.trigger,
            studentEvalBeforePawns: ctx.studentEvalBefore / 100,
            studentEvalAfterPawns: ctx.studentEvalAfter / 100,
            studentWorstPawns: ctx.worstEval !== undefined ? ctx.worstEval / 100 : undefined,
          },
        }).then((t) => t ?? '');
        const timeout = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('live-coach-timeout')), LIVE_COACH_API_TIMEOUT_MS),
        );
        response = await Promise.race([promise, timeout]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'useLiveCoach',
          summary: `${winner.trigger} LLM failed`,
          details: msg,
          fen: ctx.fenAfter,
        });
        inFlightRef.current = false;
        return;
      }

      // The spine already grounded the text; only the async engine-colored
      // arrow pass remains (a display feature, not a grounding gate).
      const text = (await applyCandidateArrows(response, ctx.fenAfter, 'liveCoach')).trim();
      if (!text || text.startsWith('⚠️')) {
        inFlightRef.current = false;
        return;
      }

      speakStreamed(text);

      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'live-coach',
        role: 'coach',
        text,
        gameId,
        ply: ctx.ply,
        fen: ctx.fenAfter,
        trigger: winner.trigger,
      });

      inFlightRef.current = false;
    },
    [gameId, playerColor],
  );

  const notifyPlayerMove = useCallback(
    (n: PlayerMoveNotification) => {
      if (args.enabled === false) return;   // silent surface — no triggers, no LLM, no speech
      const studentEvalBefore = toStudentEval(n.evalBefore, playerColor);
      const studentEvalAfter = toStudentEval(n.evalAfter, playerColor);
      const studentBestEval =
        n.bestMoveEval !== null ? toStudentEval(n.bestMoveEval, playerColor) : null;

      // Push to history BEFORE detecting recovery so the current eval
      // is the one we compare against (recovery wants worst-of-recent
      // including this ply).
      evalHistoryRef.current = [...evalHistoryRef.current, studentEvalAfter].slice(-12);

      const signal: PlayerMoveSignal = {
        evalBefore: studentEvalBefore,
        evalAfter: studentEvalAfter,
        bestMoveEval: studentBestEval,
        isBestMove: n.isBestMove,
        bestMoveWasTactical: n.bestMoveWasTactical,
        hasHangingPiece: n.hasHangingPiece,
        recentEvalHistory: evalHistoryRef.current,
      };

      // Adaptive interjection sensitivity: quieter for stronger players, more
      // attentive for weaker ones (David 2026-07-03: all training aids adaptive).
      const lcTrigProfile = useAppStore.getState().activeProfile;
      const lcSensitivity = alertSensitivityMultiplier(
        lcTrigProfile?.currentRating ?? 1200,
        lcTrigProfile?.skillRadar?.tactics,
      );
      const { winner, suppressed } = evaluatePlayerMoveTriggers(signal, lcSensitivity);
      for (const s of suppressed) {
        void logAppAudit({
          kind: 'live-coach-trigger-suppressed',
          category: 'subsystem',
          source: 'useLiveCoach',
          summary: `${s.trigger} ply=${n.ply} (lost priority)`,
          details: JSON.stringify({ ...s, ply: n.ply }),
        });
      }
      if (!winner) return;

      const last3 = evalHistoryRef.current.slice(-3);
      const worstRecent = last3.length > 0 ? Math.min(...last3) : undefined;

      void handleTrigger(winner, {
        ply: n.ply,
        san: n.san,
        fenAfter: n.fenAfter,
        bestMoveSan: n.bestMoveSan,
        studentEvalBefore,
        studentEvalAfter,
        worstEval: worstRecent,
        last3Moves: undefined,
      });
    },
    [handleTrigger, playerColor, args.enabled],
  );

  const notifyOpponentMove = useCallback(
    (n: OpponentMoveNotification) => {
      if (args.enabled === false) return;   // silent surface — no triggers, no LLM, no speech
      const studentEvalBefore = toStudentEval(n.evalBefore, playerColor);
      const studentEvalAfter = toStudentEval(n.evalAfter, playerColor);
      // Opponent moves don't extend the recovery history — only the
      // student's plies do (recovery is about THEIR play).
      const signal: OpponentMoveSignal = {
        evalBefore: studentEvalBefore,
        evalAfter: studentEvalAfter,
      };
      const oppProfile = useAppStore.getState().activeProfile;
      const oppSensitivity = alertSensitivityMultiplier(
        oppProfile?.currentRating ?? 1200,
        oppProfile?.skillRadar?.tactics,
      );
      const { winner } = evaluateOpponentMoveTriggers(signal, oppSensitivity);
      if (!winner) return;

      void handleTrigger(winner, {
        ply: n.ply,
        san: n.san,
        fenAfter: n.fenAfter,
        bestMoveSan: null,
        studentEvalBefore,
        studentEvalAfter,
      });
    },
    [handleTrigger, playerColor, args.enabled],
  );

  return { notifyPlayerMove, notifyOpponentMove };
}
