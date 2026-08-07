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
import { noteDescribesPosition, noteTeachesChessNotItsSource, noteStaysInScope } from './noteAnchorIntegrity';
import { bakedSpoken } from './spokenNoteBake';

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
}

interface TeachingsBundle {
  generatedAt: string;
  videosDistilled: number;
  noteCount: number;
  notes: DanyaNote[];
}

const DATA = teachingsData as unknown as TeachingsBundle;

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

const anchorTeachesItsPosition = (n: DanyaNote): boolean =>
  n.lineSan.length >= MIN_TEACHING_ANCHOR_PLIES;


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
  const bucket = (byPrefix.get(historySans.join(' ')) ?? []).filter(onThisLine);
  if (bucket[0]) return bucket[0];
  if (fen) {
    // Uncapped: `notesForFen(fen, 1)` handed the filter a single candidate, so
    // one note failing `onThisLine` (or already spoken) meant silence at a
    // position the corpus does teach.
    const viaFen = notesForFen(fen).filter(onThisLine)[0];
    if (viaFen) return viaFen;
  }
  // GAP TIER, exact positions only. This is the walkthrough splice's source, so
  // without it the narration goes silent on an opening the primary corpus never
  // covers. The "exactly at this position" contract is preserved — only a
  // secondary note keyed at THIS very line qualifies, never an opening-level one.
  const viaSecondaryPrefix = secondaryNotesForPosition(historySans).filter(onThisLine)[0];
  if (viaSecondaryPrefix) return viaSecondaryPrefix;
  // SECONDARY TRANSPOSITION — same contract, other corpora. Until 2026-08-04
  // only the primary corpus was indexed by position, so 5,412 position-keyed
  // secondary notes were reachable only by an exact move-order string match.
  // That scarcity is what made the fuzzy opening-name arm look necessary; this
  // is the deterministic way to get the reach back, and the note is provably
  // about THIS board.
  return fen ? secondaryNotesForFen(fen).filter(onThisLine)[0] ?? null : null;
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
): TeachingSource | null {
  const exact = noteAtPosition(historySans, fen, openingName);
  if (exact) return { note: exact, origin: 'position' };
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
  const phaseFits = (note: DanyaNote): boolean =>
    noteTeachesChessNotItsSource(note)
    && (!boardPhase || note.phase === 'concept' || note.phase === boardPhase);
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
  const support = secondarySupportNotes({
    historySans,
    openingName: resolvedOpening,
    maxNotes: 1,
    accept: (n) => !noteOpeningConflicts(n.opening, resolvedOpening) && phaseFits(n),
  })[0];
  if (support) return { note: support, origin: 'opening-family' };
  // STRUCTURE TRANSFER is deliberately cross-opening (a note from anywhere whose
  // structure provably matches this board), so no tag check applies — its
  // licence to borrow is the proven signature match plus the live-board claim
  // filter inside `notesForStructure`. It is honest teaching about a DIFFERENT
  // position, which is why it carries `origin: 'structure'` and must never be
  // announced as a fact about this board.
  const transferred = notesForStructure(fen).filter(phaseFits)[0];
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
  const concept = conceptNotesFor({ phase: derived.phase, concepts: derived.concepts, limit: 1 })
    .filter(phaseFits)[0];
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
}): TransitionTeaching | null {
  // WHICH phase's teaching this transition wants. Hardcoded to 'middlegame'
  // until 2026-08-05, which was invisible while the caller only ran this on the
  // opening→middlegame boundary. The moment the endgame transition started
  // using it, that hardcoding would have handed a student entering a rook
  // ending a middlegame plan.
  const wantPhase = (args.fen ? phaseOfFen(args.fen) : null) ?? 'middlegame';
  const usable = (n: DanyaNote): boolean =>
    Boolean(n.plans?.trim()) && noteTeachesChessNotItsSource(n);
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
      const concept = conceptNotesFor({ phase: derived.phase, concepts: derived.concepts, limit: 5 })
        .find((n) => {
          if (!usable(n)) return false;
          if (!namedPiecesExistOnBoard(n.plans ?? '', boardFen)) return false;
          try {
            return validateBoardClaims(`${n.explains} ${n.teaches} ${n.plans}`, boardFen).violations.length === 0;
          } catch { return false; }
        });
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
  for (const n of conceptNotesFor({ phase: args.phase ?? 'middlegame', concepts, limit: 40 })) {
    if (args.seenIds?.has(n.id)) continue;
    const text = spokenBeatText(n);
    if (!text) continue;
    const low = text.toLowerCase();
    if (!patternWords.some((w) => low.includes(w))) continue;
    args.seenIds?.add(n.id);
    return { id: n.id, text };
  }
  return null;
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
};

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
    for (const n of conceptNotesFor({ phase: args.phase ?? 'middlegame', concepts, limit: 6 })) {
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
export function spokenBeatText(note: DanyaNote): string {
  // THE BAKE WINS. When a note has a committed spoken form it is already in its
  // verified final shape — reviewed, gated, and (for a note with no position)
  // with the foreign example's geometry generalized away. Re-running the
  // pruning below over it could only drift it.
  const bake = bakedSpoken(note.id);
  if (bake?.unspeakable) return '';   // honest silence: it needs geometry it cannot have here
  if (bake?.spoken) return bake.spoken;

  const explains = (note.explains ?? '').trim();
  if (!explains) return '';
  const sentences = explains.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [explains];
  // A truncated distillation artifact, not a sentence: begins mid-clause
  // (", Bd2, Be2) lead to…") or closes a parenthesis it never opened. David
  // heard one read aloud on prod 2026-08-07 — "Coaching note taught at THIS
  // position: , bishop to d2, bishop to e2) lead to a position…".
  const startsBroken = (s: string): boolean => {
    if (/^[,;:.)\]]/.test(s)) return true;
    const open = s.indexOf('(');
    const close = s.indexOf(')');
    return close !== -1 && (open === -1 || close < open);
  };
  const kept: string[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (startsBroken(sentence)) continue;
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
    if (sanCount >= 3) continue;
    kept.push(sentence);
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
}): DanyaNote[] {
  const wanted = args.concepts.map((c) => c.toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return [];
  const hits = new Map<string, { note: DanyaNote; matched: number }>();
  for (const c of wanted) {
    for (const n of byConcept.get(`${args.phase}::${c}`) ?? []) {
      const seen = hits.get(n.id);
      if (seen) seen.matched += 1;
      else hits.set(n.id, { note: n, matched: 1 });
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
