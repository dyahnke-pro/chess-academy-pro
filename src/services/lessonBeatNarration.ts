import { Chess } from 'chess.js';
import { getAllLessonScripts } from '../data/lessons';

/** The hand-written masterclass narration that already lives in the OPENING
 *  TABS, made reachable BY POSITION so the coach walkthrough can speak it.
 *
 *  David 2026-08-20: *"Use the hand written narrations from opening tabs."*
 *
 *  There are 821 registered `LessonScript`s carrying 3,780 beats, every one of
 *  them hand-authored, two-register, and held to the `narrationAccuracy` gate at
 *  build time — the single largest body of verified teaching in the app, and
 *  until now the coach could not reach a word of it. It sat behind an OPENING
 *  ID: `getLessonScript(openingId)` is how the tab loads its lesson, and the
 *  coach walkthrough has no opening id, only a board.
 *
 *  So the index is keyed on the BOARD. A beat carries `moves` — SAN from the
 *  start position — which chess.js replays into exactly one FEN, so "does this
 *  lesson teach this position" is answered by construction rather than by
 *  matching the opening's NAME. That is the selection rule this project learned
 *  the expensive way (a name-matched tier had a Caro-Kann lesson narrating a
 *  Queen's-Gambit idea, fluent and true somewhere else); nothing here can repeat
 *  it, because a beat is only ever offered at the position its own moves make.
 *
 *  Measured over the 376 taught lines in `repertoire.json`: a beat lands on
 *  38.7% of all plies, and every one of the 376 lines gets at least one. */
export interface LessonBeatNarration {
  /** The beat's full Watch prose. */
  text: string;
  /** The ≤8-word Learn cue, when the beat authored one. */
  short?: string;
  /** Stable id for run-level dedupe — `<lessonKey>#<beatId>`. */
  id: string;
  lessonKey: string;
}

/** Placement + turn + castling + en-passant. The move counters are dropped so a
 *  transposition into the same board matches, which is the same key the corpus
 *  index uses. */
const normFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

let index: Map<string, LessonBeatNarration> | null = null;

/** Deterministic winner when two lessons teach the same board — 825 of the
 *  3,780 beats collide, mostly a variation lesson re-teaching a position its
 *  main lesson already walks.
 *
 *  Registry order would decide it otherwise, which is not a decision so much as
 *  an accident of import order that would silently change the spoken lesson the
 *  next time a file is added. Main lesson first (it teaches the position in the
 *  context the walkthrough is in), then the longer prose (more teaching), then
 *  the key, so the result is stable across builds. */
function beatsBeforeExisting(candidateKey: string, candidateText: string, existing: LessonBeatNarration): boolean {
  const candidateIsMain = !candidateKey.includes('::');
  const existingIsMain = !existing.lessonKey.includes('::');
  if (candidateIsMain !== existingIsMain) return candidateIsMain;
  if (candidateText.length !== existing.text.length) return candidateText.length > existing.text.length;
  return candidateKey < existing.lessonKey;
}

function buildIndex(): Map<string, LessonBeatNarration> {
  const map = new Map<string, LessonBeatNarration>();
  for (const { key, lesson } of getAllLessonScripts()) {
    for (const beat of lesson.beats ?? []) {
      const text = beat.say?.trim();
      // A beat with no moves is the lesson's own intro, spoken over the start
      // position. The walkthrough writes its own intro, so an index entry there
      // would put two openings' preambles on one board.
      if (!text || !beat.moves?.length) continue;
      const game = new Chess();
      let legal = true;
      for (const san of beat.moves) {
        try {
          game.move(san);
        } catch {
          legal = false;
          break;
        }
      }
      if (!legal) continue;
      const fenKey = normFen(game.fen());
      const entry: LessonBeatNarration = {
        text,
        short: beat.sayShort?.trim() || undefined,
        id: `${key}#${beat.id}`,
        lessonKey: key,
      };
      const existing = map.get(fenKey);
      if (!existing || beatsBeforeExisting(key, text, existing)) map.set(fenKey, entry);
    }
  }
  return map;
}

/** The hand-written beat that teaches THIS board, or null.
 *
 *  `seen` carries the ids already spoken in this lesson so a walkthrough that
 *  passes through a position twice (a rewind, a transposition back) does not
 *  say the same paragraph twice. It is read here rather than checked by the
 *  caller so the caller cannot consume an entry it then discards. */
export function lessonBeatAt(fen: string, seen?: Set<string>): LessonBeatNarration | null {
  if (!fen) return null;
  try {
    index ??= buildIndex();
    const hit = index.get(normFen(fen));
    if (!hit) return null;
    if (seen?.has(hit.id)) return null;
    return hit;
  } catch {
    return null; // the lessons are a bonus, never a blocker
  }
}

/** Test seam — the index is built once per process from static data. */
export function resetLessonBeatIndex(): void {
  index = null;
}

/** How many boards the opening tabs teach. Reported by the coverage probe. */
export function lessonBeatIndexSize(): number {
  index ??= buildIndex();
  return index.size;
}
