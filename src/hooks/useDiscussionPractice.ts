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
import { detectSlip, slipWarrantsInterjection, isNearBest, slipSeverityLabel, type SlipSeverity } from '../services/slipDetector';
import { buildWhyPrompt, buildGroundedReveal, buildSlipReveal, captureMisconception, findMoverTactic } from '../services/discussionPractice';
import { buildMisconceptionCallback } from '../services/misconceptionCallbacks';
import { buildMoveReasonOptions } from '../services/moveReasonOptions';
import { voiceService } from '../services/voiceService';
import { captureEvent } from '../services/analytics';
import { getMisconceptionTag } from '../data/misconceptionTags';
import type { MisconceptionSource } from '../types';

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
  /** The move's classification (blunder / mistake / inaccuracy) — shown on the
   *  card so the student KNOWS what they're being asked about (David 2026-07-10:
   *  "I need to know if it's a blunder or mistake I'm clicking on"). */
  severity?: SlipSeverity;
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

/** A recognized good move — a NON-BLOCKING "atta boy" (David 2026-07-06:
 *  "do we need the picker on good moves? I don't think so"). The coach speaks
 *  `line` and this transient signal lets the surface flash it; it never opens
 *  the blocking picker. Cleared on the next evaluated move or reset. */
export interface GoodMoveRecognition {
  line: string;
  playedSan: string;
}

export interface UseDiscussionPracticeResult {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  teach: string | null;
  /** Non-blocking good-move recognition (spoken + flashable), or null. */
  goodMove: GoodMoveRecognition | null;
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
  /** Which capture pipeline a logged slip is attributed to. LEARN =
   *  'discussion-practice' (default); post-game REVIEW passes 'game-review'
   *  so a review-captured slip is tagged to the game it came from. */
  source?: MisconceptionSource;
  /** When set, the reveal (best move + why) is handed here after the student
   *  commits, and the picker pop-up DISAPPEARS (David 2026-07-10: "I want the
   *  pop up to disappear after a selection is pressed"). The surface routes the
   *  reveal into the chat. Without it, the reveal shows in the transient
   *  teaching card (legacy behavior). */
  onReveal?: (text: string) => void;
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
  /** The reason chips shown, so submitReason can tell a chip pick from a
   *  typed answer when logging how the student responded. */
  options: string[];
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

/** A UCI PV -> SAN sequence from `fen`, stopping at the first illegal move.
 *  Feeds the best-move reasoning walk in the slip reveal (David 2026-07-10). */
function uciSeqToSan(fen: string, seq: string[] | undefined, max = 5): string[] {
  if (!seq || seq.length === 0) return [];
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const uci of seq) {
      if (out.length >= max || !uci || uci.length < 4) break;
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      if (!mv) break;
      out.push(mv.san);
    }
  } catch { /* return what we have */ }
  return out;
}

/** The near-best move set up a real tactic OWNED BY THE MOVER (the good-move
 *  gate). Any-tactic-anywhere fired an atta-boy on nearly every move of a real
 *  game (David 2026-07-11) — the tactic's acting piece must be the student's. */
function createdTactic(fenAfter: string, moverColor: 'w' | 'b'): boolean {
  return findMoverTactic(fenAfter, moverColor) !== null;
}

/** Min plies between good-move recognitions — recognition is a moment, not a
 *  metronome (per-move praise tunes out; narration voice rules). */
const GOOD_MOVE_MIN_PLY_GAP = 8;

export function useDiscussionPractice(
  enabled: boolean,
  opts: UseDiscussionPracticeOptions = {},
): UseDiscussionPracticeResult {
  const [phase, setPhase] = useState<DiscussionPhase>('idle');
  const [prompt, setPrompt] = useState<DiscussionPrompt | null>(null);
  const [teach, setTeach] = useState<string | null>(null);
  const [goodMove, setGoodMove] = useState<GoodMoveRecognition | null>(null);
  const ctxRef = useRef<MoveContext | null>(null);
  const busyRef = useRef(false);
  /** Ply of the last good-move recognition — the atta-boy cooldown. */
  const goodMoveLastPlyRef = useRef(-999);

  const active = enabled && !!opts.interruptive;

  const reset = useCallback((): void => {
    busyRef.current = false;
    ctxRef.current = null;
    setPhase('idle');
    setPrompt(null);
    setTeach(null);
    setGoodMove(null);
  }, []);

  const evaluatePlayerMove = useCallback(
    async (args: EvaluatePlayerMoveArgs): Promise<void> => {
      if (!active) return;             // inert on non-Learn surfaces (Play stays pure)
      if (busyRef.current) return;     // never stack a probe over an open one

      let evalBeforeW: number;
      let evalAfterW: number;
      let bestUci: string | undefined;
      let bestPvUci: string[] | undefined;
      let bestLineEvalW: number | undefined;
      let bestLineMate: number | null | undefined;
      try {
        const [before, after] = await Promise.all([
          stockfishEngine.analyzePosition(args.fenBefore, ANALYSIS_DEPTH),
          stockfishEngine.analyzePosition(args.fenAfter, ANALYSIS_DEPTH),
        ]);
        evalBeforeW = before.evaluation; // white-perspective cp (mate = huge)
        evalAfterW = after.evaluation;
        bestUci = before.bestMove;
        // The engine's best LINE (PV) from the position before the move — feeds
        // the "best move + why" reasoning walk in the reveal (David 2026-07-10).
        // Defensive `?.` on topLines: the type says non-null, but engine
        // responses (and test mocks) can omit it — reading [0] of undefined
        // would throw and abort the whole slip check (2026-07-10 regression).
        bestPvUci = before.topLines?.[0]?.moves ?? (before.bestMove ? [before.bestMove] : []);
        bestLineEvalW = before.isMate ? undefined : before.evaluation;
        bestLineMate = before.isMate ? before.mateIn : null;
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

      // The interjection bar is RATING-ADAPTIVE (slipWarrantsInterjection):
      // beginner→blunders, intermediate→mistakes, advanced→inaccuracies. The
      // coach interrupts a slip at the level it matters for THIS player.
      const isSlip = slip.isSlip && slipWarrantsInterjection(cpLoss, args.studentRating);
      const plyNow = (args.moveNumber ?? 0) * 2;
      const goodMoveOffCooldown = plyNow === 0 || plyNow - goodMoveLastPlyRef.current >= GOOD_MOVE_MIN_PLY_GAP;
      const isGood = !isSlip && goodMoveOffCooldown && isNearBest(cpLoss) && createdTactic(args.fenAfter, moverChar);
      if (!isSlip && !isGood) {
        setGoodMove(null); // an unremarkable move clears any lingering atta-boy
        return;
      }

      // GOOD MOVE — NO blocking picker (David 2026-07-06: "do we need the
      // picker on good moves? I don't think so"). Stopping a student cold
      // after a strong move is the wrong reward. Recognition still fires, but
      // as a NON-BLOCKING spoken "atta boy" (automatic in-game narration →
      // speakForced, so it honors the verbosity gate). We log that it fired so
      // the good/slip ratio is visible. The blocking picker is slips only.
      if (isGood) {
        goodMoveLastPlyRef.current = plyNow;
        const line = buildGroundedReveal({ kind: 'good', fenAfter: args.fenAfter, moverColor: moverChar, bestSan });
        setGoodMove({ line, playedSan: args.playedSan });
        void voiceService.speakForced(line).catch(() => undefined);
        captureEvent('discussion_good_move', {
          surface: opts.surface ?? 'unknown',
          move: args.playedSan,
          game_phase: args.gamePhase,
          cp_loss: Math.round(cpLoss),
          student_rating: args.studentRating ?? null,
        });
        return; // non-blocking — never opens the picker, never sets busy
      }

      // SLIP — the blocking "why'd you play that?" picker. The reveal (shown
      // AFTER the student commits) is the RICH teach: the classification + what
      // slipped + the best move and the engine's reasoning walk (David
      // 2026-07-10: "I want the best move to be told, along with the why").
      const options = buildMoveReasonOptions(args.fenBefore, args.playedSan);
      const bestPvSan = uciSeqToSan(args.fenBefore, bestPvUci);
      const reveal = buildSlipReveal({
        cpLoss,
        fenBefore: args.fenBefore,
        fenAfter: args.fenAfter,
        moverColor: moverChar,
        bestSan,
        bestPvSan,
        evalCp: bestLineEvalW ?? null,
        mateIn: bestLineMate ?? null,
      });
      const severity = slipSeverityLabel(cpLoss) ?? undefined;

      setGoodMove(null);
      busyRef.current = true;
      ctxRef.current = { args, bestSan, cpLoss, kind: 'slip', shouldCount: slip.shouldCount, reveal, moverChar, options };
      setPrompt({
        question: buildWhyPrompt(slip),
        options,
        hintReveal: reveal,
        kind: 'slip',
        severity,
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
    [active, opts.surface],
  );

  const submitReason = useCallback(async (reason: string): Promise<void> => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setPhase('thinking');

    const wasHint = reason === HINT_SENTINEL;
    const userReason = wasHint ? '(could not say)' : reason;
    // How did the student answer? chip pick / typed / tapped Hint — the raw
    // signal David wants visible ("we need to see how the user responds").
    const responseMode: 'chip' | 'typed' | 'hint' = wasHint
      ? 'hint'
      : ctx.options.includes(reason)
        ? 'chip'
        : 'typed';

    // A SLIP is classified + logged to the weakness bucket (-> drillable
    // mistakePuzzle). The REVEAL shown/spoken is ALWAYS the grounded rich
    // teach (classification + best move + the engine's why) — NEVER the
    // classifier's LLM coachNote (David 2026-07-10: the LLM note was
    // OVERRIDING the best-move-why with an "unknown"-feeling line; "I want the
    // best move to be told, along with the why"). We still run the classifier
    // to LOG the misconception to the weakness bucket, but the LLM prose is not
    // shown — G0: the coach voices the computed facts, not a free-composed note.
    let note = ctx.reveal;
    let loggedTag: string | undefined;
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
          source: opts.source ?? 'discussion-practice',
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
        loggedTag = res.record?.tag;
        // CALLBACK (David 2026-07-11: "we've talked about this"). When this
        // slip's tag already lives in the weakness buckets, the reveal says
        // so with computed history — count + recency from Dexie, never the
        // model. First occurrences stay silent.
        if (loggedTag) {
          const callback = await buildMisconceptionCallback(loggedTag);
          if (callback) note = `${note} ${callback}`;
        }
      } catch {
        /* logging failed — the grounded reveal is already correct */
      }
    }

    // Log HOW the student answered the pop-up + where it bucketed, so the
    // response (and the said-vs-board delta) is durably visible in analytics.
    captureEvent('discussion_response', {
      surface: opts.surface ?? 'unknown',
      kind: ctx.kind,
      response: userReason,
      response_mode: responseMode,
      was_hint: wasHint,
      move: ctx.args.playedSan,
      game_phase: ctx.args.gamePhase,
      cp_loss: Math.round(ctx.cpLoss),
      should_count: ctx.shouldCount,
      student_rating: ctx.args.studentRating ?? null,
      logged_tag: loggedTag ?? null,
      bucket: loggedTag ? getMisconceptionTag(loggedTag)?.bucket ?? null : null,
    });

    // NARRATE the grounded reveal AFTER the student commits (David 2026-07-06:
    // "it should be narrated after asking why I moved there" — the coach voice
    // was showing in the card but never spoken). Automatic in-game narration →
    // speakForced, so it honors the verbosity gate. Skip an empty note (the
    // honest `other` fallback has none).
    if (note.trim()) void voiceService.speakForced(note).catch(() => undefined);

    ctxRef.current = null;
    if (opts.onReveal) {
      // The picker pop-up DISAPPEARS after the selection; the reveal (best move
      // + why) goes to the chat + voice, not a lingering card (David 2026-07-10).
      if (note.trim()) opts.onReveal(note);
      reset();
    } else {
      setTeach(note);
      setPhase('teaching');
    }
  }, [opts.surface, opts.source, opts.onReveal, reset]);

  // raiseSlipPrompt opens the SLIP picker from KNOWN mistake data (no Stockfish
  // re-eval) — the post-game REVIEW entry point (David 2026-07-06: "I want that
  // section to respond like learn with coach"). Review already knows each slip's
  // fen/played/best/cpLoss from the analyzed game, so it hands them straight in
  // and the shared submitReason → narrated reveal → bucket flow does the rest.
  const raiseSlipPrompt = useCallback((args: RaiseSlipPromptArgs): void => {
    if (!active) return;
    if (busyRef.current) return;

    let moverChar: 'w' | 'b' = 'w';
    try {
      moverChar = new Chess(args.fenBefore).turn();
    } catch {
      return; // unparseable position — never guess (G3)
    }
    const options = buildMoveReasonOptions(args.fenBefore, args.playedSan);
    // Review path has no fresh PV, so the reasoning walk falls back to naming
    // the best move; the classification + hanging-piece read still compute.
    const reveal = buildSlipReveal({
      cpLoss: args.cpLoss, fenBefore: args.fenBefore, fenAfter: args.fenAfter,
      moverColor: moverChar, bestSan: args.bestSan,
      bestPvSan: args.bestSan ? [args.bestSan] : undefined,
    });
    const severity = slipSeverityLabel(args.cpLoss) ?? undefined;

    setGoodMove(null);
    busyRef.current = true;
    ctxRef.current = {
      args: {
        fenBefore: args.fenBefore, fenAfter: args.fenAfter, playedSan: args.playedSan,
        playerColor: moverChar === 'w' ? 'white' : 'black', inBook: false,
        learned: args.shouldCount, gamePhase: args.gamePhase, moveNumber: args.moveNumber,
        openingId: args.openingId, openingName: args.openingName, studentRating: args.studentRating,
      },
      bestSan: args.bestSan, cpLoss: args.cpLoss, kind: 'slip',
      shouldCount: args.shouldCount, reveal, moverChar, options,
    };
    setPrompt({
      question: buildWhyPrompt(), options, hintReveal: reveal, kind: 'slip', severity,
      fenBefore: args.fenBefore, fenAfter: args.fenAfter, playedSan: args.playedSan,
      bestSan: args.bestSan, cpLoss: args.cpLoss, shouldCount: args.shouldCount,
      gamePhase: args.gamePhase, moveNumber: args.moveNumber,
    });
    setPhase('asking');
  }, [active]);

  const skip = useCallback((): Promise<void> => { reset(); return Promise.resolve(); }, [reset]);

  const dismissTeach = useCallback((): void => { reset(); }, [reset]);

  return {
    phase,
    prompt,
    teach,
    goodMove,
    evaluatePlayerMove,
    raiseSlipPrompt,
    submitReason,
    skip,
    dismissTeach,
    reset,
  };
}
