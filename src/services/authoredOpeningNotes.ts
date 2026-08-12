// The hand-written opening prose, as a narration tier.
//
// 🔒 DAVID 2026-08-12: "I still want the computer narrations to fire after the
// handwritten narrations."
//
// `repertoire.json` carries a hand-written `explanation` on all 318 variations.
// None of it reached the walkthrough voice. It fed traps, flashcards and the DB
// layer, but the per-ply narration path went straight from the corpus note to
// model-generated prose — so on the ~85% of plies with no corpus note the model
// wrote from scratch while authored text sat unused one file over.
//
// The tier order is now: baked → corpus note → THIS → generated.
//
// ── WHERE AN OPENING-LEVEL SENTENCE IS ALLOWED TO SPEAK ─────────────────────
//
// An `explanation` describes a VARIATION, not a ply. Smearing it across the
// line — or dropping it on whichever ply happened to be silent — is exactly the
// mis-anchoring that put a Caro-Kann tactic on move two and cost this project a
// locked rule. Being hand-written buys it no exemption: a true sentence on the
// wrong board is still a lie.
//
// So it speaks ONCE, at the ply where its variation becomes itself: the first
// move that departs from the opening's main line. Before that ply the line is
// indistinguishable from the main line and the text is not yet about anything;
// after it, the student is already inside the variation and the introduction has
// passed. Selection is by position — the walked moves must be a prefix of the
// variation's own moves — never by name.
//
// `keyIdeas` are deliberately NOT used here. They are true of the opening as a
// whole and of no particular ply, so they belong to the lesson's framing, the
// same place the corpus's opening-level notes go.

export interface AuthoredVariation {
  name: string;
  pgn?: string;
  explanation?: string;
}

export interface AuthoredEntry {
  name?: string;
  pgn?: string;
  variations?: AuthoredVariation[];
}

/**
 * The repertoire entry whose authored prose belongs to this opening, or null.
 *
 * 🔒 THE WIRE, NOT JUST THE FUNCTION. The first cut of this tier passed the
 * generator's own `entry` — a DB record of `{ canonicalName, eco, moves }` with
 * no `variations` at all — so the lookup could never return anything and the
 * whole tier was dead on arrival. The unit tests still passed, because they
 * exercised `authoredNoteAt` against a correct fixture and never proved the
 * caller handed it the right object. The build's type check is what caught it.
 *
 * Matching is on the opening NAME because that is the only key the two sources
 * share; the note it eventually speaks is still selected by MOVES.
 */
/**
 * Both spellings of the same opening, reduced to one key.
 *
 * 🔒 THE TWO SOURCES DISAGREE ON SPELLING, AND THE TIER WENT SILENT ON 18 OF
 * 43 OPENINGS BECAUSE OF IT. `repertoire.json` is hand-written in British
 * English — "Caro-Kann Defence", "French Defence", "Grünfeld Defence",
 * "Alekhine's Defence" — while the canonical name comes from the Lichess
 * database in American English without the possessive. So `authoredEntryFor`
 * matched on 25 openings and returned null on the other 18, and every one of
 * those lessons quietly went back to model prose over hand-written text that
 * was sitting right there.
 *
 * This is normalisation, not fuzzy matching: the comparison stays exact, it
 * just happens after both sides are spelled the same way. Nothing here can
 * make one opening match a different one.
 */
function nameKey(raw: string): string {
  return raw
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // Grünfeld → Grunfeld
    .toLowerCase()
    // ø, æ, å and ß carry the mark INSIDE the glyph, so NFD has no combining
    // character to strip and leaves them exactly as they were. The database
    // already ships ø; the rest are one keystroke away in any Scandinavian or
    // German name, and each would be a silent miss of the kind British
    // spelling already caused once.
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a').replace(/ß/g, 'ss')
    .replace(/\bdefence\b/g, 'defense')
    .replace(/\bcentre\b/g, 'center')
    .replace(/'s\b/g, '')                               // Alekhine's → Alekhine
    .replace(/[^a-z0-9: ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every spelling of a name that a human source might legitimately have used.
 *
 * 🔒 THERE IS NO SINGLE CORRECT FOLD FOR AN UMLAUT, so do not try to pick one.
 * A writer without the key types "Gruenfeld"; stripping the diacritic from the
 * other source gives "Grunfeld"; the two do not meet. Folding the digraph the
 * other way — ue → u — is worse than useless, because it also turns "Queen"
 * into "Qun" and quietly corrupts a third of the repertoire.
 *
 * So generate both legitimate forms and match if ANY pair agrees. This is still
 * exact matching, over a set of two, and it cannot make one opening match a
 * different one: no real opening name differs only by an umlaut.
 */
function nameKeys(raw: string): string[] {
  const stripped = nameKey(raw);
  const expanded = nameKey(
    raw.replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae')
      .replace(/Ü/g, 'Ue').replace(/Ö/g, 'Oe').replace(/Ä/g, 'Ae'),
  );
  return expanded === stripped ? [stripped] : [stripped, expanded];
}

const namesAgree = (a: string, b: string): boolean => {
  const ka = nameKeys(a);
  return nameKeys(b).some((k) => ka.includes(k));
};

/** The words in a name that actually identify an opening. */
const NAME_STOPWORDS = new Set([
  'defense', 'defence', 'variation', 'game', 'opening', 'attack', 'system',
  'line', 'main', 'classical', 'modern', 'old', 'traditional', 'declined',
  'accepted', 'the',
]);

const nameTokens = (raw: string): string[] =>
  nameKey(raw).split(/[: ]+/).filter((t) => t.length > 0 && !NAME_STOPWORDS.has(t));

export function authoredEntryFor(
  openingName: string | undefined,
  all: readonly AuthoredEntry[],
  spineSans?: readonly string[],
): AuthoredEntry | null {
  // ── MOVES FIRST, NAMES SECOND ────────────────────────────────────────────
  //
  // 🔒 SPELLING WAS THE SMALL HALF OF THIS PROBLEM. After the British fix, a
  // sweep of all 43 entries against the names the database actually produces
  // still missed 12 — and none of those were spelling:
  //
  //   · the repertoire files families in shorthand ("Sicilian: Najdorf") while
  //     the database says "Sicilian Defense: Najdorf Variation, Opocensky
  //     Variation, Traditional Line" — not a prefix, so: nothing;
  //   · sub-openings are their own entry here ("Evans Gambit", "Two Knights
  //     Defence", "Schliemann Defence") but live under a parent there
  //     ("Italian Game: Evans Gambit, Morphy Attack"), so longest-prefix
  //     resolved to the PARENT — worse than a miss, because the lesson would
  //     be offered the wrong opening's variations.
  //
  // Names are a translation layer between two independent human conventions,
  // and translation layers leak. The moves do not: if the lesson's spine walks
  // this entry's line, it IS this entry, in any language and under any naming
  // convention. So the spine decides when we have it, and the name only
  // arbitrates when we do not.
  if (spineSans && spineSans.length > 0) {
    // When two entries follow the spine equally far, the name breaks the tie —
    // "Four Knights Game: Glek System" agrees with the Four Knights main line
    // for its whole length, so depth alone hands the Glek's lesson to its
    // parent. Counting which entry's identifying words the canonical name
    // actually carries picks the specific one.
    const canonicalTokens = new Set(nameTokens(openingName ?? ''));
    let best: { entry: AuthoredEntry; depth: number; named: number } | null = null;
    for (const e of all) {
      // How far this entry's own lines follow the spine. Variations count too:
      // a lesson on the Advance French follows that variation, not the main
      // line, and would otherwise score barely above every other French entry.
      let depth = 0;
      for (const pgn of [e.pgn, ...(e.variations ?? []).map((v) => v.pgn)]) {
        const line = sansOf(pgn);
        let i = 0;
        while (i < line.length && i < spineSans.length && line[i] === spineSans[i]) i += 1;
        if (i > depth) depth = i;
      }
      if (depth < MIN_SPINE_AGREEMENT) continue;
      const named = nameTokens(e.name ?? '').filter((t) => canonicalTokens.has(t)).length;
      if (!best || depth > best.depth || (depth === best.depth && named > best.named)) {
        best = { entry: e, depth, named };
      }
    }
    if (best) return best.entry;
  }

  if (!openingName) return null;
  const want = nameKey(openingName);
  if (!want) return null;
  const exact = all.find((e) => namesAgree(e.name ?? '', openingName));
  if (exact) return exact;

  // Failing that, the most specific entry whose identifying words are ALL
  // present in the canonical name. Subset, not prefix: it reaches
  // "Sicilian: Najdorf" from "Sicilian Defense: Najdorf Variation, …", which
  // prefix matching could not, and it prefers "Evans Gambit" over its parent
  // "Italian Game" because it matches more identifying words.
  const wantTokens = new Set(nameTokens(openingName));
  const scored = all
    .map((e) => ({ e, t: nameTokens(e.name ?? '') }))
    .filter(({ t }) => t.length > 0 && t.every((tok) => wantTokens.has(tok)))
    .sort((a, b) => b.t.length - a.t.length || (b.e.name ?? '').length - (a.e.name ?? '').length);
  if (scored.length > 0) return scored[0].e;

  // Last resort, the original prefix rule, for a name whose identifying words
  // the canonical form drops entirely.
  const prefixed = all
    .filter((e) => {
      const n = nameKey(e.name ?? '');
      return n.length > 0 && (want.startsWith(`${n}:`) || want.startsWith(`${n} `));
    })
    .sort((a, b) => (b.name ?? '').length - (a.name ?? '').length);
  return prefixed[0] ?? null;
}

/**
 * How many plies of agreement make a spine identify an entry.
 *
 * Four, because every 1.e4 e5 opening shares three and picking on fewer would
 * hand the Italian's prose to the Ruy. Below this the name decides instead.
 */
const MIN_SPINE_AGREEMENT = 4;

/** SAN tokens from a PGN move string — move numbers and results dropped. */
export function sansOf(pgn: string | undefined): string[] {
  if (!pgn) return [];
  return pgn
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

const isPrefix = (short: readonly string[], long: readonly string[]): boolean =>
  short.length <= long.length && short.every((s, i) => s === long[i]);

/**
 * The ply index at which `variation` first departs from `main`.
 *
 * Returns null when the variation never departs (it IS the main line, or a
 * truncation of it) — such an entry has no moment of its own to be introduced
 * at, and speaking it anywhere would be an arbitrary choice.
 */
export function divergencePly(main: readonly string[], variation: readonly string[]): number | null {
  const n = Math.min(main.length, variation.length);
  for (let i = 0; i < n; i += 1) {
    if (main[i] !== variation[i]) return i;
  }
  return null;
}

/**
 * The authored explanation for the line being walked, or null.
 *
 * @param sansSoFar every SAN played up to and including this ply.
 * @param used variation names already spoken this lesson — mutated on a hit, so
 *        one lesson never introduces the same variation twice.
 */
export function authoredNoteAt(
  entry: AuthoredEntry,
  sansSoFar: readonly string[],
  used: Set<string>,
): { text: string; variationName: string } | null {
  if (sansSoFar.length === 0) return null;
  const main = sansOf(entry.pgn);
  const here = sansSoFar.length - 1;

  const candidates = (entry.variations ?? [])
    .filter((v) => (v.explanation ?? '').trim().length > 0)
    .map((v) => ({ v, sans: sansOf(v.pgn) }))
    .filter(({ v, sans }) => {
      if (sans.length === 0) return false;
      if (used.has(v.name)) return false;
      // We must actually be walking THIS line, not merely sharing a prefix with
      // it by accident: everything played so far has to be its opening moves.
      if (!isPrefix(sansSoFar, sans)) return false;
      return divergencePly(main, sans) === here;
    });

  if (candidates.length === 0) return null;
  // Several variations can branch at the same ply. Take the deepest — it is the
  // most specific line consistent with what has actually been played — and
  // break ties by name so a regenerated lesson reads identically.
  candidates.sort((a, b) => (b.sans.length - a.sans.length) || a.v.name.localeCompare(b.v.name));
  const pick = candidates[0];
  used.add(pick.v.name);
  return { text: (pick.v.explanation ?? '').trim(), variationName: pick.v.name };
}
