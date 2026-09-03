import canonicalOpenings from '../data/openings-lichess.json';
import extendedOpenings from '../data/openings-lichess-extended.json';
import repertoireData from '../data/repertoire.json';
import type { DetectedOpening, OpeningVariation } from '../types';
import { buildVariationTabs } from './variationTabs';
import { MAX_SIBLING_BRANCHES } from '../utils/featureFlags';
// @ts-expect-error — plain-JS shared metric, no type decls (also run by node)
import { reachesMiddlegame as reachesMiddlegameRaw } from '../data/variationMiddlegameDepth.shared.mjs';

/** Typed view over the shared plain-JS `reachesMiddlegame` metric so
 *  type-aware lint rules don't treat its result as `any`. */
const reachesMiddlegame = reachesMiddlegameRaw as (pgn: string) => {
  pass: boolean;
  plies: number;
  wCastle: boolean;
  bCastle: boolean;
  wDev: number;
  bDev: number;
};

/** Minimal shape of a curated repertoire opening (repertoire.json). The
 *  coach line picker + lesson generator read the SAME curated variations
 *  the opening detail tab shows, so every picker matches the opening tab
 *  (David 2026-05-22). */
interface CuratedRepertoireOpening {
  id: string;
  name: string;
  eco?: string;
  variations?: OpeningVariation[];
}
const CURATED_REPERTOIRE = repertoireData as unknown as CuratedRepertoireOpening[];

interface OpeningEntry {
  eco: string;
  name: string;
  pgn: string;
}

/** Canonical Lichess named-opening DB + curator-extended deeper PGNs.
 *  Both arrays follow the EXACT same `{ eco, name, pgn }` shape so
 *  every existing function (trie build, name resolution, longest-
 *  PGN reducers, etc.) treats them uniformly. Extended entries have
 *  the same eco + name as their canonical counterpart but a longer
 *  PGN — the existing "longest matching entry wins" logic naturally
 *  prefers the deeper line for `findShortestCanonicalPgn` callers
 *  that walk to middlegame. When `openings-lichess-extended.json` is
 *  empty (e.g. before the mining script has run), behavior is
 *  identical to canonical-only. User: "Do not break my app!!
 *  Everything is coded in the exact same way it is now!" — this
 *  merge respects that contract.
 *
 *  The position-indexed masters DB used by the coach-grounding
 *  pipeline is a SEPARATE artefact at
 *  `public/data/openings-masters-db.json`, fetched on demand by
 *  `masterPlayLookup` — it doesn't live in this file. */
const extendedAsArray: OpeningEntry[] = Array.isArray(extendedOpenings)
  ? (extendedOpenings as OpeningEntry[])
  : [];
const openingsData: OpeningEntry[] = [
  ...(canonicalOpenings as OpeningEntry[]),
  ...extendedAsArray,
];

interface TrieNode {
  children: Map<string, TrieNode>;
  opening: OpeningEntry | null;
}

let cachedTrie: TrieNode | null = null;

/** Entries shorter than this AND with no DB extension are useless for
 *  teaching: there's nothing to walk through past the namesake move.
 *  Production audit (build 2fcec7e+): the Gunderam Gambit walkthrough
 *  ended at 4 plies because the DB literally only carries
 *  `e4 e5 Nf3 c6` for that name. The user's call: hide every terminal
 *  entry at this depth or shallower from name resolution, line
 *  pickers, search, and sibling-extension forks. The data file is
 *  untouched — `findOpeningByPgnPrefix` and `detectOpening` stay
 *  unfiltered so we still recognize the canonical name when a played
 *  position lands inside one of these short terminals. */
const TEACHABLE_PLY_THRESHOLD = 8;

let _terminalShortPgns: Set<string> | null = null;

function getTerminalShortPgns(): Set<string> {
  if (_terminalShortPgns) return _terminalShortPgns;
  const entries = openingsData;
  // Walk every entry's strict PGN prefixes once — any prefix we see
  // is "extended" by at least one DB entry, so it has children.
  const extendedPrefixes = new Set<string>();
  for (const e of entries) {
    const moves = e.pgn.split(/\s+/).filter(Boolean);
    for (let i = 1; i < moves.length; i++) {
      extendedPrefixes.add(moves.slice(0, i).join(' '));
    }
  }
  const result = new Set<string>();
  for (const e of entries) {
    const plies = e.pgn.split(/\s+/).filter(Boolean).length;
    if (plies > TEACHABLE_PLY_THRESHOLD) continue;
    if (!extendedPrefixes.has(e.pgn)) result.add(e.pgn);
  }
  _terminalShortPgns = result;
  return result;
}

function isTeachableEntry(e: OpeningEntry): boolean {
  return !getTerminalShortPgns().has(e.pgn);
}

/** Public re-export of the teachable-entry test. Other modules — the
 *  fuzzy matcher in particular — need the same "this entry is rich
 *  enough to teach" decision so the picker can include the canonical
 *  bare parent (e.g. "Danish Gambit," 5 plies but with rich sub-
 *  variation children) alongside its named sub-variations. Audit
 *  2026-05-19 (Bug C): the fuzzy matcher was using a stricter
 *  ply-count-only filter that hid "Danish Gambit" from the picker
 *  while keeping its sub-variations, so the user who typed "danish
 *  gambit" got a picker missing the canonical parent. */
export function isTeachable(e: OpeningEntry): boolean {
  return isTeachableEntry(e);
}

function buildTrie(entries: OpeningEntry[]): TrieNode {
  const root: TrieNode = { children: new Map(), opening: null };

  for (const entry of entries) {
    const moves = entry.pgn.split(/\s+/).filter(Boolean);
    let node = root;

    for (const move of moves) {
      if (!node.children.has(move)) {
        node.children.set(move, { children: new Map(), opening: null });
      }
      const child = node.children.get(move);
      if (!child) break;
      node = child;
    }
    // Always overwrite — longer PGN entries that share a prefix will
    // set their own node deeper in the trie, so the deepest match wins.
    node.opening = entry;
  }

  return root;
}

function getTrie(): TrieNode {
  if (!cachedTrie) {
    cachedTrie = buildTrie(openingsData);
  }
  return cachedTrie;
}

/**
 * Detect the opening from a list of SAN moves (e.g. from chess.js .history()).
 * Returns the longest matching opening, or null if no match found.
 */
export function detectOpening(moveHistory: string[]): DetectedOpening | null {
  const trie = getTrie();
  let node = trie;
  let lastMatch: { opening: OpeningEntry; plyCount: number } | null = null;

  for (let i = 0; i < moveHistory.length; i++) {
    const move = moveHistory[i];
    const child = node.children.get(move);
    if (!child) break;

    node = child;
    if (node.opening) {
      lastMatch = { opening: node.opening, plyCount: i + 1 };
    }
  }

  if (!lastMatch) return null;

  return {
    eco: lastMatch.opening.eco,
    name: lastMatch.opening.name,
    plyCount: lastMatch.plyCount,
  };
}

/** A transposition SIGNATURE: a named opening identified by the SET of moves
 *  that define it, regardless of order. The strict trie (`detectOpening`) only
 *  matches the exact move order the DB stores, so a game that TRANSPOSES into a
 *  named opening by a different order (the Grand Prix reached via 2…g6 before
 *  …Nc6, so the game never occupies the DB's `…Nc6 f4` terminal position)
 *  resolves only to the coarse parent ("Sicilian: Closed") — never its real
 *  name ("Grand Prix Attack").
 *
 *  Each signature is GROUNDED, not invented (G3): both the `name` and the
 *  defining `moves` come from a real Lichess DB entry (`dbPgn`), validated at
 *  module load. The only relaxation is move ORDER — if a game played every one
 *  of the signature's defining SANs (any order), it structurally IS that
 *  opening. A signature only fires to REFINE a coarser exact match (a strict
 *  prefix of the signature's name), never to override an already-specific one. */
interface TranspositionSignature {
  name: string;
  eco: string;
  /** The DB pgn this signature was derived from — validated to exist + to
   *  contain every `defining` move, so the name is never fabricated. */
  dbPgn: string;
  /** The order-independent defining SANs (White's setup that names the line). */
  defining: string[];
}

const RAW_SIGNATURES: TranspositionSignature[] = [
  // The Grand Prix Attack is White's f4 thrust in the Nc3 Sicilian — named the
  // moment f4 appears regardless of whether Black played …Nc6 or …g6 first
  // (Naroditsky names it "Grand Prix attack" on f4). DB: B23.
  { name: 'Sicilian Defense: Grand Prix Attack', eco: 'B23', dbPgn: 'e4 c5 Nc3 Nc6 f4', defining: ['e4', 'c5', 'Nc3', 'f4'] },
];

/** Validate each signature against the DB at load: the name+pgn must exist and
 *  the pgn must contain every defining move. A bad signature is dropped (never
 *  ships a fabricated name). */
let _validSignatures: TranspositionSignature[] | null = null;
function getSignatures(): TranspositionSignature[] {
  if (_validSignatures) return _validSignatures;
  _validSignatures = RAW_SIGNATURES.filter((sig) => {
    const entry = openingsData.find((e) => e.pgn === sig.dbPgn && e.name === sig.name);
    if (!entry) return false;
    const pgnMoves = new Set(entry.pgn.split(/\s+/).filter(Boolean));
    return sig.defining.every((m) => pgnMoves.has(m));
  });
  return _validSignatures;
}

/**
 * Transposition-aware opening name. Returns the strict trie match, but REFINES
 * it to a more specific named line when the game transposed into one (every
 * defining move of a validated signature was played, any order). Every name is
 * a real Lichess DB entry (G3) — only move order is relaxed. The signature only
 * fires when it refines a coarser exact match whose name is a prefix of the
 * signature's (so it deepens the name, never contradicts it).
 */
export function detectOpeningTranspositional(moveHistory: string[]): DetectedOpening | null {
  const exact = detectOpening(moveHistory);
  const played = new Set(moveHistory);
  let best: DetectedOpening | null = exact;
  let bestSpecificity = exact ? exact.name.length : 0;
  for (const sig of getSignatures()) {
    if (!sig.defining.every((m) => played.has(m))) continue;
    // Only refine a coarser match: the exact name must be a prefix of (or absent
    // vs) the signature's name, so we deepen "Sicilian: Closed" → "…: Grand Prix
    // Attack", never overwrite an unrelated specific name.
    if (exact && !sig.name.startsWith(exact.name.split(':')[0])) continue;
    if (sig.name.length > bestSpecificity) {
      best = { eco: sig.eco, name: sig.name, plyCount: moveHistory.length };
      bestSpecificity = sig.name.length;
    }
  }
  return best;
}

/**
 * Check if the current move sequence is still within known opening theory.
 */
export function isStillInOpening(moveHistory: string[]): boolean {
  const trie = getTrie();
  let node = trie;

  for (const move of moveHistory) {
    const child = node.children.get(move);
    if (!child) return false;
    node = child;
  }

  return node.children.size > 0;
}

/**
 * Given an opening name (e.g. "French Defense"), find the main-line PGN moves.
 * Returns the longest (most specific) matching line as an array of SAN moves,
 * or null if no match. If `preferMainLine` is true (default), picks the
 * canonical shortest match (e.g. "e4 e6" for French Defense) to start the
 * opening and then the longest continuation to guide play deeper.
 */
/** Normalize an opening-name string for tolerant matching:
 *    - lowercase
 *    - strip diacritics (Réti → reti, Grünfeld → grunfeld)
 *    - strip apostrophes (King's → kings)
 *    - replace hyphens with spaces (Caro-Kann → caro kann)
 *    - collapse whitespace
 *  Production audit (build c081450) caught 27 of 116 legitimate
 *  user inputs being rejected by pre-flight because the DB names
 *  use canonical apostrophes / diacritics / hyphens but users
 *  typically don't. This normalization makes the match tolerant. */
function normalizeNameForMatch(s: string): string {
  return s
    .normalize('NFKD')                  // decomposes Réti → R + e + combining
    .replace(/[̀-ͯ]/g, '')    // strips combining diacritical marks
    .toLowerCase()
    // BEFORE stripping all apostrophes: kill the possessive 's so
    // "King's Gambit" / "Bird's Opening" / "Alekhine's Defense" all
    // collapse to forms that match the DB's apostrophe-less or
    // apostrophe-ful entries either way.
    .replace(/[‘’'`]s\b/g, '')
    .replace(/[‘’'`]/g, '')   // remaining apostrophes (straight + curly)
    .replace(/-/g, ' ')                 // hyphens to space
    // DB names are punctuated ("Vienna Game: Vienna Gambit, Main Line"); people
    // type them flat ("vienna gambit main line"). Leaving the commas and colons
    // in meant the flat form was not a substring of the punctuated one, so a
    // name the DB HAS resolved to null — David 2026-08-02 asked for the Vienna
    // Gambit main line and was told there was no grounded data for it.
    .replace(/[,:;./]/g, ' ')
    .replace(/\s+/g, ' ')               // collapse whitespace
    .trim()
    // British spellings, folded on BOTH sides so the DB's American names match
    // what people type. "Philidor Defence" and "Caro-Kann Defence" resolved to
    // null before this — the DB has both, spelled the other way.
    .replace(/\bdefence\b/g, 'defense')
    .replace(/\bcentre\b/g, 'center')
    .replace(/\bmanoeuvre\b/g, 'maneuver');
}

/** SAN moves a query names to pin down WHICH line it means — "the Vienna
 *  Gambit main line with Qf3", "the Bg5 line". People identify a variation by
 *  its defining move at least as often as by its book name (the Qf3 line's DB
 *  name is "Paulsen Attack", which nobody types), so the move has to be a way
 *  in. Deliberately narrow: piece moves, captures and castling only — a bare
 *  "e4"-shaped token is as likely to be part of a name or stray prose. */
const NAMED_SAN = /\b(?:O-O(?:-O)?|[KQRBNkqrbn][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b/gi;

/** People type "qf3", the DB stores "Qf3" — piece letter up, squares down. */
function canonicalizeSan(raw: string): string {
  if (/^O-O(-O)?$/i.test(raw)) return raw.toUpperCase();
  return /^[a-h]x/i.test(raw) ? raw.toLowerCase() : raw[0].toUpperCase() + raw.slice(1).toLowerCase();
}

/** Connector words left dangling once the SAN is lifted out of a query
 *  ("…main line with Qf3" → "…main line with"). Trailing only — "with" is a
 *  real part of "Vienna Gambit, with Max Lange Defense". */
const TRAILING_CONNECTORS = /\s+(?:with|using|via|featuring|and|plus|,)\s*$/i;

/** Token-set match: does `target` contain every meaningful token
 *  from `query`? Used as the word-order-insensitive fallback.
 *  "Najdorf Sicilian" → tokens [najdorf, sicilian] both appear in
 *  "sicilian defense: najdorf variation" (tokens [sicilian, defense,
 *  najdorf, variation]). 2-letter tokens dropped to avoid false
 *  positives on "of", "to", etc. */
function tokensMatchTarget(query: string, target: string): boolean {
  const qNorm = normalizeNameForMatch(query);
  const tNorm = normalizeNameForMatch(target);
  const qTokens = qNorm.split(' ').filter((t) => t.length >= 3);
  if (qTokens.length === 0) return false;
  // Reject token sets composed entirely of stopwords / common chat
  // noise — see RESOLVER_STOPWORDS for the rationale.
  if (qTokens.every((t) => RESOLVER_STOPWORDS.has(t))) return false;
  const tTokens = new Set(tNorm.split(' '));
  return qTokens.every((t) => tTokens.has(t));
}

/** Short tokens that should NEVER be allowed to canonicalize to an
 *  opening name via substring / token-set match. Audit 2026-05-19
 *  (Bug D): `resolveOpeningEntry("it")` returned `Italian Game` via
 *  substring match at score 1.00, because chip text "Walk me through
 *  it" got TEACH_PATTERN-captured as `requestedName = "it"`. Any
 *  conversational pronoun / particle / common verb that happens to
 *  appear as a substring of an opening name would have done the
 *  same. The exact-match path is unaffected: a user who literally
 *  types one of these still gets exact-match behavior (which returns
 *  null for these since none are themselves opening names). */
const RESOLVER_STOPWORDS = new Set([
  // Pronouns
  'it', 'its', 'he', 'she', 'we', 'us', 'you', 'they', 'them', 'this', 'that',
  // Articles + particles
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'as',
  // Verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'do', 'did', 'does', 'has', 'had',
  // Conjunctions
  'and', 'or', 'but', 'if', 'so',
  // Common chat noise
  'yes', 'no', 'ok', 'okay', 'sure', 'maybe', 'please',
  // Question words
  'how', 'why', 'what', 'who', 'when', 'where',
  // Adverbs / spatial
  'more', 'less', 'next', 'back', 'here', 'now', 'too',
  // Common short conversational verbs
  'go', 'see', 'try', 'get', 'put', 'use', 'show', 'tell', 'ask', 'say', 'let',
]);

/** Below this query length we refuse substring + token-set matches.
 *  The shortest legitimate opening name in the Lichess DB is 4 chars
 *  ("Pirc", "Slav", "Reti"), so anything shorter is conversational
 *  text — never an opening name. Exact + prefix match still run for
 *  short queries (alias map covers "kid", "qgd", etc. there). */
const RESOLVER_MIN_FUZZY_LEN = 4;

/** Aliases for acronyms + common alt-names the DB doesn't index.
 *  Keys are lowercase normalized inputs; values are canonical names
 *  that DO exist in the DB. Pre-flight aliases the input before
 *  attempting match against the DB. */
const NAME_ALIASES: Record<string, string> = {
  // The Traxler's other real name. The DB carries neither token ("wilkes" and
  // "barre" appear in ZERO shipped names), so no amount of matching can reach
  // it — an alias is the only route. Both spellings are in common use.
  'wilkes-barre': 'Italian Game: Two Knights Defense, Traxler Counterattack',
  'wilkes barre': 'Italian Game: Two Knights Defense, Traxler Counterattack',
  'wilkes-barre variation': 'Italian Game: Two Knights Defense, Traxler Counterattack',
  'wilkes barre variation': 'Italian Game: Two Knights Defense, Traxler Counterattack',
  // 2026-07-31 sweep — asks that resolved to the WRONG opening (or to
  // nothing) in the tier-coverage probe. Each maps to the real DB row.
  'jobava london': 'Rapport-Jobava System',
  'jobava': 'Rapport-Jobava System',
  'jobava attack': 'Rapport-Jobava System',
  'rapport-jobava': 'Rapport-Jobava System',
  'budapest gambit': 'Indian Defense: Budapest Defense, Alekhine Variation',
  'budapest': 'Indian Defense: Budapest Defense, Alekhine Variation',
  'budapest defense': 'Indian Defense: Budapest Defense, Alekhine Variation',
  // Unaliased, "closed sicilian" fuzzy-matched an ENGLISH reversed line.
  'closed sicilian': 'Sicilian Defense: Closed',
  'the closed sicilian': 'Sicilian Defense: Closed',
  'sicilian closed': 'Sicilian Defense: Closed',
  // "the alapin" means the anti-Sicilian 2.c3 to essentially everyone — but
  // fuzzy resolution preferred "Ruy Lopez: Alapin Defense" (the obscure
  // 3...Bb4 sideline named after the same man), so "teach me the alapin"
  // taught the wrong opening entirely (prod probe, 2026-07-30).
  alapin: 'Sicilian Defense: Alapin Variation',
  'the alapin': 'Sicilian Defense: Alapin Variation',
  'alapin sicilian': 'Sicilian Defense: Alapin Variation',
  // "the colle" is the d5/e3/Bd3 system with the Zukertort b3 plan — the
  // baked Tier-2 narration lives on this canonical row; unaliased, fuzzy
  // resolution preferred the obscure Siroccopteryx g6 line.
  colle: "Queen's Pawn Game: Colle System",
  'the colle': "Queen's Pawn Game: Colle System",
  'colle system': "Queen's Pawn Game: Colle System",
  'colle zukertort': "Queen's Pawn Game: Colle System",
  'colle-zukertort': "Queen's Pawn Game: Colle System",
  // "the polish" / 1.b4 — the OPENING (Sokolsky), not the 1.d4 b5 Polish
  // DEFENSE the fuzzy match lands on. The KID/Sokolsky Attack row is the
  // deepest teachable 1.b4 line in the DB and carries the baked narration.
  'polish opening': "Polish Opening: King's Indian Variation, Sokolsky Attack",
  'the polish': "Polish Opening: King's Indian Variation, Sokolsky Attack",
  sokolsky: "Polish Opening: King's Indian Variation, Sokolsky Attack",
  orangutan: "Polish Opening: King's Indian Variation, Sokolsky Attack",
  b4: "Polish Opening: King's Indian Variation, Sokolsky Attack",
  kid: "King's Indian Defense",
  // "KIA" — King's Indian Attack (White's g3/Nf2/e4 setup). A common
  // acronym that resolved to nothing, so "teach me the KIA" dead-ended
  // to the brain (David 2026-07-18 screenshot). The DB carries the bare
  // "King's Indian Attack" as a teachable row.
  kia: "King's Indian Attack",
  nid: 'Nimzo-Indian Defense',
  qid: "Queen's Indian Defense",
  qga: "Queen's Gambit Accepted",
  qgd: "Queen's Gambit Declined",
  'center counter': 'Scandinavian Defense',
  'centre counter': 'Scandinavian Defense',
  // Spelling variants the DB doesn't index under both forms.
  petroff: "Petrov's Defense",
  // "Sämisch" alone has no DB entry (it's always a sub-variation
  // marker like "Alekhine Defense: Sämisch Attack" or "Slav Defense:
  // … Sämisch Variation"). The user typically means the KID/Nimzo
  // structure; "Alekhine Defense: Sämisch Attack" is the closest
  // complete bare-name DB row.
  saemisch: 'Alekhine Defense: Sämisch Attack',
  // "Spanish" is the European name for Ruy Lopez — DB uses Ruy Lopez.
  spanish: 'Ruy Lopez',
  'spanish opening': 'Ruy Lopez',
  // The Vienna sub-line is spelled "Hamppe-Allgaier" in the DB
  // (double-p) but commonly written single-p in coaching books.
  // No bare "Hamppe-Allgaier Gambit" exists in the DB — it only
  // appears as a sub-variation of the Vienna Gambit with Max Lange
  // Defense. Pin to the canonical full name.
  'hampe-allgaier': 'Vienna Gambit, with Max Lange Defense: Hamppe-Allgaier Gambit',
  'hampe allgaier': 'Vienna Gambit, with Max Lange Defense: Hamppe-Allgaier Gambit',
  'hamppe-allgaier': 'Vienna Gambit, with Max Lange Defense: Hamppe-Allgaier Gambit',
  'hamppe allgaier': 'Vienna Gambit, with Max Lange Defense: Hamppe-Allgaier Gambit',
  // Possessive forms typed without apostrophe. The DB inconsistently
  // uses apostrophes for some openings ("King's Gambit") and not for
  // others ("Bird Opening"), so a single normalization rule can't fix
  // both. Explicit aliases for the common no-apostrophe inputs:
  'kings gambit': "King's Gambit",
  'bishops opening': "Bishop's Opening",
  'queens gambit': "Queen's Gambit",
  'queens gambit accepted': "Queen's Gambit Accepted",
  'queens gambit declined': "Queen's Gambit Declined",
  'kings indian': "King's Indian Defense",
  'kings indian defense': "King's Indian Defense",
  'queens indian': "Queen's Indian Defense",
  'queens indian defense': "Queen's Indian Defense",
  'birds opening': 'Bird Opening',
  'bird opening': 'Bird Opening',
  "bird's opening": 'Bird Opening',
  'alekhines defense': 'Alekhine Defense',
  "alekhine's defense": 'Alekhine Defense',
  // Common typos surfaced by production audits — the user types
  // these often enough that we shouldn't lose the lesson over a
  // single misspelled letter.
  phillador: 'Philidor Defense',
  philidor: 'Philidor Defense',
  // Bare popular sub-variation names — let the user type just the
  // variation and we route to the canonical full name. Keeps audit
  // logs and Dexie cache keyed on the canonical entry rather than a
  // user-typed shorthand. Production audit (build 00aadcd): a bare
  // "najdorf" was sent to LLM gen as "najdorf" rather than the
  // canonical "Sicilian Defense: Najdorf Variation", causing cache
  // misses on follow-up queries.
  najdorf: 'Sicilian Defense: Najdorf Variation',
  dragon: 'Sicilian Defense: Dragon Variation',
  sveshnikov: 'Sicilian Defense: Lasker-Pelikan Variation',
  scheveningen: 'Sicilian Defense: Scheveningen Variation',
  taimanov: 'Sicilian Defense: Taimanov Variation',
  kan: 'Sicilian Defense: Kan Variation',
  // "Vienna Gambit" is ambiguous in the DB — there's no entry by
  // that exact name. The DB has "Vienna Gambit, with Max Lange
  // Defense" (Nc6 line, niche) and "Vienna Game: Vienna Gambit"
  // (Nf6 line, the famous one — `1.e4 e5 2.Nc3 Nf6 3.f4`). The
  // resolver was picking the shorter name and routing to the niche
  // Nc6 line, which has no static walkthrough entry, so the user
  // got bounced back to a parent picker. Pin to the canonical Nf6
  // f4 line that 95% of users mean.
  'vienna gambit': 'Vienna Game: Vienna Gambit',
};

/** Find the shortest canonical-PGN entry for a given exact name.
 *  When the DB carries multiple rows with the same opening name at
 *  different depths (e.g. "Sicilian Defense: Najdorf Variation" at
 *  10/11/12/13/14 plies), the SHORTEST is the parent / bare entry —
 *  every other listed depth is the bare line plus a few extra plies
 *  the curator wanted to register. For walkthroughs we want the
 *  bare spine so the fork picker at the end has the most choices. */
/** Find the spine PGN for a canonical opening name.
 *
 *  When sub-variations exist under this name (entries with names
 *  starting with `<canonicalName>, `), prefer the SHORTEST same-name
 *  PGN — that's the parent / bare entry, and leaving the spine
 *  short gives the fork picker at the end the most choices.
 *
 *  When NO sub-variations exist (single-entry opening like Pirc
 *  Defense: Bayonet Attack), prefer the LONGEST same-name PGN —
 *  there's no fork picker to budget for, and the user wants the
 *  walkthrough to extend as deep as the DB carries. Production
 *  audit (build e0b3f85): user reported Pirc Bayonet Attack
 *  walkthrough only goes 5 moves deep. The Lichess DB carries it
 *  at 9 plies with no sub-variations, but the
 *  `openings-lichess-extended.json` mining-script output (or
 *  hand-mined entries) provides longer same-name PGNs. The old
 *  shortest-wins logic ignored the extended entry; the new logic
 *  uses it as the spine when there's no fork picker to populate. */
export function findShortestCanonicalPgn(canonicalName: string): string | null {
  const entries = openingsData;
  const matches = entries.filter((e) => e.name === canonicalName);
  if (matches.length === 0) return null;
  // Check whether any sub-variation entries exist under this name
  // (e.g. "Sicilian Defense: Najdorf Variation, English Attack" is
  // a sub-variation of "Sicilian Defense: Najdorf Variation").
  const namePrefix = canonicalName + ', ';
  const hasSubVariations = entries.some((e) => e.name.startsWith(namePrefix));
  if (hasSubVariations) {
    // Spine = shortest so the fork picker can surface the named
    // sub-variations as branch tiles at the end of the walkthrough.
    return matches.reduce((a, b) => (a.pgn.length < b.pgn.length ? a : b)).pgn;
  }
  // No sub-variations to surface as forks — use the longest same-
  // name PGN so the walkthrough extends to whatever depth the DB
  // (canonical or extended) carries.
  const longestSameName = matches.reduce((a, b) =>
    a.pgn.length > b.pgn.length ? a : b,
  );
  const longestPlies = longestSameName.pgn.split(/\s+/).filter(Boolean).length;
  // Cross-name extension: when the same-name spine ends short of
  // middlegame depth, the DB sometimes carries the SAME line under a
  // different (more-specific) name with extra plies. E.g.
  //   "Vienna Game: Frankenstein-Dracula Variation"       → 6 plies
  //   "Vienna Game: Stanley Variation,
  //                 Frankenstein-Dracula Variation"       → 20 plies
  // Both have identical PGN prefixes; the longer one is literally
  // the canonical line continued. The user typed the shorter
  // variation name and expects the walkthrough to reach the
  // middlegame — let the deeper continuation drive the spine. Bound:
  // the candidate's PGN MUST start with the same-name longest's PGN
  // (so we never break out of the named position).
  if (longestPlies < SPINE_EXTENSION_THRESHOLD) {
    const extended = findLongestPgnExtending(longestSameName.pgn);
    if (extended && extended !== longestSameName.pgn) {
      return extended;
    }
  }
  return longestSameName.pgn;
}

/** Ply count below which `findShortestCanonicalPgn` looks for a
 *  cross-name PGN extension. 10 covers most middlegame transitions. */
const SPINE_EXTENSION_THRESHOLD = 10;
/** Hard cap on the extended-spine length. ~20 plies is comfortably
 *  in the middlegame for any opening and keeps the walkthrough
 *  tractable. */
const SPINE_EXTENSION_MAX_PLIES = 20;

/** Find the longest DB PGN that has `basePgn` as a (strict or equal)
 *  prefix. Used by `findShortestCanonicalPgn` to extend thin named
 *  variations into the middlegame using DB entries stored under
 *  different (more-specific) names. Returns null when no entry
 *  extends the base, or when the extension cap is already at the
 *  threshold (same as the base, no real extension). */
export function findLongestPgnExtending(basePgn: string): string | null {
  const entries = openingsData;
  const basePrefix = basePgn + ' ';
  let best: { pgn: string; plies: number } | null = null;
  for (const e of entries) {
    if (e.pgn !== basePgn && !e.pgn.startsWith(basePrefix)) continue;
    const plies = e.pgn.split(/\s+/).filter(Boolean).length;
    if (!best || plies > best.plies) best = { pgn: e.pgn, plies };
  }
  if (!best) return null;
  // Cap at SPINE_EXTENSION_MAX_PLIES so the walkthrough doesn't grow
  // unbounded for openings the DB carries to 25-30 plies.
  if (best.plies <= SPINE_EXTENSION_MAX_PLIES) return best.pgn;
  const capped = best.pgn.split(/\s+/).filter(Boolean).slice(0, SPINE_EXTENSION_MAX_PLIES).join(' ');
  return capped;
}

/** Resolve a user-typed opening name against the Lichess DB and
 *  return the matched entry's canonical name, ECO, and moves. The
 *  user's word: "tie the user's request FIRST opening — so the LLM
 *  can match the request to an opening before even getting started."
 *  Callers should use the returned `canonicalName` for cache keys
 *  and gen requests so that "najdorf" and "Sicilian Defense: Najdorf
 *  Variation" land on the same cache row.
 *
 *  Returns null when no DB entry matches (the user is asking about
 *  something not in the openings DB; surface routing rejects). */
export function resolveOpeningEntry(
  openingName: string,
): { canonicalName: string; eco: string; moves: string[] } | null {
  // Filter out terminal-short entries — these are namesake-only DB
  // rows with no continuation (e.g. Gunderam Gambit at 4 plies).
  // Preserves all teachable openings; deep-dive (PGN-prefix) and
  // in-game detection still see the full DB via separate code paths.
  const entries = (openingsData).filter(isTeachableEntry);
  const rawTrimmed = openingName.trim();
  if (!rawTrimmed) return null;

  // Lift out any SAN the query names, and resolve the NAME from what's left —
  // "Vienna Gambit main line with Qf3" is a name plus a move, and only the name
  // half can match a DB name. The move is put back to work below, to choose
  // among the lines under that name.
  const namedSans: string[] = [];
  let trimmed = rawTrimmed;
  // An exact DB name wins outright — never dismantle a query that already IS a
  // name (no shipped name is SAN-shaped today, but that is not a guarantee).
  if (!entries.some((e) => normalizeNameForMatch(e.name) === normalizeNameForMatch(rawTrimmed))) {
    const stripped = rawTrimmed.replace(NAMED_SAN, (san) => { namedSans.push(canonicalizeSan(san)); return ' '; });
    if (namedSans.length > 0) {
      const remainder = stripped.replace(/\s+/g, ' ').trim().replace(TRAILING_CONNECTORS, '').trim();
      // A query that is ONLY a move names no opening — leave it to the caller.
      if (remainder.length === 0) return null;
      trimmed = remainder;
    }
  }

  // Apply alias map first (KID → King's Indian Defense, najdorf →
  // Sicilian Defense: Najdorf Variation, etc.). Case-insensitive.
  const aliased = NAME_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const queryNorm = normalizeNameForMatch(aliased);

  function pick(matches: OpeningEntry[]): OpeningEntry {
    // Tie-break: prefer entries whose NAME exactly equals the query
    // (the parent / canonical entry rather than a sub-variation),
    // then the longest PGN (most specific gameplay) — the DB often
    // has multiple entries with the same name at different depths
    // (e.g. "French Defense" appears at both 2 plies and 4 plies),
    // and the deeper one gives more useful book-source moves.
    const exact = matches.filter(
      (e) => normalizeNameForMatch(e.name) === queryNorm,
    );
    const pool = exact.length > 0 ? exact : matches;
    return pool.reduce((a, b) => {
      if (a.name.length !== b.name.length) return a.name.length < b.name.length ? a : b;
      return a.pgn.length > b.pgn.length ? a : b;
    });
  }
  function emit(e: OpeningEntry): { canonicalName: string; eco: string; moves: string[] } {
    // THE MOVE THE QUERY NAMED decides which line under this name is meant.
    // Among the DB lines that continue the resolved one, take the shallowest
    // that actually plays every named move — the entry where that move is the
    // point, not one that happens to reach it later. Still pure DB (G3): the
    // move only ever SELECTS an existing entry, it never invents a line.
    if (namedSans.length > 0) {
      const under = entries.filter((cand) => {
        if (cand.pgn !== e.pgn && !cand.pgn.startsWith(`${e.pgn} `)) return false;
        const moves = cand.pgn.split(/\s+/);
        return namedSans.every((san) => moves.includes(san));
      });
      if (under.length > 0) {
        const best = under.reduce((a, b) => (a.pgn.length <= b.pgn.length ? a : b));
        return { canonicalName: best.name, eco: best.eco, moves: best.pgn.split(/\s+/).filter(Boolean) };
      }
    }
    return {
      canonicalName: e.name,
      eco: e.eco,
      moves: e.pgn.split(/\s+/).filter(Boolean),
    };
  }

  // 1. Exact match (case + diacritic + apostrophe + hyphen insensitive).
  const exact = entries.filter((e) => normalizeNameForMatch(e.name) === queryNorm);
  if (exact.length > 0) return emit(pick(exact));

  // Guard against the Bug D failure mode: queries this short or this
  // common are chat noise, not opening names. Without this guard,
  // `resolveOpeningEntry("it")` returns `Italian Game` (prefix match)
  // at score 1.00 — chip text "Walk me through it" got TEACH_PATTERN-
  // captured as `requestedName = "it"` and silently bounced the
  // student to a wholly unrelated opening. Anything below this gate
  // falls through to the brain path, where the conversation context
  // can resolve the antecedent. Exact match above is intentionally
  // preserved: a user who literally types one of these still hits
  // null (none are themselves canonical opening names), but aliases
  // resolved earlier ("kid" → "King's Indian Defense") expanded long
  // before we got here, so the alias path is unaffected.
  if (queryNorm.length < RESOLVER_MIN_FUZZY_LEN) return null;
  if (RESOLVER_STOPWORDS.has(queryNorm)) return null;

  // 2. Prefix match (normalized) — "Kings Indian" → "King's Indian Defense".
  const prefix = entries.filter((e) =>
    normalizeNameForMatch(e.name).startsWith(queryNorm),
  );
  if (prefix.length > 0) return emit(pick(prefix));

  // 3. Substring match (normalized).
  const sub = entries.filter((e) =>
    normalizeNameForMatch(e.name).includes(queryNorm),
  );
  if (sub.length > 0) return emit(pick(sub));

  // 4. Token-set match — word-order-insensitive. "Najdorf Sicilian"
  //    matches "Sicilian Defense: Najdorf Variation".
  const tokenMatches = entries.filter((e) => tokensMatchTarget(aliased, e.name));
  if (tokenMatches.length > 0) return emit(pick(tokenMatches));

  // 5. RARE-TOKEN match — the one distinctive word carries the query.
  //
  // David 2026-09-03: he asked for the "traxler counter gambit" and the coach
  // said "Ready to start the traxler counter gambit", then taught him the
  // DANISH GAMBIT. Tier 4 requires EVERY query token to appear in the name, and
  // the DB calls it "Traxler Counterattack" — so `counter` (0 entries in the
  // whole DB) and `gambit` could never match, and a query naming its opening
  // unmistakably resolved to null. Bare "traxler" worked; adding two CORRECT
  // words broke it, which is exactly backwards.
  //
  // Token frequency across the 3,654 shipped names says which word is the
  // evidence: `traxler` 5, `counterattack` 22, `najdorf` 28 — against `gambit`
  // 1,207 and `variation` 2,019. A proper noun identifies an opening; a
  // category word identifies nothing. So when every stricter tier has failed,
  // resolve on the RAREST token the query carries, and only when it is rare
  // enough to be a name rather than a category. `gambit` alone still resolves
  // to nothing, which is the property that keeps this tier safe.
  const rare = rarestQueryToken(aliased, entries);
  if (!rare) return null;
  const rareMatches = entries.filter((e) =>
    new Set(normalizeNameForMatch(e.name).split(' ')).has(rare.token),
  );
  if (rareMatches.length === 0) return null;
  // 🔒 THE RARE TOKEN MUST NAME ONE OPENING FAMILY, OR WE DO NOT GUESS.
  // `traxler` appears only under "Italian Game: Two Knights Defense" — it names
  // one thing, so the query is unambiguous. `gunderam` is scattered across the
  // Caro-Kann, the Semi-Slav, the Blackmar-Diemer and the King's Pawn Game; a
  // rare name shared by unrelated openings identifies none of them, and picking
  // one would repeat the very failure this tier exists to fix — handing the
  // student an opening they did not ask for. Ambiguous resolves to null, and
  // the caller asks.
  const families = new Set(rareMatches.map((e) => familyOf(e.name)));
  if (families.size > 1) return null;
  // Among them, prefer the entry corroborated by the MOST other query tokens —
  // but count only tokens that are THEMSELVES rare. Counting generic ones
  // reintroduces the same disease one level down: with `gambit` allowed to
  // corroborate, "traxler counter gambit" picked the "Trencianske-Teplice
  // Gambit" sub-line over the parent Counterattack, because that name happens
  // to contain the word. A category word must not steer the pick any more than
  // it may make the match. Rare tokens still do their job: "najdorf poisoned
  // pawn" prefers the Poisoned Pawn line over the bare Najdorf.
  const df = docFreq(entries);
  const qTokens = new Set(
    normalizeNameForMatch(aliased)
      .split(' ')
      .filter((t) => t.length >= 3 && (df.get(t) ?? 0) > 0 && (df.get(t) ?? 0) <= RARE_TOKEN_MAX_ENTRIES),
  );
  let bestCorroboration = -1;
  for (const e of rareMatches) {
    const tTokens = new Set(normalizeNameForMatch(e.name).split(' '));
    let hits = 0;
    for (const t of qTokens) if (tTokens.has(t)) hits += 1;
    if (hits > bestCorroboration) bestCorroboration = hits;
  }
  const corroborated = rareMatches.filter((e) => {
    const tTokens = new Set(normalizeNameForMatch(e.name).split(' '));
    let hits = 0;
    for (const t of qTokens) if (tTokens.has(t)) hits += 1;
    return hits === bestCorroboration;
  });
  return emit(pick(corroborated));
}

/** The opening family a shipped name belongs to — the part before the first
 *  colon ("Italian Game: Two Knights Defense, Traxler Counterattack" → "Italian
 *  Game"), or the whole name when it has none. */
function familyOf(name: string): string {
  const norm = normalizeNameForMatch(name);
  const colon = name.indexOf(':');
  return colon === -1 ? norm : normalizeNameForMatch(name.slice(0, colon));
}

/** How many shipped names may contain a token before it is a CATEGORY rather
 *  than a name. `traxler` 5, `liver` 2, `poisoned` 11, `counterattack` 22 and
 *  `najdorf` 28 are names; `gambit` 1,207, `variation` 2,019 and `defense`
 *  2,348 are not. 40 sits in the empty space between the two populations. */
const RARE_TOKEN_MAX_ENTRIES = 40;

/** Document frequency of every token across the teachable names, built once. */
let tokenDocFreq: Map<string, number> | null = null;
function docFreq(entries: OpeningEntry[]): Map<string, number> {
  if (tokenDocFreq) return tokenDocFreq;
  const df = new Map<string, number>();
  for (const e of entries) {
    for (const t of new Set(normalizeNameForMatch(e.name).split(' '))) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  tokenDocFreq = df;
  return df;
}

/** The most distinctive token the query carries, or null when it carries none
 *  rare enough to identify an opening on its own. */
function rarestQueryToken(
  query: string,
  entries: OpeningEntry[],
): { token: string; df: number } | null {
  const df = docFreq(entries);
  let best: { token: string; df: number } | null = null;
  for (const t of normalizeNameForMatch(query).split(' ')) {
    if (t.length < 3 || RESOLVER_STOPWORDS.has(t)) continue;
    const n = df.get(t);
    // df 0 = a word the DB never uses ("counter", "wilkes"): no evidence.
    if (!n || n > RARE_TOKEN_MAX_ENTRIES) continue;
    if (!best || n < best.df) best = { token: t, df: n };
  }
  return best;
}

/** The family-DEFINING move prefix for an opening query — the SHORTEST DB entry
 *  carrying the resolved canonical name (e.g. "Pirc Defense" → ["e4","d6"];
 *  "Najdorf" → the full Najdorf spine). Used to match a user's games to an
 *  opening by their actual MOVES rather than the coarse ECO→name map, which is
 *  internally inconsistent — `getOpeningNameByEco("B07")` is "Czech Defense",
 *  NOT "Pirc Defense", so ECO-name matching both MISSED B07 Pirc games and
 *  mis-INCLUDED unrelated B00 games (real-data audit, knight_mare_01, 2026-07-04).
 *  Matching by the defining moves is how an opening is actually identified.
 *  Returns null when the query doesn't resolve. */
export function openingFamilyMoves(query: string): { canonicalName: string; moves: string[] } | null {
  const resolved = resolveOpeningEntry(query);
  if (!resolved) return null;
  const norm = normalizeNameForMatch(resolved.canonicalName);
  let shortest: OpeningEntry | null = null;
  let shortestPlies = Infinity;
  for (const e of openingsData) {
    if (normalizeNameForMatch(e.name) !== norm) continue;
    const plies = e.pgn.split(/\s+/).filter(Boolean).length;
    if (plies > 0 && plies < shortestPlies) { shortest = e; shortestPlies = plies; }
  }
  const moves = shortest ? shortest.pgn.split(/\s+/).filter(Boolean) : resolved.moves;
  if (moves.length === 0) return null;
  return { canonicalName: resolved.canonicalName, moves };
}

/** Find the most specific Lichess DB entry whose canonical PGN
 *  matches the given SAN sequence as a prefix. Used by the deep-dive
 *  flow: when the user picks a branch in a walkthrough fork, the
 *  combined `pathSans + childSan` identifies a position; we resolve
 *  THAT position to the named DB opening so the next walkthrough
 *  loads as a focused, canonical lesson. Production audit (build
 *  3ad9a2b): deep-dive was concatenating the LLM's `forkSubtitle`
 *  prose ("Solid and flexible") onto the parent name, producing
 *  garbage queries like "Pirc Defense: Classical Variation: Solid
 *  and flexible" that nothing matched.
 *
 *  Match strategy: among DB entries whose PGN is a prefix of `moves`,
 *  return the LONGEST (most-specific). Tie-break: prefer the entry
 *  with the longest name (more specific naming). Returns null when
 *  no DB entry matches the sequence even at length 1. */
export function findOpeningByPgnPrefix(
  moves: string[],
): { canonicalName: string; eco: string } | null {
  if (moves.length === 0) return null;
  const entries = openingsData;
  const target = moves.join(' ');
  // We want entries whose PGN is a *prefix* of `target` — i.e. the
  // user's sequence is a continuation of (or equal to) the entry's
  // canonical PGN. So `target.startsWith(entry.pgn + ' ')` OR
  // `target === entry.pgn`.
  const matches = entries.filter((e) => {
    if (e.pgn === target) return true;
    return target.startsWith(e.pgn + ' ');
  });
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => {
    if (a.pgn.length !== b.pgn.length) return a.pgn.length > b.pgn.length ? a : b;
    return a.name.length > b.name.length ? a : b;
  });
  return { canonicalName: best.name, eco: best.eco };
}

/** True when `moves` is STILL INSIDE opening book — the played sequence equals a
 *  known opening line or a known line CONTINUES it (i.e. some DB entry's PGN is
 *  exactly the sequence, or starts with the sequence + a further move). Distinct
 *  from `findOpeningByPgnPrefix`, which asks "does a known opening prefix these
 *  moves?" (true for the whole game once you're in an opening). This asks "is the
 *  line I've played so far a prefix of a real theory line?" — which flips to
 *  false the moment you leave book.
 *
 *  Used by move-quality analysis so a BOOK opening move is never graded an
 *  inaccuracy/mistake on shallow opening eval-noise — how chess.com/lichess mark
 *  theory moves "book", not errors (David 2026-08-28: "move 1 or 2 shouldn't be
 *  auto marked as mistakes… check the mistake guidelines, don't just code to
 *  never show an error in the first 2 moves"). This is principled: it's book iff
 *  real theory continues it, at ANY depth — not a move-number cutoff. */
export function isBookLine(moves: readonly string[]): boolean {
  if (moves.length === 0) return true; // the starting position is book
  const target = moves.join(' ');
  const withSpace = target + ' ';
  for (const e of openingsData) {
    if (e.pgn === target || e.pgn.startsWith(withSpace)) return true;
  }
  return false;
}

/** Backward-compatible thin wrapper. Existing callers want just the
 *  PGN moves; new code should prefer resolveOpeningEntry to also get
 *  the canonical name (so cache + gen key on the canonical entry,
 *  not the user's typed string). */
export function getOpeningMoves(openingName: string): string[] | null {
  const r = resolveOpeningEntry(openingName);
  return r ? r.moves : null;
}

/** Canonical opening name lookup by ECO code. Returns the most-likely
 *  parent name for a given ECO bucket — strategy:
 *    1. Prefer names WITHOUT a colon (i.e. unprefixed root openings).
 *    2. Among those, prefer names WITHOUT ", X" sub-variation suffixes.
 *    3. Pick the most frequent name in that filtered set.
 *    4. Fall back to the most common BASE (text before the colon) of
 *       the full list when no clean root exists.
 *  Built lazily on first call and memoized; the DB has ~3600 entries
 *  but only ~500 distinct ECOs.
 *
 *  Used by Game Insights to translate ECO codes (e.g. "C24") into
 *  readable names ("Bishop's Opening") on the shareable-insight cards
 *  and per-opening drilldown — previously the surface fell back to the
 *  raw ECO string when the user's repertoire didn't have the opening,
 *  which read like a serial number ("You win 75% with the C24"). */
let ecoToCanonicalNameCache: Map<string, string> | null = null;
export function getOpeningNameByEco(eco: string | null | undefined): string | null {
  if (!eco) return null;
  if (!ecoToCanonicalNameCache) {
    ecoToCanonicalNameCache = new Map();
    const buckets = new Map<string, string[]>();
    for (const entry of canonicalOpenings as OpeningEntry[]) {
      if (!entry.eco || !entry.name) continue;
      const list = buckets.get(entry.eco) ?? [];
      list.push(entry.name);
      buckets.set(entry.eco, list);
    }
    for (const [ecoKey, names] of buckets.entries()) {
      ecoToCanonicalNameCache.set(ecoKey, resolveCanonicalName(names));
    }
  }
  return ecoToCanonicalNameCache.get(eco) ?? null;
}

function resolveCanonicalName(names: string[]): string {
  const noColon = names.filter((n) => !n.includes(':'));
  if (noColon.length > 0) {
    const noComma = noColon.filter((n) => !n.includes(', '));
    const pool = noComma.length > 0 ? noComma : noColon;
    return mostFrequent(pool);
  }
  return mostFrequent(names.map((n) => n.split(':')[0].trim()));
}

function mostFrequent(items: string[]): string {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  let bestItem = items[0];
  let bestCount = 0;
  for (const [item, count] of counts.entries()) {
    if (count > bestCount) { bestItem = item; bestCount = count; }
  }
  return bestItem;
}

/** All distinct SANs that appear at `prefix.length`-th ply across DB
 *  entries whose first `prefix.length` plies match `prefix` exactly.
 *  Used by find-move stage gen to pick branchpoints — positions where
 *  multiple opening lines diverge — and surface the canonical move
 *  as the "right answer" with sibling SANs as named-opening
 *  distractors. Map value is one representative DB entry per SAN
 *  (the shortest-name match) so the caller can label each
 *  distractor with its named opening. */
export function findContinuationsAtPly(
  prefix: string[],
): Map<string, { name: string; eco: string }> {
  const entries = openingsData;
  const prefixStr = prefix.join(' ');
  const result = new Map<string, { name: string; eco: string }>();
  const candidates = prefix.length === 0
    ? entries
    : entries.filter((e) => e.pgn.startsWith(prefixStr + ' '));
  for (const e of candidates) {
    const moves = e.pgn.split(/\s+/).filter(Boolean);
    if (moves.length <= prefix.length) continue;
    const sanAtPly = moves[prefix.length];
    const existing = result.get(sanAtPly);
    if (!existing) {
      result.set(sanAtPly, { name: e.name, eco: e.eco });
      continue;
    }
    // Prefer shorter-named entry as the representative (the bare
    // opening rather than a deep sub-variation). Same tie-break as
    // the picker uses elsewhere.
    if (e.name.length < existing.name.length) {
      result.set(sanAtPly, { name: e.name, eco: e.eco });
    }
  }
  return result;
}

/** Sibling DB extensions of a canonical opening, surfaced as
 *  fork branches at the end of a DB-narration walkthrough. Used by
 *  `generateOpeningFromDbNarration` to give the student deep-dive
 *  tiles for every named sub-variation the DB knows about — for
 *  Najdorf this is English Attack, Adams Attack, Bg5 Main Line,
 *  Opocensky / Scheveningen (under Be2), etc. */
export interface ForkBranch {
  /** First divergent move (e.g. "Be3" for English Attack). */
  san: string;
  /** Sub-variation name shown on the fork tile (e.g. "English Attack"). */
  label: string;
  /** Canonical full name for the deep-dive resolver
   *  (e.g. "Sicilian Defense: Najdorf Variation, English Attack"). */
  fullName: string;
  /** How many sibling DB entries share this divergent move; used to
   *  rank popularity and cap the picker. */
  count: number;
  /** Continuation moves AFTER the first divergent SAN, pulled from
   *  the LONGEST DB entry under this branch whose name still falls
   *  under the parent canonical. Runs all the way to the end of the
   *  Lichess DB's recorded line so each branch ships the student
   *  every ply the DB knows about — no silent middlegame truncation.
   *  User: "Make sure they are all extended to the end of lichess
   *  database." Tour-mode callers can tighten this further at the
   *  call site (see `openingGenerator.ts` TOUR_EXT_CAP). */
  extensionMoves: string[];
}

/** Find sibling DB entries that EXTEND a canonical opening's PGN
 *  by one or more plies. Groups by the FIRST divergent move so the
 *  picker shows one tile per genuine fork choice (multiple sub-sub-
 *  lines under the same first move collapse into a single branch
 *  represented by the most-general member of the group). Caps at 3
 *  branches to keep the fork picker readable — matches the trim of
 *  the entry-level picker (top 3 popular variations only). */
export function findSiblingExtensionBranches(
  canonicalName: string,
  canonicalPgn: string,
): ForkBranch[] {
  const entries = openingsData;
  // The DB sometimes carries multiple entries with the same canonical
  // name at different depths (e.g. "Sicilian Defense: Najdorf
  // Variation" appears at 10, 11, 12, 13, 14 plies). For fork
  // detection we want the SHORTEST PGN (the parent / bare entry) so
  // we can surface every sub-variation that branches off it. If the
  // caller passed a longer-PGN match, fall back to the shortest
  // exact-name PGN we can find in the DB.
  const exactNameMatches = entries.filter((e) => e.name === canonicalName);
  const refPgn = exactNameMatches.length > 0
    ? exactNameMatches.reduce((a, b) => (a.pgn.length < b.pgn.length ? a : b)).pgn
    : canonicalPgn;
  const canonPlies = refPgn.split(/\s+/).filter(Boolean);
  const namePrefix = canonicalName + ', ';
  const pgnPrefix = canonPlies.join(' ') + ' ';
  const candidates = entries.filter((e) => {
    if (e.name === canonicalName) return false;
    if (!e.name.startsWith(namePrefix)) return false;
    if (!e.pgn.startsWith(pgnPrefix)) return false;
    // Drop terminal-short fork tiles — picking them lands the student
    // in a 1-2 move dead-end with no walkthrough material.
    return isTeachableEntry(e);
  });
  if (candidates.length === 0) return [];

  type Group = { reps: OpeningEntry[]; count: number };
  const byFirstMove = new Map<string, Group>();
  for (const e of candidates) {
    const moves = e.pgn.split(/\s+/).filter(Boolean);
    if (moves.length <= canonPlies.length) continue;
    const first = moves[canonPlies.length];
    const g = byFirstMove.get(first);
    if (g) {
      g.reps.push(e);
      g.count += 1;
    } else {
      byFirstMove.set(first, { reps: [e], count: 1 });
    }
  }

  const branches: ForkBranch[] = Array.from(byFirstMove.entries()).map(
    ([san, group]) => {
      // Pick the rep whose sub-name is most useful as a fork-tile
      // label. Priority order:
      //   1. Sub-names that start with a CAPITAL letter (proper
      //      variation names like "Giuoco Pianissimo", "Greco
      //      Gambit", "Center Attack") beat lowercase generics like
      //      "with d5", "and a5", "on the queenside" — those
      //      lowercase suffixes are descriptive prefixes the
      //      curator added to disambiguate move-orders, not real
      //      variation names.
      //   2. Within proper-named, the sub-name that appears MOST
      //      OFTEN in this group wins (popularity proxy — Giuoco
      //      Pianissimo has 14+ entries under Italian Classical's
      //      Nf6 fork, Greco Gambit has 8, "with d5" has 1).
      //   3. Tie-break: shortest sub-name (most general — "English
      //      Attack" beats "English Attack, Anti-English").
      //   4. Tie-break: shortest PGN (closest to divergence point).
      // Production audit (build 27d0453): Italian Classical's Nf6
      // fork showed "with d5" as the rep label, hiding "Giuoco
      // Pianissimo" / "Greco Gambit" / "Center Attack" — all
      // recognizable variation names — beneath an awkward generic.
      const subNameCounts = new Map<string, number>();
      for (const e of group.reps) {
        const s = e.name.slice(namePrefix.length).split(',')[0].trim();
        subNameCounts.set(s, (subNameCounts.get(s) ?? 0) + 1);
      }
      const rep = group.reps.reduce((a, b) => {
        const aSub = a.name.slice(namePrefix.length).split(',')[0].trim();
        const bSub = b.name.slice(namePrefix.length).split(',')[0].trim();
        const aProper = /^[A-Z]/.test(aSub);
        const bProper = /^[A-Z]/.test(bSub);
        if (aProper !== bProper) return aProper ? a : b;
        const aPop = subNameCounts.get(aSub) ?? 0;
        const bPop = subNameCounts.get(bSub) ?? 0;
        if (aPop !== bPop) return aPop > bPop ? a : b;
        if (aSub.length !== bSub.length) return aSub.length < bSub.length ? a : b;
        return a.pgn.length < b.pgn.length ? a : b;
      });
      const subName = rep.name.slice(namePrefix.length).split(',')[0].trim();
      // Pick the LONGEST DB entry under this branch's first move to
      // pull middlegame extension plies. Restrict to entries whose
      // name still falls under the canonical (so we stay in this
      // sub-variation, not drift to a totally different opening).
      const branchPgnPrefix = canonPlies.join(' ') + ' ' + san + ' ';
      const branchExactPgn = canonPlies.join(' ') + ' ' + san;
      const extensionCandidates = entries.filter(
        (e) =>
          e.name.startsWith(namePrefix) &&
          (e.pgn === branchExactPgn || e.pgn.startsWith(branchPgnPrefix)),
      );
      const longest =
        extensionCandidates.length > 0
          ? extensionCandidates.reduce((a, b) => (a.pgn.length > b.pgn.length ? a : b))
          : null;
      const allMoves = longest ? longest.pgn.split(/\s+/).filter(Boolean) : [];
      // Take EVERY remaining ply past the canonical spine + branch's
      // first move. The Lichess DB is the canon — if it carries 12
      // plies of continuation under this branch, we ship all 12.
      // Earlier builds capped at 6 plies as a "land in middlegame"
      // heuristic, but that silently truncated 113 branches across 98
      // openings (audited 2026-05-08), dropping the student off
      // before reaching the named line's terminal position. Tour-mode
      // callers re-clip this themselves to keep the quick pace.
      const extensionMoves = allMoves.slice(canonPlies.length + 1);
      return {
        san,
        label: subName,
        fullName: `${canonicalName}, ${subName}`,
        count: group.count,
        extensionMoves,
      };
    },
  );
  branches.sort((a, b) => b.count - a.count);
  // Cap branch count: 6 by default, 3 when VITE_LEARN_SIMPLIFIED=true.
  // See src/utils/featureFlags.ts.
  return branches.slice(0, MAX_SIBLING_BRANCHES);
}

/** Resolve the walkthrough spine + fork branches for a teach lesson,
 *  GUARANTEEING the main line the student watches reaches a middlegame
 *  (David 2026-07-15 — "when I ask the coach to teach me an opening it
 *  doesn't get me to the middle game").
 *
 *  `findShortestCanonicalPgn` deliberately returns the SHORTEST canonical
 *  PGN when the opening has named sub-variations, so the fork picker can
 *  surface them — on the assumption the walkthrough auto-advances the
 *  most-popular branch (`branches[0]`) onward into the middlegame. But
 *  when the terminal-short filter strips every fork candidate (`branches`
 *  empty) OR the top branch carries no real extension, nothing takes the
 *  line past the opening and the walkthrough leafs in book theory.
 *
 *  When `extendToMiddlegame` is set and the main line (spine + top
 *  branch) does NOT reach the middlegame (per the shared
 *  `reachesMiddlegame` metric — the same gate the pro-rep depth test
 *  uses), extend the SPINE itself via the DB's longest same-prefix PGN
 *  (bounded by `findLongestPgnExtending`) and re-derive branches from the
 *  deeper terminus (usually none — that's fine, the main line now reaches
 *  the middlegame on its own). Tour mode passes `extendToMiddlegame:false`
 *  (a deliberate quick taste). */
export function resolveTeachSpine(
  canonicalName: string,
  fallbackMoves: string[],
  opts?: { extendToMiddlegame?: boolean },
): { spineMoves: string[]; branches: ForkBranch[]; extendedToMiddlegame: boolean } {
  const shortPgn = findShortestCanonicalPgn(canonicalName);
  let spineMoves = shortPgn ? shortPgn.split(/\s+/).filter(Boolean) : fallbackMoves;
  let branches = findSiblingExtensionBranches(canonicalName, spineMoves.join(' '));
  let extendedToMiddlegame = false;

  const mainLineReaches = (): boolean => {
    const top = branches[0];
    const pgn = top
      ? [...spineMoves, top.san, ...top.extensionMoves].join(' ')
      : spineMoves.join(' ');
    return reachesMiddlegame(pgn).pass;
  };

  if (opts?.extendToMiddlegame && !mainLineReaches()) {
    // Tier 1 — same-prefix extension. The DB sometimes carries the SAME
    // line deeper under a more-specific name (e.g. Benoni's bare
    // 12-ply spine continues to 20 plies under "Classical Variation,
    // Argentine Counterattack"). Extend the spine along that prefix.
    const extended = findLongestPgnExtending(spineMoves.join(' '));
    if (extended) {
      const extMoves = extended.split(/\s+/).filter(Boolean);
      if (extMoves.length > spineMoves.length && reachesMiddlegame(extended).pass) {
        spineMoves = extMoves;
        branches = findSiblingExtensionBranches(canonicalName, spineMoves.join(' '));
        extendedToMiddlegame = true;
      }
    }
  }

  if (opts?.extendToMiddlegame && !mainLineReaches()) {
    // Tier 2 — family trunk. Some openings' bare canonical DB entry is a
    // short SIDELINE (Scandinavian = "e4 d5 b3", Philidor's bare entry =
    // a 7-ply Bc4 line) whose real depth lives under differently-named
    // variations that DON'T share its prefix. Same-prefix extension
    // can't reach those. Pick a representative mainline from the opening
    // FAMILY instead: the shortest middlegame-reaching line on the most-
    // popular trunk continuation (data-chosen, G3-safe — a real DB line,
    // never invented). Yields e.g. the Scandinavian Classical, the Slav
    // Schallopp, the Philidor Lion — real sound mainlines.
    const famSpine = pickFamilyMiddlegameSpine(canonicalName);
    if (famSpine && famSpine.length > spineMoves.length) {
      spineMoves = famSpine;
      branches = findSiblingExtensionBranches(canonicalName, spineMoves.join(' '));
      extendedToMiddlegame = true;
    }
  }

  return { spineMoves, branches, extendedToMiddlegame };
}

/** Pick a representative middlegame-reaching mainline for an opening
 *  family (the canonical name + all its `:`/`,` sub-variations). Used as
 *  the tier-2 fallback in `resolveTeachSpine` when the bare canonical
 *  entry is a short sideline. Strategy: find the family's common leading
 *  prefix, the most-popular continuation right after it (the trunk), then
 *  the SHORTEST family line on that trunk that reaches the middlegame
 *  (shortest = most canonical, least deep into a specific sideline).
 *  Returns null when the family has no middlegame-reaching line (leave it
 *  short — empty > invented). G3-safe: every move is a real DB line. */
function pickFamilyMiddlegameSpine(canonicalName: string): string[] | null {
  const fam = openingsData.filter(
    (e) =>
      e.name === canonicalName ||
      e.name.startsWith(canonicalName + ':') ||
      e.name.startsWith(canonicalName + ','),
  );
  if (fam.length === 0) return null;
  const seqs = fam.map((e) => ({ e, moves: e.pgn.split(/\s+/).filter(Boolean) }));
  // Common leading prefix across the whole family.
  let commonLen = 0;
  for (;;) {
    const t = seqs[0].moves[commonLen];
    if (t === undefined || !seqs.every((s) => s.moves[commonLen] === t)) break;
    commonLen += 1;
  }
  // Most-popular trunk continuation right after the common prefix.
  const nextCount = new Map<string, number>();
  for (const s of seqs) {
    const m = s.moves[commonLen];
    if (m) nextCount.set(m, (nextCount.get(m) ?? 0) + 1);
  }
  let trunkNext: string | null = null;
  let bestCount = 0;
  for (const [m, cnt] of nextCount) {
    if (cnt > bestCount) {
      bestCount = cnt;
      trunkNext = m;
    }
  }
  const candidates = seqs
    .filter(
      (s) =>
        (trunkNext === null || s.moves[commonLen] === trunkNext) &&
        reachesMiddlegame(s.e.pgn).pass,
    )
    .sort(
      (a, b) =>
        a.moves.length - b.moves.length ||
        a.e.name.split(',').length - b.e.name.split(',').length ||
        a.e.name.length - b.e.name.length,
    );
  const chosen = candidates[0];
  if (!chosen) return null;
  return chosen.moves.slice(0, SPINE_EXTENSION_MAX_PLIES);
}

/** Find ALL Lichess-DB entries related to an opening name. Returns
 *  the bare main line PLUS every named variation / sub-line that
 *  shares an ECO code or whose PGN extends the bare line.
 *
 *  Used by the LLM-grounding flow: instead of asking the LLM to
 *  invent move sequences from training memory (which has been the
 *  cause of every "illegal SAN" error in production audits), we
 *  pass the DB-verified PGN sequences in as the source of truth.
 *  The LLM picks lines from this list and writes pedagogy on top.
 *
 *  Caps result length at maxEntries (default 30) — enough coverage
 *  without blowing the prompt token budget. Sorted by:
 *    1. Bare opening first (shortest PGN with an exact name match)
 *    2. Then sub-variations sorted by name length (broader names first) */
export function findRelatedDbEntries(
  openingName: string,
  maxEntries: number = 30,
): OpeningEntry[] {
  const entries = openingsData;
  const lower = openingName.toLowerCase();

  // 1. Find the bare opening — exact name match prefers shortest PGN
  //    (the canonical entry; longest sub-variation otherwise).
  const exactMatches = entries.filter(
    (e) => e.name.toLowerCase() === lower,
  );
  const bare = exactMatches.length > 0
    ? exactMatches.reduce((a, b) => (a.pgn.length < b.pgn.length ? a : b))
    : null;

  // 2. Identify the ECO range from the bare entry.
  const ecoRoot = bare?.eco;

  // 3. Collect candidates by SUBSTRING match on name. The Lichess
  //    DB names sub-variations with the bare name as prefix (e.g.
  //    "Bishop's Opening: Boden-Kieseritzky Gambit"), so an exact
  //    substring match captures all sub-lines of the requested
  //    opening WITHOUT pulling in unrelated openings that just
  //    happen to share a token (e.g. token "bishop" would catch
  //    "Modern Defense: Bishop Attack" — wrong).
  const candidates = entries.filter((e) => {
    if (e === bare) return false; // listed separately first
    if (!isTeachableEntry(e)) return false;
    const nameLower = e.name.toLowerCase();
    if (nameLower.includes(lower)) return true;
    // Same-ECO PGN extension catches unnamed transpositions.
    if (
      ecoRoot &&
      e.eco === ecoRoot &&
      bare &&
      e.pgn.startsWith(bare.pgn + ' ')
    ) {
      return true;
    }
    return false;
  });

  // Dedupe by name — the Lichess DB often has the SAME variation
  // name listed at multiple depths (e.g. "Sicilian Defense: Open"
  // appears 4 times with progressively longer PGNs as the line
  // continues). Keep the shortest-PGN entry per name so we cover
  // more distinct variations within maxEntries.
  const byName = new Map<string, OpeningEntry>();
  for (const c of candidates) {
    const existing = byName.get(c.name);
    if (!existing || c.pgn.length < existing.pgn.length) {
      byName.set(c.name, c);
    }
  }
  const deduped = Array.from(byName.values());

  // Sort: shorter PGN first (trunk-near variations like 2.Nc3
  // come before deep sub-lines like Najdorf English Attack at
  // ply 12). Within same PGN length, shorter name first.
  deduped.sort((a, b) => {
    if (a.pgn.length !== b.pgn.length) return a.pgn.length - b.pgn.length;
    return a.name.length - b.name.length;
  });

  const result: OpeningEntry[] = [];
  if (bare) result.push(bare);
  for (const c of deduped) {
    if (result.length >= maxEntries) break;
    result.push(c);
  }
  return result;
}


/** A line-picker option: a named sub-variation the user can choose
 *  to focus the LLM gen on, with a style tag for color-coding. */
export interface LinePickerOption {
  /** Display label (e.g. "Najdorf Variation"). */
  label: string;
  /** Full opening name to send to the gen path (e.g. "Sicilian
   *  Defense: Najdorf Variation") — produces a specific deep-dive. */
  fullName: string;
  /** ECO code, shown as a small badge. */
  eco: string;
  /** Style tag matching one of the keys in neonColors.STYLE_COLORS
   *  ('sharp', 'solid', 'positional', 'tactical', 'gambit',
   *  'classical', 'hypermodern', 'aggressive', etc.). Drives tile
   *  glow color. */
  style: string;
  /** Move count (PGN plies) — surface as a "depth: N moves" hint. */
  pgnLength: number;
  /** Which side the student plays in this line. Driven by the
   *  PARENT opening's nature — defenses (Sicilian, French, Pirc,
   *  KID, etc.) and Black-named openings put the student as Black;
   *  everything else as White. The picker uses this to surface a
   *  small color/icon hint on each tile so the student knows which
   *  side they'll be playing before tapping in. */
  studentSide: 'white' | 'black';
  /** Which side actually "named" this variation per the Lichess DB
   *  PGN — i.e. who moved last in the canonical line. Independent
   *  of the parent opening's studentSide. Examples:
   *    - "Sicilian Defense: Najdorf Variation" (1.e4 c5 … 5...a6) →
   *      leadingSide=black (even ply count)
   *    - "Sicilian Defense: Alapin Variation" (1.e4 c5 2.c3) →
   *      leadingSide=white (odd ply count, White's deflection)
   *    - "Pirc Defense: Austrian Attack" (1.e4 d6 … 4.f4) →
   *      leadingSide=white (White's chosen attack against the Pirc)
   *  UI uses this to label each tile with a small W/B chip so the
   *  student can see whether they'll be following a same-side plan
   *  or learning to face an opposite-side attack. */
  leadingSide: 'white' | 'black';
  /** The move that MAKES this line the line, numbered as it would be written
   *  ("5.Qf3", "5...a6") — the last move of the variation's canonical PGN,
   *  which is the ply the DB names it at.
   *
   *  David 2026-08-02: book names are not how people hold variations in their
   *  heads. He asked for the Vienna Gambit "main line with Qf3" — the DB calls
   *  that the Paulsen Attack, a name he had no reason to know. Showing the move
   *  on the tile is what connects the two. */
  keyMove: string;
  /** The variation's own move sequence. Carried so a consumer can work out
   *  where this line FIRST leaves the family's shared trunk — the naming move
   *  is often several plies deeper than that and is not a continuation of the
   *  family position at all (Najdorf's …a6 is ply 9 of `e4 c5`). */
  pgn: string;
}

/** "5.Qf3" / "5...a6" — the numbered form of the LAST move in a line, which is
 *  the move that named it. */
function namingMove(pgn: string): string {
  const moves = pgn.split(/\s+/).filter(Boolean);
  return numberedMoveAt(moves, moves.length - 1);
}

/** "5.Qf3" / "5...a6" for the move at `index` (0-based). */
function numberedMoveAt(moves: string[], index: number): string {
  const san = moves[index];
  if (!san) return '';
  const ply = index + 1;
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1 ? `${moveNumber}.${san}` : `${moveNumber}...${san}`;
}

/** Normalize for opening-family matching, collapsing the Defence/Defense
 *  spelling split (the ECO DB uses "Defense", repertoire.json uses
 *  "Defence") so "Pirc Defense" and "Pirc Defence" match. */
function normForFamily(s: string): string {
  return normalizeNameForMatch(s).replace(/\bdefence\b/g, 'defense');
}

/** The curated repertoire entry for a bare opening name, or undefined. */
function findCuratedOpeningByName(name: string): CuratedRepertoireOpening | undefined {
  const target = normForFamily(name);
  return CURATED_REPERTOIRE.find(
    (o) => !!o.name && !!o.variations?.length && normForFamily(o.name) === target,
  );
}

/** Resolve a "Parent: Variation" name to its CURATED repertoire line — the
 *  exact PGN the opening detail tab teaches. Preferred over the ECO DB in
 *  the lesson generator so coach lessons match the opening tab (David
 *  2026-05-22: "match the opening"). Returns null when the name isn't a
 *  curated variation (the generator then falls back to resolveOpeningEntry). */
export function resolveCuratedVariation(
  fullName: string,
): { canonicalName: string; eco: string; moves: string[] } | null {
  const target = normForFamily(fullName);
  for (const o of CURATED_REPERTOIRE) {
    if (!o.name || !o.variations) continue;
    for (const v of o.variations) {
      if (!v?.name || !v.pgn) continue;
      if (normForFamily(`${o.name}: ${v.name}`) === target) {
        const moves = v.pgn.split(/\s+/).filter(Boolean);
        if (moves.length === 0) return null;
        return { canonicalName: `${o.name}: ${v.name}`, eco: o.eco ?? '', moves };
      }
    }
  }
  return null;
}

/** Classify a variation's style from name keywords. Falls through to
 *  'classical' as the neutral default. Production heuristic — not
 *  authoritative, but good enough to color-code tiles distinctly so
 *  the user can recognize sharp vs solid lines at a glance.
 *
 *  Keys returned MUST exist in neonColors.STYLE_COLORS so the UI
 *  can look them up via getNeonColor(). */
export function classifyVariationStyle(name: string): string {
  const lower = name.toLowerCase();
  // Hardcoded mappings for major variations whose keyword would
  // misfire on the heuristic below.
  if (/\b(najdorf|dragon|sveshnikov|taimanov|sicilian|hampe.allgaier|frankenstein.dracula)\b/.test(lower)) {
    return 'sharp';
  }
  if (/\b(berlin|petrov|petroff|slav|london|exchange|caro.kann)\b/.test(lower)) {
    return 'solid';
  }
  if (/\b(catalan|qgd|queen'?s gambit declined|nimzo.indian|tarrasch)\b/.test(lower)) {
    return 'positional';
  }
  if (/\b(smith.morra|alapin|grand prix|fried liver)\b/.test(lower)) {
    return 'aggressive';
  }
  if (/\b(king'?s indian|grunfeld|grünfeld|benoni|benko|dutch|alekhine|pirc|modern)\b/.test(lower)) {
    return 'hypermodern';
  }
  if (/\b(scandinavian|center counter)\b/.test(lower)) {
    return 'classical';
  }
  // Heuristic by keyword in the variation suffix.
  if (/\bgambit\b/.test(lower)) return 'gambit';
  if (/\battack\b/.test(lower)) return 'aggressive';
  if (/\bclosed\b/.test(lower)) return 'positional';
  if (/\bopen\b/.test(lower)) return 'open';
  if (/\bclassical\b/.test(lower)) return 'classical';
  if (/\bmodern\b/.test(lower)) return 'hypermodern';
  if (/\bcounter|countergambit\b/.test(lower)) return 'tactical';
  return 'classical';
}

/** When the user types a BROAD opening name (e.g. "Sicilian", "French
 *  Defense", "King's Indian"), the LLM-gen path otherwise spreads the
 *  output budget across many variations and produces a shallow
 *  overview. The line picker intercepts this case: detect that the
 *  query matches a top-level opening with named sub-variations, and
 *  return those variations so the UI can ask the user which one to
 *  deep-dive on. The chosen variation gets the full token budget for
 *  real theoretical depth.
 *
 *  Returns null when:
 *    - The input isn't a broad opening (it's already a specific
 *      variation like "Najdorf Sicilian", or it doesn't resolve in
 *      the DB at all).
 *    - The DB has fewer than `minVariations` sub-variations for the
 *      input (not enough to make a picker worthwhile). */
export function findLinePickerOptions(
  query: string,
  minVariations: number = 5,
): {
  canonicalName: string;
  /** Canonical PGN of the bare opening (e.g. "e4 e5 Nf3 Nc6 Bc4"
   *  for Italian Game). Callers use this to look up curated trap
   *  lines whose move sequence falls under this opening family. */
  canonicalPgn: string;
  options: LinePickerOption[];
} | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Resolve through the alias map first so "KID" / "Caro Kann" work.
  const aliased = NAME_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  const queryNorm = normalizeNameForMatch(aliased);
  // Defence/Defense-tolerant form so British spellings ("Pirc Defence")
  // resolve the bare entry the ECO DB stores as "Pirc Defense".
  const queryFam = normForFamily(aliased);

  // Find the BARE entry — broad opening typed exactly. We use
  // normalized matching so apostrophes / diacritics / hyphens don't
  // block it. Also accept the queryNorm as a strict prefix of the
  // bare name when it ends in "Defense" / "Game" / "Opening" — so
  // user typing "Sicilian" matches the bare "Sicilian Defense".
  // When multiple candidates match (e.g. "King's Indian Defense"
  // AND "King's Indian Attack" both strip to "kings indian"),
  // prefer Defense > Game > Opening > Attack (defense is the most
  // commonly-meant when a user types just the family name).
  const entries = openingsData;
  const bareCandidates = entries.filter((e) => {
    const eNorm = normalizeNameForMatch(e.name);
    if (eNorm === queryNorm || normForFamily(e.name) === queryFam) return true;
    const eStripped = eNorm
      .replace(/\s+(defense|defence|game|opening|attack)$/i, '')
      .trim();
    return (eStripped === queryNorm || eStripped === queryFam) && !e.name.includes(':');
  });
  if (bareCandidates.length === 0) return null;
  const SUFFIX_PRIORITY = ['defense', 'defence', 'game', 'opening', 'attack', ''];
  const bareCandidate = bareCandidates.reduce((a, b) => {
    const ar = SUFFIX_PRIORITY.findIndex((s) =>
      a.name.toLowerCase().endsWith(s),
    );
    const br = SUFFIX_PRIORITY.findIndex((s) =>
      b.name.toLowerCase().endsWith(s),
    );
    return ar <= br ? a : b;
  });

  // The bare entry should be at low PGN depth (top-level opening).
  // If we matched something that's already a sub-variation deep in
  // the tree, the user already specified — no picker needed.
  const barePlies = bareCandidate.pgn.split(/\s+/).filter(Boolean).length;
  if (barePlies > 6 || bareCandidate.name.includes(':')) return null;

  // Enumerate sub-variations: entries whose name starts with
  // bareCandidate.name + ":" — those are the named children. Filter
  // out terminal-short rows so the picker doesn't surface tiles that
  // dead-end after the namesake move.
  const prefix = bareCandidate.name + ':';
  const children = entries.filter(
    (e) => e.name.startsWith(prefix) && isTeachableEntry(e),
  );

  // Dedupe by everything-after-the-colon (DB lists same variation at
  // multiple PGN depths). Keep shortest PGN per unique sub-name.
  // Also tally how many entries fall under each top-level sub-name —
  // a popularity proxy that surfaces real main lines (Najdorf, Dragon,
  // Sveshnikov) over obscure 4-ply sidelines (Brussels Gambit) which
  // would otherwise win on a pure trunk-distance sort.
  const byName = new Map<string, OpeningEntry>();
  const popularity = new Map<string, number>();
  for (const c of children) {
    const subName = c.name.slice(prefix.length).trim();
    // Only the FIRST sub-variation segment (split on ',' — DB nests
    // sub-sub-variations after a comma). "Najdorf Variation, English
    // Attack" becomes just "Najdorf Variation" for the picker.
    const topSub = subName.split(',')[0].trim();
    const fullName = `${bareCandidate.name}: ${topSub}`;
    popularity.set(topSub, (popularity.get(topSub) ?? 0) + 1);
    const existing = byName.get(topSub);
    if (!existing || c.pgn.length < existing.pgn.length) {
      byName.set(topSub, { ...c, name: fullName });
    }
  }

  // Determine which side the student plays for this opening family.
  // Driven by the PARENT name — defenses + Black-named openings put
  // the student as Black; everything else as White. We use the same
  // heuristic as the existing inferStudentSide so picker labels align
  // with the board orientation when the lesson actually loads.
  const parentLower = bareCandidate.name.toLowerCase();
  const isBlackOpening =
    /\bdefen[cs]e\b/.test(parentLower) ||
    /\b(sicilian|french|caro|pirc|modern|alekhine|scandinavian|king.s indian|queen.s indian|nimzo|grunfeld|grünfeld|benoni|benko|dutch|philidor|petroff|petrov|slav|two knights)\b/.test(parentLower);
  const studentSide: 'white' | 'black' = isBlackOpening ? 'black' : 'white';

  // CURATED OVERRIDE (David 2026-05-22: "match the opening"). When this
  // opening family has a hand-authored repertoire entry, the picker shows
  // EXACTLY the variations the opening detail tab shows — same buildVariationTabs
  // logic, so e.g. the Pirc lists all 8 and the Ruy its 7 curated lines. Each
  // tile launches the curated line: the picker submits the full name and the
  // gen path (generateOpeningFromDbNarration → resolveCuratedVariation) builds
  // the walkthrough from the curated PGN. No popularity cap. The ECO
  // enumeration below stays as the fallback for openings with no curated entry.
  const curatedEntry = findCuratedOpeningByName(bareCandidate.name);
  if (curatedEntry?.variations?.length) {
    const variations = curatedEntry.variations;
    // A curated variation's PGN runs all the way to a middlegame (G9.3 Gate B),
    // so its LAST move is deep in the line and says nothing about which line it
    // is — "Austrian Attack, 11...Nac5". Nor is the shared trunk enough: half
    // the Ruy lines play 3...a6 and part ways later, so the trunk would label
    // Marshall, Open and Exchange identically. The move that identifies a line
    // is the first ply at which it is ALONE among its siblings — Berlin at
    // 3...Nf6, Marshall at 8...d5, Exchange at 4.Bxc6.
    const siblingLines = variations.map((v) => v.pgn.split(/\s+/).filter(Boolean));
    const uniqueAt = (moves: string[]): number => {
      for (let i = 0; i < moves.length; i += 1) {
        const sharers = siblingLines.filter(
          (other) => other.length > i && other.slice(0, i + 1).every((san, j) => san === moves[j]),
        );
        if (sharers.length === 1) return i;
      }
      return moves.length - 1;
    };
    const curatedOptions: LinePickerOption[] = buildVariationTabs(curatedEntry.id, variations)
      .map((tab) => {
        const v = variations[tab.index];
        const moves = v.pgn.split(/\s+/).filter(Boolean);
        const pgnLength = moves.length;
        const pgn = v.pgn;
        return {
          label: tab.label,
          fullName: `${curatedEntry.name}: ${v.name}`,
          eco: findOpeningByPgnPrefix(moves)?.eco ?? curatedEntry.eco ?? bareCandidate.eco,
          style: classifyVariationStyle(v.name),
          pgnLength,
        pgn,
       
          studentSide,
          // A curated variation is the OPPONENT's named system (White's
          // attack vs the Pirc; Black's defense vs the Ruy), so the leading
          // side is the opposite of the student's. This is also uniform
          // across an opening's variations, so the per-tile W/B chip stays
          // hidden — matching the clean look (vs deriving from the curated
          // PGN's arbitrary length, which gave a misleading mixed W/B).
          leadingSide: studentSide === 'white' ? 'black' : 'white',
          keyMove: numberedMoveAt(moves, uniqueAt(moves)),
        };
      });
    if (curatedOptions.length > 0) {
      return {
        canonicalName: curatedEntry.name,
        canonicalPgn: bareCandidate.pgn,
        options: curatedOptions,
      };
    }
  }

  // Trust the Lichess DB: every named sub-variation in
  // openings-lichess.json is a real chess opening worth learning.
  // No filtering — both Black-led variations (Najdorf, Dragon) and
  // White-led variations (Austrian Attack vs Pirc, Closed vs Sicilian)
  // belong in the picker. Earlier builds tried to filter by ply-parity
  // and broke Pirc (all variations are White-led there). The user's
  // word: "use the Lichess DB to determine if the line is black or
  // white led" — i.e. trust what's in the DB and let the student pick.
  // Per-variation led-by is exposed via the leadingSide field below
  // so the UI can render a small W/B chip on each tile.
  const options: LinePickerOption[] = Array.from(byName.values())
    .map((e) => {
      const label = e.name.slice(prefix.length).trim();
      const pgnLength = e.pgn.split(/\s+/).filter(Boolean).length;
      // The actual led-by side from the variation's own PGN —
      // odd ply = White moved last, even = Black. Independent of
      // the parent opening's studentSide (which is parent-derived).
      const leadingSide: 'white' | 'black' = pgnLength % 2 === 1 ? 'white' : 'black';
      return {
        label,
        fullName: e.name,
        eco: e.eco,
        // Classify by the sub-variation label ALONE, not the full
        // "Parent: Sub" string. Otherwise "Sicilian Defense:
        // Alapin Variation" would inherit the parent's "sharp" tag
        // and every variation would be sharp. We want each tile
        // colored by ITS character, not the parent's.
        style: classifyVariationStyle(label),
        pgnLength,
        pgn: e.pgn,
        studentSide,
        leadingSide,
        keyMove: namingMove(e.pgn),
      };
    })
    // Sort by popularity descending (count of DB entries falling under
    // this top-level sub-name — a proxy that surfaces real main lines
    // like Najdorf / Dragon / Sveshnikov over 4-ply curiosities like
    // Brussels Gambit). Tie-break: shorter PGN first (trunk-near),
    // then alphabetically.
    .sort((a, b) => {
      const popA = popularity.get(a.label) ?? 0;
      const popB = popularity.get(b.label) ?? 0;
      if (popA !== popB) return popB - popA;
      if (a.pgnLength !== b.pgnLength) return a.pgnLength - b.pgnLength;
      return a.label.localeCompare(b.label);
    });

  if (options.length < minVariations) return null;

  // Cap at 3 options — only the most popular variations per opening
  // family. The Lichess-DB popularity sort runs above; the top 3
  // are the real main lines a learner needs (e.g. for Sicilian:
  // Najdorf, Dragon, Sveshnikov). User trim 2026-05-09: the picker
  // had grown to 15 tiles + curated trap tiles and become noise;
  // strip it back to the essentials.
  const MAX_OPTIONS = 3;
  return {
    canonicalName: bareCandidate.name,
    canonicalPgn: bareCandidate.pgn,
    options: options.slice(0, MAX_OPTIONS),
  };
}

/**
 * Given a requested opening's move list and the current game history,
 * return the next book move the AI should play, or null if we've left the book.
 * Only returns a move if it's the AI's turn according to the opening line.
 *
 * @param openingMoves - Full SAN move list for the opening (from getOpeningMoves)
 * @param gameHistory - Current game SAN history (from chess.js .history())
 * @param aiColor - 'white' | 'black' — which side the AI is playing
 */
export function getNextOpeningBookMove(
  openingMoves: string[],
  gameHistory: string[],
  aiColor: 'white' | 'black',
): string | null {
  const nextPly = gameHistory.length;

  // Check that all game moves so far match the opening line
  for (let i = 0; i < gameHistory.length; i++) {
    if (i >= openingMoves.length) return null; // Past the book
    if (gameHistory[i] !== openingMoves[i]) return null; // Deviated from book
  }

  // Check if the next move is in the book
  if (nextPly >= openingMoves.length) return null;

  // Check if it's the AI's turn (ply 0 = white, ply 1 = black, etc.)
  const isWhiteTurn = nextPly % 2 === 0;
  const isAiTurn = (aiColor === 'white' && isWhiteTurn) || (aiColor === 'black' && !isWhiteTurn);
  if (!isAiTurn) return null;

  return openingMoves[nextPly];
}

/** Reset cached trie (for testing). */
export function _resetTrie(): void {
  cachedTrie = null;
}

/** Which side a canonicalized opening name teaches. Named WHITE attacking
 *  systems inside a "Defense" family (Grand Prix, Smith-Morra, Rossolimo,
 *  Austrian/150 Attack, …) teach WHITE — a student asking for them wants to
 *  PLAY them (David 2026-07-31: "Grand Prix should be white"). */
export function inferStudentSideFromName(name: string): 'white' | 'black' {
  const lower = name.toLowerCase();
  // Named WHITE attacking systems inside a "Defense" family: a student who
  // asks for the Grand Prix (or another anti-Sicilian White system) wants to
  // PLAY it — "Sicilian Defense: Grand Prix Attack" taught the BLACK side
  // because the family name carries "Defense" (David 2026-07-31: "Grand Prix
  // should be white").
  // Named WHITE systems that live inside a "Defense" family name — the side
  // whose STRUCTURE defines the game is the teach-side default (David
  // 2026-07-31: "we know alapin is a white opening because white's structure
  // defines the game… that rule can be applied across openings"). Checked
  // BEFORE the defense→black rule, so "Sicilian Defense: Alapin Variation"
  // teaches White.
  const whiteSystemKeywords = [
    'grand prix', 'smith-morra', 'smith morra', 'alapin variation',
    'rossolimo', 'moscow variation', 'closed sicilian', 'defense: closed',
    "king's indian attack",
    'austrian attack', '150 attack', 'fantasy variation', 'advance variation',
    'exchange variation',
    // 2026-07-31 sweep: every one of these is a White system/attack whose
    // canonical DB name can carry a "…Defense" suffix from the reply.
    'torre attack', 'veresov', 'jobava', 'trompowsky', 'colle',
    'stonewall attack', 'london system', 'catalan', 'panov', 'tarrasch attack',
    'yugoslav attack', 'english attack', 'maroczy', 'canal attack',
    'bishop opening', "bishop's opening", 'evans gambit', 'danish gambit',
    'goring gambit', 'göring gambit', 'scotch gambit', 'king\'s gambit',
    'wing gambit', 'morra', 'sokolsky', 'stoltz attack', 'barmen',
  ];
  for (const kw of whiteSystemKeywords) if (lower.includes(kw)) return 'white';
  // UNSOUND BLACK GAMBITS are taught from the PUNISHING side — the sanctioned
  // exception to "the side whose structure defines the game" (CLAUDE.md). The
  // shipped Latvian/Elephant bakes are explicitly White-voiced ("we're playing
  // the white side… our plan is to exploit the exposed king"), and they only
  // landed on white by falling through to the default at the bottom of this
  // function — one new entry in `blackKeywords` would have silently inverted
  // the coach's pronouns against reviewed narration. State it outright.
  const punishFromWhiteKeywords = [
    'latvian gambit', 'elephant gambit', 'englund gambit', 'damiano defense',
    'damiano defence',
  ];
  for (const kw of punishFromWhiteKeywords) if (lower.includes(kw)) return 'white';
  if (/\bdefen[cs]e\b/.test(lower)) return 'black';
  const blackKeywords = [
    'sicilian', 'french', 'caro-kann', 'caro kann', 'pirc',
    'modern', 'alekhine', 'scandinavian', 'scandi',
    "king's indian", 'kings indian', "queen's indian", 'queens indian',
    'nimzo', 'grunfeld', 'grünfeld', 'benoni', 'benko',
    'dutch', 'philidor', 'petroff', 'petrov', 'slav',
  ];
  for (const kw of blackKeywords) if (lower.includes(kw)) return 'black';
  return 'white';
}

/** Which side the STUDENT ends up on when they ask to play an opening.
 *
 *  Three inputs, in strict precedence: an explicit side ("as black") wins
 *  outright; otherwise "play X AGAINST me" hands the line to the coach and
 *  puts the student on the other end of it; otherwise the student plays the
 *  side the line belongs to.
 *
 *  Shared rather than re-derived because it is asked in three places that must
 *  agree — the request itself, the subline picker's tile, and the side dot
 *  drawn on that tile. A dot that disagrees with the game it starts is worse
 *  than no dot.
 */
export function studentSideForPlay(args: {
  /** The line's own side: `inferStudentSideFromName`, or a picker option's. */
  lineSide: 'white' | 'black';
  /** "play the Sicilian AGAINST me" — the coach takes the line. */
  coachPlaysIt: boolean;
  /** An explicit "as white" / "as black" in the request. */
  sideOverride?: 'white' | 'black' | null;
}): 'white' | 'black' {
  if (args.sideOverride) return args.sideOverride;
  if (!args.coachPlaysIt) return args.lineSide;
  return args.lineSide === 'white' ? 'black' : 'white';
}
