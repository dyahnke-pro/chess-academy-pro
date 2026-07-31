// masterclassWalkthroughAdapter — Tier 1 of the walkthrough narration
// architecture (David 2026-07-30, locked): "So we teach from our
// masterclasses. If no masterclass we hand the llm whatever narration has
// been transcribed from video pulls. If we don't have that we let the code
// run its own walkthrough with computed narrations."
//
// Converts a hand-authored masterclass LessonScript (the same beats the
// openings page's Watch plays) into a WalkthroughTree so "teach me the
// caro-kann" on /coach/teach speaks the AUTHORED masterclass narration —
// zero LLM calls, zero generation wait (G0: the LLM decides nothing; here
// it isn't even asked to phrase).
//
// Scope: every masterclass main lesson adapts. Monotonic lessons become a
// linear chain; lessons with rewind beats (ruy / queens-gambit /
// kings-gambit style: a monotonic main run + "branch-*" sideline pointers
// + a closing wrap-up on the main leaf) become a UNION TREE — each beat's
// path is created or reused and its narration lands on the path's terminal
// node, so sidelines surface as labeled fork tiles and the wrap-up speaks
// on the main line's leaf. Registered variation lessons additionally graft
// as full fork branches (replacing any shallow same-move pointer).
import { Chess } from 'chess.js';
import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../types';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  NarrationSegment,
  NarrationArrow,
  NarrationHighlight,
} from '../types/walkthroughTree';
import { findLessonForQuery, getVariationLessonScriptsForOpening } from '../data/lessons';
import { mentionedMoveArrows } from './mentionedMoveArrows';

/** Map an authored arrow color (rgba / css string) onto the walkthrough
 *  runtime's named palette. Authored masterclass arrows are green vision
 *  arrows unless they say otherwise. */
function toNamedColor(color: string | undefined): NarrationArrow['color'] {
  if (!color) return 'green';
  const c = color.toLowerCase();
  if (c.includes('red')) return 'red';
  if (c.includes('blue') || c.includes('indigo') || c.includes('purple')) return 'blue';
  if (c.includes('yellow') || c.includes('amber') || c.includes('orange')) return 'yellow';
  return 'green';
}

function toSegmentArrows(arrows: AnnotationArrow[] | undefined): NarrationArrow[] {
  return (arrows ?? []).map((a) => ({ from: a.from, to: a.to, color: toNamedColor(a.color) }));
}

function toSegmentHighlights(highlights: AnnotationHighlight[] | undefined): NarrationHighlight[] {
  return (highlights ?? []).map((h) => ({ square: h.square, color: toNamedColor(h.color) ?? 'yellow' }));
}

/** True when every beat's moves extends the previous beat's line (equal
 *  allowed — a commentary beat on the same position) AND the full line is
 *  chess.js-legal. Rewinds and branches disqualify the lesson. */
function isMonotonic(beats: LessonBeat[]): boolean {
  let prev: string[] = [];
  const probe = new Chess();
  for (const beat of beats) {
    if (beat.moves.length < prev.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (beat.moves[i] !== prev[i]) return false;
    }
    for (let i = prev.length; i < beat.moves.length; i++) {
      try {
        probe.move(beat.moves[i]);
      } catch {
        return false;
      }
    }
    prev = beat.moves;
  }
  return prev.length > 0;
}

/** Build the beat's narration segment, with lead-the-eye arrows on every
 *  move the prose MENTIONS (David 2026-07-30: "arrows pointing out other
 *  moves that are mentioned during the narrations. Lead the eye!") merged
 *  after the authored arrows. `fen` is the position AFTER the beat's move. */
function beatSegment(beat: LessonBeat, fen: string, moveSquares: { from: string; to: string } | null): NarrationSegment {
  const authored = toSegmentArrows(beat.arrows);
  const exclude = [
    ...(moveSquares ? [moveSquares] : []),
    ...authored.map((a) => ({ from: a.from, to: a.to })),
  ];
  const mentioned = mentionedMoveArrows(beat.say, fen, exclude).map((a) => ({
    from: a.from,
    to: a.to,
    color: 'green' as const,
  }));
  return {
    text: beat.say,
    ...(beat.sayShort ? { shortText: beat.sayShort } : {}),
    arrows: [...authored, ...mentioned],
    highlights: toSegmentHighlights(beat.highlights),
  };
}

/** Convert a monotonic LessonScript into a linear WalkthroughTree. Returns
 *  null when the lesson rewinds/branches (not adaptable) or is a roadmap /
 *  trap shape (those stop short by design — the walkthrough should not
 *  present them as the opening's line). */
interface BuiltChain {
  root: WalkthroughTreeNode;
  /** Node per ply, in order — nodes[i] is the position after moves[0..i]. */
  nodes: WalkthroughTreeNode[];
  moves: string[];
  introBeats: LessonBeat[];
}

/** Attach a beat's narration to its terminal node (appending when the node
 *  already speaks — e.g. a closing wrap-up beat on the main line's leaf). */
function attachNarration(node: WalkthroughTreeNode, beat: LessonBeat, fen: string, moveSquares: { from: string; to: string } | null): void {
  const seg = beatSegment(beat, fen, moveSquares);
  node.narration = [...(node.narration ?? []), seg];
  node.idea = node.idea ? `${node.idea} ${beat.say}` : beat.say;
  if (beat.sayShort && !node.shortIdea) node.shortIdea = beat.sayShort;
}

/** Build the UNION TREE of every beat's move path. Masterclass lessons are
 *  a monotonic main run plus optional rewind beats — sideline pointers
 *  ("branch-*") and a closing wrap-up that returns to the deepest main
 *  position. Each beat's path is created (or reused) node-by-node and its
 *  narration lands on the path's terminal node; a beat whose path already
 *  exists appends its narration there. Children keep beat order, so the
 *  first-created (main) continuation stays the default path. `fromPly`
 *  drops narration for plies before it (variation branches whose trunk is
 *  narrated by the main lesson). */
function buildChain(lesson: LessonScript, fromPly = 0): BuiltChain | null {
  const introBeats: LessonBeat[] = [];
  let firstMoveBeat = 0;
  while (firstMoveBeat < lesson.beats.length && lesson.beats[firstMoveBeat].moves.length === 0) {
    introBeats.push(lesson.beats[firstMoveBeat]);
    firstMoveBeat += 1;
  }

  const root: WalkthroughTreeNode = { san: null, movedBy: null, idea: '', children: [] };
  // Main chain = the longest monotonic run from the first move beat; its
  // nodes (per ply) anchor variation grafting.
  const nodes: WalkthroughTreeNode[] = [];
  let mainMoves: string[] = [];

  for (let b = firstMoveBeat; b < lesson.beats.length; b++) {
    const beat = lesson.beats[b];
    if (beat.moves.length === 0) continue; // framing beats past the intro carry no anchor ply
    // Replay the beat's full path from the start, creating missing nodes.
    const board = new Chess();
    let cursor = root;
    let ok = true;
    let lastMv: { from: string; to: string } | null = null;
    for (let i = 0; i < beat.moves.length; i++) {
      let mv;
      try {
        mv = board.move(beat.moves[i]);
      } catch {
        ok = false;
        break;
      }
      lastMv = { from: mv.from, to: mv.to };
      let child = cursor.children.find((c) => c.node.san === mv.san);
      if (!child) {
        const node: WalkthroughTreeNode = {
          san: mv.san,
          movedBy: mv.color === 'w' ? 'white' : 'black',
          idea: '',
          children: [],
        };
        child = { node };
        cursor.children.push(child);
      }
      cursor = child.node;
    }
    if (!ok || cursor === root) continue; // illegal beat path — skip, never corrupt
    // Track the main chain: a beat extending the current main line.
    if (beat.moves.length >= mainMoves.length && mainMoves.every((m, i) => beat.moves[i] === m)) {
      let walker = root;
      const chain: WalkthroughTreeNode[] = [];
      for (const san of beat.moves) {
        const c = walker.children.find((x) => x.node.san === san);
        if (!c) break;
        chain.push(c.node);
        walker = c.node;
      }
      if (chain.length === beat.moves.length) {
        mainMoves = beat.moves;
        nodes.length = 0;
        nodes.push(...chain);
      }
    }
    if (beat.moves.length > fromPly) attachNarration(cursor, beat, board.fen(), lastMv);
  }

  if (nodes.length === 0) return null;
  // Label any fork a rewind beat created: the first (main) child gets the
  // main-line label; a sideline child labels itself from its own narration.
  const labelForks = (node: WalkthroughTreeNode): void => {
    if (node.children.length > 1) {
      node.children.forEach((c, idx) => {
        if (c.label) return;
        if (idx === 0) {
          c.label = `Main line — ${c.node.san ?? ''}`;
          c.forkSubtitle = c.node.shortIdea ?? 'The masterclass main line.';
        } else {
          c.label = c.node.shortIdea ?? `Sideline — ${c.node.san ?? ''}`;
          c.forkSubtitle = c.node.idea.split(/(?<=[.!?])\s/)[0]?.slice(0, 90) ?? '';
        }
      });
    }
    for (const c of node.children) labelForks(c.node);
  };
  labelForks(root);
  return { root, nodes, moves: mainMoves, introBeats };
}

/** Graft the opening's registered VARIATION lessons onto the main chain as
 *  fork tiles at their natural divergence ply (David 2026-07-30: the Glek's
 *  three built sublines never surfaced on /coach/teach — the walkthrough
 *  must pause at the fork like a real coach and offer them). */
function graftVariationForks(main: BuiltChain, openingId: string): number {
  let grafted = 0;
  for (const { name, lesson } of getVariationLessonScriptsForOpening(openingId)) {
    if (lesson.kind && lesson.kind !== 'variation') continue;
    if (!isMonotonic(lesson.beats)) continue;
    const varMoves = lesson.beats[lesson.beats.length - 1].moves;
    // Divergence ply: first index where the variation leaves the main line.
    let d = 0;
    while (d < varMoves.length && d < main.moves.length && varMoves[d] === main.moves[d]) d += 1;
    if (d === 0 || d >= varMoves.length) continue; // no shared trunk / no divergence
    const branch = buildChain(lesson, d);
    if (!branch) continue;
    const branchEntry = branch.nodes[d];
    if (!branchEntry) continue;
    const parent = main.nodes[d - 1];
    // Label the fork the way generated trees do: the runtime shows tap
    // targets whenever a node has >1 child. An unlabeled single child is
    // the main continuation (a variation diverging AT the terminus has no
    // main continuation to label).
    const mainNext = main.nodes[d];
    if (mainNext && parent.children.length === 1 && !parent.children[0].label) {
      parent.children[0].label = `Main line — ${mainNext.san ?? ''}`;
      parent.children[0].forkSubtitle = mainNext.shortIdea ?? 'The masterclass main line.';
    }
    const firstBranchBeat = lesson.beats.find((bt) => bt.moves.length > d);
    const child = {
      label: name,
      forkSubtitle: firstBranchBeat?.sayShort ?? lesson.title,
      node: branchEntry,
    };
    // The main lesson may carry its own shallow "branch-*" pointer beat on
    // the same move — the full variation lesson REPLACES it (richer line,
    // same entry SAN); never leave two tiles playing the same move.
    const existing = parent.children.findIndex((c) => c !== parent.children[0] && c.node.san === branchEntry.san);
    if (existing > 0) parent.children[existing] = child;
    else if (mainNext?.san === branchEntry.san) continue; // variation IS the main continuation — nothing to graft
    else parent.children.push(child);
    grafted += 1;
  }
  return grafted;
}

export function lessonToWalkthroughTree(
  lesson: LessonScript,
  openingName: string,
  openingId?: string,
): WalkthroughTree | null {
  if (lesson.kind && lesson.kind !== 'variation') return null;

  const main = buildChain(lesson);
  if (!main) return null;
  if (openingId) graftVariationForks(main, openingId);
  const { root, introBeats } = main;

  const intro = introBeats.map((bt) => bt.say).join(' ')
    || `The ${openingName}, taught from this app's master class — the verified line, move by move.`;
  const shortIntro = introBeats.find((bt) => bt.sayShort)?.sayShort;

  return {
    openingName,
    eco: '',
    intro,
    ...(shortIntro ? { shortIntro } : {}),
    outro:
      'That is the heart of the line — the moves and the plans behind them. Take the position into a real game and make those plans yours.',
    studentSide: lesson.orientation,
    root,
  };
}

/** Tier-1 entry: resolve a canonicalized "teach me X" name to a masterclass
 *  walkthrough tree, or null when no adaptable masterclass exists. */
export function masterclassWalkthroughTree(
  query: string | undefined | null,
  /** The side the student wants to be taught (explicit "as white/black"
   *  ask, else name inference). A masterclass authored for the OTHER side
   *  cannot serve it — hand prose can't flip — so the ask falls through to
   *  the generated tiers on the requested side (David 2026-07-31: "the
   *  Alapin is a white opening" — the Black-side masterclass hijacked it). */
  desiredSide?: 'white' | 'black',
): WalkthroughTree | null {
  if (!query?.trim()) return null;
  const hit = findLessonForQuery(query);
  if (!hit) return null;
  if (desiredSide && hit.lesson.orientation !== desiredSide) return null;
  const displayName = hit.variationName ?? query.trim();
  // A MAIN-lesson walkthrough offers the opening's registered variation
  // lessons as fork tiles; a variation ask walks just its own line.
  return lessonToWalkthroughTree(hit.lesson, displayName, hit.variationName ? undefined : hit.openingId);
}
