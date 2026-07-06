// useDiscussionPractice — the live "why did you play that?" faucet.
//
// RESTORED from an inert stub (David 2026-07-06: the 2026-06-11 retirement
// was a mistake — the automated post-game analyst never replaces the coach
// asking IN THE MOMENT). Full doctrine: CLAUDE.md §"THE APP'S COACH VOICE +
// THE 'WHY DID YOU PLAY THAT?' FAUCET"; spec:
// docs/plans/2026-07-06-coach-voice-why-faucet.md.
//
// SURFACE PLACEMENT (locked): the blocking picker lives on LEARN
// (/coach/teach) ONLY — never on the pure PLAY surfaces. So the real loop
// runs ONLY when the caller opts in with `interruptive: true`. Every other
// surface that mounts this hook (OpeningPlayMode, CoachGamePage,
// MiddlegamePractice, PlayableLinePlayer) does NOT pass it and therefore gets
// the same inert no-op shape it had as a stub — Play stays pure.
//
// Loop (interruptive only): a move comes in -> Stockfish evals before+after ->
// decide significance (a rating-gated SLIP, or a near-best move that CREATED a
// tactic) -> raise a CLEAN neutral probe ("Why'd you play that?") with a
// deterministic reason PICKER + Hint -> the student commits a reason (pick /
// type / Hint) -> the GROUNDED reveal grades it against the board -> a slip is
// classified + logged to the weakness bucket (-> drillable mistakePuzzle).
// The probe NEVER leaks a board fact (rule 1); the answer appears only AFTER
// the student commits (rule 2); everything is computed, the coach only voices
// it (rule 3, G0).

import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import { detectSlip, slipWarrantsInterjection, isNearBest } from '../services/slipDetector';
import { detectTactics } from '../services/tacticsDetector';
import { buildWhyPrompt, buildGroundedReveal, captureMisconception } from '../services/discussionPractice';
import { buildMoveReasonOptions } from '../services/moveReasonOptions';

/** Sentinel the panel's Hint button submits — the hook treats it as an honest
 *  "I couldn't say" (reveal the answer, log the gap), never a typed reason. */
export const HINT_SENTINEL = '__HINT__';

export type DiscussionPhase = 'idle' | 'asking' | 'thinking' | 'teaching';

export interface DiscussionPrompt {
  question: string;
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
  /** Deterministic reason chips (David 2026-07-06). Panel appends "Type your
   *  answer" + Hint. Empty falls back to the text input. */
  options?: string[];
  /** The grounded answer revealed on Hint (and shown in the teach phase).
   *  Never leaked before the student commits. */
  hintReveal?: string;
  /** Whether this fired on a slip (bad) or good-move recognition. */
  kind?: 'slip' | 'good';
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
  studentRating?: number;
}

export interface RaiseSlipPromptArgs {
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestSan?: string;
  mastersTopSan?: string;
  cpLoss: number;
  shouldCount: boolean;
  reason?: 'left-book' | 'eval-drop';
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
  openingId?: string;
  openingName?: string;
  studentRating?: number;
}

export interface UseDiscussionPracticeResult {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  teach: string | null;
  evaluatePlayerMove: (args: EvaluatePlayerMoveArgs) => Promise<void>;
  raiseSlipPrompt: (args: RaiseSlipPromptArgs) => void;
  submitReason: (reason: string) => Promise<void>;
  skip: () => Promise<void>;
  dismissTeach: () => void;
  reset: () => void;
}

export interface UseDiscussionPracticeOptions {
  silent?: boolean;
  surface?: string;
  /** Opt-in to the blocking "why did you play that?" picker. LEARN sets this;
   *  the pure PLAY surfaces do NOT, keeping this hook inert for them. */
  interruptive?: boolean;
}

const ANALYSIS_DEPTH = 14;

interface MoveContext {
  args: EvaluatePlayerMoveArgs;
  bestSan?: string;
  cpLoss: number;
  kind: 'slip' | 'good';
  shouldCount: boolean;
  reveal: string;
  moverChar: 'w' | 'b';
}

/** UCI -> SAN against a FEN (chess.js). Returns undefined on any bad input. */
function uciToSan(fen: string, uci: string | undefined): string | undefined {
  if (!uci || uci.length < 4) return undefined;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return mv.san;
  } catch {
    return undefined;
  }
}

/** The near-best move set up a real tactic on the board (the good-move gate). */
function createdTactic(fenAfter: string): boolean {
  try {
    return detectTactics(fenAfter).tactics.some((t) => t.type !== 'none');
  } catch {
    return false;
  }
}

export function useDiscussionPractice(
  enabled: boolean,
  opts: UseDiscussionPracticeOptions = {},
): UseDiscussionPracticeResult {
  const [phase, setPhase] = useState<DiscussionPhase>('idle');
  const [prompt, setPrompt] = useState<DiscussionPrompt | null>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const ctxRef = useRef<MoveContext | null>(null);
  const busyRef = useRef(false);

  const active = enabled && !!opts.interruptive;

  const reset = useCallback((): void => {
    busyRef.current = false;
    ctxRef.current = null;
    setPhase('idle');
    setPrompt(null);
    setTeach(null);
  }, []);

  const evaluatePlayerMove = useCallback(
    async (args: EvaluatePlayerMoveArgs): Promise<void> => {
      if (!active) return;             // inert on non-Learn surfaces (Play stays pure)
      if (busyRef.current) return;     // never stack a probe over an open one

      let evalBeforeW: number;
      let evalAfterW: number;
      let bestUci: string | undefined;
      try {
        const [before, after] = await Promise.all([
          stockfishEngine.analyzePosition(args.fenBefore, ANALYSIS_DEPTH),
          stockfishEngine.analyzePosition(args.fenAfter, ANALYSIS_DEPTH),
        ]);
        evalBeforeW = before.evaluation; // white-perspective cp (mate = huge)
        evalAfterW = after.evaluation;
        bestUci = before.bestMove;
      } catch {
        return; // engine down → never guess (G0/G3)
      }

      const moverSign = args.playerColor === 'white' ? 1 : -1;
      const evalBeforeMover = evalBeforeW * moverSign;
      const evalAfterMover = evalAfterW * moverSign;
      const cpLoss = evalBeforeMover - evalAfterMover;
      const moverChar: 'w' | 'b' = args.playerColor === 'white' ? 'w' : 'b';
      const bestSan = uciToSan(args.fenBefore, bestUci);

      const slip = detectSlip({
        inBook: args.inBook,
        bookMoveSan: args.bookMoveSan,
        playedSan: args.playedSan,
        evalBeforeCp: evalBeforeMover,
        evalAfterCp: evalAfterMover,
        learned: args.learned,
      });

      let kind: 'slip' | 'good' | null = null;
      if (slip.isSlip && slipWarrantsInterjection(cpLoss, args.studentRating)) {
        kind = 'slip';
      } else if (isNearBest(cpLoss) && createdTactic(args.fenAfter)) {
        kind = 'good';
      }
      if (!kind) return;

      const reveal = buildGroundedReveal({ kind, fenAfter: args.fenAfter, moverColor: moverChar, bestSan });

      busyRef.current = true;
      ctxRef.current = { args, bestSan, cpLoss, kind, shouldCount: slip.shouldCount, reveal, moverChar };
      setPrompt({
        question: buildWhyPrompt(slip),
        options: buildMoveReasonOptions(args.fenBefore, args.playedSan),
        hintReveal: reveal,
        kind,
        fenBefore: args.fenBefore,
        fenAfter: args.fenAfter,
        playedSan: args.playedSan,
        bestSan,
        cpLoss,
        shouldCount: slip.shouldCount,
        gamePhase: args.gamePhase,
        moveNumber: args.moveNumber,
      });
      setPhase('asking');
    },
    [active],
  );

  const submitReason = useCallback(async (reason: string): Promise<void> => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setPhase('thinking');

    const userReason = reason === HINT_SENTINEL ? '(could not say)' : reason;

    // A SLIP is classified + logged to the weakness bucket (-> drillable
    // mistakePuzzle). A GOOD move teaches without inflating the weakness
    // profile. The reveal text is the classifier's grounded coachNote when
    // available (slip), else the pre-computed grounded reveal.
    let note = ctx.reveal;
    if (ctx.kind === 'slip') {
      try {
        const res = await captureMisconception({
          classifyInput: {
            fen: ctx.args.fenBefore,
            playedSan: ctx.args.playedSan,
            bestSan: ctx.bestSan,
            gamePhase: ctx.args.gamePhase,
            userReason,
          },
          source: 'discussion-practice',
          shouldCount: ctx.shouldCount,
          context: {
            fen: ctx.args.fenBefore,
            playedSan: ctx.args.playedSan,
            bestSan: ctx.bestSan,
            cpLoss: ctx.cpLoss,
            gamePhase: ctx.args.gamePhase,
            moveNumber: ctx.args.moveNumber,
            openingId: ctx.args.openingId,
            openingName: ctx.args.openingName,
          },
        });
        if (res.coachNote) note = res.coachNote;
      } catch {
        /* keep the pre-computed grounded reveal */
      }
    }

    ctxRef.current = null;
    setTeach(note);
    setPhase('teaching');
  }, []);

  // raiseSlipPrompt kept for API compatibility (callers may still invoke it);
  // the eval-driven evaluatePlayerMove path is the live one.
  const raiseSlipPrompt = useCallback((): void => { /* handled via evaluatePlayerMove */ }, []);

  const skip = useCallback((): Promise<void> => { reset(); return Promise.resolve(); }, [reset]);

  const dismissTeach = useCallback((): void => { reset(); }, [reset]);

  return {
    phase,
    prompt,
    teach,
    evaluatePlayerMove,
    raiseSlipPrompt,
    submitReason,
    skip,
    dismissTeach,
    reset,
  };
}
