/**
 * THE QUESTION READER (answers rebuild, step 2 — SHADOW ONLY, wired nowhere).
 *
 * The old routing guessed a question's kind from keywords in three places that
 * never consulted each other, and a miss fell through to a confident default
 * ("the best move is e4"). This reads a question ONCE, against THE MOMENT it
 * was asked in, and says what it is about — or says it does not know, so the
 * coach can ask back instead of answering something nobody asked.
 *
 * Order of evidence, and it is the whole design:
 *   1. THE WORDS name the target when they can (a move, an opening, "my
 *      weaknesses", a command verb with an object).
 *   2. THE MOMENT fills a gap the words leave ("why?" → the coach's last claim;
 *      "was that good" → the last move; "what now" → the board).
 *   3. THE SCREEN shifts the odds, never decides: on Home with no board, a
 *      "what should I do" is about the student's training, not a position.
 *   4. Nothing fits → `unclear`, with a question to ask back. Never a default.
 *
 * A leaf: no DB, no store, no model. Opening names come in through
 * `lookups.nameOpening` so the reader can be measured without the opening DB.
 */

export type AskKind =
  | 'command' | 'move' | 'board' | 'record' | 'opening' | 'learning'
  | 'app' | 'smalltalk' | 'followup' | 'unclear' | 'knowledge' | 'outside';

export type Screen = 'home' | 'play' | 'learn' | 'review' | 'puzzle' | 'opening' | 'chat' | 'other';

export interface AskMoment {
  screen: Screen;
  /** A position is on screen that the student could be asking about. */
  hasBoard: boolean;
  /** The coach's last line in this conversation, if any. */
  lastCoachLine?: string;
}

export interface AskLookups {
  /** Best opening match for a fragment, with a 0–1 score. */
  nameOpening?: (text: string) => { name: string; score: number } | null;
}

export interface AskReading {
  kind: AskKind;
  /** What the words (or the moment) point at — a move, an opening, a topic. */
  about: string;
  /** Which evidence decided it: the words, the moment, or nothing. */
  via: 'words' | 'moment' | 'none';
  /** Set when the reader is not sure: what to ask the student back. */
  clarify?: string;
}

/** An opening match below this is a guess, and a guess must not start a game. */
export const OPENING_NAME_FLOOR = 0.85;

// ── normalisation ────────────────────────────────────────────────────────────

/** Speech-to-text misses that change the meaning of a chess question. */
const VOICE_FIXES: ReadonlyArray<[RegExp, string]> = [
  [/\bnights?\b/gi, 'knight'],
  [/\bponds?\b/gi, 'pawn'],
  [/\bblender\b/gi, 'blunder'],
  [/\bcaro?\s*k?h?an+\b/gi, 'Caro-Kann'],
  [/\bcato\s*khan\b/gi, 'Caro-Kann'],
  [/\bcarro\s*khan\b/gi, 'Caro-Kann'],
  [/\bweaknessew\b/gi, 'weaknesses'],
  [/\blastt\b/gi, 'last'],
];

export function normaliseAsk(text: string): string {
  let t = text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  for (const [re, to] of VOICE_FIXES) t = t.replace(re, to);
  return t;
}

// ── word evidence ────────────────────────────────────────────────────────────

const SAN_RE = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|O-O(?:-O)?)\b/i;
const PIECE_SQUARE_RE = /\b(?:king|queen|rook|bishop|knight|pawn)\b[^.?!]{0,12}\b[a-h]\s?[1-8]\b/i;
const BARE_SQUARE_RE = /\b[a-h][1-8]\b/i;
const PERSON_RE = /\b(?:levy|rozman|gotham\s*chess|magnus|carlsen|hikaru|nakamura)\b/i;
const NON_LATIN_RE = /[\u0370-\u1fff\u2e80-\uffff]/;
const PASTED_GAME_RE = /\[(?:White|Black|Result|Event)\s+"|https?:\/\/|\b1\.\s*[a-h1-8NBRQKO]/;

const SMALLTALK_RE =
  /^(?:hi|hey|hello|yo|test|ok(?:ay)?!?|good thanks?|thanks?(?: you)?|dammit|damn|you suck|you there\??|are you there\??|can you hear me\??|do you understand me\??|hello\?)[!.?]*$/i;

const FOLLOWUP_RE =
  /^(?:why\??|explain(?: (?:my|that|it|more))?|yes|yeah|yep|sure|let'?s do it|go(?: ahead)?|what is the answer\??|say (?:those|that|it) (?:moves? )?again|again|why (?:is|was) that (?:move )?(?:the )?best\??|why (?:is|was) that\??|how so\??)[!.?]*$/i;

const COMMAND_VERB_RE =
  /^(?:(?:can|could|would) you |please |let'?s |i want to |i'?d like to |i want you to )?(?:play|teach|show|walk ?through|drill|review|open|take me|turn (?:on|off)|pause|stop|keep playing|continue|set up|start|reset|load|analy[sz]e|quiz|give me|hide)\b/i;
const NEGATED_COMMAND_RE = /^(?:don'?t|do not|stop|no more) (?:show|tell|give|draw|use)\b|still showing|too fast|i need (?:a hint|arrows|hints)/i;
const TEACH_SKILL_RE = /\b(?:how to (?:calculate|visuali[sz]e|think|attack|defend)|calculat\w*)\b/i;
const TEACH_OPENING_CHOICE_RE = /\b(?:a new|an?|some) (?:\w+ ){0,3}opening\b|\btheory for\b/i;

const RECORD_RE =
  /\b(?:my (?:weakness\w*|weakest|biggest weakness|best opening|best variation|strong points?|playing style|last \d* ?games?|tactics)|weakest|weaknesses|strong points|thinking errors|(?:need|should i) (?:to )?(?:practice|work on|improve)\b(?! (?:my )?(?:middle ?game|calculation))|how often do i|due for review|which phase|playing style|did i have any good moves|what opening (?:did we|should i|do i)|which opening should i|was it the \w+ variation|how are my|why am i losing|why do i struggle|last \d+ games|what am i weakest)\b/i;

const LEARNING_RE =
  /\b(?:improve|calculat\w*|visuali[sz]e|visual the|hard time understanding|don'?t understand your|going in circles|coach me on|figure out this|tactical sequences)\b/i;

const OPENING_QUESTION_RE =
  /\b(?:what should i play against|against the [\w-]+ what should i play|(?:play|do) against (?:it|the)\b|key ideas in|how do i use the|is there an opening called|(?:black|white)s? openings?\b|the blacks? opening|when (?:black|white) plays)\b/i;

const KNOWLEDGE_RE =
  /\b(?:what (?:does|do) [\w-]+ (?:mean|stand for)|what is (?:a |an )?(?:fork|pin|skewer|en passant|castling|zugzwang|stalemate)|what is (?:[KQRBNkqrbn]?x?[a-h][1-8])\??$|famous chess player|stockfish special|what is stockfish)\b/i;

const APP_RE =
  /^\W*(?:any )?help\W*$|\bhow long will it take\b|\bgames? (?:being )?analy[sz]ed\b|\bmake that sound\b|\bnot letting me\b|\bwhere is next\b|\bmany games do you need\b/i;

const BOARD_RE =
  /\b(?:best(?: move)?|my plan|the plan|(?:a |any )?tactics?|(?:a |any )?traps?|see the (?:fork|pin|skewer|tactic|threat|mate)|threaten\w*|hanging|am i (?:losing|winning)|proceed|what should i (?:do|be looking for)|who controls|aiming at|attacking idea|attack the king|first move|next move|only has one good move|position (?:balanced|better)|is that \w+ attack)\b/i;

const MOVE_WORD_RE =
  /\b(?:take|takes|taking|push(?:ing)?|sac(?:rifice)?|castle|(?:that|this|the better|a good|a bad) move|blunder|checkmate|structure|recapture|should i take|what if i|that (?:a )?(?:good|bad) move|was that|better move|with the (?:queen|king|bishop|knight|rook|pawn)|i(?:'m)? (?:did )?play(?:ed)?|i'?m thinking)\b/i;

/** "What's the best move" asks about the board even though it says "move". */
const BOARD_ASK_FIRST_RE = /\b(?:best move|next move|first move|move is best|the best\b)/i;

// ── the reader ───────────────────────────────────────────────────────────────

function openingIn(text: string, lookups: AskLookups): string | null {
  const look = lookups.nameOpening;
  if (!look) return null;
  const stripped = text
    .replace(/^(?:(?:can|could) you |please )?(?:play|teach me|show me|walk ?through|review|drill)(?: me)?\s+/i, '')
    .replace(/\s+(?:against me|now|with (?:the )?(?:white|black) pieces|walkthrough)[.!?]*$/i, '')
    .replace(/^the\s+/i, '')
    .replace(/[.!?]+$/, '');
  if (!stripped || stripped.split(/\s+/).length > 12) return null;
  const hit = look(stripped);
  return hit && hit.score >= OPENING_NAME_FLOOR ? hit.name : null;
}

/**
 * Read one question against its moment. Pure and deterministic: the same
 * text in the same moment always reads the same way.
 */
export function readQuestion(raw: string, moment: AskMoment, lookups: AskLookups = {}): AskReading {
  const text = normaliseAsk(raw);
  const lower = text.toLowerCase();
  const words = (w: AskKind, about: string): AskReading => ({ kind: w, about, via: 'words' });

  if (!text) return { kind: 'unclear', about: '', via: 'none', clarify: 'What would you like to look at?' };

  if (PASTED_GAME_RE.test(text)) return words('command', 'review: pasted game');
  // Another language is read after translation; untranslated, nothing here can.
  if (NON_LATIN_RE.test(text)) {
    return { kind: 'unclear', about: 'untranslated', via: 'none', clarify: 'Could you ask that in English?' };
  }

  if (PERSON_RE.test(text)) return words('outside', 'a named player');
  if (SMALLTALK_RE.test(text)) return words('smalltalk', 'small talk');

  // A follow-up with nothing to follow is not a follow-up.
  if (FOLLOWUP_RE.test(text)) {
    if (moment.lastCoachLine) return { kind: 'followup', about: 'the last claim', via: 'moment' };
    return { kind: 'unclear', about: text, via: 'none', clarify: 'Which move do you mean?' };
  }

  if (APP_RE.test(text)) return words('app', 'the app');
  if (NEGATED_COMMAND_RE.test(text)) return words('command', 'display setting');
  if (KNOWLEDGE_RE.test(text)) return words('knowledge', 'a definition');

  if (COMMAND_VERB_RE.test(text)) {
    if (TEACH_SKILL_RE.test(text)) return words('learning', 'a skill');
    if (TEACH_OPENING_CHOICE_RE.test(text)) return words('opening', 'choose an opening');
    const sanObject = text.match(SAN_RE);
    if (/^(?:can|could) you play\b/i.test(text) && sanObject) return words('command', `play: ${sanObject[0]}`);
    const opening = openingIn(text, lookups);
    if (opening) return words('command', `opening: ${opening}`);
    return words('command', 'action');
  }

  if (LEARNING_RE.test(text) && !SAN_RE.test(text) && !/\bmy best\b/i.test(text)) {
    if (/\bwhy do i struggle\b/i.test(text)) return words('record', 'struggle');
    return words('learning', 'improvement');
  }
  if (OPENING_QUESTION_RE.test(text)) return words('opening', 'opening choice');
  if (RECORD_RE.test(text)) {
    if (/\b(?:against|kid)\b/i.test(text) && openingIn(text, lookups)) return words('opening', 'opening choice');
    return words('record', 'the student record');
  }

  if (BOARD_ASK_FIRST_RE.test(text) && !SAN_RE.test(text) && !PIECE_SQUARE_RE.test(text)) {
    return { kind: 'board', about: 'this position', via: moment.hasBoard ? 'moment' : 'words' };
  }
  const san = text.match(SAN_RE) ?? text.match(PIECE_SQUARE_RE)
    ?? (BOARD_ASK_FIRST_RE.test(text) ? null : text.match(BARE_SQUARE_RE));
  if (san) {
    if (/^\s*[a-h][1-8]\s*$/i.test(text)) {
      return { kind: 'unclear', about: text, via: 'none', clarify: `What about ${text.trim()}?` };
    }
    return words('move', san[0]);
  }
  if (MOVE_WORD_RE.test(text)) {
    if (moment.hasBoard) return { kind: 'move', about: 'a move', via: 'moment' };
    return { kind: 'move', about: 'the last game', via: 'words' };
  }
  if (BOARD_RE.test(text)) {
    // On Home with nothing on screen, "what should I practice" is training,
    // not a position — the screen shifts the odds, it does not decide.
    if (!moment.hasBoard && moment.screen === 'home') {
      return { kind: 'unclear', about: text, via: 'none', clarify: 'Which position do you mean?' };
    }
    return { kind: 'board', about: 'this position', via: moment.hasBoard ? 'moment' : 'words' };
  }

  // A bare name that is really an opening is a request to study it.
  const opening = openingIn(text, lookups);
  if (opening) return words('command', `opening: ${opening}`);

  if (/^(?:review|last game|calculation)$/i.test(lower)) {
    return lower === 'calculation' ? words('learning', 'calculation') : words('command', 'review');
  }

  return { kind: 'unclear', about: text, via: 'none', clarify: 'Could you say that another way?' };
}
