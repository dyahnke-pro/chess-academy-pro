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
import { Chess, type Color, type Square, type PieceSymbol } from 'chess.js';
import { rotateStem } from '../utils/rotateStem';
import { andList, orList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';

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

/** Can a fact stamped `board` be said on the screen `screenFen`: its own
 *  board, or a board its path reaches. A past board is checked by
 *  `anchorPastFact`, which holds the earlier board. */
export function boardReachable(board: FactBoard, screenFen: string): boolean {
  if (board.relation === 'now') return board.path.length === 0 && board.key === positionKey(screenFen);
  if (board.relation === 'past' || board.path.length === 0) return false;
  const own = fenAfter(screenFen, board.path);
  return !!own && positionKey(own) === board.key;
}

/** What a teaching fact's mechanism is — data, never prose. `why` is the
 *  computed reason of a try (a refuter's words until that family returns
 *  data); `material` the ledger's words for what the line wins. */
export type Mechanism =
  | { kind: 'try-fails'; reply: string; why: string | null; material: string | null; mates: boolean }
  | { kind: 'attacks'; target: string }
  | { kind: 'threatens'; follow: string; mate: boolean };

export interface SentenceFact {
  /** The piece's square on the fact's own board, or the move (uci) — played
   *  from the screen — the fact is about. */
  who: { square: string } | { move: string };
  does: Mechanism;
  /** The consequence for the side, as a computed id. */
  soWhat: 'loses-the-game' | 'throws-the-win' | 'wins-material' | null;
  proof: { short: string | null; full: readonly string[] };
  pattern?: string | null;
  board: FactBoard;
  seat: Color;
}

declare const ANCHORED: unique symbol;
/** A fact anchored on the screen: the only shape the renderer writes. */
export type AnchoredFact = SentenceFact & { readonly [ANCHORED]: true; readonly ownFen: string };

/** Anchor a fact on the board on screen; null — never rendered — when its
 *  board is another board with no path to it. */
export function anchorSentenceFact(f: SentenceFact, screenFen: string): AnchoredFact | null {
  if (!boardReachable(f.board, screenFen)) return null;
  const own = f.board.relation === 'now' ? screenFen : fenAfter(screenFen, f.board.path);
  return own ? ({ ...f, ownFen: own } as AnchoredFact) : null;
}

/** Anchor a fact about a PAST board: `pastFen` is the board it was computed
 *  on, and its path must lead from it to the screen. */
export function anchorPastFact(f: SentenceFact, pastFen: string, screenFen: string): AnchoredFact | null {
  if (f.board.relation !== 'past' || f.board.path.length === 0 || positionKey(pastFen) !== f.board.key) return null;
  const reached = fenAfter(pastFen, f.board.path);
  if (!reached || positionKey(reached) !== positionKey(screenFen)) return null;
  return { ...f, ownFen: pastFen } as AnchoredFact;
}

/** ONE TENSE TABLE: relation × surface. */
export const TENSE: Record<FactRelation, Record<Surface, 'present' | 'past' | 'if' | 'after'>> = {
  now: { learn: 'present', read: 'present', chat: 'present', review: 'past' },
  past: { learn: 'past', read: 'past', chat: 'past', review: 'past' },
  line: { learn: 'after', read: 'after', chat: 'after', review: 'after' },
  try: { learn: 'if', read: 'if', chat: 'if', review: 'if' },
};

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** "your" / "their": the piece's colour ON THE FACT'S OWN BOARD against the
 *  seat. Null when no piece stands there. */
export function ownerOf(f: AnchoredFact, square: string): 'your' | 'their' | null {
  try { const p = new Chess(f.ownFen).get(square as Square); return p ? (p.color === f.seat ? 'your' : 'their') : null; } catch { return null; }
}

/** "your knight on e7", read off the fact's own board. */
export function pieceWords(f: AnchoredFact, square: string): string | null {
  try {
    const p = new Chess(f.ownFen).get(square as Square);
    return p ? `${p.color === f.seat ? 'your' : 'their'} ${NAME[p.type]} on ${square}` : null;
  } catch { return null; }
}

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

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const stemKey = (s: string): number => Array.from(s).reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** THE RENDERER: one anchored fact, one sentence (or a short run of
 *  sentences that state that one fact). It never adds, drops, merges or
 *  reorders facts — the decider has. */
export function renderSentenceFact(f: AnchoredFact, surface: Surface, screenFen: string): Rendered | null {
  const tense = TENSE[f.board.relation][surface];
  const d = f.does;
  if (d.kind === 'try-fails') {
    if (!('move' in f.who)) return null;
    const trySan = sanWords(screenFen, f.who.move);
    if (!trySan) return null;
    const mine = new Chess(screenFen).turn() === f.seat;
    const stem = stemKey(`${f.board.key}|${f.who.move}`);
    const lead = mine
      ? rotateStem([`${trySan} looks natural, but ${d.reply} meets it.`, `${trySan} is the obvious try, but ${d.reply} is the answer.`, `${trySan} is tempting, but ${d.reply} takes the sting out of it.`], stem)
      : rotateStem([`If they try ${trySan}, ${d.reply} meets it.`, `${trySan} would run into ${d.reply}.`], stem);
    // THE WHY BEFORE THE MATERIAL.
    const why = d.why ? `${cap(d.why.trim().replace(/[.\s]+$/, ''))}.` : null;
    const cost = d.mates ? `${trySan} loses the game.` : d.material ? `${mine ? 'They' : 'You'} win ${d.material} in the line.` : null;
    if (!why && !cost) return null;
    const text = [lead, why, cost].filter(Boolean).join(' ');
    return { spoken: text, shown: text, marks: { squares: [f.who.move.slice(2, 4)], arrows: [[f.who.move.slice(0, 2), f.who.move.slice(2, 4)]] } };
  }
  if (d.kind === 'attacks') {
    if (!('square' in f.who)) return null;
    const a = pieceWords(f, f.who.square);
    const t = pieceWords(f, d.target);
    if (!a || !t) return null;
    const first = pathWords(screenFen, f.board.path);
    const lead = tense === 'if' ? `If ${first ?? 'that'} is played, ${a}` : tense === 'after' ? `After ${first ?? 'the line'}, ${a}` : cap(a);
    const verb = tense === 'past' ? 'attacked' : tense === 'if' ? 'would attack' : 'attacks';
    const text = `${lead} ${verb} ${t}.`;
    return { spoken: text, shown: text, marks: { squares: [f.who.square, d.target], arrows: [[f.who.square, d.target]] } };
  }
  if (!('move' in f.who)) return null;
  const san = sanWords(screenFen, f.who.move);
  const follow = sanWords(f.ownFen, d.follow);
  if (!san || !follow) return null;
  const forcing = d.mate || isForcingThreat(f.ownFen, d.follow);
  const text = forcing ? `${san} threatens ${follow}${d.mate ? ', with mate to follow' : ''}.` : `${san} prepares ${follow}.`;
  return { spoken: text, shown: text, marks: { squares: [d.follow.slice(2, 4)], arrows: [[d.follow.slice(0, 2), d.follow.slice(2, 4)]] } };
}

/** ORPHAN LEADS: a spoken fact may not start by pointing outside itself. */
export const ORPHAN_LEAD = /^(?:It|This|That|These|Those|And|But)\b|^After this\b|^after this\b/;

// ── THE TRIES FAMILY (step 2a) ─────────────────────────────────────────────
// A tempting move refuted, returned as data by its computers
// (`standingRefutations`, the grouped "all fail the same way"), written here.

/** A try as data: the move, the reply that meets it, the reply's job, the
 *  reason (and the path to the board it is true on, when that is the board
 *  after the line), the material the line wins, and the result's shift. */
export interface TryData {
  san: string;
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
  /** The result's shift ("…throws the win"), its own sentence. */
  shift: string | null;
}

function tryLead(t: TryData): string {
  const { san, reply, mine, plan, stem } = t;
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
  return `After ${t.whyPath}, ${/^(?:[KQRBN][a-h1-8x]|O-O)/.test(why) ? why : why.replace(/^[A-Z](?=[a-z'’])/, (w) => w.toLowerCase())}`;
}

/** THE WHY BEFORE THE MATERIAL, then the result. */
function tryBody(t: TryData, subject: string): string[] {
  const end = t.mates ? (t.mine ? `${subject} loses the game.` : `${subject} loses them the game.`) : t.shift;
  // The material is the why's consequence — said when no result sentence
  // says the consequence already, and named by the try (a bare "They win a
  // bishop in the line" is the same sentence on every try).
  const material = t.material && (!end || !t.why) ? `${t.san} hands ${t.mine ? 'them' : 'you'} ${t.material} in the line.` : null;
  return [renderTryReason(t), material, end].filter((x): x is string => !!x);
}

/** One try, refuted: lead, the reply's job, the why, the material, the result.
 *  A reason that calls the try "It" names it: after "…, but X meets it" an
 *  "It" would point at the reply. */
export function renderTry(t: TryData): string {
  const why = t.why ? { ...t, why: t.why.replace(/^It\b/, t.san) } : t;
  return [tryLead(t), t.replyFollow, ...tryBody(why, t.replyFollow || t.why || t.material ? t.san : 'It')].filter(Boolean).join(' ');
}

/** Tries refuted for one reason (the decider grouped them): one sentence for
 *  the group, then the shared reason on its own board. */
export function renderTryGroup(sans: readonly string[], replies: readonly string[], shared: TryData): string {
  const two = sans.length === 2;
  // The shared reason is about every try in the group: where it names the
  // first try, it names "each" of them.
  const each = two ? 'either' : 'each';
  const why = shared.why ? shared.why.split(`…${shared.san}`).join(each).split(shared.san).join(each).replace(/^(either|each)\b/, (w) => cap(w)) : null;
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
