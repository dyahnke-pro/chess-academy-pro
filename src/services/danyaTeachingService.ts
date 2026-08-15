// danyaTeachingService — THE teaching-idea grounding source for the whole
// coach (David 2026-07-12: "what he teaches in every position, accompanied by
// his explanation of the position, and the future plans… as close to danya
// next to you as I think we can get"). Replaces the pre-1930 book corpus in
// every coach-SPEECH path (David: "unwire the books, I don't want them
// intruding on danya"); the BookReader surfaces keep the books as an explicit
// reading feature.
//
// The corpus (`src/data/danya-teachings.json`) is built OFFLINE by
// scripts/danya-corpus/ from his teaching videos: original prose (never
// transcript text — 7-gram gate), chess.js-validated move prefixes, every
// note source-tagged `yt:<videoId>`. This service is the ONLY consumer.
//
// G0: notes are curated grounding CONTEXT — the same class the book passages
// were. Code selects which notes match the live position/opening; the model
// phrases teaching from them and decides nothing else.

import { Chess } from 'chess.js';
import teachingsData from '../data/danya-teachings.json';
import { computeStructureSignature, signatureMatchScore, type StructureSignature } from './structureSignature';
import { validateBoardClaims } from './boardClaimValidator';
import { secondarySupportNotes, secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import { detectOpening } from './openingDetectionService';
import { noteContradictsLine, notePhaseMismatchesBoard } from './noteLineGuard';
import { boardConcepts, phaseOfFen } from './boardConcepts';
import { noteDescribesPosition, noteTeachesChessNotItsSource, noteStaysInScope, notePhaseMatchesBoardWords, noteRecommendsALegalMove, noteSuitsStudentSide } from './noteAnchorIntegrity';
import { bakedSpoken } from './spokenNoteBake';
import { falseConfigurationClaim } from './configurationClaims';
import { logAppAudit } from './appAuditor';
import { applyDerivedAnchors } from './noteAnchorOverrides';
import { openingReachesPosition } from './openingBranches';

export interface DanyaNote {
  id: string;
  lineSan: string[];
  opening: string | null;
  phase: 'opening' | 'middlegame' | 'endgame' | 'concept';
  explains: string;
  teaches: string;
  plans: string;
  concepts: string[];
  sources: string[];
  /**
   * HOW the position in `lineSan` was established — written by
   * `stamp-provenance.mjs` from the anchor pass's own verdict.
   *
   *   high / medium  the anchor pass re-derived the position and checked this
   *                  note's claims against that board.
   *   inferred       the position is the chunk aligner's GUESS: either no
   *                  matching line could be found (no-spine) or one was found
   *                  and it disproved the filed position (rejected).
   *
   * This exists because the position is the fact that decides whether a note
   * may describe a board, and an inferred one was being spoken with the same
   * authority as a verified one. Walking the Ruy, five of the ten notes that
   * spoke were inferred, and they produced "the bishop's fianchetto" at Bb5
   * and "the early d-pawn locks the bishop" with no d-pawn moved.
   *
   * Optional: absent on any corpus stamped before this field existed, and
   * treated as `inferred` wherever it is missing — an unverified position must
   * never inherit verified authority through an omission.
   */
  positionSource?: 'high' | 'medium' | 'inferred';
}

interface TeachingsBundle {
  generatedAt: string;
  videosDistilled: number;
  noteCount: number;
  notes: DanyaNote[];
}

const RAW_DATA = teachingsData as unknown as TeachingsBundle;

// Derived anchors are applied ONCE, here, before any index below is built —
// every lookup map (prefix, opening, concept, fen) must be keyed on the
// corrected line or the correction is invisible to selection. See
// `noteAnchorOverrides`, and read `scripts/derive-note-anchors.mjs` before
// touching the derivation itself.
const DATA: TeachingsBundle = { ...RAW_DATA, notes: applyDerivedAnchors(RAW_DATA.notes ?? []) };

/** Position-keyed notes indexed by their SAN-prefix key ("e4 c6 d4"). */
const byPrefix = new Map<string, DanyaNote[]>();
/** Opening-keyed notes (normalized opening-name token key). */
const byOpening = new Map<string, DanyaNote[]>();
/** Concept-keyed notes, "phase::concept" — teaching that belongs to no opening. */
const byConcept = new Map<string, DanyaNote[]>();

// Opening names reach this from two vocabularies that do NOT agree: the app's
// own surfaces use British spellings and diacritics ("French Defence", "Réti
// Opening", "Grünfeld"), while corpus tags are stamped from the Lichess DB in
// American ASCII ("French Defense", "Reti Opening", "Grunfeld"). Folding both
// to one form is what makes the token matcher below mean anything — without
// the fold, `é` was stripped to a SPACE, which shredded "Réti" into "r"+"ti"
// and left the query as the single generic token "opening".
const SPELLING_VARIANTS: Array<[RegExp, string]> = [
  [/\bdefence\b/g, 'defense'],
  [/\bcentre\b/g, 'center'],
  [/\bmanoeuvre\b/g, 'maneuver'],
  [/\bgambit accepted\b/g, 'accepted'],
];

const normName = (s: string): string => {
  let out = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, to] of SPELLING_VARIANTS) out = out.replace(re, to);
  return out;
};

// Tokens that name no opening on their own. A query that shares ONLY these with
// a corpus key has matched nothing: "Réti Opening" once reduced to {opening}
// and pulled 344 notes from the Ponziani, the Catalan and Bishop's Opening at a
// perfect 1.0 score. A match must agree on something that actually identifies
// the opening.
const GENERIC_TOKENS = new Set([
  'opening', 'defense', 'game', 'attack', 'variation', 'system', 'gambit',
  'line', 'setup', 'declined', 'accepted', 'main', 'modern', 'classical',
]);

/** The tokens of an opening name that actually NAME an opening, with the
 *  generic scaffolding ("Opening", "Defense", "Variation") removed. */
const identifyingTokens = (name: string): Set<string> =>
  new Set(normName(name).split(' ').filter((t) => t.length > 2 && !GENERIC_TOKENS.has(t)));

/** A note tagged with an opening may only teach in a lesson on THAT opening.
 *
 *  Found on prod (David 2026-08-02, teaching the Vienna Copycat): the first ply
 *  of the lesson was narrated with `hp-5d5` — a note anchored at ["e4"] and
 *  tagged "Caro-Kann Defense: Advance Variation, Botvinnik-Carls Defense" — so
 *  the coach opened a Vienna lesson by recounting a Caro-Kann game ("White
 *  played the greedy Qd4… in the Caro-Kann, ...Nc6 is a natural way to do
 *  this"). Every existing guard passed it: its claims are true of the position
 *  it describes, it recites no "After …" line, and its phase is `opening`.
 *
 *  Nothing about the BOARD can catch this, because at ply 1 the board is
 *  consistent with both openings. What catches it is the note's own tag: the
 *  corpus already says which opening the note teaches, and that is not the
 *  opening the student asked for.
 *
 *  Agreement is at FAMILY level — one shared identifying token is enough — so a
 *  "Vienna Game" note still teaches in "Vienna Game: Copycat Variation", and a
 *  Najdorf lesson still hears general Sicilian teaching. Only a note that
 *  shares nothing with the lesson's name is rejected. An untagged note has
 *  made no claim to contradict, and a lesson with no resolved name has nothing
 *  to compare against; both are left alone. */
export function noteOpeningConflicts(
  noteOpening: string | null | undefined,
  lessonOpening: string | null | undefined,
): boolean {
  if (!noteOpening || !lessonOpening) return false;
  const noteTokens = identifyingTokens(noteOpening);
  const lessonTokens = identifyingTokens(lessonOpening);
  if (noteTokens.size === 0 || lessonTokens.size === 0) return false;
  for (const t of noteTokens) if (lessonTokens.has(t)) return false;
  return true;
}

/** A move prefix shorter than this identifies no opening, so a note anchored
 *  there is not teaching about the position — it is teaching about wherever
 *  its own line went, which the student has not played.
 *
 *  The same prod incident: `hp-5d5` sits at ["e4"] and narrates a game six
 *  moves deep. Anchored one ply in, it matched EVERY 1.e4 lesson's first move.
 *  The corpora carry 82 such notes (≤ 2 plies) and every one is tagged with a
 *  specific opening — proof that the anchor is a truncation, not the position
 *  being taught. They are excluded from the EXACT tier entirely; the opening
 *  tier still reaches them for the lesson they actually belong to. */
const MIN_TEACHING_ANCHOR_PLIES = 3;

/** Exported so the funnel report can ATTRIBUTE its rejections. While this was
 *  private it fell into an "unselected" bucket of 4,076 candidates alongside
 *  tie-losers and two other private filters — the largest number in the table
 *  and the only one nobody could see inside. 688 plies were reported as dying
 *  to "mixed" causes largely because of that blind spot. */
export const anchorTeachesItsPosition = (n: DanyaNote): boolean =>
  n.lineSan.length >= MIN_TEACHING_ANCHOR_PLIES;

/**
 * True when the note's position was VERIFIED rather than guessed.
 *
 * `high` and `medium` both mean the anchor pass re-derived the position and
 * checked the note's own claims against that board; `inferred` means it did
 * not, and a missing field means the corpus predates the stamp. Missing counts
 * as unverified ON PURPOSE — an omission must never grant a position the
 * authority of a checked one.
 *
 * Cut-off measured 2026-08-15 over 6,738 positioned notes: high+medium is
 * 4,645 (68.9%), high alone 2,452 (36.4%). Medium is kept because the failures
 * seen live were all `no-spine` or `rejected`, never medium — tightening to
 * high alone would silence a third of the corpus to fix defects it does not
 * have.
 */
export const isVerifiedPosition = (n: DanyaNote): boolean =>
  n.positionSource === 'high' || n.positionSource === 'medium';


for (const n of DATA.notes) {
  if (n.lineSan.length > 0) {
    const key = n.lineSan.join(' ');
    const bucket = byPrefix.get(key) ?? [];
    bucket.push(n);
    byPrefix.set(key, bucket);
  }
  if (n.opening) {
    const key = normName(n.opening);
    const bucket = byOpening.get(key) ?? [];
    bucket.push(n);
    byOpening.set(key, bucket);
  }
  // CONCEPT tier — teaching that belongs to no opening (2026-08-02). Most of
  // what a lecture channel teaches is universal: king activity in endgames,
  // when a trade actually helps, how to target a structural weakness. Keyed by
  // "phase::concept" so a caller can ask for the phase it is in and the idea
  // it is teaching, which is the only thing that is true about these notes.
  if (n.concepts.length > 0) {
    for (const c of n.concepts) {
      const key = `${n.phase}::${c.toLowerCase()}`;
      const bucket = byConcept.get(key) ?? [];
      bucket.push(n);
      byConcept.set(key, bucket);
    }
  }
}

// ── TRANSPOSITION index (David 2026-07-12: "can we include transpositions?").
// Notes are authored as move sequences, but the POSITION is what he's
// teaching — so every position-keyed note is also indexed by the normalized
// FEN its moves produce (placement + side + castling + en-passant; the move
// counters are path-dependent and dropped). A game reaching the same position
// through a different move order now finds the note. Built lazily: ~replaying
// every note once on first lookup, then cached.
const byFen = new Map<string, DanyaNote[]>();
let fenIndexBuilt = false;

const normFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

function ensureFenIndex(): void {
  if (fenIndexBuilt) return;
  fenIndexBuilt = true;
  for (const n of DATA.notes) {
    if (n.lineSan.length === 0) continue;
    try {
      const c = new Chess();
      for (const san of n.lineSan) c.move(san);
      const key = normFen(c.fen());
      const bucket = byFen.get(key) ?? [];
      bucket.push(n);
      byFen.set(key, bucket);
    } catch { /* gate guarantees legality; belt-and-suspenders */ }
  }
}

/** Notes whose taught position IS this position — regardless of the move
 *  order that reached it (transposition-safe). */
export function notesForFen(fen: string, maxNotes = Infinity): DanyaNote[] {
  ensureFenIndex();
  return (byFen.get(normFen(fen)) ?? []).slice(0, maxNotes);
}

/** Notes keyed at or before the current position: walks every prefix of the
 *  played SANs, longest first, so the most position-specific teaching wins.
 *  `withinPlies` bounds ancestor staleness — a note anchored more than that
 *  many plies behind the current position is skipped (its moment has passed;
 *  the plan may already be resolved). `maxNotes` bounds the injection size. */
export function notesForPrefix(historySans: string[], maxNotes = Infinity, withinPlies = Infinity): DanyaNote[] {
  const out: DanyaNote[] = [];
  const minLen = Number.isFinite(withinPlies) ? Math.max(1, historySans.length - withinPlies) : 1;
  for (let len = historySans.length; len >= minLen && out.length < maxNotes; len -= 1) {
    const key = historySans.slice(0, len).join(' ');
    for (const n of byPrefix.get(key) ?? []) {
      if (out.length >= maxNotes) break;
      out.push(n);
    }
  }
  return out;
}

/** The single most position-specific note EXACTLY at the current position
 *  (not an ancestor) — for step narration, where an ancestor note would
 *  narrate a move that already happened. Pass `fen` (the live board) to also
 *  catch transpositions into a taught position. */
/** STRUCTURE-TRANSFER fallback for a ply the exact tier has nothing for: a note
 *  from any opening whose taught STRUCTURE provably matches this board and whose
 *  concrete claims survive the live-board filter inside `notesForStructure`.
 *  Code selects, code verifies.
 *
 *  🔒 THE OPENING-NAME ARM IS GONE (2026-08-04). This used to reach any note
 *  TAGGED with the lesson's opening — matched on name-token overlap, scored
 *  ≥ 0.6, with no reference to the board at all. That was the one
 *  non-deterministic selector in the chain, and it is what put a note authored
 *  at a different position in front of the model to phrase as if it described
 *  this one: a Caro-Kann lesson narrating "the tactic Bxf7+ followed by Nxe5
 *  works only if Black's bishop on d6 is defended" at move two. `openingGenerator`
 *  had documented the correct contract since 2026-07-30 — "never the fuzzy
 *  tiers, so a note can't land on the wrong ply" — and wiring this tier into
 *  the splice on 2026-08-01 broke it.
 *
 *  Opening-level notes are not lost. They are lesson-level material, and
 *  `buildDanyaTeachingBlock` is where they belong: context for the whole
 *  lesson, never a claim about the move on the board right now.
 *
 *  Kept separate from `noteAtPosition` rather than folded into it: that
 *  function's contract is "EXACTLY at this position", and several callers
 *  (fork talk, step narration) depend on that strictness. */
export function supportNoteForPly(
  historySans: string[],
  fen: string,
  openingName?: string | null,
  /** Notes the caller has already spoken, so this can advance to the next
   *  usable one instead of returning a repeat the caller must discard.
   *
   *  Measured 2026-08-04 across the 1,310 plies of `repertoire.json`: 647 of
   *  them — 49% — retrieved a note the lesson had ALREADY used, and every one
   *  was thrown away by the generator's dedupe, leaving the ply silent. That is
   *  three times as many plies as actually got teaching (207). Retrieval always
   *  returned its single best candidate; the caller could only accept or drop
   *  it, never ask for the next one. */
  exclude?: ReadonlySet<string>,
): DanyaNote | null {
  const usable = (n: DanyaNote): boolean =>
    anchorTeachesItsPosition(n)
    // The position must have been VERIFIED, not guessed. This tier is the one
    // that speaks a note as teaching about THIS board, so it may only use a
    // position the anchor pass re-derived and claim-checked. An `inferred`
    // position is the chunk aligner's guess — either nothing matched it
    // (no-spine) or something did and DISPROVED it (rejected) — and speaking
    // one here is the G0 violation: chess content asserted about a board from
    // an inference rather than a computation.
    //
    // Measured on the Ruy: five of the ten notes that spoke were inferred, and
    // they produced "the bishop's fianchetto was ahead of its time" at Bb5 and
    // "the early d-pawn locks the light-squared bishop" with no d-pawn moved.
    // Those notes are not deleted — they remain reachable through the opening
    // and concept tiers, where `generalizedTeaching` frames them honestly as a
    // general idea rather than a claim about the position in front of the
    // student.
    && isVerifiedPosition(n)
    && !noteContradictsLine(`${n.explains} ${n.teaches}`, historySans)
    && !notePhaseMismatchesBoard(n.phase, fen, historySans.length)
    && !noteOpeningConflicts(n.opening, openingName)
    && noteDescribesPosition(n, fen)
    && noteTeachesChessNotItsSource(n)
    // A correctly-ANCHORED note can still narrate a different BRANCH: at a
    // shared prefix (e4 c6 d4 d5 serves five Caro variations) the position
    // says nothing about which line the prose teaches. A note naming a
    // variation foreign to this lesson is out of scope — David's 2026-08-05
    // run heard "In the Fantasy…" inside a Tartakower lesson.
    && noteStaysInScope(n, openingName)
    && !exclude?.has(n.id);
  try {
    // STRUCTURE TRANSFER IS OFF INSIDE A TAUGHT LESSON (David 2026-08-02:
    // "make sure the coach stays scoped to the opening that it was asked to
    // teach"). Borrowing another opening's note because the pawn structures
    // rhyme is right for a live board past book, wrong when the student named
    // the opening they wanted taught. A ply with nothing to say falls back to
    // computed prose about THIS position, which is on topic and true.
    if (openingName) return null;
    return notesForStructure(fen).filter(usable)[0] ?? null;
  } catch {
    return null; // the corpus is a bonus, never a blocker
  }
}

/** How many plies of an opening's canonical line the farmed corpora actually
 *  teach at.
 *
 *  This is the switch that decides whether a lesson is taught from the NOTES or
 *  from a hand-authored masterclass (David 2026-08-01: "let's make the
 *  notes/tier 2 the primary source for lessons/walkthroughs"). It has to be
 *  measured rather than assumed: a static masterclass is instant and verified,
 *  so handing an opening to the slower generated path only pays when the notes
 *  have something real to say about it. An opening the corpora never covered
 *  would otherwise trade a good lesson for a slow, thinner one.
 *
 *  Counts the EXACT tier only, and each note once — an opening-level note that
 *  matches everywhere is not coverage of the line. */
export function noteCoverageForLine(historySans: readonly string[]): number {
  if (historySans.length === 0) return 0;
  const seen = new Set<string>();
  const chess = new Chess();
  const prefix: string[] = [];
  for (const san of historySans) {
    try {
      if (!chess.move(san)) break;
    } catch {
      break;
    }
    prefix.push(san);
    const note = noteAtPosition(prefix, chess.fen());
    if (note && !seen.has(note.id)) seen.add(note.id);
  }
  return seen.size;
}

// 🔒 A note is selected for a ply when its ANCHOR PRODUCES THAT PLY'S POSITION —
// by move-prefix or by transposition into the same FEN. Nothing else selects.
//
// There is deliberately no "close enough" here (David 2026-08-04: "All
// narrations need to be deterministically found and handed to llm in the
// package. There is no room for false narrations on this app! Ever!!"). An
// anchor a few plies back, or a note merely TAGGED with this opening, teaches
// about a board the student is not looking at — and handing that to the model
// to phrase is the hallucination, upstream of any gate that might catch it. A
// staleness window was tried here first and was wrong for the same reason: the
// same fuzziness, smaller. `noteSelectionDeterminism.test.ts` is the proof.
export function noteAtPosition(
  historySans: string[],
  fen?: string,
  openingName?: string | null,
  /** Notes the caller has already spoken. See `supportNoteForPly`. */
  exclude?: ReadonlySet<string>,
): DanyaNote | null {
  // A note that recites a different line than the one played narrates the wrong
  // opening (see noteLineGuard) — silence beats teaching someone else's theory.
  // `openingName` is the lesson's own opening: a note tagged with a DIFFERENT
  // one is teaching a different opening even when it is anchored right here.
  const onThisLine = (n: DanyaNote): boolean =>
    anchorTeachesItsPosition(n)
    // The position must have been VERIFIED, not guessed. This is the tier that
    // speaks a note AS teaching about the board in front of the student, so it
    // may only use a position the anchor pass re-derived and claim-checked. An
    // `inferred` position is the chunk aligner's guess — nothing matched it
    // (no-spine), or something did and DISPROVED it (rejected).
    //
    // This is the G0 fix, and it is a NARROWING rather than another stripper:
    // the position is the fact that licenses the claim, and we were asserting
    // it from an inference. Measured on the Ruy, five of the ten notes that
    // spoke were inferred, producing "the bishop's fianchetto was ahead of its
    // time" at Bb5 and "the early d-pawn locks the light-squared bishop" with
    // no d-pawn moved.
    //
    // Nothing is deleted: these notes stay reachable through the opening and
    // concept tiers, where `generalizedTeaching` frames them honestly as a
    // general idea instead of a claim about this position.
    && isVerifiedPosition(n)
    && !noteContradictsLine(`${n.explains} ${n.teaches}`, historySans)
    && !notePhaseMismatchesBoard(n.phase, fen, historySans.length)
    && !noteOpeningConflicts(n.opening, openingName)
    // The note must describe THIS position, not merely be filed at it. 3.8% of
    // position-keyed notes open by describing a board that cannot arise here —
    // a transcript distilled against the wrong moment. See noteAnchorIntegrity.
    && noteDescribesPosition(n, fen)
    && noteTeachesChessNotItsSource(n)
    // A correctly-ANCHORED note can still narrate a different BRANCH: at a
    // shared prefix (e4 c6 d4 d5 serves five Caro variations) the position
    // says nothing about which line the prose teaches. A note naming a
    // variation foreign to this lesson is out of scope — David's 2026-08-05
    // run heard "In the Fantasy…" inside a Tartakower lesson.
    && noteStaysInScope(n, openingName)
    && !exclude?.has(n.id);
  // WHEN SEVERAL NOTES SIT AT ONE BOARD, PREFER THE ONE WHOSE OWN OPENING GETS
  // HERE. Measured over the 1,310 plies of repertoire.json: 44.6% of selected
  // notes name an opening whose real DB line never reaches the board they were
  // picked at — ply 4 of the Italian selecting a note tagged "King's Gambit
  // Accepted: Allgaier", ply 10 of the Ruy selecting "Ruy Lopez: Alapin
  // Defense" (a line that plays 3…Bb4 and never arrives here).
  //
  // Deliberately a PREFERENCE, not a reject. Dropping all 44.6% would cut
  // per-ply coverage from 12.7% to 7.0%, and it would be throwing away notes
  // that are fine: the anchor and the tag disagree, and when the prose already
  // passed `noteDescribesPosition` the ANCHOR is the half that is trustworthy —
  // the tag is just noise from distillation. Sorting costs nothing and fixes
  // the case that matters, because a note that both names a foreign opening AND
  // fails board truth was already dropped above.
  const preferReachable = (notes: DanyaNote[]): DanyaNote[] => {
    if (notes.length < 2) return notes;
    return [...notes].sort((a, b) => {
      const ok = (n: DanyaNote): number =>
        (!n.opening || openingReachesPosition(n.opening, historySans) ? 1 : 0);
      return ok(b) - ok(a);
    });
  };

  const bucket = preferReachable((byPrefix.get(historySans.join(' ')) ?? []).filter(onThisLine));
  if (bucket[0]) return bucket[0];
  if (fen) {
    // Uncapped: `notesForFen(fen, 1)` handed the filter a single candidate, so
    // one note failing `onThisLine` (or already spoken) meant silence at a
    // position the corpus does teach.
    const viaFen = preferReachable(notesForFen(fen).filter(onThisLine))[0];
    if (viaFen) return viaFen;
  }
  // GAP TIER, exact positions only. This is the walkthrough splice's source, so
  // without it the narration goes silent on an opening the primary corpus never
  // covers. The "exactly at this position" contract is preserved — only a
  // secondary note keyed at THIS very line qualifies, never an opening-level one.
  const viaSecondaryPrefix = preferReachable(secondaryNotesForPosition(historySans).filter(onThisLine))[0];
  if (viaSecondaryPrefix) return viaSecondaryPrefix;
  // SECONDARY TRANSPOSITION — same contract, other corpora. Until 2026-08-04
  // only the primary corpus was indexed by position, so 5,412 position-keyed
  // secondary notes were reachable only by an exact move-order string match.
  // That scarcity is what made the fuzzy opening-name arm look necessary; this
  // is the deterministic way to get the reach back, and the note is provably
  // about THIS board.
  return fen ? preferReachable(secondaryNotesForFen(fen).filter(onThisLine))[0] ?? null : null;
}

/** The best teaching note for a live position, for FACT-PACKAGE builders
 *  (thinkAloud, step narration): exact position first, then STRUCTURE
 *  TRANSFER — a note from any opening whose taught structure matches this
 *  board and whose claims are true on it. Selection + verification in code;
 *  the note rides in the GROUNDED FACTS the model must voice (G0). */
/** WHERE a teaching note came from — and therefore what a caller is allowed to
 *  say about it.
 *
 *  This exists because three surfaces were labelling every note "Coaching note
 *  for THIS position" while `teachingNoteForBoard` could return a note borrowed
 *  from another opening or a general principle attached to no position at all.
 *  The note was fine; the CLAIM around it was false, and the model faithfully
 *  phrased the claim. Handing the origin along with the note is what makes an
 *  honest label possible (David 2026-08-04: "not handing the correct package to
 *  the llm and letting it hallucinate"). */
export type TeachingOrigin = 'position' | 'opening-family' | 'structure' | 'concept';

export interface TeachingSource {
  note: DanyaNote;
  origin: TeachingOrigin;
}

/** The note, WITH its provenance. Prefer this over `teachingNoteForBoard`
 *  anywhere the note is described to the model or the student — see
 *  `teachingFactLine`. */
export function teachingSourceForBoard(
  historySans: string[],
  fen: string,
  openingName?: string | null,
  /**
   * A note the CALLER can actually use. Every tier keeps looking until one
   * passes, instead of handing back its first pick and letting the caller
   * discard it into silence.
   *
   * That was measured, not imagined: walking a Vienna Gambit game ply by ply,
   * five of twelve plies selected a real note and then said nothing, because
   * `spokenBeatText` strips a note whose prose is a move-list recitation — and
   * three of those five were the SAME note re-picked on consecutive plies after
   * the caller had already rejected it. The corpus had teaching for those
   * positions; the pipeline threw it away one step before the voice.
   *
   * Default accepts everything, so callers that make no demands are unchanged.
   */
  accept: (note: DanyaNote, origin: TeachingOrigin) => boolean = () => true,
): TeachingSource | null {
  // The exact tier answers with ONE note, so retrying means asking again with
  // the rejects excluded. Bounded — after a few passes the position genuinely
  // has nothing more to offer and the next tier is the better answer.
  const rejected = new Set<string>();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const exact = noteAtPosition(historySans, fen, openingName, rejected);
    if (!exact) break;
    if (accept(exact, 'position')) return { note: exact, origin: 'position' };
    rejected.add(exact.id);
  }
  // THE NOTE'S PHASE MUST MATCH THE BOARD'S (2026-08-05). Sampling what this
  // function actually returned past book came back 14 for 14 `opening-family`,
  // reciting opening theory at ply 34, 51, 68 — "After c4 c5 Nc3, if Black
  // plays ...c6" to a student in a middlegame. The family tier answers on
  // almost any position (the corpus holds thousands of notes per opening), so
  // it SHADOWED structure transfer and the concept tier completely: neither
  // could ever be reached, and the middlegame/endgame corpus stayed dark.
  //
  // `notePhaseMismatchesBoard` did not catch it — it only rejects an ENDGAME
  // note on a non-endgame board, so nothing stopped an OPENING note at move 30.
  // Matching the phase keeps the tier where it is right (an opening's own
  // middlegame plan is a middlegame note) and lets the board-read tiers answer
  // where they belong.
  const boardPhase = phaseOfFen(fen);
  // 🔒 EVERY TIER IS CHECKED AGAINST THE BOARD, not just the position tier.
  //
  // A whole game (2026-08-09) heard, from the family and concept tiers: "After
  // Qd2, Black has the option of Bg4" with Qd2 illegal; "The move Bh4 is a
  // strong choice because it keeps the pin" with no Bh4 and no pin; and "The
  // rook endgame turns on removing both white pawns" in a middlegame with both
  // bishops and all four rooks on the board. Each was fluent, each was true
  // somewhere, none was about the board in front of the student.
  //
  // These three checks read the note's own words against this position, which
  // is the only thing that separates the right note from a plausible one (G0 —
  // fix the package, don't validate the phrasing afterwards).
  const phaseFits = (note: DanyaNote): boolean =>
    noteTeachesChessNotItsSource(note)
    && (!boardPhase || note.phase === 'concept' || note.phase === boardPhase)
    && notePhaseMatchesBoardWords(note, boardPhase)
    && noteRecommendsALegalMove(note, fen)
    && noteDescribesPosition(note, fen);
  // GAP TIER — an opening the primary corpus never covers still gets a note in
  // the FACTS PACKAGE, so the coach can teach its ideas instead of going quiet.
  //
  // Ordered BEFORE structure transfer deliberately: transfer borrows a note
  // from a DIFFERENT opening because the structures rhyme, which is the right
  // answer when the primary corpus knows this opening and simply has nothing at
  // this exact position — but a poor one when it has never taught the opening
  // at all. There, teaching actually about the opening in front of the student
  // beats a structural analogy. The gate is `primaryHits`: any opening-level
  // coverage in the primary corpus suppresses the gap tier entirely.
  //
  // Most gap-tier notes are opening-keyed rather than position-keyed, so the
  // opening name is what reaches them. Callers that already know it pass it;
  // for the rest it is derived here from the move history, so every existing
  // facts-package call site gains gap coverage without being rewired.
  // GAP TIER — teaching for an opening the primary corpus never covers (David
  // 2026-08-01: "I want the notes to be able to cover gaps in any masterclass or
  // Danya openings we teach"). Selected by opening NAME, so it is teaching about
  // the OPENING, not about this board — which is exactly what `origin` records.
  // It used to be returned indistinguishable from an exact-position note, and
  // every caller then announced it as "Coaching note for THIS position". The
  // teaching was never the problem; the claim wrapped around it was. Callers
  // that SPEAK a note about the current move take `origin === 'position'` only;
  // a facts package may carry this one, labelled.
  const resolvedOpening = openingName ?? (() => {
    try { return detectOpening(historySans)?.name ?? null; } catch { return null; }
  })();
  // 🔒 OPENING TEACHING BELONGS TO THE OPENING. This tier is reached by opening
  // NAME, not by position, and it frames what it finds as "A general idea in
  // this opening" — true and useful while the opening is what the student is
  // looking at.
  //
  // Past that it is the loudest thing in the room and none of it is about the
  // game. A full 24-ply game (2026-08-09) heard it on nearly every ply: "In
  // this line of the Petrov" on a board that was never a Petrov; "After Qd2,
  // Black has the option of Bg4" with no queen on d2; "White can play Rh2";
  // "The Bogo-Indian demands deep understanding" — and, on move 17, the run's
  // ONE genuinely false board claim, a bishop on g2 where a pawn stood. It also
  // shadowed the two tiers that ARE board-checked, so the structure and concept
  // notes that exist for a middlegame never got a turn.
  //
  // The fix is not a better filter on the prose. It is that a tier selected by
  // name has nothing to say about a position it was never shown: past the
  // opening, the board-read tiers below answer, and if they have nothing the
  // honest result is silence.
  if (boardPhase && boardPhase !== 'opening') {
    // fall through to the board-read tiers
  } else {
    const support = secondarySupportNotes({
      historySans,
      openingName: resolvedOpening,
      maxNotes: 1,
      // THE ONE TIER WITH NO BOARD TEST, until now. It reaches by NAME, and a
      // name says nothing about the position — David's prod game, playing a
      // Sicilian, was taught "After e4 e5, if White plays Bb5+… Black can play
      // Bd7" (the Spanish) and "White prefers Re1 over d3… Black plays Nh6"
      // (the Italian), both announced as "a general idea in this opening".
      // It now has to clear the same truth filter its board-read siblings do.
      accept: (n) => !noteOpeningConflicts(n.opening, resolvedOpening)
        && phaseFits(n)
        && noteClaimsHoldOnBoard(n, fen)
        && accept(n, 'opening-family'),
    })[0];
    if (support) return { note: support, origin: 'opening-family' };
  }
  // STRUCTURE TRANSFER is deliberately cross-opening (a note from anywhere whose
  // structure provably matches this board), so no tag check applies — its
  // licence to borrow is the proven signature match plus the live-board claim
  // filter inside `notesForStructure`. It is honest teaching about a DIFFERENT
  // position, which is why it carries `origin: 'structure'` and must never be
  // announced as a fact about this board.
  //
  // 🔒 NOT IN THE OPENING. Both borrow-tiers below answer "this KIND of
  // position" — and in the opening there is no kind yet, only a specific line.
  // Measured on a Vienna Gambit game: plies 2, 3 and 4 borrowed a King's-Indian
  // pawn-storm note, a Four Knights Scotch note, and a note about a bishop on
  // e3 that did not exist. Every one was honestly framed ("the same idea shows
  // up in positions like this") and every one was noise two moves into a game.
  // Opening teaching is position-specific by nature: if the corpus taught this
  // line it is in the exact or family tier already, and if it did not, silence
  // is the honest answer (empty > generic). The other lanes — tactics, threats,
  // gems, the improving move — still speak on those plies, so this is quieter
  // corpus, not a quieter coach.
  if (boardPhase === 'opening') return null;
  const transferred = notesForStructure(fen).find((n) => phaseFits(n) && accept(n, 'structure'));
  if (transferred) return { note: transferred, origin: 'structure' };
  // CONCEPT TIER — last, because it is the least specific: teaching about this
  // KIND of position rather than this one. It earns its place at the end of the
  // chain because the alternative here is silence, and a rook endgame where the
  // corpus knows the technique should not go untaught merely because no note
  // was authored at this exact FEN.
  //
  // The tags come from `boardConcepts`, which reads the board and emits nothing
  // unless the position plainly shows the idea — so an unremarkable middlegame
  // still falls through to null rather than collecting a platitude. Code picks
  // the ideas, the model only phrases the note (G0).
  const derived = boardConcepts(fen);
  if (!derived) return null;
  // Predicate INTO the query — the limit must cap accepted notes, not the pool
  // they are drawn from. See conceptNotesFor's `accept`.
  const concept = conceptNotesFor({
    phase: derived.phase,
    concepts: derived.concepts,
    limit: 8,
    accept: (n) => phaseFits(n) && accept(n, 'concept'),
  })[0];
  return concept ? { note: concept, origin: 'concept' } : null;
}

/** The note alone, for callers that only need the text and make no claim about
 *  where it came from. If you are about to write the word "position" next to the
 *  result, use `teachingSourceForBoard` + `teachingFactLine` instead. */
export function teachingNoteForBoard(
  historySans: string[],
  fen: string,
  openingName?: string | null,
): DanyaNote | null {
  return teachingSourceForBoard(historySans, fen, openingName)?.note ?? null;
}

/**
 * The note rendered as ONE grounded fact, labelled with what it actually is.
 *
 * Every caller used to write "Coaching note for THIS position: …" regardless of
 * where the note came from, so a principle about rook endgames in general, or a
 * note borrowed from another opening because the structures match, reached the
 * model as an assertion about the board in front of the student. The model then
 * phrased the assertion — correctly, from its point of view. Stating the
 * provenance is what makes that impossible, and it belongs here rather than at
 * each call site so the three surfaces cannot drift apart again.
 */
/**
 * The note as a SPOKEN line, framed so a borrowed one is heard as a
 * generalization rather than as a description of this board.
 *
 * `teachingFactLine` is for a facts PACKAGE handed to the model, where a header
 * sentence is the right shape. This is for narration a student hears mid-game,
 * where "Teaching from a DIFFERENT position with the same pawn structure —"
 * would be absurd out loud. The honesty requirement is identical; only the
 * register changes. A note taught at this very position needs no frame at all.
 */
export function generalizedTeaching(
  origin: TeachingOrigin | TransitionOrigin,
  text: string,
): string {
  switch (origin) {
    case 'position':
      return text;
    // Anchored a few plies back on THIS line — near enough to be about the run
    // of play, so it is framed as continuation rather than as generalization.
    case 'recent-path':
      return `Following on from the line so far: ${text}`;
    case 'opening-family':
      return `A general idea in this opening: ${text}`;
    case 'structure':
      return `The same idea shows up in positions like this: ${text}`;
    case 'concept':
      return `As a rule in these positions: ${text}`;
    // Exhaustive today; an origin added later must state its own framing rather
    // than silently reaching the student as a bare claim about this board.
    default:
      return text;
  }
}

export function teachingFactLine(source: TeachingSource): string {
  const beat = teachingBeatText(source.note);
  switch (source.origin) {
    case 'position':
      return `Coaching note taught at THIS position: ${beat}`;
    case 'opening-family':
      return `Teaching about this OPENING in general, NOT a claim about this board: ${beat}`;
    case 'structure':
      return `Teaching from a DIFFERENT position with the same pawn structure — an analogy, NOT a description of this board: ${beat}`;
    case 'concept':
      return `A general principle for this KIND of position, not a claim about this board: ${beat}`;
  }
}

/** Opening-keyed notes by (fuzzy-tokenized) opening name. "Caro-Kann Defense:
 *  Advance Variation" matches notes filed under "Caro-Kann Defense" and vice
 *  versa via token-subset matching. */
export function notesForOpening(openingName: string, maxNotes = Infinity): DanyaNote[] {
  const qTokens = new Set(normName(openingName).split(' ').filter((t) => t.length > 2));
  if (qTokens.size === 0) return [];
  const scored: Array<{ n: DanyaNote; score: number }> = [];
  for (const [key, bucket] of byOpening) {
    const kTokens = key.split(' ').filter((t) => t.length > 2);
    if (kTokens.length === 0) continue;
    const sharedTokens = kTokens.filter((t) => qTokens.has(t));
    // Agreement on "opening"/"defense" alone is not agreement on an opening.
    if (!sharedTokens.some((t) => !GENERIC_TOKENS.has(t))) continue;
    const score = sharedTokens.length / Math.max(1, Math.min(kTokens.length, qTokens.size));
    if (score >= 0.6) for (const n of bucket) scored.push({ n, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || (b.n.lineSan.length - a.n.lineSan.length))
    .slice(0, maxNotes)
    .map((s) => s.n);
}

/** Does the primary corpus teach THIS opening specifically — not merely its
 *  family? `notesForOpening` matches a variation against its parent by design
 *  ("Caro-Kann Defense: Advance" ↔ "Caro-Kann Defense"), which is right for
 *  retrieval and wrong as a coverage test: a query for the Taimanov matches 40
 *  notes tagged plain "Sicilian Defense", none of which teach the Taimanov.
 *
 *  Specific coverage means some primary tag carries EVERY identifying token of
 *  the query, so "French Defence" is covered by "French Defense" while
 *  "Sicilian … Taimanov" is not covered by "Sicilian Defense". This gates the
 *  gap tier only; ordinary lookups keep their family matching. */
export function primaryCoversOpening(openingName: string): boolean {
  const qTokens = normName(openingName)
    .split(' ')
    .filter((t) => t.length > 2 && !GENERIC_TOKENS.has(t));
  if (qTokens.length === 0) return byOpening.size > 0;
  for (const key of byOpening.keys()) {
    const kTokens = new Set(key.split(' '));
    if (qTokens.every((t) => kTokens.has(t))) return true;
  }
  return false;
}

/** A plans-bearing note for the current path — the phase-transition hook
 *  ("the opening's set; here's the plan he teaches from this structure").
 *  FEN-first (transposition-safe, exactly this structure), then recent
 *  ancestors only (within 12 plies — a plan taught at move 5 is stale by
 *  move 14; David 2026-07-12 "improve the other limitations"). */
export function planNoteForPath(historySans: string[], fen?: string): DanyaNote | null {
  if (fen) {
    const exact = notesForFen(fen).find((n) => n.plans && n.plans.trim().length > 0);
    if (exact) return exact;
  }
  const notes = notesForPrefix(historySans, Infinity, 12);
  return notes.find((n) => n.plans && n.plans.trim().length > 0) ?? null;
}

/** The TRANSITION teaching for the current game — Danya's opening→middlegame
 *  ritual is structure → idea → plan, so this returns the whole note, chosen
 *  by tightening circles (David 2026-07-12 "make the phase transitions match
 *  more closely to his teachings"):
 *    1. exact position (FEN, transposition-safe),
 *    2. recent path prefix (≤12 plies back),
 *    3. the OPENING FAMILY's middlegame teaching — most real games have left
 *       book by the transition, but his middlegame notes for the family still
 *       apply (the structure family is what he teaches from).
 *  Board-false specifics in a family-level note are dropped downstream by the
 *  per-sentence spoken gate; the structural teaching survives. */
export type TransitionOrigin = 'position' | 'recent-path' | 'opening-family' | 'structure';

export interface TransitionTeaching {
  note: DanyaNote;
  origin: TransitionOrigin;
}

/** The transition teaching WITH its provenance — which decides how much of the
 *  note may be spoken.
 *
 *  Only tier 1 is authored at the board the student is looking at. The caller
 *  used to speak every tier's `explains` + `teaches` + `plans` verbatim into the
 *  transition sentence, so a family-level note's description of ITS position was
 *  narrated as a description of THIS one. `plans` is the exception and the
 *  reason the lower tiers still earn their place: it is forward-looking — where
 *  this kind of position is heading — which stays true when borrowed. See
 *  `usePhaseNarration`, which speaks the full ritual only for `'position'`. */
export function transitionTeachingSourceForGame(args: {
  historySans: string[];
  fen?: string;
  openingName?: string | null;
  /** The side the student is playing, so the ritual never coaches their
   *  opponent. See `noteSuitsStudentSide`. */
  studentSide?: 'white' | 'black' | null;
}): TransitionTeaching | null {
  // WHICH phase's teaching this transition wants. Hardcoded to 'middlegame'
  // until 2026-08-05, which was invisible while the caller only ran this on the
  // opening→middlegame boundary. The moment the endgame transition started
  // using it, that hardcoding would have handed a student entering a rook
  // ending a middlegame plan.
  const wantPhase = (args.fen ? phaseOfFen(args.fen) : null) ?? 'middlegame';
  // SCOPE IS NOT OPTIONAL ON THIS PATH EITHER. Every other selection site asks
  // `noteStaysInScope`; this one never did, and a full Sicilian game on prod
  // was told "the critical moment is when white plays Ba4; black must choose
  // between ...Ra6 and ...d5" — the Ruy Lopez, named move for named move, at a
  // phase transition in a Dragon. The honest "a general idea in this opening"
  // framing makes it worse, not better: it presents another opening's theory
  // as this one's.
  const usable = (n: DanyaNote): boolean =>
    Boolean(n.plans?.trim())
    && noteTeachesChessNotItsSource(n)
    && noteStaysInScope(n, args.openingName)
    && noteSuitsStudentSide(n, args.studentSide);
  const exact = args.fen ? notesForFen(args.fen).find(usable) : undefined;
  if (exact) return { note: exact, origin: 'position' };
  const recent = notesForPrefix(args.historySans, Infinity, 12).find(usable);
  if (recent) return { note: recent, origin: 'recent-path' };
  if (args.openingName) {
    const family = notesForOpening(args.openingName)
      .filter((n) => n.phase === wantPhase && usable(n));
    // Deepest-keyed first — the most specific middlegame teaching for the family.
    family.sort((a, b) => b.lineSan.length - a.lineSan.length);
    if (family[0]) return { note: family[0], origin: 'opening-family' };
  }
  // 4. GAP TIER — the transition ritual on an opening the primary corpus never
  //    covers. Ahead of structure transfer for the reason given on
  //    `teachingNoteForBoard`: a real plan for THIS opening beats a borrowed
  //    plan from another one. Any primary opening-level coverage suppresses it.
  if (args.openingName) {
    const support = secondarySupportNotes({
      historySans: args.historySans,
      openingName: args.openingName,
      maxNotes: 1,
      accept: (n) => n.phase === wantPhase && usable(n),
    })[0];
    if (support) return { note: support, origin: 'opening-family' };
  }
  // 5. STRUCTURE TRANSFER — teaching from ANY opening whose structure provably
  //    matches this board (and whose claims survive the live truth filter), so
  //    past book the transition teaching no longer goes quiet.
  if (args.fen) {
    const transferred = notesForStructure(args.fen).find((n) => n.phase === wantPhase && usable(n));
    if (transferred) return { note: transferred, origin: 'structure' };
    // CONCEPT tier — the endgame's own teaching lives here (king activity, the
    // rook behind the passed pawn), keyed off what the board plainly shows.
    // Without it a transition into an ending the corpus has no opening-tagged
    // note for goes quiet, which is most of them: only 97 endgame notes carry a
    // position at all.
    const derived = boardConcepts(args.fen);
    if (derived) {
      // Concept notes are keyed off IDEAS, not positions — so the tier must
      // still refuse a note whose spoken text names pieces this board no
      // longer has (the K+P/"trade rooks" class), and whose claims fail the
      // same live truth filter the structure tier applies. Selection owns
      // this; the caller's grade is the backup that should never fire.
      const boardFen = args.fen;
      const concept = conceptNotesFor({
        phase: derived.phase,
        concepts: derived.concepts,
        limit: 5,
        accept: (n) => {
          if (!usable(n)) return false;
          if (!namedPiecesExistOnBoard(n.plans ?? '', boardFen)) return false;
          try {
            return validateBoardClaims(`${n.explains} ${n.teaches} ${n.plans}`, boardFen).violations.length === 0;
          } catch { return false; }
        },
      })[0];
      if (concept) return { note: concept, origin: 'structure' };
    }
  }
  return null;
}

/** Back-compat shim for callers that need only the note. Anything that SPEAKS
 *  the note must use `transitionTeachingSourceForGame` and honour the origin. */
export function transitionTeachingForGame(args: {
  historySans: string[];
  fen?: string;
  openingName?: string | null;
}): DanyaNote | null {
  return transitionTeachingSourceForGame(args)?.note ?? null;
}

/** Render notes as a compact system-prompt grounding block (the slot the
 *  book-passage block used to fill). Returns '' when nothing matches. */
// ── STRUCTURE-TRANSFER tier (David 2026-07-30: "make those distilled ideas
// work in similar positions not associated with the exact opening.
// Deterministically."). A note taught at one position usually teaches a
// STRUCTURE (IQP play, the Maróczy clamp, a rook-endgame technique), so it
// applies wherever code proves the same structure exists:
//   1. every position-keyed note's taught position gets a structure signature
//      (lazily, once — pure chess.js);
//   2. the live FEN gets the same signature; candidates = notes whose
//      signature MATCHES (named family shared / same endgame material class);
//   3. each candidate's prose is truth-filtered against the LIVE board — a
//      note whose concrete piece-on-square claims don't hold here is dropped
//      before it can be offered.
// Code selects, code verifies; the model still only phrases (G0).
const noteSignatures = new Map<string, StructureSignature>();
let signatureIndexBuilt = false;

function ensureSignatureIndex(): void {
  if (signatureIndexBuilt) return;
  signatureIndexBuilt = true;
  for (const n of DATA.notes) {
    if (n.lineSan.length === 0) continue;
    try {
      const c = new Chess();
      for (const san of n.lineSan) c.move(san);
      noteSignatures.set(n.id, computeStructureSignature(c.fen()));
    } catch { /* gate guarantees legality; belt-and-suspenders */ }
  }
}

/** Every piece TYPE a note's spoken text names must exist on the board for at
 *  least one side. This is what stops "black should trade rooks" being
 *  borrowed for a king-and-pawn ending — the exact defect David's K+P sample
 *  surfaced (2026-08-05): the structure and concept tiers select by STRUCTURE
 *  or CONCEPT, so nothing else in the ladder ever asks whether the pieces the
 *  prose talks about are still on the board. Square-specific claims stay the
 *  grading gate's job; this is the cheaper, selection-time question a note
 *  must answer first (G0: fix the package, the gate is the backup). */
export function namedPiecesExistOnBoard(text: string, fen: string): boolean {
  const spoken = (text ?? '').toLowerCase();
  if (!spoken) return true;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return true; } // unjudgeable → pass
  const present = new Set<string>();
  for (const row of chess.board()) {
    for (const p of row) if (p) present.add(p.type);
  }
  const NAMES: Array<[string, string]> = [
    ['queen', 'q'], ['rook', 'r'], ['bishop', 'b'], ['knight', 'n'], ['pawn', 'p'],
  ];
  for (const [word, type] of NAMES) {
    if (!present.has(type) && new RegExp(`\\b${word}s?\\b`).test(spoken)) return false;
  }
  return true;
}

/** Notes whose TAUGHT STRUCTURE matches the live position, regardless of
 *  opening — deterministic transfer. Excludes exact-position hits (the FEN
 *  tier owns those) and drops any note making a claim that is false on THIS
 *  board. */
/** Does everything this note asserts hold on THIS board?
 *
 *  The same pair of checks the structure and concept tiers have always run,
 *  lifted out so the name-matched tier can be held to it too. */
function noteClaimsHoldOnBoard(n: DanyaNote, fen: string): boolean {
  try {
    if (validateBoardClaims(`${n.explains} ${n.teaches} ${n.plans}`, fen).violations.length > 0) return false;
    return namedPiecesExistOnBoard(n.plans ?? '', fen);
  } catch {
    return false;
  }
}

export function notesForStructure(fen: string, maxNotes = Infinity): DanyaNote[] {
  ensureSignatureIndex();
  ensureFenIndex();
  let live: StructureSignature;
  try { live = computeStructureSignature(fen); } catch { return []; }
  const exactHere = new Set((byFen.get(normFen(fen)) ?? []).map((n) => n.id));
  const scored: Array<{ n: DanyaNote; score: number }> = [];
  for (const n of DATA.notes) {
    if (n.lineSan.length === 0 || exactHere.has(n.id)) continue;
    const sig = noteSignatures.get(n.id);
    if (!sig) continue;
    const score = signatureMatchScore(live, sig);
    if (score <= 0) continue;
    // Truth filter: the note must not assert anything false about THIS board.
    // `plans` is IN the filtered text — it is the only field the transition
    // path SPEAKS for a borrowed note (usePhaseNarration, non-position
    // origins), and until 2026-08-05 it was the one field never checked: a
    // "trade rooks" plan sailed onto a king-and-pawn ending because only
    // explains+teaches were judged. Filter what will be spoken.
    const text = `${n.explains} ${n.teaches} ${n.plans}`;
    try {
      if (validateBoardClaims(text, fen).violations.length > 0) continue;
      if (!namedPiecesExistOnBoard(n.plans ?? '', fen)) continue;
    } catch { continue; }
    scored.push({ n, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, maxNotes).map((s) => s.n);
}

/** Detector tactic type → the corpus concept tags that teach it. Unknown
 *  tags simply miss in the concept index (OR semantics) — never a throw. */
/** Detector type → the concept tags the CORPUS actually uses for it.
 *
 *  These were one or two tags each, chosen by what the idea is *called* rather
 *  than by what the 58,124 notes are *tagged*, and the difference was most of
 *  the lane. `back_rank` pointed at `back-rank-weakness` — 47 notes — while
 *  `back-rank-mate` (390) and `back-rank` (89) sat unreachable; `trapped_piece`
 *  reached 187 and missed `queen-trap` (169), `trapping` (122), `trap` (104),
 *  `traps` (90); and NOTHING reached `sacrifice` (1,597), `deflection` (413) or
 *  `overloading` (203) at all. Every tag below was counted in the corpus first —
 *  a tag no note carries is a dead entry that silently narrows the lane.
 *
 *  Ordering matters: the SPECIFIC tags lead so a note actually about the live
 *  pattern outranks a generic `tactics` note that merely mentions one. */
export const TACTIC_TYPE_CONCEPTS: Record<string, string[]> = {
  fork: ['fork', 'knight-fork', 'double-attack', 'tactics'],
  pin: ['pin', 'pins', 'pinning', 'absolute-pin', 'relative-pin', 'tactics'],
  skewer: ['skewer', 'x-ray', 'tactics'],
  discovery: ['discovered-attack', 'discovered-check', 'double-attack', 'tactics'],
  double_check: ['discovered-check', 'double-attack', 'king-safety', 'tactics'],
  back_rank: ['back-rank-mate', 'back-rank', 'back-rank-weakness', 'checkmate-pattern', 'king-safety'],
  removal_of_guard: ['deflection', 'overloading', 'overloaded-piece', 'removing-the-defender', 'tactics', 'calculation'],
  mate_threat: ['checkmate-threat', 'mate-threat', 'forced-mate', 'checkmate-pattern', 'checkmate-patterns', 'king-hunt', 'attack'],
  trapped_piece: ['trapped-piece', 'queen-trap', 'trapping', 'trap', 'traps', 'tactics'],
  hanging: ['hanging-piece', 'hanging-pieces', 'undefended-piece', 'material-gain', 'tactical-awareness', 'calculation'],
  sacrifice: ['sacrifice', 'piece-sacrifice', 'exchange-sacrifice', 'pawn-sacrifice', 'compensation', 'tactics'],
  // Not tactics the live detectors emit — these exist for PUZZLE themes, where
  // Lichess labels a pattern the corpus teaches but no board-reader announces.
  passed_pawn: ['passed-pawn', 'pawn-promotion', 'promotion', 'outside-passed-pawn'],
  attack: ['kingside-attack', 'attack', 'king-hunt', 'pawn-storm'],
  defense: ['defense', 'prophylaxis', 'counterplay'],
};

/** ONE corpus note teaching a tactic that is PROVEN on the board right now,
 *  returned as plain spoken text for the instant voice.
 *
 *  The tactical lane existed but fed only `buildDanyaTeachingBlock` — the
 *  model's prompt. So a note about the fork on the board reached the student
 *  paraphrased 6-23s later, or not at all when the beat was dropped stale
 *  (measured: 4 of 6 beats in a real game). It is a concept-index lookup with
 *  no engine and no model in it, so there is no reason it cannot be spoken the
 *  moment the pattern appears. `types` comes from the DETECTORS only (G0) —
 *  never guessed, never from prose. */
export function spokenTacticNote(args: {
  types: string[];
  phase?: 'opening' | 'middlegame' | 'endgame';
  /** Ids already spoken this game — a repeated note teaches nothing. */
  seenIds?: Set<string>;
  /** The LIVE board. Without it a note may assert a configuration this
   *  position does not have — caught on prod at move 4: "doubled rooks on the
   *  open file x-ray the opposing rook behind a knight", with every rook still
   *  at home. Squares were already stripped; that sentence names none, which is
   *  exactly why stripping squares was not enough. */
  fen?: string | null;
}): { id: string; text: string } | null {
  if (args.types.length === 0) return null;
  const concepts = Array.from(new Set(
    args.types.flatMap((t) => TACTIC_TYPE_CONCEPTS[t] ?? ['tactics', 'tactical-awareness']),
  ));
  // THE TAG IS NOT THE TEACHING. A tag says a note was FILED under the pattern;
  // it does not say the note TEACHES it. Selecting on the tag alone returned
  // `dt-b1` for a skewer — "Black castles long and White plays Rf4, but Black is
  // better" — a move-recitation fragment about an unrelated game that happens to
  // carry the tag. Spoken at the moment a skewer appears, that is noise dressed
  // as coaching. So the note's own PROSE must name the pattern it is being
  // chosen to explain.
  const patternWords = args.types.flatMap((t) => TACTIC_PATTERN_WORDS[t] ?? []);
  if (patternWords.length === 0) return null;
  for (const n of conceptNotesFor({ phase: args.phase ?? 'middlegame', concepts, words: patternWords, limit: 40 })) {
    if (args.seenIds?.has(n.id)) continue;
    const text = spokenBeatText(n);
    if (!text) continue;
    const low = text.toLowerCase();
    if (!patternWords.some((w) => low.includes(w))) continue;
    // NO GEOMETRY. This tier is reached by PATTERN, so the note is spoken over
    // a board it was never written about — its own example's squares would be
    // false about the position in front of the student. The bake generalizes
    // them away; a note that still names one has not been baked yet (or could
    // not be), and is not safe to speak here. Caught live: a fork drill offered
    // "if the opponent captures on f6…" over a puzzle with nothing on f6.
    //
    // This doubles as the bake-readiness check, so coverage rises on its own as
    // the bake lands rather than needing a flag day.
    if (NAMES_A_SQUARE.test(text)) continue;
    // …and no structural claim the board does not support.
    if (args.fen) {
      const bad = falseConfigurationClaim(text, args.fen);
      if (bad) {
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: 'spokenTacticNote.configurationClaim',
          summary: `skipped a note claiming "${bad}" — not true of this board`,
          fen: args.fen,
        });
        continue;
      }
    }
    args.seenIds?.add(n.id);
    return { id: n.id, text };
  }
  return null;
}

/** A board square named in prose ("f6", "d4"). Case-sensitive on the file so
 *  ordinary capitalised words never trip it. */
const NAMES_A_SQUARE = /\b[a-h][1-8]\b/;

/** Lichess puzzle themes → the detector keys above.
 *
 *  A puzzle already knows what pattern it is; the corpus has thousands of notes
 *  about those patterns. The drill was asking the wrong question — it looked a
 *  note up by the PUZZLE'S POSITION, and a Lichess puzzle position is
 *  essentially never in a corpus of taught lines, so the lookup fired almost
 *  never. The theme is the key that actually matches.
 *
 *  Vocabularies do not agree (Lichess camelCases and splits finely), so this is
 *  the translation layer. Themes describing DIFFICULTY or PHASE — `short`,
 *  `long`, `endgame`, `crushing` — are deliberately absent: they say nothing
 *  about what the student should learn. */
export const PUZZLE_THEME_TO_TACTIC: Record<string, string> = {
  fork: 'fork', doubleAttack: 'fork',
  pin: 'pin',
  skewer: 'skewer', xRayAttack: 'skewer',
  discoveredAttack: 'discovery',
  doubleCheck: 'double_check',
  backRankMate: 'back_rank',
  deflection: 'removal_of_guard', attraction: 'removal_of_guard',
  decoy: 'removal_of_guard', clearance: 'removal_of_guard',
  interference: 'removal_of_guard', overloading: 'removal_of_guard',
  capturingDefender: 'removal_of_guard',
  sacrifice: 'sacrifice',
  trappedPiece: 'trapped_piece',
  hangingPiece: 'hanging',
  advancedPawn: 'passed_pawn', promotion: 'passed_pawn',
  kingsideAttack: 'attack', queensideAttack: 'attack', exposedKing: 'attack',
  defensiveMove: 'defense',
  mate: 'mate_threat', mateIn1: 'mate_threat', mateIn2: 'mate_threat',
  mateIn3: 'mate_threat', mateIn4: 'mate_threat', mateIn5: 'mate_threat',
  smotheredMate: 'mate_threat', arabianMate: 'mate_threat', anastasiaMate: 'mate_threat',
  bodenMate: 'mate_threat', doubleBishopMate: 'mate_threat', hookMate: 'mate_threat',
};

/** ONE corpus note teaching the pattern a PUZZLE is about, for the moment
 *  AFTER it has been graded.
 *
 *  Never before or during: while the student is solving, the board is the
 *  lesson, and naming the pattern IS the answer (narration rule 8 — drill
 *  positions stay silent). Afterwards it is the teaching, and it matters most
 *  on a MISS, where the note is precisely the idea they did not have.
 *
 *  The note it returns is geometry-free by construction — `spokenTacticNote`
 *  serves the baked form, and a floating note's ORIGINAL prose names its own
 *  example's squares, which would be false about the position the student is
 *  still looking at. */
export function tacticNoteForPuzzleThemes(args: {
  themes: string[];
  seenIds?: Set<string>;
  /** The puzzle's board — a note may not assert a configuration it lacks. */
  fen?: string | null;
}): { id: string; text: string } | null {
  const types = Array.from(new Set(
    args.themes.map((t) => PUZZLE_THEME_TO_TACTIC[t]).filter((t): t is string => Boolean(t)),
  ));
  if (types.length === 0) return null;
  return spokenTacticNote({ types, phase: 'middlegame', seenIds: args.seenIds, fen: args.fen });
}

/** The words a note must actually SAY to count as teaching a given pattern.
 *  Deliberately narrow — a note that never names the idea is not explaining it,
 *  whatever it was tagged. */
const TACTIC_PATTERN_WORDS: Record<string, string[]> = {
  fork: ['fork', 'double attack', 'two pieces at once'],
  pin: ['pin', 'pinned', 'pinning'],
  skewer: ['skewer', 'x-ray'],
  discovery: ['discover', 'discovered'],
  double_check: ['double check', 'discovered check'],
  back_rank: ['back rank', 'back-rank'],
  removal_of_guard: ['defender', 'deflect', 'overload', 'guard'],
  mate_threat: ['mate', 'mating'],
  trapped_piece: ['trap', 'trapped'],
  hanging: ['hanging', 'undefended', 'en prise', 'loose piece'],
  sacrifice: ['sacrifice', 'sacrific'],
  passed_pawn: ['passed pawn', 'promote', 'promotion', 'queening'],
  attack: ['attack', 'assault', 'storm'],
  defense: ['defend', 'defence', 'defense'],
};

/** Endgame lesson id (endgameLessonsService catalog) → the corpus concepts
 *  that teach its idea. Every concept listed here EXISTS in the endgame
 *  phase of the loaded corpus (probed 2026-08-14: king-activity 114,
 *  passed-pawn 74, zugzwang 63, rook-endgame 46, opposition 25, …) — the
 *  gate test asserts that stays true so a re-farm can't silently orphan a
 *  lesson's lookup. Same architecture as PUZZLE_THEME_TO_TACTIC: the
 *  lesson already knows what idea it teaches; the corpus has notes about
 *  that idea; this is the translation layer. */
export const ENDGAME_LESSON_CONCEPTS: Record<string, string[]> = {
  'activate-the-king': ['king-activity', 'king activity', 'endgame-technique'],
  'push-passed-pawns': ['passed-pawn', 'passed pawn', 'promotion', 'pawn-promotion', 'pawn promotion'],
  'attack-weak-pawns': ['weak-pawn', 'weak-pawns', 'weak pawns', 'pawn-structure', 'pawn structure'],
  'two-weaknesses': ['endgame-technique', 'weak-pawn', 'prophylaxis'],
  'do-not-rush': ['waiting-move', 'prophylaxis', 'endgame-technique', 'zugzwang'],
  'rooks-behind-passed-pawns': ['rook-endgame', 'rook-activity', 'passed-pawn'],
  'trade-when-ahead': ['simplification', 'conversion', 'material-advantage'],
  'opposition': ['opposition', 'pawn-endgame'],
  'key-squares': ['key-squares', 'key squares', 'opposition', 'pawn-endgame'],
  'rule-of-the-square': ['pawn-race', 'pawn-endgame'],
  'distant-opposition': ['opposition'],
  'outflanking': ['opposition', 'king-activity', 'pawn-endgame'],
  'breakthrough': ['breakthrough', 'pawn-break', 'pawn-sacrifice'],
  'triangulation': ['triangulation', 'zugzwang', 'waiting-move'],
  'wrong-rook-pawn-bishop': ['fortress', 'bishop-endgame'],
  'opposite-color-bishops': ['opposite-colored-bishops', 'fortress', 'blockade', 'bishop-endgame'],
  'philidor-position': ['rook-endgame'],
  'queen-vs-rook-fortress': ['fortress', 'queen-endgame'],
  'k-vs-kp-opposition-draw': ['opposition', 'fortress', 'pawn-endgame'],
  'stalemate-stalking': ['stalemate', 'fortress'],
  'perpetual-check': ['perpetual-check'],
  'insufficient-material': ['fortress'],
  'lucena-position': ['rook-endgame', 'promotion', 'passed-pawn'],
  'philidor-rook-ending': ['rook-endgame'],
  'active-rook': ['rook-activity', 'rook-endgame'],
  'vancura-position': ['rook-endgame', 'fortress'],
  'cutting-off-the-king': ['cut-off', 'rook-endgame', 'restriction'],
};

/** The words a note must SAY to count as teaching an endgame lesson's idea —
 *  the tag-is-not-the-teaching rule, same as TACTIC_PATTERN_WORDS. */
const ENDGAME_LESSON_WORDS: Record<string, string[]> = {
  'activate-the-king': ['king'],
  'push-passed-pawns': ['passed pawn', 'promote', 'promotion', 'queening'],
  'attack-weak-pawns': ['weak pawn', 'weakness', 'target'],
  'two-weaknesses': ['two weaknesses', 'second weakness', 'second front'],
  'do-not-rush': ['rush', 'waiting', 'patien', 'improve'],
  'rooks-behind-passed-pawns': ['behind the passed', 'behind passed', 'rook behind', 'rook belongs behind'],
  'trade-when-ahead': ['trade', 'simplif', 'exchange'],
  'opposition': ['opposition'],
  'key-squares': ['key square'],
  'rule-of-the-square': ['rule of the square', 'square of the pawn', 'catch', 'race'],
  'distant-opposition': ['opposition'],
  'outflanking': ['outflank', 'opposition'],
  'breakthrough': ['breakthrough', 'break through'],
  'triangulation': ['triangul', 'zugzwang', 'lose a tempo', 'losing a tempo'],
  'wrong-rook-pawn-bishop': ['wrong bishop', 'wrong-colored', 'wrong colour', 'wrong color', 'corner'],
  'opposite-color-bishops': ['opposite-color', 'opposite color', 'opposite-colour', 'opposite colour'],
  'philidor-position': ['philidor', 'third rank', 'checks from behind', 'check from behind'],
  'queen-vs-rook-fortress': ['fortress'],
  'k-vs-kp-opposition-draw': ['opposition'],
  'stalemate-stalking': ['stalemate'],
  'perpetual-check': ['perpetual'],
  'insufficient-material': ['insufficient', 'bare king', 'cannot mate', "can't mate"],
  'lucena-position': ['lucena', 'bridge'],
  'philidor-rook-ending': ['philidor', 'third rank', 'checks from behind', 'check from behind'],
  'active-rook': ['active rook', 'rook activ', 'activity'],
  'vancura-position': ['vancura', 'checks from the side', 'side check'],
  'cutting-off-the-king': ['cut off', 'cutting off', 'cut-off'],
};

/** ONE corpus note teaching the idea an ENDGAME LESSON is about, for the
 *  moment AFTER the student completes a position — never before or during
 *  (narration rule 8: the board is the lesson while they're solving).
 *
 *  Same contract as `spokenTacticNote`: the note's own prose must NAME the
 *  lesson's idea (a tag alone selects noise), it may name no squares (this
 *  tier is reached by CONCEPT, so its example's geometry would be false of
 *  the study position in front of the student), and it may not assert a
 *  configuration the live board lacks. */
export function endgameNoteForLesson(args: {
  lessonId: string;
  /** Ids already shown this lesson session — a repeated note teaches nothing. */
  seenIds?: Set<string>;
  /** The study position's board — a note may not claim pieces it lacks. */
  fen?: string | null;
}): { id: string; text: string } | null {
  const concepts = ENDGAME_LESSON_CONCEPTS[args.lessonId] ?? [];
  const words = ENDGAME_LESSON_WORDS[args.lessonId] ?? [];
  if (concepts.length === 0 || words.length === 0) return null;
  // This card is WRITTEN, not spoken, so the candidate text is the baked
  // spoken form when one exists, else the note's `teaches` field — the
  // distilled GENERAL principle ("In rook endgames, keeping rooks on often
  // makes conversion easier…"), which is the right register for a lesson
  // explicitly about that concept. `spokenBeatText` alone starves this
  // surface: concept-tier notes are FLOATING (no lineSan), and the per-ply
  // VOICE register rightly silences unbaked floating notes (measured
  // 2026-08-14: 2/27 lessons fired). `teaches` is geometry-free by
  // distillation, and every board-truth guard below still applies — a
  // squares-naming or configuration-claiming candidate is dropped whole.
  const candidateText = (n: DanyaNote): string => {
    const spoken = spokenBeatText(n);
    if (spoken) return spoken;
    const teaches = (n.teaches ?? '').trim();
    if (!teaches) return '';
    // A distillation fragment that lost its subject is not a sentence.
    if (/^[,;:.)\]]/.test(teaches)) return '';
    if (teaches.replace(/[^a-zA-Z]/g, '').length < 30) return '';
    return teaches;
  };
  // Case-INSENSITIVE square guard for this lane: transcript-farmed prose
  // capitalizes squares ("maneuver to G4"), which the case-sensitive
  // NAMES_A_SQUARE misses — caught live on the triangulation lesson
  // 2026-08-14. Foreign geometry in either case disqualifies the note.
  const NAMES_A_SQUARE_ANY_CASE = /\b[a-hA-H][1-8]\b/;
    // Words go INTO the query so the limit caps MATCHING notes, never the pool
  // the match is drawn from. See conceptNotesFor's `words` note.
  for (const n of conceptNotesFor({ phase: 'endgame', concepts, words, limit: 40 })) {
    if (args.seenIds?.has(n.id)) continue;
    const text = candidateText(n);
    if (!text) continue;
    const low = text.toLowerCase();
    if (!words.some((w) => low.includes(w))) continue;
    if (NAMES_A_SQUARE_ANY_CASE.test(text)) continue;
    if (args.fen) {
      if (!namedPiecesExistOnBoard(text, args.fen)) continue;
      const bad = falseConfigurationClaim(text, args.fen);
      if (bad) {
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: 'endgameNoteForLesson.configurationClaim',
          summary: `skipped a note claiming "${bad}" — not true of this board`,
          fen: args.fen,
        });
        continue;
      }
    }
    args.seenIds?.add(n.id);
    return { id: n.id, text };
  }
  return null;
}


export function buildDanyaTeachingBlock(args: {
  historySans?: string[];
  openingName?: string | null;
  /** Live board FEN — adds transposition-safe exact-position notes. */
  fen?: string | null;
  maxNotes?: number;
  /** DETECTOR-PROVEN tactic types live on the board right now (fork, pin,
   *  hanging, …), from the watcher's TacticsLiveContext (David 2026-08-07:
   *  "Positional notes are there, not tactical notes"). When present, ONE
   *  concept note teaching the live tactic joins the block — the corpus's
   *  thousands of tactics/calculation notes were unreachable here because
   *  every tier keys on position or opening name, and past book those go
   *  positional-only. Emitted only from the detectors (G0), never guessed. */
  liveTacticTypes?: string[];
  /** Game phase for the concept lookup (defaults to middlegame — where the
   *  live-tactic tier overwhelmingly fires). */
  phase?: DanyaNote['phase'];
}): string {
  const max = args.maxNotes ?? 3;
  const picked: DanyaNote[] = [];
  const seen = new Set<string>();
  // SCOPED TO THE OPENING BEING TAUGHT (David 2026-08-02). This block is handed
  // to the model as the teaching material for the whole lesson, and it was
  // assembled with no reference to the opening at all — so an ancestor-keyed or
  // structurally-similar note about a different opening could sit in the prompt
  // for every ply of the lesson. Each tier below still runs; a note tagged with
  // another opening just doesn't make it into the block.
  const onTopic = (n: DanyaNote): boolean => !noteOpeningConflicts(n.opening, args.openingName);
  const add = (notes: DanyaNote[]): void => {
    for (const n of notes) {
      if (picked.length >= max) return;
      if (seen.has(n.id) || !onTopic(n)) continue;
      picked.push(n);
      seen.add(n.id);
    }
  };
  // `max` is the BLOCK's budget (how many notes reach the prompt), not each
  // tier's search bound. Passing it down as both meant a tier could spend its
  // whole allowance on notes `add` then rejected as off-topic or duplicate, and
  // the later tiers never contributed — the same "budget spent before the
  // filter" bug the support tier had. Search wide; `add` still stops at `max`.
  if (args.fen) add(notesForFen(args.fen));
  if (args.historySans && args.historySans.length > 0) {
    add(notesForPrefix(args.historySans));
  }
  // LIVE-TACTIC CONCEPT TIER (David 2026-08-07: "I saw no tactics alerts.
  // It's like all the notes are not being used. Positional notes are there,
  // not tactical notes."). A detector-proven tactic on the live board earns
  // ONE concept note teaching that tactic — placed AHEAD of the opening-level
  // tier so generic opening background can't crowd it out (the exact symptom:
  // his whole game got the same 3 positional notes while a queen trade, a
  // pin, and hanging pieces went un-taught). Capped at one so the block stays
  // mostly about the opening; the background label below still governs —
  // concept prose, never board claims.
  if (args.liveTacticTypes && args.liveTacticTypes.length > 0 && picked.length < max) {
    const concepts = Array.from(new Set(
      args.liveTacticTypes.flatMap((t) => TACTIC_TYPE_CONCEPTS[t] ?? ['tactics', 'tactical-awareness']),
    ));
    for (const n of conceptNotesFor({ phase: args.phase ?? 'middlegame', concepts, limit: 6, accept: onTopic })) {
      if (seen.has(n.id) || !onTopic(n)) continue;
      picked.push(n);
      seen.add(n.id);
      break; // one tactical note per block
    }
  }
  if (args.openingName) add(notesForOpening(args.openingName));
  // SUPPORT TIER — the farmed corpora, filling whatever slots the primary
  // corpus left empty (David 2026-08-01: "a third source that supports at
  // runtime"). It runs whether or not the primary covered this opening, because
  // opening-level coverage does not mean there is teaching for THIS position —
  // the primary knows the Caro-Kann while having nothing on the Advance/Tal
  // sub-line. It cannot dilute the house voice: the primary tiers above already
  // took their slots, so these only ever supplement, never displace.
  if (picked.length < max) {
    add(secondarySupportNotes({
      historySans: args.historySans,
      openingName: args.openingName,
      maxNotes: max - picked.length,
      exclude: seen,
      accept: onTopic,
    }));
  }
  // LAST tier — structure transfer: teachings from OTHER openings whose
  // structure provably matches this board (and whose claims survive the live
  // truth filter). Fires mainly past book, where the tiers above go quiet.
  // Deliberately AFTER the support tier: a real note about the opening in front
  // of the student beats a borrowed analogy from a different one.
  //
  // Skipped entirely once the opening is known — the same scoping rule as
  // `supportNoteForPly`. Borrowing another opening's teaching is for a board
  // that has left book, not for a lesson the student asked for by name.
  if (args.fen && !args.openingName && picked.length < max) {
    add(notesForStructure(args.fen));
  }
  if (picked.length === 0) return '';
  const lines: string[] = [
    // LESSON CONTEXT, not per-ply truth. This block is assembled from tiers that
    // include OPENING-LEVEL notes — teaching about the opening as a whole, filed
    // under no particular position. Read as "facts about the current board" (the
    // old header invited exactly that, saying "this opening/position"), it hands
    // the model prose about one position to write up as if it described another.
    // That is the same failure the per-ply splice had, one layer up: per-ply
    // teaching now comes ONLY from a note whose line reproduces that ply's board
    // (see `noteAtPosition`), and this block is background, never a board claim.
    '═══ LESSON BACKGROUND (what this opening is about — NOT claims about the current position) ═══',
  ];
  for (const n of picked) {
    // Say where each note was taught, and say plainly when that is nowhere in
    // particular, so a general idea can never be mistaken for a fact about the
    // board the student is looking at.
    const where = n.lineSan.length > 0
      ? `taught after ${n.lineSan.join(' ')}`
      : `general — ${n.opening ?? 'no specific line'}`;
    lines.push(`• [${where}] ${n.explains} ${n.teaches}${n.plans ? ` Plan: ${n.plans}` : ''}`);
  }
  lines.push('These are background ideas for the opening, NOT descriptions of the position on the board.');
  lines.push('Draw on them only where they fit; state nothing about the current position that the board does not show.');
  lines.push('═══════════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

/** The WHOLE beat as one spoken string (David 2026-07-30: "hand the entire
 *  beat for the coach to speak in the package so it doesn't leave anything
 *  out"). `plans` is the forward-looking half — the break being prepared, the
 *  manoeuvre coming, the opponent reply being answered — so omitting it both
 *  silences that teaching and starves the lead-the-eye pass, which derives
 *  arrows from this text: a move named only in `plans` can never be arrowed
 *  if `plans` never reaches the string. */
export function teachingBeatText(note: DanyaNote): string {
  return [note.explains, note.teaches, note.plans]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/** SAN-shaped tokens — the same shape sanitizeForTTS later expands aloud. */
/** One SAN token, as a source fragment so the patterns below stay in step.
 *  NOTE the plain pawn push (`[a-h][1-8]`) — `SAN_TOKEN` omits it, so the
 *  dictation counter does not see "e4 c6 d4 d5" as moves at all. That is a
 *  separate, deliberately-tuned threshold and is left alone here; this
 *  fragment check needs the full alphabet or "c4 and forced the bishop back"
 *  reads as prose. */
const SAN_SRC = '(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8]|O-O(?:-O)?)[+#]?';

/** A sentence that begins mid-clause because the distiller cut the half that
 *  carried its subject: "Kf8, and the knight must retreat" / "c4 and forced the
 *  bishop back to d2".
 *
 *  The "and" arm requires that what follows is NOT another move, so a real
 *  sentence like "e4 and d4 are both playable here" survives — there the moves
 *  are the SUBJECT, not an orphaned predicate. */
const SENTENCE_OPENS_MID_CLAUSE = new RegExp(`^${SAN_SRC}(?:,|\\s+and\\s+(?!${SAN_SRC}\\b))`);

const SAN_TOKEN = /\b(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#]?|[a-h]x?[a-h][1-8][+#]?|O-O(?:-O)?[+#]?)\b/g;

/**
 * What a note contributes to ONE SPOKEN PLY — as opposed to `teachingBeatText`,
 * which is the note's full teaching for prompt blocks and written contexts.
 *
 * David's 2026-08-05 prod feedback, after a lesson on the new note-led splice:
 * "a bit too wordy … it droned on with long strings of FENs which lost me."
 * Both defects are measured, not anecdotal:
 *   • the full beat (`explains`+`teaches`+`plans`) is a median 544 chars, and
 *     the splice put generated prose on top — ~130 spoken words per single move;
 *   • 11.4% of primary-corpus notes carry ≥5 SAN tokens in `explains`, which
 *     TTS faithfully expands into "knight to c3, d-pawn takes e4, knight takes
 *     e4…" — dictating moves the board itself plays (narration rule #3: don't
 *     restate the board).
 *
 * So the spoken register is: `explains` ONLY (`teaches`/`plans` still reach the
 * model through the lesson-level block), minus any sentence that is a move
 * recitation. Empty string = this note has nothing speakable — the caller
 * falls back to its generated prose.
 *
 * NO word cap (David 2026-08-05: "remove cap."). A 50-word ceiling shipped
 * briefly and was cut the same night — dropping explains's tail could land on
 * a setup instead of the punchline. Explains-only + no dictation is the whole
 * trim.
 */
/** Words that carry no teaching once the moves are stripped out: the two side
 *  names, and the verbs that only say a move happened. */
const EMPTY_AFTER_MOVES = new Set([
  'white', 'black', 'plays', 'play', 'played', 'follows', 'follow', 'followed',
  'goes', 'go', 'went', 'moves', 'move', 'moved', 'then', 'next', 'here', 'is',
  'are', 'was', 'were', 'the', 'a', 'an', 'and', 'with', 'to', 'his', 'her',
  'their', 'its',
]);

/** True when a sentence announces a move and nothing else. */
function sentenceIsOnlyMoveAnnouncement(sentence: string): boolean {
  SAN_TOKEN.lastIndex = 0;
  const withoutMoves = sentence.replace(SAN_TOKEN, ' ');
  // Bare pawn pushes are not in SAN_TOKEN (see SAN_SRC) — take them too, or
  // "d6." reads as the word "d6" and looks like content.
  const words = withoutMoves
    .replace(/\b[a-h][1-8]\b/g, ' ')
    .toLowerCase()
    .match(/[a-z]+/g) ?? [];
  return words.every((w) => EMPTY_AFTER_MOVES.has(w));
}

/** Drop a leading recitation of the note's OWN anchor: "In the Nimzo, after
 *  d4 Nf6 c4 e6 Nc3 Bb4, Black's main replies are…" → "Black's main replies
 *  are…".
 *
 *  The student is LOOKING at that position — the note is only selected where
 *  its anchor produces the board — so reciting the moves that reached it is
 *  restating the picture, which the narration voice rules ban outright ("Don't
 *  restate the board. Voice carries only what the picture doesn't"). Spoken
 *  aloud it is also the worst of the droning David reported: `sanitizeForTTS`
 *  expands every token, so a six-ply prefix becomes "after d4, knight f6, c4,
 *  e6, knight c3, bishop b4…" before the teaching even starts.
 *
 *  It matters more than tidiness because the SAN-density rule below drops a
 *  whole sentence at 3+ moves, and the recited prefix alone blows that budget.
 *  That silenced notes whose actual teaching was well under it — a note is
 *  MORE likely to recite its anchor precisely when it was anchored FROM that
 *  recitation (see `scripts/derive-note-anchors.mjs`), so the two interact.
 *
 *  Conservative by construction: only a prefix, only when the recited moves are
 *  literally this note's own anchor, and only when real teaching follows. A
 *  sentence that recites some OTHER line is left alone for the SAN rule to
 *  judge — that one IS dictation. */
function stripAnchorRecitation(sentence: string, lineSan: string[] | undefined): string {
  if (!sentence || !lineSan?.length) return sentence;
  // "…after <moves>, <teaching>" / "…after <moves> <teaching>" — the recited
  // run must START at this note's first move, so an unrelated line never matches.
  const first = lineSan[0].replace(/[+#]/g, '');
  const idx = sentence.search(new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
  if (idx === -1) return sentence;
  const head = sentence.slice(0, idx);
  // Only strip an INTRODUCTORY clause — if substantial prose precedes the
  // recitation, the moves are being used mid-argument, not as a preamble.
  if (head.replace(/[^a-z]/gi, '').length > 40) return sentence;
  let rest = sentence.slice(idx);
  let consumed = 0;
  for (const san of lineSan) {
    const m = rest.match(new RegExp(`^\\s*(?:\\d+\\.(?:\\.\\.)?)?\\s*${san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[!?]*[,]?`));
    if (!m) break;
    rest = rest.slice(m[0].length);
    consumed += 1;
  }
  // A stray one- or two-move mention is not a recitation; leave it be.
  if (consumed < 3) return sentence;
  const tail = rest.replace(/^\s*[,;:—-]*\s*/, '').trim();
  // Nothing but the moves — the note said only where we are, which the board
  // already says. Silence is the honest result.
  if (tail.replace(/[^a-z]/gi, '').length < 12) return '';
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

export function spokenBeatText(note: DanyaNote): string {
  // THE BAKE WINS. When a note has a committed spoken form it is already in its
  // verified final shape — reviewed, gated, and (for a note with no position)
  // with the foreign example's geometry generalized away. Re-running the
  // pruning below over it could only drift it.
  const bake = bakedSpoken(note.id);
  if (bake?.unspeakable) return '';   // honest silence: it needs geometry it cannot have here
  if (bake?.spoken) return bake.spoken;

  // A FLOATING note with no bake is SILENT. This is the same rule as
  // `unspeakable` above, and leaving it out was the defect David heard on
  // 2026-08-08: "none of the narrations are matching the position".
  //
  // Floating means the note has no lineSan — it is reached by concept or tactic
  // tag, so it is spoken over a board it was never written about, and every
  // square in it belongs to somebody else's game. Stripping that geometry is
  // the entire reason the bake exists. Falling through to `explains` hands the
  // student the un-stripped original: measured at 1,665 notes naming a foreign
  // square, including raw move-list fragments like "Nxc4, exploiting the pinned
  // knight on c3."
  //
  // The hole predates the bake (a note that never baked always fell through),
  // but purging 867 contaminated notes back to this fallback on 2026-08-08
  // widened it, which is what made it audible. Fixing the fallback fixes both.
  //
  // ANCHORED notes keep the fallback: the coach only speaks them on the
  // position they were authored at, so their squares are true.
  //
  // Before the bake finishes fetching, `bakedSpoken` returns undefined for
  // everything, so floating notes stay quiet for that window. That is the
  // correct trade — a silent second beats a sentence about another board.
  if (!note.lineSan?.length) return '';

  const explains = (note.explains ?? '').trim();
  if (!explains) return '';
  const sentences = explains.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [explains];
  // A truncated distillation artifact, not a sentence: begins mid-clause
  // (", Bd2, Be2) lead to…") or closes a parenthesis it never opened. David
  // heard one read aloud on prod 2026-08-07 — "Coaching note taught at THIS
  // position: , bishop to d2, bishop to e2) lead to a position…".
  const startsBroken = (s: string): boolean => {
    if (/^[,;:.)\]]/.test(s)) return true;
    // "is dubious." — a bare copula/auxiliary opener has lost its subject to
    // the sentence before it.
    if (/^(?:is|are|was|were|has|have|had|can|could|would|should|will|does|do|did)\b/.test(s)) return true;
    // "Kf8, and the knight must retreat, losing time." — a move token then a
    // comma is a continuation of a list the distiller cut in half, not a
    // sentence. Read aloud it lands as a bare "king f8" with no verb.
    // "Kf8, and the knight must retreat, losing time." — a move token then a
    // comma, or then a bare "and", is a clause whose SUBJECT was in the
    // sentence before it ("White played c4 and forced the bishop back…"). Read
    // aloud it lands as "c4 and forced…" with nobody doing it.
    //
    // Deliberately narrow: "dxe4 would be a threat once Black gets more pieces
    // out" also opens on a move and is a complete, useful claim about THIS
    // board. Only the two fragment shapes are refused.
    if (SENTENCE_OPENS_MID_CLAUSE.test(s)) return true;
    // Opens ON a parenthetical: "(old) or Qf3 (new), the recommended practical
    // response is …Nc6." — the distiller cut the clause the aside belonged to,
    // so the sentence begins by qualifying something that was never said. Heard
    // walking the Vienna Gambit on 2026-08-08.
    if (/^\(/.test(s)) return true;
    const open = s.indexOf('(');
    const close = s.indexOf(')');
    return close !== -1 && (open === -1 || close < open);
  };
  // A sentence that opens with a BACKWARD REFERENCE needs the sentence before
  // it. Pruning is sentence-wise, so whenever one is dropped the next can be
  // left stranded — heard on the real corpus as "It is one of the oldest and
  // most analyzed openings" (what is?), "Instead, Black counterattacks
  // immediately" (instead of WHAT?), "Kf8, and the knight must retreat".
  //
  // Either half alone is fine: a discourse connective is only broken when its
  // antecedent went missing, which is why this is tracked across the loop
  // rather than judged per sentence.
  const DANGLING = /^(?:it|this|that|these|those|they|instead|however|then|also|additionally|therefore|thus|so|but|and|otherwise|conversely|similarly|meanwhile|here)\b/i;
  const kept: string[] = [];
  let droppedPrevious = false;
  for (const raw of sentences) {
    const sentence = stripAnchorRecitation(raw.trim(), note.lineSan);
    if (!sentence) { droppedPrevious = true; continue; }
    if (startsBroken(sentence)) { droppedPrevious = true; continue; }
    if (droppedPrevious && DANGLING.test(sentence)) continue;
    // A sentence carrying 3+ moves is dictation, not teaching — the board
    // plays the moves; the voice carries only what the picture doesn't.
    //
    // The bar was 4, and 31.2% of the 6,768 speakable notes still got through
    // with a three-moves-in-one-breath sentence — measured, and exactly the
    // droning David has reported. At 3 that class is ZERO. It costs 7.8 points
    // of note coverage (6,302 → 5,775 notes still speak); the notes that go
    // quiet were the ones reciting a line the student is watching anyway.
    SAN_TOKEN.lastIndex = 0;
    const sanCount = sentence.match(SAN_TOKEN)?.length ?? 0;
    if (sanCount >= 3) { droppedPrevious = true; continue; }
    // Says nothing the BOARD does not already say. "Be7." / "d6." / "g6
    // follows." / "White plays Be3." are move announcements, and the student
    // is watching the move being made — the narration voice rules put this
    // first ("Don't restate the board. Voice carries only what the picture
    // doesn't") and allow silence outright ("An empty idea string means no
    // narration").
    //
    // Judged on what is LEFT after the moves are removed: if every remaining
    // word is a side name or a verb of motion, the sentence carried only the
    // move. A short line with real content ("Accept it.", "Check.") keeps its
    // words and survives, which is why this is not a length rule.
    if (sentenceIsOnlyMoveAnnouncement(sentence)) { droppedPrevious = true; continue; }
    kept.push(sentence);
    droppedPrevious = false;
  }
  return kept.join(' ');
}

/** Corpus stats for audits / the settings debug panel. */
export function danyaCorpusStats(): { notes: number; positioned: number; videos: number } {
  return {
    notes: DATA.notes.length,
    positioned: DATA.notes.filter((n) => n.lineSan.length > 0).length,
    videos: DATA.videosDistilled,
  };
}

/** Teaching for a phase and a set of ideas, for positions no opening explains.
 *
 *  The position and opening tiers answer "what is known about THIS line". This
 *  one answers "what is known about this KIND of position" — the endgame where
 *  king activity decides it, the middlegame where the only plan is to hit a
 *  backward pawn. That teaching exists in quantity (it is most of what a
 *  lecture channel says) and had nowhere to live: with no opening to hang on,
 *  the merge dropped it.
 *
 *  Concepts are OR-ed and the strongest are returned first — a note tagged with
 *  several of the asked-for ideas is more on-point than one that matches a
 *  single tag. Deduped by id, since a note is indexed once per concept. */
export function conceptNotesFor(args: {
  phase: DanyaNote['phase'];
  concepts: string[];
  limit?: number;
  /**
   * Lowercase words the note's own prose must contain — applied BEFORE the
   * limit, which is the entire point of the parameter.
   *
   * 🚨 A LIMIT APPLIED BEFORE THE CALLER'S FILTER IS A TIME BOMB (2026-08-14).
   * `endgameNoteForLesson` asked for 40 notes on ['rook-endgame', 'promotion',
   * 'passed-pawn'] and THEN kept the ones saying "lucena" or "bridge". That
   * worked only while the corpus was small enough for the Lucena note to land
   * in the first 40. Adding 3,264 endgame-tagged notes pushed it out, and the
   * Lucena lesson went silent — with the note still sitting in the corpus,
   * perfectly intact and simply never reached.
   *
   * Growing the corpus must never take teaching AWAY. Since the caller's
   * keywords are the real selector, they belong in the query: filter first,
   * then cap. Callers that pass no words are unaffected.
   */
  words?: string[];
  /**
   * The caller's own predicate, likewise applied BEFORE the limit.
   *
   * Every call site here had the same shape — take N, then `.find()` the one
   * that satisfies a board-truth or topic test — and every one of them was a
   * silent time bomb for the same reason `words` exists. The tightest was
   * `limit: 5` followed by a full board-claim validation: five candidates, most
   * of which name squares that are false on the live board, and the tier goes
   * quiet with hundreds of usable notes behind them.
   *
   * Passing the predicate in means the limit caps ACCEPTED notes, so the tier
   * returns something whenever the corpus holds something acceptable, no matter
   * how large the corpus grows. It is evaluated per candidate, so keep it cheap
   * relative to the pool — board validation over a few thousand notes is fine;
   * an engine call would not be.
   */
  accept?: (n: DanyaNote) => boolean;
}): DanyaNote[] {
  const wanted = args.concepts.map((c) => c.toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return [];
  const words = (args.words ?? []).map((w) => w.toLowerCase()).filter(Boolean);
  const hits = new Map<string, { note: DanyaNote; matched: number }>();
  for (const c of wanted) {
    for (const n of byConcept.get(`${args.phase}::${c}`) ?? []) {
      const already = hits.get(n.id);
      if (already) { already.matched += 1; continue; }
      if (words.length > 0) {
        // Match against the same text the caller will read, so a note cannot
        // pass here and be discarded there (or the reverse).
        const text = `${spokenBeatText(n)} ${n.teaches ?? ''}`.toLowerCase();
        if (!words.some((w) => text.includes(w))) continue;
      }
      if (args.accept && !args.accept(n)) continue;
      hits.set(n.id, { note: n, matched: 1 });
    }
  }
  return [...hits.values()]
    .sort((a, b) => b.matched - a.matched)
    .slice(0, args.limit ?? 6)
    .map((h) => h.note);
}

/** Which ideas this corpus can actually teach in a phase, commonest first.
 *  Callers use it to ask for concepts that exist rather than guessing tags. */
export function conceptsAvailable(phase: DanyaNote['phase']): Array<{ concept: string; notes: number }> {
  const out: Array<{ concept: string; notes: number }> = [];
  for (const [key, notes] of byConcept) {
    if (!key.startsWith(`${phase}::`)) continue;
    out.push({ concept: key.slice(phase.length + 2), notes: notes.length });
  }
  return out.sort((a, b) => b.notes - a.notes);
}
