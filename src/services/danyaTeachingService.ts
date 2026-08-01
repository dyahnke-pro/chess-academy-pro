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
import { secondarySupportNotes, secondaryNotesForPosition } from './secondaryCorpora';
import { detectOpening } from './openingDetectionService';
import { noteContradictsLine, notePhaseMismatchesBoard } from './noteLineGuard';

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
export function notesForFen(fen: string, maxNotes = 3): DanyaNote[] {
  ensureFenIndex();
  return (byFen.get(normFen(fen)) ?? []).slice(0, maxNotes);
}

/** Notes keyed at or before the current position: walks every prefix of the
 *  played SANs, longest first, so the most position-specific teaching wins.
 *  `withinPlies` bounds ancestor staleness — a note anchored more than that
 *  many plies behind the current position is skipped (its moment has passed;
 *  the plan may already be resolved). `maxNotes` bounds the injection size. */
export function notesForPrefix(historySans: string[], maxNotes = 3, withinPlies = Infinity): DanyaNote[] {
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
export function noteAtPosition(historySans: string[], fen?: string): DanyaNote | null {
  // A note that recites a different line than the one played narrates the wrong
  // opening (see noteLineGuard) — silence beats teaching someone else's theory.
  const onThisLine = (n: DanyaNote): boolean =>
    !noteContradictsLine(`${n.explains} ${n.teaches}`, historySans)
    && !notePhaseMismatchesBoard(n.phase, fen, historySans.length);
  const bucket = (byPrefix.get(historySans.join(' ')) ?? []).filter(onThisLine);
  if (bucket[0]) return bucket[0];
  if (fen) {
    const viaFen = notesForFen(fen, 1).filter(onThisLine)[0];
    if (viaFen) return viaFen;
  }
  // GAP TIER, exact positions only. This is the walkthrough splice's source, so
  // without it the narration goes silent on an opening the primary corpus never
  // covers. The "exactly at this position" contract is preserved — only a
  // secondary note keyed at THIS very line qualifies, never an opening-level one.
  return secondaryNotesForPosition(historySans).filter(onThisLine)[0] ?? null;
}

/** The best teaching note for a live position, for FACT-PACKAGE builders
 *  (thinkAloud, step narration): exact position first, then STRUCTURE
 *  TRANSFER — a note from any opening whose taught structure matches this
 *  board and whose claims are true on it. Selection + verification in code;
 *  the note rides in the GROUNDED FACTS the model must voice (G0). */
export function teachingNoteForBoard(
  historySans: string[],
  fen: string,
  openingName?: string | null,
): DanyaNote | null {
  const exact = noteAtPosition(historySans, fen);
  if (exact) return exact;
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
  const resolvedOpening = openingName ?? (() => {
    try { return detectOpening(historySans)?.name ?? null; } catch { return null; }
  })();
  const support = secondarySupportNotes({
    historySans,
    openingName: resolvedOpening,
    maxNotes: 1,
  })[0];
  if (support) return support;
  return notesForStructure(fen, 1)[0] ?? null;
}

/** Opening-keyed notes by (fuzzy-tokenized) opening name. "Caro-Kann Defense:
 *  Advance Variation" matches notes filed under "Caro-Kann Defense" and vice
 *  versa via token-subset matching. */
export function notesForOpening(openingName: string, maxNotes = 4): DanyaNote[] {
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
    const exact = notesForFen(fen, 6).find((n) => n.plans && n.plans.trim().length > 0);
    if (exact) return exact;
  }
  const notes = notesForPrefix(historySans, 6, 12);
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
export function transitionTeachingForGame(args: {
  historySans: string[];
  fen?: string;
  openingName?: string | null;
}): DanyaNote | null {
  const exact = args.fen ? notesForFen(args.fen, 6).find((n) => n.plans?.trim()) : undefined;
  if (exact) return exact;
  const recent = notesForPrefix(args.historySans, 6, 12).find((n) => n.plans?.trim());
  if (recent) return recent;
  if (args.openingName) {
    const family = notesForOpening(args.openingName, 8)
      .filter((n) => n.phase === 'middlegame' && n.plans?.trim());
    // Deepest-keyed first — the most specific middlegame teaching for the family.
    family.sort((a, b) => b.lineSan.length - a.lineSan.length);
    if (family[0]) return family[0];
  }
  // 4. GAP TIER — the transition ritual on an opening the primary corpus never
  //    covers. Ahead of structure transfer for the reason given on
  //    `teachingNoteForBoard`: a real plan for THIS opening beats a borrowed
  //    plan from another one. Any primary opening-level coverage suppresses it.
  if (args.openingName) {
    const support = secondarySupportNotes({
      historySans: args.historySans,
      openingName: args.openingName,
      maxNotes: 4,
    }).find((n) => n.plans?.trim());
    if (support) return support;
  }
  // 5. STRUCTURE TRANSFER — teaching from ANY opening whose structure provably
  //    matches this board (and whose claims survive the live truth filter), so
  //    past book the transition teaching no longer goes quiet.
  if (args.fen) {
    const transferred = notesForStructure(args.fen, 2).find((n) => n.plans?.trim());
    if (transferred) return transferred;
  }
  return null;
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

/** Notes whose TAUGHT STRUCTURE matches the live position, regardless of
 *  opening — deterministic transfer. Excludes exact-position hits (the FEN
 *  tier owns those) and drops any note making a claim that is false on THIS
 *  board. */
export function notesForStructure(fen: string, maxNotes = 2): DanyaNote[] {
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
    const text = `${n.explains} ${n.teaches}`;
    try {
      if (validateBoardClaims(text, fen).violations.length > 0) continue;
    } catch { continue; }
    scored.push({ n, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, maxNotes).map((s) => s.n);
}

export function buildDanyaTeachingBlock(args: {
  historySans?: string[];
  openingName?: string | null;
  /** Live board FEN — adds transposition-safe exact-position notes. */
  fen?: string | null;
  maxNotes?: number;
}): string {
  const max = args.maxNotes ?? 3;
  const picked: DanyaNote[] = [];
  const seen = new Set<string>();
  if (args.fen) {
    for (const n of notesForFen(args.fen, max)) {
      if (!seen.has(n.id)) { picked.push(n); seen.add(n.id); }
    }
  }
  if (args.historySans && args.historySans.length > 0 && picked.length < max) {
    for (const n of notesForPrefix(args.historySans, max - picked.length)) {
      if (!seen.has(n.id)) { picked.push(n); seen.add(n.id); }
    }
  }
  if (args.openingName && picked.length < max) {
    for (const n of notesForOpening(args.openingName, max - picked.length)) {
      if (!seen.has(n.id)) { picked.push(n); seen.add(n.id); }
    }
  }
  // SUPPORT TIER — the farmed corpora, filling whatever slots the primary
  // corpus left empty (David 2026-08-01: "a third source that supports at
  // runtime"). It runs whether or not the primary covered this opening, because
  // opening-level coverage does not mean there is teaching for THIS position —
  // the primary knows the Caro-Kann while having nothing on the Advance/Tal
  // sub-line. It cannot dilute the house voice: the primary tiers above already
  // took their slots, so these only ever supplement, never displace.
  if (picked.length < max) {
    for (const n of secondarySupportNotes({
      historySans: args.historySans,
      openingName: args.openingName,
      maxNotes: max - picked.length,
    })) {
      if (!seen.has(n.id)) { picked.push(n); seen.add(n.id); }
    }
  }
  // LAST tier — structure transfer: teachings from OTHER openings whose
  // structure provably matches this board (and whose claims survive the live
  // truth filter). Fires mainly past book, where the tiers above go quiet.
  // Deliberately AFTER the support tier: a real note about the opening in front
  // of the student beats a borrowed analogy from a different one.
  if (args.fen && picked.length < max) {
    for (const n of notesForStructure(args.fen, max - picked.length)) {
      if (!seen.has(n.id)) { picked.push(n); seen.add(n.id); }
    }
  }
  if (picked.length === 0) return '';
  const lines: string[] = [
    '═══ TEACHING CONTEXT (curated coaching notes for this opening/position — teach from these) ═══',
  ];
  for (const n of picked) {
    const where = n.lineSan.length > 0 ? `after ${n.lineSan.join(' ')}` : (n.opening ?? 'general');
    lines.push(`• [${where}] ${n.explains} ${n.teaches}${n.plans ? ` Plan: ${n.plans}` : ''}`);
  }
  lines.push('Use these ideas when they fit the student\'s question/position; never contradict the board.');
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

/** Corpus stats for audits / the settings debug panel. */
export function danyaCorpusStats(): { notes: number; positioned: number; videos: number } {
  return {
    notes: DATA.notes.length,
    positioned: DATA.notes.filter((n) => n.lineSan.length > 0).length,
    videos: DATA.videosDistilled,
  };
}
