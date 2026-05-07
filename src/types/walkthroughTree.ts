/**
 * WalkthroughTree — tree-shaped opening lesson with branch points.
 *
 * Distinct from `WalkthroughSession` (a flat ordered list of steps).
 * Openings are not linear — they have forks (e.g. the Vienna at move
 * 2 has three popular Black responses), and a real coach pauses at
 * each fork and asks the student which line to explore. The flat
 * Session shape can't represent that; this Tree shape can.
 *
 * Runtime: `useTeachWalkthrough` walks the tree node-by-node. When
 * `node.children.length > 1`, it pauses and renders tap targets;
 * when `=== 1`, it advances automatically; when `=== 0`, it's a
 * leaf — the coach delivers the leaf's outro and offers to back up
 * to the last fork or take the position into a real game.
 *
 * The data file declares MOVES only (SAN). FENs are computed at
 * runtime by walking chess.js through the move sequence — no
 * hand-written FENs to typo, no per-edit re-validation.
 */

/** A single node in the walkthrough tree. Represents the position
 *  AFTER `san` was played from the parent's position. The root
 *  (start position) has `san: null`. */
export interface WalkthroughTreeNode {
  /** SAN of the move that landed on this node. `null` only at the
   *  root (the pre-1.e4 starting position). */
  san: string | null;
  /** Who made the move. `null` only at the root. */
  movedBy: 'white' | 'black' | null;
  /** Coach's spoken explanation of THIS move, narrated as it
   *  animates onto the board. Written in the coach's own voice —
   *  no length cap, no template. The voice service speaks it via
   *  Polly; the chat panel renders it as the coach's message. */
  idea: string;
  /** Children of this node. `length === 0` means leaf (line ends
   *  here). `length === 1` means linear continuation (auto-advance
   *  after `idea` is narrated). `length > 1` means BRANCH — pause,
   *  show tap targets, wait for student to pick. */
  children: WalkthroughTreeChild[];
}

/** A child of a node. The `label` and `forkSubtitle` are only
 *  consumed when the parent has multiple children (branch point);
 *  they're ignored on linear continuations. */
export interface WalkthroughTreeChild {
  /** Tap-target text shown at a branch point. Should name the move
   *  AND the strategic identity ("3.f4 — Vienna Gambit"). Required
   *  when the parent is a branch (children.length > 1); optional
   *  on linear continuations. */
  label?: string;
  /** Tap-target sub-text shown at a branch point. One short clause
   *  framing the choice ("Sacrifice the f-pawn for a kingside
   *  attack"). Required when the parent is a branch; optional on
   *  linear continuations. */
  forkSubtitle?: string;
  /** The subtree rooted at this child. */
  node: WalkthroughTreeNode;
}

/** A complete opening walkthrough tree, registered by name in
 *  `src/data/openingWalkthroughs/index.ts`. */
export interface WalkthroughTree {
  /** Canonical opening name (matches the brain's intendedOpening
   *  memory and Lichess explorer responses). */
  openingName: string;
  /** ECO code (e.g. "C25" for Vienna). Used for opening-detection
   *  cross-reference. */
  eco: string;
  /** Coach's intro narration — spoken once at the start of the
   *  walkthrough, before any move animates. Sets context for the
   *  opening's character. */
  intro: string;
  /** Default outro spoken at any leaf that doesn't override it.
   *  Reaches the student at the end of a chosen branch — should
   *  invite backtrack-to-fork or play-it-out. */
  outro: string;
  /** Optional per-leaf outro override map, keyed by a leaf path
   *  (the SAN moves from root joined by spaces). Used when a
   *  particular branch deserves a custom takeaway message. */
  leafOutros?: Record<string, string>;
  /** The root node — the pre-move starting position. Its `idea` is
   *  ignored (the intro covers the framing); only its children
   *  matter (the first moves of the opening). */
  root: WalkthroughTreeNode;
}

/** Result of resolving a branch path through the tree. Used by the
 *  runtime to track "where am I now" and "how did I get here." */
export interface WalkthroughTreePosition {
  /** The current node in the tree (the position the board shows). */
  node: WalkthroughTreeNode;
  /** SANs played from root to reach this node — useful for FEN
   *  computation, audit trails, and leaf-outro lookup. */
  pathSans: string[];
  /** Path of nodes from root to current. `path[0]` is always root. */
  pathNodes: WalkthroughTreeNode[];
  /** Index of the most recent ancestor that was a fork (children
   *  length > 1), or -1 if no fork on the path. Used for
   *  "back up to last fork" navigation. */
  lastForkIndex: number;
}
