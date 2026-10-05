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
// A LEAF: no imports beyond the move speller.
import { sayMoveNoun } from './spokenMove';
import { countWords } from '../utils/countWords';


export interface IdentityFacts {
  side: 'w' | 'b';
  defining: string;
  provokes: null | { reply: string; share: number; kind: 'pawn-hits' | 'invites-trade' | 'takes-offered-pawn' | 'capture'; piece?: string; square?: string; provoked?: boolean };
  aims: Array<{ kind: 'locked-centre' | 'isolated-d-pawn' | 'fianchetto'; side?: 'w' | 'b'; advanced?: 'w' | 'b'; squares: string[] }>;
  gambit: null | { side: 'w' | 'b'; down: number; forPlies: number };
  theoryPlies: number;
  forcing: number;
  famous: Array<{ white: string; black: string; year: number; event: string | null }>;
}
type IdentityMap = Record<string, IdentityFacts>;

let facts: IdentityMap | null = null;
let loading: Promise<void> | null = null;

/** Load once (chat awaits it; Learn warms it and reads when ready). */
export function loadOpeningIdentity(): Promise<void> {
  if (facts || typeof fetch !== 'function') return Promise.resolve();
  loading ??= fetch('/data/opening-identity.json')
    .then((r) => (r.ok ? r.json() as Promise<IdentityMap> : null))
    .then((j) => { if (j) facts = j; })
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

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn' };
const moves = (plies: number): number => Math.ceil(plies / 2);
const surname = (s: string): string => (s.includes(',') ? s.split(',')[0] : s.split(' ').slice(-1)[0]).trim();

export interface IdentityLine { text: string; squares: string[]; key: string }

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

export function openingIdentityLine(name: string, student: 'w' | 'b', voice: 'seat' | 'demo'): IdentityLine | null {
  if (WAYPOINT.test(name.trim())) return null;
  const hit = identityFor(name);
  if (!hit) return null;
  const f = hit.facts;
  const colour = (c: 'w' | 'b'): string => (c === 'w' ? 'White' : 'Black');
  const who = (c: 'w' | 'b', cap = false): string => {
    if (voice === 'demo') return colour(c);
    const s = c === student ? 'you' : 'they';
    return cap ? s[0].toUpperCase() + s.slice(1) : s;
  };
  // "they answer" / "White answers": a colour takes the third-person verb.
  const v = (base: string): string => (voice === 'demo' ? (base.endsWith('y') && !/[aeiou]y$/.test(base) ? `${base.slice(0, -1)}ies` : `${base}s`) : base);
  const whose = (c: 'w' | 'b'): string => (voice === 'demo' ? `${colour(c)}'s` : c === student ? 'your' : 'their');
  const other: 'w' | 'b' = f.side === 'w' ? 'b' : 'w';
  const out: string[] = [];
  const squares: string[] = [];

  const p = f.provokes;
  if (p) {
    const reply = sayMoveNoun(p.reply, null);
    const on = p.reply.replace(/[+#]/g, '').slice(-2);
    if (p.kind === 'pawn-hits' && p.piece && p.square) {
      const target = `${whose(f.side)} ${PIECE[p.piece] ?? 'piece'} on ${p.square}`;
      out.push(p.provoked
        ? `It is built to provoke: in ${p.share}% of master games ${who(other)} ${v('answer')} with ${reply}, a centre pawn thrown forward at ${target}.`
        : `The usual answer, in ${p.share}% of master games, is ${reply}, putting the question to ${target}.`);
      squares.push(p.square);
    } else if (p.kind === 'invites-trade') {
      out.push(`It challenges the centre at once: in ${p.share}% of master games ${who(other)} ${v('take')} on ${on}, and the pawn is taken back.`);
      squares.push(on);
    } else if (p.kind === 'takes-offered-pawn') {
      out.push(`It offers a pawn, and in ${p.share}% of master games ${who(other)} ${v('take')} it on ${on}.`);
      squares.push(on);
    }
  }
  if (f.gambit) {
    const n = f.gambit.down;
    const amount = countWords(n);
    out.push(`In the main line ${who(f.gambit.side)} ${v('stay')} ${amount} down for at least ${moves(f.gambit.forPlies)} moves, playing for time instead of material.`);
  }
  for (const a of f.aims) {
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
    out.push(`It is sharp and theory-heavy: the master line stays common for ${moves(f.theoryPlies)} moves, and ${f.forcing}% of them are captures or checks.`);
  } else if (f.theoryPlies >= 14 && f.forcing <= 10) {
    out.push(`It is a quiet opening: ${moves(f.theoryPlies)} moves of master theory with almost no captures, so understanding the plans matters more than memory.`);
  }
  if (f.famous.length) {
    const g = f.famous.slice(0, 2).map((x) => `${surname(x.white)} against ${surname(x.black)}${x.event ? `, ${x.event.replace(/\s*\d{4}\s*$/, '')}` : ''} ${x.year}`);
    out.push(`It has been played at the top level — ${g.join('; ')}.`);
  }
  if (!out.length) return null;
  return { text: out.join(' '), squares, key: `opening-identity:${hit.name}` };
}
