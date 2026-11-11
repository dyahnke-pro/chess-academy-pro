// THE FACT SHEET A LESSON IS WRITTEN FROM (WO-OPENINGS-REWRITE-01, David
// 2026-11-11: "You are the writer for opening tab! You use the computers and
// ANY AND ALL TOOLS at your disposal to write the best narrations possible").
// For every move of every line of an opening: what the masters play at that
// position and how often, the engine's top lines (fixed depth) and what the
// move played costs against them, the corpus notes taught at that exact board
// (Naroditsky, Danya — seat-checked), and the computed draft beat from
// `lessonWriter.measure.test.ts` when it has run. Every claim a beat makes is
// checked against this sheet and the board before it ships.
//
//   LESSON_FACTS=1 LESSON_IDS=trompowsky-attack npx vitest run src/services/lessonFacts.measure.test.ts
import { describe, it, vi } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { nativeEngine } from '../test/nativeStockfish';
import { findLessonOpening, extraLines, fullLines, lessonLines } from '../test/lessonLines';
import { pinsOf, looseOf, materialFor, hitsFrom, evalWords, PIECE_NAME } from '../../scripts/course-replies/boardFacts';

const ON = process.env.LESSON_FACTS === '1';
const IDS = (process.env.LESSON_IDS ?? 'trompowsky-attack').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = process.env.LESSON_OUT ?? 'audit-reports/lesson-writer';
const DEPTH = Number(process.env.LESSON_DEPTH ?? 16);
const engine = nativeEngine(`${OUT}/engine-cache.json`, DEPTH);

vi.mock('./dataFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./dataFile')>();
  return { ...actual, loadDataJson: async (path: string) => { try { return JSON.parse(readFileSync(`public${path}`, 'utf8')); } catch { return null; } } };
});

const sanOfUci = (fen: string, uci: string): string => { try { const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined }); return m.san; } catch { return uci; } };
/** The engine line as SAN, from the mover's seat in pawns. */
const lineSans = (fen: string, pv: readonly string[], n: number): string => {
  const c = new Chess(fen); const out: string[] = [];
  for (const u of pv.slice(0, n)) { try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }).san); } catch { break; } }
  return out.join(' ');
};

describe.skipIf(!ON)('the fact sheet a lesson is written from', () => {
  it('writes one block per move of every line', async () => {
    const { ensureMastersDbLoaded, mastersMovesSync } = await import('./masterPlayLookup');
    const { loadFullCorpus } = await import('../test/loadFullCorpus');
    const { noteAtPosition } = await import('./danyaTeachingService');
    const { getLessonScript, getVariationLessonScript } = await import('../data/lessons');
    const { settleReads } = await import('../test/settleReads');
    await ensureMastersDbLoaded();
    loadFullCorpus();
    mkdirSync(OUT, { recursive: true });
    for (const id of IDS) {
      const op = findLessonOpening(id);
      if (!op) continue;
      const draftPath = `${OUT}/${id}.json`;
      const drafts = existsSync(draftPath) ? (JSON.parse(readFileSync(draftPath, 'utf8')) as { lines: Array<{ name: string; beats: Array<{ ply: number; say: string }> }> }).lines : [];
      const lines = fullLines(id, process.env.LESSON_LINES) ?? lessonLines(op, (tab) => (tab === null ? getLessonScript(id) : getVariationLessonScript(id, tab))?.beats.at(-1)?.moves, extraLines(id, process.env.LESSON_EXTRA));
      const md: string[] = [`# ${op.name} — fact sheet (student plays ${op.color})`];
      for (const line of lines) {
        md.push(`\n## ${line.name}\n`);
        const draft = drafts.find((d) => d.name === line.name);
        const c = new Chess();
        for (let i = 0; i < line.moves.length; i += 1) {
          const fen = c.fen();
          const mover = c.turn() === 'w' ? 'white' : 'black';
          const seat = mover === op.color ? 'YOU' : 'THEM';
          const san = line.moves[i];
          let mv;
          try { mv = c.move(san); } catch { md.push(`${i + 1}. ${san} — ILLEGAL here`); break; }
          const sign = mover === 'white' ? 1 : -1;
          const masters = (mastersMovesSync(fen) ?? []).slice().sort((a, b) => b.games - a.games);
          const total = masters.reduce((a, m) => a + m.games, 0);
          const mastersTxt = masters.slice(0, 5).map((m) => `${m.san} ${Math.round((100 * m.games) / Math.max(1, total))}%`).join(', ');
          const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
          // One verdict per move: when the top-3 read and the move's own read
          // disagree, every candidate is read on its own (settleReads).
          const settled = await settleReads(engine.read, fen, uci);
          const top = settled.top;
          const topTxt = top.map((l) => `${sanOfUci(fen, l.pv[0] ?? '')} ${(sign * l.cp / 100).toFixed(2)} (${lineSans(fen, l.pv, 6)})`).join(' | ') + (settled.reread ? ' [each move read on its own]' : '');
          const playedRead = settled.played;
          const cost = settled.cost;
          const note = noteAtPosition(line.moves.slice(0, i + 1), c.fen(), op.name, op.color);
          const d = draft?.beats.find((b) => b.ply === i + 1)?.say ?? '';
          md.push(`### ${i + 1}. ${seat} ${san}${mv.captured ? ' (capture)' : ''}${c.inCheck() ? ' (check)' : ''}`);
          md.push(`- masters here (${total} games): ${mastersTxt || 'none — out of the masters database'}`);
          md.push(`- engine (mover's view, pawns): ${topTxt}`);
          md.push(`- ${san} itself: ${playedRead ? (sign * playedRead.cp / 100).toFixed(2) : '?'}${cost !== null ? `, costs ${cost.toFixed(2)} against the best` : ''}; line after: ${playedRead ? lineSans(fen, playedRead.pv, 7) : '?'}`);
          const me = op.color === 'white' ? 'w' : 'b';
          const pins = pinsOf(c, me);
          const loose = looseOf(c, me, pins.pinned);
          const mat = materialFor(c, me);
          const studentCp = playedRead ? (me === 'w' ? playedRead.cp : -playedRead.cp) : null;
          md.push(`- board after: the ${PIECE_NAME[mv.piece]} on ${mv.to} hits ${hitsFrom(c, mv.to, mv.color).join(', ') || 'nothing of the other side'} · loose: ${loose.join(', ') || 'none'} · pins: ${pins.text.join('; ') || 'none'} · material ${mat >= 0 ? '+' : ''}${mat} for you${studentCp !== null ? ` · say "${evalWords(studentCp)}" (${studentCp}cp your seat), no stronger` : ''} · side marker ${mv.color === 'b' ? `"…${mv.san}"` : `"${mv.san}" (no dots)`}`);
          if (note) md.push(`- corpus note (${note.id}): ${[note.explains, note.teaches, note.plans].filter(Boolean).join(' ').replace(/\s+/g, ' ')}`);
          if (d) md.push(`- computed draft: ${d}`);
          engine.flush();
        }
      }
      writeFileSync(`${OUT}/${id}.facts.md`, md.join('\n'));
      // The lines the sheet walked, in its order, so the writer's input is cut
      // from the sheet alone (no computed-draft run needed).
      writeFileSync(`${OUT}/${id}.lines.json`, JSON.stringify(lines.map((l) => ({ tab: l.name, moves: l.moves }))));
      console.log(`facts ${id}: ${lines.length} lines`);
    }
  }, 4 * 60 * 60_000);
});
