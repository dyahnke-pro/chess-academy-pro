/**
 * chatTurnCodeReader — THE SENTENCE COMPUTER (2026-10-08, David: "teach a
 * computer how to break apart a sentence … placing the words into noun verb
 * adverb slots to understand what is being asked").
 *
 * It runs FIRST in the door, before the model reader, and it can do the one
 * thing the model reader cannot: look at the board. Each word is tagged into
 * a slot — the ASK (why / whether / which / what-if), the ACTION (take, push,
 * sacrifice, castle…), the THING (a piece, a square, a move), the OPTIONS
 * ("X or Y"), WHEN (now, or a move already made) — and the slots are resolved
 * against the legal moves into the SAME closed form every reader fills
 * (`ChatTurn`). One vocabulary, one form, one validation.
 *
 * It answers only what it can read for certain. Anything else returns null and
 * the model reads it; a reading neither can make is asked back. It never
 * guesses: two legal moves that fit the words are not one move.
 */
import { Chess, type Move, type Square } from 'chess.js';
import type { BoardContext, ChatTurn, PieceLetter, Referent } from './chatTurn';
import { CAPTURE_VALUE } from '../services/pieceValues';

// ─── WORDS → SLOTS ─────────────────────────────────────────────────────────

/** Voice and typing slips that change what a chess sentence means. */
const SLIPS: ReadonlyArray<[RegExp, string]> = [
  [/\bnights?\b/gi, 'knight'],
  [/\bponds?\b/gi, 'pawn'],
  [/\bporn\b/gi, 'pawn'],
  [/\bblender\b/gi, 'blunder'],
  [/\bbishops?\b/gi, 'bishop'],
];

const PIECE_WORD: Record<string, PieceLetter> = {
  pawn: 'p', pawns: 'p', knight: 'n', knights: 'n', horse: 'n', bishop: 'b',
  rook: 'r', rooks: 'r', castle: 'r', queen: 'q', king: 'k',
};

export type Ask = 'why' | 'whether' | 'which' | 'what-if' | 'how-good' | 'none';
export type Action = 'capture' | 'push' | 'sacrifice' | 'castle' | 'move' | 'none';

export interface Slots {
  ask: Ask;
  action: Action;
  /** The move was already made (past tense, "was that", "did I"). */
  past: boolean;
  /** "best" / "better" — the question weighs a move against the best. */
  judged: boolean;
  /** SAN tokens typed as such ("Ne4", "O-O"). */
  sans: string[];
  /** Squares named ("on h7", "to d5"). */
  squares: string[];
  /** Pieces named, in order. */
  pieces: PieceLetter[];
  /** File letters named as pawns ("the e or d pawn"). */
  files: string[];
  /** The sentence offers alternatives ("X or Y"). */
  options: boolean;
  /** "taking better than pushing", "instead of castling": two things set side by side. */
  contrast: boolean;
  /** Both a capture and a push are named ("take or push?"). */
  takeAndPush: boolean;
  negated: boolean;
  /** Whose piece or move the sentence is about: "my/I" → me, "their/they/he" → them. */
  seat: 'me' | 'them' | null;
  /** Points at the game in front of us: "here", "this", "now", "next". */
  deictic: boolean;
  /** The sentence asks something (an ask word, a question opener, or "?"). */
  question: boolean;
  /** A side named by its COLOUR ("what is black trying to do", "White's
   *  plan"). The board's student colour turns it into a seat. */
  colour: 'white' | 'black' | null;
  /** The sentence asks about a plan or intention ("trying to do", "plan",
   *  "going for", "what does he want"). */
  goal: boolean;
}

const SAN_TOKEN = /\b(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

export function tagSlots(raw: string): Slots {
  let text = raw.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  for (const [re, to] of SLIPS) text = text.replace(re, to);
  // "knight e 4" / "night e4" / "knight to e4" → keep the piece, join the square.
  text = text.replace(/\b([a-h])\s+([1-8])\b/gi, '$1$2');
  // Moves typed in lower case ("qf3", "nxe5", "be2") are moves: a piece
  // letter fused to a square can only be SAN. "bx" stays as typed — it is the
  // b-pawn capturing as often as the bishop, and only the board can tell.
  text = text.replace(/\b([kqrn])(x?[a-h][1-8])\b/g, (_m, p: string, rest: string) => `${p.toUpperCase()}${rest}`)
    .replace(/\bb([a-h][1-8])\b/g, 'B$1')
    .replace(/\bo-o(-o)?\b/gi, (m) => m.toUpperCase());
  const lower = text.toLowerCase();

  const ask: Ask =
    /^\s*why\b|\bhow come\b/.test(lower) ? 'why'
      : /^\s*(?:what if|what about|what happens if)\b/.test(lower) ? 'what-if'
        : /^\s*(?:which|better to)\b|\bor\b.*\?*$/.test(lower) && /\bor\b/.test(lower) ? 'which'
          : /^\s*how (?:good|bad) (?:is|was)\b|\bhow (?:was|is) (?:that|this|it) a\b/.test(lower) ? 'how-good'
            : /^\s*(?:is|was|are|were|should|can|could|do|does|did|would|will)\b|\bright\??$|\bok(?:ay)?\??$|\bsound\??$|\bi'?m thinking\b|\bthinking (?:about|of)\b/.test(lower) ? 'whether'
              : 'none';

  const action: Action =
    /\bsac(?:rifice|k)?\b/.test(lower) ? 'sacrifice'
      : /\b(?:take|takes|taking|took|capture|captures|capturing|grab|win)\b/.test(lower) ? 'capture'
        : /\b(?:push|pushing|pushed|advance)\b/.test(lower) ? 'push'
          : /\b(?:castle|castling|castled)\b(?!\s+on\b)/.test(lower) && !/\b[a-h][1-8]\b/.test(lower) ? 'castle'
            : /\b(?:move|moving|moved|go|bring|play|played|playing)\b/.test(lower) ? 'move'
              : 'none';

  const past = /\b(?:was|were|did|played|took|pushed|moved|castled|sacrificed|made)\b/.test(lower)
    || /\bhow (?:was|is) (?:that|this) a\b/.test(lower);
  const judged = /\b(?:best|better|good|bad|blunder|mistake|correct|wrong|ok(?:ay)?|sound)\b/.test(lower);

  // A bare square is kept as a square; it becomes a pawn move only when the
  // board says a pawn can go there (or went there).
  const sans = (text.match(SAN_TOKEN) ?? []).filter((t) => !/^[a-h][1-8]$/.test(t));
  const squares = [...lower.matchAll(/\b[kqrbn]?x?([a-h][1-8])\b/g)].map((m) => m[1]);
  const pieces: PieceLetter[] = [];
  for (const w of lower.split(/[^a-z']+/)) {
    const p = PIECE_WORD[w];
    // "castle" is a rook only when it is not the action.
    if (p && !(w === 'castle' && action === 'castle')) pieces.push(p);
  }
  const files = [...lower.matchAll(/\b(?:the\s+)?([a-h])\s*(?:-|or|\s)?(?:pawn)?\b(?=[^a-z]*(?:or|pawn))/g)]
    .map((m) => m[1]).filter((f, i, a) => a.indexOf(f) === i);

  return {
    ask, action, past, judged,
    sans, squares, pieces, files,
    options: /\bor\b/.test(lower),
    contrast: /\b(?:better|worse|stronger|weaker) than\b|\b(?:instead of|rather than|versus|vs\.?)\b/.test(lower),
    takeAndPush: /\b(?:take|takes|taking|capture|capturing)\b/.test(lower) && /\b(?:push|pushing|advance|advancing)\b/.test(lower),
    negated: /\b(?:not|n't|never|wont|cant|doesnt|dont|isnt)\b/.test(lower),
    seat: /\b(?:their|theirs|they|they'?re|his|her|he|she|opponent'?s?|the other side)\b/.test(lower) ? 'them'
      : /\b(?:my|mine|me|i|i'?m|i'?ve)\b/.test(lower) ? 'me' : null,
    deictic: /\b(?:here|this|that|now|next|position|game|board|move)\b/.test(lower),
    question: ask !== 'none' || /\?\s*$/.test(lower) || /^\s*(?:what|where|when|who|how|which|should|can|could|would|am|is|are|do|does)\b/.test(lower),
    // A colour is a SIDE only as an actor or an owner — "white's plan", "black
    // is trying", "what does white want" — never "the white bishop" (a piece
    // colour) or "white squares" (a square colour).
    colour: (() => {
      const m = /\b(white|black)(?:'s)?\b(?!\s+(?:squares?|bishop|pieces?|pawns?|knight|rook|queen|king|square))/.exec(lower);
      return m ? (m[1] as 'white' | 'black') : null;
    })(),
    goal: /\b(?:plan|plans|planning|trying to|try to|going for|aiming for|want(?:s)? to|wants|idea|ideas|up to|after)\b/.test(lower),
  };
}

/** THE SENTENCE POINTS AT THE BOARD IN FRONT OF US — "this one", "here",
 *  "now", "at the moment". A question scoped this way is about this game, never
 *  the student's history ("how am I doing in this one?" is not "am I
 *  improving?"). "This week / lately" scope to time, not the board. */
export function pointsAtThisBoard(raw: string): boolean {
  const t = raw.toLowerCase().replace(/[’‘]/g, "'");
  if (/\bthis\s+(?:week|month|year|season|tournament|time\s+of)\b|\b(?:lately|recently|these\s+days|over\s+time|overall|in\s+general)\b/.test(t)) return false;
  return /\b(?:this|here|now|currently|at\s+the\s+moment|right\s+now|so\s+far)\b/.test(t);
}

// ─── SLOTS → MOVES, ON THE BOARD ───────────────────────────────────────────

/** Legal moves now matching what the words say about one move. */
function movesMatching(chess: Chess, s: { piece?: PieceLetter; to?: string; capture?: boolean; file?: string; castle?: boolean }): Move[] {
  return chess.moves({ verbose: true }).filter((m) => {
    if (s.castle) return m.san.startsWith('O-O');
    if (s.piece && m.piece !== s.piece) return false;
    if (s.to && m.to !== s.to) return false;
    if (s.capture && !m.captured) return false;
    if (s.file && (m.piece !== 'p' || m.from[0] !== s.file)) return false;
    return true;
  });
}

/** One SAN for a set of candidates, or null when the words fit more than one. */
function one(moves: Move[]): string | null {
  const uniq = [...new Set(moves.map((m) => m.san))];
  return uniq.length === 1 ? uniq[0] : null;
}

/** The alternatives of a "which" question, as two SANs, or null. */
function resolveOptions(chess: Chess, slots: Slots): string[] | null {
  // "Nf3 or Nc3?"
  if (slots.sans.length >= 2) return slots.sans.slice(0, 2);
  const capture = slots.action === 'capture' || slots.action === 'sacrifice';
  // "take with the bishop or the pawn" — each piece's capture; when both can
  // take, they are taking the same thing: prefer a shared target.
  if (slots.pieces.length >= 2) {
    const [a, b] = slots.pieces;
    const ma = movesMatching(chess, { piece: a, capture });
    const mb = movesMatching(chess, { piece: b, capture });
    const shared = ma.map((m) => m.to).filter((t) => mb.some((n) => n.to === t));
    const target = shared.length === 1 ? shared[0] : undefined;
    const sa = one(target ? ma.filter((m) => m.to === target) : ma);
    const sb = one(target ? mb.filter((m) => m.to === target) : mb);
    return sa && sb && sa !== sb ? [sa, sb] : null;
  }
  // "take or push?", "why is taking better than pushing?" — the capture and
  // the push of the SAME pawn when one pawn can do both; otherwise each must
  // be the only one of its kind on the board.
  if (slots.takeAndPush && slots.pieces.every((p) => p === 'p')) {
    const caps = movesMatching(chess, { capture: true });
    const pawnCaps = caps.filter((m) => m.piece === 'p');
    const cap = one(caps) ? caps[0] : slots.pieces.includes('p') && one(pawnCaps) ? pawnCaps[0] : null;
    if (!cap) return null;
    const pushes = movesMatching(chess, { piece: 'p' }).filter((m) => !m.captured);
    const own = cap.piece === 'p' ? pushes.filter((m) => m.from === cap.from) : pushes;
    const single = own.filter((m) => Math.abs(Number(m.to[1]) - Number(m.from[1])) === 1);
    const push = one(single.length ? single : own);
    return push ? [cap.san, push] : null;
  }
  // "Bb5 or retreat to d3?" — one move typed, the other named by its square:
  // the same piece going there instead, else the one move that reaches it.
  if (slots.sans.length === 1) {
    let first: Move | null = null;
    try { first = new Chess(chess.fen()).move(slots.sans[0]); } catch { first = null; }
    const other = first ? slots.squares.find((q) => q !== first?.to) : undefined;
    if (first && other) {
      const samePiece = movesMatching(chess, { to: other }).filter((m) => m.from === first?.from);
      const second = one(samePiece) ?? one(preferPawn(movesMatching(chess, { to: other })));
      return second && second !== first.san ? [first.san, second] : null;
    }
  }
  // "push the e or d pawn"
  if (slots.files.length >= 2) {
    const pick = (f: string): string | null => {
      const ms = movesMatching(chess, { file: f });
      // A push names the pawn, not the distance: one step when two are legal.
      const single = ms.filter((m) => !m.captured && Math.abs(Number(m.to[1]) - Number(m.from[1])) === 1);
      return one(single.length ? single : ms);
    };
    const sa = pick(slots.files[0]);
    const sb = pick(slots.files[1]);
    return sa && sb && sa !== sb ? [sa, sb] : null;
  }
  return null;
}

/** A bare square in SAN is a pawn move ("d4"): when a pawn can go there, the
 *  pawn is the move meant, even if a knight could also land on it. */
function preferPawn(moves: Move[]): Move[] {
  const pawns = moves.filter((m) => m.piece === 'p');
  return pawns.length ? pawns : moves;
}

/** The one move a sentence names, legal now, or null. */
function resolveNamedMoveNow(chess: Chess, slots: Slots): string | null {
  if (slots.sans.length === 1) {
    try { const m = new Chess(chess.fen()).move(slots.sans[0]); if (m) return m.san; } catch { /* not legal now */ }
    // A TYPED MOVE IS NEVER SWAPPED FOR ANOTHER PIECE'S (pass 3: "is Ng5
    // good?" with no knight able to reach g5 became Bg5). Not legal: the
    // validator says why.
    return null;
  }
  if (slots.action === 'castle') return one(movesMatching(chess, { castle: true }).filter((m) => m.san === 'O-O')) ?? one(movesMatching(chess, { castle: true }));
  const to = slots.squares[slots.squares.length - 1];
  // "push d4" — a push is a pawn move.
  const piece = slots.pieces[0] ?? (slots.action === 'push' ? 'p' : undefined);
  const capture = slots.action === 'capture' || slots.action === 'sacrifice';
  if (to) {
    const ms = movesMatching(chess, { piece, to, capture: capture || undefined });
    return one(piece ? ms : preferPawn(ms));
  }
  return null;
}

/** `san` is legal for the side NOT to move (the board handed to them). */
export function legalForOpponent(chess: Chess, san: string): boolean {
  const parts = chess.fen().split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  try {
    const b = new Chess(parts.join(' '));
    if (b.inCheck()) return false;
    return !!b.move(san);
  } catch { return false; }
}

/** "Their bishop" when they have two: the one nothing guards, when exactly
 *  one is unguarded — that is the one a student asks about winning. */
function theirOne(chess: Chess, piece: PieceLetter, enemy: 'w' | 'b'): string | null {
  const theirs = chess.board().flat().filter((c): c is NonNullable<typeof c> => !!c && c.type === piece && c.color === enemy);
  if (theirs.length === 1) return theirs[0].square;
  const bare = theirs.filter((c) => chess.attackers(c.square, enemy).length === 0);
  return bare.length === 1 ? bare[0].square : null;
}

// ─── THE READING ───────────────────────────────────────────────────────────

/**
 * Read a turn in code, or return null for the model. Only the move questions
 * the model cannot place without the board are read here: a choice between
 * two moves, and a question about one named move.
 */
export function readTurnInCode(text: string, board: BoardContext): ChatTurn | null {
  if (!board.fen || text.length > 160) return null;
  let chess: Chess;
  try { chess = new Chess(board.fen); } catch { return null; }

  // "Stop what?" / "what do you mean?" / "how so?" — a follow-up that points
  // back at the coach's own last line (hand walk 2026-10-09: "I am not sure
  // what you mean"). Read only when there IS a last line to point at.
  const followUp = text.trim().toLowerCase();
  if (board.lastCoachLine && (/^(?:[a-z']+\s+){0,2}what\s*\?*$/.test(followUp)
    || /^(?:huh|how so|why|meaning)\s*\?*$/.test(followUp)
    || /\bwhat do you mean\b|\bwhat does that mean\b|\bi don'?t (?:get|understand) (?:it|that)\b/.test(followUp))) {
    return { kind: 'explain-last', referents: [], seat: null, topic: null };
  }
  const slots = tagSlots(text);
  if (slots.negated && slots.ask !== 'why') return null;

  // "bishop or pawn?", "e or d pawn?", "Nf3 or Nc3?"
  if ((slots.options && (slots.ask === 'which' || slots.ask === 'whether'))
    || (slots.contrast && slots.ask !== 'none')) {
    const pair = resolveOptions(chess, slots);
    if (pair) {
      return { kind: 'compare-moves', referents: pair.map((san): Referent => ({ type: 'move', san })), seat: 'me', topic: null };
    }
    // "was h3 good or an unnecessary pawn move?" offers words, not two moves:
    // read on as a question about the one move it names.
  }

  // "What is my bishop on c4 aiming at?" / "what about their knight?" — a
  // question about ONE piece, not a move: what it does, whether it is safe.
  const lower = text.toLowerCase();
  // THE PIECE IS THE OBJECT, NOT THE SUBJECT (live replay 2026-10-09: "how do
  // I attack the king?" was read as "what about my king?"). When the student
  // does something TO the piece — "I attack / trap / pin / mate the king" —
  // the question is how to do it, never a question about that piece.
  const pieceAt = lower.search(/\b(?:pawn|knight|night|horse|bishop|rook|queen|king)s?\b/);
  const verbAt = lower.search(/\b(?:attack|trap|pin|fork|mate|checkmate|win|beat|trade|exchange|go after|target)\b/);
  const actsOnPiece = verbAt >= 0 && pieceAt > verbAt && /\b(?:i|we|you)\b/.test(lower.slice(0, verbAt));
  if (!actsOnPiece && slots.pieces.length === 1 && slots.squares.length <= 1 && slots.sans.length === 0 && slots.action === 'none' && !slots.options
    && /^\s*(?:what|how|is|are)\b/.test(lower)
    && /\b(?:doing|aiming|aim|for|about|safe|loose|good|bad|active|attack(?:ing)?|eye(?:ing)?|look(?:ing)? at)\b/.test(lower)) {
    // WHOSE PIECE is the possessive in front of it — never who is speaking
    // ("how do I…" is the student talking, not the student's king).
    const seat = /\b(?:their|his|her|opponent'?s)\b/.test(lower) ? 'them' as const : /\b(?:my|mine)\b/.test(lower) ? 'me' as const : null;
    return { kind: 'what-about-piece', referents: [{ type: 'piece', piece: slots.pieces[0], square: slots.squares[0] ?? null, seat }], seat, topic: null };
  }

  // WHOSE SIDE, by possessive or by colour ("what is black trying to do?").
  const studentColour = board.studentColor ?? null;
  const possessive = /\b(?:their|his|her|opponent'?s?|they|he|she)\b/.test(lower) ? 'them' as const
    : /\b(?:my|mine|i|i'?m)\b/.test(lower) ? 'me' as const : null;
  const sideSeat = possessive
    ?? (slots.colour && studentColour ? (slots.colour === studentColour ? 'me' as const : 'them' as const) : null);

  // "Can they take my e4 pawn?" / "can he win my knight?" — whether a piece
  // of yours can be taken: its safety, read on the board.
  // The one taking is the subject in front of the verb: a pronoun or a colour.
  const taker = /\b(they|he|she|opponent|white|black)\s+(?:just\s+|now\s+)?(?:take|capture|win|grab)\b/.exec(lower)?.[1];
  const takerSeat = !taker ? null
    : taker === 'white' || taker === 'black' ? (studentColour ? (taker === studentColour ? 'me' : 'them') : null)
      : 'them';
  if (slots.action === 'capture' && takerSeat === 'them' && /\bmy\b/.test(lower) && slots.sans.length === 0
    && (slots.pieces.length === 1 || slots.squares.length === 1)) {
    const sq = slots.squares[0] ?? null;
    const piece = slots.pieces[0] ?? (sq ? chess.get(sq as Square)?.type ?? null : null);
    if (piece) return { kind: 'is-piece-loose', referents: [{ type: 'piece', piece, square: sq, seat: 'me' }], seat: 'me', topic: null };
  }

  // The ACTOR decides, not the possessive: "their b7 pawn" is the target.
  const theyAct = /\b(?:they|he|she|opponent|black|white)\s+(?:\w+\s+){0,2}(?:attack|hit|target|go after|win|get|take)\b/.test(lower)
    && !/\b(?:i|we)\s+(?:\w+\s+){0,2}(?:attack|hit|target|go after|win|get|take)\b/.test(lower);

  // "Can I win the pawn back?" / "can I win their knight on e5?" — winning
  // one of THEIR pieces: now, or the move that sets it up. "Back" points at
  // what they last took. "Can I take on e5?" stays a question about that move.
  if (/\b(?:win|get|regain|pick up)\b/.test(lower) && /\b(?:can|could|how|is there)\b/.test(lower)
    && !theyAct && slots.sans.length === 0 && !/\b(?:game|match)\b/.test(lower)) {
    let sq: string | null = slots.squares[0] ?? null;
    if (!sq && /\bback\b/.test(lower)) {
      const replay = new Chess();
      let last: string | null = null;
      try {
        for (const san of board.history ?? []) {
          const m = replay.move(san);
          if (m.captured && m.color !== (board.studentColor === 'black' ? 'b' : 'w')) last = m.to;
        }
      } catch { last = null; }
      sq = last;
    }
    const enemy = (board.studentColor ?? (chess.turn() === 'w' ? 'white' : 'black')) === 'white' ? 'b' : 'w';
    if (!sq && slots.pieces.length === 1) sq = theirOne(chess, slots.pieces[0], enemy);
    if (sq && chess.get(sq as Square)?.color === enemy) {
      return { kind: 'win-piece', referents: [{ type: 'square', square: sq }], seat: 'them', topic: null };
    }
  }

  // "What does f6 attack?" / "what is their knight hitting?" — the named piece
  // is the ATTACKER, the subject of the verb, not its target (live replay
  // 2026-10-09: read as "can I attack f6?" and answered "nothing of yours can
  // get at their pawn on f6"). A question about what one piece does.
  const subjectAttack = /\bwhat\s+(?:does|is|can|will|could)\s+(?:the\s+|their\s+|my\s+|that\s+)?(?:(?:pawn|knight|bishop|rook|queen|king)\s+on\s+)?(?:[a-h][1-8]|pawn|knight|bishop|rook|queen|king|[nbrqk][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\s+(?:attack|hit|target|eye|aim)/i;
  if (subjectAttack.test(text)) {
    let sq: string | null = slots.squares[0] ?? null;
    if (!sq && slots.sans.length === 1) {
      try { const m = new Chess(board.fen).move(slots.sans[0]); sq = m?.to ?? null; } catch { sq = null; }
      if (!sq) { const dest = /([a-h][1-8])$/.exec(slots.sans[0])?.[1]; sq = dest ?? null; }
    }
    if (sq && chess.get(sq as Square)) {
      return { kind: 'what-about-piece', referents: [{ type: 'square', square: sq }], seat: null, topic: null };
    }
  }

  // "Can I attack the b7 pawn?" / "how do I go after their bishop?" — the
  // moves that bring a piece of yours onto one of THEIRS. Not a move to that
  // square (pass 2: "attack the b7 pawn" was read as the pawn move b7).
  if (/\b(?:attack|hit|target|go after|pressure|put pressure on)\b/.test(lower) && /\b(?:can|how|could|should|what)\b/.test(lower)
    && !theyAct && slots.sans.length === 0 && !slots.pieces.includes('k')) {
    const enemy = (board.studentColor ?? (chess.turn() === 'w' ? 'white' : 'black')) === 'white' ? 'b' : 'w';
    let sq: string | null = slots.squares.find((q) => chess.get(q as Square)?.color === enemy) ?? null;
    if (!sq && slots.pieces.length === 1) sq = theirOne(chess, slots.pieces[0], enemy);
    if (sq) return { kind: 'attack-piece', referents: [{ type: 'square', square: sq }], seat: 'them', topic: null };
  }

  // "Did I just lose a pawn?" / "did I hang something?" — what the last
  // moves cost, read off the game record (pass 3: answered about a pawn that
  // was safe while the knight had just been taken).
  if (/\b(?:did|have|has)\s+(?:i|we|my\s+\w+)\s+(?:just\s+)?(?:lose|lost|drop|dropped|hang|hung|blunder|give away|gave away)\b/.test(lower)) {
    return { kind: 'material-change', referents: [], seat: 'me', topic: null };
  }

  // "How do I defend it?" / "how can I save my bishop?" — saving one piece.
  // King safety is a plan question, not this.
  // The student asks what THEY do: "how do/can/should I …", "what can I do to
  // …", "how to …". "How many defend c6?" is a count, not this.
  if (/\b(?:how (?:do|can|should|could|would|shall) (?:i|we)|what (?:can|should|do) (?:i|we) do to|how to)\b[^?]*\b(?:defend|protect|save|guard|cover)\b/.test(lower) && possessive !== 'them'
    && slots.sans.length === 0 && !slots.pieces.includes('k') && slots.pieces.length <= 1) {
    const sq = slots.squares[0] ?? null;
    const piece = slots.pieces[0] ?? (sq ? chess.get(sq as Square)?.type ?? null : null);
    const referents: Referent[] = piece ? [{ type: 'piece', piece, square: sq, seat: 'me' }] : sq ? [{ type: 'square', square: sq }] : [];
    return { kind: 'defend-piece', referents, seat: 'me', topic: null };
  }

  // "What are they threatening?" / "any threats?" / "what's my threat?" —
  // threats, answered by the threat computer (walk 4: routed to "why did they
  // play d6" and skipped their ideas).
  if (/\bthreat(?:s|en|ens|ening)?\b/.test(lower) && slots.sans.length === 0 && slots.squares.length === 0) {
    const mine = /\b(?:my|i|do i have|can i)\b/.test(lower) && !/\b(?:they|their|he|his|opponent)\b/.test(lower);
    return { kind: 'threats', referents: [], seat: mine ? 'me' : 'them', topic: null };
  }

  // "How am I doing?" with a game on the board is about THIS game (walk 5:
  // answered from the profile with "import your games").
  if ((board.history?.length ?? 0) > 0 && /^\s*(?:so\s+)?how(?:'s|\s+is|\s+am|\s+are)\s+(?:i|it|we|this|things|my\s+game|the\s+game)\s+(?:doing|going|looking)\b/.test(lower)
    && !/\b(?:lately|recently|overall|over\s+time|this\s+(?:week|month|year)|improv)/.test(lower)) {
    return { kind: 'position-assessment', referents: [], seat: 'me', topic: null };
  }

  // "What's the idea of this opening?" / "what is this opening about?" — the
  // opening, named, with what it is and what its key move does (walk 5: read
  // as a plan and answered about h3).
  if (/\bopening\b/.test(lower) && /\b(?:idea|ideas|point|about|purpose|goal|aim|plan)\b/.test(lower)
    && /\b(?:this|the|my|our)\s+opening\b/.test(lower) && slots.sans.length === 0) {
    return { kind: 'name-opening', referents: [], seat: 'me', topic: null };
  }

    // "Which piece should I develop next?" / "what should I bring out?" — the
  // pieces still at home and the best way to bring one out (walk 4: answered
  // with castling, no piece named).
  if (/\b(?:develop|bring\s+out|get\s+out)\b/.test(lower) && /\b(?:which|what)\b/.test(lower)
    && possessive !== 'them' && slots.sans.length === 0 && slots.squares.length === 0
    && !/\b(?:have i|am i|did i|is my|how(?:'s| is) my|who)\b/.test(lower)) {
    return { kind: 'develop-next', referents: [], seat: 'me', topic: null };
  }

  // "What is black trying to do?" / "what's their plan?" — a plan, no move.
  if (slots.goal && slots.sans.length === 0 && slots.squares.length === 0 && slots.pieces.length === 0
    && /^\s*(?:what|what's|whats|where|how)\b/.test(lower)) {
    return { kind: 'plan', referents: [], seat: sideSeat, topic: null };
  }

  const hasMoveWords = slots.sans.length > 0 || slots.squares.length > 0 || slots.action !== 'none';
  if (!hasMoveWords || slots.ask === 'none') return null;

  // A move already made: judge it where it was played (validation checks it
  // is on the tape).
  const pawnSan = slots.sans.length === 0 && slots.pieces.length === 0 && slots.squares.length === 1 ? slots.squares[0] : null;
  const named = slots.sans.length === 1 ? slots.sans[0] : pawnSan;
  if (slots.past && named) {
    return { kind: 'retrospective-move', referents: [{ type: 'move', san: named }], seat: 'me', topic: null };
  }

  // "Should I take the knight?" — the piece named after take/capture is the
  // one TAKEN, not the one taking (walk 4: answered with castling, Bxc6 never
  // weighed). "Take with the knight" keeps the knight as the mover.
  if (slots.action === 'capture' && slots.sans.length === 0 && slots.squares.length === 0 && slots.pieces.length === 1
    && !/\bwith\s+(?:the\s+|my\s+)?(?:pawn|knight|bishop|rook|queen|king)\b/.test(lower)
    && /\b(?:take|taking|capture|capturing|grab|grabbing|win|winning)\s+(?:the\s+|their\s+|his\s+|that\s+)?(?:pawn|knight|bishop|rook|queen)\b/.test(lower)) {
    const victims = chess.moves({ verbose: true }).filter((m) => m.captured === slots.pieces[0]);
    const uniq = [...new Map(victims.map((m) => [m.san, m])).values()]
      .sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 0) - (CAPTURE_VALUE[b.piece] ?? 0));
    if (uniq.length === 1) return { kind: 'candidate-move', referents: [{ type: 'move', san: uniq[0].san }], seat: 'me', topic: null };
    if (uniq.length >= 2) return { kind: 'compare-moves', referents: uniq.slice(0, 2).map((m): Referent => ({ type: 'move', san: m.san })), seat: 'me', topic: null };
    // Nothing can take it now: say so, and what would set it up (walk 4:
    // "should I take the knight?" with no knight in reach got the best move).
    const enemy = chess.turn() === 'w' ? 'b' : 'w';
    const sq = theirOne(chess, slots.pieces[0], enemy);
    if (sq) return { kind: 'win-piece', referents: [{ type: 'square', square: sq }], seat: 'them', topic: null };
  }

  // "Should I take on d5?" when two of yours can take there: weigh both,
  // cheapest capturer first (pass 2: it answered with an unrelated best move).
  if ((slots.action === 'capture') && slots.sans.length === 0 && slots.pieces.length === 0 && slots.squares.length === 1 && !slots.past) {
    const caps = movesMatching(chess, { to: slots.squares[0], capture: true });
    const uniq = [...new Map(caps.map((m) => [m.san, m])).values()].sort((a, b) => (CAPTURE_VALUE[a.piece] ?? 0) - (CAPTURE_VALUE[b.piece] ?? 0));
    if (uniq.length >= 2) {
      return { kind: 'compare-moves', referents: uniq.slice(0, 2).map((m): Referent => ({ type: 'move', san: m.san })), seat: 'me', topic: null };
    }
  }

  const now = resolveNamedMoveNow(chess, slots);
  if (!now) {
    if (!named) return null;
    // Named, not playable now, and made earlier: a move already played ("why
    // was Nf1 best?"). Not on the tape: a move the student wants to play that
    // cannot be played — the validator says why. Never "I can't find it in
    // this game" for a move they are asking to make.
    const onTape = (board.history ?? []).some((h) => h.replace(/[+#!?]/g, '') === named.replace(/[+#!?]/g, ''));
    // ONLY THEIRS (pass 2: "what does Nc6 do?" with their knight on b8 got
    // "none of your knights can reach c6"). A move only the other side can
    // play, asked without "I / my", is about their move: left to the
    // opponent-hypothetical lane, which plays it on their turn.
    if (!onTape && possessive !== 'me' && legalForOpponent(chess, named)) return null;
    const prospective = /\b(?:should|shall|can|could|now|next)\b/.test(lower);
    return { kind: onTape && !prospective ? 'retrospective-move' : 'candidate-move', referents: [{ type: 'move', san: named }], seat: 'me', topic: null };
  }
  // Every question about one move still to play — "why is Ne4 best?", "is
  // Qf3 ok?", "can I sac on h7?", "what if I push c5?" — is answered by
  // weighing THAT move on the board now.
  return { kind: 'candidate-move', referents: [{ type: 'move', san: now }], seat: 'me', topic: null };
}
