// THE SHORT GAME, PLY BY PLY (WO-STORY-MATRIX-01 P1-0). GothamChess –
// JelenaKarleusa, chess.com 2023: a 27-ply miniature that ends in mate
// (13.Bxf7+ Ke7 14.Qe6#), with the engine reads the Danya bench took on it
// committed beside it (src/test/fixtures/gotham-jelena.json), so it walks with
// no engine. For every move it prints what a LESSON says (`lessonThought`, one
// voice across the game, as the generator walks a line) and what REVIEW says
// (the walk's segment for the move, before the engine projections).
//
// A measurement, not an assertion: each Phase 1 step reads it before and after,
// the way the 2026-10-30 dump found "it hits your bishop on f7" said on the
// move that walks into Qe6#. Run:
//   SHORT_GAME=1 npx vitest run src/services/shortGame.measure.test.ts
// Optional SHORT_GAME_OUT=<file> also writes the tape as markdown.
import { it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { lessonLines, replayPlies, reviewSegments, evalOf, type EngineRead, type ReplayGame } from '../test/replayGame';

const RUN = process.env.SHORT_GAME === '1';
const FIXTURE = 'src/test/fixtures/gotham-jelena.json';

const evalText = (r: EngineRead): string => (r.mate !== null ? `#${r.mate}` : `${evalOf(r) >= 0 ? '+' : ''}${(evalOf(r) / 100).toFixed(2)}`);
function sanOf(fen: string, uci: string): string {
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; }
}
/** Review's line as the student hears it, and the facet tags that carried it. */
function spokenOf(narration: string | null | undefined): { said: string; tags: string[] } {
  const text = narration ?? '';
  return { said: text.replace(/\[[a-z0-9-]+\]\s*/gi, '').trim(), tags: [...text.matchAll(/\[([a-z0-9-]+)\]/gi)].map((m) => m[1]) };
}

it.runIf(RUN)('the short game: the lesson line and the Review line, ply by ply', () => {
  const game: ReplayGame = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const plies = replayPlies(game);
  const lesson = lessonLines(game);
  const review = new Map(reviewSegments(game).map((s) => [s.ply, s.narration]));
  expect(plies.length).toBe(27);

  const out: string[] = ['# The short game, ply by ply', '', `${game.sans.join(' ')} (student ${game.studentSide})`, ''];
  let lessonWords = 0;
  let reviewWords = 0;
  for (const [k, p] of plies.entries()) {
    const num = `${Math.ceil(p.ply / 2)}${p.mover === 'w' ? '.' : '…'}${p.san}`;
    const engine = p.best
      ? `best ${sanOf(p.fenBefore, p.best.uci)} ${evalText(p.best)}${p.reply ? ` · after ${evalText(p.reply)}` : ' · game over'}${p.costCp !== null ? ` · cost ${p.costCp}cp` : ''}`
      : 'no read';
    const r = spokenOf(review.get(p.ply));
    lessonWords += lesson[k].split(/\s+/).filter(Boolean).length;
    reviewWords += r.said.split(/\s+/).filter(Boolean).length;
    out.push(`## Ply ${p.ply} — ${num} (${p.own ? 'yours' : 'theirs'}) — ${engine}`, '');
    out.push(`- LESSON: ${lesson[k] || '(silent)'}`);
    out.push(`- REVIEW: ${r.said || '(silent)'}${r.tags.length ? `  [${r.tags.join(', ')}]` : ''}`, '');
  }
  out.push(`Average words a ply — lesson ${(lessonWords / plies.length).toFixed(1)}, review ${(reviewWords / plies.length).toFixed(1)}.`);
  const tape = out.join('\n');
  console.log(tape);
  if (process.env.SHORT_GAME_OUT) writeFileSync(process.env.SHORT_GAME_OUT, `${tape}\n`);
}, 120_000);
