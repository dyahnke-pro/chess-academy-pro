// narrationArrows — derive a ply's arrows from the moves its narration NAMES,
// with every candidate verified before it is allowed to draw.
//
// David 2026-07-31: "It should be only the squares and threats mentioned in the
// narration. Nothing more, nothing less. That way everything blends together.
// Unified." — and "We need to make the arrows deterministic."
//
// This REPLACES the runtime prose-scrape in `mentionedMoveArrows`. The
// difference that matters is WHEN it runs: derivation happens offline, at bake
// time, where a wrong arrow can be rejected and reviewed. The old path derived
// arrows at render time with no gate, so three classes of false arrow shipped
// straight to the board (all three measured on the shipped Grand Prix / Glek
// narration, 2026-07-31):
//
//   "keeps the knight off f3"  → drew f2-f3   (f3 is a SQUARE reference)
//   "Bc4 (or Bb5)"             → drew c4-b5   (an ALTERNATIVE, resolved after
//                                              the probe had already played Bc4)
//   "Qe1-h4"                   → drew h2-h4   (COMPOUND notation; the trailing
//                                              square read as a pawn push)
//
// G0/G3: pure code. Nothing is invented — a token that doesn't resolve to a
// legal move from a real position draws nothing at all.
//
// ─── WHOSE MOVE A NAMED MOVE IS (2026-11-11) ────────────────────────────────
//
// The resolver used to ignore what the words say about the side: every token
// was tried for the side to move, then for the other, and whichever was legal
// first drew. On the opening courses — written to one rule, printed on every
// fact sheet: White's move bare, Black's with the dots — that put an arrow on
// the wrong side's piece on 816 of the 7,501 beats, one in nine (361 dotted
// moves drawn for White, 503 bare moves drawn for Black): "…d5 and …e6 are
// close behind" drew White's d4-d5, "f4 prepares e5" in White's own beat drew
// Black's …e5, "your other knight goes to f6" drew THEIR knight taking on f6.
// Editors were rewording beats to dodge it.
//
// The side is now read off the words, in this order, and a side the words name
// is never traded for the other one:
//
//   1. THE DOTS — "…Nf6" / "...Nf6" is Black's move, in every text. Black only;
//      not legal for Black → nothing.
//   2. THE OWNER of a spoken move — "your knight to d5", "their bishop comes to
//      e7", "White's rook to d1". That side only. Who "you" is, is the caller's
//      answer (`NarrationSides.student`).
//   3. A BARE move in a text written to the strict rule (`MoveMarking`) is
//      White's. White only.
//   4. Otherwise the words do not say. A strict text never guesses: a spoken
//      move draws for the one side that can make it, and for nobody when both
//      can. A loose text keeps the old order (the side to move, then the other).
//
// Why rule 4 and not "a spoken move in a strict text is White's": measured, 118
// spoken moves on the courses drew for Black and nearly all were RIGHT — a
// Black student's own plan ("Your plan: the queen to c7, a rook to d8") is
// said in words. The dots rule governs moves written as moves.
//
// Measure: `narrationArrows.markers.measure.test.ts` (every served lesson beat,
// before and after). Gate: `src/test/watchArrowSides.gate.test.ts`.
import { flipSideToMove } from './threatOut';
import { Chess, type Move, type Square } from 'chess.js';
import type { MoveMarking } from '../types';

type Color = 'w' | 'b';
const OTHER: Readonly<Record<Color, Color>> = { w: 'b', b: 'w' };
const COLOR_NAME: Readonly<Record<Color, string>> = { w: 'White', b: 'Black' };

/** What a text's CALLER knows that its words alone do not say. REQUIRED by the
 *  resolver, with no default, so a new caller fails to compile until it has
 *  answered both — a guess from the prose is how the wrong-side arrows shipped. */
export interface NarrationSides {
  /** What a BARE move means in this text (the dots mean Black's everywhere). */
  marking: MoveMarking;
  /** Who "you / your" is: the student's colour ("they / their" is the other
   *  side). Null for a text that addresses nobody. */
  student: 'white' | 'black' | null;
}

/** What each marking does with a move whose side the words do not name — a
 *  `Record`, so a third marking fails to compile until both are answered.
 *  `bare`: a move written bare ("Nf3", "e5"). `spoken`: a move said in words
 *  with no owner ("the knight to c3").
 *  - 'white'       White's, and only White's.
 *  - 'sole'        the one side that can make it; both can → nothing.
 *  - 'mover-first' the side to move, then the other (a guess). */
type Unnamed = 'white' | 'sole' | 'mover-first';
const UNNAMED: Readonly<Record<MoveMarking, { bare: Unnamed; spoken: Unnamed }>> = {
  strict: { bare: 'white', spoken: 'sole' },
  loose: { bare: 'mover-first', spoken: 'mover-first' },
};

/** A derived arrow plus the evidence for it, so a bake pass can be reviewed
 *  and a rejection can explain itself. */
interface DerivedArrow {
  from: string;
  to: string;
  /** The SAN this arrow represents, as resolved on the board. */
  san: string;
  /** The exact prose token that produced it. */
  token: string;
  /** Character offset of `token` in the narration text — lets a caller align
   *  an arrow with the sentence that names it. */
  index: number;
  /** Whose move it is — the colour of the piece the arrow moves. */
  color: Color;
}

interface DerivationResult {
  arrows: DerivedArrow[];
  /** Every token considered and rejected, with the reason — the gate's report. */
  rejected: Array<{ token: string; index: number; reason: string }>;
}

/** Compound move notation the prose uses for a plan: "Qe1-h4", "Nd2-f1-g3".
 *  Matched FIRST so the trailing square is never mistaken for a pawn push. */
const COMPOUND = /\b([KQRBN])([a-h][1-8])((?:-[a-h][1-8])+)/g;

const SAN_TOKEN =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8])\b/g;

/** THE DOTS: "…Nf6" and "...Nf6" (and a numbered "3...Nf6") are Black's move.
 *  Read off the characters that touch the token — the marker is part of how
 *  the move is written, never a word somewhere near it. */
const BLACK_MARKER_BEFORE = /(?:…|\.{3})$/;

// A BARE coordinate ("d5") is a square NAME at least as often as a pawn move,
// so it only draws when nothing marks it as a reference. The bias is
// deliberate: a MISSING arrow is a papercut, a WRONG arrow is the bug David
// reported three times. Piece moves (Nf3, Bb5, Qh4) are unambiguous.
// CONTROL/RELATION language — "controlling e5", "control of e4", "supports
// e4", "the weak d5-square", "off f3". The verb can sit a couple of words back
// behind a preposition or article, which is exactly what a strictly-adjacent
// blocklist kept missing, so the window allows that bridge.
//
// 2026-11-11, read off what the opening courses say (every bare square the old
// resolver drew as a pawn push, grouped by the word in front of it, and every
// removal read back against its board):
//   - a square a piece LEAVES, REACHES, USES, CLEARS or is HEADING FOR is where
//     a piece is or goes, never a pawn stepping there ("the rook lifts, heading
//     for h3" drew h2-h3);
//   - a square something TAKES ("takes b4 away from your bishop") is never a
//     push, because a push takes nothing;
//   - a square the student is told to REMEMBER, COUNT or KEEP IN MIND is being
//     pointed at;
//   - a square said to be FREE, COVERED, EMPTY, GONE or UNDER CONTROL is a
//     square.
// A colon or comma may stand between a covering word and its squares ("the
// squares it covers: e5 and c5") — for those words only: "of their own: d3
// first" and "that's your target: e4 goes straight at d5" name moves.
const SQUARE_CONTEXT_BEFORE =
  /\b(?:control|cover|support|guard|defend|protect|occupy|occupies|hold|dominate|target|watch|eye|hit|press|attack|blockade|clamp|owns?|claims?|weak(?:ness)?|outpost|square|file|rank|diagonal)\w*\s+(?:of\s+|on\s+|for\s+|over\s+|at\s+)?(?:the\s+)?$/i
  ;
const SQUARE_LIST_HEAD_BEFORE =
  /\b(?:control|cover|guard|watch|eye|square|file|rank|diagonal)\w*[:,]\s+(?:the\s+)?$/i;
const SQUARE_VERB_BEFORE =
  /\b(?:leav(?:e|es|ing)|left|vacat(?:e|es|ed|ing)|reach(?:es|ed|ing)?|us(?:e|es|ed|ing)|clear(?:s|ed|ing)?|free(?:s|d|ing)?|remember(?:s|ed|ing)?|count(?:s|ed|ing)?|tak(?:e|es|en|ing)|took|head(?:s|ed|ing)?|bound|aim(?:s|ed|ing)?|fight(?:s|ing)?|fought)\s+(?:for\s+)?(?:the\s+)?$/i;
// Plain positional prepositions immediately before the coordinate — and "d7
// for e6" (one square given up for another), which names two squares.
const SQUARE_PREPOSITION_BEFORE =
  /(?:\b(?:on|onto|off|in|at|the|to|from|via|toward|towards|through|over|near|around|along|into|against|out\s+of|by\s+way\s+of|in\s+charge\s+of|in\s+front\s+of)|\b[a-h][1-8]\s+for)\s+$/i;
const SQUARE_CONTEXT_AFTER =
  /^\s*-?\s*(square|file|rank|diagonal|pawn|knight|bishop|rook|queen|king|outpost|break|push|is|was|becomes|falls|stays|belongs|free|covered|empty|gone|away|under\s+control)\b/i;
// "Keep e5 in mind" points at the square; "a3, with b4 in mind" names the push.
const KEEP_BEFORE = /\bkeep(?:s|ing)?\s+$/i;
const IN_MIND_AFTER = /^\s+in\s+mind\b/i;

// An ALTERNATIVE is not the next step of a plan — it branches from the SAME
// position. "Bc4 (or Bb5)", "d4 instead of d3", "Nf3 rather than Nc3". So is a
// move another one is COMPARED with: "choose this over Nf3", "worse than Bb5",
// "unlike …e6" — read as a played step, it moved the plan's board, and the
// moves named after it were read from a position that never happened ("over
// Nf3 … the knight goes to e2" drew c3-e2). The dots may stand between the
// word and the move ("or …Nbd7").
const ALTERNATIVE_BEFORE =
  /\b(or|instead\s+of|rather\s+than|than|unlike|over|versus|vs\.?|not|never|avoid(?:ing)?|also\s+play|(?:usually|mostly|always)\s+play|answer\s+with|known\s+(?:mistake|trap)\s+here:)\s*\(?\s*(?:…|\.{3})?$/i;
// …and opening theory names the moves of ONE position, each from the live
// board: "Bb5 is the main move", "Masters also play Bc4 here", "…Nxd5 is a
// known trap" (2026-11-12: "Bb5 is the main move. Masters also play Bc4"
// moved the bishop to b5 on the plan's board and drew Bc4 from there).
const ALTERNATIVE_AFTER = /^\s+(?:is|was|isn't)\s+(?:the\s+main\s+move|one\s+of\s+the\s+main\s+moves|a\s+known\s+(?:mistake|trap)|the\s+usual)/i;

// NO CAP (David 2026-08-10: "If the coach says a move or square they need to be
// arrowed or highlighted… Remove all caps. We can add them back on once I see
// everything working."). This was 6 per ply. A mention beyond the sixth was
// recorded as rejected and never drawn — which is a coach naming a move and the
// board staying quiet about it. `rejected` still carries tokens turned down for
// real reasons (not a move, an alternative, illegal here); it no longer carries
// ones turned down for arriving seventh.

interface Resolved { from: string; to: string; san: string; color: Color; piece: string }

/** A board's legal moves, read once. Every board this module reads is left as
 *  it was made (a plan step is played on a copy), so a beat that names ten
 *  moves reads each position's moves once, not ten times. */
const LEGAL = new WeakMap<Chess, Move[]>();
function legalMovesOf(board: Chess): Move[] {
  let moves = LEGAL.get(board);
  if (!moves) {
    try { moves = board.moves({ verbose: true }); } catch { moves = []; }
    LEGAL.set(board, moves);
  }
  return moves;
}

function resolveOn(board: Chess, sanRaw: string): Resolved | null {
  const bare = sanRaw.replace(/[+#]$/, '');
  const hit = legalMovesOf(board).find((m) => m.san.replace(/[+#]$/, '') === bare);
  return hit ? { from: hit.from, to: hit.to, san: hit.san, color: hit.color, piece: hit.piece } : null;
}

// ─── THE SPOKEN REGISTER ─────────────────────────────────────────────────────
//
// THE HOUSE VOICE DOES NOT WRITE SAN, AND THIS FILE ONLY UNDERSTOOD SAN.
//
// Every narration rule in the project pushes prose AWAY from SAN: G9.4 bans
// move-number prefixes outright, and the Naroditsky register says write "the
// queen's knight to c3", never "2.Nc3", because the TTS sanitiser reads bare
// SAN as robotic. The corpus obeys. This deriver then saw "knight to c3", hit
// `SQUARE_PREPOSITION_BEFORE` on the trailing "to ", and rejected c3 as "square
// reference, not a move" — so it drew nothing.
//
// Measured on `voiced-walkthroughs.json`: 3,152 of 7,086 narrated nodes (44.5%)
// name a move ONLY in spoken form. Every one of them drew ZERO arrows, while
// the lead-the-eye rule ("arrows + highlights on every narrated move — NON-
// NEGOTIABLE") reported nothing wrong. Two vocabularies for the same thing that
// never reconciled; the voice rule and the board were arguing and the board
// lost silently.
//
// Resolution goes through the BOARD's own legal moves rather than by building a
// SAN string, because a synthesised string breaks on exactly the cases that
// matter: a pawn capture needs its origin file ("exd5", not "xd5"), two knights
// reaching one square need disambiguation ("Nbd2"), and promotions carry a
// suffix. Asking chess.js "which legal move puts a knight on c3" has none of
// those problems and cannot invent a move that is not there (G3).
const SPOKEN_PIECE: Readonly<Record<string, string>> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const PIECE_NAME: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SPOKEN_PIECE).map(([name, letter]) => [letter, name]),
);

/** "the knight to c3", "our bishop takes e5", "the rook swings to h3" — the
 *  piece word plus the verb that precedes a destination square. */
const SPOKEN_MOVE_BEFORE =
  /\b(pawn|knight|bishop|rook|queen|king)s?\s+(?:then\s+|now\s+|also\s+)?(to|takes|captures|recaptures(?:\s+on)?|goes\s+to|comes\s+to|steps\s+to|drops\s+to|settles\s+on|jumps\s+to|lands\s+on|retreats\s+to|swings\s+to|hops\s+to|returns\s+to|heads\s+(?:to|for)|reroutes\s+to|reach(?:es)?)\s+$/i;

/** A move said in words: the piece, whether the verb is a capture, and whose
 *  piece the words say it is (null when they do not). */
interface SpokenMove { piece: string; name: string; capture: boolean; owner: Color | null }

/** WHOSE piece a spoken move names, when the words say: "your knight", "their
 *  queenside knight", "your e-pawn", "White's bishop". Matched against the
 *  text that ends where the piece word begins, so the owner is the one
 *  ATTACHED to the piece (at most two describing words between) — never a
 *  "your" from earlier in the sentence: "if their bishop takes on f7, the rook
 *  swings to f6" names nobody's rook. */
const OWNER_DESCRIBERS =
  "(?:(?!(?:the|a|an|and|or|to|of|on|in|with|then|pawn|knight|bishop|rook|queen|king)\\b)[a-z0-9][a-z0-9'’-]*\\s+){0,2}(?:[a-h]-)?$";
const OPPONENT_OWNER_BEFORE = new RegExp(`\\b(?:their|(?:your\\s+|the\\s+)?opponent['’]s)\\s+${OWNER_DESCRIBERS}`, 'i');
const STUDENT_OWNER_BEFORE = new RegExp(`\\b(?:your|our)\\s+${OWNER_DESCRIBERS}`, 'i');
const COLOR_OWNER_BEFORE = new RegExp(`\\b(white|black)['’]s\\s+${OWNER_DESCRIBERS}`, 'i');

function spokenOwner(lead: string, student: NarrationSides['student']): Color | null {
  const named = COLOR_OWNER_BEFORE.exec(lead);
  if (named) return named[1].toLowerCase() === 'white' ? 'w' : 'b';
  if (!student) return null;
  const you: Color = student === 'white' ? 'w' : 'b';
  // "your opponent's knight" is theirs — asked before "your".
  if (OPPONENT_OWNER_BEFORE.test(lead)) return OTHER[you];
  if (STUDENT_OWNER_BEFORE.test(lead)) return you;
  return null;
}

/** Resolve a SPOKEN move against the board: which legal move puts THIS piece on
 *  THIS square? Ambiguous (two pieces of the same type can reach it) resolves to
 *  null — drawing the wrong one is worse than drawing none. */
function resolveSpokenOn(board: Chess, spoken: SpokenMove, to: string): Resolved | null {
  const hits = legalMovesOf(board)
    .filter((m) => m.piece === spoken.piece && m.to === to && (!spoken.capture || m.captured !== undefined));
  return hits.length === 1
    ? { from: hits[0].from, to: hits[0].to, san: hits[0].san, color: hits[0].color, piece: hits[0].piece }
    : null;
}

/** Spans covered by compound notation, so their inner squares are skipped by
 *  the plain SAN pass. */
function compoundSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  for (const m of text.matchAll(COMPOUND)) {
    const i = m.index ?? 0;
    spans.push({ start: i, end: i + m[0].length });
  }
  return spans;
}

const BOARDS = new WeakMap<Chess, Partial<Record<Color, Chess>>>();
/** The position with each colour to move: itself for the side to move, the one
 *  null move for the other (absent when that side cannot be handed the move —
 *  the side to move is in check). Lets the prose name a reply from a position
 *  where it is not that side's turn yet. */
function boardsOf(position: Chess): Partial<Record<Color, Chess>> {
  let boards = BOARDS.get(position);
  if (!boards) {
    boards = { [position.turn()]: position };
    const flippedFen = flipSideToMove(position.fen());
    if (flippedFen) {
      try { boards[OTHER[position.turn()]] = new Chess(flippedFen); } catch { /* no such board */ }
    }
    BOARDS.set(position, boards);
  }
  return boards;
}

/**
 * Derive the arrows for ONE ply.
 *
 * @param text  the narration spoken at this ply
 * @param fen   the position AFTER the ply's move (what the student is looking at)
 * @param exclude squares already arrowed (the trail) so nothing doubles up
 * @param sides what the caller knows about the text: what a bare move means in
 *              it, and who "you" is. REQUIRED — see `NarrationSides`.
 */
export function deriveNarrationArrows(
  text: string,
  fen: string,
  exclude: ReadonlyArray<{ from: string; to: string }>,
  sides: NarrationSides,
  /** The board before the move the text is about: an ALTERNATIVE to that
   *  move ("Masters also play Bb5+ here") is played from it, and drawn only
   *  when its piece still stands on its square on the live board. */
  before: string | null = null,
): DerivationResult {
  const rejected: Array<{ token: string; index: number; reason: string }> = [];
  if (!text || !fen) return { arrows: [], rejected };
  let beforeBoard: Chess | null = null;
  try { beforeBoard = before ? new Chess(before) : null; } catch { beforeBoard = null; }

  let original: Chess;
  try {
    original = new Chess(fen);
  } catch {
    return { arrows: [], rejected };
  }
  const unnamed = UNNAMED[sides.marking];

  // A PLAN's steps chain ("h3, then Kh2, Nd2, and f4") so each resolves on the
  // position the previous one made. An ALTERNATIVE does not — it is measured
  // from where we actually are. ONE chain board, advanced only by plan steps;
  // `original` is never played on (it used to be, whenever a step fitted only
  // the live position — and every alternative after it was then read from a
  // board the game never had).
  let chain = original;
  // Where each piece the plan has moved stands on the LIVE board (the plan
  // board's square → the square it really is on). A piece the plan brings back
  // to its own live square is not making a move: the words are saying the
  // beat's move again ("Bg5 — … and Bxd8 wins your queen … after Bg5 it's
  // level" drew the bishop returning d8-g5).
  let liveSquare = new Map<string, string>();

  const spans = compoundSpans(text);
  const insideCompound = (i: number): boolean => spans.some((s) => i > s.start && i < s.end);

  const seen = new Set(exclude.map((a) => `${a.from}-${a.to}`));
  const arrows: DerivedArrow[] = [];

  // A coordinate LIST shares one classification. "control d5 and f5" is two
  // square references; "play d6, e6, or g6" is three moves. Guarding only the
  // head left the tail drawing arrows in the first case (caught by the shadow
  // diff across the baked openings, 2026-07-31) — so the head's verdict is
  // inherited by every item joined to it by a list connective. An "or" after
  // a SPOKEN move is that piece's other square: "the queen to c7 or b6" is the
  // queen both times (the tail used to draw as a pawn push, b7-b6). Only "or":
  // a comma or an "and" also joins clauses ("if the knight takes e4, d5 kicks
  // the knight", "your queen goes to b6 and b2 has no guard").
  let listHead: { end: number; isSquareRef: boolean; spoken: SpokenMove | null } | null = null;
  const LIST_JOIN = /^[\s,]*(and|or|,)?[\s,]*\(?$/i;
  const OR_JOIN = /\bor\b/i;

  const consider = (token: string, index: number, alternative: boolean): void => {
    const before = text.slice(Math.max(0, index - 24), index);
    const after = text.slice(index + token.length, index + token.length + 14);
    const dotted = BLACK_MARKER_BEFORE.test(text.slice(Math.max(0, index - 3), index));
    // A dotted coordinate ("…e6") is written as a move; only a bare one can be
    // a square's name.
    const bareSquare = !dotted && /^[a-h][1-8]$/.test(token);

    // A bare square preceded by a PIECE WORD and a move verb is a move spoken
    // aloud, not a reference to the square. Checked before the square-reference
    // verdict below, whose "to " preposition would otherwise swallow it.
    let spoken: SpokenMove | null = null;
    if (bareSquare) {
      const m = SPOKEN_MOVE_BEFORE.exec(before);
      if (m) {
        const pieceAt = index - before.length + m.index;
        spoken = {
          piece: SPOKEN_PIECE[m[1].toLowerCase()],
          name: m[1].toLowerCase(),
          capture: /takes|captures|recaptures/i.test(m[2]),
          owner: spokenOwner(text.slice(Math.max(0, pieceAt - 48), pieceAt), sides.student),
        };
      }
    }

    if (bareSquare && !spoken) {
      const gap = listHead && index > listHead.end ? text.slice(listHead.end, index) : null;
      const inList = gap !== null && gap.length <= 8 && LIST_JOIN.test(gap);
      if (inList && listHead?.spoken && OR_JOIN.test(gap)) {
        spoken = listHead.spoken;
        listHead = { end: index + token.length, isSquareRef: false, spoken };
      } else {
        // "d4 is the main move" names a move, whatever "is" usually means.
        const theoryMove = ALTERNATIVE_AFTER.test(text.slice(index + token.length, index + token.length + 40));
        const isSquareRef = !theoryMove && (inList && listHead
          ? listHead.isSquareRef
          : SQUARE_CONTEXT_BEFORE.test(before)
            || SQUARE_LIST_HEAD_BEFORE.test(before)
            || SQUARE_VERB_BEFORE.test(before)
            || SQUARE_PREPOSITION_BEFORE.test(before)
            || SQUARE_CONTEXT_AFTER.test(after)
            || (KEEP_BEFORE.test(before) && IN_MIND_AFTER.test(after)));
        listHead = { end: index + token.length, isSquareRef, spoken: null };
        if (isSquareRef) {
          rejected.push({ token, index, reason: 'square reference, not a move' });
          return;
        }
      }
    } else {
      listHead = { end: index + token.length, isSquareRef: false, spoken };
    }

    // WHOSE MOVE (the header's four rules). `only` is a side the words name —
    // it is never traded for the other one.
    const unnamedRule: Unnamed = spoken ? unnamed.spoken : unnamed.bare;
    const only: Color | null = dotted ? 'b' : spoken?.owner ?? (unnamedRule === 'white' ? 'w' : null);
    const resolve = (board: Chess | undefined): Resolved | null =>
      !board ? null : spoken ? resolveSpokenOn(board, spoken, token) : resolveOn(board, token);

    // An ALTERNATIVE branches from the live position and must never advance
    // the chain, or the next mention resolves from a position the game never
    // reached ("Bc4 (or Bb5)" drew the bishop moving ON from c4).
    // A PLAN step continues from wherever the chain is; one that fits nothing
    // there may still be a parallel mention from the real position — tried
    // last rather than drawing nothing.
    const stages = alternative ? (beforeBoard ? [original, beforeBoard] : [original]) : chain === original ? [original] : [chain, original];
    let stands = false;
    let standing = 'piece';
    let hit: Resolved | null = null;
    /** The board the move was found on (its side to move). */
    let hitBoard: Chess | undefined;
    let hitOnLive = false;
    for (const position of stages) {
      // A move said again is not a new move: "Ne5 … the knight lands on e5"
      // with the knight standing there describes the board, and the only
      // "knight to e5" left is the OTHER side taking it.
      if (spoken && !spoken.capture && position.get(token as Square)?.type === spoken.piece) {
        stands = true;
        standing = spoken.name;
        continue;
      }
      const boards = boardsOf(position);
      if (only) {
        hit = resolve(boards[only]);
      } else if (unnamedRule === 'sole') {
        const white = resolve(boards.w);
        const black = resolve(boards.b);
        if (white && black) {
          rejected.push({ token, index, reason: 'either side could make this move — the words do not say whose' });
          return;
        }
        hit = white ?? black;
      } else {
        hit = resolve(boards[position.turn()]) ?? resolve(boards[OTHER[position.turn()]]);
      }
      // An alternative found on the board before the move: drawn only when
      // its piece still stands there on the live board.
      if (hit && position === beforeBoard) {
        const now = original.get(hit.from as Square);
        if (!now || now.type !== hit.piece || now.color !== hit.color) { hit = null; continue; }
      }
      if (hit) {
        // The plan's board brings this piece back to the square it stands on
        // in the live position: the beat's own move, said again.
        if (position !== original && liveSquare.get(hit.from) === hit.to) {
          stands = true;
          standing = PIECE_NAME[hit.piece] ?? 'piece';
          hit = null;
          continue;
        }
        hitBoard = boards[hit.color];
        hitOnLive = position === original || position === beforeBoard;
        break;
      }
    }

    if (!hit || !hitBoard) {
      // A piece that "takes" a square it has nothing to capture on takes the
      // SQUARE ("the pawn takes d6 and f6 away from your pieces") — so the
      // squares listed after it are squares too, not pushes.
      if (spoken?.capture) listHead = { end: index + token.length, isSquareRef: true, spoken: null };
      rejected.push({
        token,
        index,
        reason: stands ? `the ${standing} already stands on ${token.slice(-2)}`
          : dotted ? "not a legal move for Black (the dots mark Black's move)"
          : only ? `not a legal move for ${COLOR_NAME[only]} (${spoken ? 'the words name whose piece it is' : "a bare move is White's in this text"})`
          : 'no legal move matches from this position',
      });
      return;
    }
    const key = `${hit.from}-${hit.to}`;
    if (seen.has(key)) {
      rejected.push({ token, index, reason: 'duplicate of an existing arrow' });
      return;
    }
    seen.add(key);
    arrows.push({ from: hit.from, to: hit.to, san: hit.san, token, index, color: hit.color });
    if (!alternative) {
      try {
        // Played on a COPY of the board the move was found on — the positions
        // the stages are read from stay as they are.
        const next = new Chess(hitBoard.fen());
        next.move(hit.san);
        chain = next;
        const home = hitOnLive ? hit.from : liveSquare.get(hit.from) ?? hit.from;
        if (hitOnLive) liveSquare = new Map();
        liveSquare.delete(hit.from);
        liveSquare.set(hit.to, home);
      } catch { /* the arrow stands; the chain just stops advancing */ }
    }
  };

  // Compound notation first — "Qe1-h4" is ONE move to its final square.
  for (const m of text.matchAll(COMPOUND)) {
    const index = m.index ?? 0;
    const squares = m[3].split('-').filter(Boolean);
    const dest = squares[squares.length - 1];
    consider(`${m[1]}${dest}`, index, ALTERNATIVE_BEFORE.test(text.slice(Math.max(0, index - 24), index)) || ALTERNATIVE_AFTER.test(text.slice(index + m[0].length, index + m[0].length + 40)));
  }

  for (const m of text.matchAll(SAN_TOKEN)) {
    const index = m.index ?? 0;
    if (insideCompound(index)) continue;
    consider(m[0], index, ALTERNATIVE_BEFORE.test(text.slice(Math.max(0, index - 24), index)) || ALTERNATIVE_AFTER.test(text.slice(index + m[0].length, index + m[0].length + 40)));
  }

  return { arrows, rejected };
}
