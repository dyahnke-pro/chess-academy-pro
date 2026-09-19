// curatedBeatSource — the masterclass beats, reachable from a LIVE game.
//
// David 2026-08-08: "Don't we have coverage on the copycat lines? What do the
// opening tabs have to say about it? Don't we pull narrations from there if
// corpus is empty?"
//
// We did not, and we should have. Walking the Vienna Copycat ply by ply, the
// coach was silent on move 4 — while `viennaVariations.ts` carries a beat at
// exactly `e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4` that says "The Copycat trap — when Black
// mindlessly mirrors White move for move, White shatters the symmetry with
// Qg4!, swinging out to hit g7 and daring Black to keep copying." The teaching
// existed, on that exact position, and nothing in the live-game lane could see
// it: `getLessonScript` appears nowhere in CoachTeachPage.
//
// 1,659 beats across 361 lessons, 1,481 distinct positions.
//
// WHY THIS OUTRANKS THE CORPUS. A beat is the highest-quality narration the app
// owns. It is hand-authored in the house voice, carries both registers, and —
// unlike a farmed note — is verified BEFORE it ships: `narrationAccuracy`
// checks every board claim against the position, `lessonIntegrity` checks every
// arrow originates on a real piece with a clear sight-line, `wlppNarration`
// checks both registers exist, `lessonSources` checks it cites a real source.
// That is the Tier-1 standard the bake aspires to, already met. When a curated
// beat and a farmed note both describe a position, the beat is the better line.
//
// GROUNDING (G0). A beat is selected the same way a note is: its own move list
// must PRODUCE this ply's position, by prefix or by transposition into the same
// FEN. Nothing fuzzy, nothing by name. The text is then graded against the
// board anyway — a never-fire backstop, since a matching FEN means the geometry
// is already true.
import { Chess } from 'chess.js';
import { getAllLessonScripts } from '../data/lessons/index';
import type { LessonScript } from '../types';
import { gradeNarrationText } from './coachAnswerGates';
import { noteOpeningConflicts } from './danyaTeachingService';
import repertoireRaw from '../data/repertoire.json';

/** A beat shallower than this sits on a SHARED prefix and identifies no
 *  opening, so it teaches whatever its own lesson was about — not this game.
 *
 *  Measured: walking any 1.e4 e5 line, the 2-ply Ruy beat fired and the coach
 *  opened a VIENNA with "Today we study the oldest opening still played at the
 *  very top — the Ruy Lopez, written down by a Spanish priest in 1561." Same
 *  number, same reasoning, as `MIN_TEACHING_ANCHOR_PLIES` in the corpus. */
const MIN_BEAT_PLIES = 3;

/** 🔒 THE REGISTER IS PART OF THE SELECTION — the sibling of the seat guard
 *  below (found reading the live tape, 2026-09-17).
 *
 *  A masterclass beat is authored for WATCH, and CLAUDE.md's TWO REGISTERS rule
 *  says Watch prose is SUPPOSED to read "White develops the knight; Black
 *  answers …" — the student is a spectator there, so naming the colours is
 *  right. The live game is the other register entirely: the student is PLAYING,
 *  so their own side is "you/your" and the opponent is "they/their".
 *
 *  Replaying the first without translating it produces, on a live board, a
 *  coach narrating the student to a third party. Measured on five real opening
 *  lines: 44 of 93 plies fired a beat, and 36 of them spoke this way —
 *
 *    "Before White commits to the big central break, HE takes away Black's pin"
 *    "So LET'S REWIND. Black pokes the bishop…"
 *    "White does not attack the pawn. White attacks its defender"
 *
 *  — spoken to the person who had just played those moves themselves.
 *
 *  THE RULE: a beat that refers to a PLAYER in the third person, or carries
 *  lesson theatre, is Watch-register and may not speak on a live board. A beat
 *  that teaches the POSITION is register-free and speaks anywhere. That split is
 *  not arbitrary — it is Narration Voice Rule 3 ("the voice is the position
 *  teaching the student, not a narrator describing a game"), and the census
 *  falls exactly along it: of 3,748 beats, the 1,238 that survive are the ones
 *  about the board.
 *
 *  It is a CLASSIFICATION of the source, never a rewrite of the prose. Turning
 *  "White does" into "you does" is what a regex would produce, and the offline
 *  bake of a live rendering for the other 2,510 is the owed follow-up — not
 *  something to attempt on a string at runtime. */
export type BeatRegister = 'live-safe' | 'spectator';

/** Lesson framing, not position teaching — "Welcome. Today we study…", and the
 *  mid-beat theatre the old start-anchored check let through ("So let's
 *  rewind.", "here is the secret of the whole opening"), which is nonsense
 *  narrated over move four of somebody's live game. */
const THEATRE = /(?:^\s*(?:welcome\b|let'?s begin|we'?ll start))|\b(?:today we (?:study|look at|learn)|in this lesson|by the end of this lesson|let'?s rewind|so let'?s rewind|here is the secret|you'?ll see today)\b/i;

/** A third-person personal pronoun standing in for a PLAYER. Scoped to a
 *  sentence that also names a colour, so a historical aside ("Fischer and his
 *  1972 match") is not swept up with "…and HE takes away Black's pin". */
const PLAYER_PRONOUN = /\b(?:he|him|his)\b/i;
const COLOUR = /\b(?:White|Black)\b/;

/**
 * The register a beat is written in, given the seat its lesson teaches from.
 * Pure and exported so the gate measures the same function the runtime uses.
 */
/**
 * 🔒 THE MOVE THE BEAT LEADS WITH — its SUBJECT, and the dedupe term that was
 * missing.
 *
 * Reading a real Italian walk, five consecutive plies taught three ideas:
 *   ply 5  "Bc4 — the Italian bishop"
 *   ply 6  "Bc4 — the Italian bishop, pointed straight at f7"
 *   ply 7  "c3 — modest"
 *   ply 8  "c3 — quiet, but loaded"
 *   ply 9  "c3 and d3 — the Giuoco Pianissimo"
 *
 * Both existing guards were working exactly as written and neither could see
 * it: `curatedBeatSeen` dedupes by beat ID, and these are different beats from
 * different lessons; `buildVoicePackage`'s novelty set matches whole SENTENCES,
 * and these are different sentences. Two lessons teaching the SAME MOVE in
 * different words slip between them.
 *
 * So the subject is computed once, at index time, beside `seat` and `register`
 * — the other two things that identify a beat rather than describe it.
 *
 * IT IS RECOGNISED, NEVER INVENTED. The leading token of the prose is accepted
 * only if it is a move on the beat's OWN replayed line, which is already known
 * to be legal. That keeps this on the right side of the rule against scraping
 * claims back out of prose: nothing here derives a board fact from a sentence,
 * it only asks which of the beat's own moves the sentence opens on. A beat that
 * does not open on one of its moves gets `null` and is never subject-deduped —
 * silence must not be a guess.
 */
const LEADING_SAN = /^\s*(O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?)[+#]?\b/;

export function beatSubject(say: string, moves: readonly string[]): string | null {
  const m = LEADING_SAN.exec(say);
  if (!m) return null;
  const lead = m[1];
  const bare = (x: string): string => x.replace(/[+#]$/, '');
  return moves.some((mv) => bare(mv) === lead) ? lead : null;
}

export function beatRegister(say: string, seat: 'white' | 'black'): BeatRegister {
  if (THEATRE.test(say)) return 'spectator';
  // The student's OWN side named as an actor. The beat's seat IS the student's
  // seat by the time it is a candidate (the seat guard below), so this is the
  // student being talked ABOUT rather than TO.
  const ownSide = seat === 'white' ? /\bWhite\b/ : /\bBlack\b/;
  if (ownSide.test(say)) return 'spectator';
  for (const sentence of say.split(/(?<=[.!?])\s+/)) {
    if (COLOUR.test(sentence) && PLAYER_PRONOUN.test(sentence)) return 'spectator';
  }
  return 'live-safe';
}

/** openingId → the opening's NAME, so the same tag-conflict guard the corpus
 *  uses can judge a beat. Ids are stable; names are what the guard compares. */
const NAME_BY_ID = new Map(
  (repertoireRaw as Array<{ id: string; name: string }>).map((e) => [e.id, e.name]),
);
const openingNameFor = (openingId: string): string | null => NAME_BY_ID.get(openingId) ?? null;

export interface CuratedBeat {
  /** The spoken line — the beat's full `say`, in the house voice. */
  text: string;
  /** `${lessonKey}#${beatId}`, so a caller can dedupe across a game. */
  id: string;
  /** The lesson this came from, for the audit trail. */
  lesson: string;
  /** The move this beat leads with, so a caller can refuse a SECOND lesson
   *  teaching the same move in different words — see `beatSubject`. Null when
   *  the beat does not open on one of its own moves. */
  subject: string | null;
}

interface IndexedBeat {
  id: string;
  lesson: string;
  /** The opening this beat's lesson teaches — the key before any `::`. */
  openingId: string;
  /** 🔒 THE SEAT THE LESSON IS WRITTEN FROM (`LessonScript.orientation`). A
   *  beat addresses the student directly — "Black snatches YOUR e-pawn" — so a
   *  beat authored for White is not merely less useful to a Black student, it
   *  is WRONG: it hands them the opponent's pieces. */
  seat: 'white' | 'black';
  /** The register the beat is written in — computed once, at index time, from
   *  its own prose and seat. A live surface admits only 'live-safe'. */
  register: BeatRegister;
  /** The move this beat leads with — see `beatSubject`. Null when the prose
   *  does not open on one of the beat's own moves. */
  subject: string | null;
  say: string;
  moves: string[];
}

/** placement + side + castling + en-passant. Mirrors the corpus indexes — the
 *  move counters are path-dependent, so including them would defeat the
 *  transposition lookup entirely. */
const normFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

// ── THE INDEX, built in CHUNKS ─────────────────────────────────────────────
// Replaying 3,780 beats is 5.0s of chess.js on the main thread — MEASURED, and
// it would freeze the board on the student's first move. Same shape and the
// same reason as `secondaryCorpus.warmFenIndex`: ONE cursor, so a synchronous
// lookup that races the prewarm can never index a beat twice — it simply
// finishes what the prewarm started, from wherever it got to.
const byFen = new Map<string, IndexedBeat[]>();
const byPrefix = new Map<string, IndexedBeat[]>();

let pending: Array<{ key: string; lesson: LessonScript }> | null = null;
let lessonCursor = 0;
let beatCursor = 0;

const push = (map: Map<string, IndexedBeat[]>, key: string, entry: IndexedBeat): void => {
  const bucket = map.get(key);
  if (bucket) bucket.push(entry);
  else map.set(key, [entry]);
};

/** Index up to `limit` more beats. Returns false when there is nothing left. */
function indexSome(limit: number): boolean {
  pending ??= getAllLessonScripts();
  let done = 0;
  while (lessonCursor < pending.length) {
    const { key, lesson } = pending[lessonCursor];
    const beats = lesson.beats ?? [];
    while (beatCursor < beats.length) {
      const beat = beats[beatCursor];
      beatCursor += 1;
      done += 1;
      const say = (beat.say ?? '').trim();
      if (say && beat.moves?.length) {
        const chess = new Chess();
        let legal = true;
        for (const san of beat.moves) {
          try {
            chess.move(san);
          } catch {
            legal = false; // G3: a beat that cannot be replayed indexes nothing
            break;
          }
        }
        if (legal) {
          const entry: IndexedBeat = {
            id: `${key}#${beat.id}`,
            lesson: lesson.title,
            openingId: key.split('::')[0],
            seat: lesson.orientation,
            register: beatRegister(say, lesson.orientation),
            subject: beatSubject(say, beat.moves),
            say,
            moves: beat.moves,
          };
          push(byFen, normFen(chess.fen()), entry);
          push(byPrefix, beat.moves.join(' '), entry);
        }
      }
      if (done >= limit) return true;
    }
    lessonCursor += 1;
    beatCursor = 0;
  }
  return false;
}

const isBuilt = (): boolean => pending !== null && lessonCursor >= pending.length;

/**
 * Build the index off the critical path, yielding between chunks. Call from the
 * boot prewarm. Idempotent, and safe to race with a lookup.
 */
export async function warmCuratedBeatIndex(): Promise<void> {
  while (indexSome(200)) {
    await new Promise((r) => { setTimeout(r, 0); });
  }
}

/** Build it in ONE pass. For node and tests, where a 5s stall costs nothing and
 *  determinism is worth more. NEVER call this on a UI thread. */
export function warmCuratedBeatIndexSync(): void {
  while (indexSome(Number.MAX_SAFE_INTEGER)) { /* one pass */ }
}

/**
 * The curated beat taught at THIS position, or null.
 *
 * `exclude` holds beats already spoken this game — a lesson often teaches the
 * same idea at several plies, and hearing it twice is what makes a coach sound
 * stuck.
 */
export function curatedBeatAt(
  historySans: readonly string[],
  fen: string,
  exclude: ReadonlySet<string> | undefined,
  /** The opening actually being played. A beat may only teach in ITS OWN
   *  opening — see `MIN_BEAT_PLIES` for why the board cannot enforce this. */
  openingName: string | null,
  /**
   * 🔒 THE SEAT THE STUDENT IS SITTING IN. REQUIRED — a new caller must decide
   * its answer rather than inherit a silent default (the same reason
   * `describeThreatRecognition`'s seat parameter is required).
   *
   * Found on prod 2026-09-17, reading a real game. A student PLAYING the
   * Scandinavian as Black heard, on move three:
   *
   *     "Here's the whole story of the Scandinavian in a single move. Black
   *      snatches your e-pawn — but look what it costs him…"
   *
   * That is `antiScandinavian.ts`, the lesson for the WHITE side, and every
   * guard here passed it: the board is identical whichever seat you are in, the
   * opening NAME does not conflict (both lessons are about the Scandinavian),
   * and every claim in the prose is board-true. Only the seat separates a
   * lesson about beating the Scandinavian from a lesson about playing it, and
   * the seat was the one thing nothing read — although `LessonScript` has
   * carried `orientation` as a required field the whole time.
   *
   * `null` means the seat is genuinely unknown (a static position with no game
   * around it); the guard then stands down rather than guessing.
   */
  studentSide: 'white' | 'black' | null,
  /**
   * 🔒 THE REGISTER THIS SURFACE SPEAKS IN. REQUIRED, for the same reason the
   * seat is: a new caller must decide its answer rather than inherit a silent
   * default.
   *
   * `'live'` — the student is PLAYING this position, so their own side is
   * "you/your". Only `live-safe` beats may speak (see `beatRegister`).
   * `'watch'` — the student is watching a demo game unfold, which is the
   * register every beat was authored in. Everything speaks.
   *
   * NO PRODUCTION CALLER PASSES `'watch'` TODAY, and that is not an oversight:
   * the Watch player reads its beats straight off `getLessonScript`, so it
   * never comes through here. The arm exists because the parameter is only
   * honest if the other register has a name — and because making it REQUIRED
   * is what stops the next caller inheriting `'live'` without deciding.
   */
  surfaceRegister: 'live' | 'watch',
  /**
   * Subjects (leading moves) this game has ALREADY taught — see `beatSubject`.
   * A candidate whose subject is in here is skipped and the loop falls through
   * to the next beat at this position, exactly like the register guard, so a
   * position that also holds a beat about something else still teaches.
   *
   * OPTIONAL, unlike `studentSide` and `surfaceRegister`, and the difference is
   * deliberate rather than an oversight. A wrong default for those two produces
   * a FALSE line — the opponent's pieces handed to the student, a spectator
   * paragraph read to a player. A missing subject set produces at worst a
   * REPEAT: the same move taught twice in different words. Requiring it would
   * make every caller and every test declare a set to say "no memory", which is
   * the honest default here.
   */
  excludeSubjects?: ReadonlySet<string>,
): CuratedBeat | null {
  try {
    // Deliberately does NOT build on demand: that is the 5s freeze. Until the
    // prewarm finishes, this answers from what is indexed so far and returns
    // null otherwise — a beat arriving a move late beats a frozen board, and
    // every other teaching lane still speaks meanwhile.
    const candidates = [
      ...(byPrefix.get(historySans.join(' ')) ?? []),
      ...(byFen.get(normFen(fen)) ?? []),
    ];
    const seen = new Set<string>();
    for (const beat of candidates) {
      if (seen.has(beat.id)) continue;
      seen.add(beat.id);
      if (exclude?.has(beat.id)) continue;
      if (beat.moves.length < MIN_BEAT_PLIES) continue;
      // Register, like the seat, is part of what identifies the claim. A
      // Watch-register beat is CORRECT where it lives and wrong here; the loop
      // falls through to the next candidate at this position rather than
      // mangling the prose. See `beatRegister`.
      if (surfaceRegister === 'live' && beat.register !== 'live-safe') continue;
      // A SECOND LESSON ON A MOVE THIS GAME HAS ALREADY TAUGHT. Not caught by
      // the ID set (different beat) or the sentence novelty set (different
      // words) — only the subject sees it. See `beatSubject`.
      if (beat.subject && excludeSubjects?.has(beat.subject)) continue;
      if (noteOpeningConflicts(openingNameFor(beat.openingId), openingName)) continue;
      // A lesson written from the other side of the board addresses the
      // student as the opponent. Never speak it.
      if (studentSide && beat.seat !== studentSide) continue;
      // Already true by construction (the FEN matches), so this only ever fires
      // on a beat whose prose outran its own board — which the build-time
      // accuracy gate should have caught first.
      const graded = gradeNarrationText(beat.say, fen, 'curatedBeatSource')?.trim();
      if (!graded) continue;
      return { text: graded, id: beat.id, lesson: beat.lesson, subject: beat.subject };
    }
    return null;
  } catch {
    return null; // curated teaching is a bonus, never a blocker
  }
}

/** Index size, for audits and the coverage report. `built` is false while the
 *  prewarm is still running. */
export function curatedBeatStats(): { beats: number; positions: number; built: boolean; liveSafe: number } {
  let beats = 0;
  let liveSafe = 0;
  for (const list of byFen.values()) {
    beats += list.length;
    for (const b of list) if (b.register === 'live-safe') liveSafe += 1;
  }
  return { beats, positions: byFen.size, built: isBuilt(), liveSafe };
}
