// useDiscussionPractice — the live faucet's React shell over the tested
// orchestration in services/discussionPractice.ts. Mounts on a play
// surface; after each player move it (best-effort, never blocking the
// game) evaluates the move, and on a real slip raises a "why did you
// play that?" prompt. The student answers (voice/text) or skips; either
// way the coach teaches, and a counted slip is logged to the weakness
// bucket. All engine/lookup work is wrapped so a failure just means "no
// prompt this move" — the game never stalls.

import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import { lookupMasterPlay } from '../services/masterPlayLookup';
import { describeTopMasterMove } from '../services/explorerTranslate';
import {
  evaluateMove,
  buildWhyPrompt,
  captureMisconception,
  logPickedMisconception,
  type CaptureMisconceptionArgs,
} from '../services/discussionPractice';
import type { MisconceptionCandidate } from '../services/misconceptionDiagnosis';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { slipWarrantsInterjection, type SlipResult } from '../services/slipDetector';
import { logAppAudit } from '../services/appAuditor';
import { useSettings } from './useSettings';

// 'picking' = code was unsure; the user chooses from the ranked candidates.
export type DiscussionPhase = 'idle' | 'asking' | 'thinking' | 'picking' | 'teaching';

export interface DiscussionPrompt {
  question: string;
  /** Carried so submit/skip can classify with full context. */
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestSan?: string;
  mastersTopSan?: string;
  evalSummary?: string;
  cpLoss: number;
  shouldCount: boolean;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
}

export interface EvaluatePlayerMoveArgs {
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  playerColor: 'white' | 'black';
  inBook: boolean;
  bookMoveSan?: string;
  learned: boolean;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  /** Student's rating — drives the rating-adaptive interjection bar (a
   *  beginner is only asked about blunders; a 2000+ player about
   *  inaccuracies too). Below the bar the slip is still captured silently. */
  studentRating?: number;
}

/** Args for `raiseSlipPrompt` — a slip a CALLER already detected (e.g. the
 *  blunder interceptor in CoachGamePage), surfaced through the same "why
 *  did you play that?" panel + capture pipeline WITHOUT re-running the
 *  faucet's own analysis. The caller owns the eval; we own the UI + bucket. */
export interface RaiseSlipPromptArgs {
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestSan?: string;
  mastersTopSan?: string;
  /** Centipawns lost — drives the spoken eval summary. */
  cpLoss: number;
  /** Whether this slip counts against the weakness bucket (learned line). */
  shouldCount: boolean;
  /** 'left-book' phrases the question differently; default 'eval-drop'. */
  reason?: 'left-book' | 'eval-drop';
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  /** Student's rating for the rating-adaptive interjection bar. */
  studentRating?: number;
}

export interface UseDiscussionPracticeResult {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  /** The coach's teaching line to speak/show after answer or skip. */
  teach: string | null;
  /** When phase === 'picking': the ranked candidate buckets (best guess first)
   *  the user chooses from. Empty = show the judgment-list floor + Random. */
  pickerCandidates: MisconceptionCandidate[];
  evaluatePlayerMove: (args: EvaluatePlayerMoveArgs) => Promise<void>;
  /** Raise the "why?" prompt for a slip the caller already detected
   *  (blunder interception), bypassing the faucet's own analysis. */
  raiseSlipPrompt: (args: RaiseSlipPromptArgs) => void;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  /** Log the bucket the user picked from the pop-up ('random' = honest escape). */
  pickBucket: (tag: string) => Promise<void>;
  dismissTeach: () => void;
  reset: () => void;
}

function cpToWords(cpLoss: number): string {
  const pawns = cpLoss / 100;
  if (pawns >= 3) return 'loses a lot of material or the game';
  if (pawns >= 1.5) return 'drops a piece’s worth of advantage';
  if (pawns >= 0.8) return 'loses about a pawn';
  return 'gives away a little something';
}

export interface UseDiscussionPracticeOptions {
  /** Silent mode: detect the slip and feed the bucket WITHOUT raising the
   *  "why did you play that?" panel or speaking. For surfaces that are
   *  already narrating (the /coach/teach brain) or are silent-by-contract
   *  (WLPP Practice). The capture is passive — no userReason — exactly like
   *  the auto-analysis faucet, just live per-move. */
  silent?: boolean;
  /** A label for the audit trail so we can tell which surface fired. */
  surface?: string;
}

export function useDiscussionPractice(
  enabled: boolean,
  opts: UseDiscussionPracticeOptions = {},
): UseDiscussionPracticeResult {
  const { silent = false, surface } = opts;
  const { settings } = useSettings();
  // The "Ask why on my mistakes" toggle controls the INTERJECTION, not the
  // capture. When off, a slip is still detected and logged to the weakness
  // bucket — it just happens silently (no spoken "why?" prompt), exactly
  // like Practice mode. So the loop keeps learning from your games whether
  // or not you want to be interrupted mid-move.
  const effectiveSilent = silent || !settings.coachInGameDiscussion;
  const [phase, setPhase] = useState<DiscussionPhase>('idle');
  const [prompt, setPrompt] = useState<DiscussionPrompt | null>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const [pickerCandidates, setPickerCandidates] = useState<MisconceptionCandidate[]>([]);
  // Context held while the picker is up so the user's pick can be logged.
  const pickContextRef = useRef<{ context: CaptureMisconceptionArgs['context']; reason?: string; shouldCount: boolean } | null>(null);
  const openingIdRef = useRef<string | undefined>(undefined);
  const openingNameRef = useRef<string | undefined>(undefined);
  // One "why?" prompt per move. The faucet (evaluatePlayerMove) and a
  // caller-driven raise (raiseSlipPrompt, used by the blunder interceptor)
  // can both reach the same slip — whichever fires first wins; the other is
  // a no-op for that position. Keyed on the resulting FEN.
  const promptedFenAfterRef = useRef<string | null>(null);

  const evaluatePlayerMove = useCallback(async (args: EvaluatePlayerMoveArgs): Promise<void> => {
    if (!enabled) return;
    openingIdRef.current = args.openingId;
    openingNameRef.current = args.openingName;
    try {
      // Eval the position before + after the move to detect a slip. Use
      // 'brain' priority — NOT 'prefetch'. 'prefetch' analyses are DROPPED
      // whenever a 'brain' eval is in flight, and on every surface the
      // student's move kicks off a 'brain' eval immediately (the engine
      // reply, the eval bar, the move classification). So a 'prefetch' slip-
      // check was silently dropped and the "why did you play that?" pop-up
      // NEVER fired (David 2026-06-04: "the pop up should fire even if the
      // move is not punished" — it's eval-based, so it must). Depth 10 is
      // plenty to catch a blunder and keeps the queue short. The two evals
      // queue behind the engine reply, so the prompt appears a beat after
      // the opponent moves — reliably, instead of never.
      const [before, after] = await Promise.all([
        stockfishEngine.analyzePosition(args.fenBefore, 10, undefined, 'brain'),
        stockfishEngine.analyzePosition(args.fenAfter, 10, undefined, 'brain'),
      ]);
      const sign = args.playerColor === 'white' ? 1 : -1;
      const evalBeforeCp = before.evaluation * sign;
      const evalAfterCp = after.evaluation * sign;

      const slip = evaluateMove({
        inBook: args.inBook,
        bookMoveSan: args.bookMoveSan,
        playedSan: args.playedSan,
        evalBeforeCp,
        evalAfterCp,
        learned: args.learned,
      });
      if (!slip.isSlip) return;
      // Already prompted for this move (the blunder interceptor raised it
      // first via raiseSlipPrompt) — don't double-fire.
      if (promptedFenAfterRef.current === args.fenAfter) return;

      // Resolve the better move (SAN) and the masters' move for context.
      let bestSan: string | undefined;
      try {
        if (before.bestMove && before.bestMove.length >= 4) {
          const c = new Chess(args.fenBefore);
          const mv = c.move({
            from: before.bestMove.slice(0, 2),
            to: before.bestMove.slice(2, 4),
            promotion: before.bestMove.length > 4 ? before.bestMove[4] : undefined,
          });
          bestSan = mv.san;
        }
      } catch { /* leave bestSan undefined */ }

      let mastersTopSan: string | undefined;
      try {
        const masters = await lookupMasterPlay(args.fenBefore, {
          triggeredBy: 'manual',
          surface: 'discussion-practice',
          localOnly: true,
        });
        const top = describeTopMasterMove(masters, args.playerColor);
        mastersTopSan = top?.san;
      } catch { /* no masters data */ }

      void logAppAudit({
        kind: 'faucet-slip-detected',
        category: 'subsystem',
        source: `useDiscussionPractice.evaluatePlayerMove${surface ? `:${surface}` : ''}`,
        summary: `played=${args.playedSan} best=${bestSan ?? '?'} cpLoss=${slip.cpLoss} count=${slip.shouldCount} phase=${args.gamePhase} silent=${effectiveSilent}`,
        fen: args.fenBefore,
        details: JSON.stringify({
          surface,
          silent: effectiveSilent,
          playedSan: args.playedSan,
          bestSan,
          mastersTopSan,
          cpLoss: slip.cpLoss,
          shouldCount: slip.shouldCount,
          inBook: args.inBook,
          openingName: args.openingName,
        }),
      });

      // Claim this move so a caller-driven raise (raiseSlipPrompt) doesn't
      // double-fire the same prompt.
      promptedFenAfterRef.current = args.fenAfter;

      // Silent capture (feed the bucket, no panel/voice) when EITHER:
      //   - silent-by-contract (the /coach/teach brain narrates / WLPP
      //     Practice / the user turned the "ask why" interjection off), OR
      //   - the slip is BELOW the rating-adaptive interjection bar (a
      //     beginner's inaccuracy / a 1500's inaccuracy — captured, but not
      //     worth interrupting; David 2026-06-04).
      // Either way the slip still counts toward the weakness bucket.
      const belowRatingBar = !slipWarrantsInterjection(slip.cpLoss, args.studentRating);
      if (effectiveSilent || belowRatingBar) {
        await captureMisconception({
          classifyInput: {
            fen: args.fenBefore,
            playedSan: args.playedSan,
            bestSan,
            mastersTopSan,
            evalSummary: cpToWords(slip.cpLoss),
            gamePhase: args.gamePhase,
          },
          source: 'discussion-practice',
          shouldCount: slip.shouldCount,
          context: {
            fen: args.fenBefore,
            playedSan: args.playedSan,
            bestSan,
            cpLoss: slip.cpLoss,
            gamePhase: args.gamePhase,
            moveNumber: args.moveNumber,
            openingId: args.openingId,
            openingName: args.openingName,
          },
        });
        return;
      }

      setPrompt({
        question: buildWhyPrompt(slip),
        fenBefore: args.fenBefore,
        fenAfter: args.fenAfter,
        playedSan: args.playedSan,
        bestSan,
        mastersTopSan,
        evalSummary: cpToWords(slip.cpLoss),
        cpLoss: slip.cpLoss,
        shouldCount: slip.shouldCount,
        gamePhase: args.gamePhase,
        moveNumber: args.moveNumber,
      });
      setPhase('asking');
    } catch {
      // Any failure → no prompt this move. Never block the game.
    }
  }, [enabled, effectiveSilent, surface]);

  // Caller-driven raise: a slip the CALLER already detected (the blunder
  // interceptor knows the move is a blunder and has the best move in hand).
  // Surfaces the same "why?" panel + capture pipeline without re-running the
  // faucet's analysis — so a blunder pop-up ALWAYS carries the coach's "why
  // did you play that?" question instead of depending on the faucet's
  // independent evaluator to coincidentally agree and win the analysis race
  // (David 2026-06-04: blunder pop-up fired with no "why" question).
  const raiseSlipPrompt = useCallback((args: RaiseSlipPromptArgs): void => {
    if (!enabled) return;
    // One prompt per move — if the faucet already claimed this position, or
    // a prompt for it is already up, don't clobber it.
    if (promptedFenAfterRef.current === args.fenAfter) return;
    promptedFenAfterRef.current = args.fenAfter;
    openingIdRef.current = args.openingId;
    openingNameRef.current = args.openingName;

    const slip: SlipResult = {
      isSlip: true,
      reason: args.reason ?? 'eval-drop',
      severity: null,
      cpLoss: args.cpLoss,
      shouldCount: args.shouldCount,
    };

    void logAppAudit({
      kind: 'faucet-slip-detected',
      category: 'subsystem',
      source: `useDiscussionPractice.raiseSlipPrompt${surface ? `:${surface}` : ''}`,
      summary: `played=${args.playedSan} best=${args.bestSan ?? '?'} cpLoss=${args.cpLoss} count=${args.shouldCount} phase=${args.gamePhase} silent=${effectiveSilent} via=blunder`,
      fen: args.fenBefore,
      details: JSON.stringify({
        surface,
        silent: effectiveSilent,
        playedSan: args.playedSan,
        bestSan: args.bestSan,
        mastersTopSan: args.mastersTopSan,
        cpLoss: args.cpLoss,
        shouldCount: args.shouldCount,
        openingName: args.openingName,
        via: 'blunder',
      }),
    });

    // Silent capture (no panel) when silent-by-contract OR the slip is below
    // the rating-adaptive interjection bar — still feeds the bucket.
    const belowRatingBar = !slipWarrantsInterjection(args.cpLoss, args.studentRating);
    if (effectiveSilent || belowRatingBar) {
      void captureMisconception({
        classifyInput: {
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          mastersTopSan: args.mastersTopSan,
          evalSummary: cpToWords(args.cpLoss),
          gamePhase: args.gamePhase,
        },
        source: 'discussion-practice',
        shouldCount: args.shouldCount,
        context: {
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          cpLoss: args.cpLoss,
          gamePhase: args.gamePhase,
          moveNumber: args.moveNumber,
          openingId: args.openingId,
          openingName: args.openingName,
        },
      }).catch(() => undefined);
      return;
    }

    setPrompt({
      question: buildWhyPrompt(slip),
      fenBefore: args.fenBefore,
      fenAfter: args.fenAfter,
      playedSan: args.playedSan,
      bestSan: args.bestSan,
      mastersTopSan: args.mastersTopSan,
      evalSummary: cpToWords(args.cpLoss),
      cpLoss: args.cpLoss,
      shouldCount: args.shouldCount,
      gamePhase: args.gamePhase,
      moveNumber: args.moveNumber,
    });
    setPhase('asking');
  }, [enabled, effectiveSilent, surface]);

  const resolve = useCallback(async (reason: string | undefined): Promise<void> => {
    if (!prompt) return;
    setPhase('thinking');
    const context = {
      fen: prompt.fenBefore,
      playedSan: prompt.playedSan,
      bestSan: prompt.bestSan,
      cpLoss: prompt.cpLoss,
      gamePhase: prompt.gamePhase,
      moveNumber: prompt.moveNumber,
      openingId: openingIdRef.current,
      openingName: openingNameRef.current,
    };
    // interactive: a user is at the board — if code is unsure, get the picker.
    const result = await captureMisconception({
      classifyInput: {
        fen: prompt.fenBefore,
        playedSan: prompt.playedSan,
        bestSan: prompt.bestSan,
        mastersTopSan: prompt.mastersTopSan,
        evalSummary: prompt.evalSummary,
        gamePhase: prompt.gamePhase,
        userReason: reason,
      },
      source: 'discussion-practice',
      shouldCount: prompt.shouldCount,
      interactive: true,
      context,
    });
    setPrompt(null);
    if (result.needsPicker) {
      // Code couldn't auto-tag (and the reason didn't resolve it) → show the
      // ranked-candidate picker; the user's pick is logged by pickBucket.
      pickContextRef.current = { context, reason, shouldCount: prompt.shouldCount };
      setPickerCandidates(result.candidates);
      setPhase('picking');
      return;
    }
    setTeach(result.coachNote || null);
    setPhase(result.coachNote ? 'teaching' : 'idle');
  }, [prompt]);

  const submitReason = useCallback((reason: string) => resolve(reason), [resolve]);
  const skip = useCallback(() => resolve(undefined), [resolve]);

  /** Log the bucket the user picked from the ranked-candidate pop-up. */
  const pickBucket = useCallback(async (tag: string): Promise<void> => {
    const pick = pickContextRef.current;
    if (!pick) return;
    setPhase('thinking');
    await logPickedMisconception({
      tag,
      source: 'discussion-practice',
      shouldCount: pick.shouldCount,
      context: pick.context,
      userReason: pick.reason,
    }).catch(() => undefined);
    pickContextRef.current = null;
    setPickerCandidates([]);
    const note = tag === 'random' ? null : getMisconceptionTag(tag)?.blurb ?? null;
    setTeach(note);
    setPhase(note ? 'teaching' : 'idle');
  }, []);

  const dismissTeach = useCallback(() => {
    setTeach(null);
    setPhase('idle');
  }, []);

  const reset = useCallback(() => {
    setPrompt(null);
    setTeach(null);
    setPickerCandidates([]);
    pickContextRef.current = null;
    setPhase('idle');
    promptedFenAfterRef.current = null;
  }, []);

  return { phase, prompt, teach, pickerCandidates, evaluatePlayerMove, raiseSlipPrompt, submitReason, skip, pickBucket, dismissTeach, reset };
}
