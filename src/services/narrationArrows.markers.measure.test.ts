// THE SIDE-MARKER MEASURE — what the lesson arrow resolver draws for every
// served lesson beat, before and after a change to it (2026-11-11: the
// resolver ignored the side marker, so "…d5" drew White's d4-d5 and a bare
// "e5" in White's own beat drew Black's …e5).
//
// Three steps, each gated by an env flag so the default run is a no-op:
//
//   # 1. on the OLD resolver (before the change):
//   ARROW_MARKERS=before npx vitest run src/services/narrationArrows.markers.measure.test.ts
//   # 2. on the NEW resolver:
//   ARROW_MARKERS=after  npx vitest run src/services/narrationArrows.markers.measure.test.ts
//   # 3. the diff, sorted, with every change laid out to READ against its board:
//   ARROW_MARKERS=diff   npx vitest run src/services/narrationArrows.markers.measure.test.ts
//
// Snapshots: audit-reports/arrow-markers.<label>.json (what was drawn; the
// marker and the mover are read at diff time, off the words and off the board,
// never taken from the resolver). The diff writes arrow-markers.diff.json and
// .md: every arrow that went or came, its board, its words, and a first sort:
//
//   a  a wrong-side arrow removed or corrected — the token's own writing (the
//      dots; bare in a strict text) and the mover's colour disagreed
//   b  a square reference no longer drawn as a pawn push
//   s  a spoken move ("the knight to f5") that went — the words, not a marker,
//      say whose it is, so each one is READ (wrong side removed, or right lost)
//   c  anything else that went — a previously right arrow lost, unless the
//      read says otherwise; must end at zero, or each one explained
//   d  an arrow that came (a move the old resolver did not draw, or drew for
//      the other side at another mention)
// The sort is by rule; the report is what was read.
//
// The diff also lists the TEXT SUSPECTS: a move the resolver now refuses
// because the side its marker names cannot play it, while the other side can —
// a beat that names a move with the wrong marker (or a line recited bare).
import { describe, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess, type Square } from 'chess.js';
import { getAllLessonScripts } from '../data/lessons';
import { WATCH_COURSES } from '../data/lessons/watch';
import { deriveNarrationArrows } from './narrationArrows';
import { narrationSidesOf } from './mentionedMoveArrows';
import { flipSideToMove } from './threatOut';

const MODE = process.env.ARROW_MARKERS ?? '';
const OUT = join(process.cwd(), 'audit-reports');
const snapshotPath = (label: string): string => join(OUT, `arrow-markers.${label}.json`);

type Color = 'w' | 'b';
interface SnapArrow { from: string; to: string; san: string; token: string; index: number }
interface SnapBeat {
  key: string;
  beatId: string;
  watch: boolean;
  orientation: 'white' | 'black';
  fen: string;
  /** The beat's own move — a token that says it again is not a text suspect. */
  last?: string;
  say: string;
  arrows: SnapArrow[];
  rejected: Array<{ token: string; index: number; reason: string }>;
}

const fenOf = (moves: readonly string[]): string => {
  const c = new Chess();
  for (const m of moves) { try { c.move(m); } catch { break; } }
  return c.fen();
};

/** The squares the player's own trail covers on this beat: the moves it plays
 *  past what the previous beat had on the board (`LessonPlayer`'s trail). */
const trailOf = (prev: readonly string[], cur: readonly string[]): Array<{ from: string; to: string }> => {
  let cp = 0;
  while (cp < prev.length && cp < cur.length && prev[cp] === cur[cp]) cp += 1;
  const c = new Chess();
  const out: Array<{ from: string; to: string }> = [];
  for (let k = 0; k < cur.length; k += 1) {
    try {
      const mv = c.move(cur[k]);
      if (k >= cp) out.push({ from: mv.from, to: mv.to });
    } catch { break; }
  }
  return out;
};

const snapshot = (): SnapBeat[] => {
  const watchKeys = new Set<string>();
  for (const course of WATCH_COURSES) {
    for (const l of course.lines) watchKeys.add(l.tab === null ? course.openingId : `${course.openingId}::${l.tab}`);
  }
  const out: SnapBeat[] = [];
  for (const { key, lesson } of getAllLessonScripts()) {
    let prev: readonly string[] = [];
    for (const beat of lesson.beats) {
      const fen = fenOf(beat.moves);
      const exclude = [...(beat.arrows ?? []).map((a) => ({ from: a.from, to: a.to })), ...trailOf(prev, beat.moves)];
      prev = beat.moves;
      const seat = beat.orientation ?? lesson.orientation;
      const r = deriveNarrationArrows(beat.say, fen, exclude, narrationSidesOf(lesson, seat));
      out.push({
        key,
        beatId: beat.id,
        watch: watchKeys.has(key),
        orientation: seat,
        fen,
        last: (beat.moves[beat.moves.length - 1] ?? '').replace(/[+#]$/, ''),
        say: beat.say,
        arrows: r.arrows.map((a) => ({ from: a.from, to: a.to, san: a.san, token: a.token, index: a.index })),
        rejected: r.rejected,
      });
    }
  }
  return out;
};

// ── read at diff time, off the words and the board ─────────────────────────

/** How the token itself is written: 'dots' = "…Nf6" / "...Nf6"; 'spoken' = a
 *  move said in words ("the knight to f6", "your e-pawn goes to e5"); else
 *  'bare'. */
type TokenMarker = 'dots' | 'bare' | 'spoken';
const tokenMarker = (text: string, a: SnapArrow): TokenMarker => {
  if (/(?:…|\.{3})$/.test(text.slice(0, a.index))) return 'dots';
  if (!/^[a-h][1-8]$/.test(a.token)) return 'bare';
  // A bare square that drew a piece's move (or a pawn's capture) was said in
  // words; so was a push with the word "pawn" in front of it.
  if (a.san.replace(/[+#]$/, '') !== a.token) return 'spoken';
  return /\bpawns?\b[^.;:!?]{0,24}$/i.test(text.slice(Math.max(0, a.index - 40), a.index)) ? 'spoken' : 'bare';
};

/** Whose piece each arrow moves, as the student sees it: the piece standing on
 *  the arrow's origin on the beat's own board when that piece can make the
 *  move there; else the piece an earlier arrow of the beat brought to the
 *  origin (a later step of a plan). */
const moversOf = (fen: string, arrows: readonly SnapArrow[]): Array<Color | null> => {
  const board = new Chess(fen);
  const legal = new Set<string>();
  const flipped = flipSideToMove(fen);
  for (const b of [board, ...(flipped ? [new Chess(flipped)] : [])]) {
    for (const m of b.moves({ verbose: true })) legal.add(`${m.from}-${m.to}`);
  }
  // The piece the SAN names ("…Qb4" is a queen): an arrow from b2 is the queen
  // an earlier arrow brought there, not the pawn standing on b2.
  const named = (san: string): string => (/^[KQRBN]/.test(san) ? san[0].toLowerCase() : san.startsWith('O') ? 'k' : 'p');
  const moved = new Map<string, { color: Color; type: string }>();
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
};

type ChangeClass = 'a' | 'b' | 's' | 'c' | 'd';
interface Change {
  key: string; beatId: string; watch: boolean; orientation: 'white' | 'black'; fen: string; say: string;
  token: string; index: number; marker: TokenMarker;
  before: string | null; after: string | null; afterReason: string | null;
  cls: ChangeClass; why: string;
}
const NAME: Record<Color, string> = { w: 'White', b: 'Black' };
const arrowText = (a: SnapArrow, mover: Color | null): string =>
  `${a.from}-${a.to} (${a.san}, ${mover ? NAME[mover] : '?'})`;

describe.skipIf(MODE !== 'before' && MODE !== 'after')('arrow side-marker measure — snapshot', () => {
  it(`writes audit-reports/arrow-markers.${MODE}.json`, () => {
    const beats = snapshot();
    mkdirSync(OUT, { recursive: true });
    writeFileSync(snapshotPath(MODE), JSON.stringify(beats));
    const tally = (bs: SnapBeat[]): { arrows: number; contradicted: number; beats: number } => {
      let arrows = 0; let contradicted = 0; let hit = 0;
      for (const b of bs) {
        const movers = moversOf(b.fen, b.arrows);
        let bad = 0;
        b.arrows.forEach((a, i) => {
          const marker = tokenMarker(b.say, a);
          if ((marker === 'dots' && movers[i] === 'w') || (b.watch && marker === 'bare' && movers[i] === 'b')) bad += 1;
        });
        arrows += b.arrows.length; contradicted += bad; if (bad) hit += 1;
      }
      return { arrows, contradicted, beats: hit };
    };
    const watch = beats.filter((b) => b.watch);
    const hand = beats.filter((b) => !b.watch);
    const uniqueWatch = [...new Map(watch.map((b) => [`${b.say}|${b.fen}`, b])).values()];
    console.log(`[arrow-markers:${MODE}] ${beats.length} lesson beats · Watch-course ${watch.length} (${uniqueWatch.length} unique) · hand-written ${hand.length}`);
    console.log(`[arrow-markers:${MODE}] Watch-course: ${JSON.stringify(tally(watch))} · unique: ${JSON.stringify(tally(uniqueWatch))}`);
    console.log(`[arrow-markers:${MODE}] hand-written (dots drawn for White only; a bare move is either side's there): ${JSON.stringify(tally(hand))}`);
  }, 900_000);
});

describe.skipIf(MODE !== 'diff')('arrow side-marker measure — diff', () => {
  it('sorts every arrow that went or came', () => {
    if (!existsSync(snapshotPath('before')) || !existsSync(snapshotPath('after'))) {
      throw new Error('run ARROW_MARKERS=before on the old resolver and ARROW_MARKERS=after on the new one first');
    }
    const before = JSON.parse(readFileSync(snapshotPath('before'), 'utf8')) as SnapBeat[];
    const after = JSON.parse(readFileSync(snapshotPath('after'), 'utf8')) as SnapBeat[];
    const afterBy = new Map(after.map((b) => [`${b.key}|${b.beatId}`, b]));
    const changes: Change[] = [];
    const changedBeats = new Set<string>();
    for (const b of before) {
      const a = afterBy.get(`${b.key}|${b.beatId}`);
      if (!a || a.say !== b.say) continue; // a course edited between the runs is not the resolver's change
      const bMovers = moversOf(b.fen, b.arrows);
      const aMovers = moversOf(a.fen, a.arrows);
      const bSet = new Set(b.arrows.map((x) => `${x.from}-${x.to}`));
      const aSet = new Set(a.arrows.map((x) => `${x.from}-${x.to}`));
      const base = { key: b.key, beatId: b.beatId, watch: b.watch, orientation: b.orientation, fen: b.fen, say: b.say };
      b.arrows.forEach((x, i) => {
        if (aSet.has(`${x.from}-${x.to}`)) return; // still drawn (perhaps from another mention)
        const marker = tokenMarker(b.say, x);
        const mover = bMovers[i];
        const yi = a.arrows.findIndex((y) => y.index === x.index);
        const y = yi >= 0 ? a.arrows[yi] : null;
        const reason = a.rejected.find((r) => r.index === x.index)?.reason ?? null;
        const wrongSide = (marker === 'dots' && mover === 'w') || (b.watch && marker === 'bare' && mover === 'b');
        const [cls, why]: [ChangeClass, string] = wrongSide ? ['a', y ? 'wrong-side arrow corrected' : 'wrong-side arrow removed']
          : reason && /square reference/.test(reason) ? ['b', 'square reference no longer a pawn push']
          : marker === 'spoken' ? ['s', 'spoken move — READ whose it is']
          : ['c', 'went — READ'];
        changes.push({
          ...base, token: x.token, index: x.index, marker,
          before: arrowText(x, mover), after: y ? arrowText(y, aMovers[yi]) : null, afterReason: reason, cls, why,
        });
        changedBeats.add(`${b.say}|${b.fen}`);
      });
      a.arrows.forEach((y, i) => {
        if (bSet.has(`${y.from}-${y.to}`)) return;
        if (b.arrows.some((x) => x.index === y.index && !aSet.has(`${x.from}-${x.to}`))) return; // listed as a correction above
        changes.push({
          ...base, token: y.token, index: y.index, marker: tokenMarker(a.say, y),
          before: null, after: arrowText(y, aMovers[i]), afterReason: null, cls: 'd', why: 'came',
        });
        changedBeats.add(`${b.say}|${b.fen}`);
      });
    }
    // One beat is served on every tab that shares its moves: count it once.
    const unique = [...new Map(changes.map((c) => [`${c.say}|${c.fen}|${c.index}|${c.cls}`, c])).values()];
    const count = (rows: Change[], watch: boolean): Record<ChangeClass, number> => {
      const out: Record<ChangeClass, number> = { a: 0, b: 0, s: 0, c: 0, d: 0 };
      for (const c of rows) if (c.watch === watch) out[c.cls] += 1;
      return out;
    };

    // TEXT SUSPECTS — refused for the side the marker names, legal for the other.
    const suspects: string[] = [];
    const seenSuspect = new Set<string>();
    for (const b of after) {
      if (!b.watch) continue;
      const board = new Chess(b.fen);
      const flipped = flipSideToMove(b.fen);
      const boards: Partial<Record<Color, Chess>> = { [board.turn()]: board };
      if (flipped) boards[board.turn() === 'w' ? 'b' : 'w'] = new Chess(flipped);
      for (const r of b.rejected) {
        const want: Color | null = /dots mark Black/.test(r.reason) ? 'b' : /bare move is White/.test(r.reason) ? 'w' : null;
        if (!want || /^[a-h][1-8]$/.test(r.token)) continue; // a bare square may be a square's name
        if (r.token === b.last) continue; // the beat's own move, said again
        const other = boards[want === 'w' ? 'b' : 'w'];
        const legal = other?.moves({ verbose: true }).some((m) => m.san.replace(/[+#]$/, '') === r.token);
        if (!legal) continue;
        const id = `${b.say}|${b.fen}|${r.index}`;
        if (seenSuspect.has(id)) continue;
        seenSuspect.add(id);
        suspects.push(`- **${b.key}** \`${b.beatId}\` — written ${want === 'b' ? `"…${r.token}"` : `bare "${r.token}"`}, legal only for ${NAME[want === 'w' ? 'b' : 'w']}\n`
          + `  - board: \`${b.fen}\`\n  - words: …${b.say.slice(Math.max(0, r.index - 80), r.index)}**[${r.token}]**${b.say.slice(r.index + r.token.length, r.index + r.token.length + 50)}…`);
      }
    }

    const summary = {
      lessonBeats: before.length,
      watchBeats: before.filter((b) => b.watch).length,
      uniqueBeatsChanged: changedBeats.size,
      changes: { all: changes.length, unique: unique.length },
      uniqueWatch: count(unique, true),
      uniqueHandWritten: count(unique, false),
      textSuspects: suspects.length,
    };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, 'arrow-markers.diff.json'), JSON.stringify({ summary, changes: unique }, null, 1));
    const md: string[] = ['# Arrow side-marker measure — before vs after', '', '```json', JSON.stringify(summary, null, 1), '```', ''];
    for (const cls of ['c', 's', 'd', 'a', 'b'] as const) {
      md.push(`## class ${cls}`, '');
      for (const c of unique.filter((x) => x.cls === cls)) {
        md.push(
          `- **${c.key}** \`${c.beatId}\` ${c.watch ? '(Watch, strict)' : '(hand-written)'} — student ${c.orientation}`,
          `  - board: \`${c.fen}\``,
          `  - words: …${c.say.slice(Math.max(0, c.index - 90), c.index)}**[${c.token}]**${c.say.slice(c.index + c.token.length, c.index + c.token.length + 50)}…`,
          `  - written: ${c.marker} · before: ${c.before ?? 'nothing'} · after: ${c.after ?? `nothing (${c.afterReason ?? 'not derived'})`}`,
        );
      }
      md.push('');
    }
    md.push('## text suspects (Watch courses): the marker names a side that cannot play the move', '', ...suspects, '');
    writeFileSync(join(OUT, 'arrow-markers.diff.md'), md.join('\n'));
    console.log(`[arrow-markers:diff] ${JSON.stringify(summary)}`);
  }, 900_000);
});
