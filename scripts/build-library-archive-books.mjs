// Ingest three more public-domain classics into the Coaches Library, from
// their Internet Archive scans (OCR text), the same way build-library-mysystem
// ingests My System: the book's OWN words, paginated for read-aloud, dense
// move-analysis filtered out of the spoken prose (descriptive notation is
// removed, never converted). Emits one JSON per book into src/data/library/.
//
//   Emanuel Lasker, Common Sense in Chess (lectures given 1895, published
//     1896; this scan is the J. S. Ogilvie, New York, [1910] printing).
//   James Mason, The Art of Chess (1895; this scan is the 1913 David McKay,
//     Philadelphia edition, revised by Leopold Hoffer).
//   W. Steinitz, The Modern Chess Instructor, Part I (G. P. Putnam's Sons,
//     New York, 1889) — the preface and the seven chapters on the game and its
//     principles. The opening tables after them are columns of moves the OCR
//     cannot carry, so they are not reproduced.
//
// Every one was published before 1930, so each is in the public domain in the
// United States; the archive marks all three NOT_IN_COPYRIGHT.
//
//   node scripts/build-library-archive-books.mjs            # all three
//   node scripts/build-library-archive-books.mjs common-sense
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BOOKS = {
  'common-sense': {
    id: 'emanuel-lasker-common-sense-in-chess',
    bookTitle: 'Common Sense in Chess',
    author: 'Emanuel Lasker',
    prefix: 'csc',
    out: 'src/data/library/common-sense-in-chess.json',
    cache: 'data/sources/common-sense-in-chess-1910.txt',
    src: 'https://archive.org/download/commonsenseinche00laskrich/commonsenseinche00laskrich_djvu.txt',
    citation: {
      edition: 'J. S. Ogilvie Publishing Company, New York, [1910] (first published 1896)',
      rights: 'First published 1896. In the public domain.',
      sourceLabel: 'Internet Archive (University of California Libraries)',
      sourceUrl: 'https://archive.org/details/commonsenseinche00laskrich',
    },
    firstHeading: 'Preface',
    start: /^PREFACE\.\s*$/,
    end: /^Th[ke]\s+End,?\s*$|RETURN\s+TO\s+the\s+circulation/,
    // "No. 1." / "No. 4" / "Nos. 7 and 8" / "Nos. 10, 11, 12"
    heading: (t) => {
      const m = t.match(/^Nos?\.\s+([0-9][0-9, and]*?)\.?\s*$/);
      return m ? `Lecture${/,|and/.test(m[1]) ? 's' : ''} ${m[1].replace(/\s+/g, ' ').trim()}` : null;
    },
    runningHead: /^Common\s+\S+ense\s+\S+\s+\S+\.?$/,
  },
  'art-of-chess': {
    id: 'james-mason-the-art-of-chess',
    bookTitle: 'The Art of Chess',
    author: 'James Mason',
    prefix: 'aoc',
    out: 'src/data/library/art-of-chess.json',
    cache: 'data/sources/art-of-chess-1913.txt',
    src: 'https://archive.org/download/artofchess00maso/artofchess00maso_djvu.txt',
    citation: {
      edition: 'David McKay, Philadelphia, 1913 (first published 1895; revised by Leopold Hoffer)',
      rights: 'Published 1913. In the public domain.',
      sourceLabel: 'Internet Archive (Phillips Academy, Oliver Wendell Holmes Library)',
      sourceUrl: 'https://archive.org/details/artofchess00maso',
    },
    firstHeading: 'Method',
    start: /^METHOD\.\s*$/,
    end: /^INDEX\.?\s*$/,
    heading: (t) => {
      if (/^BOOK\s+I\b.*ENDINGS/.test(t)) return 'Book I — The End Game';
      if (/^BOOK\s+(II|n|Il|11)\.?\s*$/.test(t)) return 'Book II — The Middle Game';
      if (/^BOOK\s+III\.?\s*$/.test(t)) return 'Book III — The Opening';
      return null;
    },
    runningHead: /Art\s+of\s+\(?\s*[GCQ]\S*hes|^[(\[]?[GCQ]\S*ontent/i,
    // Book I and II have no sub-headings, so long runs are split into pages.
    pageCap: 6000,
  },
  'modern-chess-instructor': {
    id: 'steinitz-modern-chess-instructor',
    bookTitle: 'The Modern Chess Instructor',
    author: 'W. Steinitz',
    prefix: 'mci',
    out: 'src/data/library/modern-chess-instructor.json',
    cache: 'data/sources/modern-chess-instructor-1889.txt',
    src: 'https://archive.org/download/modernchessinstr00steirich/modernchessinstr00steirich_djvu.txt',
    citation: {
      edition: "G. P. Putnam's Sons, New York and London, 1889 (Part I)",
      rights: 'Published 1889. In the public domain.',
      sourceLabel: 'Internet Archive (University of California Libraries)',
      sourceUrl: 'https://archive.org/details/modernchessinstr00steirich',
    },
    firstHeading: 'Preface',
    start: /^PREFACE\.\s*$/,
    end: /^THE\s+RUY\s+LOPEZ\.\s*$/,
    heading: (t, next) => {
      const m = t.match(/^CHAPTER\s+([IVX]+)\.\s*$/);
      return m ? `Chapter ${m[1]} — ${titleCase(next)}` : null;
    },
    headingTakesNextLine: true,
    runningHead: /^[xvil]+\s+[A-Z][A-Z ,.'-]+\.?\s*$|^[A-Z][A-Z ,.'-]+\.\s+[xvil]+\s*$|^PREFACE\.?\s*[xvil]*\s*$|^[xvil]+\s+PREFACE\.?\s*$/,
  },
};

function titleCase(s) {
  return s
    .trim()
    .replace(/\.$/, '')
    .toLowerCase()
    .replace(/(^|[\s.—-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/(?<!^|\.\s)\b(And|Of|The|To|In|Its|As|A|An)\b/g, (w) => w.toLowerCase());
}

async function ensureSource(cfg) {
  if (existsSync(cfg.cache)) return readFileSync(cfg.cache, 'utf8');
  mkdirSync(dirname(cfg.cache), { recursive: true });
  const res = await fetch(cfg.src);
  if (!res.ok) throw new Error(`fetch ${cfg.src} -> ${res.status}`);
  const txt = await res.text();
  writeFileSync(cfg.cache, txt);
  return txt;
}

// ── cleanup heuristics (the build-library-mysystem set) ──────────────────────
function isNoise(t) {
  if (t.length <= 2) return true;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters / t.length < 0.45) return true;
  if (/^[0-9 .,;:—-]+$/.test(t)) return true;
  return false;
}
function fix(s) {
  let out = s;
  for (const [re, to] of OCR_FIXES) out = out.replace(re, to);
  return out
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/''/g, '"')
    .replace(/([A-Za-z])[-¬]\s+([a-z])/g, '$1$2') // rejoin line-break hyphenation
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([,;])(?=[A-Za-z])/g, '$1 ')
    .trim();
}
function isProse(s) {
  const compact = s.replace(/\s/g, '');
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 14) return false;
  if (letters / Math.max(1, compact.length) < 0.78) return false;
  if (/[A-Za-z]\s?[xX]\s?[A-Z]/.test(s) && /\b(P|Kt|B|R|Q|K)\s?[xX]/.test(s)) return false; // PxP, R x P
  if (/[A-Za-z]*\d[A-Za-z0-9]*\d/.test(s)) return false; // multi-digit garble
  if (/[—–-]\s*(Kt|[KQRBN])\s?[a-z]?\s?\d/.test(s)) return false; // P—K4, Kt — B 3
  if (/\b(P|Kt|B|R|Q|K)\s?[—–-]\s?(Kt|[KQRB]|sq)\b/.test(s)) return false; // K — Q sq
  if (/\bK[A-Z]{1,2}[0-9P]|\bQ[A-Z][0-9P]|\bP\d/.test(s)) return false; // KB3, QKtP, P4
  if (/\.{3,}/.test(s)) return false; // move-number leaders
  if (/\b[KQRBN]{2,}[A-Za-z0-9]*[a-su-z]\b/.test(s)) return false;
  if (isGarbled(s)) return false;
  return true;
}
// OCR garble the eye can see but no rule can repair without guessing: a symbol
// or digit inside a word, a capital in the middle of one, letters glued by a
// full stop. Such a sentence is DROPPED, never "corrected" into words the book
// may not have printed.
function isGarbled(s) {
  for (const tok of s.split(/\s+/)) {
    const core = tok.replace(/^[("'[—-]+|[)\]"',.;:!?—-]+$/g, '');
    if (!core || /^(i\.e|e\.g|viz|&c)$/i.test(core)) continue;
    if (/^[KQ]?(R|B|Kt|K|Q)?[1-8]$/.test(core)) continue; // a square: Kt5, QB4
    if (/[^A-Za-z'’-]/.test(core)) return true;
    if (/[a-z][A-Z]/.test(core) && !/^Mc[A-Z]/.test(core)) return true;
  }
  return /[{}<>^*|\\~_°™®»«■•©£€]/.test(s);
}
// Single-word OCR misreads whose printed word is unambiguous. Anything less
// certain is left to the garble filter above.
const OCR_FIXES = [
  [/\bestabhshed\b/g, 'established'], [/\bdifftring\b/g, 'differing'], [/\bliis\b/g, 'his'],
  [/\bLis\b/g, 'his'], [/\bwitb\b/g, 'with'], [/\bihe\b/g, 'the'], [/\bhke\b/g, 'like'],
  [/\bfollwing\b/g, 'following'], [/\bvariitions\b/g, 'variations'], [/\bTlie\b/g, 'The'],
  [/\btninkers\b/g, 'thinkers'], [/\bthereoretical\b/g, 'theoretical'], [/\bTliis\b/g, 'This'],
  [/\bwbicli\b/g, 'which'], [/\bsuoh\b/g, 'such'], [/\bWliat\b/g, 'What'], [/\btiie\b/g, 'the'],
  [/\bplaver\b/g, 'player'], [/\bverv\b/g, 'very'], [/\bnaturallv\b/g, 'naturally'],
  [/\bfairlv\b/g, 'fairly'], [/\bearlv\b/g, 'early'], [/\bKniglit\b/g, 'Knight'],
  [/\bKirg\b/g, 'King'], [/\bRishop\b/g, 'Bishop'], [/\bwrhen\b/g, 'when'], [/\btwro\b/g, 'two'],
  [/\bwrith\b/g, 'with'], [/\bBlaok's\b/g, "Black's"], [/\bmatohes\b/g, 'matches'],
  [/\bothor\b/g, 'other'], [/\bchaiacter\b/g, 'character'], [/\bpossihle\b/g, 'possible'],
  [/\bproj\)erly\b/g, 'properly'], [/\bthoroxighly\b/g, 'thoroughly'], [/\binnumberasmuch as wascompatible\b/g, 'in number as much as was compatible'],
  [/\bdosome\b/g, 'do some'], [/\bfivemoves\b/g, 'five moves'], [/\bfourmoves\b/g, 'four moves'],
  [/\bbeingboth\b/g, 'being both'], [/\bnothingof\b/g, 'nothing of'], [/\battackingthe\b/g, 'attacking the'],
  [/\btoimmediately\b/g, 'to immediately'], [/\bKnighthaving\b/g, 'Knight having'], [/\bheavypiece\b/g, 'heavy piece'],
  [/\blimitsof\b/g, 'limits of'], [/\bonthe\b/g, 'on the'], [/\bunsouudness\b/g, 'unsoundness'],
  [/\blesistance\b/g, 'resistance'], [/\bpressuro\b/g, 'pressure'], [/\bfuturo\b/g, 'future'],
  [/\bdiscpveries\b/g, 'discoveries'], [/\bsufiicient\b/g, 'sufficient'], [/\bpropertion\b/g, 'proportion'],
  [/\bWeakenesses\b/g, 'Weaknesses'], [/\bpoinls\b/g, 'points'], [/\bforsee\b/g, 'foresee'],
  [/\bpositon\b/g, 'position'], [/\bopportunites\b/g, 'opportunities'], [/\bknowlege\b/g, 'knowledge'],
  [/\bsacrified\b/g, 'sacrificed'], [/\(d\) Attacking/g, '(b) Attacking'], [/\bScotcb\b/g, 'Scotch'], [/\bGamhit\b/g, 'Gambit'],
];
function proseOnly(text) {
  return text
    .split('\n\n')
    .map((para) => para.split(/(?<=[.!?])(?<!\b\d{1,2}\.)\s+/).filter(isProse).join(' ').trim())
    .filter((p) => (p.match(/[A-Za-z]/g) || []).length > 40)
    .join('\n\n');
}

async function build(key) {
  const cfg = BOOKS[key];
  const lines = (await ensureSource(cfg)).split('\n');
  let start = lines.findIndex((l) => cfg.start.test(l.replace(/\s+/g, ' ').trim()));
  if (start < 0) throw new Error(`${key}: start marker not found`);
  start += 1;

  let heading = cfg.firstHeading;
  const paragraphs = []; // { heading, text }
  let buf = [];
  const flush = () => {
    const text = fix(buf.join(' '));
    if (/[A-Za-z]/.test(text)) paragraphs.push({ heading, text });
    buf = [];
  };
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].replace(/\s+/g, ' ').trim();
    if (i > start && cfg.end.test(t)) break;
    let next = '';
    for (let j = i + 1; j < lines.length && !next; j++) next = lines[j].replace(/\s+/g, ' ').trim();
    const h = cfg.heading(t, next);
    if (h) {
      flush();
      heading = h;
      if (cfg.headingTakesNextLine) {
        while (i + 1 < lines.length && lines[i + 1].trim() === '') i++;
        i++; // the chapter title line
      }
      continue;
    }
    if (!t) { flush(); continue; }
    if (cfg.runningHead.test(t) || isNoise(t)) continue;
    buf.push(t);
  }
  flush();

  // A page break inside a paragraph leaves it split in two: rejoin a paragraph
  // that does not end a sentence with the next one under the same heading.
  const joined = [];
  for (const p of paragraphs) {
    const prev = joined[joined.length - 1];
    if (prev && prev.heading === p.heading && !/[.!?:"')]$/.test(prev.text)) {
      prev.text = fix(`${prev.text} ${p.text}`);
    } else joined.push({ ...p });
  }

  const cleaned = joined
    .filter((p) => (p.text.match(/[A-Za-z]/g) || []).length > 20)
    .map((p) => ({ heading: p.heading, text: proseOnly(p.text) }))
    .filter((p) => p.text);

  // Paginate: one page per heading, split at paragraph bounds past the cap.
  const cap = cfg.pageCap ?? Infinity;
  const pages = [];
  let cur = null;
  let part = 1;
  const push = () => {
    if (cur && cur.paras.length) {
      pages.push({ id: `${cfg.prefix}-${pages.length}`, heading: cur.heading, text: cur.paras.join('\n\n') });
    }
  };
  for (const p of cleaned) {
    const size = cur ? cur.paras.join('\n\n').length : 0;
    if (!cur || cur.base !== p.heading || size + p.text.length > cap) {
      push();
      part = cur && cur.base === p.heading ? part + 1 : 1;
      cur = { base: p.heading, heading: part > 1 ? `${p.heading} (${part})` : p.heading, paras: [] };
    }
    cur.paras.push(p.text);
  }
  push();
  const kept = pages.filter((pg) => (pg.text.match(/[A-Za-z]/g) || []).length > 60);
  kept.forEach((pg, i) => { pg.id = `${cfg.prefix}-${i}`; });

  const book = { id: cfg.id, bookTitle: cfg.bookTitle, author: cfg.author, citation: cfg.citation, pages: kept };
  mkdirSync(dirname(cfg.out), { recursive: true });
  writeFileSync(cfg.out, JSON.stringify(book, null, 2) + '\n');
  const chars = kept.reduce((n, p) => n + p.text.length, 0);
  console.log(`${cfg.bookTitle}: ${kept.length} pages, ${chars} chars -> ${cfg.out}`);
}

const which = process.argv[2] ? [process.argv[2]] : Object.keys(BOOKS);
for (const key of which) await build(key);
