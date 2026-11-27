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
import { DEFENDER_RULE_TECHNIQUE, type DefenderRuleId } from './endgameDefenderRules';
import { CAPTURE_VALUE } from './pieceValues';
import { Chess, type Square } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';
import { andList, orList, countWord, withArticle } from '../utils/andList';
import { openSentence, continueSentence } from '../utils/openSentence';
import { evalBandWords, type EvalBand } from './evalBand';
import type { MistakeCauseKind } from './mistakeCause';
import type { MisconceptionTagId } from '../data/misconceptionTags';

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
  // No computed reason: the group says what the line costs, as one try does
  // ("they win a pawn in the line") — the grouping key holds it shared.
  const cost = !why && shared.material && !shared.mates ? ` ${cap(shared.mine ? 'they' : 'you')} win ${shared.material} in the line.` : '';
  return [`${andList([...sans])} ${two ? 'both' : 'all'} fail the same way: ${orList([...replies])} meets ${each}.${cost}`, renderTryReason({ ...shared, why })].filter(Boolean).join(' ');
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

/** THE STANDING'S EVIDENCE REASONS (2026-11-26) — the data each computer
 *  hands over, worded here once. Seat words come in already chosen: `own` is
 *  the side the reason favours ("your" / "their"), `foe` the other. */
export type StandingReasonData =
  | { kind: 'trapped'; foe: 'your' | 'their'; piece: string; square: string }
  | { kind: 'mating-net'; own: 'your' | 'their'; foe: 'your' | 'their'; king: string; attackers: number }
  | { kind: 'unstoppable-square'; own: 'your' | 'their'; foe: 'your' | 'their'; pawn: string; king: string }
  | { kind: 'unstoppable-line'; own: 'your' | 'their'; pawn: string; queens: boolean }
  | { kind: 'tempo'; foe: 'your' | 'their'; queen: string }
  | { kind: 'clamp'; own: 'your' | 'their'; foe: 'your' | 'their'; pawns: readonly string[]; wing: 'kingside' | 'queenside'; squares: number }
  | { kind: 'line-wins'; who: 'you' | 'they'; points: number }
  | { kind: 'even'; pawns: number; middlegame: boolean };

/** A standing reason as a clause after the verdict and as its own sentence. */
export function renderStandingReason(d: StandingReasonData): { clause: string; sentence: string } {
  const both = (clause: string, tail = ''): { clause: string; sentence: string } => ({ clause, sentence: `${openSentence(clause)}${tail}.` });
  switch (d.kind) {
    case 'trapped': return both(`${d.foe} ${d.piece} on ${d.square} is trapped: every square it has loses it`);
    case 'mating-net': return both(`${d.foe} king on ${d.king} has no square to step to, and ${countWord(d.attackers)} of ${d.own} pieces bear on it`);
    case 'unstoppable-square': return both(`${d.own} pawn on ${d.pawn} cannot be caught: ${d.foe} king on ${d.king} is outside its square`);
    case 'unstoppable-line': return both(`${d.own} passed pawn on ${d.pawn} goes through: the best line ${d.queens ? 'queens' : 'promotes'} it`);
    case 'tempo': return both(`${d.foe} queen on ${d.queen} can be hit with tempo`, ': it has to move again');
    case 'clamp': return both(`${d.own} pawns on ${andList([...d.pawns])} clamp ${d.foe} ${d.wing}, taking ${countWord(d.squares)} squares in front of ${d.foe} king`);
    case 'line-wins': {
      const g = d.points;
      const words = g === 1 ? 'a pawn' : g === 2 ? 'two pawns' : g <= 4 ? 'a piece' : g <= 7 ? "a rook's worth" : "a queen's worth";
      return both(`${d.who} win ${words} in the best line`);
    }
    case 'even': {
      const pawnWords = d.pawns === 0 ? 'no pawns left' : `${countWord(d.pawns)} pawn${d.pawns === 1 ? '' : 's'} each`;
      return both(d.middlegame ? `material is level, ${pawnWords}, and both kings keep their pawn cover` : `material is level, with ${pawnWords} and the same pieces`);
    }
  }
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
export function oneMoveHead(text: string, san: string | undefined): string {
  if (!san) return text;
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
    return it === '' ? openSentence(out) : out;
  }).join(' ');
}

/** THE GAME LEFT THE ASKED LINE, AND IT HURT (`openingDetectionService.
 *  askedLineLeft`): said once, with what the line's move does that the
 *  student's does not. The student's own move is never named ("your move");
 *  `job` is the book move's job ("it keeps their knight off b5"), `left` what
 *  the student's move left undone. Rotated on the departure ply. */
export function renderAskedLineLeft(d: { name: string; book: string; job: string; left: string | null; moveNumber: number; ply: number }): string {
  const job = d.job.replace(/ — /g, ': ').replace(/^it /, '');
  const left = d.left ? ` Your move ${d.left}.` : '';
  return rotateStem([
    `Your move leaves the ${d.name} on move ${d.moveNumber}, and it costs you. The line plays ${d.book} there: it ${job}.${left}`,
    `Leaving the ${d.name} on move ${d.moveNumber} costs you here. Its move was ${d.book}, which ${job}.${left}`,
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

/** THE FORK A MOVE WALKED INTO (`whyItFailed` walks-into-fork): their piece
 *  lands on `square` and hits every target at once. */
export function renderWalkedIntoFork(f: { forker: string; square: string; targets: readonly string[] }): string {
  const list = f.targets.length > 1 ? `${f.targets.slice(0, -1).join(', ')} and ${f.targets[f.targets.length - 1]}` : f.targets[0];
  return `That let their ${f.forker} in on ${f.square}, where it hits ${list} at once.`;
}

// ══ THE MISTAKE LESSON (WO-LEARN-MISTAKES-ONLY) ═══════════════════════════
// The phrasing tables and the slot renderer for `mistakeLesson` (selection,
// record gate, silent_why and the audit row live there). Every stem: 5
// phrasings, ≤14 words, no move, rotated on the board (mistakeLesson.test).
// Written in the MOVER's voice; `seatWords` turns it for the other seat.

export type LessonSlot = 'lesson' | 'consequence' | 'better' | 'repair' | 'habit';
export const LESSON_SLOTS: readonly LessonSlot[] = ['lesson', 'consequence', 'better', 'repair', 'habit'];

/** The fields a stem may name — each read from a computed value (`fillsFor`). */
export type FillKey =
  | 'piece' | 'sq'           // the piece the move moved, where it stands now
  | 'tPiece' | 'target'      // the piece the mechanism is about (failedSquares[0] / lostSquare)
  | 'opPiece' | 'opSq'       // the piece that refutes it (failedSquares[1]: guard, taker, attacker)
  | 'king'                   // the mover's king
  | 'checkPiece' | 'checkSq' // their first check in the reply line (mover's seat only)
  | 'what'                   // the material the line wins, in words
  | 'motif'                  // the tactic, with its article ("a fork")
  | 'colour' | 'pawn' | 'n' | 'file'
  | 'down'                   // a deficit in pawns, in words (compensation)
  | 'cap'                    // the piece the better move takes
  | 'a' | 'b'                // a fork's two targets
  | 'theirMove'              // their reply once played, in words
  | 'gives' | 'victim'       // the good decision's fields
  | 'answer'                 // how an empty check was met
  | 'trapped';               // the better move traps their queen (a flag)

export interface SlotRecipe {
  /** Every field the stems name; one missing → the slot is silent. */
  needs: readonly FillKey[];
  stems: readonly string[];
}

export interface LessonRecipe {
  lesson: SlotRecipe | null;
  consequence: SlotRecipe | null;
  habit: SlotRecipe | null;
  /** The habit family the AMBER clause comes from. */
  family: HabitFamily;
  /** The repair states this cause leaves, tried before the ledger's own. */
  repairs: readonly RepairState[];
}

export const S = (needs: readonly FillKey[], stems: readonly string[]): SlotRecipe => ({ needs, stems });

// ── the habit families (AMBER: one short clause) ───────────────────────────
/** The slot fields a mistake stem may name (filled by `mistakeLesson.fillsFor`). */
export type Fills = Partial<Record<FillKey, string>>;

export type HabitFamily = 'checks' | 'captures' | 'loose' | 'tactics' | 'threats' | 'structure' | 'endgame' | 'tempo' | 'plan';
export const HABIT_SHORT: Record<HabitFamily, readonly string[]> = {
  checks: ['Checks first.', 'Look at their checks.', 'Count the checks first.', 'Their checks, every move.', 'First, every check they have.'],
  captures: ['Count who takes back.', 'Recaptures first.', 'Count the recapture.', 'Who takes back?', 'Count the trade first.'],
  loose: ['Check for loose pieces.', 'Anything loose?', 'Guard where it lands.', 'Look for loose pieces.', 'Is it guarded there?'],
  tactics: ['Look for their tactic.', 'Watch for the trick.', 'What can they hit at once?', 'Check two-piece hits.', 'Scan for their shot.'],
  threats: ['What does their move threaten?', 'Read their last move.', 'Threats first.', 'Ask what they attack.', 'Answer their threat first.'],
  structure: ['Mind the pawns left behind.', 'Look at the pawns after.', 'Pawns decide the long game.', 'Check what the trade leaves.', 'Watch the structure.'],
  endgame: ['Rule first, then moves.', 'Play the ending by its rule.', 'Method before calculation.', 'Know the ending\'s rule.', 'Endings: method first.'],
  tempo: ['Make every move count.', 'Does it force anything?', 'No moves they can ignore.', 'Every move needs a job.', 'Ask what it makes them do.'],
  plan: ['Ask what the position wants.', 'Improve your worst piece.', 'Find the plan first.', 'What does each piece need?', 'Look for the plan.'],
};

// ── the repair states (the plan to live with what the mistake left) ────────
export type RepairState =
  | 'colour-conceded' | 'colour-won'
  | 'weak-pawn' | 'weak-pawn-theirs'
  | 'passer-against' | 'passer-mine'
  | 'down-queen' | 'down-piece-middlegame' | 'down-piece-endgame' | 'down-exchange' | 'down-pawn-middlegame' | 'down-pawn-endgame'
  | 'up-material'
  | 'king-exposed'
  | 'initiative-lost' | 'initiative-won'
  | 'technique-key-square' | 'technique-opposition' | 'technique-rook'
  | 'leave-a-square'
  | 'attack-their-king'
  | 'down-material-queens-off'
  // THE BOARD STATES (2026-11-26, the recovery checks round): what to do
  // after a mistake when the board — not the material — is the problem.
  | 'king-in-centre' | 'behind-in-development' | 'piece-trapped' | 'pinned-piece' | 'pawn-lever' | 'loose-pieces'
  // The plan computer's plan, when no state above applies (`planRepair`).
  | 'plan';

export interface RepairRecipe {
  needs: readonly FillKey[];
  stems: readonly string[];
  /** Sources the principle rests on (recovery/<state>.md). */
  sources: readonly string[];
}

/** Every repair, worded to the STUDENT (never swapped). The check that it
 *  applies on this board is `repairApplies`. */
export const REPAIRS: Record<RepairState, RepairRecipe> = {
  // Worded by the plan computer (`structurePlanWords`); never rendered from here.
  plan: { needs: [], stems: [], sources: ['concept:pos-activity', 'https://en.wikipedia.org/wiki/Chess_strategy'] },
  'king-in-centre': {
    needs: ['target'],
    stems: [
      'Your king on {target} is still in the middle: tuck it away first.',
      'Get your king off {target} and castled before the lines open.',
      'The king on {target} is your first worry: castle it to safety.',
      'With your king still on {target}, safety comes first: castle soon.',
      'Bring the king on {target} to safety before you go after anything.',
    ],
    sources: ['Library: Capablanca cf-31', 'concept:pos-king-safety', 'https://www.chess.com/article/view/king-safety'],
  },
  'behind-in-development': {
    needs: ['tPiece', 'target'],
    stems: [
      'You are behind in development: bring out the {tPiece} on {target} first.',
      'Develop before you attack: your {tPiece} on {target} is still at home.',
      'Get the {tPiece} on {target} into play. They have more pieces out.',
      'First catch up: the {tPiece} on {target} has not moved yet.',
      'Your {tPiece} on {target} is still asleep: develop it before anything else.',
    ],
    sources: ['Library: Capablanca cf-6', 'concept:pos-development', 'https://www.chess.com/article/view/chess-opening-principles'],
  },
  'piece-trapped': {
    needs: ['tPiece', 'target'],
    stems: [
      'Your {tPiece} on {target} is trapped: get the most you can for it.',
      'The {tPiece} on {target} has no safe square. Make them pay for it.',
      'Your {tPiece} on {target} cannot escape: take something with it if you can.',
      'Before the trapped {tPiece} on {target} falls, sell it for the most material.',
      'No square saves the {tPiece} on {target}: cash it in now.',
    ],
    sources: ['concept:tac-trap', 'https://www.chess.com/terms/trapped-piece-chess'],
  },
  'pinned-piece': {
    needs: ['tPiece', 'target', 'opPiece', 'opSq'],
    stems: [
      'Break the pin: their {opPiece} on {opSq} pins your {tPiece} on {target}.',
      'The {opPiece} on {opSq} pins your {tPiece} on {target}: add a guard.',
      'Unpin first: the {opPiece} on {opSq} holds your {tPiece} on {target}.',
      'The {tPiece} on {target} cannot move freely while the {opPiece} on {opSq} pins it.',
      'Guard the pinned {tPiece} on {target}, then break the line from {opSq}.',
    ],
    sources: ['concept:tac-pin', 'https://www.chess.com/terms/pin-chess'],
  },
  'pawn-lever': {
    needs: ['pawn'],
    stems: [
      'Their pawn on {pawn} cramps you: strike at it with a pawn.',
      'Hit back at the pawn on {pawn} with one of your pawns.',
      'The pawn on {pawn} takes your space; challenge it with a pawn break.',
      'Undermine the pawn on {pawn}: a pawn of yours can attack it.',
      'Answer the pawn on {pawn} with a pawn break before it cramps you more.',
    ],
    sources: ['Library: Nimzowitsch ms-70', 'https://www.chess.com/article/view/pawn-breaks'],
  },
  'loose-pieces': {
    needs: ['a', 'b'],
    stems: [
      'Your {a} and {b} have no guard: give each a defender.',
      'Two loose pieces, the {a} and the {b}: tie them together.',
      'Nothing guards your {a} or your {b}. Fix that before it costs you.',
      'Guard the {a} and the {b}: loose pieces drop off.',
      'Your {a} and {b} stand unprotected: cover them first.',
    ],
    sources: ['https://www.chess.com/article/view/loose-pieces-drop-off'],
  },
  'colour-conceded': {
    needs: ['colour'],
    stems: [
      'Put your pawns on {colour} squares to help regain control of the {colour} squares.',
      'Your pawns must guard the {colour} squares now that the bishop is gone.',
      'Let your pawns do the bishop\'s work: set them on {colour} squares.',
      'Pawns on {colour} squares can cover what the missing bishop used to.',
      'Fill the gap with pawns: stand them on the {colour} squares.',
    ],
    sources: ['Library: Capablanca cf-12', 'Library: Nimzowitsch ms-70', 'https://www.chess.com/article/view/the-weak-dark-square-complex'],
  },
  'colour-won': {
    needs: ['colour'],
    stems: [
      'Their {colour} squares are weak now: aim your pieces at them.',
      'Nothing of theirs guards the {colour} squares any more. Move in there.',
      'Plant a piece on a {colour} square. They can never chase it.',
      'Use the {colour} squares they gave up: put your pieces there.',
      'With that bishop gone, the {colour} squares are yours to take.',
    ],
    sources: ['Library: Nimzowitsch ms-70', 'https://www.chessprogramming.org/Color_Weakness'],
  },
  'weak-pawn': {
    needs: ['pawn'],
    stems: [
      'Keep a piece close to the pawn on {pawn} so it holds.',
      'Guard the pawn on {pawn} with pieces, and trade off what attacks it.',
      'Look after the pawn on {pawn}: one defender for every attacker.',
      'Make the pawn on {pawn} hard to win: defend it and keep pieces active.',
      'Defend {pawn} with pieces, then push it to trade it off.',
    ],
    sources: ['Library: Nimzowitsch ms-12', 'concept:pos-weak-pawns', 'https://www.chess.com/article/view/weak-pawns'],
  },
  'weak-pawn-theirs': {
    needs: [],
    stems: [
      'Pile up on their weak pawn: attack it more than it\'s defended.',
      'Their weak pawn is the target now. Aim your pieces at it.',
      'Fix the weak pawn in place first, then win it.',
      'Put a piece in front of the weak pawn and bring more attackers.',
      'Keep your pieces on the weak pawn. It can\'t move out of the way.',
    ],
    sources: ['Library: Nimzowitsch ms-12', 'concept:pos-weak-pawns'],
  },
  'passer-against': {
    needs: ['pawn'],
    stems: [
      'Put a piece in front of the pawn on {pawn}. A knight blocks best.',
      'Blockade the passed pawn on {pawn} before it runs.',
      'Stop {pawn} first: a piece on the square in front of it.',
      'A passed pawn must be held: get a piece in front of {pawn}.',
      'Bring your king or a knight in front of the pawn on {pawn}.',
    ],
    sources: ['Library: Nimzowitsch ms-21 (blockade)', 'concept:end-passed-pawn', 'https://www.chess.com/terms/passed-pawn-chess'],
  },
  'passer-mine': {
    needs: [],
    stems: [
      'Push your passed pawn while its road is safe.',
      'Your passed pawn is free now: support it forward.',
      'Get a rook behind the passed pawn and walk it up.',
      'Your free pawn has a clear road. Use it.',
      'Back the passed pawn with pieces and push it.',
    ],
    sources: ['Library: Nimzowitsch ms-21', 'concept:end-passed-pawn'],
  },
  'down-queen': {
    needs: [],
    stems: [
      'Without the queen, keep every piece guarded and look for checks.',
      'A queen down, hunt for perpetual check and leave nothing loose.',
      'Down the queen, keep your pieces together and look for checks.',
      'Lost the queen? Guard everything, and keep checking their king.',
      'With the queen gone, make a wall: pieces guarded, pawns linked.',
    ],
    sources: ['https://en.wikipedia.org/wiki/Fortress_(chess)', 'concept:end-perpetual-check'],
  },
  'down-piece-middlegame': {
    needs: [],
    stems: [
      'Down material, keep the queens on and make it messy.',
      'Behind in material, avoid trades and go after their king.',
      'Material down, every trade helps them, so keep pieces on.',
      'Behind on material, play for an attack, not for trades.',
      'Short of material, keep it complicated and keep pieces on.',
    ],
    sources: ['Library: Capablanca cf-31', 'https://www.chess.com/article/view/how-to-play-when-you-are-down-material'],
  },
  'down-piece-endgame': {
    needs: [],
    stems: [
      'Down material in the ending, trade their pawns and keep yours.',
      'Behind in the ending, every pawn traded brings the draw closer.',
      'Material down late on, trade pawns: no pawns, no win.',
      'In a lost-looking ending, swap off their pawns one by one.',
      'Behind in material, make their last pawns disappear.',
    ],
    sources: ['Library: Capablanca cf-14', 'https://www.chess.com/article/view/drawing-techniques'],
  },
  'down-exchange': {
    needs: [],
    stems: [
      'Down the exchange, make your minor piece stronger than their rook.',
      'A rook for a minor piece: keep files closed and the minor busy.',
      'Behind the exchange, keep lines shut so their rook has nowhere to go.',
      'Give your minor piece a strong square and keep the files closed.',
      'Down the exchange, a pawn more and a great minor can hold.',
    ],
    sources: ['Library: Nimzowitsch ms-40', 'https://www.chess.com/article/view/the-exchange-sacrifice'],
  },
  'down-pawn-middlegame': {
    needs: [],
    stems: [
      'A pawn down, stay active: every piece should have a job.',
      'Behind by a pawn, play for activity and keep the pressure on.',
      'A pawn short, make your pieces count more than theirs.',
      'Down a pawn, keep pieces busy and look for counterplay.',
      'One pawn behind, active pieces make up for it.',
    ],
    sources: ['Library: Capablanca cf-31', 'concept:pos-activity'],
  },
  'down-pawn-endgame': {
    needs: [],
    stems: [
      'A pawn down in the ending, trade pawns, not pieces.',
      'Behind by a pawn late on, swap pawns off and keep your rook active.',
      'In the ending a pawn down, fewer pawns means more drawing chances.',
      'A pawn short in the endgame, trade pawns and activate your king.',
      'Down a pawn in the ending, aim for a rook ending and trade pawns.',
    ],
    sources: ['Library: Capablanca cf-14', 'https://www.chess.com/article/view/rook-endgames'],
  },
  'up-material': {
    needs: [],
    stems: [
      'You\'re ahead now: trade pieces, not pawns.',
      'Ahead in material, simplify: every trade brings the win closer.',
      'With more material, swap pieces and keep your pawns.',
      'You have the extra material: trade down and keep it simple.',
      'Ahead, offer trades of pieces and stop their counterplay first.',
    ],
    sources: ['Library: Capablanca cf-14', 'https://www.chess.com/article/view/how-to-convert-a-winning-position'],
  },
  'king-exposed': {
    needs: [],
    stems: [
      'With your king open, trade queens and keep defenders close.',
      'An open king wants the queens off and pieces nearby.',
      'Keep defenders near your king and offer the queen trade.',
      'Your king is bare: bring pieces back and don\'t push more pawns there.',
      'Guard the open king first: defenders home, queens off if you can.',
    ],
    sources: ['Library: Capablanca cf-31', 'concept:pos-king-safety', 'https://www.chess.com/article/view/king-safety'],
  },
  'initiative-lost': {
    needs: [],
    stems: [
      'Answer their threats first, then bring your pieces back into play.',
      'Meet the threat, then improve a piece before you strike back.',
      'They have the initiative: defend calmly, then hit back when it ends.',
      'Stop their threat first, then make your own.',
      'Defend with moves that also improve a piece.',
    ],
    sources: ['concept:pos-tempo', 'https://www.chess.com/article/view/the-initiative-in-chess'],
  },
  'initiative-won': {
    needs: [],
    stems: [
      'A free move is best spent on a threat.',
      'You have the time now. Bring a piece into the attack.',
      'Use the tempo they handed you to improve your worst piece.',
      'A free move is a gift: make it count with a threat.',
      'Take the initiative they gave away: keep asking questions.',
    ],
    sources: ['concept:pos-tempo', 'https://www.chess.com/article/view/the-initiative-in-chess'],
  },
  'technique-key-square': {
    needs: ['pawn'],
    stems: [
      'Get your king onto a key square in front of the pawn on {pawn}.',
      'In king and pawn endings, the king leads: in front of {pawn}.',
      'Your king belongs ahead of the pawn on {pawn}, not behind it.',
      'March the king up in front of {pawn}. The pawn follows.',
      'The king on a key square wins it: aim it in front of {pawn}.',
    ],
    sources: ['Library: Capablanca cf-3', 'https://en.wikipedia.org/wiki/King_and_pawn_versus_king_endgame'],
  },
  'technique-opposition': {
    needs: [],
    stems: [
      'Face their king with one square between, and make them give way.',
      'Take the opposition: kings facing, one square apart, them to move.',
      'Stand opposite their king so it must step aside.',
      'Kings face to face with one square between: the other must yield.',
      'Win the opposition back and their king has to retreat.',
    ],
    sources: ['Library: Capablanca cf-3', 'https://en.wikipedia.org/wiki/Opposition_(chess)'],
  },
  'technique-rook': {
    needs: ['pawn'],
    stems: [
      'Get your rook back behind the passed pawn on {pawn}.',
      'Rooks belong behind passed pawns: put yours behind {pawn}.',
      'From behind {pawn} the rook pushes it. In front it only blocks.',
      'Bring the rook behind the pawn on {pawn} and keep it active.',
      'Rook behind the passer on {pawn}: that is where it works.',
    ],
    sources: ['Library: Capablanca cf-14 (Tarrasch rule)', 'https://www.chess.com/article/view/rook-endgames'],
  },
  'down-material-queens-off': {
    needs: [],
    stems: [
      'Queens are off and you\'re down material: keep the other pieces on.',
      'Behind with the queens gone, don\'t trade: every swap helps them.',
      'Down material without queens, keep the position tense and pieces on.',
      'With queens traded and material down, go after their pawns, not trades.',
      'Short of material with no queens, make it messy and keep pieces.',
    ],
    sources: ['https://www.chess.com/blog/attilaturzo/6-strategies-to-save-bad-positions', 'https://www.dummies.com/article/home-auto-hobbies/games/board-games/chess/examining-the-material-element-in-chess-200397/'],
  },
  'attack-their-king': {
    needs: [],
    stems: [
      'Their king is open now: start with every check you have.',
      'Go after the bare king: checks first, then bring more pieces.',
      'Their king has no cover. Look at each check before anything else.',
      'An open king is the target: bring pieces and check.',
      'Their shield is gone, so attack the king with everything.',
    ],
    sources: ['concept:pos-king-safety', 'Library: Capablanca cf-31'],
  },
  'leave-a-square': {
    needs: [],
    stems: [
      'You\'re winning: leave their king a square on every move.',
      'Ahead, always give their king somewhere to go.',
      'Keep their king a legal move until you can mate it.',
      'Before each move, make sure their king can still step.',
      'Win it with mate, not by leaving their king no moves.',
    ],
    sources: ['concept:end-stalemate', 'https://en.wikipedia.org/wiki/Stalemate'],
  },
};

// ── the recipes ────────────────────────────────────────────────────────────
export const HABIT = {
  checks: S([], ['Every move, look at every check they could give.', 'Before you let go, count their checks.', 'Their checks first, every single move.', 'Look for their checks before you look for your plan.', 'Ask each move: what checks do they have?']),
  myChecks: S([], ['Checks first, every move.', 'Every time, look at your checks before anything else.', 'Start with checks, then captures, then threats.', 'Look at every check you have before a quiet move.', 'Before a quiet move, try every check in your head.']),
  recapture: S([], ['Before every capture, ask what takes back.', 'Count the recaptures before you take.', 'Every capture: who takes back, and what\'s left?', 'Before you take, count attackers and defenders.', 'Take only after you have counted the trade.']),
  guards: S([], ['Count attackers and defenders before you attack.', 'Before you aim at a piece, count its guards.', 'Attackers against defenders, every time.', 'Count the guards before you call it a threat.', 'Ask what defends it before you go after it.']),
  checkGrab: S([], ['Before a grab, look at their checks.', 'Check their checks before you take anything.', 'Before you capture, ask whether they have a check that hits back.', 'Look for a check that wins the piece back.', 'A grab waits until their checks are counted.']),
  landing: S([], ['Before you let go, ask whether the piece is guarded where it lands.', 'Every move, check the landing square: who covers it?', 'Look where the piece is going, and who guards it there.', 'Is the new square guarded? Ask before you move.', 'Count the guards on the square you move to.']),
  job: S([], ['Before a piece moves, ask what it is guarding.', 'What does this piece protect? Ask before it leaves.', 'Check a piece\'s job before you move it.', 'Every piece guards something: know what before it moves.', 'Ask what falls if this piece walks away.']),
  forkSquares: S([], ['Look at the squares your pieces guard, not just the pieces.', 'Before you move, check which squares go unguarded.', 'Watch the squares as well as the pieces.', 'Ask which squares this move stops guarding.', 'Guard the squares their knight wants.']),
  knight: S([], ['After your move, check every square their knight can reach.', 'Where can their knight jump next? Look before you let go.', 'Count the knight\'s squares before you put two pieces near it.', 'Check if one jump hits two of your pieces.', 'Before you move, trace their knight\'s next jumps.']),
  captures: S([], ['Before you let go, scan their captures.', 'Every move, ask what they can take.', 'Look at their captures first.', 'List everything they could take after your move.', 'Ask what of yours is loose after this move.']),
  threats: S([], ['Before you move, ask which of your pieces their reply would attack.', 'Before you let go, list the pieces of yours they could hit next.', 'Every move, ask: what can they attack after this?', 'Ask which piece of yours their best reply goes after.', 'Picture their strongest reply and the piece it hits.']),
  readTheirs: S([], ['After every move of theirs, ask what it attacks.', 'Their move first: what does it threaten?', 'Before your plan, read their last move.', 'Read the threat in their move before your own idea.', 'Ask what their last move wants.']),
  shield: S([], ['Count their checks before you open your king.', 'Before you move a pawn near your king, count their checks.', 'Every pawn move near your king, ask who gets in.', 'Keep the king\'s pawns until you know it is safe.', 'Ask who comes in before you open your king.']),
  forcing: S([], ['Every move, look at checks, captures and threats first.', 'Checks, captures, threats: every time.', 'Before a quiet move, look for the forcing ones.', 'Look for a forcing move before you settle for a quiet one.', 'First ask what you can force.']),
  trade: S([], ['Before you trade, look at the pawns that are left.', 'What does the trade do to your pawns? Ask first.', 'Count the weak pawns after the trade, not just the material.', 'Picture the pawns after the trade before you make it.', 'A trade leaves a structure: check it first.']),
  bishop: S([], ['Before you trade a bishop, ask which colour you\'re giving away.', 'Which squares does this bishop hold? Ask before you trade it.', 'Trade a bishop only when you know whose squares those become.', 'Count the pawns on its colour before you trade a bishop.', 'Ask who rules that colour once the bishop is gone.']),
  passer: S([], ['Before you trade pawns, ask whether one of theirs comes out free.', 'Watch for a pawn of theirs with an open road.', 'Every pawn trade, check what it leaves free.', 'Ask if your move frees one of their pawns.', 'Look for their pawn that nothing can stop.']),
  sac: S([], ['After a sacrifice, ask every move whether this keeps them busy.', 'Down material, every move must threaten something.', 'After a sacrifice, never give them a quiet move.', 'A sacrifice pays only while you keep forcing.', 'Keep the pressure on until the material comes back.']),
  stalemate: S([], ['When they have only the king, check its moves before every move.', 'Every move against a bare king, count its squares.', 'Before you move, make sure their king can still move.', 'Count their king\'s legal moves before each of yours.', 'In a won ending, ask: can their king still move?']),
  method: S([], ['In the ending, play the rule before you calculate.', 'Know the rule of the ending first.', 'Endings: method first, then moves.', 'Ask which rule this ending follows before you move.', 'Find the ending\'s rule, then the move that keeps it.']),
  tempo: S([], ['Before you move, ask what it makes them do.', 'If they can ignore it, don\'t play it.', 'Every move, ask: does this force anything?', 'Before a check, ask what it wins.', 'Ask what your move asks of them.']),
  plan: S([], ['Ask what the position wants before you move.', 'Find your worst piece and improve it.', 'Every move, ask which piece is doing least.', 'Look for the plan before the move.', 'Ask where each piece belongs.']),
} as const;


export const RECIPES: Record<MistakeCauseKind, LessonRecipe> = {
  'allowed-mate': {
    lesson: S(['king'], [
      'A boxed king dies to checks it can\'t block: your king on {king}.',
      'Mate comes before material, and your king on {king} had too few squares.',
      'Your king on {king} had no escape and no way to block.',
      'Once your king on {king} is boxed in, every check is deadly.',
      'Material means nothing once your king on {king} can be mated.',
    ]),
    consequence: S(['checkPiece', 'checkSq'], [
      'Their {checkPiece} starts the checks from {checkSq}, and they don\'t stop.',
      'It starts with their {checkPiece} checking on {checkSq}, and ends in mate.',
      'Their {checkPiece} checks on {checkSq} first, and there\'s no way out.',
      'The checks begin with their {checkPiece} on {checkSq}, then mate.',
      'One check from their {checkPiece} on {checkSq}, and the mate follows.',
    ]),
    habit: HABIT.checks, family: 'checks', repairs: ['king-exposed'],
  },
  'missed-mate': {
    lesson: S(['king'], [
      'A forced mate beats any material, and their king on {king} was trapped.',
      'Their king on {king} was short of squares: checks came first.',
      'Mate was there against the king on {king}, worth more than every piece.',
      'With their king on {king} boxed in, the checks win the game.',
      'Their king on {king} had nowhere to go, so look at checks first.',
    ]),
    consequence: null,
    habit: HABIT.myChecks, family: 'checks', repairs: [],
  },
  'took-guarded': {
    lesson: S(['tPiece', 'target', 'opPiece'], [
      'The {tPiece} on {target} had the {opPiece} behind it, so it wasn\'t free.',
      'Before you capture, count who takes back: the {opPiece} guards {target}.',
      'A piece is only free if nothing takes back. The {opPiece} guards {target}.',
      'Taking on {target} with something worth more loses, because the {opPiece} recaptures.',
      'The {opPiece} was guarding {target}, so the capture costs more than it wins.',
    ]),
    consequence: S(['what'], ['You lose {what}.', 'The trade gives away {what}.', 'When it settles, you\'ve lost {what}.', 'Count it out: that is {what}.', 'The capture ends up costing {what}.']),
    habit: HABIT.recapture, family: 'captures', repairs: [],
  },
  'eyed-guarded': {
    lesson: S(['tPiece', 'target', 'opPiece'], [
      'A threat on a piece that\'s guarded enough wins nothing: the {opPiece} holds {target}.',
      'The {tPiece} on {target} was guarded by the {opPiece}, so the aim was empty.',
      'Count the guards before you aim: the {opPiece} covers the {tPiece} on {target}.',
      'Aiming at the {tPiece} on {target} gets nothing while the {opPiece} guards it.',
      'With the {opPiece} behind it, the {tPiece} on {target} was never in danger.',
    ]),
    consequence: null,
    habit: HABIT.guards, family: 'captures', repairs: [],
  },
  'answered-by-check': {
    lesson: S(['tPiece', 'target'], [
      'Your {tPiece} on {target} is open to a check that also hits it.',
      'A check that also hits your {tPiece} on {target} wins the time back.',
      'Before you go after anything, look for their checks: your {tPiece} on {target}.',
      'Your {tPiece} on {target} was loose to a check with a second threat.',
      'One check of theirs can attack your king and the {tPiece} on {target}.',
    ]),
    consequence: S(['what'], ['The check wins back {what}.', 'The check costs {what}.', 'After the check, you\'ve lost {what}.', 'You end up losing {what}.', 'The in-between check nets them {what}.']),
    habit: HABIT.checkGrab, family: 'checks', repairs: [],
  },
  'left-hanging': {
    lesson: S(['tPiece', 'target'], [
      'A piece nothing guards can just be taken: your {tPiece} on {target}.',
      'Your {tPiece} on {target} stands where nothing defends it.',
      'Where your piece lands, something has to cover it, and {target} had nothing.',
      'An unguarded piece is a target: the {tPiece} on {target}.',
      'Nothing of yours covers {target}, so the {tPiece} there is loose.',
    ]),
    consequence: S(['opPiece', 'tPiece', 'target'], [
      'Their {opPiece} takes the {tPiece} on {target}.',
      'The {tPiece} on {target} falls to their {opPiece}.',
      'Their {opPiece} just picks off the {tPiece} on {target}.',
      'Their {opPiece} captures the {tPiece} on {target}, and nothing takes back.',
      'The {tPiece} on {target} is lost to their {opPiece}.',
    ]),
    habit: HABIT.landing, family: 'loose', repairs: [],
  },
  'abandoned-defender': {
    lesson: S(['tPiece', 'target'], [
      'A defender has a job, and the {tPiece} on {target} needed it.',
      'Move a defender and what it guarded falls: the {tPiece} on {target}.',
      'Your {tPiece} on {target} lost its only guard.',
      'Every piece guards something, and this one held the {tPiece} on {target}.',
      'The moved piece was holding the {tPiece} on {target}. Now nothing does.',
    ]),
    consequence: S(['opPiece', 'tPiece', 'target'], [
      'Their {opPiece} can take the {tPiece} on {target} once the guard has gone.',
      'With the guard gone, the {tPiece} on {target} drops to their {opPiece}.',
      'Nothing holds the {tPiece} on {target} any more, and the {opPiece} takes it.',
      'Their {opPiece} wins the {tPiece} on {target}.',
      'The {tPiece} on {target} falls to their {opPiece}.',
    ]),
    habit: HABIT.job, family: 'loose', repairs: [],
  },
  'abandoned-fork-square': {
    lesson: S(['target'], [
      'A square can need a guard too: from {target} a knight hits two pieces.',
      'A knight that lands on {target} forks two of your pieces.',
      'Some squares are dangerous by themselves, and {target} is one.',
      'The move stopped guarding {target}, the square their knight forks from.',
      'Your pieces sit a knight\'s jump from {target}, and nothing covers it now.',
    ]),
    consequence: S(['target'], ['Their knight reaches {target} and hits two pieces.', 'Once their knight lands on {target}, two pieces are attacked.', 'From {target}, their knight forks, and one piece goes.', 'Their knight jumps to {target}, and you can save only one.', 'The fork on {target} wins material.']),
    habit: HABIT.forkSquares, family: 'tactics', repairs: [],
  },
  'walks-into-fork': {
    lesson: S(['target'], [
      'Two pieces a jump from one square invite a fork: that square is {target}.',
      'Your pieces both sit a jump from {target}, and their knight can land there.',
      'When one square hits two of your pieces, a fork is waiting: {target}.',
      'From {target}, one piece of theirs attacks two of yours.',
      'The move left two pieces that {target} attacks at once.',
    ]),
    consequence: S(['target'], ['A piece of theirs lands on {target} and hits two, so one goes.', 'From {target} the fork hits two pieces, and you save one.', 'The fork from {target} wins material.', 'Two pieces are attacked from {target}. One is lost.', 'They fork from {target} and come out ahead.']),
    habit: HABIT.knight, family: 'tactics', repairs: [],
  },
  'allowed-tactic': {
    lesson: S(['motif', 'tPiece', 'target'], [
      'Your move lets them play {motif} that wins your {tPiece} on {target}.',
      'After your move, {motif} wins your {tPiece} on {target}.',
      'Your {tPiece} on {target} falls to {motif} after this move.',
      'The pieces now stand for {motif} against your {tPiece} on {target}.',
      'One move gave them {motif}, and your {tPiece} on {target} is the prize.',
    ]),
    consequence: S(['what'], ['They win {what}.', 'That costs {what}.', 'You lose {what}.', 'It ends with {what} gone.', 'The tactic nets them {what}.']),
    habit: HABIT.threats, family: 'tactics', repairs: [],
  },
  'allowed-capture': {
    lesson: S(['tPiece', 'target'], [
      'Something was left loose, and the {tPiece} on {target} gets taken.',
      'A loose piece doesn\'t last: the {tPiece} on {target}.',
      'Leave something unguarded and it goes: the {tPiece} on {target}.',
      'The {tPiece} on {target} had too few defenders after your move.',
      'Your {tPiece} on {target} could be won after the move.',
    ]),
    consequence: S(['what'], ['They win {what}.', 'That loses {what}.', 'They pick up {what}.', 'It costs {what}.', 'You give up {what}.']),
    habit: HABIT.captures, family: 'loose', repairs: [],
  },
  'allowed-threat': {
    lesson: S(['tPiece', 'target'], [
      'Your {tPiece} on {target} can now be hit with tempo.',
      'Your move left the {tPiece} on {target} open to an attack with tempo.',
      'The {tPiece} on {target} is now easy for them to attack.',
      'Your {tPiece} on {target} stands where an attack on it gains them time.',
      'A piece they can hit with tempo hands them time: your {tPiece} on {target}.',
    ]),
    consequence: null,
    habit: HABIT.threats, family: 'threats', repairs: ['initiative-lost'],
  },
  'king-hunt': {
    lesson: S(['king'], [
      'A king without pawn cover can be chased, and yours on {king} is open.',
      'Open up the king on {king} and the checks keep coming.',
      'The pawns in front of your king on {king} were its shield.',
      'Your king on {king} has lost its cover.',
      'With its shield gone, your king on {king} is a target.',
    ]),
    consequence: S(['checkPiece', 'checkSq'], ['Their {checkPiece} starts checking on {checkSq}, and more follow.', 'The king gets chased, starting with their {checkPiece} on {checkSq}.', 'Check after check, beginning with their {checkPiece} on {checkSq}.', 'Their {checkPiece} on {checkSq} opens a hunt for your king.', 'The hunt begins with their {checkPiece} on {checkSq}.']),
    habit: HABIT.shield, family: 'checks', repairs: ['king-exposed'],
  },
  'ignored-threat': {
    lesson: S(['tPiece', 'target'], [
      'A threat doesn\'t go away by itself: the {tPiece} on {target} was attacked.',
      'Read what their move attacks: the {tPiece} on {target}.',
      'When they attack something, it comes before your plan: the {tPiece} on {target}.',
      'The {tPiece} on {target} was hit, and the move left it there.',
      'An attack on the {tPiece} on {target} needed an answer first.',
    ]),
    consequence: S(['tPiece', 'target'], ['The {tPiece} on {target} falls to the attack you left.', 'The attack lands, and the {tPiece} on {target} goes.', 'They carry out the threat and take the {tPiece} on {target}.', 'The {tPiece} on {target} is lost.', 'They win the {tPiece} on {target}.']),
    habit: HABIT.readTheirs, family: 'threats', repairs: ['initiative-lost'],
  },
  'missed-win': {
    lesson: S(['tPiece', 'target'], [
      'When their piece is loose, look for the capture first: the {tPiece} on {target}.',
      'A loose piece of theirs is a chance: the {tPiece} on {target}.',
      'They left the {tPiece} on {target} hanging, so take it.',
      'The {tPiece} on {target} could be won by force.',
      'Their {tPiece} on {target} was there for the taking.',
    ]),
    consequence: S(['what'], ['It was there to win {what}.', 'That was {what} for the taking.', 'You could have won {what}.', 'The chance to win {what} is gone.', 'It would have netted {what}.']),
    habit: HABIT.forcing, family: 'tactics', repairs: [],
  },
  stalemate: {
    lesson: S(['king'], [
      'A king with no move and no check is stalemate: their king on {king}.',
      'Their king on {king} has no legal move, so a win becomes a draw.',
      'Leave the king on {king} no squares without check and it\'s drawn.',
      'Stalemate turns a win into a draw: the king on {king} needs a move.',
      'The king on {king} is boxed in but not in check: stalemate.',
    ]),
    consequence: S([], ['The game is drawn.', 'It\'s a draw on the spot.', 'That\'s half a point thrown away.', 'The win becomes a draw.', 'A won game ends level.']),
    habit: HABIT.stalemate, family: 'endgame', repairs: ['leave-a-square'],
  },
  'technique-broken': {
    lesson: S(['n'], [
      'Endings have rules that win by themselves: {n}.',
      'In this ending the rule is {n}, and it does the work.',
      'Some endings are won by method, not calculation: {n}.',
      'The ending\'s rule, {n}, was broken here.',
      'This ending is held or won by one rule: {n}.',
    ]),
    consequence: null,
    habit: HABIT.method, family: 'endgame', repairs: [],
  },
  'passer-handed': {
    lesson: S(['pawn'], [
      'A passed pawn must be blockaded, and the one on {pawn} runs free.',
      'Give them a passed pawn and you spend pieces stopping it: {pawn}.',
      'A pawn with nothing in front of it runs, and {pawn} just got loose.',
      'Their pawn on {pawn} has a clear road now.',
      'Nothing of yours can stop the pawn on {pawn} by itself.',
    ]),
    consequence: S(['n'], ['It is {n} squares from queening.', 'It has {n} squares to go.', 'A queen is {n} steps away.', 'It needs {n} moves to queen.', '{n} squares stand between it and a queen.']),
    habit: HABIT.passer, family: 'structure', repairs: [],
  },
  'compensation-lost': {
    lesson: S(['down'], [
      'Down {down} for an attack, every move must keep the pressure.',
      'A sacrifice pays only while they\'re busy, and you\'re {down} down.',
      'Down {down}, you have to keep asking questions.',
      'You gave {down} for activity, so a quiet move lets them breathe.',
      'With {down} invested, the attack can\'t pause.',
    ]),
    consequence: S(['down'], ['They have time to regroup, and you\'re just {down} down.', 'The attack fades, and you\'re left {down} down.', 'They consolidate, and the {down} doesn\'t come back.', 'Now it\'s simply {down} less.', 'The pressure is gone, and so is the {down}.']),
    habit: HABIT.sac, family: 'tempo', repairs: [],
  },
  'traded-into-target': {
    lesson: S(['pawn'], [
      'A trade changes the pawns too: this one leaves your pawn on {pawn} weak.',
      'After the trade, your pawn on {pawn} has no friends.',
      'Every trade leaves a structure, and this one leaves {pawn} weak.',
      'The swap left your pawn on {pawn} where pawns can\'t guard it.',
      'Your pawn on {pawn} is alone after the trade.',
    ]),
    consequence: S(['pawn'], ['They can aim at {pawn} again and again.', 'The pawn on {pawn} becomes the thing they attack.', 'Their pieces can pile up on {pawn}.', '{pawn} is the target for the rest of the game.', 'They\'ll go after the pawn on {pawn}.']),
    habit: HABIT.trade, family: 'structure', repairs: [],
  },
  'colour-conceded': {
    lesson: S(['colour', 'target'], [
      'Your {colour}-squared bishop is gone, so {target} has no guard.',
      'Trading off your {colour}-squared bishop hands them the {colour} squares, starting with {target}.',
      'Without your {colour}-squared bishop, nothing fights for {target}.',
      'Your last {colour}-squared bishop held {target}. Now nothing guards it.',
      'With the {colour}-squared bishop traded, {target} has lost its guard.',
    ]),
    consequence: S(['opSq'], [
      'Their bishop on {opSq} will feel at home now.',
      'Their bishop on {opSq} has those squares to itself.',
      'Nothing challenges their bishop on {opSq} any more.',
      'Their bishop on {opSq} rules that colour now.',
      'Their bishop on {opSq} is the strongest piece on those squares.',
    ]),
    habit: HABIT.bishop, family: 'structure', repairs: [],
  },
  'tempo-wasted': {
    lesson: S(['piece'], [
      'Every move should add something, and the {piece} move can be ignored.',
      'A move they can ignore is a move given away: the {piece}.',
      'Time is a piece too, and the {piece} spent it.',
      'The {piece} moved without forcing anything.',
      'Their best reply doesn\'t need to answer the {piece}.',
    ]),
    consequence: null,
    habit: HABIT.tempo, family: 'tempo', repairs: ['initiative-lost'],
  },
  positional: {
    // The positional lesson is keyed on the tag (`POSITIONAL`); this row is
    // only the fallback shape and is never filled.
    lesson: null, consequence: null, habit: HABIT.plan, family: 'plan', repairs: [],
  },
  unexplained: { lesson: null, consequence: null, habit: null, family: 'plan', repairs: [] },
};

/** THE POSITIONAL LESSON, by the record tag the board files the move under.
 *  A tag with no row here speaks nothing (missing-slot) — no generic line. */
export const POSITIONAL: Partial<Record<Exclude<MisconceptionTagId, 'other'>, { lesson: SlotRecipe; consequence: SlotRecipe | null; repairs: readonly RepairState[] }>> = {
  'weakened-king-safety': {
    lesson: S(['king'], [
      'The king on {king} has less cover than it needed.',
      'Your king on {king} is more open after this.',
      'Pawns and pieces near the king on {king} are its shelter.',
      'Every pawn that leaves the king on {king} opens a door.',
      'The king on {king} lost some of its shield.',
    ]),
    consequence: null,
    repairs: ['king-exposed'],
  },
  'king-stuck-center': {
    lesson: S(['king'], [
      'A king left on {king} in the middle gets caught when lines open.',
      'Your king on {king} still wants to castle.',
      'A king belongs behind pawns, not on {king} in the centre.',
      'The king on {king} is in the open middle.',
      'Castling would have hidden the king on {king}.',
    ]),
    consequence: null,
    repairs: ['king-exposed'],
  },
  'misplaced-piece': {
    lesson: S(['tPiece', 'target'], [
      'A piece is as good as its squares: your {tPiece} on {target} has few.',
      'Your {tPiece} on {target} does less than it could.',
      'The {tPiece} on {target} is out of play.',
      'A piece belongs where it reaches most, unlike the {tPiece} on {target}.',
      'Your {tPiece} on {target} has little to do there.',
    ]),
    consequence: null,
    repairs: [],
  },
  'tempo-handed': {
    lesson: S(['tPiece', 'target'], [
      'Your move set their {tPiece} on {target} free.',
      'Their {tPiece} on {target} reaches much more now.',
      'A move that frees their pieces helps them: the {tPiece} on {target}.',
      'Their {tPiece} on {target} has open lines after this.',
      'The {tPiece} on {target} was boxed in. Now it isn\'t.',
    ]),
    consequence: null,
    repairs: [],
  },
  'passive-rook': {
    lesson: S(['file'], [
      'Rooks want open files, and the {file} was waiting.',
      'A rook belongs on an open file, and the {file} is one.',
      'A rook belongs on the open {file}, not behind pawns.',
      'The {file} was the rook\'s road into their camp.',
      'Rooks need open lines: the {file} offered one.',
    ]),
    consequence: null,
    repairs: [],
  },
  'passive-king-endgame': {
    lesson: S(['king'], [
      'In the endgame the king is a fighter, not on {king}.',
      'Your king on {king} is far from the action.',
      'Endings are won by active kings, and {king} is on the edge.',
      'In the ending, bring the king from {king} toward the centre.',
      'The king on {king} sits back while the ending is decided.',
    ]),
    consequence: null,
    repairs: [],
  },
};


export const MISTAKE_NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
/** Material in words for a count of pawns (the ledger's units). */
export function materialWords(pawns: number): string | null {
  // By count alone (`countWords.test`): a point total never names a piece —
  // three points may be a knight or three pawns.
  if (pawns === 2) return 'two pawns';
  if (pawns === 1) return 'a pawn';
  return pawns > 2 ? `${MISTAKE_NUMBER_WORDS[pawns] ?? String(pawns)} points of material` : null;
}
export const motifArticle = (w: string): string => withArticle(w);
export const COLOUR_NAME = { dark: 'dark', light: 'light' } as const;

/** An ending's rule in words: every defender rule (`DEFENDER_RULE_TECHNIQUE`),
 *  and the three the king-and-pawn and rook readers say in their own words. */
export type TechniqueRule = DefenderRuleId | 'key-square' | 'opposition';
export const TECHNIQUE_RULE: Record<TechniqueRule, string> = {
  ...DEFENDER_RULE_TECHNIQUE,
  'key-square': 'the king in front of its pawn',
  opposition: 'kings face to face, the other must give way',
  'rook-behind-passer': 'rooks behind passed pawns',
};


/** Material in words, from the ledger's PIECES (never a net pawn count):
 *  "a bishop for a pawn", "a knight", "two pawns". `lost`: the side's own
 *  pieces that went; `got`: what it took in return. */
export function tradeWords(lost: readonly string[], got: readonly string[]): string | null {
  const NOUN: Record<string, [string, string]> = { p: ['a pawn', 'pawns'], n: ['a knight', 'knights'], b: ['a bishop', 'bishops'], r: ['a rook', 'rooks'], q: ['the queen', 'queens'] };
  const VAL: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
  const words = (xs: readonly string[]): string | null => {
    if (!xs.length) return null;
    const count = new Map<string, number>();
    for (const x of xs) count.set(x, (count.get(x) ?? 0) + 1);
    const parts = [...count.entries()].sort((a, b) => VAL[b[0]] - VAL[a[0]]).map(([t, n]) => (n === 1 ? NOUN[t][0] : `${MISTAKE_NUMBER_WORDS[n] ?? String(n)} ${NOUN[t][1]}`));
    return andList(parts);
  };
  // The pieces traded over the line, both sides — never a net that cancels
  // like for like ("a rook and a knight for a knight").
  const l = words(lost);
  if (!l) return null;
  const g = words(got);
  return g ? `${l} for ${g}` : l;
}

/** A MISSED TACTIC, by the one classifier's motif, with the piece its line
 *  actually wins (net of what comes back). */
export const MISSED_MOTIF: SlotRecipe = S(['motif', 'tPiece', 'target'], [
  '{motif} was there to win their {tPiece} on {target}.',
  'Their {tPiece} on {target} could be won with {motif}.',
  'Look for {motif}: it would have won the {tPiece} on {target}.',
  'With {motif}, the {tPiece} on {target} would have fallen.',
  'The {tPiece} on {target} was there to be won by {motif}.',
]);

/** A queen the better move would have trapped (`queenNet` on the better
 *  move): every square it had is gone. */
export const TRAPPED_LESSON: SlotRecipe = S(['tPiece', 'target'], [
  'Their {tPiece} on {target} could be trapped: it had no safe square left.',
  'One move would have left their {tPiece} on {target} with nowhere to go.',
  'Their {tPiece} on {target} was short of squares, and it could be trapped.',
  'A piece with no way out is a target: their {tPiece} on {target}.',
  'Their {tPiece} on {target} could be caught with no safe square.',
]);

/** THE CAUSE READERS' LESSONS (`causeReaders`, `mistakeCause.causeReaderKey`):
 *  a move whose cost no material reason explains, told by what it gave away.
 *  `yours` names the board; `theirs` names nothing the student's next move
 *  could find. */
export type CauseReaderKey = 'retreat' | 'missed-tempo' | 'wrong-order' | 'freed-square' | 'defender-hit' | 'pawn-let-go' | 'bishop-shut' | 'rook-activity';
export const CAUSE_READER_LESSONS: Record<CauseReaderKey, { yours: SlotRecipe; theirs: SlotRecipe }> = {
  retreat: {
    yours: S(['piece'], ['Your {piece} went back home, and the time it spent coming out is gone.', 'A piece that goes back to its first rank gives the move away.', 'Your {piece} retreats for no reason, so you are a move behind.', 'Pieces belong forward: sending your {piece} back hands them a free move.', 'Nothing made the {piece} retreat, and the tempo is lost.']),
    theirs: S(['piece'], ['Their {piece} went back for no reason.', 'They retreated a piece nothing was chasing.', 'Their {piece} retreat gives you a free move.', 'They spent a move putting their {piece} back.', 'Nothing forced their {piece} back, so you are a move up.']),
  },
  'missed-tempo': {
    yours: S(['tPiece', 'target'], ['Hit their {tPiece} on {target} first. A quiet move let them breathe.', 'A move with tempo was there, hitting their {tPiece} on {target}.', 'Attack their {tPiece} on {target} before playing slowly.', 'Their {tPiece} on {target} could be hit, and the quiet move let it be.', 'You could hit their {tPiece} on {target}, and the quiet move let them off.']),
    theirs: S(['tPiece', 'target'], ['They could have hit your {tPiece} on {target}, and played quietly.', 'Your {tPiece} on {target} was there to attack, and they let it be.', 'They let you breathe when they could have hit your {tPiece} on {target}.', 'Their quiet move left your {tPiece} on {target} alone.', 'They passed up a move with tempo against your {tPiece} on {target}.']),
  },
  'wrong-order': {
    yours: S(['tPiece', 'target'], ['Force first: your {tPiece} to {target} comes before this move.', 'Your move was good one move later, after your {tPiece} to {target}.', 'Play the forcing move first, your {tPiece} to {target}, then this one.', 'Your {tPiece} to {target} first gains a move, and the order matters.', 'Your {tPiece} to {target} forces first, and this move comes after.']),
    theirs: S([], ['They had the right idea in the wrong order.', 'Their move was better one move later, after a forcing one.', 'They skipped the forcing move that should come first.', 'Their order cost them a move.', 'They played it a move too soon.']),
  },
  'freed-square': {
    yours: S(['target', 'tPiece', 'opSq'], ['Chasing that piece freed {target} for their {tPiece} on {opSq}.', 'A chase can hand them {target}, the square their {tPiece} on {opSq} needed.', 'A chased piece leaves {target} behind, and their {tPiece} on {opSq} takes it.', 'Their {tPiece} on {opSq} was in trouble, and now it has {target}.', 'Driving that piece off {target} gave their {tPiece} on {opSq} a way home.']),
    theirs: S([], ['Their chase freed a square your piece needed.', 'They drove your piece off and opened a way out for another.', 'Their move gave your stuck piece somewhere to go.', 'The square they chased you off is now your way out.', 'Their chase helped your piece in trouble.']),
  },
  'defender-hit': {
    yours: S(['tPiece', 'target', 'opPiece', 'opSq'], ['Hit the lone guard: the {opPiece} on {opSq} alone held their {tPiece} on {target}.', 'Attack the {opPiece} on {opSq} first, and the {tPiece} on {target} it holds falls.', 'One guard held their {tPiece} on {target}. Chase the {opPiece} on {opSq}.', 'Only the {opPiece} on {opSq} held their {tPiece} on {target}. Hit it.', 'Count the guards of their {tPiece} on {target}: only the {opPiece} on {opSq}.']),
    theirs: S([], ['They missed that your piece had only one guard.', 'They could have chased the one defender of your piece.', 'Your piece hung on a single guard, and they let it be.', 'They did not hit the defender of your attacked piece.', 'One guard held your piece, and they missed it.']),
  },
  'pawn-let-go': {
    yours: S(['pawn'], ['Your pawn on {pawn} is lost a few moves later.', 'A pawn can be lost in a short line: the one on {pawn}.', 'After the trades, your pawn on {pawn} has too few guards.', 'Look two moves ahead: the pawn on {pawn} falls there.', 'The pawn on {pawn} was guarded before. Now it goes.']),
    theirs: S([], ['Their move lets a pawn of theirs go.', 'A pawn of theirs falls a few moves on.', 'They leave a pawn short of guards.', 'Their move costs them a pawn in the line.', 'One of their pawns can be won now.']),
  },
  'bishop-shut': {
    yours: S(['target', 'pawn'], ['Your pawn on {pawn} blocks your own bishop on {target}.', 'The bishop on {target} is shut in behind the pawn on {pawn}.', 'Pawns on your bishop\'s colour block it: {target} has no squares now.', 'Your bishop on {target} lost its diagonal to the pawn on {pawn}.', 'A bishop behind its own pawns does little, like the one on {target}.']),
    theirs: S([], ['Their pawn move shuts in their own bishop.', 'Their bishop is stuck behind their pawns now.', 'They blocked their own bishop with a pawn.', 'Their bishop has nowhere to go after that pawn move.', 'Their pawn sits on its bishop\'s colour, right in its way.']),
  },
  'rook-activity': {
    yours: S(['target', 'file'], ['Rooks belong on open files, and yours left the {file}-file.', 'Your rook on {target} does less than it did on the {file}-file.', 'The open {file}-file is theirs to take now.', 'Your rook gave up the {file}-file for a quieter square.', 'A rook off the open file sits idle on {target}.']),
    theirs: S([], ['Their rook left the open file.', 'They gave up an open file with their rook.', 'Their rook is quieter where it went.', 'The open file is yours to take now.', 'Their rook stepped off its best line.']),
  },
};

/** A fork's targets and the piece it lands with, in words. */
export const FORK_LESSON: { yours: SlotRecipe } = {
  // Your missed fork: their two pieces, one move away from both.
  yours: S(['a', 'b'], [
      'Their {a} and {b} could both be hit by one move: a fork.',
      'One move hit their {a} and {b} at once. One had to fall.',
      'Their {a} and {b} stood one move from a fork.',
      'Two of their pieces, the {a} and the {b}, sat one fork apart.',
      'When one move hits two pieces, look for it: their {a} and {b}.',
    ]),
};

/** THE BETTER MOVE'S JOB, said as a principle — never the move (Learn names
 *  no move). Read from the better move on the board (`betterJob` in
 *  mistakeLesson); no job read → the slot is silent. */
export type BetterJob = 'cover-king' | 'force-mate' | 'take-loose' | 'save-piece' | 'guard-piece' | 'castle' | 'develop-threat' | 'develop' | 'take-attacker' | 'pawn-break' | 'push-passer' | 'king-up';
export const BETTER_JOBS: Record<BetterJob, { yours: SlotRecipe; theirs: SlotRecipe }> = {
  'cover-king': {
    yours: S([], ['Give the king room before anything else.', 'Make an escape square for the king first.', 'King safety first: open a square for it.', 'Clear a flight square for the king before attacking.', 'First give the king air, then play on.']),
    theirs: S([], ['They needed to give their king room first.', 'Their king needed an escape square before anything else.', 'Their first job was a flight square for the king.', 'King safety came first for them.', 'They had to give their king air.']),
  },
  'force-mate': {
    yours: S([], ['Start with the checks: they force the mate.', 'Check first, and keep checking to the mate.', 'The forcing checks came before any quiet move.', 'Begin with a check and the king has no way out.', 'Checks first: the mate was forced.']),
    theirs: S([], ['They had checks that forced mate.', 'Their checks led to a forced mate.', 'They could have mated by checking first.', 'A forced mate began with their check.', 'They missed checks that end the game.']),
  },
  'take-loose': {
    yours: S(['cap'], ['Take the loose {cap} before anything else.', 'Win the undefended {cap} first.', 'Capture the hanging {cap} while it\'s there.', 'A loose {cap} comes first: take it.', 'Pick up the free {cap} first.']),
    theirs: S(['cap'], ['They could have taken a loose {cap} first.', 'An undefended {cap} was there for them.', 'They left a free {cap} on the board.', 'Taking the loose {cap} was their job.', 'They passed up a hanging {cap}.']),
  },
  'save-piece': {
    yours: S(['tPiece'], ['Move the attacked {tPiece} to safety first.', 'Rescue the {tPiece} before anything else.', 'Get the {tPiece} out of danger first.', 'The attacked {tPiece} needed to move first.', 'First save the {tPiece}, then play on.']),
    theirs: S(['tPiece'], ['They needed to move their {tPiece} to safety.', 'Their {tPiece} had to get out of danger first.', 'Saving the {tPiece} was their first job.', 'Their attacked {tPiece} needed to move.', 'They had to rescue the {tPiece} first.']),
  },
  'guard-piece': {
    yours: S(['tPiece'], ['Guard the {tPiece} before you push on.', 'Add a defender to the {tPiece} first.', 'Cover the {tPiece} before anything else.', 'First protect the {tPiece}, then play on.', 'The {tPiece} needed one more guard first.']),
    theirs: S(['tPiece'], ['They needed to guard their {tPiece} first.', 'Their {tPiece} needed one more defender.', 'Protecting the {tPiece} was their job.', 'They had to cover the {tPiece} before anything else.', 'Their {tPiece} wanted a guard first.']),
  },
  castle: {
    yours: S([], ['Get the king castled before you attack.', 'Castle first, then start the play.', 'Tuck the king away before anything else.', 'King safety first: castle.', 'Castle the king, then bring the rest out.']),
    theirs: S([], ['They needed to castle first.', 'Their king wanted to castle before anything else.', 'Castling was their first job.', 'They should have tucked the king away.', 'Their king needed the safety of castling.']),
  },
  'develop-threat': {
    yours: S([], ['Develop with a threat first.', 'Bring a piece out with an attack on something.', 'Develop and threaten in one move.', 'A developing move that hits something comes first.', 'Get a piece out that also makes a threat.']),
    theirs: S([], ['They had a developing move with a threat.', 'Their best was to develop and attack at once.', 'They could have brought a piece out with a threat.', 'A developing threat was their move.', 'They needed to develop with tempo.']),
  },
  develop: {
    yours: S([], ['Bring out another piece first.', 'Develop a piece before anything else.', 'Get the pieces out first.', 'Finish your development first.', 'Another piece into play comes first.']),
    theirs: S([], ['They needed to bring out another piece.', 'Their development came first.', 'They should have got a piece out.', 'Another piece of theirs needed to come out.', 'Their job was to finish developing.']),
  },
  'take-attacker': {
    yours: S(['opPiece'], ['Take out the attacking {opPiece} first.', 'Remove the {opPiece} that does the damage.', 'Capture the attacker, the {opPiece}, before anything else.', 'Get rid of the attacking {opPiece} first.', 'The {opPiece} doing the attacking should go first.']),
    theirs: S([], ['They needed to take out your attacker.', 'Removing your attacking piece was their job.', 'They had to deal with your attacker first.', 'Their best was to capture the attacker.', 'They should have removed the attacking piece.']),
  },
  'pawn-break': {
    yours: S([], ['Strike at their pawns with a break first.', 'Open the position with a pawn break.', 'Hit their pawn chain with a pawn first.', 'A pawn break was the timely plan.', 'Challenge their pawns with a break.']),
    theirs: S([], ['They had a timely pawn break.', 'Their pawn break was the plan.', 'They needed to strike with a pawn.', 'A break against your pawns was their move.', 'They should have challenged your pawns.']),
  },
  'push-passer': {
    yours: S([], ['Push the passed pawn while its road is open.', 'Advance the free pawn first.', 'The passed pawn wants to move: push it.', 'Run with the passed pawn first.', 'A passed pawn should be pushed while it can.']),
    theirs: S([], ['They needed to push their passed pawn.', 'Their free pawn wanted to run.', 'Advancing the passed pawn was their job.', 'Their passed pawn should have moved.', 'They let their passed pawn stand still.']),
  },
  'king-up': {
    yours: S([], ['Bring the king toward the middle first.', 'In the ending, march the king forward.', 'Activate the king before anything else.', 'The king belongs nearer the centre now.', 'Walk the king into the game.']),
    theirs: S([], ['Their king needed to come forward.', 'They had to activate their king.', 'Their king belonged nearer the centre.', 'They should have walked the king up.', 'Their king needed to join the ending.']),
  },
};

/** THE THEIR-SEAT FORMS — their mistake, told to the student. Never a square
 *  the student can now strike (that is the student's next move): their piece
 *  by type, or the idea. A cause with no row here is silent on their seat. */
export const THEIR_SEAT: Partial<Record<MistakeCauseKind, { lesson: SlotRecipe; consequence: SlotRecipe | null }>> = {
  'allowed-mate': {
    lesson: S([], ['Their king is boxed in, with checks it can\'t block coming.', 'Their move leaves their king with no room.', 'Their king has no escape square now.', 'Their king is short of air, and that decides before material.', 'Their move lets their king get trapped.']),
    consequence: null,
  },
  'king-hunt': {
    lesson: S([], ['Their king has lost its pawn cover.', 'Their move opens up their own king.', 'Their king\'s shield is gone.', 'Without its pawns, their king is a target.', 'Their king stands bare now.']),
    consequence: null,
  },
  'took-guarded': {
    lesson: S([], ['They took a piece that was guarded, so it wasn\'t free.', 'Their capture runs into a recapture.', 'They grabbed something you could take back.', 'Their capture forgot to count the recapture.', 'The piece they took was defended.']),
    consequence: S(['what'], ['The trade costs them {what}.', 'They lose {what} in the exchange.', 'When it settles, they\'ve given up {what}.', 'Their grab costs {what}.', 'They end up losing {what}.']),
  },
  'eyed-guarded': {
    lesson: S([], ['Their attack hits a piece of yours that is guarded enough.', 'They aimed at something you had defended.', 'Their threat wins nothing: your piece is covered.', 'They attacked a guarded piece.', 'Their move looks at a piece that is safe.']),
    consequence: null,
  },
  'answered-by-check': {
    lesson: S(['tPiece'], ['Their move leaves their {tPiece} open to a check that also hits it.', 'A check of yours can hit their {tPiece} at the same time.', 'Their {tPiece} can be hit by a check with a second threat.', 'They left their {tPiece} where a check also attacks it.', 'One check can attack their king and their {tPiece}.']),
    consequence: S(['what'], ['That check can win {what} back.', 'Their grab can cost {what}.', 'The check takes back {what}.', 'It can end with them losing {what}.', 'A check nets {what} back.']),
  },
  'left-hanging': {
    lesson: S(['tPiece'], ['Their {tPiece} was left with nothing guarding it.', 'Their {tPiece} stands unguarded.', 'They left their {tPiece} loose.', 'Nothing of theirs covers their {tPiece} now.', 'Their {tPiece} has no defender.']),
    consequence: null,
  },
  'abandoned-defender': {
    lesson: S(['tPiece'], ['Their move pulled the guard away from their {tPiece}.', 'Their {tPiece} lost its only defender.', 'The piece that guarded their {tPiece} walked away.', 'Their {tPiece} is unguarded now that its defender moved.', 'They moved the piece that held their {tPiece}.']),
    consequence: null,
  },
  'abandoned-fork-square': {
    lesson: S([], ['Their move left a fork square unguarded.', 'They stopped guarding a square where one jump hits two pieces.', 'A square that forks two of their pieces is open now.', 'Their move uncovered a knight fork square.', 'One of their fork squares lost its guard.']),
    consequence: null,
  },
  'walks-into-fork': {
    lesson: S([], ['Their pieces now stand where one move hits two of them.', 'Their move lines two pieces up for a fork.', 'Two of their pieces are a fork apart.', 'They put two pieces where one move attacks both.', 'Their move walks into a fork.']),
    consequence: null,
  },
  'allowed-tactic': {
    lesson: S(['motif'], ['Their move leaves room for {motif} on your side.', 'After their move, you have {motif}.', 'Their pieces now stand where {motif} works for you.', 'Their move sets up {motif} for you.', 'There is {motif} for you after that.']),
    consequence: S(['what'], ['It can win {what}.', 'That tactic nets {what}.', 'It costs them {what}.', 'They can lose {what}.', 'There is {what} to be won.']),
  },
  'allowed-capture': {
    lesson: S(['tPiece'], ['Their {tPiece} is short of defenders after that move.', 'Their move leaves their {tPiece} loose.', 'Their {tPiece} can be won after that.', 'They left their {tPiece} without enough guards.', 'Their {tPiece} is the weak point now.']),
    consequence: S(['what'], ['There is {what} to be won.', 'It can cost them {what}.', 'They can lose {what}.', 'Their move gives away {what}.', 'That drops {what}.']),
  },
  'allowed-threat': {
    lesson: S(['tPiece'], ['Their move leaves their {tPiece} open to an attack with tempo.', 'Their {tPiece} can be hit with gain of time.', 'They left their {tPiece} where it can be chased.', 'Their {tPiece} becomes a target with tempo.', 'Their {tPiece} can be attacked and must move.']),
    consequence: null,
  },
  'ignored-threat': {
    lesson: S(['tPiece', 'target', 'opPiece'], ['They left their {tPiece} on {target} under attack, and your {opPiece} takes it.', 'Their {tPiece} on {target} was attacked, and your {opPiece} wins it.', 'They ignored the threat: your {opPiece} takes their {tPiece} on {target}.', 'Their move left the {tPiece} on {target} for your {opPiece}.', 'The attack on their {tPiece} on {target} went unanswered, so your {opPiece} takes it.']),
    consequence: null,
  },
  stalemate: {
    lesson: S([], ['Their move leaves your king no move and no check: stalemate.', 'They stalemated your king.', 'Your king has no legal move, and it isn\'t check.', 'Their move ends the game in stalemate.', 'They boxed your king in without check.']),
    consequence: S([], ['The game is drawn.', 'It\'s a draw on the spot.', 'Their win turns into a draw.', 'Half a point comes your way.', 'The game ends level.']),
  },
  'technique-broken': {
    lesson: S(['n'], ['They broke the ending\'s rule: {n}.', 'Their move breaks the method: {n}.', 'The ending has a rule, {n}, and they left it.', 'They ignored the ending\'s rule: {n}.', 'Their move goes against the rule: {n}.']),
    consequence: null,
  },
  'passer-handed': {
    lesson: S([], ['Their move lets one of your pawns run free.', 'You have a passed pawn after their move.', 'Their move clears the road for a pawn of yours.', 'One of your pawns is passed now.', 'They let a pawn of yours loose.']),
    consequence: S(['n'], ['It is {n} squares from queening.', 'Your free pawn has {n} squares to go.', 'A queen is {n} steps away.', 'It needs {n} moves to queen.', '{n} squares stand between it and a queen.']),
  },
  'compensation-lost': {
    lesson: S(['down'], ['They gave {down} for an attack, then let it stop.', 'Their quiet move lets the attack fade, {down} down.', 'Down {down}, they stopped asking questions.', 'They invested {down} and then played slowly.', 'Their attack needed every move, and they paused.']),
    consequence: S(['down'], ['Now they are just {down} down.', 'You get time to regroup, {down} up.', 'The pressure is gone, and so is their {down}.', 'They\'re simply {down} short now.', 'You can consolidate the extra {down}.']),
  },
  'traded-into-target': {
    lesson: S([], ['Their trade leaves one of their pawns weak.', 'After the trade, a pawn of theirs has no friends.', 'Their swap leaves a lonely pawn behind.', 'The trade gives them a weak pawn.', 'Their pawn structure is worse after the trade.']),
    consequence: null,
  },
  'colour-conceded': {
    lesson: S(['colour'], ['Their {colour}-squared bishop is gone, so their {colour} squares are weak.', 'They traded off their {colour}-squared bishop and its squares with it.', 'Without their {colour}-squared bishop, the {colour} squares are yours.', 'Their last {colour}-squared bishop has left the board.', 'They gave up the bishop that held the {colour} squares.']),
    consequence: null,
  },
  'tempo-wasted': {
    lesson: S(['piece'], ['Their {piece} move forces nothing.', 'You can ignore their {piece} move.', 'Their {piece} moved without a threat.', 'Their {piece} move asks nothing of you.', 'The {piece} move gives you a free hand.']),
    consequence: null,
  },
};

/** The positional forms for their seat, by tag (no square named). */
export const POSITIONAL_THEM: Partial<Record<Exclude<MisconceptionTagId, 'other'>, { lesson: SlotRecipe; consequence: SlotRecipe | null }>> = {
  'weakened-king-safety': {
    lesson: S([], ['Their king has less cover than before.', 'Their move weakens their own king.', 'Their king is more open now.', 'Their king lost some of its shelter.', 'They loosened the pawns around their king.']),
    consequence: null,
  },
  'king-stuck-center': {
    lesson: S([], ['Their king is still in the middle.', 'They left their king uncastled in the centre.', 'Their king hasn\'t castled yet.', 'Their king stands on the open middle.', 'Their king is stuck in the centre.']),
    consequence: null,
  },
  'misplaced-piece': {
    lesson: S(['tPiece'], ['Their {tPiece} has few squares there.', 'Their {tPiece} is out of play.', 'They put their {tPiece} where it does little.', 'Their {tPiece} sits idle.', 'Their {tPiece} reaches little from there.']),
    consequence: null,
  },
  'tempo-handed': {
    lesson: S([], ['Their move gives one of your pieces more room.', 'They freed one of your pieces.', 'Your pieces breathe more after their move.', 'Their move opens lines for your pieces.', 'One of your pieces is unboxed now.']),
    consequence: null,
  },
  'passive-rook': {
    lesson: S([], ['Their rook stays behind its pawns.', 'They left an open file to you.', 'Their rook misses the open file.', 'Their rook isn\'t on an open line.', 'Their rook does little where it stands.']),
    consequence: null,
  },
  'passive-king-endgame': {
    lesson: S([], ['Their king stays back in the ending.', 'Their king is far from the action.', 'They kept the king passive in the endgame.', 'Their king isn\'t walking toward the centre.', 'Their king sits back while the ending is decided.']),
    consequence: null,
  },
};

export function fillStem(stem: string, fills: Fills): string {
  return stem.replace(/\{(\w+)\}/g, (_, k: string) => fills[k as FillKey] ?? `{${k}}`);
}
export const capitaliseStem = (s: string): string => openSentence(s);

/** Said one slot: rotated on `key`, skipping a stem the previous turn said
 *  (`avoid`), or null when a field it needs is missing. Returns the stem
 *  used, so the next turn can avoid it. */
export function renderMistakeSlot(r: SlotRecipe | null | undefined, fills: Fills, key: number, avoid: ReadonlySet<string> = new Set()): { text: string; stem: string } | null {
  if (!r || !r.stems.length) return null;
  if (r.needs.some((k) => !fills[k])) return null;
  for (let i = 0; i < r.stems.length; i += 1) {
    const stem = rotateStem(r.stems, key + i);
    if (avoid.has(stem) && i < r.stems.length - 1) continue;
    return { text: openSentence(fillStem(stem, fills)), stem };
  }
  return null;
}

/** THEIR MOVE, ONCE PLAYED (refinement 4): the consequence may name it in
 *  words ("their king took back on f7") — it is past, never the student's
 *  next move. Used with a loss (`what`). */
export const THEIR_MOVE_CONSEQUENCE: SlotRecipe = S(['theirMove', 'what'], [
  'Then {theirMove}, and you\'ve lost {what}.',
  '{theirMove}: that costs {what}.',
  'When {theirMove}, that was {what} lost.',
  'After {theirMove}, you\'ve given up {what}.',
  '{theirMove}, which costs {what}.',
]);

/** AN EMPTY CHECK (`emptyCheckAt`): what answered it, and that it won
 *  nothing. `answer`: "block" or "king step". */
export const EMPTY_CHECK_LESSON: SlotRecipe = S(['piece', 'answer'], [
  'Your {piece} gave a check that a simple {answer} ends. Nothing was won.',
  'A check met by a {answer} wins nothing: your {piece} spent a move.',
  'Your {piece}\'s check is answered by a {answer}, and the move is gone.',
  'Checks only help when they win something. A {answer} ends this one.',
  'A {answer} answers the check, and your {piece} gained nothing.',
]);

/** THE GOOD DECISION (refinement 1): one line on why a found decision worked,
 *  only while that skill is red or grey. No move named. */
export type GoodDecision = 'only-move' | 'prophylaxis';
export const GOOD_DECISION: Record<GoodDecision, SlotRecipe> = {
  'only-move': S(['gives'], [
    'Only one move held here, and you found it: the rest {gives}.',
    'That was the only move. All the others {gives}.',
    'One move kept it together, and the others {gives}.',
    'You found the one move: all the others {gives}.',
    'Nothing else worked here. The other moves {gives}.',
  ]),
  prophylaxis: S(['victim'], [
    'You stopped their idea before it came: your {victim} stays safe.',
    'Prevention first: their plan against your {victim} is off.',
    'You saw their threat to your {victim} coming and took it away.',
    'Stopping their move against your {victim} was the right call.',
    'Their idea against your {victim} never gets started now.',
  ]),
};

// ── THE STRUCTURE'S PLANS (`structureOf` → `planOf`) ───────────────────────
/** One structural plan in players' words, rotated on the board. `whose` is
 *  "your"/"their"; `names` false keeps the student's own move unnamed (the
 *  square and the target only). `later`: said as a plan for later. */
export function structurePlanWords(
  p: { kind: 'chain' | 'minority' | 'expansion' | 'majority' | 'isolani' | 'square' | 'bad-bishop'; key: { from: string; to: string; hits: string | null } | null; first: { from: string; to: string } | null; target: string | null; piece?: { type: string; square: string }; owns?: boolean },
  whose: 'your' | 'their',
  names: boolean,
  key: number,
  later = false,
): string | null {
  const Whose = whose === 'your' ? 'Your' : 'Their';
  const theirs = whose === 'your' ? 'their' : 'your';
  const pawnOf = (from: string): string => `${from[0]}-pawn`;
  const lead = later ? `${Whose} plan for later` : `${Whose} plan`;
  switch (p.kind) {
    case 'chain': {
      if (!p.key?.hits) return null;
      const how = names ? p.key.to : `the ${pawnOf(p.key.from)}`;
      return rotateStem([
        `${lead}: strike at the base of ${theirs} pawn chain, ${how} hitting ${p.key.hits}.`,
        `${lead} is to hit the chain at its base: ${how} against ${p.key.hits}.`,
        `${lead}: the pawn on ${p.key.hits} holds ${theirs} chain up, so ${how} goes after it.`,
      ], key);
    }
    case 'minority': {
      if (!p.key?.hits) return null;
      return rotateStem([
        `${lead} is the minority attack: the b-pawn runs to ${p.key.to} at the pawn on ${p.key.hits}.`,
        `${lead}: two pawns against three, the b-pawn to ${p.key.to} to break up ${p.key.hits}.`,
      ], key);
    }
    case 'expansion': {
      if (!p.key?.hits || !p.first) return null;
      const brk = names ? p.key.to : `the ${pawnOf(p.key.from)}`;
      // The pawn that gains the space is named by its file, never its square:
      // the break and its target are the two squares the plan is about.
      const gain = `the ${pawnOf(p.first.from)}`;
      return rotateStem([
        `${lead}: the break ${brk} at ${p.key.hits}, once ${gain} has taken queenside space.`,
        `${lead} is the break at ${p.key.hits} with ${brk}, after ${gain} gains space.`,
      ], key);
    }
    case 'majority': {
      if (!p.key) return null;
      const wing = p.key.from.charCodeAt(0) <= 99 ? 'queenside' : 'kingside';
      return rotateStem([
        `${lead}: push the ${wing} majority, the ${pawnOf(p.key.from)} first, to make a passed pawn.`,
        `${lead} is a passed pawn from the ${wing} majority, starting with the ${pawnOf(p.key.from)}.`,
      ], key);
    }
    case 'isolani': {
      if (!p.target) return null;
      return p.owns
        ? rotateStem([`${lead}: use the open lines around the isolated pawn on ${p.target}, and keep pieces on.`, `${lead}: activity first, with the isolated pawn on ${p.target} backing the pieces.`], key)
        : rotateStem([`${lead}: blockade the isolated pawn on ${p.target}, then trade pieces toward it.`, `${lead}: hold the square in front of the isolated pawn on ${p.target}, then win it.`], key);
    }
    case 'square': {
      if (!p.target || !p.piece) return null;
      return rotateStem([
        `${lead}: the fight for ${p.target}. No pawn of ${theirs} can cover it, and ${whose} ${PIECE_WORD[p.piece.type] ?? 'piece'} on ${p.piece.square} wants it.`,
        `${lead} is ${p.target}: ${whose} pieces cover it more, and the ${PIECE_WORD[p.piece.type] ?? 'piece'} on ${p.piece.square} can land there.`,
      ], key);
    }
    case 'bad-bishop': {
      if (!p.piece) return null;
      return rotateStem([
        `${Whose} bishop on ${p.piece.square} is bad: its own pawns are fixed on its colour. Trade it off.`,
        `${Whose} bishop on ${p.piece.square} is stuck behind its own pawns. ${lead}: trade it, or free its colour.`,
      ], key);
    }
  }
}
const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The masters' break as a plan: "Their plan in the master games: the break
 *  …c5." `brk` is the move, or the pawn when the student's move is held. */
export function mastersBreakPlanWords(mine: boolean, brk: string): string {
  return `${mine ? 'Your' : 'Their'} plan in the master games: the break ${brk}.`;
}
