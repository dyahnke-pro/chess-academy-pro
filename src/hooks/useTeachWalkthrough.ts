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
import { voiceService } from '../services/voiceService';
import { logAppAudit } from '../services/appAuditor';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  WalkthroughTreeChild,
  NarrationArrow,
  NarrationHighlight,
} from '../types/walkthroughTree';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Words per minute used for the backup-timer heuristic. Matches
 *  `walkthroughRunner` so the lesson rhythm is consistent. */
const BACKUP_WPM = 180;
const MIN_BACKUP_MS = 1500;
const MAX_BACKUP_MS = 30_000;
const POST_NARRATION_BUFFER_MS = 400;

function clampBackupMs(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const base = (wordCount / BACKUP_WPM) * 60_000;
  return Math.max(MIN_BACKUP_MS, Math.min(MAX_BACKUP_MS, base * 1.6));
}

export type WalkthroughPhase =
  | 'idle'
  | 'narrating'
  | 'fork'
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
  drillWrongMove: { tried: string; expected: string } | null;
  /** For 'drill' phase: true once the entire drill line has been
   *  played correctly. */
  drillComplete: boolean;

  /** Begin walking the given tree. Idempotent — calling start() twice
   *  with the same tree restarts from root. */
  start: (tree: WalkthroughTree) => void;
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
  /** Dismiss the wrong-move feedback and let the student try again
   *  from the same drill position. */
  acknowledgeDrillMistake: () => void;
  /** Restart the current drill line from move 0. */
  restartDrill: () => void;
  /** From any stage, return to the stage-menu hub. */
  backToStageMenu: () => void;
}

/** Compute the FEN at a node by walking chess.js through the SAN
 *  path from the root. Returns STARTING_FEN if the path is empty. */
function fenForPath(pathSans: string[]): string {
  if (pathSans.length === 0) return STARTING_FEN;
  const chess = new Chess();
  for (const san of pathSans) {
    try {
      chess.move(san);
    } catch {
      // Bad data — already caught by vienna.test.ts validation, but
      // bail gracefully if it ever slips through.
      return STARTING_FEN;
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

export function useTeachWalkthrough(): UseTeachWalkthroughReturn {
  const [tree, setTree] = useState<WalkthroughTree | null>(null);
  const [phase, setPhase] = useState<WalkthroughPhase>('idle');
  // pathNodes[0] is always the root when active. The current node
  // is pathNodes[pathNodes.length - 1].
  const [pathNodes, setPathNodes] = useState<WalkthroughTreeNode[]>([]);
  // Arrow + highlight state, set by the currently-speaking
  // narration segment (or empty when not narrating).
  const [narrationArrows, setNarrationArrows] = useState<NarrationArrow[]>([]);
  const [narrationHighlights, setNarrationHighlights] = useState<
    NarrationHighlight[]
  >([]);

  // ─── Stage 2-5 state (post-walkthrough pedagogy) ───────────
  const [activeStage, setActiveStage] = useState<StageKind | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizShowingFeedback, setQuizShowingFeedback] = useState(false);
  const [drillMoveIndex, setDrillMoveIndex] = useState(0);
  const [drillFen, setDrillFen] = useState(STARTING_FEN);
  const [drillWrongMove, setDrillWrongMove] = useState<
    { tried: string; expected: string } | null
  >(null);
  const [drillComplete, setDrillComplete] = useState(false);

  // Active narration cancel + backup timer refs.
  const cancelNarrationRef = useRef<(() => void) | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupNarration = useCallback((): void => {
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

  const currentNode = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : null;
  const pathSans = useMemo(
    () => pathNodes.filter((n) => n.san !== null).map((n) => n.san as string),
    [pathNodes],
  );
  const fen = useMemo(() => fenForPath(pathSans), [pathSans]);
  const isLeaf = currentNode !== null && currentNode.children.length === 0;
  const forkOptions =
    currentNode !== null && currentNode.children.length > 1 ? currentNode.children : [];
  const canBacktrack = findLastForkIndex(pathNodes) >= 0;
  const leafOutro = useMemo(() => {
    if (!isLeaf || !tree) return null;
    const key = pathSans.join(' ');
    return tree.leafOutros?.[key] ?? tree.outro;
  }, [isLeaf, tree, pathSans]);

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
    (path: WalkthroughTreeNode[]): void => {
      cleanupNarration();
      const node = path[path.length - 1];
      setPhase('narrating');
      setPathNodes(path);
      // Clear arrows from any prior node — fresh canvas for this one.
      setNarrationArrows([]);
      setNarrationHighlights([]);

      // Common transition logic — runs after the narration finishes
      // (segmented OR single-block). Linear → recurse to next node;
      // fork → set phase 'fork'; leaf → set phase 'leaf'.
      const transitionAfter = (): void => {
        cancelNarrationRef.current = null;
        if (advanceTimerRef.current) {
          clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = null;
        }
        if (node.children.length === 0) {
          setPhase('leaf');
        } else if (node.children.length === 1) {
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            narrateAndAdvance([...path, node.children[0].node]);
          }, POST_NARRATION_BUFFER_MS);
        } else {
          setPhase('fork');
        }
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
          if (ctrl.cancelled) return;
          ctrl.cancelled = true;
          transitionAfter();
        }, backupMs);

        void (async () => {
          for (const segment of segments) {
            if (ctrl.cancelled) return;
            // Set arrows + highlights BEFORE speaking the segment so
            // the visual lands at the same moment Polly starts saying
            // the words. (Segment without `arrows` clears them; segment
            // with empty array clears them too.)
            setNarrationArrows(segment.arrows ?? []);
            setNarrationHighlights(segment.highlights ?? []);
            try {
              await voiceService.speakForced(segment.text);
            } catch {
              // Voice errored — keep going so the narration arc
              // completes; backup timer is a safety net.
            }
          }
          if (ctrl.cancelled) return;
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
        // Root node — no narration, just transition based on children.
        if (node.children.length === 1) {
          narrateAndAdvance([...path, node.children[0].node]);
        } else if (node.children.length > 1) {
          setPhase('fork');
        } else {
          setPhase('leaf');
        }
        return;
      }

      // Voice + backup timer + post-narration buffer, then transition.
      let settled = false;
      const settle = (): void => {
        if (settled) return;
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
      voiceService
        .speakForced(idea)
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
    (newTree: WalkthroughTree): void => {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'useTeachWalkthrough.start',
        summary: `walkthrough started: ${newTree.openingName}`,
      });
      cleanupNarration();
      setTree(newTree);
      // Speak the intro first if it exists, then start the tree at root.
      if (newTree.intro.trim()) {
        // Treat the intro as a virtual narration: play it before the
        // tree's first move. We fake this by speaking it then
        // transitioning into narrateAndAdvance starting at the root.
        setPathNodes([newTree.root]);
        setPhase('narrating');
        let settled = false;
        const settle = (): void => {
          if (settled) return;
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
        voiceService
          .speakForced(newTree.intro)
          .then(() => {
            if (settled) return;
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
    // Re-narrate from the current node.
    narrateAndAdvance(pathNodes);
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
      narrateAndAdvance([...pathNodes, choice.node]);
    },
    [pathNodes, narrateAndAdvance],
  );

  const backtrackToLastFork = useCallback((): void => {
    const idx = findLastForkIndex(pathNodes);
    if (idx < 0) return;
    cleanupNarration();
    setPathNodes(pathNodes.slice(0, idx + 1));
    setPhase('fork');
  }, [pathNodes, cleanupNarration]);

  const stop = useCallback((): void => {
    cleanupNarration();
    setTree(null);
    setPathNodes([]);
    setPhase('idle');
    setNarrationArrows([]);
    setNarrationHighlights([]);
  }, [cleanupNarration]);

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

  const enterStageMenu = useCallback((): void => {
    cleanupNarration();
    resetStageState();
    setPhase('stage-menu');
  }, [cleanupNarration, resetStageState]);

  const backToStageMenu = useCallback((): void => {
    cleanupNarration();
    setActiveStage(null);
    setStageIndex(0);
    setQuizSelected(null);
    setQuizShowingFeedback(false);
    setDrillWrongMove(null);
    setDrillComplete(false);
    setPhase('stage-menu');
  }, [cleanupNarration]);

  const startStage = useCallback(
    (stage: StageKind): void => {
      cleanupNarration();
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
        setPhase('drill');
      } else {
        setPhase('quiz');
      }
    },
    [cleanupNarration],
  );

  const selectDrillLine = useCallback(
    (lineIndex: number): void => {
      if (!tree?.drill || lineIndex < 0 || lineIndex >= tree.drill.length) {
        return;
      }
      setStageIndex(lineIndex);
      setDrillMoveIndex(0);
      setDrillFen(STARTING_FEN);
      setDrillWrongMove(null);
      setDrillComplete(false);
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
      // Stage complete — back to menu.
      backToStageMenu();
    } else {
      setStageIndex(next);
      setQuizSelected(null);
      setQuizShowingFeedback(false);
    }
  }, [tree, activeStage, stageIndex, backToStageMenu]);

  /** Attempt a drill move. Returns ok=true on match (advances state),
   *  ok=false on mismatch (sets drillWrongMove for UI feedback). */
  const attemptDrillMove = useCallback(
    (san: string): { ok: boolean } => {
      if (!tree?.drill || phase !== 'drill') return { ok: false };
      if (stageIndex < 0 || stageIndex >= tree.drill.length) {
        return { ok: false };
      }
      const line = tree.drill[stageIndex];
      const studentSide = line.studentSide ?? 'white';
      // Determine which moves in the line are the student's.
      // Even-indexed moves (0, 2, 4...) are white's; odd are black's.
      // If studentSide is 'white', student plays even indices.
      if (drillMoveIndex < 0 || drillMoveIndex >= line.moves.length) {
        return { ok: false };
      }
      const expected = line.moves[drillMoveIndex];

      if (san !== expected) {
        setDrillWrongMove({ tried: san, expected });
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

      while (nextIndex < line.moves.length && !isStudentMove(nextIndex)) {
        const opponentSan = line.moves[nextIndex];
        try {
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
      }

      return { ok: true };
    },
    [tree, phase, stageIndex, drillMoveIndex, drillFen],
  );

  const acknowledgeDrillMistake = useCallback((): void => {
    setDrillWrongMove(null);
  }, []);

  const restartDrill = useCallback((): void => {
    setDrillMoveIndex(0);
    setDrillFen(STARTING_FEN);
    setDrillWrongMove(null);
    setDrillComplete(false);
  }, []);

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
    start,
    pause,
    resume,
    pickFork,
    backtrackToLastFork,
    stop,
    skipNarration,
    enterStageMenu,
    startStage,
    selectDrillLine,
    pickQuizChoice,
    nextQuizQuestion,
    attemptDrillMove,
    acknowledgeDrillMistake,
    restartDrill,
    backToStageMenu,
  };
}
