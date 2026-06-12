// Ingest the ENTIRE "Chess and Checkers: the Way to Mastership" (Edward Lasker,
// 1918, public domain) into a Library book — every chapter read aloud, and EVERY
// printed diagram turned into a LIVE board, auto-extracted from the book's own
// ASCII diagrams + algebraic move lines and chess.js-validated.
//
// The Gutenberg text is born-digital (clean OCR), uses ASCII boards and algebraic
// notation, so positions parse deterministically and every board is verified.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Chess } from 'chess.js';

const SRC_URL = 'https://www.gutenberg.org/cache/epub/4913/pg4913.txt';
const CACHE = 'data/sources/chess-and-checkers-1918.txt';
const OUT = 'src/data/library/chess-and-checkers.json';

async function ensureSource() {
  if (existsSync(CACHE)) return readFileSync(CACHE, 'utf8');
  mkdirSync(dirname(CACHE), { recursive: true });
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`fetch ${SRC_URL} -> ${res.status}`);
  const txt = await res.text();
  writeFileSync(CACHE, txt);
  return txt;
}

// ── ASCII board → FEN ────────────────────────────────────────────────────────
const PIECE = { R: 'r', B: 'b', Q: 'q', K: 'k', P: 'p', Kt: 'n' };
function cellToFen(cell) {
  const t = cell.trim();
  if (!t) return null;
  const black = t.startsWith('#');
  const code = t.replace(/[#^]/g, '');
  const p = PIECE[code];
  if (!p) return null;
  return black ? p : p.toUpperCase();
}
// Returns { fen } if the 8 rank-rows parse into a legal position, else null.
function rowsToFen(rankRows, turn) {
  if (rankRows.length !== 8) return null;
  const ranks = [];
  for (const row of rankRows) {
    const cells = row.split('|').slice(1, 9); // drop leading rank-number, trailing
    if (cells.length < 8) return null;
    let r = '';
    let empty = 0;
    for (let i = 0; i < 8; i++) {
      const fc = cellToFen(cells[i] ?? '');
      if (fc) { if (empty) { r += empty; empty = 0; } r += fc; }
      else empty++;
    }
    if (empty) r += empty;
    ranks.push(r);
  }
  const fen = `${ranks.join('/')} ${turn} - - 0 1`;
  try { new Chess(fen); return fen; } catch { return null; }
}

// ── book move-notation → SAN ─────────────────────────────────────────────────
function toSan(tok) {
  let s = tok.trim().replace(/[.,;]+$/, '');
  if (!s || s === '....' || /^\d+$/.test(s)) return null;
  s = s.replace(/^\(\d+\)/, '').replace(/^\d+\.+/, '').trim();
  s = s.replace(/Kt/g, 'N');
  s = s.replace(/^P-/, '').replace(/^P(?=[a-h]x)/, ''); // P-e4 -> e4, Pxe5 -> xe5(handled)
  s = s.replace(/-/g, ''); // B-b5 -> Bb5, R-e1 -> Re1
  s = s.replace(/^([a-h])x/, '$1x'); // pawn capture keep
  return s;
}
// Extract + validate a line from `fen` out of the text around the diagram.
// Walk tokens; skip leading prose; once moves start, keep the validated run and
// stop at the first token that doesn't fit (so we only ship the real prefix).
function extractMoves(fen, text) {
  const game = new Chess(fen);
  const toks = text.split(/[\s,;]+/);
  const san = [];
  let startedMoves = false;
  for (const tk of toks) {
    if (/^\(?\d+\)?\.*$/.test(tk)) continue; // move numbers like "(1)" / "2."
    const cand = toSan(tk);
    if (!cand) { if (startedMoves) break; else continue; }
    let mv = null;
    try { mv = game.move(cand); } catch { mv = null; }
    if (!mv) { if (startedMoves) break; else continue; }
    startedMoves = true;
    san.push(mv.san);
    if (san.length >= 12) break;
  }
  return san;
}

const raw = await ensureSource();
const lines = raw.split('\n');

// front-matter / license boundaries
let start = lines.findIndex((l) => /START OF (THE|THIS) PROJECT GUTENBERG/i.test(l));
start = start < 0 ? 0 : start + 1;
const end = (() => {
  const i = lines.findIndex((l, idx) => idx > start && /END OF (THE|THIS) PROJECT GUTENBERG/i.test(l));
  return i < 0 ? lines.length : i;
})();

function clean(s) {
  return s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}
const HEAD_RE = /^[A-Z][A-Z .,'’&-]{5,}$/; // ALL-CAPS section/chapter heads

const pages = [];
let heading = 'Chess and Checkers';
let para = [];
let pageParas = [];
let pendingBoard = null;
let pi = 0;

function flushPara() { if (para.length) { pageParas.push(clean(para.join(' '))); para = []; } }
function flushPage() {
  flushPara();
  const text = pageParas.filter(Boolean).join('\n\n');
  if ((text.match(/[A-Za-z]/g) || []).length > 60 || pendingBoard) {
    pages.push({ id: `cc-${pi++}`, heading, text, ...(pendingBoard ? { board: pendingBoard } : {}) });
  }
  pageParas = [];
  pendingBoard = null;
}

for (let i = start; i < end; i++) {
  const line = lines[i];
  const t = line.trim();

  // ASCII board?
  if (/^\+-{10,}\+$/.test(t)) {
    const rankRows = [];
    let j = i + 1;
    for (; j < end; j++) {
      const rt = lines[j].trim();
      if (/^\d\s*\|/.test(rt)) rankRows.push(rt);
      else if (/^\|-+\|$/.test(rt)) continue;
      else break;
    }
    // side to move from preceding context
    const ctx = lines.slice(Math.max(0, i - 12), i).join(' ');
    const turn = /black (to move|plays|to play)|it is black/i.test(ctx) ? 'b'
      : /white (to move|plays|to play)/i.test(ctx) ? 'w' : 'w';
    const fen = rowsToFen(rankRows, turn);
    if (fen) {
      const after = ctx + ' ' + lines.slice(j, j + 18).join(' ');
      const moves = extractMoves(fen, after);
      // close the current page WITH this board as its illustration
      pendingBoard = { fen, moves, orientation: 'white', caption: moves.length ? 'Play through the line' : 'The position' };
      flushPage();
    }
    i = j; // skip past the board + file-letter line
    continue;
  }

  if (!t) { flushPara(); continue; }
  if (HEAD_RE.test(t) && t.split(' ').length <= 7) { flushPage(); heading = clean(t); continue; }
  para.push(t);
}
flushPage();

const book = {
  id: 'edward-lasker-chess-and-checkers',
  bookTitle: 'Chess and Checkers',
  author: 'Edward Lasker',
  citation: {
    edition: 'E. P. Dutton and Company, New York, 1918',
    rights: 'Published 1918. In the public domain.',
    sourceLabel: 'Project Gutenberg (ebook #4913)',
    sourceUrl: 'https://www.gutenberg.org/ebooks/4913',
  },
  pages,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(book, null, 2));
const withBoards = pages.filter((p) => p.board).length;
const animated = pages.filter((p) => p.board && p.board.moves.length).length;
console.log(`Ingested Chess and Checkers -> ${OUT}`);
console.log(`pages: ${pages.length} | live boards: ${withBoards} | animated (with moves): ${animated}`);
