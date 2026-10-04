/**
 * puzzleConceptExplanation — teach the CONCEPT behind a puzzle's solution, not
 * just point an arrow (David 2026-09-14: "not just a hint with an arrow, but an
 * explanation of the concepts to understand the solution"). Shared by every
 * puzzle surface (Master Level first, but the same board every surface renders).
 *
 * It links the computers that already exist (the map's "have the computers
 * linked up"):
 *   • the solution line read off chess.js, in plain coach speech: the
 *     student's moves, the opponent's replies ("they have to play Kf1") and
 *     what the line nets ("and you win the queen"). It used to ride
 *     dnaLineNarrator, whose per-ply Learn/Review decorations ("the king
 *     trains on the knight on e2 — pressure they have to answer", "landing a
 *     discovered attack" on the OPPONENT's reply) garbled every puzzle
 *     explanation (live walk 2026-10-03); a puzzle needs the line, not a
 *     commentary on each ply.
 *   • conceptEngine → the computed motif INSTANCE + invariant ("Knight on e2
 *     forks queen on c3 and king on g1 — a fork hits two targets at once"),
 *     said once, right after the move that lands it.
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
import type { DnaLinePly } from './dnaLineNarrator';
import { andList, countWord } from '../utils/andList';
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
  /** The solution line in plain coach speech, without the motif sentence. */
  line: string;
  /** One-sentence general idea behind the pattern (from the concept passage). */
  idea: string | null;
  /** Lead-the-eye arrow on the student's KEY (first) solving move. */
  arrow: { from: string; to: string } | null;
  /** The composed explanation — ready to display AND to voice. */
  spoken: string;
  /** The line one clause per ply, sentence-cased, aligned to `clausePlyStart`
   *  onward in the solution — so a board playing the line says each move as it
   *  lands. `spoken` = these joined + the idea. */
  clauses: string[];
  /** Index in the solution of the ply `clauses[0]` describes. */
  clausePlyStart: number;
  /** Index in `clauses` whose sentence already carries `idea` (the motif is
   *  said right after the move that lands it); null when `idea` closes the
   *  explanation instead. A surface reading the clauses one by one speaks
   *  `idea` separately only when this clause was not read. */
  ideaClause: number | null;
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
function computedIdea(c: ComputedConcept, reveal: boolean): string | null {
  // AFTER the mate is on the board the prospective registers are false: a
  // delivered mate is not "coming", and a pattern's recognition text ("watch
  // for this when the enemy king is in the corner…") is advice for spotting
  // it, not a description of THIS king (the e8 smothered mate heard "corner").
  // The reveal names the pattern (Narration Voice Rule 7) and stops; a mate
  // with no named pattern is already said by the line itself.
  if (reveal && c.source === 'mate') return `That pattern is called ${c.name}.`;
  if (reveal && c.id === 'mate_threat') return null;
  // Two registers. The post-solve EXPLANATION (reveal) speaks the full register
  // = the board-true INSTANCE ("bishop on g5 forks king e7 and queen d8") + the
  // invariant — the line only says "landing a fork" and never names the
  // targets, so the instance IS the teaching (David 2026-09-15 narration
  // review). The pre-solve HINT (no reveal) speaks the invariant alone — the
  // pattern and why it works, no square given away.
  const inv = !reveal && c.source === 'tactic' ? tacticInvariant(c.id) : null;
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
    if (lead) return { conceptName: lead.name, conceptId: lead.id, idea: computedIdea(lead, false) ?? lead.full };
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

/** Material class a capture counts in — a knight for a bishop is a trade, so
 *  the two minors net against each other. */
type MaterialClass = 'queen' | 'rook' | 'minor' | 'pawn';
const CLASS_OF: Record<string, MaterialClass | null> = { q: 'queen', r: 'rook', b: 'minor', n: 'minor', p: 'pawn', k: null };
const CLASS_VALUE: Record<MaterialClass, number> = { queen: 9, rook: 5, minor: 3, pawn: 1 };
const CLASS_ORDER: readonly MaterialClass[] = ['queen', 'rook', 'minor', 'pawn'];
const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** "the queen" / "a rook" / "two pawns" — what the student won. */
function gainPhrase(cls: MaterialClass, n: number): string {
  const many = (one: string, plural: string): string => (n === 1 ? one : `${countWord(n)} ${plural}`);
  switch (cls) {
    case 'queen': return many('the queen', 'queens');
    case 'rook': return many('a rook', 'rooks');
    case 'minor': return many('a piece', 'pieces');
    case 'pawn': return many('a pawn', 'pawns');
  }
}

/** "your queen" / "a rook" — what the student gave for it. */
function lossPhrase(cls: MaterialClass, n: number): string {
  return cls === 'queen' && n === 1 ? 'your queen' : gainPhrase(cls, n);
}

/** One played ply of the solution, read off the board it was played on. */
interface ReadPly {
  san: string;
  student: boolean;
  /** Piece letter captured (chess.js), if any. */
  captured: string | null;
  promotion: string | null;
  to: string;
  /** The mover was in check before playing it. */
  inCheck: boolean;
  /** It was the mover's only legal move. */
  only: boolean;
}

function readPlies(plies: readonly DnaLinePly[], studentColor: 'w' | 'b'): ReadPly[] | null {
  const out: ReadPly[] = [];
  try {
    for (const p of plies) {
      const c = new Chess(p.fenBefore);
      const inCheck = c.inCheck();
      const only = c.moves().length === 1;
      const mv = c.move(p.san);
      if (!mv) return null;
      out.push({
        san: mv.san, student: mv.color === studentColor, captured: mv.captured ?? null,
        promotion: mv.promotion ?? null, to: mv.to, inCheck, only,
      });
    }
  } catch {
    return null;
  }
  return out;
}

/** What the line nets the student, counted over the plies themselves:
 *  "the queen", "a rook", "the queen for a rook". Null when it wins no
 *  material (a mate, a positional line, or an even trade). */
function materialResult(plies: readonly ReadPly[]): string | null {
  const net: Record<MaterialClass, number> = { queen: 0, rook: 0, minor: 0, pawn: 0 };
  for (const p of plies) {
    const cls = p.captured ? CLASS_OF[p.captured] : null;
    if (!cls) continue;
    net[cls] += p.student ? 1 : -1;
  }
  const value = CLASS_ORDER.reduce((s, k) => s + net[k] * CLASS_VALUE[k], 0);
  if (value <= 0) return null;
  const gains = CLASS_ORDER.filter((k) => net[k] > 0).map((k) => gainPhrase(k, net[k]));
  const losses = CLASS_ORDER.filter((k) => net[k] < 0).map((k) => lossPhrase(k, -net[k]));
  if (gains.length === 0) return null;
  return losses.length > 0 ? `${andList(gains)} for ${andList(losses)}` : andList(gains);
}

/** A sentence from a clause: capitalised, terminated — never capitalising a
 *  pawn move ("exd5 takes the knight", not "Exd5"). */
function asSentence(clause: string): string {
  const t = clause.trim();
  if (!t) return '';
  const lead = /^[a-h][1-8x]/.test(t) ? t : t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(lead) ? lead : `${lead}.`;
}

/** The student's move, plainly: what it takes or promotes to, and on the last
 *  move what the line won. No per-ply commentary — the motif sentence carries
 *  the WHY, once. */
function studentClause(p: ReadPly, opts: { first: boolean; last: boolean; result: string | null }): string {
  if (p.san.endsWith('#')) return opts.first ? `${p.san} is checkmate` : `and ${p.san} is checkmate`;
  const lead = opts.first ? p.san : `then ${p.san}`;
  if (opts.last && opts.result) return `${lead}, and you win ${opts.result}`;
  if (p.promotion) return p.promotion === 'q' ? `${lead} — the pawn queens` : `${lead} — the pawn becomes a ${PIECE_NAME[p.promotion] ?? 'piece'}`;
  if (p.captured) return `${lead} takes the ${PIECE_NAME[p.captured] ?? 'piece'}`;
  return lead;
}

/** The opponent's reply, plainly — their move, never credited with a motif
 *  (the line's tactic is the student's). */
function opponentClause(p: ReadPly, prevStudentTo: string | null): string {
  const they = p.only ? 'they have to' : 'they';
  if (p.captured) {
    if (!p.inCheck && prevStudentTo === p.to) return `${they} take back with ${p.san}`;
    return `${they} take your ${PIECE_NAME[p.captured] ?? 'piece'} with ${p.san}`;
  }
  if (p.only) return `they have to play ${p.san}`;
  if (p.inCheck) return `they answer the check with ${p.san}`;
  return `they answer ${p.san}`;
}

/**
 * The opponent's reply inside a line played FOR the student, as one plain
 * sentence — "They answer the check with Kf1.", "They have to take your queen
 * with Rxd8.", "They take back with Rxc3." The ONE vocabulary every surface
 * that plays a projected line out uses for the other side's moves: no motif is
 * credited to the reply (the line's point is the student's) and no positional
 * commentary rides it. `prevStudentTo` is the square the student's previous
 * ply CAPTURED on (null otherwise), so a capture there reads as a take-back. Null when the move
 * cannot be replayed from `fenBefore`.
 */
export function opponentReplySentence(fenBefore: string, san: string, prevStudentTo: string | null): string | null {
  let mover: 'w' | 'b';
  try { mover = new Chess(fenBefore).turn(); } catch { return null; }
  const read = readPlies([{ fenBefore, san }], mover === 'w' ? 'b' : 'w');
  if (!read || read.length === 0) return null;
  return asSentence(opponentClause(read[0], prevStudentTo));
}

/** Shared composer: given the student's key plies + themes + the key move's
 *  arrow, build the concept explanation — the line in plain coach speech
 *  (the student's moves, the opponent's forced replies, what it wins) with
 *  the computed motif sentence placed right after the move that lands it. */
function compose(
  keyPlies: DnaLinePly[],
  themes: string[],
  arrow: { from: string; to: string } | null,
  computed: ComputedConcept | null,
  /** The student's colour — the line alternates movers, so the opponent's
   *  replies are spoken as theirs ("they answer Kh2"), never as the student's. */
  studentColor: 'w' | 'b',
  /** Index in the computed concept's `line` of keyPlies[0] (the puzzle's
   *  setup move sits before it). */
  lineOffset: number,
): PuzzleConceptExplanation | null {
  if (keyPlies.length === 0) return null;
  const read = readPlies(keyPlies, studentColor);
  if (!read) return null;

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
  // A delivered mate the classifier only read as a "threat" is named for what
  // it is — the mate is on the board.
  const conceptName = computed?.id === 'mate_threat' ? 'Checkmate' : (computed?.name ?? tagName);
  const idea = computed ? computedIdea(computed, true) : passageIdea;

  const result = read[read.length - 1]?.san.endsWith('#') ? null : materialResult(read);
  const lastStudent = read.map((p) => p.student).lastIndexOf(true);
  let firstStudentSeen = false;
  let prevStudentTo: string | null = null;
  const plyLines = read.map((p, i): string => {
    if (!p.student) {
      const c = opponentClause(p, prevStudentTo);
      prevStudentTo = null;
      return asSentence(c);
    }
    const c = studentClause(p, { first: !firstStudentSeen, last: i === lastStudent, result });
    firstStudentSeen = true;
    // Only a CAPTURE can be taken back: a pawn pushed to c5 and taken there
    // was won, not recaptured.
    prevStudentTo = p.captured ? p.to : null;
    return asSentence(c);
  });
  // A line that ends on the opponent's move still says what it won.
  const lastAt = read.length - 1;
  if (result && lastStudent !== lastAt) plyLines[lastAt] = `${plyLines[lastAt]} ${asSentence(`you win ${result}`)}`;

  // The WHY sits right after the move that lands it — the computed concept's
  // own line says which ply that is. Otherwise (a book passage, a principle of
  // the whole position) it closes the explanation.
  const keyAt = computed?.line && computed.line.length > 0 ? computed.line.length - 1 - lineOffset : -1;
  const ideaClause = idea && keyAt >= 0 && keyAt < read.length ? keyAt : null;
  const clauses = read.map((_, i) => {
    const base = plyLines[i] ?? '';
    return i === ideaClause && idea ? `${base} ${idea}`.trim() : base;
  });
  const line = plyLines.filter(Boolean).join(' ');
  const parts = clauses.filter(Boolean);
  if (idea && ideaClause === null) parts.push(idea);
  const spoken = parts.join(' ').trim();
  if (!spoken) return null;

  return {
    conceptName, conceptId, computedId: computed?.id ?? null, computedSource: computed?.source ?? null,
    line, idea, arrow, spoken, clauses, clausePlyStart: 0, ideaClause,
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
  const out = compose(keyPlies.map((p) => ({ fenBefore: p.fenBefore, san: p.san })), themes, arrow, computed, studentColor, idx);
  return out ? { ...out, clausePlyStart: idx } : null;
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
  return compose(plies, themes, arrow, computedLead({ fen: setupFen, uci, studentColor }), studentColor, 0);
}
