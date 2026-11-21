/**
 * EVERY FACT KNOWS ITS BOARD, AND ONE RENDERER WRITES THE TEACHING SENTENCE
 * (CLAUDE.md, David 2026-11-20).
 *
 * A computer returns DATA: who (the piece or move the fact is about), does
 * (the mechanism), so what (the consequence for the side), the proof (short
 * line + full line), an optional pattern, the BOARD it was computed on and the
 * student's seat. This module writes the sentence, so the voice rules live in
 * one place:
 *   - the anchor: a fact whose board is not the one on screen and has no path
 *     from it cannot be rendered (`anchorSentenceFact` returns null — the
 *     branded `AnchoredFact` is the only thing the renderer takes);
 *   - the owner ("your" / "their") is read from the piece's colour on the
 *     fact's OWN board against the seat — never written by a computer;
 *   - the tense comes from one table, relation × surface (`TENSE`);
 *   - the why before the material: the mechanism is said, the material is its
 *     consequence;
 *   - "threatens" only for a forcing follow-up (`isForcingThreat`);
 *   - no orphan lead ("It …", "after this").
 * Pure: chess.js only.
 */
import { CAPTURE_VALUE } from './pieceValues';
import { Chess, type Square } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';
import { andList, orList, countWord } from '../utils/andList';
import { openSentence, continueSentence } from '../utils/openSentence';
import { evalBandWords, type EvalBand } from './evalBand';

/** The board a fact is about, relative to the board on screen. */
export type FactRelation = 'now' | 'past' | 'line' | 'try';

export interface FactBoard {
  /** The position key (pieces, side, castling, en passant) of the board the
   *  fact was computed on. */
  key: string;
  /** For `line` / `try`: the moves (uci) from the board on screen to the
   *  fact's board. For `past`: the moves from the fact's board to the screen. */
  path: readonly string[];
  relation: FactRelation;
}

export type Surface = 'learn' | 'review' | 'read' | 'chat';

/** The position key of a FEN: its first four fields. */
export const positionKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** The FEN after `path` (uci) from `fen`; null when a move is illegal. */
export function fenAfter(fen: string, path: readonly string[]): string | null {
  try {
    const b = new Chess(fen);
    for (const u of path) b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return b.fen();
  } catch { return null; }
}

/** The stamp of a fact computed on the screen's own board. */
export function nowBoard(fen: string): FactBoard {
  return { key: positionKey(fen), path: [], relation: 'now' };
}

/** The stamp of a fact computed after `path` (uci) from the screen. Null
 *  when the path is not legal there. */
export function boardAfter(fen: string, path: readonly string[], relation: 'line' | 'try'): FactBoard | null {
  const after = fenAfter(fen, path);
  return after ? { key: positionKey(after), path: [...path], relation } : null;
}

const VALUE: Readonly<Record<string, number>> = CAPTURE_VALUE;

/** SAN of `uci` on `fen`, with "…" before a Black move. */
export function sanWords(fen: string, uci: string): string | null {
  try {
    const b = new Chess(fen);
    const black = b.turn() === 'b';
    return `${black ? '…' : ''}${b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san}`;
  } catch { return null; }
}

/** "THREATENS" ONLY FOR A FORCING FOLLOW-UP (CLAUDE.md rule 2): a check, a
 *  mate, a promotion, a capture, or an attack it makes on a piece worth more
 *  than the mover or unguarded. `fen` is the board the follow-up is played on
 *  (the side to move there may be the other side: the follow-up is then read
 *  as if they passed). */
export function isForcingThreat(fen: string, follow: string): boolean {
  try {
    let b = new Chess(fen);
    const p0 = b.get(follow.slice(0, 2) as Square);
    if (!p0) return false;
    if (p0.color !== b.turn()) {
      const parts = fen.split(' '); parts[1] = p0.color; parts[3] = '-';
      b = new Chess(parts.join(' '));
    }
    const m = b.move({ from: follow.slice(0, 2), to: follow.slice(2, 4), promotion: follow[4] });
    if (/[+#]/.test(m.san) || m.captured || m.promotion) return true;
    for (const row of b.board()) for (const p of row) {
      if (!p || p.color === m.color) continue;
      if (!b.attackers(p.square, m.color).includes(m.to)) continue;
      if (VALUE[p.type] > VALUE[m.piece] || b.attackers(p.square, p.color).length === 0) return true;
    }
    return false;
  } catch { return false; }
}

/** THE SAFE-PIECE RULE: a piece is safe when no cheaper piece attacks it and,
 *  attacked at all, it is guarded. Praise of a piece (best placed, active, an
 *  outpost) needs it. */
export function pieceIsSafe(fen: string, square: string): boolean {
  try {
    const b = new Chess(fen);
    const p = b.get(square as Square);
    if (!p) return false;
    const att = b.attackers(square as Square, p.color === 'w' ? 'b' : 'w');
    if (att.length === 0) return true;
    if (Math.min(...att.map((s) => VALUE[b.get(s)?.type ?? 'q'])) < VALUE[p.type]) return false;
    return b.attackers(square as Square, p.color).length > 0;
  } catch { return false; }
}

/** The path from the screen, said as its moves ("Rh1 …Qxh6"); null when
 *  empty or illegal. */
export function pathWords(fen: string, path: readonly string[]): string | null {
  if (path.length === 0) return null;
  const out: string[] = [];
  let at = fen;
  for (const u of path) {
    const w = sanWords(at, u);
    const next = fenAfter(at, [u]);
    if (!w || !next) return null;
    out.push(w); at = next;
  }
  return out.join(' ');
}

export interface Rendered { spoken: string; shown: string; marks: { squares: string[]; arrows: Array<[string, string]> } }

const cap = openSentence;

// ── THE TRIES FAMILY (step 2a) ─────────────────────────────────────────────
// A tempting move refuted, returned as data by its computers
// (`standingRefutations`, the grouped "all fail the same way"), written here.

/** A try as data: the move, the reply that meets it, the reply's job, the
 *  reason (and the path to the board it is true on, when that is the board
 *  after the line), the material the line wins, and the result's shift. */
export interface TryData {
  san: string;
  /** The try as it is said: its SAN, with "…" when Black plays it — the
   *  mover read off the board, so a Black try never reads as White's. */
  name: string;
  /** The reply, with "…" on a Black move. */
  reply: string;
  /** The try is the side to move's (the student's seat) — else theirs. */
  mine: boolean;
  /** The rotation key (`stemKeyOf(fen|result|uci)`). */
  stem: number;
  /** The plan's direct try: its aim in words, a pawn storm. */
  plan: { aim: string; storm: boolean } | null;
  /** What the reply does, said right after the lead. */
  replyFollow: string | null;
  /** The computed reason (a computer's words until its family returns data). */
  why: string | null;
  /** The moves to the board the reason is true on ("Rh1 …Qxh6"), said before
   *  it; null when the reason is about the try itself. */
  whyPath: string | null;
  /** The material the line wins, in pieces ("a knight for a pawn"). */
  material: string | null;
  /** "They" / "You": who wins it. */
  materialWho: string;
  /** The line mates. */
  mates: boolean;
  /** The result's shift ("It throws the win"), written with the subject
   *  "It" — the renderer names the try once, in the lead. */
  shift: string | null;
  /** `result`: the band changes (a win thrown, the edge gone); `smaller`: the
   *  band holds and part of the edge is given back. A try says ONE cost: the
   *  result change, else the material, else the smaller shift. */
  shiftKind: 'result' | 'smaller' | null;
}

function tryLead(t: TryData): string {
  const { name: san, reply, mine, plan, stem } = t;
  if (plan) {
    if (plan.storm) {
      return mine
        ? rotateStem([`${san} storms their king, but ${reply} meets it.`, `${san}, throwing a pawn at their king, runs into ${reply}.`], stem)
        : rotateStem([`${san} stormed your king for them, but ${reply} meets it.`, `${san}, throwing a pawn at your king, ran into ${reply} for them.`], stem);
    }
    return mine
      ? rotateStem([`${san} goes straight at ${plan.aim}, but ${reply} meets it.`, `${san} to hit ${plan.aim} directly runs into ${reply}.`], stem)
      : rotateStem([`${san} went straight at ${plan.aim} for them, but ${reply} meets it.`, `${san} to hit ${plan.aim} directly ran into ${reply} for them.`], stem);
  }
  return mine
    ? rotateStem([`${san} looks natural, but ${reply} meets it.`, `${san} is the obvious try, but ${reply} is the answer.`, `${san} is tempting, but ${reply} takes the sting out of it.`], stem)
    : rotateStem([`${san} looked natural for them, but ${reply} meets it.`, `${san} was the obvious try for them, but ${reply} is the answer.`, `${san} was tempting for them, but ${reply} takes the sting out of it.`], stem);
}

/** The reason, anchored on its own board: "After Rh1 …Qxh6, their queen on
 *  h6 attacks your rook on h1." — never said as if about the board on screen. */
export function renderTryReason(t: TryData): string | null {
  if (!t.why) return null;
  const why = t.why.trim();
  if (!t.whyPath) return why;
  // The reason's first word joins the clause; a move (SAN) keeps its case.
  const joined = /^(?:[KQRBN][a-h1-8x]|O-O)/.test(why) ? why : why.replace(/^[A-Z](?=[a-z'’])/, (w) => w.toLowerCase());
  // The path IS the reply the lead just named ("…f6 meets it. After …f6,
  // their pawn on f6 is aimed at …" said the move and its square three
  // times): no second anchor, and the piece the reply moved is "that pawn".
  if (t.whyPath.trim() === t.reply.trim()) {
    const to = /([a-h][1-8])(?:=[QRBN])?$/.exec(t.reply.replace(/[+#!?]+$/, ''))?.[1];
    const own = to ? new RegExp(`^(?:Their|Your) (\\w+) on ${to}\\b`).exec(why) : null;
    if (own) return `That ${own[1]}${why.slice(own[0].length)}`;
    return `Then ${joined}`;
  }
  return `After ${t.whyPath}, ${joined}`;
}

/** ONE COST: the line's mate, the material it hands over, or the result's
 *  shift — never two (a try that "hands them a pawn" and "gives back part of
 *  your edge" said one cost twice). The material is the concrete one, so it
 *  speaks before the band. Subject "It". */
function tryCost(t: TryData): string | null {
  if (t.mates) return t.mine ? 'It loses the game.' : 'It loses them the game.';
  // The material, unless the reason already says what the line wins.
  if (t.material && !(t.why && /\bwin/.test(t.why))) return `It hands ${t.mine ? 'them' : 'you'} ${t.material} in the line.`;
  return t.shift;
}

/** "It gives back part of your edge." → "it gives back part of your edge". */
const asClause = (sentence: string): string => sentence.trim().replace(/[.\s]+$/, '').replace(/^(It|After)\b/, (w) => w.toLowerCase());

/** One try, refuted: the lead names it ONCE, and after it the try is "it".
 *  Its why, then its ONE cost, said as the second half of the sentence before
 *  it — after the lead ("…Rf7 looks natural, but Nxb8 meets it: they win a
 *  rook for two pawns in the line"), after a why about the try ("It wins
 *  nothing: the trades leave the material level, and it gives back part of
 *  your edge"), or after a sentence about the reply, naming the try there
 *  ("…, and …Kh4 hands them a pawn in the line") — never a bare "It hands
 *  them a pawn", the same sentence on every try. */
export function renderTry(t: TryData): string {
  const lead = tryLead(t);
  const reason = renderTryReason(t);
  const name = (x: string): string => x.replace(/^It\b/, t.name).replace(/^After it\b/, `After ${t.name}`);
  const why = reason && t.replyFollow ? name(reason) : reason;
  const cost = tryCost(t);
  const sentences = [lead, t.replyFollow, why].filter((x): x is string => !!x);
  if (!cost) return sentences.join(' ');
  const last = sentences[sentences.length - 1];
  const strip = (x: string): string => x.trim().replace(/[.\s]+$/, '');
  let tail: string;
  if (last === lead) {
    tail = `${strip(lead)}: ${t.material && !t.mates && cost.startsWith('It hands') ? `${t.mine ? 'they' : 'you'} win ${t.material} in the line` : asClause(cost)}.`;
  } else {
    // "it" only where the sentence before is about the try itself.
    const onTry = last === why && !!reason && /^It\b/.test(reason) && !t.replyFollow;
    tail = `${strip(last)}, and ${onTry ? asClause(cost) : strip(name(cost)).replace(/^After\b/, 'after')}.`;
    // One "and" a sentence: a why that already runs on with one, or a long
    // one, keeps the cost its own sentence.
    // …and a cost that already has its own "and" ("achieves nothing, and
    // gives back …"), or a sentence that is another idea ("But your …Bxe4
    // stops it"), keeps the cost its own sentence.
    const lastSentence = last.split(/(?<=[.!?])\s+/).pop() ?? last;
    // A sentence about another piece or board ("After …f6, their f6 is aimed
    // at …") is another idea: the try's cost is its own sentence there.
    if (!onTry || lastSentence.split(/\s+/).length > 30 || /, and |— and /.test(lastSentence) || /, and /.test(cost) || /^But\b/.test(lastSentence)) tail = `${last} ${name(cost)}`;
  }
  return [...sentences.slice(0, -1), tail].join(' ');
}

/** Tries refuted for one reason (the decider grouped them): one sentence for
 *  the group, then the shared reason on its own board. */
export function renderTryGroup(sans: readonly string[], replies: readonly string[], shared: TryData): string {
  const two = sans.length === 2;
  // The shared reason is about every try in the group: where it names the
  // first try, it names "each" of them.
  const each = two ? 'either' : 'each';
  const why = shared.why ? shared.why.split(`…${shared.san}`).join(each).split(shared.san).join(each).replace(/^(either|each)\b/, (w) => cap(w)).replace(/^It\b/, cap(each)) : null;
  return [`${andList([...sans])} ${two ? 'both' : 'all'} fail the same way: ${orList([...replies])} meets ${each}.`, renderTryReason({ ...shared, why })].filter(Boolean).join(' ');
}

// ── THE MOVE'S JOBS (board read: every job speaks) ──────────────────────────
// The decider groups the jobs of ONE move (one idea once, by claim); the
// renderer says the move once and its jobs after it: "You go Rg1+, which gives
// check. It also takes the open g-file, and it pins …". Never a repeated
// "You go Rg1+, which …" per job.

const JOB_LEAD = /^(?:You|They) (?:go|play) \S+?(?:, which | — it | — | ?: it |: )/;

/** The job's clause with its "You go X, which" lead taken off; null when the
 *  job is not said in that shape (it is then said on its own). */
export function jobClause(text: string): string | null {
  const m = JOB_LEAD.exec(text);
  return m ? text.slice(m[0].length).trim().replace(/[.\s]+$/, '') : null;
}

/** One move's jobs, decided and ordered by the decider: the first in full,
 *  the rest as "It also …". */
export function renderMoveJobs(texts: readonly string[]): string {
  const [first, ...rest] = texts;
  const clauses = rest.map(jobClause).filter((c): c is string => !!c);
  if (clauses.length === 0) return first;
  // One idea a sentence: each further job its own short sentence, never an
  // "and … and …" chain.
  return [first.trim().replace(/[.\s]*$/, '.'), ...clauses.map((c, k) => `${k === 0 ? 'It also' : 'And it'} ${c}.`)].join(' ');
}

/** A candidate weighed and set aside, ASKED as a question ("Qf5? Then …"):
 *  the line the reply opens, then what it shows (`deliberation`). */
export interface AskedTry {
  san: string;
  /** The line from the reply on, in words; null when there is none. */
  line: string | null;
  /** What the line shows; joined by a dash, or ", and" for a piece lost. */
  shows: string | null;
  join: 'dash' | 'and';
  /** No line and no loss: the move holds, only less precisely. */
  playable?: boolean;
}

export function renderAskedTry(t: AskedTry): string {
  if (t.playable) return `${t.san} is playable, but not as precise.`;
  const tail = t.shows ? t.shows.trim().replace(/[.\s]+$/, '') : null;
  if (!t.line) return `${t.san}? ${tail ? cap(tail) : ''}.`;
  return `${t.san}? Then ${t.line}${tail ? (t.join === 'and' ? `, and ${tail}` : ` — ${tail}`) : ''}.`;
}

/** A try that goes nowhere: the reply sends the piece straight back. */
export function renderReturnTry(name: string, reply: string, piece: string, from: string, stem: number): string {
  return rotateStem([
    `${name} is met by ${reply}, and the ${piece} goes back to ${from}.`,
    `${name} runs into ${reply}, and the ${piece} heads straight back to ${from}.`,
  ], stem);
}

/** The verdict's "but": the tries it names, refuted each by its own line
 *  (said right after) — never a try without its why. */
export function renderButLine(names: readonly string[], oneTarget: string | null, stem: number): string {
  if (names.length === 1) return oneTarget ? `${names[0]}, going after ${oneTarget}, fails.` : `${names[0]} fails.`;
  const two = names.length === 2;
  return oneTarget
    ? rotateStem([`Every direct try on ${oneTarget} fails: ${andList([...names])}.`, `${andList([...names])} ${two ? 'both go' : 'all go'} after ${oneTarget}, and ${two ? 'both' : 'all'} fail.`], stem)
    : `${andList([...names])} ${two ? 'both' : 'all'} fail.`;
}

/** A sacrifice the student asked about (chat), judged on the best defence:
 *  the try's verdict with its why — what is given and what comes back. */
export interface SacrificeVerdict {
  cand: string;
  give: string;
  mateIn: number | null;
  /** The engine's judgement after the best defence. */
  judged: 'mates' | 'sound' | 'speculative' | 'unsound';
  /** The eval said in words, when there is one. */
  after: string | null;
  bestSan: string | null;
}

export function renderSacrificeVerdict(v: SacrificeVerdict): string {
  if (v.judged === 'mates') return `${v.cand} is a sound sacrifice — it forces mate in ${v.mateIn ?? ''}.`;
  if (v.judged === 'sound') return `${v.cand} is sound — you give up ${v.give}, but the compensation is real${v.after ? `: after the best defence ${v.after}` : ''}.`;
  if (v.judged === 'speculative') return `${v.cand} is speculative — after the best defence the attack doesn't quite cover ${v.give}${v.bestSan ? `. ${openSentence(v.bestSan)} keeps it simpler` : ''}.`;
  return `${v.cand} is unsound — the attack doesn't work: after the best defence you're just down ${v.give}${v.after ? ` (${v.after})` : ''}${v.bestSan ? `. Play ${v.bestSan} instead` : ''}.`;
}

/** The tempting move, affirmed then refuted with its one reason
 *  (`tacticalRead`): "You'd love to grab it with …, but it fails: …". */
export function renderTemptingTurn(move: string, appeal: string | null, because: string): string {
  const lead = appeal === null ? `You’d love to play ${move}` : `You’d love to ${appeal} with ${move}`;
  return `${lead}, but it fails: ${because}.`;
}

// ── WHAT A COSTLY MOVE ALLOWS (`costReason`) ───────────────────────────────

/** The allowed line as data: who it lets in, the line (SAN, "…" on a Black
 *  move), what it wins, whether it mates, whether the reads vouch for it. */
export interface AllowedData {
  whom: 'them' | 'you';
  sans: readonly string[];
  /** The line said in full (a mate line is short and is the proof). */
  lineWords: string;
  won: string | null;
  mate: boolean;
  /** The line ends in a mark that already says mate ("#"). */
  saysMate: boolean;
  trusted: boolean;
}

/** The move's predicate: ONE sentence with the move as its subject — the
 *  why (the blow) before the material, the line's KEY move said and the full
 *  line left to the board: "lets them play Bxd8, winning a queen for a
 *  bishop". A mate is said with its line. */
export function renderAllowedClause(a: AllowedData): string | null {
  if (a.sans.length === 0) return null;
  if (!a.trusted) return /x|\+|#/.test(a.sans[0]) ? `lets ${a.whom} play ${a.sans[0]}` : null;
  if (a.mate) return `walks into mate: ${a.lineWords}${a.saysMate ? '' : ", and it's mate"}`;
  return a.won ? `lets ${a.whom} play ${a.sans[0]}, winning ${a.won}` : null;
}

// ── THREATS AND "PREPARES" (family A1) ─────────────────────────────────────
// The threat computers (`moveThreat`, `latentDanger`, `computeMustDefend`,
// `detectNewThreat`, `describeThreatPrevention`) return what the threat is;
// the sentence is written here. "Threatens" is only ever said of a forcing
// follow-up: a mate, a material win, or a move `isForcingThreat` passes.

/** What a move threatens, read by `moveThreat`. */
export type MoveThreatData =
  | { kind: 'mate'; n: 2 | 3; lineWords: string }
  | { kind: 'win'; won: string; lineWords: string };

/** The move's predicate: "threatens mate in two: …" / "threatens to win the
 *  pawn on d5: …" — a mate or a material win is forcing by its own count. */
export function renderMoveThreat(t: MoveThreatData): string {
  return t.kind === 'mate'
    ? `threatens mate in ${t.n === 2 ? 'two' : 'three'}: ${t.lineWords}`
    : `threatens to win ${t.won}: ${t.lineWords}`;
}

/** A new one-move threat (`detectNewThreat`), from the student's seat. The
 *  threat move is forcing by `isForcingThreat` on its own board, else it is
 *  said as what the move prepares. */
export interface NewThreatData {
  mine: boolean;
  san: string;
  /** What the threat move does ("forks your king and rook"). */
  detail: string;
  /** How the student's answer meets it (their threat only). */
  answer: string | null;
  /** The board the threat move is played on, and the move (uci). */
  fen: string;
  uci: string;
  mate: boolean;
}

export function renderNewThreat(t: NewThreatData): string {
  const forcing = t.mate || isForcingThreat(t.fen, t.uci);
  if (t.mine) return forcing ? `You're now threatening ${t.san} — it ${t.detail}.` : `Your move prepares ${t.san} — it ${t.detail}.`;
  const lead = forcing ? `Careful — their move threatens ${t.san}: it ${t.detail}.` : `Their move prepares ${t.san}: it ${t.detail}.`;
  return t.answer ? `${lead} The answer: ${t.answer}.` : lead;
}

/** A piece the opponent attacks with more than it is guarded
 *  (`computeMustDefend`): the piece leads, the attacker after it. */
export interface MustDefendData {
  /** "their knight" (with its square when it can be taken: "their knight on
   *  f5"), or null when no single attacker is named. */
  attacker: string | null;
  /** "your rook on e1". */
  piece: string;
  undefended: boolean;
  /** The attacker can be taken without losing material. */
  takeable: boolean;
  /** Said already this game: "Still — …". */
  still: boolean;
  /** The student is clearly winning (the prophylaxis framing). */
  winning: boolean;
}

/** The hit alone — what a line's reason says (never the screen's standing). */
export function renderMustDefendHit(d: MustDefendData): string {
  const hit = `${d.attacker ?? 'they'} ${d.attacker ? 'attacks' : 'attack'} ${d.piece}${d.undefended ? ', and nothing defends it' : ''}${d.takeable ? ' — and you can take the attacker without losing material' : ''}`;
  return `${cap(hit)}.`;
}

export function renderMustDefend(d: MustDefendData): string {
  const hit = renderMustDefendHit(d);
  const low = continueSentence(hit);
  if (d.still) return `Still — ${low}`;
  return d.winning ? `You're on top, but watch the counterpunch: ${low}` : hit;
}

/** HOW A DEFENCE MEETS A THREAT (`describeThreatPrevention`), as data. */
export type ThreatAnswerData =
  | { how: 'escape'; defense: string; piece: string; capture: string | null }
  | { how: 'hit-guard'; defense: string; piece: string; square: string; sole: boolean }
  | { how: 'add-defender'; defense: string; square: string }
  | { how: 'step-off'; defense: string; piece: string }
  | { how: 'rules-out'; defense: string; threat: string };

export function renderThreatAnswer(a: ThreatAnswerData): string {
  switch (a.how) {
    case 'escape': return `${a.defense} gets the ${a.piece} out of the fire${a.capture ? `, ${a.capture} on the way` : ''}`;
    case 'hit-guard': return a.sole
      ? `${a.defense} meets it by hitting the ${a.piece} on ${a.square} — the piece holding the whole thing together`
      : `${a.defense} meets it by hitting the ${a.piece} on ${a.square}, one of the pieces backing it up`;
    case 'add-defender': return `${a.defense} meets it by adding a defender to ${a.square}, the square the threat needed`;
    case 'step-off': return `${a.defense} meets it by stepping the ${a.piece} off the forking alignment`;
    case 'rules-out': return `${a.defense} rules out ${a.threat} entirely`;
  }
}

/** A pin waiting on a line (`latentDanger`): the pieces named on the board
 *  it was read on, from the viewer's seat. */
export interface LatentPinData {
  /** The viewer owns the front piece: a danger ("heads up"), else a chance. */
  mine: boolean;
  front: string;
  frontName: string;
  back: string;
  enemy: string;
  line: string;
  /** The piece between, when the pin needs it to move first. */
  shield: { words: string; name: string } | null;
}

export function renderLatentPin(d: LatentPinData): string {
  if (d.shield) {
    return d.mine
      ? `heads up: ${d.enemy} looks through ${d.shield.words} at ${d.front} and your ${d.back} behind it — move the ${d.shield.name} and the ${d.frontName} is pinned.`
      : `${d.enemy} looks through ${d.shield.words} at ${d.front} and their ${d.back} behind it — once their ${d.shield.name} moves, the ${d.frontName} is pinned.`;
  }
  return d.mine
    ? `heads up: ${d.front} and your ${d.back} share that ${d.line} with ${d.enemy} — that ${d.line} is a pin.`
    : `${d.front} and their ${d.back} share that ${d.line} with ${d.enemy} — that ${d.line} is a pin to aim at.`;
}

/** A trade that would walk into a pin (`latentDanger`). */
export function renderTradePin(d: { tradeTo: string; front: string; enemy: string; back: string; line: string }): string {
  return `before you take on ${d.tradeTo}, look past the trade: ${d.front} would stand between ${d.enemy} and ${d.back}, all on one ${d.line} — a pin.`;
}

/** A quiet move with a follow-up (`quietThreat`, the board read): "threatens"
 *  only when the follow-up is forcing on the board it is played on. */
export function renderQuietThreat(q: { san: string; follow: string; mates: boolean; forcing: boolean;
  /** REQUIRED — the side that plays the quiet move: a Black move carries its
   *  "…" ("…Rab8 is quiet", Danya board read 2026-11-21 said "Rab8"). */
  mover: 'w' | 'b' }): string {
  const san = q.mover === 'b' && !q.san.startsWith('…') ? `…${q.san}` : q.san;
  return q.forcing
    ? `${san} is quiet, but it threatens ${q.follow}${q.mates ? ', with mate to follow' : ''} — they must answer that first.`
    : `${san} is quiet: it prepares ${q.follow}.`;
}

/** A move's one-move threat (`detectNewThreat` on the briefing): the
 *  participle and the predicate forms. */
export function renderAspectThreat(san: string, detail: string): { text: string; verb: string } {
  return { text: `threatening ${san} — ${detail}`, verb: `threatens ${san} — ${detail}` };
}

/** A mate threat used as a lever to win material (`mateThreatLever`). */
export function renderMateLever(t: { you: boolean; first: boolean; move: string; mate: string; won: string; stem: number }): string {
  const lead = t.first ? t.move : `In the best line, ${t.move}`;
  return t.you
    ? rotateStem([
      `${lead} threatens ${t.mate} mate. The mate is the lever, not the goal: while they stop it, you pick up material, and the line wins you ${t.won}.`,
      `Use the mate threat to win something: ${t.first ? t.move : `the line's ${t.move}`} threatens ${t.mate} mate, and stopping it costs them ${t.won}.`,
    ], t.stem)
    : rotateStem([
      `Their ${t.move} would threaten ${t.mate} mate. They don't need to mate you: stopping it costs you ${t.won} in the best line.`,
      `Watch for ${t.move}: it threatens ${t.mate} mate, and the price of stopping it is ${t.won}. A mate threat is how they turn pressure into material.`,
    ], t.stem);
}

/** A mate threat whose every defence costs something else (`practicalReads`). */
export function renderMateThreatTwoJobs(t: { mine: boolean; san: string; mateSq: string; trap: boolean }): string {
  if (t.mine) {
    const tail = t.trap ? 'whatever stops it leaves their queen with nowhere to go' : 'whatever stops it leaves a piece of theirs loose';
    return `${t.san} threatens mate on ${t.mateSq} — and ${tail}. One threat doing two jobs: don't hunt only the mate or only the material, line them up.`;
  }
  const tail = t.trap ? 'every defence leaves your queen short of squares' : 'every defence leaves a piece of yours loose';
  return `${t.san} threatens mate on ${t.mateSq}, and ${tail} — stop the mate first, then pick the defence that gives up the least.`;
}

// ── THE STANDING AND THE VERDICT (family A2) ───────────────────────────────

/** The band word for a step of the one ladder (`evalBand`), from the mover. */
export const STEP_WORD: Readonly<Record<number, string>> = { [-3]: 'losing', [-2]: 'clearly worse', [-1]: 'slightly worse', 0: 'level', 1: 'slightly better', 2: 'clearly better', 3: 'winning' };

export type PictureVerdictKind = 'works-now' | 'hard-to-finish' | 'no-direct-way' | 'tries-worsen' | 'plain';

/** The picture's verdict (`pictureVerdict` decides which), worded: the full
 *  line with its standing, the line for after the standing was said (never an
 *  orphan "And …"), and the verdict word. */
export function renderPictureVerdict(v: {
  kind: PictureVerdictKind; step: number; mine: boolean; works: string | null;
  butNames: readonly string[]; oneTarget: string | null; noCounterplay: boolean; stem: number;
}): { text: string; afterStanding: string; joined: string; word: string } {
  const lead = v.step === 0 ? "It's level" : `${v.mine ? "You're" : "They're"} ${STEP_WORD[v.step]}`;
  const them = v.mine ? 'them' : 'you';
  const butLine = renderButLine(v.butNames, v.oneTarget, v.stem);
  const noCp = v.noCounterplay ? ` ${v.mine ? 'They have' : 'You have'} no counterplay, so there is time.` : '';
  const w = STEP_WORD[v.step];
  switch (v.kind) {
    case 'works-now': return {
      text: rotateStem([`${lead}, and the direct way works now: ${v.works}.`, `${lead}, and ${v.works} goes straight for it.`], v.stem),
      // Said without the standing, "goes straight for it" has no "it".
      afterStanding: `The direct way works now: ${v.works}.`,
      joined: `The direct way works now: ${v.works}.`,
      word: `${w}, and it works now`,
    };
    case 'hard-to-finish': {
      const first = rotateStem([`${lead}, but it is hard to finish ${them} off.`, `${lead}, but breaking through is another matter.`], v.stem);
      const after = rotateStem([`It is hard to finish ${them} off.`, 'Breaking through is another matter.'], v.stem);
      // Right after the standing it is the standing's "but" (the contrast is
      // the point: better, but hard to finish); said later, on its own.
      const joined = rotateStem([`But it is hard to finish ${them} off.`, 'But breaking through is another matter.'], v.stem);
      return { text: `${first} ${butLine}${noCp}`, afterStanding: `${after} ${butLine}${noCp}`, joined: `${joined} ${butLine}${noCp}`, word: `${w}, but hard to finish` };
    }
    case 'no-direct-way': {
      const first = rotateStem([`${lead}, and there is no direct way in.`, `${lead}, and the direct tries get nowhere.`], v.stem);
      const after = rotateStem(['There is no direct way in.', 'The direct tries get nowhere.'], v.stem);
      return { text: `${first} ${butLine}`, afterStanding: `${after} ${butLine}`, joined: `${after} ${butLine}`, word: 'level, with no direct way in' };
    }
    case 'tries-worsen': return { text: `${lead}, and the active tries only make it worse. ${butLine}`, afterStanding: `The active tries only make it worse. ${butLine}`, joined: `The active tries only make it worse. ${butLine}`, word: `${w}, and the active tries make it worse` };
    case 'plain': return { text: `${lead}.`, afterStanding: '', joined: '', word: w };
  }
}

/** THE STANDING, with the board's reasons (`verdictWithReasons` computes them;
 *  `evalBand` the band): "You're slightly better — your pieces are …". A
 *  person names a square or two in a sentence: a second reason that would
 *  take it past two squares is its own sentence. A level board's two reasons
 *  pull opposite ways, weighed with "but". */
export function renderStanding(v: { band: string; side: 'better' | 'worse'; reasons: readonly string[]; level: boolean }): string {
  const verdict = v.band === 'level' ? 'roughly balanced' : `you're ${evalBandWords(v.band as EvalBand, v.side)}`;
  const V = openSentence(verdict);
  const why = v.reasons;
  if (why.length === 0) return `${V}.`;
  const squaresIn = (t: string): number => new Set(t.match(/\b[a-h][1-8]\b/g) ?? []).size;
  if (why.length > 1 && squaresIn(why.join(' ')) > 2) return `${V} — ${why[0]}. ${why.slice(1).map((w) => `${openSentence(w)}.`).join(' ')}`;
  return `${V} — ${why.join(v.level && why.length === 2 ? ', but ' : ', ')}.`;
}

/** How a move moved the standing (student seat, cp swing); null when it
 *  barely moved. */
export function renderSwing(swing: number): string | null {
  if (Math.abs(swing) < 40) return null;
  return swing >= 150 ? 'It swung the game your way.'
    : swing >= 40 ? 'It nudged the balance your way.'
      : swing > -150 ? 'It gave a little ground.'
        : 'It let a real edge slip.';
}

// ── PIECES (family A3) ─────────────────────────────────────────────────────
// Praise of a piece is said only when the piece is SAFE on the board it is
// read on (`pieceIsSafe`) — the renderer checks it, so no computer can praise
// a hanging piece; a piece said with its work, never bare.

export type PieceReadData =
  | { kind: 'good'; fen: string; own: boolean; piece: string; square: string; work: string }
  | { kind: 'stranded'; own: boolean; piece: string; square: string; covered: readonly string[] }
  | { kind: 'bad'; own: boolean; piece: string; square: string; why: string };

export function renderPieceRead(d: PieceReadData): string | null {
  if (d.kind === 'good') {
    if (!pieceIsSafe(d.fen, d.square)) return null;
    return d.own ? `Your ${d.piece} on ${d.square} is your best-placed piece — ${d.work}.` : `Their ${d.piece} on ${d.square} is well placed — ${d.work}.`;
  }
  if (d.kind === 'stranded') {
    const where = d.covered.length > 2 ? 'every square it can go to is covered'
      : d.covered.length === 2 ? `${andList([...d.covered])} are both covered` : `${d.covered[0]} is covered`;
    return d.own
      ? `Your ${d.piece} on ${d.square} is stranded: ${where}, so it has no safe square — if it is attacked it has nowhere to go.`
      : `Their ${d.piece} on ${d.square} is stranded: ${where}, so it has no safe square — attack it and it has nowhere to go.`;
  }
  return d.own
    ? `Your ${d.piece} on ${d.square} is your problem piece, ${d.why}, so improving it is a plan in itself.`
    : `Their ${d.piece} on ${d.square} is their problem piece, ${d.why}, and keeping it bad is worth as much as winning a pawn.`;
}

// ── PLANS AND TARGETS (family A4: the picture's ledger, target, counterplay) ─

/** A ledger entry as words need it: the piece (null for a hole), its square,
 *  its traits, and the guards it is tied to. */
export interface LedgerEntryWords {
  piece: string | null;
  square: string;
  traits: readonly string[];
  tiedTo: ReadonlyArray<{ piece: string; square: string }> | null;
}

function assetWords(e: LedgerEntryWords): string {
  const name = `the ${e.piece ?? 'piece'} on ${e.square}`;
  if (e.traits.includes('passed')) return `the passed pawn on ${e.square}`;
  if (e.traits.includes('outpost')) return `${name}, on an outpost no pawn can kick`;
  if (e.traits.includes('open-file')) return `${name}, on a file free of its own pawns`;
  return name;
}

function weakWords(e: LedgerEntryWords): string {
  if (e.piece === null) return `the hole on ${e.square}`;
  const name = `the ${e.piece} on ${e.square}`;
  if (e.piece === 'king') return e.traits.includes('king-centre') ? 'the king, still in the centre' : 'the king, with an open file beside it';
  if (e.traits.includes('no-safe-square')) return `${name}, which has no safe square`;
  if (e.traits.includes('isolated')) return `the isolated pawn on ${e.square}`;
  if (e.traits.includes('backward')) return `the backward pawn on ${e.square}`;
  if (e.traits.includes('doubled')) return `the doubled pawn on ${e.square}`;
  // One guard is named with its square; more are named by piece (a sentence
  // names two squares at most — the voice rule; the board lights them).
  if (e.tiedTo) return `${name}, held only by ${e.tiedTo.length === 1 ? `the ${e.tiedTo[0].piece} on ${e.tiedTo[0].square}` : andList(e.tiedTo.map((x) => `the ${x.piece}`))}`;
  return name;
}

const countOf = countWord;

/** The ledger: each side's working pluses (a piece praised only when safe on
 *  the board), then the weak spot the other side can reach. One idea a
 *  sentence; the student's side first. */
export function renderLedger(l: { fen: string; key: number; sides: ReadonlyArray<{ mine: boolean; working: readonly LedgerEntryWords[]; weak: { count: number; worst: LedgerEntryWords } | null }> }): string | null {
  const out: string[] = [];
  for (const sd of l.sides) {
    // THE SAFE-PIECE RULE: a pawn or piece praised as working must be safe.
    const working = sd.working.filter((e) => e.piece === null || pieceIsSafe(l.fen, e.square));
    if (working.length > 0) {
      const list = andList(working.map(assetWords));
      out.push(sd.mine
        ? rotateStem([`On your side of the ledger: ${list}.`, `What is working for you: ${list}.`], l.key)
        : rotateStem([`On their side: ${list}.`, `What is working for them: ${list}.`], l.key));
    }
    if (sd.weak) {
      const worst = weakWords(sd.weak.worst);
      if (sd.weak.count === 1) {
        out.push(sd.mine
          ? rotateStem([`They can get at your weak spot: ${worst}.`, `Your weak spot they can reach is ${worst}.`], l.key)
          : rotateStem([`You can get at their weak spot: ${worst}.`, `Their weak spot you can reach is ${worst}.`], l.key));
      } else {
        const n = countOf(sd.weak.count);
        out.push(sd.mine
          ? rotateStem([`They can get at ${n} of your weak spots. The worst is ${worst}.`, `${n} of your weak spots are in their reach. The worst is ${worst}.`], l.key)
          : rotateStem([`You can get at ${n} of their weak spots. The worst is ${worst}.`, `${n} of their weak spots are in your reach. The worst is ${worst}.`], l.key));
      }
    }
  }
  return out.length === 0 ? null : out.map(openSentence).join(' ');
}

/** The target, with the count that chose it. */
export function renderTarget(t: { mine: boolean; now: boolean; thing: string; runnerUp: string | null; attackers: number; defenders: number; levers: boolean; stem: number }): string {
  const units = t.levers ? 'pieces and pawns' : 'pieces';
  const why = `${countOf(t.attackers)} ${t.mine ? `of your ${units}` : `of their ${units}`} can get at it, and only ${countOf(t.defenders)} ${t.mine ? 'of theirs' : 'of yours'} can guard it`;
  const lead = t.now ? (t.mine ? 'The target is now' : 'Their target is now')
    : t.mine ? rotateStem(['The target is', 'Aim at'], t.stem) : rotateStem(['Their target is', 'They will aim at'], t.stem);
  return t.runnerUp ? `${lead} ${t.thing}, not ${t.runnerUp}: ${why}.` : `${lead} ${t.thing}: ${why}.`;
}

/** The plan's target: the piece that wins the race and its way there, then
 *  the count. */
export function renderPlanTarget(p: { mine: boolean; piece: string; thing: string; route: readonly string[]; at: string; horizon: number; attackers: number; pawnsToo: boolean; defenders: number; stem: number }): string {
  // The route is drawn on the board; the sentence names where it ends and
  // how far (a list of squares read aloud is a score sheet, the voice rule).
  // (How far is the count sentence's job: "In four moves …".)
  const owner = p.mine ? 'Your' : 'Their';
  const head = rotateStem([`${owner} ${p.piece} can get to ${p.at} and hit ${p.thing}.`, `${owner} ${p.piece} has a way to ${p.thing}: from ${p.at}.`], p.stem);
  const atk = `${countOf(p.attackers)} of ${p.mine ? 'your' : 'their'} ${p.pawnsToo ? 'pieces and pawns' : 'pieces'} ${p.attackers === 1 ? 'reaches' : 'reach'} it`;
  const guard = p.defenders === 0
    ? `${p.mine ? 'they have' : 'you have'} nothing that can guard it in time`
    : `${p.mine ? 'they' : 'you'} can only bring ${countOf(p.defenders)} to guard it`;
  return `${head} In ${countOf(p.horizon)} moves ${atk}, and ${guard}.`;
}

/** The counterplay — said alive or dead, its stopper named as its side's move. */
export function renderCounterplay(c: {
  mine: boolean; alive: boolean; piece: string; from: string; to: string; hits: readonly string[];
  brk: { named: string; takes: boolean } | null; whose: string;
  stopper: { who: 'your' | 'their'; named: string } | null; stem: number;
}): string {
  const owner = c.mine ? 'Your' : 'Their';
  // Two targets or more are named by piece: "from d8 it hits your queen on c8
  // and your rook on h1" read three squares in one sentence (humanSquares
  // gate, 2026-11-21). The board lights each target's square.
  const hit = andList(c.hits.length > 1 ? c.hits.map((h) => h.replace(/ on [a-h][1-8]$/, '')) : [...c.hits]);
  let head: string;
  if (c.brk && !c.brk.takes) head = rotateStem([`${owner} one resource is the pawn break ${c.brk.named}, hitting ${hit}.`, `${owner} counterplay is the push ${c.brk.named}, against ${hit}.`], c.stem);
  else if (c.brk) {
    const then = c.hits.length > 1 ? ` Then it hits ${andList(c.hits.slice(1))}.` : '';
    head = rotateStem([`${owner} one resource is the pawn break ${c.brk.named}, taking ${c.whose} pawn on ${c.to}.`, `${owner} counterplay is ${c.brk.named}: the pawn takes ${c.whose} pawn on ${c.to}.`], c.stem) + then;
  } else head = rotateStem([`${owner} ${c.piece} can come to ${c.to} and hit ${hit}.`, `${owner} resource is the ${c.piece}: from ${c.to} it hits ${hit}.`], c.stem);
  if (c.alive) return `${head} ${rotateStem(['It is coming: the best line plays it.', 'Nothing stops it in the best line.'], c.stem)}`;
  // A stopper that mates ends the game before the resource can count.
  return `${head} ${c.stopper ? (/#$/.test(c.stopper.named) ? `But ${c.stopper.who} ${c.stopper.named} mates first.` : `But ${c.stopper.who} ${c.stopper.named} stops it.`) : 'But the best line stops it.'}`;
}

// ── THE REPLY'S JOB (family A1: `replyJob` returns the job as data) ──────────

export type ReplyJobKind = 'recaptures' | 'steps-away' | 'guards' | 'blocks' | 'traps' | 'kicks' | 'contests' | 'counter' | 'heads-for';

/** What the reply does against a try, as data (`replyJob` reads it). */
export type ReplyJobData =
  | { kind: 'recaptures' } | { kind: 'steps-away' }
  | { kind: 'guards'; what: string; king: boolean }
  | { kind: 'blocks'; own: 'your' | 'their'; piece: string; what: string }
  | { kind: 'traps'; piece: string } | { kind: 'kicks'; piece: string }
  | { kind: 'contests'; line: string }
  | { kind: 'counter'; hit: string | null; mate: boolean; inReturn: boolean }
  | { kind: 'heads-for'; to: string; hit: string };

function replyJobClauses(j: ReplyJobData): string[] {
  switch (j.kind) {
    case 'recaptures': return ['simply takes back.', 'just recaptures.'];
    case 'steps-away': return ['steps out of the attack.', 'simply gets out of the way.'];
    case 'guards': return j.king ? [`holds ${j.what}.`, `defends ${j.what}.`] : [`guards ${j.what}.`, `covers ${j.what}.`];
    case 'blocks': return [`blocks ${j.own} ${j.piece}'s line to ${j.what}.`, `cuts ${j.own} ${j.piece} off from ${j.what}.`];
    case 'traps': return [`traps ${j.piece}: it has no safe square.`, `leaves ${j.piece} with nowhere to go.`];
    case 'kicks': return [`kicks ${j.piece} away.`, `hits ${j.piece} and sends it packing.`];
    case 'contests': return [`covers the ${j.line}.`, `contests the ${j.line}.`];
    case 'counter':
      if (j.mate) return j.inReturn ? ['threatens mate in return.', 'hits back with a mate threat.'] : ['threatens mate.', 'sets up a mate threat.'];
      return j.inReturn ? [`hits ${j.hit} in return.`, `counters by attacking ${j.hit}.`] : [`attacks ${j.hit}.`, `goes after ${j.hit}.`];
    case 'heads-for': return [`heads for ${j.to}, where it hits ${j.hit}.`, `is on its way to ${j.to}, to hit ${j.hit} from there.`];
  }
}

/** The reply's job: named by its move ("…Qd7 guards your pawn on b5."), and
 *  for a sentence that follows one naming the reply, by its piece ("The
 *  queen guards …"). */
export function renderReplyJob(j: ReplyJobData, reply: string, piece: string, stem: number): { text: string; follow: string } {
  const clause = rotateStem(replyJobClauses(j), stem);
  return { text: `${reply} ${clause}`, follow: `The ${piece} ${clause}` };
}

// ── THE ALARM, THE URGENCY AND THE CHECKS (family A1/A5) ────────────────────

/** Their threat that does not have to be met yet (`falseAlarm`): the
 *  question first, then the board's answer. */
export function renderFalseAlarm(a: { threat: string; detail: string; first: string; answer: { san: string; after: boolean } | null }): string {
  const tail = a.answer ? (a.answer.after ? `, and after ${a.threat}, ${a.answer.san} answers it` : `, and if they go ahead with ${a.threat}, ${a.answer.san} answers it`) : '';
  return `Their move threatens ${a.threat} — it ${a.detail}. Do you have to react? No — ${a.first} comes first${tail}.`;
}

/** What comes before any plan (`boardUrgency`), one part a sentence. */
export type UrgencyPart =
  | { kind: 'mate'; mates: readonly string[] }
  | { kind: 'win'; piece: string; square: string }
  | { kind: 'take-attacker'; piece: string; square: string; hits: string }
  | { kind: 'save'; named: string }
  | { kind: 'promotion'; from: string; to: string };

export function renderUrgency(u: UrgencyPart): string {
  switch (u.kind) {
    case 'mate': return `They threaten mate: ${orList([...u.mates])} ${u.mates.length === 1 ? 'is' : 'would be'} mate if you let it — stop that first.`;
    case 'win': return `First, you can take their ${u.piece} on ${u.square} — that comes before anything else.`;
    case 'take-attacker': return `First, take their ${u.piece} on ${u.square} — it attacks your ${u.hits}.`;
    case 'save': return `First, your ${u.named} can be taken — that comes before any plan.`;
    case 'promotion': return `Their pawn on ${u.from} is one step from promoting on ${u.to}.`;
  }
}

/** The defender's checks, run out (`checkRun`): the first check and how the
 *  run ends — the king walks out, or a piece blocks — never a score sheet. */
export function renderCheckRun(c: {
  piece: string; first: string; kingReply: string | null; checks: number; lastSq: string; answer: string;
  ends: 'king-walks' | 'takes' | 'blocks'; kingWalks: boolean; then: string | null; promo: string | null;
}): string {
  const ends = c.ends === 'king-walks' ? `your king walks out to ${c.lastSq}` : c.ends === 'takes' ? `you take with ${c.answer}` : `you block with ${c.answer}`;
  const run = c.checks <= 1
    ? `Their ${c.piece} checks with ${c.first}, and ${ends}.`
    : c.kingWalks
      ? `Their ${c.piece} starts checking with ${c.first}. Your king answers with ${c.kingReply ?? ''} and keeps walking — after ${c.checks} checks it is out on ${c.lastSq}.`
      : `Their ${c.piece} starts checking with ${c.first}. After ${c.checks} checks, ${ends} and the checks run out.`;
  return `${run}${c.then ? ` Then they play ${c.then}.` : ''}${c.promo ? ` ${c.promo}` : ''}`;
}

/** Checks that only repeat the position (`endgameVerdict`). */
export function renderChecksRepeat(seq: string, mine: boolean): string {
  return mine
    ? `Checking gets you nowhere here: ${seq} is the same position again. You need a new idea, not another check.`
    : `Their checks go round in circles: ${seq} is the same position again. They need a new idea to make progress.`;
}

// ── HOW A TRY LOSES MATERIAL (`tryLossMechanism`: whyItFailed's kinds) ──────

export type TryLoss =
  | { kind: 'lands-en-prise'; piece: string; taker: string }
  | { kind: 'guard-left'; piece: string; taker: string; lastGuard: boolean }
  | { kind: 'held'; square: string; taker: string }
  | { kind: 'left-hanging'; piece: string; taker: string };

/** The why of a try's material loss, the try as "It": what it puts where, or
 *  what it leaves. */
export function renderTryLoss(d: TryLoss): string {
  switch (d.kind) {
    case 'lands-en-prise': return `It puts ${d.piece} where ${d.taker} takes it.`;
    case 'guard-left': return d.lastGuard ? `It takes the last guard off ${d.piece}, and ${d.taker} takes it.` : `It loosens the guard on ${d.piece}, and ${d.taker} wins it.`;
    case 'held': return `It takes on ${d.square}, but ${d.taker} takes back.`;
    case 'left-hanging': return `It does nothing for ${d.piece}, which ${d.taker} still takes.`;
  }
}

/** WHAT THE TEMPTING MOVE IS COUNTING ON, as the lead of its refutation
 *  (`temptingHope.countingOn`): "Bxd1 is counting on Kxd1, but it fails". */
export function renderCountingOnLead(trySan: string, hoped: string, mine: boolean, stem: number): string {
  return mine
    ? rotateStem([`${trySan} is counting on ${hoped}, but it fails`, `${trySan} hopes for ${hoped}, but it doesn't work`], stem)
    : rotateStem([`${trySan} was counting on ${hoped} for them, but it fails`, `With ${trySan} they hoped for ${hoped}, but it doesn't work`], stem);
}

/** WHY THE REFUTATION IS EASY TO MISS (`temptingHope.easyToMiss`), the
 *  refuting move named. */
export function renderEasyToMiss(shape: 'quiet' | 'retreat', refutation: string, stem: number): string {
  return shape === 'quiet'
    ? rotateStem([`${refutation} is easy to miss: it's a quiet move, not a capture or a check.`, `${refutation} is the move that's easy to overlook, because it takes nothing and gives no check.`], stem)
    : rotateStem([`${refutation} is easy to miss, because it's a move backward.`, `${refutation} is easy to overlook: the piece steps back instead of forward.`], stem);
}

/** WHY THE PLAN'S AIM IS A TARGET (David 2026-11-19: "why does it want to be
 *  on that line?"), from the planner's seat: the pawn's weakness, then the
 *  count — said only when more pieces hit it than guard it AND the exchange
 *  there wins it (three rooks against a knight a pawn guards win nothing).
 *  Leading space included; empty when there is nothing to say. */
export function renderAimWhy(w: { weak: 'isolated' | 'backward' | 'doubled' | 'no-pawn-guard' | null; hits: number; guards: number; wins: boolean } | null, whose: 'your' | 'their'): string {
  if (!w) return '';
  const weak = w.weak === 'isolated' ? ' It is isolated, so no pawn can ever guard it.'
    : w.weak === 'backward' ? ' It is backward: the pawns beside it have moved on and can no longer guard it.'
      : w.weak === 'doubled' ? ' It is a doubled pawn, and the pawn in front of it cannot guard it.'
        : w.weak === 'no-pawn-guard' ? ' No pawn guards it, so only pieces can.' : '';
  const theirs = whose === 'your' ? 'theirs' : 'yours';
  const count = w.hits > w.guards && w.wins
    ? ` ${openSentence(countOf(w.hits))} of ${whose} pieces hit it, and only ${countOf(w.guards)} of ${theirs} guard${w.guards === 1 ? 's' : ''} it.`
    : '';
  return `${weak}${count}`;
}

/** THE PLAN WITHOUT ITS MOVES — Learn's held form (LEARN NAMES NO MOVE
 *  UNASKED, carve-out 4): the piece and what it aims at, never the road, so
 *  the student still finds the moves. Null with nothing to point at. */
export function renderPlanHeld(h: { piece: string | null; from: string | null; aim: string | null; aimPiece: string | null; why: string }): string | null {
  const target = h.aim ? (h.aimPiece ? `their ${h.aimPiece} on ${h.aim}` : `${h.aim}, next to their king`) : null;
  if (h.piece && h.from) return `Your ${h.piece} on ${h.from} has a better square${target ? `, one aimed at ${target}` : ''}.${h.why}`;
  if (!target) return null;
  return `Your pieces have a target: ${target}.${h.why}`;
}

/** ONE MOVE HEAD A TURN (prod Review 2026-11-21: "fxe5 is a pawn break … You
 *  played fxe5 — it stops …Bb4", "You played Qe2+ — it stops …c5 … Your Qe2+
 *  takes the open e-file"): the move is named once a turn; a later sentence
 *  that leads with it again says "it". Only a sentence HEAD — a move named
 *  inside a sentence ("Bxb7+ was stronger than …") keeps its name. */
export function oneMoveHead(text: string, san: string): string {
  const bare = san.replace(/^…/, '').replace(/[+#!?]+$/, '');
  if (bare.length < 2) return text;
  const esc = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const move = `…?${esc}[+#]?`;
  const heads: Array<[RegExp, string]> = [
    [new RegExp(`^(?:You|They) (?:played|play|went for|go) ${move}(?: — it |, which | — |: it )`), 'It also '],
    [new RegExp(`^(?:Your|Their) ${move} `), 'It '],
    [new RegExp(`^${move}(?=:? )(?::)? `), 'It '],
    // "You play axb5: once they take back…" after axb5 was named: the head
    // goes, the rest stands ("Once they take back…").
    [new RegExp(`^(?:You|They) (?:played|play|went for|go) ${move}: `), ''],
    // "exd5, not Qxd5, which would…" after exd5 was named: "Not Qxd5, …".
    [new RegExp(`^${move}, not `), 'Not '],
  ];
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z…a-h])/);
  let named = false;
  return sentences.map((s) => {
    const headed = heads.find(([re]) => re.test(s));
    if (!headed) {
      if (new RegExp(`(?:^|[\\s(])${move}(?=[\\s,.:;—)]|$)`).test(s)) named = true;
      return s;
    }
    if (!named) { named = true; return s; }
    const [re, it] = headed;
    const out = s.replace(re, it);
    return it === '' ? out.charAt(0).toUpperCase() + out.slice(1) : out;
  }).join(' ');
}

/** THE GAME LEFT THE ASKED LINE (`askedLineDeparture`): said once, with where
 *  and what the line plays there. The student's own move is never named in
 *  Learn ("your move"); theirs is. Rotated on the departure ply. */
export function renderAskedLineLeft(d: { name: string; seat: 'student' | 'opponent'; played: string; book: string; moveNumber: number; ply: number }): string {
  return d.seat === 'student'
    ? rotateStem([
      `Your move leaves the ${d.name} on move ${d.moveNumber}. The line plays ${d.book} there.`,
      `With your move the game is out of the ${d.name} on move ${d.moveNumber}. Its line goes ${d.book} there.`,
    ], d.ply)
    : rotateStem([
      `They leave the ${d.name} on move ${d.moveNumber} with ${d.played}. The line plays ${d.book} there.`,
      `${d.played} takes the game out of the ${d.name} on move ${d.moveNumber}. Its line goes ${d.book} there.`,
    ], d.ply);
}

/** What a plan's break is for: the pawn it hits ("The break goes at your
 *  pawn on c4."). `owner` is the side the break hits, from the student's seat. */
export function renderBreakHits(owner: 'your' | 'their', square: string): string {
  return `The break goes at ${owner} pawn on ${square}.`;
}

/** A count said in words, only where the attackers outnumber the guards
 *  ("two attack it and only one guards it"). */
export function renderTally(atk: number, def: number): string {
  const a = `${countWord(atk)} ${atk === 1 ? 'attacks' : 'attack'} it`;
  return def === 0 ? `${a} and nothing guards it` : `${a} and only ${countWord(def)} ${def === 1 ? 'guards' : 'guard'} it`;
}
