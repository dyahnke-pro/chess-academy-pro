// GATE — on a Watch course, no arrow is drawn for the side its move is NOT
// written for (2026-11-11).
//
// The courses are written to one rule, printed on every fact sheet: White's
// move bare ("Nxe4", "e5"), Black's with the dots ("…Nxe4", "…e5"). The lesson
// player draws an arrow for every move a beat names. Until 2026-11-11 the
// resolver ignored the marker — it tried the side to move, then the other —
// and a wrong-side arrow stood on 816 of the 7,501 Watch beats: "…d5 and …e6
// are close behind" drew White's d4-d5; "f4 prepares e5" in White's own beat
// drew Black's …e5. Editors were rewording beats to dodge it.
//
// What is held, over EVERY served Watch-course beat:
//   1. the lesson is declared strict, and so is the line Learn plays from it —
//      the answer the players hand the resolver (`narrationSidesOf`);
//   2. no derived arrow's mover contradicts the marker on its token: a dotted
//      move is never drawn for White, a bare move never for Black.
//
// The marker and the mover are both read HERE, off the words and off the
// board, never taken from the resolver — so a marker the resolver misreads
// still shows. Negative controls: the old resolver's own arrows for two real
// beats, and the old order for bare moves ('loose') run over the courses; both
// must be caught, or the gate is passing on nothing.
import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import { getLessonScript, getVariationLessonScript, lessonToPlayableLine } from '../data/lessons';
import { WATCH_COURSES } from '../data/lessons/watch';
import { deriveNarrationArrows, type NarrationSides } from '../services/narrationArrows';
import { narrationSidesOf } from '../services/mentionedMoveArrows';
import { flipSideToMove } from '../services/threatOut';
import type { LessonScript } from '../types';

interface Arrow { from: string; to: string; san: string; token: string; index: number }

/** A token written as a move in the marker rule's sense: a piece move, a
 *  capture, castling, or a bare square that drew as a pawn's push there. A bare
 *  square that drew a PIECE's move was said in words ("the knight to f5"),
 *  which the dots rule does not govern — the owner word does. */
const PAWN_WORD_BEFORE = /\bpawns?\b[^.;:!?]{0,24}$/i;
function writtenAsMove(text: string, a: Arrow): boolean {
  if (!/^[a-h][1-8]$/.test(a.token)) return true;
  const pushThere = a.san.replace(/[+#]$/, '') === a.token;
  return pushThere && !PAWN_WORD_BEFORE.test(text.slice(Math.max(0, a.index - 40), a.index));
}

/** Whose piece an arrow moves, as the student sees it: the piece standing on
 *  its origin on the beat's own board when that piece can make the move there;
 *  else the piece an earlier arrow of the beat brought to the origin (a later
 *  step of a plan). */
function moversOf(fen: string, arrows: readonly Arrow[]): Array<'w' | 'b' | null> {
  const board = new Chess(fen);
  const legal = new Set<string>();
  const flipped = flipSideToMove(fen);
  for (const b of [board, ...(flipped ? [new Chess(flipped)] : [])]) {
    for (const m of b.moves({ verbose: true })) legal.add(`${m.from}-${m.to}`);
  }
  // The piece the SAN names ("…Qb4" is a queen): an arrow from b2 is the queen
  // an earlier arrow brought there, not the pawn standing on b2.
  const named = (san: string): string => (/^[KQRBN]/.test(san) ? san[0].toLowerCase() : san.startsWith('O') ? 'k' : 'p');
  const moved = new Map<string, { color: 'w' | 'b'; type: string }>();
  return arrows.map((a) => {
    const type = named(a.san);
    const standing = board.get(a.from as Square);
    const arrived = moved.get(a.from);
    const arrivedFits = arrived !== undefined && arrived.type === type;
    const mover = standing && standing.type === type && (!arrivedFits || legal.has(`${a.from}-${a.to}`)) ? standing.color
      : arrived && arrivedFits ? arrived.color
      : standing?.color ?? arrived?.color ?? null;
    if (mover) moved.set(a.to, { color: mover, type });
    return mover;
  });
}

/** Arrows whose mover is not the side the token's own writing names. */
function contradictions(text: string, fen: string, arrows: readonly Arrow[]): string[] {
  const movers = moversOf(fen, arrows);
  const out: string[] = [];
  arrows.forEach((a, i) => {
    const mover = movers[i];
    const dotted = /(?:…|\.{3})$/.test(text.slice(0, a.index));
    if (dotted && mover !== 'b') out.push(`"…${a.token}" drew ${a.from}-${a.to} for ${mover === 'w' ? 'White' : 'no piece'}`);
    else if (!dotted && writtenAsMove(text, a) && mover !== 'w') out.push(`bare "${a.token}" drew ${a.from}-${a.to} for ${mover === 'b' ? 'Black' : 'no piece'}`);
  });
  return out;
}

interface ServedBeat { where: string; say: string; fen: string; exclude: Array<{ from: string; to: string }>; sides: NarrationSides }

/** Every served Watch-course beat as the player shows it: its own board, the
 *  squares its trail already covers, and the sides answer read off the lesson. */
function servedWatchBeats(): { lessons: Array<{ key: string; lesson: LessonScript | null }>; beats: ServedBeat[] } {
  const lessons: Array<{ key: string; lesson: LessonScript | null }> = [];
  for (const course of WATCH_COURSES) {
    for (const line of course.lines) {
      lessons.push(line.tab === null
        ? { key: course.openingId, lesson: getLessonScript(course.openingId) }
        : { key: `${course.openingId}::${line.tab}`, lesson: getVariationLessonScript(course.openingId, line.tab) });
    }
  }
  const beats = new Map<string, ServedBeat>();
  for (const { key, lesson } of lessons) {
    if (!lesson) continue;
    for (const beat of lesson.beats) {
      const c = new Chess();
      let last: { from: string; to: string } | null = null;
      for (const m of beat.moves) { const mv = c.move(m); last = { from: mv.from, to: mv.to }; }
      const sides = narrationSidesOf(lesson, beat.orientation ?? lesson.orientation);
      // A move two tabs share is written once and said on both: read it once.
      const id = `${beat.say}|${c.fen()}|${sides.marking}|${sides.student}`;
      if (!beats.has(id)) beats.set(id, { where: `${key} ${beat.id}`, say: beat.say, fen: c.fen(), exclude: last ? [last] : [], sides });
    }
  }
  return { lessons, beats: [...beats.values()] };
}

describe('Watch-course arrows are drawn for the side the move is written for', () => {
  const { lessons, beats } = servedWatchBeats();

  it('every served course lesson — and the line Learn plays from it — is declared strict', () => {
    expect(lessons.length).toBeGreaterThan(100);
    const undeclared = lessons.filter(({ lesson }) =>
      !lesson || lesson.moveMarking !== 'strict' || lessonToPlayableLine(lesson)?.moveMarking !== 'strict');
    expect(undeclared.map((l) => l.key)).toEqual([]);
  });

  it('no arrow contradicts the marker on its token, on any served course beat', () => {
    expect(beats.length).toBeGreaterThan(3000);
    const found: string[] = [];
    let arrows = 0;
    for (const b of beats) {
      const r = deriveNarrationArrows(b.say, b.fen, b.exclude, b.sides);
      arrows += r.arrows.length;
      for (const c of contradictions(b.say, b.fen, r.arrows)) found.push(`${b.where}: ${c}`);
    }
    // The check read something: the courses name thousands of moves.
    expect(arrows).toBeGreaterThan(2000);
    expect(found).toEqual([]);
  }, 900_000);

  describe('negative controls — what the old resolver drew is caught', () => {
    it('a dotted move drawn for White', () => {
      // Trompowsky, after 2…Ne4. The old resolver drew d4-d5 for "…d5".
      const text = 'How do they deal with the threat on f6? The most popular way is to move the knight: …Ne4 dodges the '
        + 'doubled pawns and hits your bishop on g5 at the same time. …d5 and …e6 are close behind.';
      const fen = 'rnbqkb1r/pppppppp/8/6B1/3Pn3/8/PPP1PPPP/RN1QKBNR w KQkq - 3 3';
      const old: Arrow[] = [
        { token: 'd5', index: text.indexOf('…d5') + 1, from: 'd4', to: 'd5', san: 'd5' },
        { token: 'e6', index: text.indexOf('…e6') + 1, from: 'e7', to: 'e6', san: 'e6' },
      ];
      expect(contradictions(text, fen, old)).toEqual(['"…d5" drew d4-d5 for White']);
    });

    it('a bare move drawn for Black', () => {
      // Trompowsky, 2…e6: White has just played f4. The old resolver drew e6-e5 for "e5".
      const text = 'The f-pawn joins in. f4 prepares e5, hitting their queen, and keeps their queen off g5, '
        + 'where it would pin your queen to your king.';
      const fen = 'r1b1kb1r/1ppn1pp1/p2ppq1p/8/3PPP2/2N5/PPPQ2PP/2KR1BNR b kq - 0 8';
      const old: Arrow[] = [{ token: 'e5', index: text.indexOf('e5'), from: 'e6', to: 'e5', san: 'e5' }];
      expect(contradictions(text, fen, old)).toEqual(['bare "e5" drew e6-e5 for Black']);
    });

    it('the old order for bare moves, run over the courses, is caught', () => {
      // 'loose' IS the old behaviour for a bare move: the side to move first,
      // then the other. On strict text it must trip the check — if it does
      // not, the check above is reading nothing.
      let caught = 0;
      for (let i = 0; i < beats.length; i += 6) {
        const b = beats[i];
        const r = deriveNarrationArrows(b.say, b.fen, b.exclude, { ...b.sides, marking: 'loose' });
        caught += contradictions(b.say, b.fen, r.arrows).length;
      }
      expect(caught).toBeGreaterThan(20);
    }, 900_000);
  });
});
