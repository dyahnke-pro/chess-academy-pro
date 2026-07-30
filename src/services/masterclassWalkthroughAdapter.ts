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
// Scope: only lessons whose beats advance MONOTONICALLY along one line
// (each beat's moves extends the previous beat's). A lesson that rewinds
// or branches to a sideline is a story the linear tree can't tell without
// corrupting it — those openings fall through to Tier 2/3 untouched.
// Empirical coverage at build time: 9 of 13 masterclass main lessons are
// monotonic (caro-kann, pirc, italian, london, scotch, english, KID,
// nimzo, sicilian-alapin); vienna rewinds but already has its hand-crafted
// static tree, and ruy/queens-gambit/kings-gambit rewind by design.
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

/** Build a linear node chain from a monotonic lesson's beats. `fromPly`
 *  drops narration for plies before it (used for variation branches whose
 *  trunk plies are narrated by the main lesson). */
function buildChain(lesson: LessonScript, fromPly = 0): BuiltChain | null {
  const introBeats: LessonBeat[] = [];
  let firstMoveBeat = 0;
  while (firstMoveBeat < lesson.beats.length && lesson.beats[firstMoveBeat].moves.length === 0) {
    introBeats.push(lesson.beats[firstMoveBeat]);
    firstMoveBeat += 1;
  }

  const root: WalkthroughTreeNode = { san: null, movedBy: null, idea: '', children: [] };
  const nodes: WalkthroughTreeNode[] = [];
  let tail = root;
  const board = new Chess();
  let played: string[] = [];

  for (let b = firstMoveBeat; b < lesson.beats.length; b++) {
    const beat = lesson.beats[b];
    const newMoves = beat.moves.slice(played.length);
    if (newMoves.length === 0) {
      // Commentary beat on the position already shown — extra segment on
      // the current node so the runtime speaks it in sequence.
      if (tail !== root && played.length > fromPly) {
        const seg = beatSegment(beat, board.fen(), null);
        tail.narration = [...(tail.narration ?? []), seg];
        tail.idea = tail.idea ? `${tail.idea} ${beat.say}` : beat.say;
      }
      continue;
    }
    for (let i = 0; i < newMoves.length; i++) {
      const mv = board.move(newMoves[i]);
      const node: WalkthroughTreeNode = {
        san: mv.san,
        movedBy: mv.color === 'w' ? 'white' : 'black',
        idea: '',
        children: [],
      };
      tail.children.push({ node });
      tail = node;
      nodes.push(node);
      // The beat's narration lands on its LAST move; interstitial moves in
      // a multi-move beat animate silently (silence is acceptable — the
      // narration voice rules prefer it over filler).
      if (i === newMoves.length - 1 && nodes.length > fromPly) {
        node.idea = beat.say;
        if (beat.sayShort) node.shortIdea = beat.sayShort;
        node.narration = [beatSegment(beat, board.fen(), { from: mv.from, to: mv.to })];
      }
    }
    played = beat.moves;
  }

  if (nodes.length === 0) return null;
  return { root, nodes, moves: played, introBeats };
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
    parent.children.push({
      label: name,
      forkSubtitle: firstBranchBeat?.sayShort ?? lesson.title,
      node: branchEntry,
    });
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
  if (!isMonotonic(lesson.beats)) return null;

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
export function masterclassWalkthroughTree(query: string | undefined | null): WalkthroughTree | null {
  if (!query?.trim()) return null;
  const hit = findLessonForQuery(query);
  if (!hit) return null;
  const displayName = hit.variationName ?? query.trim();
  // A MAIN-lesson walkthrough offers the opening's registered variation
  // lessons as fork tiles; a variation ask walks just its own line.
  return lessonToWalkthroughTree(hit.lesson, displayName, hit.variationName ? undefined : hit.openingId);
}
