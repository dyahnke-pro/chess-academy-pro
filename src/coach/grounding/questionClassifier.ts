/**
 * Question classifier — detects when a user's chat message is a tactical
 * evaluation question (needs Stockfish) and/or an opening / theory question
 * (needs Lichess explorer).
 *
 * The spine uses this BEFORE calling the LLM. When a match fires AND the
 * envelope has a FEN, the spine pre-fetches the relevant grounding data
 * and injects it into the envelope as `groundingContext`. The provider's
 * prompt builder then prepends this context to the system message so the
 * LLM physically receives engine + opening data alongside the question
 * and cannot answer evaluation-flavored questions without it being in
 * context. WO-MANDATORY-GROUNDING.
 *
 * Design: regex-based, deterministic, zero dependencies. Triggers err on
 * the side of grounding (false positives are cheap — one extra Stockfish
 * call — false negatives are the bug we're fixing).
 */

export interface ClassifierResult {
  needsStockfish: boolean;
  needsLichess: boolean;
  /** Human-readable reason for diagnostics + audit. */
  reason: string;
}

// ─── Stockfish trigger patterns ─────────────────────────────────────────────

const TACTICAL_VERDICT_RE =
  /\bis\s+(?:this|that|it|the\b)[\s\S]{0,80}?\b(?:move|good|bad|winning|losing|best|worst|right|wrong|blunder|brilliant|sound|safe|sharp|solid|playable)\b/i;

const WHY_RE =
  /\bwhy\s+(?:didn['’]?t|did|wouldn['’]?t|would|don['’]?t|do)\s+(?:i|black|white|the|my|your|he|she|they|we)\b/i;

const BEST_MOVE_RE =
  /\bwhat['’]?s?\s+the\s+(?:best|worst|right|correct|engine)\s+move\b/i;

const EVAL_RE =
  /\bwhat['’]?s?\s+the\s+eval(?:uation)?\b/i;

const STATUS_RE =
  /\b(?:how|is|am\s+i|are\s+we)\s+(?:winning|losing|equal|ahead|behind)\b/i;

const TACTIC_NOUN_RE =
  /\b(?:hanging|defended|attacked|blunder|brilliant|tactic|fork|pin|skewer|sacrifice|mate\s+in|gain[a-z]*\s+material|loses?\s+material)\b/i;

const SHOULD_PLAY_RE =
  /\bshould\s+i\s+(?:take|capture|trade|exchange|move|play|sac(?:rifice)?)\b/i;

/** Bare SAN tokens followed by question form: "e4?", "Nf3?", "Qxg5 good?",
 *  "Bxh7 best?". The SAN regex matches piece moves (Nf3), pawn moves (e4,
 *  exd5), captures, promotion (e8=Q), check / mate suffixes, and castling. */
const SAN_QUESTION_RE =
  /(?:\b|^)([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)\s*(?:\?|\bgood\b|\bbest\b|\bbad\b|\bwinning\b|\blosing\b|\bblunder\b|\bsound\b)/;

// ─── Lichess trigger patterns ───────────────────────────────────────────────

const OPENING_NAME_QUESTION_RE =
  /\bwhat\s+(?:opening|line|variation|defense|attack|gambit)\s+is\s+this\b/i;

const NAME_OF_RE =
  /\bwhat['’]?s?\s+the\s+name\s+of\b/i;

const POPULAR_RE =
  /\bpopular\s+(?:move|reply|response|continuation|line)\b/i;

const MAINLINE_RE =
  /\bmain(?:line)?\s+(?:move|continuation|reply|response|line)\b/i;

const MASTER_RE =
  /\b(?:grandmaster|grand[\s-]?master|master|gm|im|fm)\s+(?:game|line|response|reply|move|theory)\b/i;

const THEORY_RE =
  /\b(?:theory|book|theoretical|known\s+line|main\s+line)\b/i;

const TOP_PLAYERS_RE =
  /\bwhat\s+do\s+(?:top|strong|elite|gm|im|master|grandmaster)\s+players\s+(?:play|do|prefer|choose)\b/i;

/** Common opening names. Triggers needsLichess when any of these appears in
 *  the question text. Conservative list — covers the openings actually
 *  surfaced in the app's repertoire and the ones users name in casual
 *  conversation. Pattern matches on word boundaries so "italian food"
 *  won't false-trigger. */
const OPENING_NAMES_RE =
  /\b(?:italian(?:\s+game)?|vienna(?:\s+(?:game|trap))?|sicilian|french|caro[\s-]?kann|ruy\s+lopez|spanish(?:\s+game)?|scotch|king['’]?s\s+gambit|queen['’]?s\s+gambit|english(?:\s+opening)?|london(?:\s+system)?|catalan|nimzo[\s-]?indian|king['’]?s\s+indian|gr[uü]nfeld|slav|semi[\s-]?slav|alapin|najdorf|sveshnikov|dragon|scandinavian|alekhine(?:['’]?s\s+defense)?|petroff|philidor|two\s+knights|four\s+knights|berlin|breyer|marshall|bird['’]?s\s+opening|reti)\b/i;

// ─── Public classifier ─────────────────────────────────────────────────────

const STOCKFISH_TRIGGERS: { re: RegExp; label: string }[] = [
  { re: TACTICAL_VERDICT_RE, label: 'tactical-verdict' },
  { re: WHY_RE, label: 'why-question' },
  { re: BEST_MOVE_RE, label: 'best-move-question' },
  { re: EVAL_RE, label: 'eval-question' },
  { re: STATUS_RE, label: 'status-question' },
  { re: TACTIC_NOUN_RE, label: 'tactic-noun' },
  { re: SHOULD_PLAY_RE, label: 'should-play' },
  { re: SAN_QUESTION_RE, label: 'san-question' },
];

const LICHESS_TRIGGERS: { re: RegExp; label: string }[] = [
  { re: OPENING_NAME_QUESTION_RE, label: 'opening-name-question' },
  { re: NAME_OF_RE, label: 'name-of' },
  { re: POPULAR_RE, label: 'popular' },
  { re: MAINLINE_RE, label: 'mainline' },
  { re: MASTER_RE, label: 'master-game' },
  { re: THEORY_RE, label: 'theory' },
  { re: TOP_PLAYERS_RE, label: 'top-players' },
  { re: OPENING_NAMES_RE, label: 'opening-name-mention' },
];

export function classifyQuestion(text: string): ClassifierResult {
  if (!text || !text.trim()) {
    return { needsStockfish: false, needsLichess: false, reason: 'empty' };
  }

  const stockfishHit = STOCKFISH_TRIGGERS.find((t) => t.re.test(text));
  const lichessHit = LICHESS_TRIGGERS.find((t) => t.re.test(text));

  const reasons: string[] = [];
  if (stockfishHit) reasons.push(`stockfish:${stockfishHit.label}`);
  if (lichessHit) reasons.push(`lichess:${lichessHit.label}`);

  return {
    needsStockfish: !!stockfishHit,
    needsLichess: !!lichessHit,
    reason: reasons.length > 0 ? reasons.join(',') : 'no-match',
  };
}
