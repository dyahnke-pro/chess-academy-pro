#!/usr/bin/env node
/**
 * Parses the 7 fetched Project Gutenberg chess books into a
 * structured concept index. Output bundles into:
 *
 *   src/data/chess-concepts.json
 *
 * Feeds BOTH:
 *   1. Static annotation cards on opening / endgame pages
 *   2. Coach grounding pipeline (system-prompt injection per opening)
 *
 * Pipeline per book:
 *   1. Strip Gutenberg header (everything before *** START OF ... ***)
 *      and footer (everything after *** END OF ... ***).
 *   2. Detect chapter / section headings (book-specific patterns).
 *   3. Split into paragraphs.
 *   4. Tag each paragraph with concept IDs via keyword matching.
 *   5. Tag with opening IDs (Italian Game, Ruy Lopez, etc.) when named.
 *   6. Score each tagged passage — instructional density, length.
 *
 * Concepts taxonomy lives below as a giant keyword→conceptId map.
 * Pre-1929 books use old descriptive notation ("K - K 4" = Ke4) so
 * the parser doesn't try to extract moves — only PROSE narration.
 */

import { readFile, writeFile } from 'node:fs/promises';

const RAW_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';
const OUT_PATH = 'src/data/chess-concepts.json';

// ============================================================
// CONCEPT TAXONOMY — keyword → conceptId
// ============================================================
// Each concept has a canonical id, name, type, and a list of phrases
// that should trigger tagging. Phrases match case-insensitive on
// word boundaries. Order matters for overlapping matches — more
// specific phrases come first.

const CONCEPTS = [
  // PAWN STRUCTURES
  { id: 'pawn-isolated', name: 'Isolated pawn (IQP)', type: 'pawn-structure', phrases: ['isolated pawn', 'isolated queen pawn', 'IQP', 'isolated d-pawn'] },
  { id: 'pawn-doubled', name: 'Doubled pawns', type: 'pawn-structure', phrases: ['doubled pawn', 'doubled pawns'] },
  { id: 'pawn-passed', name: 'Passed pawn', type: 'pawn-structure', phrases: ['passed pawn', 'passed pawns', 'passing pawn'] },
  { id: 'pawn-backward', name: 'Backward pawn', type: 'pawn-structure', phrases: ['backward pawn', 'backward pawns'] },
  { id: 'pawn-hanging', name: 'Hanging pawns', type: 'pawn-structure', phrases: ['hanging pawns'] },
  { id: 'pawn-chain', name: 'Pawn chain', type: 'pawn-structure', phrases: ['pawn chain', 'chain of pawns', 'pawn-chain'] },
  { id: 'pawn-majority', name: 'Pawn majority', type: 'pawn-structure', phrases: ['pawn majority', 'queenside majority', 'kingside majority'] },
  { id: 'pawn-minority-attack', name: 'Minority attack', type: 'plan', phrases: ['minority attack'] },
  { id: 'pawn-fianchetto', name: 'Fianchetto', type: 'pawn-structure', phrases: ['fianchetto', 'fianchettoed bishop'] },

  // ENDGAME — PRINCIPLES
  { id: 'end-opposition', name: 'Opposition', type: 'endgame', phrases: ['the opposition', 'distant opposition', 'direct opposition', 'taking the opposition'] },
  { id: 'end-triangulation', name: 'Triangulation', type: 'endgame', phrases: ['triangulation', 'triangulate'] },
  { id: 'end-zugzwang', name: 'Zugzwang', type: 'endgame', phrases: ['zugzwang'] },
  { id: 'end-key-squares', name: 'Key squares', type: 'endgame', phrases: ['key square', 'key squares', 'critical squares'] },

  // ENDGAME — NAMED POSITIONS
  { id: 'end-lucena', name: 'Lucena position', type: 'endgame', phrases: ['Lucena position', 'Lucena'] },
  { id: 'end-philidor', name: 'Philidor position', type: 'endgame', phrases: ['Philidor position', 'Philidor defence in the endgame'] },
  { id: 'end-vancura', name: 'Vancura position', type: 'endgame', phrases: ['Vancura', 'Vancura position'] },
  { id: 'end-rook-7th', name: 'Rook on the seventh', type: 'endgame', phrases: ['rook on the seventh', 'seventh rank', 'pigs on the seventh', 'rook on the 7th'] },
  { id: 'end-two-bishops', name: 'Two bishops endgame', type: 'endgame', phrases: ['two bishops', 'bishop pair endgame'] },
  { id: 'end-bishop-vs-knight', name: 'Bishop vs Knight', type: 'endgame', phrases: ['bishop and knight', 'knight against bishop', 'relative value of knight and bishop', 'knight versus bishop', 'bishop versus knight'] },
  { id: 'end-mate-bn', name: 'Mate with Bishop + Knight', type: 'endgame', phrases: ['mate with a knight and a bishop', 'bishop and knight mate', 'bishop knight checkmate'] },
  { id: 'end-mate-q-vs-r', name: 'Queen vs Rook', type: 'endgame', phrases: ['queen against rook', 'queen versus rook'] },

  // MATING PATTERNS
  { id: 'mate-anastasia', name: "Anastasia's mate", type: 'mating-pattern', phrases: ["Anastasia's mate", "Anastasia mate"] },
  { id: 'mate-boden', name: "Boden's mate", type: 'mating-pattern', phrases: ["Boden's mate", "Boden mate"] },
  { id: 'mate-damiano', name: "Damiano's mate", type: 'mating-pattern', phrases: ["Damiano's mate"] },
  { id: 'mate-legal', name: "Légal's mate", type: 'mating-pattern', phrases: ["Légal's mate", "Legal's mate"] },
  { id: 'mate-smothered', name: 'Smothered mate', type: 'mating-pattern', phrases: ['smothered mate'] },
  { id: 'mate-back-rank', name: 'Back-rank mate', type: 'mating-pattern', phrases: ['back-rank mate', 'back rank mate'] },
  { id: 'mate-scholars', name: "Scholar's mate", type: 'mating-pattern', phrases: ["Scholar's mate", "Scholars mate"] },

  // TACTICAL THEMES
  { id: 'tac-fork', name: 'Fork', type: 'tactic', phrases: ['fork', 'forking', 'knight fork', 'royal fork'] },
  { id: 'tac-pin', name: 'Pin', type: 'tactic', phrases: ['pin', 'pinned piece', 'absolute pin'] },
  { id: 'tac-skewer', name: 'Skewer', type: 'tactic', phrases: ['skewer'] },
  { id: 'tac-discovered', name: 'Discovered attack', type: 'tactic', phrases: ['discovered attack', 'discovered check', 'discovered'] },
  { id: 'tac-double-attack', name: 'Double attack', type: 'tactic', phrases: ['double attack', 'double threat'] },
  { id: 'tac-deflection', name: 'Deflection', type: 'tactic', phrases: ['deflection', 'deflecting'] },
  { id: 'tac-decoy', name: 'Decoy / attraction', type: 'tactic', phrases: ['decoy', 'attraction', 'lure'] },
  { id: 'tac-overloaded', name: 'Overloaded piece', type: 'tactic', phrases: ['overloaded', 'overworked piece'] },
  { id: 'tac-xray', name: 'X-ray attack', type: 'tactic', phrases: ['X-ray', 'X-ray attack'] },
  { id: 'tac-zwischen', name: 'Zwischenzug / intermezzo', type: 'tactic', phrases: ['zwischenzug', 'intermezzo', 'in-between move'] },
  { id: 'tac-sacrifice', name: 'Sacrifice', type: 'tactic', phrases: ['sacrifice', 'sacrificed', 'sacrificing'] },
  { id: 'tac-trap', name: 'Opening trap', type: 'tactic', phrases: ['opening trap', 'trap in the opening', 'a trap'] },

  // POSITIONAL CONCEPTS
  { id: 'pos-center', name: 'Control of the centre', type: 'positional', phrases: ['control of the centre', 'control of the center', 'centre control', 'central control'] },
  { id: 'pos-centralization', name: 'Centralization', type: 'positional', phrases: ['centralization', 'centralisation', 'centralize', 'centralise'] },
  { id: 'pos-development', name: 'Piece development', type: 'positional', phrases: ['development of pieces', 'piece development', 'developing the pieces', 'rapid development'] },
  { id: 'pos-king-safety', name: 'King safety', type: 'positional', phrases: ['king safety', 'safety of the king', 'castle', 'castling'] },
  { id: 'pos-initiative', name: 'The Initiative', type: 'positional', phrases: ['initiative', 'the initiative', 'seize the initiative'] },
  { id: 'pos-tempo', name: 'Tempo', type: 'positional', phrases: ['tempo', 'gain of tempo', 'tempi', 'gain a tempo'] },
  { id: 'pos-open-file', name: 'Open file', type: 'positional', phrases: ['open file', 'half-open file', 'semi-open file'] },
  { id: 'pos-outpost', name: 'Outpost', type: 'positional', phrases: ['outpost', 'knight outpost'] },
  { id: 'pos-weak-squares', name: 'Weak squares', type: 'positional', phrases: ['weak square', 'weak squares', 'hole'] },
  { id: 'pos-bishop-pair', name: 'Bishop pair', type: 'positional', phrases: ['bishop pair', 'two bishops advantage', 'pair of bishops'] },
  { id: 'pos-prophylaxis', name: 'Prophylaxis', type: 'positional', phrases: ['prophylaxis', 'prophylactic'] },
  { id: 'pos-space', name: 'Space advantage', type: 'positional', phrases: ['space advantage', 'spatial advantage', 'gain space'] },

  // ATTACKING THEMES
  { id: 'att-kingside-storm', name: 'Kingside storm', type: 'plan', phrases: ['kingside storm', 'pawn storm', 'attack on the king', 'kingside attack'] },
  { id: 'att-queenside-attack', name: 'Queenside attack', type: 'plan', phrases: ['queenside attack', 'queenside expansion'] },
  { id: 'att-exchange-sac', name: 'Exchange sacrifice', type: 'plan', phrases: ['exchange sacrifice', 'sacrificed the exchange'] },
  { id: 'att-greek-gift', name: 'Greek gift (Bxh7+)', type: 'plan', phrases: ['Greek gift', 'Bxh7', 'Bxh7+', 'bishop sacrifice on h7'] },
];

// ============================================================
// OPENING TAXONOMY — keyword → openingId
// ============================================================

const OPENINGS = [
  { id: 'italian-game', phrases: ['Italian Game', 'Giuoco Piano', 'Giuoco Pianissimo'] },
  { id: 'ruy-lopez', phrases: ['Ruy Lopez', 'Spanish Game', 'Spanish opening', 'Morphy Defence', 'Berlin Defence'] },
  { id: 'two-knights-defence', phrases: ["Two Knights' Defence", 'Two Knights Defence', 'Two Knights'] },
  { id: 'evans-gambit', phrases: ['Evans Gambit'] },
  { id: 'scotch-game', phrases: ['Scotch Game', 'Scotch Opening'] },
  { id: 'vienna-game', phrases: ['Vienna Game', 'Vienna Opening'] },
  { id: 'kings-gambit', phrases: ["King's Gambit", 'Kings Gambit'] },
  { id: 'four-knights-game', phrases: ['Four Knights'] },
  { id: 'philidor-defence', phrases: ["Philidor's Defence", 'Philidor Defence'] },
  { id: 'petrov-defence', phrases: ['Petroff', 'Petrov', "Russian Defence"] },
  { id: 'french-defence', phrases: ['French Defence', 'French Opening', "French Game"] },
  { id: 'caro-kann', phrases: ['Caro-Kann', 'Caro Kann'] },
  { id: 'sicilian-najdorf', phrases: ['Najdorf', 'Sicilian Najdorf'] },
  { id: 'sicilian-dragon', phrases: ['Dragon Variation', 'Sicilian Dragon'] },
  { id: 'sicilian-sveshnikov', phrases: ['Sveshnikov', 'Lasker-Pelikan'] },
  { id: 'sicilian-alapin', phrases: ['Sicilian Alapin', 'Alapin Sicilian'] },
  { id: 'scandinavian-defence', phrases: ['Scandinavian Defence', 'Center Counter', 'Centre Counter'] },
  { id: 'alekhine-defence', phrases: ["Alekhine's Defence", 'Alekhine Defence'] },
  { id: 'pirc-defence', phrases: ["Pirc Defence", 'Pirc-Ufimtsev'] },
  { id: 'queens-gambit', phrases: ["Queen's Gambit"] },
  { id: 'qgd', phrases: ["Queen's Gambit Declined", 'QGD', 'Orthodox Defence', 'Tarrasch Defence'] },
  { id: 'qga', phrases: ["Queen's Gambit Accepted", 'QGA'] },
  { id: 'slav-defence', phrases: ['Slav Defence', 'Slav Opening'] },
  { id: 'semi-slav', phrases: ['Semi-Slav', 'Meran'] },
  { id: 'london-system', phrases: ['London System', 'London Variation'] },
  { id: 'catalan-opening', phrases: ['Catalan Opening', 'Catalan System'] },
  { id: 'trompowsky-attack', phrases: ['Trompowsky', 'Trompovsky'] },
  { id: 'kings-indian-defence', phrases: ["King's Indian Defence", "King's Indian"] },
  { id: 'nimzo-indian', phrases: ['Nimzo-Indian', 'Nimzowitsch Defence (Indian)'] },
  { id: 'grunfeld-defence', phrases: ['Grünfeld', 'Grunfeld'] },
  { id: 'dutch-defence', phrases: ['Dutch Defence', 'Dutch Opening', 'Stonewall Dutch'] },
  { id: 'benoni-defence', phrases: ['Benoni'] },
  { id: 'benko-gambit', phrases: ['Benko Gambit', 'Volga Gambit'] },
  { id: 'queens-indian', phrases: ["Queen's Indian"] },
  { id: 'budapest-gambit', phrases: ['Budapest Gambit', 'Budapest Defence'] },
  { id: 'old-indian-defence', phrases: ['Old Indian'] },
  { id: 'english-opening', phrases: ['English Opening', 'English Game'] },
  { id: 'reti-opening', phrases: ['Reti Opening', "Réti's Opening", 'Zukertort'] },
  { id: 'kings-indian-attack', phrases: ["King's Indian Attack", 'KIA'] },
  { id: 'birds-opening', phrases: ["Bird's Opening", 'Bird Opening'] },
];

// ============================================================
// BOOK MANIFEST + PARSER
// ============================================================

const BOOKS = JSON.parse(
  await readFile(`${RAW_DIR}/manifest.json`, 'utf-8')
).books.filter(b => b.status === 'fetched');

function stripGutenberg(text) {
  // Gutenberg header / footer markers
  const startRe = /\*\*\*\s*START OF (?:THE\s+)?(?:PROJECT GUTENBERG )?(?:E[BO]+OOK).*?\*\*\*/i;
  const endRe = /\*\*\*\s*END OF (?:THE\s+)?(?:PROJECT GUTENBERG )?(?:E[BO]+OOK).*?\*\*\*/i;
  const sm = text.match(startRe);
  const em = text.match(endRe);
  let body = text;
  if (sm) body = body.slice(sm.index + sm[0].length);
  if (em) {
    const idx = body.search(endRe);
    if (idx >= 0) body = body.slice(0, idx);
  }
  return body.trim();
}

function splitParagraphs(body) {
  // Blank line separator
  return body
    .split(/\n\s*\n+/)
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => p.length > 0);
}

function detectHeading(p) {
  // Numbered section: "1. SOME SIMPLE MATES"
  let m = p.match(/^(\d+)\.\s+([A-Z][A-Z\s\-,'":;_]{4,80})$/);
  if (m) return { kind: 'section', number: parseInt(m[1], 10), title: m[2].trim() };
  // CHAPTER I, CHAPTER II
  m = p.match(/^CHAPTER\s+([IVXLC]+|\d+)\s*$/i);
  if (m) return { kind: 'chapter', label: m[1] };
  // Plain ALL-CAPS heading (5+ chars, short paragraph)
  if (p.length < 80 && /^[A-Z][A-Z\s\-,'":;_]+$/.test(p) && p.split(' ').length <= 12) {
    return { kind: 'heading', title: p };
  }
  return null;
}

function tagConcepts(text) {
  const lo = text.toLowerCase();
  const hit = [];
  for (const c of CONCEPTS) {
    for (const phrase of c.phrases) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        hit.push(c.id);
        break;
      }
    }
  }
  return [...new Set(hit)];
}

function tagOpenings(text) {
  const hit = [];
  for (const o of OPENINGS) {
    for (const phrase of o.phrases) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) {
        hit.push(o.id);
        break;
      }
    }
  }
  return [...new Set(hit)];
}

function isInstructional(text) {
  if (text.length < 80) return false;
  if (/^[A-Z\s\-,'":;_\d]+$/.test(text)) return false;
  if (/^\[Illustration/.test(text)) return false;
  if (/^\[Footnote/i.test(text)) return false;
  if (/^Page\s+\d+/.test(text)) return false;
  // Mostly old-notation moves? "K - K 4, K - Q 5 ..."
  const moveTokens = (text.match(/\b[KQRBN]\s*-\s*[KQR]?\s*[KQRBN]?\s*\d/g) || []).length;
  const totalWords = text.split(/\s+/).length;
  if (moveTokens > 0 && moveTokens / totalWords > 0.2) return false;
  return true;
}

const BOOK_PREFERENCE = {
  'capablanca-chess-fundamentals': 10,
  'edward-lasker-chess-strategy': 8,
  'edward-lasker-chess-and-checkers': 7,
  'staunton-blue-book-of-chess': 5,
  'young-chess-generalship': 4,
  'edge-paul-morphy-exploits': 3,
  'bird-chess-history-reminiscences': 2,
};

function passageQuality(p, conceptId, conceptName) {
  let score = 0;
  // Source book preference (Capablanca > Lasker > others)
  score += BOOK_PREFERENCE[p.bookSlug] || 0;
  // Section title matches the concept name (strong signal)
  const section = (p.section || '').toLowerCase();
  const conceptKey = (conceptName || conceptId).toLowerCase().split(/[\s\-/(]/)[0];
  if (section && conceptKey && section.includes(conceptKey)) score += 20;
  // Natural sentence start: capital letter, not conjunction
  if (/^[A-Z][a-z]/.test(p.text)) score += 5;
  if (/^(takes|gives|moves|the|a|by|with|when|if|whilst)/i.test(p.text.split(' ')[0])) score -= 3;
  // Tournament-list / game-summary noise
  if (/No\. \d+|^\d+ moves|tame draw|in \d+ moves/i.test(p.text.slice(0, 80))) score -= 10;
  // Length sweet spot (60-150 words = instructional density)
  if (p.wordCount >= 60 && p.wordCount <= 200) score += 5;
  else if (p.wordCount < 40) score -= 5;
  // Has a chess concept named (more than just one keyword hit)
  if (p.concepts.length >= 2) score += 3;
  // Penalize move-heavy paragraphs
  const moveTokens = (p.text.match(/\b[KQRBN]\s*-\s*[KQR]?\s*[KQRBN]?\s*\d/g) || []).length;
  score -= moveTokens;
  return score;
}

async function parseBook(book) {
  console.log(`\n[${book.slug}] ${book.title}`);
  const raw = await readFile(`${RAW_DIR}/${book.path}`, 'utf-8');
  const body = stripGutenberg(raw);
  const paragraphs = splitParagraphs(body);
  console.log(`  ${paragraphs.length} paragraphs after strip`);

  const passages = [];
  let currentChapter = null;
  let currentSection = null;
  for (const p of paragraphs) {
    const h = detectHeading(p);
    if (h?.kind === 'chapter') { currentChapter = h.label; continue; }
    if (h?.kind === 'section') { currentSection = h.title; continue; }
    if (h?.kind === 'heading') { currentSection = h.title; continue; }
    if (!isInstructional(p)) continue;
    const concepts = tagConcepts(p);
    const openings = tagOpenings(p);
    if (concepts.length === 0 && openings.length === 0) continue;
    passages.push({
      bookSlug: book.slug,
      bookTitle: book.title,
      author: book.authors,
      gutenbergId: book.gutenbergId,
      chapter: currentChapter,
      section: currentSection,
      concepts,
      openings,
      text: p,
      wordCount: p.split(/\s+/).length,
    });
  }
  console.log(`  ${passages.length} tagged passages`);
  return passages;
}

async function main() {
  const allPassages = [];
  for (const book of BOOKS) {
    const passages = await parseBook(book);
    allPassages.push(...passages);
  }
  console.log(`\n=== TOTAL: ${allPassages.length} tagged passages ===\n`);

  // Build concept index: conceptId → top N passages
  const byConcept = {};
  for (const p of allPassages) {
    for (const c of p.concepts) {
      if (!byConcept[c]) byConcept[c] = [];
      byConcept[c].push(p);
    }
  }
  console.log('passages per concept (top 15):');
  Object.entries(byConcept)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .forEach(([c, ps]) => console.log(`  ${c.padEnd(28)} ${ps.length}`));

  // Build opening index
  const byOpening = {};
  for (const p of allPassages) {
    for (const o of p.openings) {
      if (!byOpening[o]) byOpening[o] = [];
      byOpening[o].push(p);
    }
  }
  console.log('\npassages per opening (top 15):');
  Object.entries(byOpening)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .forEach(([o, ps]) => console.log(`  ${o.padEnd(28)} ${ps.length}`));

  // For each concept, pick the BEST passage per source book — shortest
  // that still names the concept, prefer instruction-only. Cap output
  // to 3 sources × concept.
  const concepts = CONCEPTS.map(c => {
    const ps = byConcept[c.id] || [];
    // Score each passage on quality, then pick the best per source book.
    const sorted = ps
      .filter(p => p.wordCount >= 30 && p.wordCount <= 350)
      .map(p => ({ ...p, _score: passageQuality(p, c.id, c.name) }))
      .sort((a, b) => b._score - a._score);
    const out = [];
    const seenBooks = new Set();
    for (const p of sorted) {
      if (seenBooks.has(p.bookSlug)) continue;
      seenBooks.add(p.bookSlug);
      out.push({
        bookSlug: p.bookSlug,
        bookTitle: p.bookTitle,
        author: p.author,
        gutenbergId: p.gutenbergId,
        chapter: p.chapter,
        section: p.section,
        text: p.text,
        wordCount: p.wordCount,
      });
      if (out.length >= 3) break;
    }
    return { ...c, passages: out };
  });

  const openingPassages = {};
  for (const [oid, ps] of Object.entries(byOpening)) {
    const sorted = ps
      .filter(p => p.wordCount >= 30 && p.wordCount <= 350)
      .map(p => ({ ...p, _score: passageQuality(p, oid, oid.replace(/-/g, ' ')) }))
      .sort((a, b) => b._score - a._score);
    const out = [];
    const seenBooks = new Set();
    for (const p of sorted) {
      if (seenBooks.has(p.bookSlug)) continue;
      seenBooks.add(p.bookSlug);
      out.push({
        bookSlug: p.bookSlug,
        bookTitle: p.bookTitle,
        author: p.author,
        gutenbergId: p.gutenbergId,
        chapter: p.chapter,
        section: p.section,
        text: p.text,
        concepts: p.concepts,
        wordCount: p.wordCount,
      });
      if (out.length >= 3) break;
    }
    openingPassages[oid] = out;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    sources: BOOKS.map(b => ({
      slug: b.slug,
      gutenbergId: b.gutenbergId,
      title: b.title,
      author: b.authors,
    })),
    concepts,
    openings: openingPassages,
    totalTaggedPassages: allPassages.length,
  };
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nwrote ${OUT_PATH}`);
  console.log(`concepts with ≥1 passage: ${concepts.filter(c => c.passages.length).length} / ${CONCEPTS.length}`);
  console.log(`openings with ≥1 passage: ${Object.values(openingPassages).filter(v => v.length).length} / ${OPENINGS.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
