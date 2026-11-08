/**
 * A CHAT ANSWER'S BOARD COMMANDS, PUT UP AS THEY ARE SAID (David 2026-11-08:
 * "Key squares get highlights, moves get arrowed … and they ALL appear AS THEY
 * ARE STATED"). The in-game chat panel used to hand every arrow and highlight
 * of an answer to its board in one batch when the stream ended — the marks
 * landed together, often after the words that named them. This splits an
 * answer's commands: a position or a practice is applied now; each arrow and
 * highlight goes up on the one schedule (`markPacing`) at the words that state
 * it — its square, its piece, its move — and every square the words name that
 * no command lit is lit too (the board reads the words, as Review's does).
 *
 * `elapsedMs` is how long the answer has already been on air when its
 * commands arrive (the panel speaks while it streams): marks whose words are
 * past go up at once, the rest when their words come.
 */
import type { BoardAnnotationCommand, BoardArrow, BoardHighlight } from '../types';
import { squaresNamedNotMoves } from './arrowEngine';
import { markItems } from './markAnchors';
import { scheduleMarks } from './markPacing';

/** The key-square fill a square the words name is lit with. */
const NAMED_SQUARE_FILL = '#eab308';

export function paceAnnotations(
  commands: readonly BoardAnnotationCommand[],
  text: string,
  fen: string,
  viewer: 'w' | 'b',
  emit: (commands: BoardAnnotationCommand[]) => void,
  elapsedMs: number,
): () => void {
  const now = commands.filter((c) => c.type !== 'arrow' && c.type !== 'highlight');
  if (now.length) emit(now);
  const arrows: BoardArrow[] = commands.flatMap((c) => (c.type === 'arrow' ? c.arrows ?? [] : []));
  const given: BoardHighlight[] = commands.flatMap((c) => (c.type === 'highlight' ? c.highlights ?? [] : []));
  // A position the answer switches to is the board its marks are on.
  const board = now.find((c) => c.type === 'show_position' && c.fen)?.fen ?? fen;
  const named = text.trim() ? squaresNamedNotMoves(text, [board]) : [];
  const highlights: BoardHighlight[] = [
    ...given,
    ...named.filter((sq) => !given.some((h) => h.square === sq)).map((square) => ({ square, color: NAMED_SQUARE_FILL })),
  ];
  if (arrows.length === 0 && highlights.length === 0) return () => undefined;
  const marks: BoardAnnotationCommand[] = [];
  const shownSet = new Set<string>();
  const paint = (): void => {
    marks.length = 0;
    const a = arrows.filter((_, i) => shownSet.has(`a${i}`));
    const h = highlights.filter((_, i) => shownSet.has(`h${i}`));
    if (a.length) marks.push({ type: 'arrow', arrows: a });
    if (h.length) marks.push({ type: 'highlight', highlights: h });
    if (marks.length) emit([...marks]);
  };
  if (!text.trim()) {
    arrows.forEach((_, i) => shownSet.add(`a${i}`));
    highlights.forEach((_, i) => shownSet.add(`h${i}`));
    paint();
    return () => undefined;
  }
  const items = markItems({
    fen: board,
    viewer,
    highlights: highlights.map((h) => h.square),
    arrows: arrows.map((a) => ({ from: a.startSquare, to: a.endSquare })),
  });
  const timers: number[] = [];
  let cancelled = false;
  for (const ev of scheduleMarks(text, items)) {
    const delay = Math.max(0, ev.atMs - elapsedMs);
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      if (ev.kind === 'clear') { shownSet.clear(); return; }
      shownSet.add(ev.id);
      paint();
    }, delay));
  }
  return () => { cancelled = true; for (const t of timers) window.clearTimeout(t); };
}
