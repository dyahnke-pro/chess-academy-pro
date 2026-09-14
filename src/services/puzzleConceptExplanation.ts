/**
 * puzzleConceptExplanation — teach the CONCEPT behind a puzzle's solution, not
 * just point an arrow (David 2026-09-14: "not just a hint with an arrow, but an
 * explanation of the concepts to understand the solution"). Shared by every
 * puzzle surface (Master Level first, but the same board every surface renders).
 *
 * It links the computers that already exist (the map's "have the computers
 * linked up"):
 *   • dnaLineNarrator  → the BOARD-TRUE mechanics of the solution ("Nf6,
 *     landing a fork, winning the queen") — computed from chess.js, no LLM.
 *   • chess-concepts.json (via chessConceptService.getConcept) → the general
 *     IDEA behind the pattern ("A fork attacks two targets at once, so whatever
 *     your opponent saves, the other falls") — our distilled public-domain
 *     teaching, shipped app content.
 *
 * Both halves are computed/authored — nothing is asked of the LLM (the purest
 * G0). The result carries `spoken` (ready to voice/display), the lead-the-eye
 * arrow on the student's key move, and the concept name/id for sourcing.
 */
import { Chess } from 'chess.js';
import { narrateDnaLine, type DnaLinePly } from './dnaLineNarrator';
import { getConcept } from './chessConceptService';
import { conceptForLine, tacticInvariant, type ComputedConcept } from './conceptEngine';

/** Lichess puzzle theme → chess-concepts.json concept id (the IDEA passage).
 *  Only patterns the corpus actually teaches; a theme with no concept still
 *  gets the board-true mechanics line, just no general-idea clause. */
const THEME_TO_CONCEPT_ID: Record<string, string> = {
  fork: 'tac-fork', doubleAttack: 'tac-double-attack',
  pin: 'tac-pin',
  skewer: 'tac-skewer', xRayAttack: 'tac-xray',
  discoveredAttack: 'tac-discovered', discoveredCheck: 'tac-discovered',
  deflection: 'tac-deflection', capturingDefender: 'tac-deflection',
  interference: 'tac-deflection',
  attraction: 'tac-decoy', decoy: 'tac-decoy', clearance: 'tac-decoy',
  overloading: 'tac-overloaded',
  sacrifice: 'tac-sacrifice',
  trappedPiece: 'tac-trap',
  zwischenzug: 'tac-zwischen', intermezzo: 'tac-zwischen',
  backRankMate: 'mate-back-rank', smotheredMate: 'mate-smothered',
  anastasiaMate: 'mate-anastasia', bodenMate: 'mate-boden',
  greekGift: 'att-greek-gift',
};

/** Display name for the pattern (falls back to the concept's own name). */
const THEME_DISPLAY: Record<string, string> = {
  fork: 'Fork', doubleAttack: 'Double attack',
  pin: 'Pin', skewer: 'Skewer', xRayAttack: 'X-ray',
  discoveredAttack: 'Discovered attack', discoveredCheck: 'Discovered check',
  deflection: 'Deflection', capturingDefender: 'Removing the defender',
  attraction: 'Attraction', decoy: 'Decoy', clearance: 'Clearance',
  overloading: 'Overloaded piece', interference: 'Interference',
  sacrifice: 'Sacrifice', trappedPiece: 'Trapped piece',
  zwischenzug: 'Zwischenzug', intermezzo: 'Zwischenzug',
  backRankMate: 'Back-rank mate', smotheredMate: 'Smothered mate',
  anastasiaMate: "Anastasia's mate", bodenMate: "Boden's mate",
  greekGift: 'Greek gift',
};

export interface PuzzleConceptExplanation {
  /** The pattern name, e.g. "Fork" — the board-COMPUTED concept when the
   *  engine classifies the solution, else the tag's display name; null when
   *  neither. */
  conceptName: string | null;
  /** chess-concepts.json id, for sourcing (tag-mapped; null when no passage). */
  conceptId: string | null;
  /** The computed concept's id + source (P3: one computational system) —
   *  null when the solution classified as nothing. */
  computedId: string | null;
  computedSource: ComputedConcept['source'] | null;
  /** Board-true mechanics of the solution line (dnaLineNarrator). */
  line: string;
  /** One-sentence general idea behind the pattern (from the concept passage). */
  idea: string | null;
  /** Lead-the-eye arrow on the student's KEY (first) solving move. */
  arrow: { from: string; to: string } | null;
  /** The composed explanation — ready to display AND to voice. */
  spoken: string;
}

/** First sentence of a passage, trimmed — the crisp idea, not the whole essay. */
function firstSentence(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^[^.!?]*[.!?]/);
  const s = (m ? m[0] : t).trim();
  return s.length >= 12 ? s : null;
}

/** The general IDEA a computed concept teaches — the invariant alone for a
 *  tactic (the instance is already narrated by the line), the full register
 *  otherwise. Capitalised, sentence-terminated. */
function computedIdea(c: ComputedConcept): string {
  const inv = c.source === 'tactic' ? tacticInvariant(c.id) : null;
  const text = (inv ? inv.full : c.full).trim();
  const cap = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

/** The board-computed lead concept for a solution line (never positional —
 *  a hint/explanation names a pattern, not a platitude). */
function computedLead(board: { fen: string; uci: readonly string[]; studentColor: 'w' | 'b' } | null): ComputedConcept | null {
  if (!board || !board.fen || board.uci.length === 0) return null;
  try {
    return conceptForLine({ fen: board.fen, uci: [...board.uci], studentColor: board.studentColor, max: 2 })
      .find((c) => c.source !== 'positional') ?? null;
  } catch { return null; }
}

/** The concept NAME + one-sentence general IDEA for a puzzle — the teaching a
 *  HINT adds so it's "not just an arrow, but an explanation of the concepts to
 *  understand the solution" (David 2026-09-14). No move given away — just the
 *  pattern and why it works. When the board is supplied the COMPUTED concept
 *  leads (the tags are patchy; the board isn't); the theme→passage table is
 *  the fallback. Null when neither classifies. */
export function conceptIdeaForThemes(
  themes: readonly string[],
  board?: { fen: string; uci: readonly string[]; studentToMove?: boolean },
): { conceptName: string; conceptId: string; idea: string } | null {
  if (board?.fen && board.uci.length > 0) {
    const turn = board.fen.split(' ')[1] === 'b' ? 'b' : 'w';
    const studentColor: 'w' | 'b' = board.studentToMove ? turn : (turn === 'w' ? 'b' : 'w');
    const lead = computedLead({ fen: board.fen, uci: board.uci, studentColor });
    if (lead) return { conceptName: lead.name, conceptId: lead.id, idea: computedIdea(lead) };
  }
  for (const t of themes) {
    const id = THEME_TO_CONCEPT_ID[t];
    if (!id) continue;
    const concept = getConcept(id);
    if (!concept) continue;
    const passage = concept.passages[0]?.text;
    const idea = passage ? firstSentence(passage) : null;
    if (!idea) continue;
    return { conceptName: THEME_DISPLAY[t] ?? concept.name, conceptId: id, idea };
  }
  return null;
}

/** Shared composer: given the student's key plies + themes + the key move's
 *  arrow, build the concept explanation (board mechanics + general idea). */
function compose(
  keyPlies: DnaLinePly[],
  themes: string[],
  arrow: { from: string; to: string } | null,
  computed: ComputedConcept | null,
): PuzzleConceptExplanation | null {
  if (keyPlies.length === 0) return null;
  const line = narrateDnaLine(keyPlies);

  // Tag-mapped book passage (kept for sourcing + as the fallback idea).
  let conceptId: string | null = null;
  let tagName: string | null = null;
  let passageIdea: string | null = null;
  for (const t of themes) {
    const id = THEME_TO_CONCEPT_ID[t];
    if (!id) continue;
    const concept = getConcept(id);
    if (!concept) continue;
    conceptId = id;
    tagName = THEME_DISPLAY[t] ?? concept.name;
    const passage = concept.passages[0]?.text;
    passageIdea = passage ? firstSentence(passage) : null;
    break;
  }

  // THE COMPUTED CONCEPT LEADS (P3): the board classified the solution, so the
  // name + idea come from the engine; the tag table only fills in behind it.
  const conceptName = computed?.name ?? tagName;
  const idea = computed ? computedIdea(computed) : passageIdea;

  const parts: string[] = [];
  if (line) parts.push(line.charAt(0).toUpperCase() + line.slice(1) + (/[.!?]$/.test(line) ? '' : '.'));
  if (idea) parts.push(idea);
  const spoken = parts.join(' ').trim();
  if (!spoken) return null;

  return {
    conceptName, conceptId, computedId: computed?.id ?? null, computedSource: computed?.source ?? null,
    line, idea, arrow, spoken,
  };
}

/**
 * Compute the concept explanation for a puzzle from its FEN + solution UCI +
 * themes. Returns null only when the solution can't be replayed (never throws
 * on the live path).
 */
export function explainPuzzleConcept(args: {
  fen: string;
  solutionUci: string[];
  themes: string[];
}): PuzzleConceptExplanation | null {
  const { fen, solutionUci, themes } = args;
  if (!fen || solutionUci.length === 0) return null;

  // The student plays the side OPPOSITE the FEN's side-to-move (Lichess: the
  // FEN is right before the opponent's setup move, which is solutionUci[0]).
  const fenTurn = fen.split(' ')[1];
  const studentColor: 'w' | 'b' = fenTurn === 'w' ? 'b' : 'w';

  // Replay the whole solution into per-ply {fenBefore, san}, tracking who moved.
  const plies: Array<DnaLinePly & { mover: 'w' | 'b' }> = [];
  try {
    const c = new Chess(fen);
    for (const uci of solutionUci) {
      const fenBefore = c.fen();
      const mover = fenBefore.split(' ')[1] as 'w' | 'b';
      const mv = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
      if (!mv) return null;
      plies.push({ fenBefore, san: mv.san, mover });
    }
  } catch {
    return null;
  }

  // Narrate from the student's FIRST move — that's "the solution" they want to
  // understand (the opponent's setup move is context, not the lesson).
  const startIdx = plies.findIndex((p) => p.mover === studentColor);
  const keyPlies = startIdx >= 0 ? plies.slice(startIdx) : plies;
  if (keyPlies.length === 0) return null;

  const idx = startIdx >= 0 ? startIdx : 0;
  const keyUci = solutionUci[idx];
  const arrow = keyUci && keyUci.length >= 4
    ? { from: keyUci.slice(0, 2), to: keyUci.slice(2, 4) }
    : null;

  const computed = computedLead({ fen, uci: solutionUci, studentColor });
  return compose(keyPlies.map((p) => ({ fenBefore: p.fenBefore, san: p.san })), themes, arrow, computed);
}

/**
 * Concept explanation for an in-place classroom DRILL, where the board is
 * already at the student-to-move position (`setupFen`, opponent's setup applied)
 * and the solution is SAN. Same computed teaching as a puzzle — so the coach's
 * classroom quiz teaches the concept behind the solution, not just an arrow.
 */
export function explainDrillConcept(args: {
  setupFen: string;
  solutionSan: string[];
  themes?: string[];
}): PuzzleConceptExplanation | null {
  const { setupFen, solutionSan, themes = [] } = args;
  if (!setupFen || solutionSan.length === 0) return null;
  const studentColor = setupFen.split(' ')[1] === 'b' ? 'b' : 'w'; // student is to move at setupFen
  const plies: DnaLinePly[] = [];
  const uci: string[] = [];
  let arrow: { from: string; to: string } | null = null;
  try {
    const c = new Chess(setupFen);
    for (let i = 0; i < solutionSan.length; i += 1) {
      const fenBefore = c.fen();
      const mover = fenBefore.split(' ')[1];
      const mv = c.move(solutionSan[i]);
      if (!mv) break;
      // Narrate only the student's moves + the forced replies between them; the
      // arrow leads the eye to the student's FIRST move.
      if (i === 0 && mover === studentColor) arrow = { from: mv.from, to: mv.to };
      plies.push({ fenBefore, san: mv.san });
      uci.push(`${mv.from}${mv.to}${mv.promotion ?? ''}`);
    }
  } catch {
    return null;
  }
  return compose(plies, themes, arrow, computedLead({ fen: setupFen, uci, studentColor }));
}
