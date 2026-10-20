// THE OPENING'S IDENTITY (David 2026-09-30: "why it exists, what it's trying to
// provoke, and 'this line is sharp' — can we add these computers?"). The facts
// are computed offline by `scripts/build-opening-identity.mjs` from the Lichess
// opening DB, the masters position index and the model games; nothing here is
// authored. This file only RENDERS them, seat-correct, at speak time:
//   provokes — what the defining move invites, with the master share
//   aims     — the structure the main master line reaches
//   gambit   — a material imbalance that LASTS in the main line (how long)
//   sharp    — forcing rate + theory depth of the main line
//   famous   — real over-the-board master games that reached it
// Fetched lazily, never on the move path (the `openingPositions` pattern).
// A LEAF: no imports beyond the move speller and the one /data/ loader
// (dataFile reaches IndexedDB only by a lazy import).
import { openSentence } from '../utils/openSentence';
import { sayMoveNoun } from './spokenMove';
import { countWords } from '../utils/countWords';
import { shareAdverb } from '../utils/shareWords';
import type { MastersPlanRead } from './mastersPlanRead';
import { isOpenableModelGame } from './reviewStoryGame';
import { loadDataJson } from './dataFile';


export interface IdentityFacts {
  side: 'w' | 'b';
  defining: string;
  /** `by` is the side whose move provokes the reply; `from` names the family
   *  the fact was inherited from, when this line's own move has none (the
   *  build proves the line played the reply first). */
  provokes: null | { reply: string; share: number; kind: 'pawn-hits' | 'invites-trade' | 'takes-offered-pawn' | 'capture'; by?: 'w' | 'b'; from?: string; piece?: string; square?: string; provoked?: boolean;
    /** A trade: the piece that takes back, and the masters' next move when it
     *  attacks that piece (a tempo they gain). Absent in a file built before
     *  2026-10-14. */
    backPiece?: string; hitBy?: string };
  aims: Array<{ kind: 'locked-centre' | 'isolated-d-pawn' | 'fianchetto'; side?: 'w' | 'b'; advanced?: 'w' | 'b'; squares: string[] }>;
  gambit: null | { side: 'w' | 'b'; down: number; forPlies: number };
  theoryPlies: number;
  forcing: number;
  famous: Array<{ white: string; black: string; year: number; event: string | null }>;
  /** THE LINE'S MASTER PLAN at its own position (`mastersPlanRead`, run by the
   *  builder) — each side's break and placement, so Learn can say it without
   *  loading the 37 MB masters file. Absent in a file built before 2026-10-14. */
  plan?: MastersPlanRead | null;
}
type IdentityMap = Record<string, IdentityFacts>;

let facts: IdentityMap | null = null;
let loading: Promise<void> | null = null;

/** Load once (chat awaits it; Learn warms it and reads when ready). */
export function loadOpeningIdentity(): Promise<void> {
  if (facts || typeof fetch !== 'function') return Promise.resolve();
  // Through the one /data/ loader: the native bundle strips public/data, so
  // a bare fetch 404s on iOS and the opening story never loads (2026-10-20).
  loading ??= loadDataJson('/data/opening-identity.json')
    .then((j) => { if (j) facts = j as IdentityMap; })
    .catch(() => undefined)
    .finally(() => { loading = null; });
  return loading;
}
export function warmOpeningIdentity(): void { void loadOpeningIdentity(); }

/** For tests and callers that already hold the map. */
export function setOpeningIdentity(map: IdentityMap | null): void { facts = map; }

/** The facts for this exact name, else the nearest named parent ("Sicilian
 *  Defense: Najdorf Variation, English Attack" → "…: Najdorf Variation" →
 *  "Sicilian Defense"). Null when not loaded or nothing is known. */
export function identityFor(name: string): { name: string; facts: IdentityFacts } | null {
  if (!facts) { warmOpeningIdentity(); return null; }
  let n = name.trim();
  for (;;) {
    const hit = facts[n];
    if (hit) return { name: n, facts: hit };
    const comma = n.lastIndexOf(',');
    if (comma > 0) { n = n.slice(0, comma).trim(); continue; }
    const colon = n.indexOf(':');
    if (colon > 0) { n = n.slice(0, colon).trim(); continue; }
    return null;
  }
}

/** The master plan for this line, else the nearest named parent's (the game is
 *  still in that parent's line). Null when not loaded or no plan is known. */
export function planFor(name: string): MastersPlanRead | null {
  if (!facts) { warmOpeningIdentity(); return null; }
  let n = name.trim();
  for (;;) {
    const p = facts[n]?.plan;
    if (p) return p;
    const comma = n.lastIndexOf(',');
    if (comma > 0) { n = n.slice(0, comma).trim(); continue; }
    const colon = n.indexOf(':');
    if (colon > 0) { n = n.slice(0, colon).trim(); continue; }
    return null;
  }
}

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn' };
const moves = (plies: number): number => Math.ceil(plies / 2);
const surname = (s: string): string => (s.includes(',') ? s.split(',')[0] : s.split(' ').slice(-1)[0]).trim();

interface IdentityLine { text: string; squares: string[]; key: string }

/** The board the line is said over while the student PLAYS it (Learn). Null
 *  when the opening is described rather than played (chat, a lesson, a
 *  review). On a live board each clause is said only when it is true now and
 *  names no move of the student's still to come (LEARN NAMES NO MOVE UNASKED):
 *  a clause whose student move is still ahead holds the whole line, a clause
 *  the board has made false is dropped. Injected so this file stays a leaf. */
export interface LiveIdentityBoard {
  pieceAt(square: string): { color: 'w' | 'b'; type: string } | null;
  /** Could `side` play `san` here, whoever is to move? */
  canPlay(san: string, side: 'w' | 'b'): boolean;
}

/** Where a fianchettoed bishop starts, by the square it is aimed at. */
const FIANCHETTO_HOME: Record<string, string> = { g7: 'f8', b7: 'c8', g2: 'f1', b2: 'c1' };

/**
 * One spoken paragraph about what the opening IS, from the student's seat.
 * `voice`: 'seat' = you/your (the student's own game — Learn, chat);
 *          'demo' = White/Black (a lesson or Watch the student is not playing).
 * Each sentence is one computed fact; a fact that is absent is simply not said.
 */
/** Names that are WAYPOINTS, not openings: what the detector says before an
 *  opening exists ("King's Pawn Game" after 1.e4 e5). No identity to teach. */
// "King's Knight Opening" is 1.e4 e5 2.Nf3 — the Ruy, the Italian, the Scotch
// and the Petrov all pass through it, so its "master line" is one of theirs
// (walk 2026-10-02: "a quiet opening … almost no captures" said of a Scotch).
const WAYPOINT = /^(?:King's Pawn Game|Queen's Pawn Game|Indian Defense|King's Pawn|Queen's Pawn|King's Knight Opening)(?::|$)/;
export function isWaypointOpening(name: string): boolean { return WAYPOINT.test(name.trim()); }

export function openingIdentityLine(name: string, student: 'w' | 'b', voice: 'seat' | 'demo', live: LiveIdentityBoard | null): IdentityLine | null {
  if (WAYPOINT.test(name.trim())) return null;
  const hit = identityFor(name);
  if (!hit) return null;
  const f = hit.facts;
  const colour = (c: 'w' | 'b'): string => (c === 'w' ? 'White' : 'Black');
  const who = (c: 'w' | 'b', cap = false): string => {
    if (voice === 'demo') return colour(c);
    const s = c === student ? 'you' : 'they';
    return cap ? openSentence(s) : s;
  };
  // "they answer" / "White answers": a colour takes the third-person verb.
  const v = (base: string): string => (voice === 'demo' ? (base.endsWith('y') && !/[aeiou]y$/.test(base) ? `${base.slice(0, -1)}ies` : `${base}s`) : base);
  const whose = (c: 'w' | 'b'): string => (voice === 'demo' ? `${colour(c)}'s` : c === student ? 'your' : 'their');
  const out: string[] = [];
  const squares: string[] = [];
  // A clause that still names a move of the student's to come: the line waits.
  let pending = false;
  const has = (sq: string, color: 'w' | 'b', type: string): boolean => {
    const x = live?.pieceAt(sq);
    return !!x && x.color === color && x.type === type;
  };

  const p = f.provokes;
  if (p) {
    // The side that asked the question — this line's own move, or the
    // family's when the fact was inherited (a variation can belong to the
    // other colour: the Scandinavian's Lasker Variation is White's h3).
    // A file built before 2026-10-07 has no `by` and inherits nothing, so the
    // line's own side is right for it (a cached copy can outlive a deploy).
    const by = p.by ?? f.side;
    const other: 'w' | 'b' = by === 'w' ? 'b' : 'w';
    const reply = sayMoveNoun(p.reply, null);
    const on = p.reply.replace(/[+#]/g, '').slice(-2);
    // An inherited fact is about the FAMILY's move, so it names the family —
    // by its own last name ("Bird Opening: From's Gambit" → "From's Gambit"),
    // with no article before a possessive.
    const family = p.from ? (p.from.split(/[:,]/).pop() ?? p.from).trim() : null;
    const it = family ? (/^\S+['’]s\b/.test(family) ? family : `The ${family}`) : 'It';
    // On a live board: the target must still stand there, and a reply that
    // is the student's own move must already be behind them.
    const hitsTrue = !live || (!!p.piece && !!p.square && has(p.square, by, p.piece));
    const hitsAhead = p.kind === 'pawn-hits' && !!live && hitsTrue && other === student && live.canPlay(p.reply, student);
    // A trade is said once the board shows it done: the side that invited it
    // has taken back on the square. Until then one of its moves is the
    // student's, still to come.
    const backType = p.backPiece && p.backPiece !== 'p' ? p.backPiece : 'p';
    const traded = !live || has(on, by, backType);
    const tradeAhead = p.kind === 'invites-trade' && !!live && !traded && live.pieceAt(on) !== null;
    // An offered pawn the student takes waits until it is taken.
    const taken = !live || live.pieceAt(on)?.color === other;
    const takeAhead = p.kind === 'takes-offered-pawn' && !!live && !taken && other === student && live.pieceAt(on) !== null;
    if (hitsAhead || tradeAhead || takeAhead) pending = true;
    if (p.kind === 'pawn-hits' && p.piece && p.square && hitsTrue && !hitsAhead) {
      const target = `${whose(by)} ${PIECE[p.piece] ?? 'piece'} on ${p.square}`;
      out.push(p.provoked
        ? `${it} is built to provoke: ${who(other)} ${shareAdverb(p.share)} ${v('answer')} with ${reply}, a centre pawn thrown forward at ${target}.`
        : `The usual answer is ${reply}, putting the question to ${target}.`);
      squares.push(p.square);
    } else if (p.kind === 'invites-trade' && traded) {
      // THE TRADE'S COST IS ITS WHY (Learn audit 2026-10-14: "…and the pawn is
      // taken back" said what, never why it matters). Computed by the builder
      // from the masters' own lines: who takes back with what, and the move
      // that then hits it.
      const backName = p.backPiece && p.backPiece !== 'p' ? PIECE[p.backPiece] : null;
      const back = backName ? `${who(by)} ${v('take')} back with the ${backName}` : 'the pawn is taken back';
      const tempo = backName && p.hitBy && !(live && other === student && live.canPlay(p.hitBy, student))
        ? ` The ${backName} is out early, so ${who(other)} ${v('gain')} time hitting it with ${sayMoveNoun(p.hitBy, null)}.`
        : '';
      out.push(`${it} challenges the centre at once: ${who(other)} ${shareAdverb(p.share)} ${v('take')} on ${on}, and ${back}.${tempo}`);
      squares.push(on);
    } else if (p.kind === 'takes-offered-pawn' && (taken || other !== student)) {
      out.push(`${it} offers a pawn, and ${who(other)} ${shareAdverb(p.share)} ${v('take')} it on ${on}.`);
      squares.push(on);
    }
  }
  if (f.gambit) {
    const n = f.gambit.down;
    const amount = countWords(n);
    out.push(`In the main line ${who(f.gambit.side)} ${v('stay')} ${amount} down for at least ${moves(f.gambit.forPlies)} moves, playing for time instead of material.`);
  }
  for (const a of f.aims) {
    // A pawn square or a bishop square of the student's is a move of theirs
    // until it is played: said live only once the board shows it.
    if (live && a.kind === 'locked-centre' && !a.squares.every((sq) => live.pieceAt(sq)?.type === 'p')) continue;
    if (live && a.kind === 'fianchetto' && a.side === student && !has(a.squares[0], student, 'b')) {
      if (has(FIANCHETTO_HOME[a.squares[0]] ?? '', student, 'b')) pending = true;
      continue;
    }
    if (a.kind === 'locked-centre') {
      out.push(`The main line locks the centre, pawns on ${a.squares[0]} and ${a.squares[1]} facing each other.`);
      squares.push(...a.squares);
    } else if (a.kind === 'isolated-d-pawn' && a.side) {
      out.push(`The main line leaves ${who(a.side)} with an isolated pawn on ${a.squares[0]}.`);
      squares.push(a.squares[0]);
    } else if (a.kind === 'fianchetto' && a.side) {
      out.push(`${voice === 'demo' ? colour(a.side) : who(a.side, true)} ${v('put')} the bishop on ${a.squares[0]}, on the long diagonal.`);
      squares.push(a.squares[0]);
    }
  }
  if (f.theoryPlies >= 12 && f.forcing >= 30) {
    out.push(`It is sharp and theory-heavy: the master line stays common for ${moves(f.theoryPlies)} moves, and ${f.forcing >= 50 ? 'most' : 'a lot'} of them are captures or checks.`);
  } else if (f.theoryPlies >= 14 && f.forcing <= 10) {
    out.push(`It is a quiet opening: ${moves(f.theoryPlies)} moves of master theory with almost no captures, so understanding the plans matters more than memory.`);
  }
  // A GAME REFERENCE IS ONE THE STUDENT CAN OPEN (lead 2026-10-20: "It has
  // been played at the top level — Karthikeyan against Grebnev" teaches
  // nothing): only the top-level games that are model games of this line.
  const openable = f.famous.filter((x) => isOpenableModelGame(hit.name, x.white, x.black, x.year));
  if (openable.length) {
    const g = openable.slice(0, 2).map((x) => `${surname(x.white)} against ${surname(x.black)}${x.event ? `, ${x.event.replace(/\s*\d{4}\s*$/, '')}` : ''} ${x.year}`);
    out.push(`It has been played at the top level — ${g.join('; ')}, in this line's model games.`);
  }
  if (pending || !out.length) return null;
  return { text: out.join(' '), squares, key: `opening-identity:${hit.name}` };
}

/**
 * THE OPENING'S IDEA, FROM ITS OWN DEFINING MOVE (walk 5: "what's the idea of
 * this opening?" on the Italian got a plan answer about h3 — the Italian's
 * stored identity has no aims, so nothing said what it is about). The
 * defining move is found where it was played in this game, and the move-reason
 * computer says what it does there ("Bc4 — f7 sits right beside their king").
 * `why` is injected so this leaf never imports the deliberation stack.
 */
export function definingMoveIdea(
  name: string,
  sans: readonly string[],
  student: 'w' | 'b',
  why: (fenBefore: string, san: string, mover: 'w' | 'b', prevSan: string | null) => string | null,
  ChessCtor: new () => { move(san: string): unknown; fen(): string },
): string | null {
  // The family's move first (the Italian's Bc4), then the variation's own
  // when it is a different move (the Giuoco Piano's ...Bc5).
  const family = name.split(':')[0].trim();
  const out: string[] = [];
  const said = new Set<string>();
  for (const n of family === name.trim() ? [name] : [family, name]) {
    const hit = identityFor(n);
    if (!hit?.facts.defining) continue;
    const def = hit.facts.defining.replace(/[+#]/g, '');
    if (said.has(`${hit.facts.side}${def}`)) continue;
    said.add(`${hit.facts.side}${def}`);
    const c = new ChessCtor();
    for (let i = 0; i < sans.length; i++) {
      const mover: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';
      const fenBefore = c.fen();
      if (mover === hit.facts.side && sans[i].replace(/[+#]/g, '') === def) {
        const w = why(fenBefore, sans[i], mover, i > 0 ? sans[i - 1] : null);
        if (w) {
          const owner = mover === student ? 'your' : 'their';
          const lead = out.length === 0 ? `The key move is ${owner === 'your' ? 'yours' : 'theirs'}, ${sans[i]}` : `In the ${hit.name.split(/[:,]/).pop()?.trim() ?? hit.name}, ${owner} move ${sans[i]} matters too`;
          out.push(`${lead} — it ${w.replace(/^it /, '')}.`);
        }
        break;
      }
      try { c.move(sans[i]); } catch { break; }
    }
  }
  return out.length ? out.join(' ') : null;
}
