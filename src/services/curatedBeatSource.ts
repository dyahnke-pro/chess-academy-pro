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

/** Lesson framing, not position teaching. A beat is written to be heard at the
 *  START of a class ("Welcome. Today we study…", "By the end of this lesson…"),
 *  which is nonsense narrated over move four of somebody's live game. */
const SCAFFOLDING = /^(?:welcome\b|today we|in this lesson|by the end of|let's begin|we'll start)/i;
const isLessonScaffolding = (say: string): boolean =>
  SCAFFOLDING.test(say.trim()) || /\btoday we (?:study|look at|learn)\b/i.test(say);

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
}

interface IndexedBeat {
  id: string;
  lesson: string;
  /** The opening this beat's lesson teaches — the key before any `::`. */
  openingId: string;
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
  exclude?: ReadonlySet<string>,
  /** The opening actually being played. A beat may only teach in ITS OWN
   *  opening — see `MIN_BEAT_PLIES` for why the board cannot enforce this. */
  openingName?: string | null,
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
      if (isLessonScaffolding(beat.say)) continue;
      if (noteOpeningConflicts(openingNameFor(beat.openingId), openingName)) continue;
      // Already true by construction (the FEN matches), so this only ever fires
      // on a beat whose prose outran its own board — which the build-time
      // accuracy gate should have caught first.
      const graded = gradeNarrationText(beat.say, fen, 'curatedBeatSource')?.trim();
      if (!graded) continue;
      return { text: graded, id: beat.id, lesson: beat.lesson };
    }
    return null;
  } catch {
    return null; // curated teaching is a bonus, never a blocker
  }
}

/** Index size, for audits and the coverage report. `built` is false while the
 *  prewarm is still running. */
export function curatedBeatStats(): { beats: number; positions: number; built: boolean } {
  let beats = 0;
  for (const list of byFen.values()) beats += list.length;
  return { beats, positions: byFen.size, built: isBuilt() };
}
