// Content audit for The Coaches Library — checks the BOOKS, not the surface.
// Verifies: (1) read-aloud text quality (no OCR garble / residual move notation /
// heading leaks / empty pages), (2) every live board is legal AND its line
// replays, (3) boards aren't degenerate, (4) citations complete.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const books = ['my-system', 'chess-and-checkers', 'chess-fundamentals', 'chess-strategy'].map(
  (f) => JSON.parse(readFileSync(`src/data/library/${f}.json`, 'utf8')),
);

let problems = 0;
const flag = (book, page, why, sample) => {
  problems++;
  console.log(`  ✗ ${book} ${page}: ${why}${sample ? ` — “${sample.slice(0, 90)}”` : ''}`);
};

// Precise garble signatures (avoid false-flagging "next", "example", "31").
const GARBLE = [
  [/\.{3,}/, 'OCR move-number leader (I.....)'],
  // Garble = a piece-letter run ending in a stray lowercase (PQKtz, BKKtz,
  // KKKtr). Legit descriptive (KKt, QKtP, QKt2) ends in t / uppercase / digit.
  [/\b[KQRBN]{2,}[A-Za-z0-9]*[a-su-z]\b/, 'garbled piece-square mash (PQKtz/BKKtz)'],
  [/\([0-9]+\)\.{0,3}\s*[A-Za-z0-9-]+\s*\([0-9]+\)/, 'raw game-score move-list'],
  [/\bP-[KQRBN]\b/, 'descriptive move residue (P-K4)'],
  [/\b[KQRBNP]x[KQRBNP]\b/, 'descriptive capture residue (PxP)'],
  [/produced by John|this etext|e-text of|distributed proofread/i, 'Gutenberg boilerplate leak'],
];

for (const book of books) {
  console.log(`\n=== ${book.bookTitle} (${book.pages.length} pages) ===`);
  // citation
  const c = book.citation;
  if (!c?.rights || !c?.sourceUrl || !c?.edition) flag(book.bookTitle, 'citation', 'incomplete citation');

  let boards = 0, animated = 0, shortPages = 0;
  book.pages.forEach((p, i) => {
    const letters = (p.text.match(/[A-Za-z]/g) || []).length;
    if (letters < 60) { shortPages++; }
    // heading leaked as body (mostly uppercase)?
    const caps = (p.text.match(/[A-Z]/g) || []).length;
    if (letters > 40 && caps / letters > 0.6) flag(book.bookTitle, `p${i + 1}`, 'looks like a heading/index leak', p.text);
    for (const [re, why] of GARBLE) {
      if (re.test(p.text)) { flag(book.bookTitle, `p${i + 1}`, why, p.text.match(re)?.[0] ? p.text.slice(Math.max(0, p.text.search(re) - 30), p.text.search(re) + 40) : p.text); break; }
    }
    if (p.board) {
      boards++;
      // legality + replay
      let game;
      try { game = new Chess(p.board.fen); } catch (e) { flag(book.bookTitle, `p${i + 1}`, `ILLEGAL board FEN: ${e.message}`); return; }
      for (const mv of p.board.moves) {
        const m = (() => { try { return game.move(mv); } catch { return null; } })();
        if (!m) { flag(book.bookTitle, `p${i + 1}`, `board move illegal: ${mv}`); break; }
      }
      if (p.board.moves.length) {
        animated++;
        // degenerate line? (all king moves = likely a mis-extracted shuffle, not a real lesson line)
        const allKing = p.board.moves.every((m) => /^K/.test(m) || /^O-O/.test(m));
        if (allKing && p.board.moves.length >= 4) flag(book.bookTitle, `p${i + 1}`, `suspicious all-king line: ${p.board.moves.join(' ')}`);
      }
    }
  });
  console.log(`  boards: ${boards} | animated: ${animated} | short pages: ${shortPages}`);
}

console.log(`\n${problems === 0 ? '✓ no content problems found' : `✗ ${problems} content problem(s) flagged`}`);
process.exit(problems === 0 ? 0 : 1);
