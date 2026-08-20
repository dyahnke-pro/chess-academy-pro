/**
 * useTeachWalkthrough
 * -------------------
 * Drives an in-place walkthrough of a `WalkthroughTree` on the
 * /coach/teach surface. Replaces the old "navigate to a separate
 * walkthrough page" flow that lost the chat panel.
 *
 * State machine (the `phase` field):
 *   - 'idle'      : nothing active; start(tree) to begin.
 *   - 'narrating' : board shows current node's FEN, voice speaks
 *                   `node.idea`. When voice resolves, transition to
 *                   one of: linear-advance (auto next), 'fork', 'leaf'.
 *   - 'fork'      : board paused at a branch point; tap targets shown.
 *                   pickFork(idx) → narrating(child).
 *   - 'leaf'      : board paused at the end of a chosen branch.
 *                   backtrackToLastFork() restores the last fork.
 *                   playItOut() handed back to caller via callback.
 *   - 'paused'    : user (or brain) interrupted mid-narration. Voice
 *                   stopped, board frozen at current FEN. resume()
 *                   re-narrates the same node's idea.
 *
 * The hook OWNS chess.js — it walks SANs from the root through the
 * current path to compute FEN. Exposes the FEN to the component so
 * the board renders the correct position. Caller does not provide
 * FENs in the data file.
 *
 * Voice integration: speaks `idea` via `voiceService.speakForced`,
 * with a backup timer that advances even if TTS hangs. Same pattern
 * `walkthroughRunner.runStep` uses; inlined here because the tree
 * runner has different transition logic.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { stripSanAnnotations } from '../data/openingWalkthroughs/validate';
import { trapPlayPosition } from '../services/trapPlayPosition';
import { voiceService } from '../services/voiceService';
import { logAppAudit } from '../services/appAuditor';
import { markStageComplete } from '../services/openingProgress';
import { getCachedOpening } from '../services/openingGenerator';
import { bakedNarrationFor } from '../services/bakedWalkthroughNarration';
import { buildDrillWrongTeaching, buildDrillBetterLine, buildDrillThreatSpot, buildDrillCompletionPlan } from '../services/learnMoveTeaching';
import { computeWatchGemAside } from '../services/gemCrushLines';
import { playOutPunish, advantageAlreadyShown } from '../services/punishPlayout';
import { computeThreatDelta, computeRouteDelta, type DeltaAside } from '../services/engineDeltaLines';
import {
  isStartablePunishLesson,
  isValidConceptsQuestion,
  isValidFindMoveQuestion,
  isValidDrillLine,
  stageArrayHasUsableEntry,
} from '../services/stageEntryValidity';
import { useAppStore } from '../stores/appStore';
import { resolveCoachNarration } from '../utils/coachNarration';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  WalkthroughTreeChild,
  PunishLesson,
  DrillLine,
  NarrationArrow,
  NarrationHighlight,
} from '../types/walkthroughTree';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Convert a SAN to a friendly spoken form. Used for the punish-
 *  walkthrough fork subtitles so all options look uniform — none
 *  reads as a tell. "Qxg4" → "Queen takes g4", "Nf3" → "Knight to
 *  f3", "h3" → "h3", "O-O" → "Castle". */
function sanToFriendly(san: string): string {
  if (san === 'O-O') return 'Castle short';
  if (san === 'O-O-O') return 'Castle long';
  const pieceMap: Record<string, string> = {
    N: 'Knight',
    B: 'Bishop',
    R: 'Rook',
    Q: 'Queen',
    K: 'King',
  };
  const first = san[0];
  if (first in pieceMap) {
    const captures = san.includes('x');
    const dest = san.match(/[a-h][1-8]/g)?.slice(-1)[0];
    if (dest) {
      return `${pieceMap[first]} ${captures ? 'takes' : 'to'} ${dest}`;
    }
  }
  // Pawn move — just return the SAN.
  return san;
}

/** Determine which side a move belongs to based on its index in a
 *  zero-indexed sequence starting from white's first move. */
function sideAtIndex(plyIndex: number): 'white' | 'black' {
  return plyIndex % 2 === 0 ? 'white' : 'black';
}

// The four stage-entry shape guards now live in the LEAF
// `services/stageEntryValidity` so the GENERATOR can import them too. They used
// to live here, in a hook, which is why `openingGenerator.getMissingStages`
// grew its own weaker `length > 0` test — and why "teach me the traps in X"
// could hang forever on a stage that was non-empty but entirely unusable
// (David 2026-08-04). Re-exported so every existing import site keeps working.
export {
  isStartablePunishLesson,
  isValidConceptsQuestion,
  isValidFindMoveQuestion,
  isValidDrillLine,
};

/** Where a drill line actually STARTS for the student: the position after
 *  auto-playing any leading OPPONENT moves. A White-side line starts at the
 *  initial position (index 0); a Black-side line starts with White's first
 *  move already on the board (index 1). Stops at the first illegal SAN —
 *  the drill guards handle the malformed-line case downstream. */
export function leadingDrillPosition(line: DrillLine): { fen: string; index: number } {
  const studentSide = line.studentSide ?? 'white';
  const probe = new Chess();
  let index = 0;
  while (index < line.moves.length) {
    const isWhitesMove = index % 2 === 0;
    const isStudents = studentSide === 'white' ? isWhitesMove : !isWhitesMove;
    if (isStudents) break;
    try {
      probe.move(line.moves[index]);
    } catch {
      break;
    }
    index += 1;
  }
  return { fen: probe.fen(), index };
}

/** Build a one-shot WalkthroughTree from a PunishLesson. Reuses the
 *  walkthrough engine to play the punish lesson with the same UI as
 *  the opening walkthrough — animated moves with narration, fork
 *  picker at the punishment moment, leaf at the end with the
 *  whyPunish takeaway. Per the user's morning iteration: "Punishment
 *  lines need to be in walk through style following the same pattern
 *  we teach the opening in."
 *
 *  Tree shape:
 *    root → setup1 (silent, fast advance) → setup2 → ... → setupN
 *      → inaccuracy (highlighted red, whyBad narrated)
 *      → FORK[ punishment, distractor1, distractor2, ... ]
 *           punishment → followup1 → ... → leaf (whyPunish outro)
 *           distractor → leaf (distractor explanation)
 *
 *  Defensive: `distractors` / `setupMoves` are defaulted to `[]` so a
 *  malformed cached lesson can never throw here (it's already been
 *  gated out of the picker by `isStartablePunishLesson`, but the
 *  builder must not be the thing that crashes if one slips through). */
export function buildPunishWalkthroughTree(
  lesson: PunishLesson,
  parentOpening: WalkthroughTree,
): WalkthroughTree {
  const lessonDistractors = Array.isArray(lesson.distractors) ? lesson.distractors : [];
  const lessonSetupMoves = Array.isArray(lesson.setupMoves) ? lesson.setupMoves : [];
  // Build leaf nodes for each distractor (single node, dead-end).
  const distractorChildren: WalkthroughTreeChild[] = lessonDistractors.map(
    (d) => ({
      label: d.san,
      forkSubtitle: sanToFriendly(d.san),
      node: {
        san: d.san,
        movedBy: 'white',
        idea: `${d.san} — ${d.label}. ${d.explanation}\n\nThe actual punishment was ${lesson.punishment}: ${lesson.whyPunish}`,
        narration: [
          {
            text: `${sanToFriendly(d.san)}. Not the move.`,
            arrows: [],
          },
          {
            text: d.explanation,
          },
          {
            text: `The actual punishment was ${sanToFriendly(lesson.punishment)}. ${lesson.whyPunish}`,
          },
        ],
        children: [],
      },
    }),
  );

  // Build the punishment subtree: punishment node → followup chain → leaf.
  // followupSide alternates from the move AFTER punishment.
  // Punishment is white's move, so followup[0] is black's, followup[1] white's, etc.
  let punishmentLeafContinuation: WalkthroughTreeNode | null = null;
  if (lesson.followup && lesson.followup.length > 0) {
    // Build followup from the END backwards so we can chain children.
    let current: WalkthroughTreeNode | null = null;
    for (let i = lesson.followup.length - 1; i >= 0; i -= 1) {
      const fm = lesson.followup[i];
      const node: WalkthroughTreeNode = {
        san: fm.san,
        movedBy: i % 2 === 0 ? 'black' : 'white',
        idea: fm.idea,
        narration: [{ text: fm.idea }],
        children: current ? [{ node: current }] : [],
      };
      current = node;
    }
    punishmentLeafContinuation = current;
  }

  const punishmentChild: WalkthroughTreeChild = {
    label: lesson.punishment,
    forkSubtitle: sanToFriendly(lesson.punishment),
    node: {
      san: lesson.punishment,
      movedBy: 'white',
      idea: lesson.whyPunish,
      narration: [
        {
          text: `${sanToFriendly(lesson.punishment)}.`,
        },
        {
          text: lesson.whyPunish,
        },
      ],
      children: punishmentLeafContinuation
        ? [{ node: punishmentLeafContinuation }]
        : [],
    },
  };

  // Combine: punishment first (correct answer), then distractors.
  // Sort alphabetically by SAN so the punishment isn't always at
  // index 0 — same anti-tell measure as the quiz panel.
  const forkChildren = [punishmentChild, ...distractorChildren].sort((a, b) =>
    (a.label ?? '').localeCompare(b.label ?? ''),
  );

  // Inaccuracy node: animates the opponent's bad move, narrates
  // whyBad with red highlight, then forks to the candidate moves.
  // Side determination: when setupFen is present, the FEN itself
  // tells us whose turn it is — parse the side-to-move character.
  // Otherwise count from the start position by ply parity of
  // setupMoves.length.
  const inaccuracySide: 'white' | 'black' = lesson.setupFen
    ? (lesson.setupFen.split(' ')[1] === 'b' ? 'black' : 'white')
    : sideAtIndex(lessonSetupMoves.length);
  const opponentLabel = inaccuracySide === 'white' ? 'White' : 'Black';
  const inaccuracyNode: WalkthroughTreeNode = {
    san: lesson.inaccuracy,
    movedBy: inaccuracySide,
    idea: lesson.whyBad,
    narration: [
      {
        text: `Now ${opponentLabel} plays ${sanToFriendly(lesson.inaccuracy)}.`,
        highlights: [{ square: 'a1', color: 'red' }], // placeholder; will be overridden
      },
      {
        text: lesson.whyBad,
      },
      {
        text: 'What is your punishment?',
      },
    ],
    children: forkChildren,
  };

  // Position the board at the inaccuracy. WALK THE LINE whenever the lesson's
  // own moves replay from the standard start — David 2026-08-05, after asking
  // for the Bishop's Opening traps: "i was expecting a walk through of the trap
  // lines, like how we teach the openings." The old rule keyed on `setupFen`
  // being PRESENT, which was meant to catch puzzle-derived lessons whose SANs
  // are only legal from mid-game — but the curated GEMS also record a setupFen
  // (computed by replaying their own DB-anchored line), so the one source whose
  // whole point is the line from move one was skipping straight to move eight
  // and playing two moves on a board that appeared from nowhere.
  //
  // The test is therefore behavioural, not structural: do the moves replay?
  //   • yes → animate them from the standard start (fast, silent plies), and
  //     do NOT set startFen — `fenForPath` walks the same SANs.
  //   • no  → the puzzle case; load setupFen directly, no animation.
  const setupReplays = (() => {
    if (lessonSetupMoves.length === 0) return false;
    try {
      const probe = new Chess();
      for (const san of lessonSetupMoves) {
        if (!probe.move(stripSanAnnotations(san))) return false;
      }
      // The inaccuracy must also be legal from the replayed position — if it
      // is only legal from setupFen, the moves and the FEN disagree and the
      // FEN is the lesson's real anchor.
      return !!probe.move(stripSanAnnotations(lesson.inaccuracy));
    } catch {
      return false;
    }
  })();
  let rootChild: WalkthroughTreeNode = inaccuracyNode;
  if (setupReplays || !lesson.setupFen) {
    for (let i = lessonSetupMoves.length - 1; i >= 0; i -= 1) {
      const san = lessonSetupMoves[i];
      const movedBy = sideAtIndex(i);
      rootChild = {
        san,
        movedBy,
        idea: '',
        children: [{ node: rootChild }],
      };
    }
  }

  // Root wrapper.
  const root: WalkthroughTreeNode = {
    san: null,
    movedBy: null,
    idea: '',
    children: [{ node: rootChild }],
  };

  return {
    openingName: `${parentOpening.openingName}: ${lesson.name}`,
    // One-shot tree built from a punish lesson — not a cacheable
    // opening. `openingName` above is a composite display label, so
    // consumers gate on this flag before treating it as a cache key
    // (see mergeStagesFromCache + the leaf play-out prompt).
    derived: true,
    eco: parentOpening.eco,
    // Inherit board orientation from the parent opening so a black-
    // side opening's punish lessons keep Black on bottom.
    studentSide: parentOpening.studentSide,
    // Only a lesson whose moves DON'T replay loads from its FEN — a replayable
    // line animates from the standard start instead (see `setupReplays`), and
    // setting startFen too would make `fenForPath` replay the SANs on top of
    // the already-set-up position.
    startFen: setupReplays ? undefined : lesson.setupFen,
    // Spoken intro: plain teaching prose. We deliberately do NOT
    // prepend `lesson.name` — it's a terse internal label packed with
    // raw SAN ("Benoni Nge2: Nxf8?? — Qxg2#") that TTS reads aloud as
    // "knight g to e2 ... knight takes f8 question question ..." (per
    // CLAUDE.md narration rules: name the pattern, never dump SAN). The
    // label still shows on the picker tile; voice carries only framing.
    intro: setupReplays || !lesson.setupFen
      ? `Watch the line play out — then catch the moment it goes wrong.`
      : `${opponentLabel} has just played a careless move out of the opening — find the punishment.`,
    outro: lesson.whyPunish,
    root,
  };
}

/** Words per minute used for the backup-timer heuristic. Matches
 *  `walkthroughRunner` so the lesson rhythm is consistent.
 *
 *  Production audit (build 23c484d) showed 132-194 char Pirc
 *  narrations spaced 13-15s apart — the backup timer was firing
 *  while Polly was still mid-sentence and `transitionAfter()` was
 *  starting the NEXT move's speak() which stopped the in-flight
 *  audio. The 1.6x multiplier under-estimates Polly's real time
 *  because:
 *    1. chess SAN expands when spoken ("Bc5" → "bishop to c5") —
 *       roughly 50% more syllables than the raw text suggests.
 *    2. Polly Ruth runs ~140-150 wpm for chess prose, not 180.
 *    3. Multi-segment narration adds inter-segment fetch latency
 *       (~200-400ms each).
 *  Bumping multiplier 1.6 → 3.0 and MIN 1500 → 3000 gives the
 *  voice promise time to resolve first (which is the intended
 *  primary gate per CLAUDE.md). Backup remains a safety net for
 *  hung-TTS cases. */
const BACKUP_WPM = 180;
const MIN_BACKUP_MS = 3000;
const MAX_BACKUP_MS = 45_000;
const POST_NARRATION_BUFFER_MS = 400;
/** Hard ceiling on the fork's comparative bridge. It is spoken BEFORE the
 *  pick advances, so a wedged TTS promise would strand the lesson at the
 *  fork panel — past this the walk advances regardless. Generous enough that
 *  a healthy bridge (~45 words) always finishes speaking first. */
const BRIDGE_MAX_MS = 30_000;
// Watch = auto-play for LINEAR beats ("the pages need to advance
// automatically", David 2026-06-12 — that stays). A FORK is different: it is
// a decision point, and the picker WAITS for the student's choice. The old
// 4s auto-advance made the tiles vanish while David was still reading them —
// reported three times, PostHog-confirmed on the 2026-07-31 Alapin session
// ("the selections disappeared before I could pick one"). No fork timer.

function clampBackupMs(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const base = (wordCount / BACKUP_WPM) * 60_000;
  return Math.max(MIN_BACKUP_MS, Math.min(MAX_BACKUP_MS, base * 3.0));
}

/**
 * Policy-gated speak for the Learn walkthrough. Reads the user's
 * unified `coachNarration` preference on every call so a Settings
 * change mid-walkthrough takes effect on the very next step.
 *
 * - 'full'   → speak `text` via speakForced (current behavior preserved)
 * - 'brief'  → speak `shortText` when caller passed one; otherwise
 *              silent-reading-pace fallback. Authors opt into Brief
 *              narration per node/segment by populating shortIdea /
 *              shortText (see WalkthroughTreeNode + NarrationSegment).
 *              We deliberately do NOT auto-truncate `text` — random
 *              first-sentence cuts can land on a setup instead of
 *              the punchline, which is worse than silence.
 * - 'silent' → no audio. Returns a Promise that resolves at the
 *              same reading-pace voice would have settled, so the
 *              walkthrough's voice-promise-gated advance pacing is
 *              preserved.
 */
async function speakWalkthroughText(
  text: string,
  shortText?: string,
  stillCurrent?: () => boolean,
): Promise<void> {
  const prefs = useAppStore.getState().activeProfile?.preferences;
  const verbosity = resolveCoachNarration(prefs);
  if (verbosity === 'full') {
    return speakPaced(text, stillCurrent);
  }
  if (verbosity === 'brief' && shortText && shortText.trim().length > 0) {
    return speakPaced(shortText, stillCurrent);
  }
  // 'silent', or 'brief' without a short variant on this node.
  await waitInterruptibly(clampBackupMs(text), stillCurrent);
}

/** Sleep, but wake early the moment this chain is superseded.
 *
 *  A plain `setTimeout` here is what let a cancelled chain come back from the
 *  dead: the walkthrough's holds run 14-40s, and a chain paused/stopped inside
 *  one kept its place in the await and resumed narrating when the timer finally
 *  fired. Checking the guard on a short tick means a superseded chain unwinds
 *  within a tick instead of a minute. */
async function waitInterruptibly(ms: number, stillCurrent?: () => boolean): Promise<void> {
  if (!stillCurrent) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
    return;
  }
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (!stillCurrent()) return;
    const slice = Math.min(HOLD_TICK_MS, deadline - Date.now());
    await new Promise<void>((resolve) => setTimeout(resolve, slice));
  }
}

const HOLD_TICK_MS = 250;

/** Below this, a speak call CANNOT have spoken the words — no real utterance of
 *  a full sentence returns in a fraction of a second. */
const IMPOSSIBLY_FAST_MS = 300;
/** Short enough that a fast return is plausible rather than suspicious. */
const TRIVIAL_TEXT_CHARS = 40;

/**
 * Speak, and do not return before the words could physically have been said.
 *
 * THE BUG THIS FIXES (prod audit, David 2026-08-01 — "some plies repeat after
 * being played out"): auto-advance is gated on the voice promise, and this
 * treated "the speak call returned" as "the student heard it". When the voice
 * does not actually play — another surface owns the channel, Polly is not live,
 * an error is swallowed downstream — the call returns in milliseconds and the
 * gate stops gating. The stream caught exactly that: ten plies narrated in ten
 * seconds while every voice event in the window belonged to the coach GAME page
 * running in parallel, none to the walkthrough.
 *
 * This is a FLOOR, not a timer racing the voice — the ban on fallback timers
 * exists because a timer that can fire while speech is still playing cuts it
 * off. Nothing here can do that: it only ever waits AFTER the promise has
 * already resolved, and only when it resolved impossibly fast.
 */
async function speakPaced(text: string, stillCurrent?: () => boolean): Promise<void> {
  const startedAt = Date.now();
  await voiceService.speakForced(text);
  const elapsed = Date.now() - startedAt;
  if (text.trim().length <= TRIVIAL_TEXT_CHARS || elapsed >= IMPOSSIBLY_FAST_MS) return;
  // A superseded chain must not hold at all — the hold exists to stop the
  // walkthrough outrunning its own voice, and a chain nobody is listening to
  // has no voice to keep pace with. Holding anyway is what made a stopped
  // walkthrough narrate again half a minute later.
  if (stillCurrent && !stillCurrent()) return;
  const remaining = clampBackupMs(text) - elapsed;
  if (remaining <= 0) return;
  void logAppAudit({
    kind: 'coach-narration-spoken',
    category: 'narration',
    source: 'useTeachWalkthrough.speakPaced',
    summary: `voice returned in ${elapsed}ms for ${text.trim().length} chars — held ${remaining}ms so the walkthrough cannot outrun its own narration`,
  });
  await waitInterruptibly(remaining, stillCurrent);
}

export type WalkthroughPhase =
  | 'idle'
  | 'choose-mode'  // returning student: chooser between walkthrough + stages
  | 'narrating'
  | 'fork'
  | 'trap-prompt'    // inline-trap intro narrated; user picks See/Continue
  | 'trap-playing'   // trap line animating on the board
  | 'leaf'
  | 'paused'
  | 'stage-menu'  // post-leaf hub; pick which stage to do next
  | 'quiz'        // concept-check OR find-the-move OR punish (all MC)
  | 'drill';      // woodpecker — interactive board, play the line

/** Which post-walkthrough stage the user is currently in. */
export type StageKind = 'concepts' | 'findMove' | 'drill' | 'punish';

export interface UseTeachWalkthroughReturn {
  /** Current state-machine phase. */
  phase: WalkthroughPhase;
  /** True iff phase !== 'idle'. */
  isActive: boolean;
  /** The tree currently being walked, or null when idle. */
  tree: WalkthroughTree | null;
  /** The current node (the position the board shows). null when idle. */
  currentNode: WalkthroughTreeNode | null;
  /** FEN of the current position. Always valid; STARTING_FEN when idle
   *  or at root. */
  fen: string;
  /** Children of the current node, exposed for fork tap-target
   *  rendering. Empty array when not at a fork. */
  forkOptions: WalkthroughTreeChild[];
  /** True when the current node is a leaf (line ends here). */
  isLeaf: boolean;
  /** True when the user can back up to a previous fork in the path. */
  canBacktrack: boolean;
  /** SAN-joined path from root to current node — useful for outro
   *  lookup and audit trails. */
  pathSans: string[];
  /** Default leaf outro for the current leaf, with tree-level
   *  override applied if `leafOutros[pathKey]` exists. */
  leafOutro: string | null;
  /** Currently visible arrows on the board, set by the active
   *  narration segment. Empty when no segment is active or when
   *  the current segment has no arrows. Caller passes these to
   *  the NarrationArrowOverlay component. */
  narrationArrows: NarrationArrow[];
  /** Currently visible square highlights, same semantics as
   *  `narrationArrows`. */
  narrationHighlights: NarrationHighlight[];

  // ─── Stage 2-5 state (post-walkthrough pedagogy) ────────────
  /** Which stage is active. null when in walkthrough/leaf/menu. */
  activeStage: StageKind | null;
  /** Set when the student picked a stage whose entries hadn't
   *  finished generating yet. Surface uses this to render a
   *  "Loading the X stage…" indicator on the stage menu. The
   *  wait-for-load effect inside the hook resolves the jump
   *  automatically when the stage merges in. null = no pending
   *  jump. */
  pendingStageJump: StageKind | null;
  /** Clear a parked stage jump because background generation exhausted its
   *  attempts and the stage will never fill. No-op unless the given stage is
   *  the one currently parked, so a late failure for some OTHER stage can't
   *  cancel a jump that is still legitimately waiting. */
  abandonStageJump: (stage: StageKind) => void;
  /** Cancel a pending stage jump (UI's "back" / "cancel" affordance
   *  on the loading indicator). The student returns to the regular
   *  stage menu and can pick a different stage. */
  cancelPendingStageJump: () => void;
  /** Index into the active stage's question/line array. */
  stageIndex: number;
  /** For 'quiz' phase: which choice the student picked, or null
   *  if they haven't answered yet. */
  quizSelected: number | null;
  /** For 'quiz' phase: true after the student picks, before they
   *  hit "next". */
  quizShowingFeedback: boolean;
  /** For 'drill' phase: ply index into the drill line. */
  drillMoveIndex: number;
  /** For 'drill' phase: FEN at the current drill position. */
  drillFen: string;
  /** For 'drill' phase: when the student plays a wrong move, this
   *  holds the attempted SAN + the expected SAN so the UI can show
   *  feedback. null when no mistake pending. */
  drillWrongMove: { tried: string; expected: string; teaching?: string } | null;
  /** For 'drill' phase: true once the entire drill line has been
   *  played correctly. */
  drillComplete: boolean;
  /** For 'drill' phase: true once the student explicitly picked a line
   *  (dismisses the line picker even before the first student move). */
  drillLineChosen: boolean;

  /** Begin walking the given tree. Idempotent — calling start() twice
   *  with the same tree restarts from root. */
  start: (
    tree: WalkthroughTree,
    options?: {
      showChooser?: boolean;
      /** SANs the student has ALREADY watched. The walk fast-forwards through
       *  the matching prefix and begins narrating at the first move they
       *  haven't heard — so taking a Deep dive doesn't replay the opening
       *  (David 2026-07-31: "I want it to remain in place so I don't have to
       *  listen to each starting move over again"). A prefix that stops
       *  matching just means the new line diverges there, which is exactly
       *  where the teaching should resume anyway. */
      resumeFromSans?: string[];
    },
  ) => void;
  /** Pause mid-narration (user typed in chat / asked a question).
   *  Voice stops; board freezes; phase = 'paused'. */
  pause: () => void;
  /** Resume from paused state. Re-narrates the current node's idea. */
  resume: () => void;
  /** Tap a fork option. Advances down the chosen branch. */
  pickFork: (childIndex: number) => void;
  /** Back up to the most recent fork on the path. The board jumps to
   *  that position, phase becomes 'fork', tap targets reappear. */
  backtrackToLastFork: () => void;
  /** End the walkthrough entirely. Phase → 'idle'. */
  stop: () => void;
  /** Skip the current narration and immediately transition (linear
   *  → next, fork → exposed, leaf → exposed). Useful for "I get it,
   *  next" tap. */
  skipNarration: () => void;
  /** Step BACK one move and re-narrate it. David 2026-07-31: "I want to add
   *  forward and back arrows to navigate as desired." Forward is
   *  skipNarration; this is its mirror. No-op at the root. */
  stepBack: () => void;
  /** True when there is a previous move to step back to. */
  canStepBack: boolean;

  // ─── Stage 2-5 actions ──────────────────────────────────────
  /** From a leaf, transition to the stage-menu hub. */
  enterStageMenu: () => void;
  /** Start a stage from the menu. For drill, also pass the line index
   *  via selectDrillLine after; quiz stages start at index 0. */
  startStage: (stage: StageKind) => void;
  /** For drill: select which line (from tree.drill[]) to grind. */
  selectDrillLine: (lineIndex: number) => void;
  /** For quiz stages (concepts/findMove/punish): student picks a
   *  choice index. Reveals the explanation; does NOT auto-advance. */
  pickQuizChoice: (choiceIndex: number) => void;
  /** For quiz stages: advance to next question (or back to menu when
   *  all questions are done). */
  nextQuizQuestion: () => void;
  /** For drill: student attempted a SAN move on the board. Returns
   *  whether it matched the expected next move. On match, the hook
   *  auto-advances drillFen + drillMoveIndex (and plays opponent's
   *  reply if next ply is opponent's). On mismatch, sets
   *  drillWrongMove and the UI shows the correction. */
  attemptDrillMove: (san: string) => { ok: boolean };
  /** Attempt a Find-the-Move answer via the BOARD: the student
   *  drags a piece on the rendered position; we route to
   *  pickQuizChoice if the SAN matches a candidate. Returns the
   *  matched candidate index, or null if no candidate matches. */
  attemptFindMoveAnswer: (san: string) => { matchedIndex: number | null };
  /** Dismiss the wrong-move feedback and let the student try again
   *  from the same drill position. */
  acknowledgeDrillMistake: () => void;
  /** Restart the current drill line from move 0. */
  restartDrill: () => void;
  /** Skip the walkthrough entirely and land at the stage-menu hub
   *  for the given tree. Optional autoSelectStage transitions
   *  immediately into that specific stage (concepts / findMove /
   *  drill / punish) instead of showing the menu. Used when the
   *  student types "drill Vienna" / "punish Vienna" / etc. — the
   *  surface routing detects the stage keyword and jumps directly.
   *  Eliminates the "I have to play the whole opening every time
   *  just to drill" complaint. */
  startAtStageMenu: (tree: WalkthroughTree, autoSelectStage?: StageKind) => void;
  /** Report the CURRENT board view orientation. When it differs from the
   *  tree's studentSide and the narration carries flipped registers, the
   *  coach addresses the flipped color as "we" (David 2026-07-31). Call on
   *  every orientation change; takes effect on the next spoken line. */
  setViewOrientation: (color: 'white' | 'black') => void;
  /** Re-start the walkthrough from move 1 from any phase. Used by
   *  the "Watch walkthrough again" CTA on the stage menu. */
  restartWalkthrough: () => void;
  /** From any stage, return to the stage-menu hub. */
  backToStageMenu: () => void;
  /** Start a specific punish lesson as a self-contained walkthrough.
   *  Saves the current opening tree as the parent, then runs the
   *  punish lesson through the same animation engine. */
  startPunishLesson: (lessonIndex: number) => void;
  /** Exit a punish walkthrough back to the parent opening's stage
   *  menu. Restores the parent tree without re-narrating the intro. */
  exitPunishToMenu: () => void;
  /** True when we're inside a punish-walkthrough sub-flow. UI uses
   *  this to render the "Back to lessons" button instead of the
   *  default "End walkthrough" on the leaf panel. */
  isInPunishLesson: boolean;
  /** The lesson that sub-flow is running, so the leaf can offer to play
   *  THIS trap out against the coach. null outside a punish lesson. */
  activePunishLesson: PunishLesson | null;
  /** The opening we came from, for naming that play-out. null outside. */
  parentOpeningTree: WalkthroughTree | null;
  /** Refresh the optional stages (concepts / findMove / drill /
   *  punish) from Dexie cache. Used after background generation so
   *  newly-completed stages appear in the stage menu without a full
   *  page reload. Walkthrough state (pathNodes, phase) is unaffected. */
  mergeStagesFromCache: () => Promise<void>;

  // ─── Inline trap-prompt state ────────────────────────────────
  /** The PunishLesson currently being introduced (phase ===
   *  'trap-prompt') or animated (phase === 'trap-playing'). null
   *  when no trap is active. */
  pendingTrap: PunishLesson | null;
  /** Board FEN during 'trap-playing' phase. The board renderer
   *  prefers this over `fen` when set, so the trap detour shows
   *  on-board without mutating walkthrough path state. null when
   *  no trap is animating. */
  trapFen: string | null;
  /** Number of traps remaining in the current fork's queue (after
   *  the current one). UI uses this to label the Continue button
   *  ("Continue, skip these N mistakes"). */
  trapsQueuedAfter: number;
  /** User accepted the trap intro — start animating the bad move /
   *  punishment / followup. */
  acceptTrap: () => void;
  /** User declined the trap intro — move to the next queued trap
   *  (if any) or transition to the fork picker. */
  skipTrap: () => void;
}

/** Find punish lessons whose setupMoves match the walkthrough's
 *  current path EXACTLY. These are "common mistakes here" — the
 *  next move from this position is the inaccuracy. Returns [] when
 *  the tree has no punish data or no exact-match lessons. Used by
 *  the inline trap-prompt feature: when the walkthrough hits a
 *  fork node whose pathSans matches a punish lesson's setupMoves,
 *  the coach intros the trap before showing the fork picker. */
/** Exported for tests under `_findMatchingTraps` — internal use only. */
export function _findMatchingTraps(
  pathSans: string[],
  punishLessons: PunishLesson[] | undefined,
): PunishLesson[] {
  return findMatchingTraps(pathSans, punishLessons);
}
/** True when a lesson's `setupFen` is exactly the position its own `setupMoves`
 *  produce from the start — the mark of a gem, whose line IS an opening line.
 *  A puzzle-derived punish stores an unrelated mid-game FEN here, and its
 *  inaccuracy is not legal at the walkthrough's board.
 *
 *  Compared on placement + side to move only: move counters differ between a
 *  fresh replay and however the record was produced, and the board is what
 *  decides whether the move can be played. */
function fenMatchesSetupMoves(lesson: PunishLesson): boolean {
  try {
    const board = new Chess();
    for (const san of lesson.setupMoves) {
      if (!board.move(san)) return false;
    }
    const key = (f: string): string => f.split(' ').slice(0, 2).join(' ');
    return key(board.fen()) === key(lesson.setupFen ?? '');
  } catch {
    return false;
  }
}

function findMatchingTraps(
  pathSans: string[],
  punishLessons: PunishLesson[] | undefined,
): PunishLesson[] {
  if (!punishLessons || punishLessons.length === 0) return [];
  return punishLessons.filter((lesson) => {
    // Puzzle-DB-derived punishes carry setupFen (the actual lesson
    // FEN — a mid-game position from a real puzzle) and store the
    // canonical opening's PGN in setupMoves only for context-display
    // and canonical-pinning purposes. Their inaccuracy / punishment
    // SANs are LEGAL only from setupFen, not from the walkthrough's
    // current position. Auto-narrating them during the walkthrough
    // ("a common mistake here is Rxe4") is wrong because Rxe4 isn't
    // playable at the walkthrough FEN. They surface via the punish
    // stage menu instead, where startPunishLesson loads setupFen.
    // Production audit (build 3a27027): every Italian Classical
    // walkthrough fired 5 trap-prompts at the spine's leaf with
    // illegal-from-this-position SANs; user couldn't make sense of
    // it. Filter them out here.
    //
    // A GEM IS NOT A PUZZLE, AND THE DIFFERENCE IS COMPUTABLE (David 2026-08-20:
    // "I want the gem lines to be included in the teach me x opening. I haven't
    // seen that yet"). A curated gem also carries `setupFen` — but it is DERIVED
    // by playing its own `setupMoves` from the start, so it IS the position the
    // walkthrough is standing on and its inaccuracy is legal there. Rejecting
    // every lesson with a `setupFen` therefore threw out the one class of punish
    // that belongs inline, which is why no gem has ever forked out of a lesson.
    //
    // So the test is not "does it have a FEN" but "is that FEN the one its own
    // moves reach". Play them and compare — the fact is computed, not guessed
    // from the shape of the record (G0).
    if (lesson.setupFen && !fenMatchesSetupMoves(lesson)) return false;
    return (
      lesson.setupMoves.length === pathSans.length &&
      lesson.setupMoves.every((m, i) => m === pathSans[i])
    );
  });
}

/** The ACCUMULATING orange trail — the path the student just watched being
 *  played, not only the newest move.
 *
 *  This is the arrow-STYLE difference David measured between the two surfaces
 *  (2026-07-31: "program the same style of arrow as opening tab"). The opening
 *  tab's LessonPlayer pushes a trail arrow per move as a beat plays out, so a
 *  beat covering three moves leaves three orange arrows showing the road in.
 *  The coach walkthrough advances one move per node and replaced its arrow set
 *  each segment, so it only ever showed one. Rebuilding the last few plies of
 *  the walked path here matches the opening tab without changing any tree data,
 *  so every tier (masterclass, baked, computed) gets it at once. */
const TRAIL_PLIES = 3;
function trailArrowsForPath(pathSans: string[], startFen?: string): NarrationArrow[] {
  const out: NarrationArrow[] = [];
  const first = Math.max(0, pathSans.length - TRAIL_PLIES);
  for (let i = first; i < pathSans.length; i += 1) {
    const before = fenForPath(pathSans.slice(0, i), startFen);
    try {
      const c = new Chess(before);
      const mv = c.move(pathSans[i]);
      if (mv) out.push({ from: mv.from, to: mv.to, color: 'orange' });
    } catch { /* bad data is caught by validate.ts; just draw fewer arrows */ }
  }
  return out;
}

/** Compute the FEN at a node by walking chess.js through the SAN
 *  path from the root. Returns the start FEN (or standard starting
 *  position) if the path is empty. Middlegame pattern trees pass a
 *  non-default startFen so the position lands mid-game. */
function fenForPath(pathSans: string[], startFen?: string): string {
  const baseFen = startFen ?? STARTING_FEN;
  if (pathSans.length === 0) return baseFen;
  const chess = startFen ? new Chess(startFen) : new Chess();
  for (const san of pathSans) {
    try {
      chess.move(san);
    } catch {
      // Bad data — already caught by validate.ts; bail gracefully.
      return baseFen;
    }
  }
  return chess.fen();
}

/** Find the most recent ancestor of the current node whose children
 *  count is > 1. Returns the index in `pathNodes` (so caller can
 *  trim path to that point), or -1 if no fork above. */
function findLastForkIndex(pathNodes: WalkthroughTreeNode[]): number {
  for (let i = pathNodes.length - 1; i >= 0; i--) {
    if (pathNodes[i].children.length > 1) return i;
  }
  return -1;
}

/** Does the requested stage have any entries on the given tree? Used
 *  by stage-pick paths to decide between "jump now" and "wait for
 *  background gen to fill it, then jump". */
function stageHasEntries(
  stage: StageKind,
  t: WalkthroughTree | null,
): boolean {
  if (!t) return false;
  // Every stage's entries can be individually malformed when they come
  // from a legacy/shared cache that skipped `repair*Stage` — count only
  // the ones that will actually work, so the stage-menu button + auto-
  // jump never land the student on a dead tile or a crashing render
  // (David 2026-07-15, the "sweep the siblings" pass). The generator asks
  // the SAME question through the same helper, so a stage can never be
  // "present enough to skip regenerating" but "too broken to enter".
  return stageArrayHasUsableEntry(stage, t[stage]);
}

export function useTeachWalkthrough(): UseTeachWalkthroughReturn {
  const [tree, setTree] = useState<WalkthroughTree | null>(null);
  const [phase, setPhase] = useState<WalkthroughPhase>('idle');

  // Commit this visit to the teaching ledger when the student reaches a
  // leaf — the layer planned at start() is now DELIVERED, so the next
  // "teach me X" recaps it and adds the next layer (David 2026-07-31).
  useEffect(() => {
    if (phase !== 'leaf') return;
    const t = treeRef.current;
    const plan = teachingPlanRef.current;
    if (!t || t.derived || !plan || plan.opening !== t.openingName) return;
    teachingPlanRef.current = null; // once per visit
    void (async () => {
      try {
        const { recordTeachingVisit, takeawayForTree } = await import('../services/teachingLedger');
        await recordTeachingVisit(t.openingName, plan.layer, takeawayForTree(t));
      } catch { /* memory is a bonus, never a blocker */ }
    })();
  }, [phase]);
  // pathNodes[0] is always the root when active. The current node
  // is pathNodes[pathNodes.length - 1].
  const [pathNodes, setPathNodes] = useState<WalkthroughTreeNode[]>([]);
  // Arrow + highlight state, set by the currently-speaking
  // narration segment (or empty when not narrating).
  const [narrationArrows, setNarrationArrows] = useState<NarrationArrow[]>([]);
  /** Monotonic counter for the replay instrumentation above. */
  const narrationEntryRef = useRef(0);
  const [narrationHighlights, setNarrationHighlights] = useState<
    NarrationHighlight[]
  >([]);

  // Mirror tree into a ref so closures inside narrateAndAdvance can
  // read fresh tree.punish without forcing the useCallback to
  // re-create on every tree update (which would invalidate other
  // hooks that depend on narrateAndAdvance identity).
  const treeRef = useRef<WalkthroughTree | null>(null);
  treeRef.current = tree;

  // BOARD-ORIENTATION-DRIVEN REGISTER (David 2026-07-31: "if the user flips
  // the board, I want the coach to flip how it addresses the different
  // colors"). The surface reports the CURRENT view orientation; when it
  // differs from the tree's studentSide and a node/segment carries a
  // flipped register (baked narrations do), the flipped text speaks. A
  // ref, read at SPEAK time — a mid-lesson flip takes effect on the very
  // next spoken line, no re-render churn.
  // This visit's planned teaching layer (set at start, recorded at the
  // leaf) — the coach's memory of what it taught (teachingLedger).
  const teachingPlanRef = useRef<{ opening: string; layer: string } | null>(null);
  /** Opening whose recap already spoke this visit (chooser + intro both
   *  speak it — never twice in a row). */
  const recapSpokenForRef = useRef<string | null>(null);
  const viewOrientationRef = useRef<'white' | 'black' | null>(null);
  const setViewOrientation = useCallback((color: 'white' | 'black'): void => {
    viewOrientationRef.current = color;
  }, []);
  const flippedRegisterActive = useCallback((): boolean => {
    const t = treeRef.current;
    const view = viewOrientationRef.current;
    if (!t || !view) return false;
    return (t.studentSide ?? 'white') !== view;
  }, []);
  /** Pick primary vs flipped text by the live view orientation. */
  const pickRegister = useCallback(
    (primary: string, flipped: string | undefined): string =>
      flipped && flippedRegisterActive() ? flipped : primary,
    [flippedRegisterActive],
  );

  // ─── Stage 2-5 state (post-walkthrough pedagogy) ───────────
  const [activeStage, setActiveStage] = useState<StageKind | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizShowingFeedback, setQuizShowingFeedback] = useState(false);
  const [drillMoveIndex, setDrillMoveIndex] = useState(0);
  const [drillFen, setDrillFen] = useState(STARTING_FEN);
  const [drillWrongMove, setDrillWrongMove] = useState<
    { tried: string; expected: string; teaching?: string } | null
  >(null);
  const [drillComplete, setDrillComplete] = useState(false);
  // Explicit "a line was picked" marker. The picker used to infer this from
  // drillMoveIndex > 0 — which selectDrillLine left at 0, so tapping a line
  // was state-invisible and the picker never dismissed (dead tiles on prod,
  // hand-driven audit 2026-07-28).
  const [drillLineChosen, setDrillLineChosen] = useState(false);
  // Pending stage jump — set when the student picks a stage whose
  // entries haven't generated yet. The polling effect on tree
  // (mergeStagesFromCache cadence) refreshes the tree from cache; an
  // effect below watches for the pending stage to fill and then auto-
  // executes the jump. Production audit (David, 2026-05-19): picking
  // "punish" via the picker chip the moment the walkthrough started
  // landed at phase='quiz' with an empty punish[] for 50+ seconds.
  // Now: stay at 'stage-menu' (where polling is active) until the
  // stage's data is ready, then jump.
  const [pendingStageJump, setPendingStageJump] = useState<StageKind | null>(null);

  // ─── Inline trap-prompt state (offered at fork nodes) ────────
  // When the walkthrough reaches a fork whose pathSans matches one
  // or more punish-lesson setupMoves exactly, we queue those
  // lessons and narrate the first one's intro before showing the
  // fork picker. The user accepts (animates the trap detour, then
  // either chains to the next queued trap or proceeds to the fork
  // picker) or skips (advances to the next queued trap, then to
  // the fork picker).
  const [trapQueue, setTrapQueue] = useState<PunishLesson[]>([]);
  const [trapIndex, setTrapIndex] = useState(0);
  const [trapFen, setTrapFen] = useState<string | null>(null);

  // When inside a punish-walkthrough sub-flow, this holds the
  // ORIGINAL opening tree so we can return to it when the lesson
  // ends. Non-null = we're inside a punish walkthrough.
  const [parentOpeningTree, setParentOpeningTree] =
    useState<WalkthroughTree | null>(null);

  // The lesson that sub-flow is running. Kept beside the parent tree
  // rather than read back out of it by `stageIndex`, which the picker
  // moves independently — the leaf needs the lesson the student actually
  // watched, so it can offer to play THAT trap out against the coach
  // (David 2026-08-05: "then maybe a chance to play them out against the
  // coach"). Until now the leaf's only exits were "Back to lessons" and
  // "End for now": you could watch a trap, never play it.
  const [activePunishLesson, setActivePunishLesson] =
    useState<PunishLesson | null>(null);

  // Active narration cancel + backup timer refs.
  const cancelNarrationRef = useRef<(() => void) | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Monotonic id of the LIVE narration chain. Every continuation carries the
   *  id it started under and does nothing once it no longer matches — see
   *  `cleanupNarration`. */
  const runIdRef = useRef(0);
  /** Which sentence of the current node the voice had reached. `resume` picks
   *  up here instead of restarting the beat (David 2026-08-02: "the narrations
   *  keep resetting to the start of the last move"). The walkthrough pauses on
   *  every chat question AND every app backgrounding, so on a five-sentence
   *  beat a glance at another app cost the student the whole beat again. */
  const segmentCursorRef = useRef(0);
  // When transitionAfter detects a matching punish-lesson trap, the
  // original "what would happen next" (linear advance / fork picker /
  // leaf) gets stashed here so acceptTrap / skipTrap can resume the
  // walkthrough flow once the trap line finishes. Without this, every
  // trap-completed node fell through to setPhase('fork') even if the
  // node was a linear advance — interrupting the walkthrough mid-line.
  const deferredTransitionRef = useRef<(() => void) | null>(null);

  const cleanupNarration = useCallback((): void => {
    // ORPHAN EVERY IN-FLIGHT CHAIN FIRST (David 2026-08-02: beats repeating,
    // and the board resetting to the start position after "Watch the middlegame").
    //
    // Cancellation used to be spread across three partial guards — a per-node
    // `ctrl.cancelled`, the single `cancelNarrationRef` slot (which
    // `transitionAfter` nulls out while it hands off), and the identity of
    // `advanceTimerRef` — so a chain interrupted in the wrong window kept its
    // place inside an await and woke up later with nobody watching it. The
    // prod log caught all three consequences: a node narrated twice 8ms apart,
    // an aside re-firing 27s after the walk had moved two plies on, and — worst
    // — `narrateAndAdvance` running AFTER `stop()`, which set phase back to
    // 'narrating' with a null tree, so `fen` fell through to STARTING_FEN and
    // the board snapped back to move one mid-lesson.
    //
    // One monotonic token fixes all of them: bumping it here orphans every
    // continuation of every live chain at once, whatever it was awaiting.
    runIdRef.current += 1;
    if (cancelNarrationRef.current) {
      cancelNarrationRef.current();
      cancelNarrationRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    voiceService.stop();
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cleanupNarration();
    };
  }, [cleanupNarration]);

  // Mark walkthrough stage complete when student reaches a leaf.
  // Fires once per leaf-arrival; the markStageComplete service is
  // idempotent so re-marks are harmless.
  useEffect(() => {
    if (phase === 'leaf' && tree?.openingName) {
      void markStageComplete(tree.openingName, 'walkthrough');
    }
  }, [phase, tree]);

  const currentNode = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : null;
  const pathSans = useMemo(
    () => pathNodes.filter((n) => n.san !== null).map((n) => n.san as string),
    [pathNodes],
  );
  const fen = useMemo(
    () => {
      // When in a quiz stage with a question that specifies a path,
      // the board should show THAT position — not where the
      // walkthrough left off. Production audit (build c95ccc9) caught
      // the find-the-move stage rendering with the walkthrough's
      // last-move FEN (move 8 in Pirc), making the question
      // "White to play" against a position 8 moves deep — wrong board.
      if (activeStage === 'findMove') {
        const q = tree?.findMove?.[stageIndex];
        if (q && q.path && q.path.length > 0) {
          return fenForPath(q.path, tree?.startFen);
        }
        if (q) return tree?.startFen ?? STARTING_FEN;
      }
      if (activeStage === 'concepts') {
        const q = tree?.concepts?.[stageIndex];
        if (q && q.path && q.path.length > 0) {
          return fenForPath(q.path, tree?.startFen);
        }
        // Concepts often lack a path; fall back to start position
        // rather than leaving the walkthrough's leaf FEN visible.
        if (q) return tree?.startFen ?? STARTING_FEN;
      }
      // Punish MC-quiz: show the position the question is actually about — the
      // lesson's own board with the inaccuracy played. David's 2026-08-05 prod
      // run asked "What is your punishment?" over the STARTING position: this
      // branch didn't exist, so the memo fell through to `fenForPath(pathSans)`
      // with an empty path. Asking a student to punish a move they cannot see
      // is the exact class the findMove branch above was added for (c95ccc9).
      if (activeStage === 'punish') {
        const lesson = tree?.punish?.[stageIndex];
        const spot = trapPlayPosition(lesson);
        if (spot) return spot.fen;
        if (lesson?.setupFen) return lesson.setupFen;
      }
      return fenForPath(pathSans, tree?.startFen);
    },
    [pathSans, tree?.startFen, tree?.findMove, tree?.concepts, tree?.punish, activeStage, stageIndex],
  );
  const isLeaf = currentNode !== null && currentNode.children.length === 0;
  const forkOptions =
    currentNode !== null && currentNode.children.length > 1 ? currentNode.children : [];
  const canBacktrack = findLastForkIndex(pathNodes) >= 0;
  const leafOutro = useMemo(() => {
    if (!isLeaf || !tree) return null;
    const key = pathSans.join(' ');
    const override = tree.leafOutros?.[key];
    if (override) return override;
    return pickRegister(tree.outro, tree.outroFlipped);
  }, [isLeaf, tree, pathSans, pickRegister]);

  /** Speak the given node's idea, then transition based on its
   *  children. Linear → push child onto path + recurse. Fork → set
   *  phase to 'fork'. Leaf → set phase to 'leaf'.
   *
   *  Two narration paths:
   *    1. `node.narration` (segmented) — speaks each segment in
   *       sequence, setting arrows/highlights to that segment's
   *       values BEFORE speaking. Awaitable promise from the voice
   *       service drives sequential speech; arrows fire AS the
   *       coach mentions the move (the user's "real-time arrows
   *       in time with narration" requirement).
   *    2. `node.idea` (single block) — fallback when `narration` is
   *       omitted. No arrows. Same backup-timer pattern as before. */
  const narrateAndAdvance = useCallback(
    (path: WalkthroughTreeNode[], options?: { fromSegment?: number }): void => {
      cleanupNarration();
      // This chain's identity. `cleanupNarration` just bumped the counter, so
      // every chain started before this one is already orphaned; every
      // continuation below re-checks `isCurrent()` before it touches state.
      const runId = runIdRef.current;
      const isCurrent = (): boolean => runIdRef.current === runId;
      // A fresh node starts at its first sentence; only `resume` asks to pick
      // up mid-beat.
      const fromSegment = options?.fromSegment ?? 0;
      segmentCursorRef.current = fromSegment;
      const node = path[path.length - 1];
      // REPLAY INSTRUMENTATION (David 2026-07-31: beats spoken twice, and his
      // device log shows the walk returning to a node it had already left).
      // Two shapes would explain it and the log can't tell them apart: TWO
      // concurrent narration chains running ~2s offset, or ONE chain that
      // rewinds. Stamping each entry with a monotonic id + the path makes the
      // next log decisive instead of another guess.
      narrationEntryRef.current += 1;
      void logAppAudit({
        kind: 'coach-narration-spoken',
        category: 'narration',
        source: 'useTeachWalkthrough.narrateAndAdvance',
        summary: `entry #${narrationEntryRef.current} depth=${path.length} node=${node?.san ?? '(root)'} path=[${path.filter((n) => n.san).map((n) => n.san).join(' ')}]`,
      });
      setPhase('narrating');
      setPathNodes(path);
      // Clear arrows from any prior node — fresh canvas for this one.
      setNarrationArrows([]);
      setNarrationHighlights([]);

      // Common transition logic — runs after the narration finishes
      // (segmented OR single-block). Linear → recurse to next node;
      // fork → check for matching trap lessons first (offer trap
      // prompt before the fork picker if any), else show fork picker;
      // leaf → set phase 'leaf'.
      //
      // GEM-CRUSH ASIDE (David 2026-07-24 "learn plays like his videos … gem
      // lines would be extremely beneficial here!!!!"): if THIS position sits on
      // a curated punish-gem's spine, first trace the crush with ARROWS on the
      // STATIC board — the opponent's natural mistake (red) + our punish (green)
      // — and speak the present-tense line, WITHOUT advancing the board. Then
      // fall through to the real transition. Fires once per node; skip/pause
      // cancels it via cancelNarrationRef like any other narration.
      let gemAsideDone = false;
      const transitionAfter = (): void => {
        if (!isCurrent()) return;
        if (!gemAsideDone) {
          gemAsideDone = true;
          const sansSoFar = path
            .filter((n) => n.san !== null)
            .map((n) => n.san as string);
          // The delta at this move: a curated gem crush first (highest value),
          // else the ENGINE THREAT the move just created (David 2026-07-24 "add
          // engine delta to watch"). Both draw arrows on the STATIC board.
          let aside: DeltaAside | null = computeWatchGemAside(null, sansSoFar);
          if (!aside && node.san !== null && node.movedBy) {
            const fenAfter = fenForPath(sansSoFar, treeRef.current?.startFen);
            const fenBefore = fenForPath(sansSoFar.slice(0, -1), treeRef.current?.startFen);
            aside = computeThreatDelta(
              fenBefore,
              fenAfter,
              node.movedBy === 'white' ? 'w' : 'b',
            );
            // No immediate threat → teach the QUIET move's forward PLAN: where a
            // developing knight is routing (its multi-move path to a supported
            // outpost). Fills Watch's quiet-move look-ahead gap; engine-free
            // (David 2026-07-26).
            if (!aside) {
              aside = computeRouteDelta(fenBefore, node.san);
            }
          }
          if (aside) {
            // Draw the delta (gem crush or engine threat) on the current static
            // position — board never moves.
            setNarrationArrows(aside.arrows);
            void logAppAudit({
              kind: 'coach-narration-spoken',
              category: 'narration',
              source: 'useTeachWalkthrough.deltaAside',
              summary: `delta aside @[${sansSoFar.join(' ')}]: ${aside.say.slice(0, 120)}`,
            });
            const backup = setTimeout(() => {
              if (!isCurrent() || advanceTimerRef.current !== backup) return;
              advanceTimerRef.current = null;
              setNarrationArrows([]);
              transitionAfter();
            }, clampBackupMs(aside.say));
            advanceTimerRef.current = backup;
            cancelNarrationRef.current = (): void => {
              if (advanceTimerRef.current === backup) {
                clearTimeout(backup);
                advanceTimerRef.current = null;
              }
              setNarrationArrows([]);
            };
            void speakWalkthroughText(aside.say, aside.short, isCurrent)
              .catch(() => undefined)
              .then(() => {
                // Superseded (cancelled / backup already fired) → do nothing.
                if (!isCurrent() || advanceTimerRef.current !== backup) return;
                clearTimeout(backup);
                advanceTimerRef.current = null;
                setNarrationArrows([]);
                transitionAfter(); // gemAsideDone=true → falls through below
              });
            return;
          }
        }
        cancelNarrationRef.current = null;
        if (advanceTimerRef.current) {
          clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = null;
        }

        // Default transition (no traps) — what we'd do without
        // trap-prompt interception. Captured here so the trap-flow
        // can defer to it after the user skips/finishes the trap.
        const defaultTransition = (): void => {
          if (!isCurrent()) return;
          if (node.children.length === 0) {
            setPhase('leaf');
          } else if (node.children.length === 1) {
            advanceTimerRef.current = setTimeout(() => {
              if (!isCurrent()) return;
              advanceTimerRef.current = null;
              narrateAndAdvance([...path, node.children[0].node]);
            }, POST_NARRATION_BUFFER_MS);
          } else {
            // Fork: surface the picker and WAIT for the student's pick.
            // NO auto-advance — David hit this three times (2026-07-31,
            // PostHog-confirmed on the Alapin: "the selections disappeared
            // before I could pick one"; the old 4s timer barreled down the
            // main line while he was still reading the tiles). The fork is
            // a decision point; the student decides. pickFork advances,
            // skip advances, pause pauses — nothing advances on a timer.
            setPhase('fork');
          }
        };

        // Check for trap lessons matching THIS position (after the
        // current node's move was just played). Match condition:
        // lesson.setupMoves === current path SANs exactly (the next
        // move WOULD BE the inaccuracy from this position).
        //
        // Production audit (build 12d9ff3) caught the Vienna's
        // 4 punish lessons sitting at [e4 e5 Nc3 Nf6 f4 exf4 e5] —
        // but that position is a LINEAR ADVANCE in the tree (single
        // child Ng8), so the trap-prompt skipped right past it.
        // Trap detection now runs at every transition (linear AND
        // fork AND leaf), then defers to the default transition
        // when the trap-flow ends.
        const sansSoFar = path
          .filter((n) => n.san !== null)
          .map((n) => n.san as string);
        const allPunish = treeRef.current?.punish ?? [];
        const matches = findMatchingTraps(sansSoFar, allPunish);
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useTeachWalkthrough.transitionAfter',
          summary: `pos@[${sansSoFar.join(' ')}] (children=${node.children.length}) — ${matches.length}/${allPunish.length} punish lesson(s) match`,
          details:
            allPunish.length === 0
              ? 'tree has no punish lessons'
              : allPunish
                  .slice(0, 5)
                  .map(
                    (p) =>
                      `[${p.setupMoves.join(' ')}] inaccuracy=${p.inaccuracy}`,
                  )
                  .join('\n'),
        });
        if (matches.length > 0) {
          // Park the default transition so the trap-flow can run it
          // after the user is done. acceptTrap / skipTrap pop the
          // queue and call this when no traps remain.
          deferredTransitionRef.current = defaultTransition;
          setTrapQueue(matches);
          setTrapIndex(0);
          const first = matches[0];
          const intro = `Hold on — a common mistake here is ${first.inaccuracy}. ${first.whyBad} Want to see it now, or keep going with the walkthrough?`;
          const shortIntro = first.shortWhyBad
            ? `Watch out — ${first.inaccuracy} is a mistake. ${first.shortWhyBad}`
            : undefined;
          void speakWalkthroughText(intro, shortIntro, isCurrent).catch(() => undefined);
          setPhase('trap-prompt');
          return;
        }
        defaultTransition();
      };

      // ── Path 1: segmented narration with arrows ──────────────
      if (node.narration && node.narration.length > 0) {
        const segments = node.narration;
        // Use a ref-shaped object so cancellation crosses the
        // for-loop, the timeout, and the cancelNarrationRef closure
        // without ESLint thinking the boolean is invariant.
        const ctrl = { cancelled: false };
        cancelNarrationRef.current = (): void => {
          ctrl.cancelled = true;
          if (advanceTimerRef.current) {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
          }
        };
        // Backup timer covers the WHOLE node — sum of all segment
        // budgets — so a hung TTS layer can't strand us mid-node.
        const totalText = segments.map((s) => s.text).join(' ');
        const backupMs = clampBackupMs(totalText);
        advanceTimerRef.current = setTimeout(() => {
          if (ctrl.cancelled || !isCurrent()) return;
          ctrl.cancelled = true;
          transitionAfter();
        }, backupMs);

        void (async () => {
          for (let i = Math.min(fromSegment, segments.length - 1); i < segments.length; i += 1) {
            const segment = segments[i];
            if (ctrl.cancelled || !isCurrent()) return;
            segmentCursorRef.current = i;
            // Set arrows + highlights BEFORE speaking the segment so
            // the visual lands at the same moment Polly starts saying
            // the words. (Segment without `arrows` clears them; segment
            // with empty array clears them too.)
            // Trail first so the segment's own arrows (its orange move arrow
            // and any green vision arrows) win on a duplicate square pair.
            const trail = trailArrowsForPath(
              path.filter((n) => n.san !== null).map((n) => n.san as string),
              treeRef.current?.startFen,
            );
            const ownKeys = new Set((segment.arrows ?? []).map((a) => `${a.from}-${a.to}`));
            setNarrationArrows([
              ...trail.filter((t) => !ownKeys.has(`${t.from}-${t.to}`)),
              ...(segment.arrows ?? []),
            ]);
            setNarrationHighlights(segment.highlights ?? []);
            try {
              await speakWalkthroughText(
                pickRegister(segment.text, segment.textFlipped),
                pickRegister(segment.shortText ?? '', segment.shortTextFlipped) || segment.shortText,
                isCurrent,
              );
            } catch {
              // Voice errored — keep going so the narration arc
              // completes; backup timer is a safety net.
            }
          }
          if (ctrl.cancelled || !isCurrent()) return;
          // Clear arrows once the node finishes — next node sets
          // fresh arrows on its first segment.
          setNarrationArrows([]);
          setNarrationHighlights([]);
          transitionAfter();
        })();
        return;
      }

      // ── Path 2: single-block narration on `idea` ─────────────
      const idea = node.idea.trim();
      if (!idea) {
        // Root / un-narrated node — just transition based on children.
        if (node.children.length === 1) {
          narrateAndAdvance([...path, node.children[0].node]);
        } else if (node.children.length > 1) {
          // Fork with nothing to read: show the picker and WAIT for the
          // pick (no auto-advance — see the narrated-fork case above).
          setPhase('fork');
        } else {
          setPhase('leaf');
        }
        return;
      }

      // Voice + backup timer + post-narration buffer, then transition.
      let settled = false;
      const settle = (): void => {
        if (settled || !isCurrent()) return;
        settled = true;
        transitionAfter();
      };

      cancelNarrationRef.current = (): void => {
        // Caller-side cancel: don't transition; let caller manage phase.
        settled = true;
        if (advanceTimerRef.current) {
          clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = null;
        }
      };

      // Backup safety timer.
      const backupMs = clampBackupMs(idea);
      const backupTimer = setTimeout(() => {
        if (settled) return;
        settle();
      }, backupMs);
      advanceTimerRef.current = backupTimer;

      // Primary gate: voice completion.
      speakWalkthroughText(
        pickRegister(idea, node.ideaFlipped),
        pickRegister(node.shortIdea ?? '', node.shortIdeaFlipped) || node.shortIdea,
        isCurrent,
      )
        .then(() => {
          if (settled) return;
          settle();
        })
        .catch(() => {
          // Voice errored — backup timer will catch it.
        });
    },
    [cleanupNarration],
  );

  const start = useCallback(
    (
      newTree: WalkthroughTree,
      options?: { showChooser?: boolean; resumeFromSans?: string[] },
    ): void => {
      // Returning visitor flow: if the page passed showChooser=true
      // (because completion data shows the walkthrough was already
      // done on this opening), land in the chooser phase instead of
      // auto-playing the walkthrough. The student picks "Walk through
      // again" or "Pick what to learn" with explicit tap targets.
      // First-time visits skip this entirely.
      if (options?.showChooser) {
        cleanupNarration();
        setTree(newTree);
        setPathNodes([]);
        setNarrationArrows([]);
        setNarrationHighlights([]);
        setPhase('choose-mode');
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useTeachWalkthrough.start',
          summary: `chooser shown for "${newTree.openingName}" (previously completed)`,
        });
        // TEACHING MEMORY at the chooser — the RETURNING visitor is exactly
        // who the recap is for, and this path skips the intro entirely (the
        // 2026-07-31 memory probe caught the recap never firing on it).
        // Speak "last time X, today Y" over the chooser; the guard stops a
        // double-speak if they then pick "walk through again".
        if (!newTree.derived) {
          void (async () => {
            try {
              const { planTeachingVisit } = await import('../services/teachingLedger');
              const plan = await planTeachingVisit(newTree.openingName, newTree);
              teachingPlanRef.current = { opening: newTree.openingName, layer: plan.layer };
              if (plan.recap && recapSpokenForRef.current !== newTree.openingName) {
                recapSpokenForRef.current = newTree.openingName;
                await speakWalkthroughText(plan.recap, plan.recap);
              }
            } catch { /* memory is a bonus, never a blocker */ }
          })();
        }
        return;
      }
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'useTeachWalkthrough.start',
        summary: `walkthrough started: ${newTree.openingName}`,
      });
      cleanupNarration();
      setTree(newTree);

      // RESUME IN PLACE — walk the tree down the SANs already watched and
      // start narrating at the first new move. Skips the intro too: they just
      // heard this opening's introduction.
      const resumeSans = options?.resumeFromSans ?? [];
      if (resumeSans.length > 0) {
        const walked: WalkthroughTreeNode[] = [newTree.root];
        let cursor = newTree.root;
        for (const san of resumeSans) {
          const next = cursor.children.find((c) => c.node.san === san);
          if (!next) break;
          cursor = next.node;
          walked.push(cursor);
        }
        // Only worth resuming if we actually matched something AND there is
        // more line to teach; otherwise fall through to the normal start.
        if (walked.length > 1 && cursor.children.length > 0) {
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'useTeachWalkthrough.start',
            summary: `resumed in place at ply ${walked.length - 1} of ${resumeSans.length} watched — "${newTree.openingName}"`,
          });
          if (cursor.children.length === 1) {
            narrateAndAdvance([...walked, cursor.children[0].node]);
          } else {
            // A branch point right where they left off: show the picker.
            setPathNodes(walked);
            setPhase('fork');
          }
          return;
        }
      }

      // Speak the intro first if it exists, then start the tree at root.
      if (newTree.intro.trim()) {
        // Treat the intro as a virtual narration: play it before the
        // tree's first move. We fake this by speaking it then
        // transitioning into narrateAndAdvance starting at the root.
        setPathNodes([newTree.root]);
        setPhase('narrating');
        // Same run token as the per-node chains: an intro interrupted by a
        // stop / a new lesson must not walk into the old tree's root.
        const introRunId = runIdRef.current;
        const introIsCurrent = (): boolean => runIdRef.current === introRunId;
        let settled = false;
        const settle = (): void => {
          if (settled || !introIsCurrent()) return;
          settled = true;
          cancelNarrationRef.current = null;
          if (advanceTimerRef.current) {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
          }
          // After intro: walk into the root's children.
          if (newTree.root.children.length === 1) {
            narrateAndAdvance([newTree.root, newTree.root.children[0].node]);
          } else if (newTree.root.children.length > 1) {
            setPhase('fork');
          } else {
            setPhase('leaf');
          }
        };
        cancelNarrationRef.current = (): void => {
          settled = true;
          if (advanceTimerRef.current) {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
          }
        };
        const backupMs = clampBackupMs(newTree.intro);
        advanceTimerRef.current = setTimeout(() => {
          if (settled) return;
          settle();
        }, backupMs);
        // TEACHING MEMORY (David 2026-07-31: "last time we went over X,
        // today we add Y — MEMORY!!"). Code reads the per-opening ledger,
        // plans this visit's layer, and prepends the recap to the spoken
        // intro. Best-effort: a ledger error just speaks the plain intro.
        void (async () => {
          let recapPrefix = '';
          if (!newTree.derived) {
            try {
              const { planTeachingVisit } = await import('../services/teachingLedger');
              const plan = await planTeachingVisit(newTree.openingName, newTree);
              teachingPlanRef.current = { opening: newTree.openingName, layer: plan.layer };
              if (plan.recap && recapSpokenForRef.current !== newTree.openingName) {
                recapSpokenForRef.current = newTree.openingName;
                recapPrefix = `${plan.recap} `;
              }
            } catch { /* memory is a bonus, never a blocker */ }
          }
          return speakWalkthroughText(
            recapPrefix + pickRegister(newTree.intro, newTree.introFlipped),
            recapPrefix + (pickRegister(newTree.shortIntro ?? '', newTree.shortIntroFlipped) || newTree.shortIntro || ''),
            introIsCurrent,
          );
        })()
          .then(() => {
            if (settled || !introIsCurrent()) return;
            // Add the post-narration buffer.
            advanceTimerRef.current = setTimeout(() => {
              advanceTimerRef.current = null;
              settle();
            }, POST_NARRATION_BUFFER_MS);
          })
          .catch(() => {
            // Voice errored — backup timer will catch it.
          });
      } else {
        // No intro — jump straight to the root's first child.
        narrateAndAdvance([newTree.root]);
      }
    },
    [cleanupNarration, narrateAndAdvance],
  );

  const pause = useCallback((): void => {
    cleanupNarration();
    setPhase('paused');
  }, [cleanupNarration]);

  const resume = useCallback((): void => {
    if (phase !== 'paused' || pathNodes.length === 0) return;
    // Pick the beat back up where the voice was interrupted, not at its first
    // sentence — see `segmentCursorRef`.
    narrateAndAdvance(pathNodes, { fromSegment: segmentCursorRef.current });
  }, [phase, pathNodes, narrateAndAdvance]);

  const pickFork = useCallback(
    (childIndex: number): void => {
      if (pathNodes.length === 0) return;
      const node = pathNodes[pathNodes.length - 1];
      if (node.children.length <= 1) return;
      if (childIndex < 0 || childIndex >= node.children.length) return;
      const choice = node.children[childIndex];
      void logAppAudit({
        kind: 'coach-tool-callback-rejected',
        category: 'subsystem',
        source: 'useTeachWalkthrough.pickFork',
        // Reusing this kind opportunistically — there's no
        // dedicated walkthrough-fork-picked audit yet. The summary
        // distinguishes it.
        summary: `walkthrough fork picked: ${choice.label ?? '(unlabeled)'}`,
      });
      // COMPARATIVE BRIDGE (David 2026-07-31: "narration that explains
      // similarities and differences between what was already learned vs
      // what is new"). All facts COMPUTED (G0): the shared trunk IS the
      // similarity, the fork IS the difference. Spoken at the divergence
      // moment, only on a sideline pick, only when the ledger says the
      // student has been taught this opening before. Best-effort: any
      // failure just advances without the bridge.
      const t = treeRef.current;
      const mainChoice = node.children[0];
      if (choice !== mainChoice && t && !t.derived) {
        void (async () => {
          // The bridge is a BONUS spoken before the pick advances — so it can
          // never be allowed to strand the lesson at the fork. A rejected
          // speak is already caught; a speak promise that never SETTLES (a
          // wedged TTS stream) would leave narrateAndAdvance unreachable and
          // the student staring at a dead fork panel. Bound it.
          const bounded = (p: Promise<void>): Promise<void> =>
            Promise.race([p, new Promise<void>((r) => setTimeout(r, BRIDGE_MAX_MS))]);
          try {
            const { getTeachingVisits } = await import('../services/teachingLedger');
            const visits = await getTeachingVisits(t.openingName);
            if (visits.length > 0 && mainChoice.node.san && choice.node.san) {
              // BAKED bridge first (richer per-opening prose from the video
              // corpus, gated offline — David 2026-07-31). `mainSan` must
              // match the live fork's main choice, or the bake was built
              // against a different fork shape and the computed v1 speaks.
              let spoke = false;
              try {
                const walkedSans = pathNodes.map((n) => n.san).filter((s): s is string => !!s);
                const bakedBridge = bakedNarrationFor(t.openingName, walkedSans)?.bridges?.[choice.node.san];
                if (bakedBridge && bakedBridge.mainSan === mainChoice.node.san) {
                  await bounded(speakWalkthroughText(
                    pickRegister(bakedBridge.text, bakedBridge.textFlipped),
                    pickRegister(bakedBridge.shortText ?? '', bakedBridge.shortTextFlipped) || bakedBridge.shortText,
                  ));
                  spoke = true;
                }
              } catch { /* baked lookup is best-effort — v1 below */ }
              if (!spoke) {
                const knownLabel = /^main line/i.test(mainChoice.label ?? '')
                  ? 'the main line you know'
                  : (mainChoice.label ?? 'the line you know');
                const bridge = `A quick bridge first. Everything to this position is the same road we walked before — that part you already own. Right here is where the stories split: ${knownLabel} plays ${mainChoice.node.san}, and today's line answers ${choice.node.san} instead. One choice, and the plans change — watch what that single move does to the position.`;
                await bounded(speakWalkthroughText(bridge, `Same road until here — ${choice.node.san} instead of ${mainChoice.node.san}.`));
              }
            }
          } catch { /* bridge is a bonus, never a blocker */ }
          narrateAndAdvance([...pathNodes, choice.node]);
        })();
        return;
      }
      narrateAndAdvance([...pathNodes, choice.node]);
    },
    [pathNodes, narrateAndAdvance, pickRegister],
  );

  const backtrackToLastFork = useCallback((): void => {
    const idx = findLastForkIndex(pathNodes);
    if (idx < 0) return;
    cleanupNarration();
    setPathNodes(pathNodes.slice(0, idx + 1));
    setPhase('fork');
  }, [pathNodes, cleanupNarration]);

  // Move to the next queued trap (if any) or fall through to the
  // fork picker. Used by both skipTrap and the post-acceptTrap
  // continuation. Pulled out so both share the same logic.
  const advancePastTrap = useCallback((): void => {
    setTrapIndex((prev) => {
      const next = prev + 1;
      const queue = trapQueue;
      if (next < queue.length) {
        const lesson = queue[next];
        const intro = `Another common mistake here is ${lesson.inaccuracy}. ${lesson.whyBad} Want to see this one too?`;
        const shortIntro = lesson.shortWhyBad
          ? `Also watch out — ${lesson.inaccuracy}. ${lesson.shortWhyBad}`
          : undefined;
        void speakWalkthroughText(intro, shortIntro).catch(() => undefined);
        setPhase('trap-prompt');
        return next;
      }
      // No more traps queued — resume the walkthrough's intended
      // transition for the node where the traps fired (linear advance
      // / fork picker / leaf). transitionAfter stashed this in the
      // ref before kicking off the trap-flow.
      setTrapQueue([]);
      setTrapFen(null);
      const deferred = deferredTransitionRef.current;
      deferredTransitionRef.current = null;
      if (deferred) {
        deferred();
      } else {
        // Fallback when no deferred transition was captured (legacy
        // entry point or edge case) — old behavior of jumping to fork.
        setPhase('fork');
      }
      return 0;
    });
  }, [trapQueue]);

  const skipTrap = useCallback((): void => {
    voiceService.stop();
    advancePastTrap();
  }, [advancePastTrap]);

  const acceptTrap = useCallback((): void => {
    if (trapQueue.length === 0) return;
    const lesson = trapQueue[trapIndex];
    if (!lesson) {
      setPhase('fork');
      return;
    }
    voiceService.stop();
    setPhase('trap-playing');
    // Animate the bad-move → punishment → followup sequence on the
    // board via trapFen overrides. Each step waits for the voice
    // promise to resolve before the next animates, so narration
    // and animation stay in sync. After the sequence, snap back
    // (trapFen → null reverts the board to fenForPath(pathSans))
    // and either prompt the next queued trap or show fork picker.
    void (async (): Promise<void> => {
      try {
        const startFen = fenForPath(
          lesson.setupMoves,
          treeRef.current?.startFen,
        );
        const c = new Chess(startFen);
        const speakAndWait = async (text: string, shortText?: string): Promise<void> => {
          if (!text.trim()) return;
          try {
            await speakWalkthroughText(text, shortText);
          } catch {
            // Voice errors don't block the animation arc.
          }
        };
        // 1. Inaccuracy.
        try {
          c.move(lesson.inaccuracy);
        } catch {
          // Repair should have caught this, but bail safely if not.
          setTrapFen(null);
          setPhase('fork');
          return;
        }
        setTrapFen(c.fen());
        await speakAndWait(
          `${lesson.inaccuracy} — ${lesson.whyBad}`,
          lesson.shortWhyBad ? `${lesson.inaccuracy} — ${lesson.shortWhyBad}` : undefined,
        );
        // 2. Punishment. Whose advantage this is gets fixed HERE — the side
        // that plays the punishing move — not read off the turn later, which
        // flips with every followup ply.
        const punisher: 'w' | 'b' = c.turn();
        try {
          c.move(lesson.punishment);
        } catch {
          setTrapFen(null);
          advancePastTrap();
          return;
        }
        setTrapFen(c.fen());
        await speakAndWait(
          `${lesson.punishment} — ${lesson.whyPunish}`,
          lesson.shortWhyPunish ? `${lesson.punishment} — ${lesson.shortWhyPunish}` : undefined,
        );
        // 3. Followup (optional).
        if (lesson.followup && lesson.followup.length > 0) {
          for (const fm of lesson.followup) {
            try {
              c.move(fm.san);
            } catch {
              break;
            }
            setTrapFen(c.fen());
            await speakAndWait(
              `${fm.san} — ${fm.idea}`,
              fm.shortIdea ? `${fm.san} — ${fm.shortIdea}` : undefined,
            );
          }
        }
        // 3b. PLAY THE ADVANTAGE OUT (David 2026-08-01: "it needs to play
        // out"). A gem-sourced lesson already ends where the material is on
        // the board, but a puzzle-derived one stops wherever the puzzle's
        // solution ended — often mid-recapture, so the student is told they
        // won something they never saw arrive. Walk on with best play until
        // the position is quiet and the material is actually there.
        //
        // Costs nothing the student notices: `advantageAlreadyShown` skips the
        // engine entirely in the common case, and when it does run, each ply
        // is computed while the previous one is still being spoken.
        try {
          if (!advantageAlreadyShown(c.fen(), punisher)) {
            const { steps, terminus } = await playOutPunish(c.fen(), punisher);
            for (const step of steps) {
              try {
                c.move(step.san);
              } catch {
                break;
              }
              setTrapFen(c.fen());
              await speakAndWait(`${step.san} — ${step.idea}`, `${step.san} — ${step.shortIdea}`);
            }
            if (steps.length > 0) {
              void logAppAudit({
                kind: 'coach-surface-migrated',
                category: 'subsystem',
                source: 'useTeachWalkthrough.acceptTrap',
                summary: `punish played out ${steps.length} extra ply(s) to "${terminus}" — ${lesson.name}`,
              });
            }
          }
        } catch {
          // The play-out is an enhancement; never let it break the lesson.
        }
        // 4. Snap back; advance to next queued trap or fork picker.
        setTrapFen(null);
        advancePastTrap();
      } catch {
        setTrapFen(null);
        setPhase('fork');
      }
    })();
  }, [trapQueue, trapIndex, advancePastTrap]);

  const stop = useCallback((): void => {
    cleanupNarration();
    setTree(null);
    setPathNodes([]);
    setPhase('idle');
    setNarrationArrows([]);
    setNarrationHighlights([]);
    setTrapQueue([]);
    setTrapIndex(0);
    setTrapFen(null);
    setPendingStageJump(null);
    deferredTransitionRef.current = null;
  }, [cleanupNarration]);

  const stepBack = useCallback((): void => {
    // pathNodes[0] is the root (no move), so a real previous move needs 3+.
    if (pathNodes.length < 3) return;
    cleanupNarration();
    voiceService.stop();
    narrateAndAdvance(pathNodes.slice(0, -1));
  }, [pathNodes, cleanupNarration, narrateAndAdvance]);

  const skipNarration = useCallback((): void => {
    if (phase !== 'narrating') return;
    if (cancelNarrationRef.current) {
      cancelNarrationRef.current();
      cancelNarrationRef.current = null;
    }
    voiceService.stop();
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    // Manually transition based on current node's children.
    if (pathNodes.length === 0) return;
    const node = pathNodes[pathNodes.length - 1];
    if (node.children.length === 0) {
      setPhase('leaf');
    } else if (node.children.length === 1) {
      narrateAndAdvance([...pathNodes, node.children[0].node]);
    } else {
      // Skipping ONTO a fork: show the picker and WAIT for the pick
      // (no auto-advance — see the narrated-fork case above).
      setPhase('fork');
    }
  }, [phase, pathNodes, narrateAndAdvance]);

  // ─── Stage 2-5 methods ─────────────────────────────────────
  const resetStageState = useCallback((): void => {
    setActiveStage(null);
    setStageIndex(0);
    setQuizSelected(null);
    setQuizShowingFeedback(false);
    setDrillMoveIndex(0);
    setDrillFen(STARTING_FEN);
    setDrillWrongMove(null);
    setDrillComplete(false);
  }, []);

  /** Pull the latest version of the current opening from Dexie cache
   *  and merge in any optional stages (concepts / findMove / drill /
   *  punish) that have been background-generated since the tree was
   *  first loaded. The walkthrough state (pathNodes, phase, etc.)
   *  stays unchanged — only the optional arrays update. Called when
   *  the student opens the stage menu so background-completed stages
   *  appear as cards if they finished while the walkthrough played. */
  const mergeStagesFromCache = useCallback(async (): Promise<void> => {
    // Read the tree from the REF, not the closure. `generateMissingStagesInBackground`
    // captures its `onStageMerged` callback at submit time — when the walkthrough
    // has not started and `tree` is still null — so a closure-read here made the
    // post-merge refresh a guaranteed no-op ("Punish lessons just loaded" fired,
    // nothing merged). The ref is always current whichever render's copy is called.
    const tree = treeRef.current;
    if (!tree?.openingName) return;
    // Look the entry up by the key it was CACHED under, not by the canonical
    // line it teaches. Those differ ("Vienna" vs "Vienna Game"), and reading by
    // openingName is why background-generated stages never reached the running
    // tree — the audit stream showed "merged punish (5 entries) into cached
    // \"Vienna\"" while the surface sat on "Loading trap lines…" forever.
    const lookupName = tree.cacheKey ?? tree.openingName;
    // Derived trees (punish one-shots) have a composite display name,
    // not a cache key — looking it up is a guaranteed miss that just
    // noises the audit stream ("cache miss → fresh generation"). They
    // carry no opening stages to merge anyway.
    if (tree.derived) return;
    try {
      const fresh = await getCachedOpening(lookupName);
      if (!fresh) return;
      // Merge a stage when the CACHE has one the student could actually be
      // shown and the running tree does not.
      //
      // This asked `length > 0` on both sides until 2026-08-04, which was the
      // THIRD place that mistook "the array is non-empty" for "the stage
      // exists" — and the one that survived the first fix. A tree holding a
      // non-empty but entirely UNSTARTABLE punish array counted as "already
      // have it", so freshly regenerated, perfectly good lessons were refused
      // (`cachePunish && !havePunish` → false), the tree never changed, and a
      // parked stage jump waited forever on a merge that was being declined
      // every poll. Found on prod: the transcript said "Punish (trap) lessons
      // just loaded" while the surface sat on "Hang tight…".
      //
      // Usability is the only sane test here: replacing broken entries with
      // working ones is exactly what this merge is for.
      const upgrade = (s: StageKind): boolean =>
        stageArrayHasUsableEntry(s, fresh[s]) && !stageArrayHasUsableEntry(s, tree[s]);
      const takeConcepts = upgrade('concepts');
      const takeFindMove = upgrade('findMove');
      const takeDrill = upgrade('drill');
      const takePunish = upgrade('punish');
      const upgradable = [
        takeConcepts && 'concepts',
        takeFindMove && 'findMove',
        takeDrill && 'drill',
        takePunish && 'punish',
      ].filter(Boolean);
      if (upgradable.length > 0) {
        setTree((prev) =>
          prev
            ? {
                ...prev,
                concepts: takeConcepts ? fresh.concepts : prev.concepts,
                findMove: takeFindMove ? fresh.findMove : prev.findMove,
                drill: takeDrill ? fresh.drill : prev.drill,
                punish: takePunish ? fresh.punish : prev.punish,
              }
            : prev,
        );
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useTeachWalkthrough.mergeStagesFromCache',
          summary: `merged usable stages from cache: ${upgradable.join(', ')}`,
        });
      }
    } catch {
      // Cache fetch failures are non-fatal; user just sees what they had.
    }
  }, [tree]);

  const enterStageMenu = useCallback((): void => {
    cleanupNarration();
    resetStageState();
    setPhase('stage-menu');
    // Pick up any background-generated stages that completed while
    // the walkthrough played. Non-blocking; the menu renders with
    // current data immediately and re-renders when the merge resolves.
    void mergeStagesFromCache();
  }, [cleanupNarration, resetStageState, mergeStagesFromCache]);

  /** Skip the walkthrough entirely and load straight into the stage
   *  menu (or a specific stage if autoSelectStage is provided). Used
   *  by the surface routing's stage-keyword detection ("drill Vienna"
   *  / "Vienna punish" / etc.) so a returning student doesn't have
   *  to sit through the walkthrough to access drills/punishes/etc.
   *
   *  When autoSelectStage is given but the requested stage's
   *  entries are still being generated (background gen in flight),
   *  the call lands at 'stage-menu' with `pendingStageJump` set;
   *  the wait-for-load effect below executes the jump once the
   *  stage merges in. This means a user can pick "punish" the
   *  moment the lesson starts and the surface waits + jumps
   *  cleanly instead of dropping them in an empty quiz phase. */
  const startAtStageMenu = useCallback(
    (newTree: WalkthroughTree, autoSelectStage?: StageKind): void => {
      cleanupNarration();
      setTree(newTree);
      setPathNodes([]);
      setNarrationArrows([]);
      setNarrationHighlights([]);
      resetStageState();
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'useTeachWalkthrough.startAtStageMenu',
        summary: `skipped walkthrough; landed at ${autoSelectStage ?? 'stage-menu'} for "${newTree.openingName}"`,
      });
      if (autoSelectStage) {
        const hasEntries = stageHasEntries(autoSelectStage, newTree);
        if (hasEntries) {
          setActiveStage(autoSelectStage);
          setStageIndex(0);
          setQuizSelected(null);
          setQuizShowingFeedback(false);
          setPendingStageJump(null);
          setPhase(autoSelectStage === 'drill' ? 'drill' : 'quiz');
        } else {
          // Background gen still running for this stage. Land at
          // the stage menu (polling is active there) and queue the
          // jump for when mergeStagesFromCache fills the stage.
          setPendingStageJump(autoSelectStage);
          setPhase('stage-menu');
          void mergeStagesFromCache();
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'useTeachWalkthrough.startAtStageMenu',
            summary: `queued auto-jump to "${autoSelectStage}" — stage not yet generated for "${newTree.openingName}"`,
          });
        }
      } else {
        setPendingStageJump(null);
        setPhase('stage-menu');
        void mergeStagesFromCache();
      }
    },
    [cleanupNarration, resetStageState, mergeStagesFromCache],
  );

  /** Re-run the walkthrough from move 1. Used by the chooser's
   *  "Walk through it again" button. Doesn't re-show the chooser —
   *  forces straight into narrating phase. */
  const restartWalkthrough = useCallback((): void => {
    if (!tree) return;
    // Re-call start without showChooser to force the walkthrough.
    start(tree);
  }, [tree, start]);

  const backToStageMenu = useCallback((): void => {
    cleanupNarration();
    setActiveStage(null);
    setStageIndex(0);
    setQuizSelected(null);
    setQuizShowingFeedback(false);
    setDrillWrongMove(null);
    setDrillComplete(false);
    setDrillLineChosen(false);
    setPendingStageJump(null);
    setPhase('stage-menu');
  }, [cleanupNarration]);

  const cancelPendingStageJump = useCallback((): void => {
    setPendingStageJump(null);
  }, []);

  const startStage = useCallback(
    (stage: StageKind): void => {
      cleanupNarration();
      // Wait-for-load: if the requested stage's entries haven't
      // generated yet, queue the jump and stay on the stage menu
      // (where polling is active) until mergeStagesFromCache fills
      // it in. Production audit (David, 2026-05-19): clicking the
      // punish stage cold dropped the user into an empty quiz phase
      // for 50+ seconds. Now: visible wait + clean jump when ready.
      if (!stageHasEntries(stage, treeRef.current)) {
        setPendingStageJump(stage);
        setActiveStage(null);
        setStageIndex(0);
        setQuizSelected(null);
        setQuizShowingFeedback(false);
        setPhase('stage-menu');
        void mergeStagesFromCache();
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useTeachWalkthrough.startStage',
          summary: `queued auto-jump to "${stage}" — stage not yet generated`,
        });
        return;
      }
      setPendingStageJump(null);
      setActiveStage(stage);
      setStageIndex(0);
      setQuizSelected(null);
      setQuizShowingFeedback(false);
      if (stage === 'drill') {
        // Drill needs a line selection; UI shows the line picker
        // while phase is 'drill' but stageIndex/drillFen are stale
        // until selectDrillLine is called.
        setDrillMoveIndex(0);
        setDrillFen(STARTING_FEN);
        setDrillComplete(false);
        setDrillLineChosen(false);
        setPhase('drill');
      } else {
        setPhase('quiz');
      }
    },
    [cleanupNarration, mergeStagesFromCache],
  );

  // Wait-for-load effect: when a stage jump is pending and the
  // stage's entries become available (via mergeStagesFromCache
  // polling that fires from CoachTeachPage's interval), execute the
  // queued jump. This is what completes the David-flagged
  // freedom-of-choice flow: pick punish cold → see "loading the
  // punish lessons…" → board jumps to punish the instant they merge.
  useEffect(() => {
    if (!pendingStageJump) return;
    if (!stageHasEntries(pendingStageJump, tree)) return;
    const stage = pendingStageJump;
    setPendingStageJump(null);
    setActiveStage(stage);
    setStageIndex(0);
    setQuizSelected(null);
    setQuizShowingFeedback(false);
    if (stage === 'drill') {
      setDrillMoveIndex(0);
      setDrillFen(STARTING_FEN);
      setDrillComplete(false);
      setDrillLineChosen(false);
      setPhase('drill');
    } else {
      setPhase('quiz');
    }
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'useTeachWalkthrough.pendingStageJump.resolved',
      summary: `pending stage "${stage}" filled — executing auto-jump`,
    });
  }, [pendingStageJump, tree]);

  /** Give up on a parked stage jump: background generation ran out of attempts
   *  and this stage will never fill for this opening. Without this the student
   *  sits on the "loading…" state forever (David 2026-08-04, "teach me the
   *  traps in X just keeps loading"). Clearing it drops them back to the stage
   *  menu, where the surface says so plainly and the other stages still work. */
  const abandonStageJump = useCallback((stage: StageKind): void => {
    setPendingStageJump((current) => {
      if (current !== stage) return current;
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'useTeachWalkthrough.pendingStageJump.abandoned',
        summary: `stage "${stage}" produced nothing startable — clearing the parked jump`,
      });
      return null;
    });
  }, []);

  const selectDrillLine = useCallback(
    (lineIndex: number): void => {
      if (!tree?.drill || lineIndex < 0 || lineIndex >= tree.drill.length) {
        return;
      }
      // Never enter a malformed cached line (no `moves`) — same guard as
      // the picker + attemptDrillMove (David 2026-07-15 sibling sweep).
      const line = tree.drill[lineIndex];
      if (!isValidDrillLine(line)) return;
      setStageIndex(lineIndex);
      // Auto-play any LEADING opponent moves so the student always faces
      // THEIR move first. A Black-side line (Sicilian/Caro/French/…) starts
      // with White's move — before this, nothing played it: the picker never
      // dismissed (selection left drillMoveIndex at 0, the picker's "no line
      // active" signature) and the drill sat at the start position waiting
      // for the student to play the OPPONENT's move. Hand-driven prod audit
      // 2026-07-28: the Dragon drill tiles were dead buttons.
      const lead = leadingDrillPosition(line);
      setDrillMoveIndex(lead.index);
      setDrillFen(lead.fen);
      setDrillWrongMove(null);
      setDrillComplete(false);
      setDrillLineChosen(true);
    },
    [tree],
  );

  const pickQuizChoice = useCallback((choiceIndex: number): void => {
    setQuizSelected(choiceIndex);
    setQuizShowingFeedback(true);
  }, []);

  const nextQuizQuestion = useCallback((): void => {
    if (!tree || !activeStage) return;
    const arr =
      activeStage === 'concepts' ? tree.concepts
      : activeStage === 'findMove' ? tree.findMove
      : activeStage === 'punish' ? tree.punish
      : null;
    if (!arr) return;
    const next = stageIndex + 1;
    if (next >= arr.length) {
      // Stage complete — record progress, then back to menu.
      if (tree.openingName) {
        void markStageComplete(tree.openingName, activeStage);
      }
      backToStageMenu();
    } else {
      setStageIndex(next);
      setQuizSelected(null);
      setQuizShowingFeedback(false);
    }
  }, [tree, activeStage, stageIndex, backToStageMenu]);

  /** Attempt a Find-the-Move answer via the BOARD instead of tapping
   *  a multiple-choice tile. The student drags a piece on the
   *  rendered position; we look up the candidate whose SAN matches
   *  (case-insensitive after stripping annotation marks) and route
   *  to pickQuizChoice with that candidate's index. Returns the
   *  matched index, or null if no candidate matches. User: "Find
   *  the move should be able to move the piece on the board as
   *  another way to get the right answer." */
  const attemptFindMoveAnswer = useCallback(
    (san: string): { matchedIndex: number | null } => {
      if (!tree?.findMove || phase !== 'quiz' || activeStage !== 'findMove') {
        return { matchedIndex: null };
      }
      if (stageIndex < 0 || stageIndex >= tree.findMove.length) {
        return { matchedIndex: null };
      }
      if (quizSelected !== null) {
        return { matchedIndex: null };
      }
      const q = tree.findMove[stageIndex];
      const norm = stripSanAnnotations(san).toLowerCase();
      const idx = q.candidates.findIndex(
        (c) => stripSanAnnotations(c.san).toLowerCase() === norm,
      );
      if (idx < 0) return { matchedIndex: null };
      setQuizSelected(idx);
      setQuizShowingFeedback(true);
      return { matchedIndex: idx };
    },
    [tree, phase, activeStage, stageIndex, quizSelected],
  );

  /** Attempt a drill move. Returns ok=true on match (advances state),
   *  ok=false on mismatch (sets drillWrongMove for UI feedback). */
  const attemptDrillMove = useCallback(
    (san: string): { ok: boolean } => {
      if (!tree?.drill || phase !== 'drill') return { ok: false };
      if (stageIndex < 0 || stageIndex >= tree.drill.length) {
        return { ok: false };
      }
      const line = tree.drill[stageIndex];
      // Defend against a malformed cached drill line (no `moves` array) —
      // same failure class as the punish/quiz sweep (David 2026-07-15).
      if (!isValidDrillLine(line)) return { ok: false };
      const studentSide = line.studentSide ?? 'white';
      // Determine which moves in the line are the student's.
      // Even-indexed moves (0, 2, 4...) are white's; odd are black's.
      // If studentSide is 'white', student plays even indices.
      if (drillMoveIndex < 0 || drillMoveIndex >= line.moves.length) {
        return { ok: false };
      }
      const expected = line.moves[drillMoveIndex];

      if (san !== expected) {
        // Port of the review's better-move "why" (task #26 Phase B): don't just
        // flag the miss — teach WHY the right move is right and what the played
        // move let slip. Pure board facts (G0/G3 — no LLM, no engine); the
        // student IS the mover in a drill, so the "your move" seat framing is
        // correct. Null → silent correction that still shows the move.
        const teaching = buildDrillWrongTeaching(drillFen, san, expected) ?? undefined;
        setDrillWrongMove({ tried: san, expected, teaching });
        // Voice the correction honoring the verbosity gate (G5): full/brief
        // speak, silent stays silent. A wrong-answer correction is a sanctioned
        // voiced teaching moment even in an otherwise-silent drill (plan #3).
        if (teaching) void speakWalkthroughText(teaching, teaching);
        // BETTER-LINE WALKOUT (David 2026-07-26): upgrade Learn's thinner
        // wrong-answer text to Review's PLAYED-OUT better line (Danya's #1 habit).
        // The correct continuation is the drill's OWN line (no engine): play it
        // out on the board move-by-move with a spoken why on the student's moves,
        // then reset to the retry position. Reuses cancelNarrationRef so pause /
        // skip / navigation cancels it (same mechanism as the delta asides).
        const walkoutSteps = buildDrillBetterLine(drillFen, line.moves, drillMoveIndex);
        if (walkoutSteps.length > 0) {
          const savedDrillFen = drillFen;
          let walkoutCancelled = false;
          cancelNarrationRef.current = (): void => {
            walkoutCancelled = true;
            setDrillFen(savedDrillFen);
          };
          const playWalkoutStep = async (k: number): Promise<void> => {
            if (walkoutCancelled) return;
            if (k >= walkoutSteps.length) {
              setDrillFen(savedDrillFen); // back to the retry position
              return;
            }
            setDrillFen(walkoutSteps[k].fen);
            const why = walkoutSteps[k].why;
            if (why) {
              try { await speakWalkthroughText(why, why); } catch { /* voice off */ }
            } else {
              await new Promise((resolve) => setTimeout(resolve, 650));
            }
            if (!walkoutCancelled) void playWalkoutStep(k + 1);
          };
          // Let the correction be heard first, then walk the line out.
          void (async (): Promise<void> => {
            await new Promise((resolve) => setTimeout(resolve, 900));
            if (!walkoutCancelled) void playWalkoutStep(0);
          })();
        }
        return { ok: false };
      }

      // Correct! Advance the drillFen by playing this move.
      const probe = new Chess(drillFen);
      try {
        probe.move(san);
      } catch {
        return { ok: false };
      }
      let nextFen = probe.fen();
      let nextIndex = drillMoveIndex + 1;

      // If the next move is the OPPONENT's, auto-play it.
      const isStudentMove = (idx: number): boolean => {
        const isWhitesMove = idx % 2 === 0;
        return studentSide === 'white' ? isWhitesMove : !isWhitesMove;
      };

      // Capture the position right before the LAST opponent reply so a threat it
      // creates can be spotted (SPOT-IT into Learn, David 2026-07-26).
      let fenBeforeLastOpp: string | null = null;
      while (nextIndex < line.moves.length && !isStudentMove(nextIndex)) {
        const opponentSan = line.moves[nextIndex];
        try {
          fenBeforeLastOpp = probe.fen();
          probe.move(opponentSan);
          nextFen = probe.fen();
          nextIndex += 1;
        } catch {
          break;
        }
      }

      setDrillFen(nextFen);
      setDrillMoveIndex(nextIndex);
      setDrillWrongMove(null);

      if (nextIndex >= line.moves.length) {
        setDrillComplete(true);
        if (tree.openingName) {
          void markStageComplete(tree.openingName, 'drill');
        }
        // POSITIONAL PLAN into Learn (David 2026-07-26): at the natural pause where
        // the taught line ends, hand the student the top forward plan for the
        // reached position — board-derived (G0), student's POV, honors the
        // verbosity gate. Null (early/quiet position) → silence.
        const plan = buildDrillCompletionPlan(nextFen, studentSide);
        if (plan) void speakWalkthroughText(plan, plan);
      } else if (fenBeforeLastOpp) {
        // SPOT-IT into Learn (David 2026-07-26): the opponent's reply just
        // auto-played — if it created a concrete threat against the student, teach
        // the PATTERN to see it coming (recognition), student-as-victim register.
        const spot = buildDrillThreatSpot(fenBeforeLastOpp, nextFen, studentSide);
        if (spot) void speakWalkthroughText(spot, spot);
      }

      return { ok: true };
    },
    [tree, phase, stageIndex, drillMoveIndex, drillFen],
  );

  const acknowledgeDrillMistake = useCallback((): void => {
    setDrillWrongMove(null);
  }, []);

  const restartDrill = useCallback((): void => {
    // Restart re-plays the line's leading opponent moves too — resetting a
    // Black-side line to the bare start position would re-strand the student
    // on the opponent's turn (same bug selectDrillLine had).
    const line = tree?.drill?.[stageIndex];
    if (line && isValidDrillLine(line)) {
      const lead = leadingDrillPosition(line);
      setDrillMoveIndex(lead.index);
      setDrillFen(lead.fen);
    } else {
      setDrillMoveIndex(0);
      setDrillFen(STARTING_FEN);
    }
    setDrillWrongMove(null);
    setDrillComplete(false);
  }, [tree, stageIndex]);

  /** Start a specific punish lesson as a self-contained walkthrough.
   *  Saves the current (parent) tree, then `start()`s a freshly-built
   *  punish walkthrough tree. The walkthrough plays the setup, the
   *  inaccuracy, and pauses at a fork for the student to pick the
   *  punishment from candidates. After the leaf (whichever path),
   *  the leaf panel offers "Back to lessons" to call exitPunishToMenu. */
  const startPunishLesson = useCallback(
    (lessonIndex: number): void => {
      if (!tree?.punish) return;
      if (lessonIndex < 0 || lessonIndex >= tree.punish.length) return;
      const lesson = tree.punish[lessonIndex];
      // Belt-and-suspenders: the picker only surfaces startable lessons,
      // but never launch (and never crash the walkthrough engine) on a
      // malformed one that slipped through (David 2026-07-15).
      if (!isStartablePunishLesson(lesson)) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'useTeachWalkthrough.startPunishLesson',
          summary: `skipped unstartable punish lesson [${lessonIndex}] "${lesson?.name ?? '?'}"`,
        });
        return;
      }
      const punishTree = buildPunishWalkthroughTree(lesson, tree);
      // Stash the parent so we can return to it on exit.
      setParentOpeningTree(tree);
      setActivePunishLesson(lesson);
      // Track which lesson we're on so the "next/prev" UI can advance.
      setStageIndex(lessonIndex);
      // Run the punish tree through the same engine as the opening
      // walkthrough — animations, narration, fork picker, leaf panel.
      start(punishTree);
    },
    [tree, start],
  );

  /** Exit a punish walkthrough back to the stage menu of the parent
   *  opening. Restores the parent tree and resets walkthrough state
   *  so the student lands at the stage menu (with checkmarks
   *  reflecting the latest progress). */
  const exitPunishToMenu = useCallback((): void => {
    const parent = parentOpeningTree;
    if (!parent) {
      // Not inside a punish lesson — fall back to stage-menu transition.
      backToStageMenu();
      return;
    }
    cleanupNarration();
    setParentOpeningTree(null);
    setActivePunishLesson(null);
    // Restore the parent tree's state. We can't call start() on
    // parent because that would re-narrate the intro; instead, set
    // the tree directly and jump to stage-menu phase.
    setTree(parent);
    setPathNodes([]);
    setNarrationArrows([]);
    setNarrationHighlights([]);
    setActiveStage(null);
    setStageIndex(0);
    setQuizSelected(null);
    setQuizShowingFeedback(false);
    setPhase('stage-menu');
    // Mark punish stage complete on this lesson exit. (This means
    // completing ANY punish lesson marks the stage done; if you want
    // "complete all" instead, change this to count lessons answered.)
    if (parent.openingName) {
      void markStageComplete(parent.openingName, 'punish');
    }
  }, [parentOpeningTree, backToStageMenu, cleanupNarration]);

  return {
    phase,
    isActive: phase !== 'idle',
    tree,
    currentNode,
    fen,
    forkOptions,
    isLeaf,
    canBacktrack,
    pathSans,
    leafOutro,
    narrationArrows,
    narrationHighlights,
    activeStage,
    stageIndex,
    quizSelected,
    quizShowingFeedback,
    drillMoveIndex,
    drillFen,
    drillWrongMove,
    drillComplete,
    drillLineChosen,
    pendingStageJump,
    cancelPendingStageJump,
    abandonStageJump,
    start,
    pause,
    resume,
    pickFork,
    backtrackToLastFork,
    stop,
    skipNarration,
    stepBack,
    canStepBack: pathNodes.length >= 3,
    enterStageMenu,
    startAtStageMenu,
    setViewOrientation,
    restartWalkthrough,
    startStage,
    selectDrillLine,
    pickQuizChoice,
    nextQuizQuestion,
    attemptDrillMove,
    attemptFindMoveAnswer,
    acknowledgeDrillMistake,
    restartDrill,
    backToStageMenu,
    startPunishLesson,
    exitPunishToMenu,
    isInPunishLesson: parentOpeningTree !== null,
    activePunishLesson,
    parentOpeningTree,
    mergeStagesFromCache,
    pendingTrap: trapQueue[trapIndex] ?? null,
    trapFen,
    trapsQueuedAfter: Math.max(0, trapQueue.length - trapIndex - 1),
    acceptTrap,
    skipTrap,
  };
}
