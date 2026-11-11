// THE FACT SHEET A LESSON IS WRITTEN FROM (WO-OPENINGS-REWRITE-01, David
// 2026-11-11: "You are the writer for opening tab! You use the computers and
// ANY AND ALL TOOLS at your disposal to write the best narrations possible").
// For every move of every line of an opening: what the masters play at that
// position and how often, the engine's top lines (fixed depth) and what the
// move played costs against them, the corpus notes taught at that exact board
// (Naroditsky, Danya — seat-checked), and EVERY FACT THE APP'S TEACHING
// COMPUTERS FOUND on the move (`<id>.computers.json`, written by
// `lessonWriter.measure.test.ts`: the move's job, the board teacher, the deep
// fact, the reply tree, the refuted natural move, the plan …) with the beat
// the app's own composer would say. Every claim a beat makes is checked
// against this sheet and the board before it ships.
//
// THE COMPUTERS ARE REQUIRED (David 2026-11-11: "Are you using the
// computers???"). 48 of 50 courses were written from sheets with no computed
// line at all: the depth-16 regeneration ran this test without the writer run
// before it, and a missing file was read as "no draft". A sheet with no
// computers file now FAILS; `LESSON_NO_COMPUTERS=1` is the one named way to
// print an engine-only sheet.
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
const engine = nativeEngine(process.env.LESSON_CACHE ?? `${OUT}/engine-cache.json`, DEPTH);

vi.mock('./dataFile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./dataFile')>();
  return { ...actual, loadDataJson: async (path: string) => { try { return JSON.parse(readFileSync(`public${path}`, 'utf8')); } catch { return null; } } };
});

/** THE BOOKS, AS REFERENCE (never quoted): what the corpus says about the
 *  opening, and the concept passages whose own phrases the computers' facts
 *  use on this sheet. The classics cover the classical openings only; a
 *  modern opening has no opening page, and that is correct. */
interface BookPassage { bookTitle: string; author: string; chapter: string | null; text: string }
interface ConceptCorpus {
  concepts: Array<{ id: string; name: string; phrases: string[]; passages: BookPassage[] }>;
  openings: Record<string, BookPassage[]>;
  openingDefinitions: Record<string, { description: string; character: string; keyIdeas: string[] }>;
}
const BOOKS = JSON.parse(readFileSync('src/data/chess-concepts.json', 'utf8')) as ConceptCorpus;
const BOOK_PAGES = (JSON.parse(readFileSync('src/data/opening-book-pages.json', 'utf8')) as { pages: Record<string, BookPassage[]> }).pages;
const oneLine = (t: string): string => t.replace(/\s+/g, ' ').trim();
function booksOnOpening(id: string): string[] {
  const out: string[] = [];
  const def = BOOKS.openingDefinitions[id];
  if (def) out.push(`- definition: ${oneLine(def.description)} Character: ${def.character}. Key ideas: ${def.keyIdeas.join('; ')}.`);
  for (const p of [...(BOOKS.openings[id] ?? []), ...(BOOK_PAGES[id] ?? [])]) out.push(`- passage (book:${id}; ${p.bookTitle}${p.chapter ? `, ch. ${p.chapter}` : ''}): ${oneLine(p.text)}`);
  return out;
}
function conceptsNamed(texts: readonly string[]): string[] {
  const all = texts.join(' ').toLowerCase();
  const out: string[] = [];
  for (const c of BOOKS.concepts) {
    if (!c.passages.length) continue;
    if (!c.phrases.some((ph) => all.includes(ph.toLowerCase()))) continue;
    out.push(`- concept:${c.id} (${c.name}; ${c.passages[0].bookTitle}): ${oneLine(c.passages[0].text)}`);
  }
  return out;
}

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
    const { settleReads, agreedVerdict, NAME_CP } = await import('../test/settleReads');
    await ensureMastersDbLoaded();
    loadFullCorpus();
    mkdirSync(OUT, { recursive: true });
    for (const id of IDS) {
      const op = findLessonOpening(id);
      if (!op) continue;
      const computersPath = `${OUT}/${id}.computers.json`;
      if (!existsSync(computersPath) && process.env.LESSON_NO_COMPUTERS !== '1') {
        throw new Error(`${id}: no ${computersPath}. Run lessonWriter.measure.test.ts for this opening first (LESSON_WRITER=1, same LESSON_OUT / LESSON_LINES), so the sheet carries the teaching computers' facts.`);
      }
      const computers = existsSync(computersPath)
        ? (JSON.parse(readFileSync(computersPath, 'utf8')) as Record<string, { say: string; facts: Array<{ computer: string; group: string; idea: string; seat: string; weight: number; text: string; spoke: boolean }> }>)
        : {};
      let withFacts = 0; let moves = 0;
      const lines = fullLines(id, process.env.LESSON_LINES) ?? lessonLines(op, (tab) => (tab === null ? getLessonScript(id) : getVariationLessonScript(id, tab))?.beats.at(-1)?.moves, extraLines(id, process.env.LESSON_EXTRA));
      const md: string[] = [`# ${op.name} — fact sheet (student plays ${op.color})`];
      const books = booksOnOpening(id);
      if (books.length) md.push(`\n## Reference — the books on this opening (ideas only, never quoted; cite as sources)\n`, ...books);
      const computedTexts: string[] = [];
      for (const line of lines) {
        md.push(`\n## ${line.name}\n`);
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
          // THE ONE VERDICT A BEAT MAY SPEAK: a better move is named only when
          // it is ahead by the naming bar now and one move deeper (two reads
          // that agree). The board after the move is read once: it is the next
          // move's own board, so the sheet cannot contradict itself across
          // two blocks.
          const childOf = (u: string): { fen: string; mate: boolean; stale: boolean } | null => {
            try { const b = new Chess(fen); b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }); return { fen: b.fen(), mate: b.isCheckmate(), stale: b.isStalemate() || b.isDraw() }; } catch { return null; }
          };
          const verdict = await agreedVerdict(engine.read, fen, uci, settled, childOf);
          const after = c.isGameOver() ? null : (await engine.read(c.fen(), { multipv: 3 }))[0] ?? null;
          const pawns = (cp: number): string => (cp / 100).toFixed(2);
          const verdictTxt = verdict.kind === 'prefers'
            ? `the engine prefers ${sanOfUci(fen, verdict.uci)} — two reads agree (${pawns(verdict.now)} better now, ${pawns(verdict.deeper)} one move deeper). You may name it.`
            : verdict.kind === 'unsettled'
              ? `NO agreed better move — the first read likes ${sanOfUci(fen, verdict.uci)} by ${pawns(verdict.now)}, one move deeper it is ${pawns(verdict.deeper)}. Name no better move and make no engine claim.`
              : verdict.kind === 'first'
                ? `the engine's first choice. No better move.`
                : `no move is ahead of it by ${pawns(NAME_CP)}. Name no better move; do not call it the engine's first choice.`;
          const note = noteAtPosition(line.moves.slice(0, i + 1), c.fen(), op.name, op.color);
          const found = computers[`${fen}|${uci}`];
          moves += 1; if (found?.facts.length) withFacts += 1;
          md.push(`### ${i + 1}. ${seat} ${san}${mv.captured ? ' (capture)' : ''}${c.inCheck() ? ' (check)' : ''}`);
          md.push(`- masters here (${total} games): ${mastersTxt || 'none — out of the masters database'}`);
          md.push(`- engine (mover's view, pawns): ${topTxt}`);
          md.push(`- ${san} itself: ${playedRead ? (sign * playedRead.cp / 100).toFixed(2) : '?'}${after ? ` (one move deeper: ${(sign * after.cp / 100).toFixed(2)})` : ''}${cost !== null ? `, first read costs ${cost.toFixed(2)}` : ''}; line after: ${playedRead ? lineSans(fen, playedRead.pv, 7) : '?'}`);
          md.push(`- verdict: ${verdictTxt}`);
          const me = op.color === 'white' ? 'w' : 'b';
          const pins = pinsOf(c, me);
          const loose = looseOf(c, me, pins.pinned);
          const mat = materialFor(c, me);
          // The eval word: the weaker of the two reads of this position (the
          // move's own read and the board one move deeper); level when they
          // disagree on who is better.
          const seatCp = (cp: number): number => (me === 'w' ? cp : -cp);
          const cp1 = playedRead ? seatCp(playedRead.cp) : null;
          const cp2 = after ? seatCp(after.cp) : null;
          const studentCp = cp1 === null ? cp2 : cp2 === null ? cp1 : Math.sign(cp1) !== Math.sign(cp2) && cp1 !== 0 && cp2 !== 0 ? 0 : Math.abs(cp1) <= Math.abs(cp2) ? cp1 : cp2;
          md.push(`- board after: the ${PIECE_NAME[mv.piece]} on ${mv.to} hits ${hitsFrom(c, mv.to, mv.color).join(', ') || 'nothing of the other side'} · loose: ${loose.join(', ') || 'none'} · pins: ${pins.text.join('; ') || 'none'} · material ${mat >= 0 ? '+' : ''}${mat} for you${studentCp !== null ? ` · say "${evalWords(studentCp)}" (${studentCp}cp your seat), no stronger` : ''} · side marker ${mv.color === 'b' ? `"…${mv.san}"` : `"${mv.san}" (no dots)`}`);
          if (note) md.push(`- corpus note (${note.id}): ${[note.explains, note.teaches, note.plans].filter(Boolean).join(' ').replace(/\s+/g, ' ')}`);
          // The computers' facts: the ones the app's composer spoke first (*),
          // then the rest by weight. Ideas, not numbers: a cost or a "best
          // move" comes from the engine lines above.
          if (found?.facts.length) {
            const ordered = found.facts.slice().sort((a, b) => Number(b.spoke) - Number(a.spoke) || b.weight - a.weight);
            md.push(`- computers (${ordered.length}; * = the app's composer spoke it):`);
            for (const f of ordered) { md.push(`  - ${f.spoke ? '*' : ' '} [${f.computer} · ${f.idea} · ${f.seat}] ${f.text.replace(/\s+/g, ' ')}`); computedTexts.push(f.text); }
          } else {
            md.push(`- computers: nothing found on this move`);
          }
          if (found?.say) md.push(`- computed beat: ${found.say.replace(/\s+/g, ' ')}`);
          engine.flush();
        }
      }
      const concepts = conceptsNamed(computedTexts);
      if (concepts.length) md.push(`\n## Reference — the concepts the computers named on this sheet, as the books teach them (ideas only, never quoted)\n`, ...concepts);
      writeFileSync(`${OUT}/${id}.facts.md`, md.join('\n'));
      // The lines the sheet walked, in its order, so the writer's input is cut
      // from the sheet alone.
      writeFileSync(`${OUT}/${id}.lines.json`, JSON.stringify(lines.map((l) => ({ tab: l.name, moves: l.moves }))));
      console.log(`facts ${id}: ${lines.length} lines, computers on ${withFacts} of ${moves} moves`);
    }
  }, 4 * 60 * 60_000);
});
