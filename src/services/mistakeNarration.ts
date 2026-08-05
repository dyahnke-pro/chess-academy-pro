import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { explainBestMoveGrounded, describeMoveGeometry } from './groundedAnswer';
import { noteAtPosition, spokenBeatText } from './danyaTeachingService';
import { gradeNarrationText } from './coachAnswerGates';
import type { MistakeClassification, MistakeGamePhase, MistakeNarration } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NarrationParams {
  classification: MistakeClassification;
  gamePhase: MistakeGamePhase;
  playerMoveSan: string;
  bestMoveSan: string;
  cpLoss: number;
  fen: string;
  moves: string; // space-separated UCI continuation
  opponentName?: string | null;
  gameDate?: string | null;
  openingName?: string | null;
  evalBefore?: number | null; // from player's perspective in pawns (positive = player ahead)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cpToText(cp: number): string {
  const pawns = (cp / 100).toFixed(1);
  if (cp >= 300) return `about ${pawns} pawns — a serious swing`;
  if (cp >= 150) return `around ${pawns} pawns`;
  return `roughly ${pawns} pawns`;
}

function timeAgoText(dateStr: string): string {
  const gameDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - gameDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'last month';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return 'over a year ago';
}

function advantageText(evalBefore: number): string {
  if (evalBefore > 1.5) return 'You had a strong advantage';
  if (evalBefore > 0.5) return 'You were slightly better';
  if (evalBefore > -0.5) return 'The position was roughly equal';
  if (evalBefore > -1.5) return 'You were slightly worse';
  return 'You were already in trouble';
}

/** WHERE YOU STOOD — the one sentence that says whether the game was still
 *  yours when you slipped. Stated whenever an eval exists, full stop.
 *
 *  It used to live inside `buildContextSentence`, appended after the opponent /
 *  date clause and therefore only when THAT clause had something to say. A
 *  puzzle with a known `evalBefore` but no opponent metadata dropped it
 *  silently — which is exactly what David's screenshot showed: a 350cp swing
 *  narrated with no hint that he had been winning. Standing is computed from
 *  the eval alone and never depends on who the opponent was. */
function buildStandingSentence(params: NarrationParams): string {
  if (params.evalBefore === null || params.evalBefore === undefined) return '';
  return `${advantageText(params.evalBefore)}.`;
}

/** WHICH GAME this came from. Pure metadata — no eval, no board claim. Returns
 *  '' when the puzzle carries no opponent, date or opening, which is fine:
 *  the standing and position clauses stand on their own. */
function buildContextSentence(params: NarrationParams): string {
  const parts: string[] = [];

  if (params.opponentName && params.gameDate) {
    parts.push(`In your game vs ${params.opponentName} ${timeAgoText(params.gameDate)}`);
  } else if (params.opponentName) {
    parts.push(`In your game vs ${params.opponentName}`);
  } else if (params.gameDate) {
    parts.push(`In your game from ${timeAgoText(params.gameDate)}`);
  }

  if (params.openingName) {
    parts.push(`playing the ${params.openingName}`);
  }

  if (parts.length === 0) return '';

  let sentence = parts[0];
  if (parts.length > 1) {
    sentence += ', ' + parts[1];
  }
  return `${sentence}.`;
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return uci;
  }
}

// ─── Position-Aware Move Analysis ──────────────────────────────────────────

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd4', 'd5', 'd6', 'e3', 'e4', 'e5', 'e6', 'f3', 'f4', 'f5', 'f6']);
const DEVELOPMENT_RANK_WHITE = new Set(['1']); // pieces starting on rank 1
const DEVELOPMENT_RANK_BLACK = new Set(['8']);

interface MoveIdea {
  isCapture: boolean;
  isCheck: boolean;
  isCastle: boolean;
  isPromotion: boolean;
  movesToCenter: boolean;
  developsPiece: boolean;
  createsPin: boolean;
  attacksKing: boolean;
  pieceMoved: string; // 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'
  conceptHints: string[];
}

function analyzeMoveIdea(fen: string, bestMoveSan: string, gamePhase: MistakeGamePhase): MoveIdea {
  const idea: MoveIdea = {
    isCapture: false,
    isCheck: false,
    isCastle: false,
    isPromotion: false,
    movesToCenter: false,
    developsPiece: false,
    createsPin: false,
    attacksKing: false,
    pieceMoved: 'pawn',
    conceptHints: [],
  };

  try {
    const chess = new Chess(fen);
    const turnColor = chess.turn() === 'w' ? 'white' : 'black';
    const move = chess.move(bestMoveSan);

    idea.isCapture = move.captured !== undefined;
    idea.isCheck = chess.isCheck();
    idea.isCastle = move.san === 'O-O' || move.san === 'O-O-O';
    idea.isPromotion = move.promotion !== undefined;
    idea.movesToCenter = CENTER_SQUARES.has(move.to) || EXTENDED_CENTER.has(move.to);

    // Determine piece type
    const pieceMap: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
    idea.pieceMoved = pieceMap[move.piece] ?? 'piece';

    // Check if this develops a piece from its starting rank
    const devRank = turnColor === 'white' ? DEVELOPMENT_RANK_WHITE : DEVELOPMENT_RANK_BLACK;
    if (devRank.has(move.from[1]) && move.piece !== 'k' && move.piece !== 'p') {
      idea.developsPiece = true;
    }

    // Build conceptual hints based on what the move accomplishes
    if (idea.isCastle) {
      idea.conceptHints.push('Think about king safety — getting your king tucked away.');
      idea.conceptHints.push('Consider castling to connect your rooks and protect your king.');
    }
    if (idea.isCheck && idea.isCapture) {
      idea.conceptHints.push('Look for a forcing move that wins material.');
      idea.conceptHints.push('There\'s a way to capture with check here.');
    } else if (idea.isCheck) {
      idea.conceptHints.push('Look for a way to put the king under pressure.');
      // Was "…that improves your position", which is the same empty phrase the
      // per-move fallback used to end on — it tells the student nothing about
      // what the check achieves. A check is forcing; say that, since it is the
      // reason to look for one.
      idea.conceptHints.push('There\'s a forcing check here — it takes the opponent\'s choices away.');
    } else if (idea.isCapture) {
      idea.conceptHints.push('There\'s an unprotected piece you can take advantage of.');
      idea.conceptHints.push('Look at what your opponent left hanging.');
    }
    if (idea.developsPiece && gamePhase === 'opening') {
      idea.conceptHints.push(`Think about getting your ${idea.pieceMoved} into the game with tempo.`);
      idea.conceptHints.push('Focus on developing a piece to an active square.');
    }
    if (idea.movesToCenter && idea.pieceMoved === 'pawn') {
      idea.conceptHints.push('Consider reinforcing your control of the center.');
      idea.conceptHints.push('There\'s a pawn move that stakes a claim in the center.');
    } else if (idea.movesToCenter) {
      idea.conceptHints.push(`Think about placing your ${idea.pieceMoved} on a more active central square.`);
    }
    if (idea.isPromotion) {
      idea.conceptHints.push('One of your pawns is ready to become something much stronger.');
    }

    // NO GENERIC FALLBACK. What used to sit here — "Look for the move that
    // creates the most problems for your opponent", "Think about improving
    // your worst-placed piece" and four siblings — named nothing on the board
    // and fired precisely when nothing had been computed about the move.
    //
    // Leaving `conceptHints` EMPTY is strictly better, because both call sites
    // in MistakePuzzleBoard already fall back to `getCoachingMessage(tacticType,
    // …)`, which is keyed on the puzzle's actual tactic and rating. Emitting a
    // platitude here was outranking a genuinely tactic-aware hint.
  } catch {
    idea.conceptHints.push('Take a closer look at the position — there\'s a stronger idea here.');
  }

  return idea;
}

/** Build a spoiler-free explanation of the position's key idea (no move name) */
export function describePositionIdea(fen: string, bestMoveSan: string, gamePhase: MistakeGamePhase): string {
  const idea = analyzeMoveIdea(fen, bestMoveSan, gamePhase);

  if (idea.isCastle) return 'King safety is critical here — think about tucking the king away and connecting the rooks.';
  if (idea.isCheck && idea.isCapture) return 'There\'s a way to win material with a forcing move that also attacks the king.';
  if (idea.isPromotion) return 'A pawn is ready to promote. Look for the path to get it across.';
  if (idea.isCheck) return 'There\'s a check available that creates serious problems for your opponent.';
  if (idea.isCapture) return 'Something is hanging — look for the material you can win.';
  if (idea.developsPiece && idea.movesToCenter) return `Your ${idea.pieceMoved} wants a more active square — think about centralizing it with tempo.`;
  if (idea.developsPiece) return `Think about which piece isn't in the game yet. Your ${idea.pieceMoved} needs a better square.`;
  if (idea.movesToCenter) return 'The center is the key to this position — look for ways to strengthen your grip.';

  if (gamePhase === 'endgame') return 'In this endgame, king activity and pawn advancement are everything.';
  if (gamePhase === 'opening') return 'Focus on development, center control, and king safety.';
  return 'Look for the move that creates the most problems for your opponent.';
}

// `describeMoveIdea` is DELETED (David 2026-08-04). It was the producer of
// "<move> improves your position." — the phrase that closed David's logged
// "That's it! king to g5. king to g5 improves your position." It restated the
// move and said nothing about the board. Its job now belongs to
// `explainBestMoveGrounded` / `describeMoveGeometry`, which name the concrete
// point of the move or return null. Verified unreferenced before removal.

// ─── Intro Templates ────────────────────────────────────────────────────────

const INTRO_TEMPLATES: Record<MistakeClassification, string[]> = {
  blunder: [
    'You played {playerMove} here, but that was a blunder costing {cpText}. Can you find the better move?',
    '{playerMove} was a serious mistake — you lost {cpText}. What should you have played?',
    'Uh oh — {playerMove} dropped {cpText}. Find the right move.',
  ],
  mistake: [
    'You played {playerMove}, but there was something significantly better — that cost {cpText}. What was it?',
    '{playerMove} wasn\'t the best here, costing {cpText}. Can you spot the improvement?',
    'With {playerMove} you gave up {cpText}. Find the stronger option.',
  ],
  inaccuracy: [
    '{playerMove} was okay, but there\'s a more precise option. Can you find it?',
    'Slight slip with {playerMove}. What\'s the sharper move?',
    'Not a bad move with {playerMove}, but the engine found something better. What is it?',
  ],
  miss: [
    'Your opponent slipped here and you missed it! What was the best response?',
    'There was a chance to capitalize here, but you played {playerMove} instead. Find the winning move.',
    '{playerMove} let your opponent off the hook. What should you have played?',
  ],
};

/** WHAT THIS POSITION IS — read off the board, or nothing at all.
 *
 *  This replaces the `PHASE_CONTEXT` pool: three fixed strings per phase, of
 *  which "Middlegame positions require checking for checks, captures, and
 *  threats on every move" was #2. It appeared on EVERY middlegame puzzle
 *  forever, named no square and no piece, and taught nothing about the board in
 *  front of the student — narration rule #1 (concrete over generic) in a single
 *  sentence. It is deleted with no replacement pool.
 *
 *  What stands in its place is computed. `detectTactics` is chess.js-only and
 *  deterministic, and its `TacticPattern.description` is already board-true
 *  prose that names the squares ("Knight on d5 forks queen on c7 and rook on
 *  f6"). A hanging piece is likewise a fact about THIS position.
 *
 *  Returns '' when the board shows nothing worth saying, and that is a correct
 *  answer: rule #4 — silence is acceptable, and empty beats generic. A quiet
 *  position simply gets no third sentence.
 *
 *  NB this reads the position BEFORE the mistake, which is what the student is
 *  looking at, so nothing here can spoil the answer — it describes the shape of
 *  the problem, never the move that solves it. */
const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** `evalBefore` in the form the eval-claim gate expects.
 *
 *  Two conversions, both easy to get backwards and both load-bearing:
 *  `evalBefore` is PAWNS from the STUDENT's perspective; `validateEvalClaims`
 *  wants CENTIPAWNS from WHITE's. The student is whoever is to move in the
 *  puzzle FEN, so a Black-to-move puzzle flips sign. Get this wrong and the gate
 *  drops exactly the true sentences and keeps the false ones. */
function whiteAheadCp(fen: string, evalBefore: number | null | undefined): number | undefined {
  if (evalBefore === null || evalBefore === undefined) return undefined;
  try {
    const studentIsWhite = new Chess(fen).turn() === 'w';
    return evalBefore * 100 * (studentIsWhite ? 1 : -1);
  } catch {
    return undefined;
  }
}

/** THE DISTILLED NOTE — the narration standard (David 2026-08-04: "the distilled
 *  notes are the new standard for narration… falls back to grounded code if no
 *  notes").
 *
 *  The farmed teaching corpus is what a coach actually says about a position, so
 *  it LEADS wherever it covers the board. The computed board read below is the
 *  FALLBACK for the positions the corpus has never taught — and silence is the
 *  fallback below that. Same hierarchy the teach walkthrough uses, so the two
 *  surfaces speak with one voice.
 *
 *  Two guards, both load-bearing:
 *   - `gradeNarrationText` drops any sentence that is provably false on THIS
 *     board. A note retrieved by structure or concept was written about a
 *     different position, so its claims are not automatically true here (G3).
 *   - the spoiler guard still applies: a note naming a square the solution moves
 *     through is withheld until after the attempt (rule #8).
 *
 *  A tactics puzzle carries no move history, so retrieval keys on FEN + opening
 *  — which reaches the structure and concept tiers, exactly the tiers meant for
 *  a position arriving with no line behind it. */
function buildNoteRead(
  fen: string,
  openingName: string | null | undefined,
  avoidSquares: Set<string>,
  evalBefore: number | null | undefined,
): string {
  try {
    // EXACT TIER ONLY — `noteAtPosition`, not `teachingNoteForBoard`.
    //
    // A tactics puzzle arrives with no move history, so the full chain falls
    // straight past the exact tier into STRUCTURE TRANSFER and the CONCEPT
    // tier — the two tiers whose whole job is to borrow a note from a DIFFERENT
    // position. On a live board past book that is the right answer. Here it is
    // not, and the board-truth sweep showed why: it retrieved 600-character
    // opening lectures about other positions ("if Black has a fianchettoed
    // bishop on g7", "retreat the bishop to f2") and spoke them over an
    // unrelated puzzle. `gradeNarrationText` could not save it, because those
    // claims are HYPOTHETICAL — nothing on this board disproves "if Black
    // has…", so the sentences survive the gate while being about nothing the
    // student is looking at.
    //
    // This is the same scoping rule David locked for the taught walkthrough on
    // 2026-08-02, and it binds harder here: a puzzle has no opening to scope
    // by at all. The distilled note still LEADS wherever the corpus genuinely
    // teaches THIS position; where it does not, the grounded board read behind
    // it is the honest answer.
    const note = noteAtPosition([], fen, openingName ?? null);
    if (!note) return '';
    const graded = gradeNarrationText(
      spokenBeatText(note),
      fen,
      'mistakeNarration.note',
      whiteAheadCp(fen, evalBefore),
    );
    const text = graded?.trim();
    if (!text) return '';
    // Never hand over the answer before the student has tried.
    for (const sq of avoidSquares) {
      if (new RegExp(`\\b${sq}\\b`).test(text)) return '';
    }
    return text;
  } catch {
    return ''; // the corpus is a bonus, never a blocker
  }
}

function buildPositionRead(fen: string, avoidSquares: Set<string> = new Set()): string {
  try {
    const { tactics, hangingPieces } = detectTactics(fen);

    // A named pattern is the strongest thing the board can offer, and rule #7
    // says name the pattern. Its description already carries the squares.
    //
    // SPOILER GUARD: skip any pattern that sits on the squares the solution
    // moves through. `detectTactics` does not know which tactic the puzzle is
    // asking for, so without this the intro can hand over the answer before
    // the student has tried — the exact thing rule #8 forbids. Cheap and
    // deterministic: compare against the best move's from/to.
    const safe = tactics.find(
      (t) => t.description && !t.involvedSquares.some((sq) => avoidSquares.has(sq)),
    );
    if (safe) return `${safe.description.replace(/\.$/, '')}.`;

    // Otherwise: material actually left loose. Concrete, and the single most
    // common thing a mistake puzzle turns on.
    const hp = hangingPieces.find((h) => !avoidSquares.has(h.square));
    if (hp) {
      // `piece` is the chess.js symbol ("p"), never speakable as-is — Polly
      // reads it as the letter.
      const word = PIECE_WORD[hp.piece.toLowerCase()] ?? 'piece';
      return `The ${word} on ${hp.square} is loose.`;
    }
  } catch {
    /* board reads are a bonus, never a blocker */
  }
  return '';
}

/** The squares the solution passes through — off-limits to the pre-attempt
 *  position read, so describing the board can never leak the answer. */
function solutionSquares(movesUci: string): Set<string> {
  const first = movesUci.trim().split(/\s+/).filter(Boolean)[0];
  if (!first || first.length < 4) return new Set();
  return new Set([first.slice(0, 2), first.slice(2, 4)]);
}

// ─── Move Narrations ────────────────────────────────────────────────────────

/** The per-move pools are GONE (David 2026-08-04).
 *
 *  They opened with "That's it!", "Correct,", "Nice find!", "Well played,",
 *  "Perfect," — banned outright by narration rule #5, because the position
 *  turning in the student's favour IS the acknowledgment and praise rings
 *  hollow by the third puzzle. Worse, `FIRST_MOVE_TEMPLATES[0]` stitched to the
 *  `describeBestMove` fallback produced David's logged line:
 *
 *      "That's it! king to g5. king to g5 improves your position."
 *
 *  — the move named twice (rule #3: don't restate the board; the student just
 *  played it) wrapped around a phrase that says nothing about the position.
 *
 *  What replaces them is `explainBestMoveGrounded` / `describeMoveGeometry`:
 *  the concrete point of the move — the fork, the pin, the mate, the material.
 *  When neither computes anything, the move is narrated with SILENCE rather
 *  than filler. See `buildMoveNarrations`.
 *
 *  The opponent's reply keeps a bare statement of fact — no "stay sharp!", no
 *  rhetorical question — because the student needs to know what was played. */
function opponentReplyText(san: string): string {
  return `Your opponent replies ${san}.`;
}

// ─── Outro Templates (position-aware) ──────────────────────────────────────

function buildOutro(params: NarrationParams, idea: MoveIdea): string {
  const { classification, gamePhase } = params;

  // Build a position-specific outro based on what the best move was about
  const outroVariants: string[] = [];

  if (idea.isCastle) {
    outroVariants.push('Remember — king safety is never optional. Castle early when you can.');
    outroVariants.push('Getting your king safe early frees you to attack without worrying about back-rank issues.');
  }
  if (idea.isCapture) {
    outroVariants.push('Always check if something is undefended before committing to your plan.');
    outroVariants.push('Hanging pieces are free points. Make it a habit to scan for captures first.');
  }
  if (idea.isCheck) {
    outroVariants.push('Checks are forcing — they limit your opponent\'s options. Always consider them.');
    outroVariants.push('When you have a forcing check that also improves your position, it\'s usually the right call.');
  }
  if (idea.developsPiece) {
    outroVariants.push('Developing with purpose is the hallmark of strong opening play. Get those pieces working.');
    outroVariants.push('Every move in the opening should either develop a piece, control the center, or prepare castling.');
  }
  if (idea.movesToCenter && idea.pieceMoved === 'pawn') {
    outroVariants.push('Central pawns control key squares. Reinforcing the center is almost always a solid plan.');
  }

  // NO PHASE FALLBACK. The pool that used to sit here ("Tactical awareness in
  // the middlegame comes from pattern recognition…" and its two siblings per
  // phase) named nothing on the board and fired whenever the move had no
  // computed signal — i.e. precisely when we had nothing to say. Rule #4: an
  // empty outro is a valid outro. Every branch above is tied to something
  // `analyzeMoveIdea` actually proved about the move.
  void gamePhase;

  // The classification "closers" are gone too — "These moments are painful but
  // they teach the most lasting lessons", "Stay hungry for your opponent's
  // errors" and the rest were motivational filler bolted onto every outro
  // regardless of the position (rules #1 and #5).
  void classification;

  return outroVariants.length > 0 ? pick(outroVariants) : '';
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateMistakeNarration(params: NarrationParams): MistakeNarration {
  const { classification, gamePhase, playerMoveSan, bestMoveSan, cpLoss, fen, moves } = params;

  const cpText = cpToText(cpLoss);
  const idea = analyzeMoveIdea(fen, bestMoveSan, gamePhase);

  // THE INTRO, in the order a coach would say it: which game, where you stood,
  // what you played, what the position is. Every clause is dropped when it
  // computes to nothing, so a puzzle with no metadata and a quiet board gets a
  // one-sentence intro rather than three sentences of padding.
  // Ordered the way a coach actually says it. The position read sets up the
  // problem, so it comes BEFORE the ask — the INTRO_TEMPLATES end in a question
  // ("What should you have played?"), and anything after that reads as an
  // afterthought tacked on past the point of the sentence.
  const spoilers = solutionSquares(moves);
  const introClauses = [
    buildContextSentence(params),
    // Unconditional now — see buildStandingSentence. This is the clause that
    // was silently lost on any puzzle without opponent metadata.
    buildStandingSentence(params),
    // THE STANDARD: the distilled note leads; the computed board read is the
    // fallback when the corpus has never taught this position; silence is the
    // fallback below that.
    buildNoteRead(fen, params.openingName, spoilers, params.evalBefore)
      || buildPositionRead(fen, spoilers),
    pick(INTRO_TEMPLATES[classification])
      .replace(/\{playerMove\}/g, playerMoveSan)
      .replace(/\{bestMove\}/g, bestMoveSan)
      .replace(/\{cpText\}/g, cpText),
  ].filter((c) => c.trim().length > 0);
  const intro = introClauses.join(' ');

  // Per-move: the concrete point of each move, or silence.
  const moveNarrations = buildMoveNarrations(fen, moves, params);

  const outro = buildOutro(params, idea);

  // The wrong-attempt hint fires AFTER the student has already heard the intro,
  // so repeating the same board read would be the coach saying one thing twice.
  // Pass the intro's read in as `alreadySaid` and it falls through to the next
  // fact — or to the concept advice — instead.
  const conceptHint = buildConceptHint(fen, idea, spoilers, introClauses);

  return { intro, moveNarrations, outro, conceptHint };
}

/** A hint that points at the board, not at the answer, and does not repeat a
 *  sentence the student was already told in the intro. */
function buildConceptHint(
  fen: string,
  idea: MoveIdea,
  spoilers: Set<string>,
  alreadySaid: string[],
): string {
  const read = buildPositionRead(fen, spoilers);
  if (read && !alreadySaid.includes(read)) return read;
  return idea.conceptHints.length > 0 ? pick(idea.conceptHints) : '';
}

/** One entry per STUDENT move in the solution line: what that move concretely
 *  does, computed from the board it is played on.
 *
 *  The move's SAN is deliberately NOT restated — the student just played it and
 *  can see it (rule #3). What they cannot see is why it works, and that is the
 *  only thing said here. A move whose point neither `explainBestMoveGrounded`
 *  nor `describeMoveGeometry` can prove is narrated as '' — the caller skips
 *  empty entries, so the board simply plays on in silence (rule #4). That is
 *  the correct outcome for a quiet consolidating move; it is not a gap to fill.
 *
 *  The final move is allowed one closing clause, because "and that finishes it"
 *  is genuinely new information — the line is over. */
function buildMoveNarrations(fen: string, movesUci: string, params: NarrationParams): string[] {
  const uciMoves = movesUci.trim().split(/\s+/).filter(Boolean);
  if (uciMoves.length === 0) return [];

  const narrations: string[] = [];
  const chess = new Chess(fen);
  const moverColor: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';
  const playerMoveCount = Math.ceil(uciMoves.length / 2);

  for (let i = 0; i < uciMoves.length; i += 1) {
    const fenBefore = chess.fen();
    const san = uciToSan(fenBefore, uciMoves[i]);
    const isPlayerMove = i % 2 === 0;

    try {
      chess.move({
        from: uciMoves[i].slice(0, 2),
        to: uciMoves[i].slice(2, 4),
        promotion: uciMoves[i].length > 4 ? uciMoves[i][4] : undefined,
      });
    } catch {
      break;
    }

    if (isPlayerMove) {
      const playerIdx = Math.floor(i / 2);
      // What this move DOES — the fork, the pin, the mate, the material won.
      // Grounded: both helpers read the board and return null rather than guess.
      //
      // The bare "attacks the X" clause is DROPPED, matching the exclusion
      // `explainBestMoveGrounded` already makes internally. An attack is not a
      // merit claim: the attacking piece can be hanging itself, and the board
      // sweep caught exactly that — "Attacks the rook on b1. Your opponent
      // replies Rxe1#." Forks, pins, mate, check and material are all forcing
      // or material-safe; a lone attack is neither.
      const geometry = describeMoveGeometry(fenBefore, san, moverColor);
      const point =
        explainBestMoveGrounded(fenBefore, params.playerMoveSan, uciMoves[i], moverColor)
        ?? (geometry && !/^attacks\b/i.test(geometry.trim()) ? geometry : '')
        ?? '';
      const isFinal = playerIdx === playerMoveCount - 1;
      const clauses = [point.trim()];
      // Mate is the ONE closing clause worth speaking: the line is over and the
      // board has changed in a way the student needs told. An earlier draft of
      // this also appended "That is the idea." to every final move — which,
      // since most mistake lines are a single move, put a fixed tic on nearly
      // every puzzle. That is the template-pool habit growing straight back;
      // deleted.
      if (isFinal && chess.isCheckmate()) clauses.push('That is mate.');
      const text = clauses.filter(Boolean).join(' ');
      narrations.push(text ? capitalizeFirst(text) : '');
    } else if (narrations.length > 0) {
      // The opponent's reply is stated plainly and appended to the student's
      // last beat, so the two never overlap as separate spoken lines.
      const prev = narrations[narrations.length - 1];
      narrations[narrations.length - 1] = prev
        ? `${prev} ${opponentReplyText(san)}`
        : opponentReplyText(san);
    }
  }

  return narrations;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
