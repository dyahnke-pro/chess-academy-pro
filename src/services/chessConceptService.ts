import conceptsData from '../data/chess-concepts.json';

/**
 * Wired surface: book-passage grounding for narration + coach chat.
 *
 * `src/data/chess-concepts.json` carries 664 tagged passages from 7
 * public-domain chess classics (Capablanca, Lasker × 2, Staunton,
 * Young, Edge, Bird — all from Project Gutenberg). Passages are
 * tagged to:
 *   - one or more conceptIds  (56-entry taxonomy: pawn structures,
 *     endgame patterns, tactical themes, positional concepts, etc.)
 *   - zero or more openingIds (40-entry taxonomy: main openings,
 *     keyed by canonical name)
 *
 * 25/56 concepts have ≥1 book passage; the remaining 31 are modern
 * named patterns (Lucena, Vancura, Anastasia's mate, minority attack,
 * etc.) that didn't appear in pre-1929 books and instead carry a
 * static one-sentence definition. Either way every conceptId resolves.
 *
 * This service is the ONLY consumer of `chess-concepts.json`. Callers:
 *   - `openingGenerator.generateOpeningFromDbNarration`: injects
 *     opening + concept passages into the per-opening narration prompt
 *     so Capablanca/Lasker prose grounds the per-move ideas.
 *   - `coachApi.getCoachChatResponse`: injects passages relevant to
 *     the current opening/concept into the system prompt so chat turns
 *     don't invent stock prose.
 */

export interface BookPassage {
  bookSlug: string;
  bookTitle: string;
  author: string;
  gutenbergId: number;
  chapter: string | null;
  section: string | null;
  text: string;
  wordCount: number;
  concepts?: string[];
}

export interface ConceptEntry {
  id: string;
  name: string;
  type: string;
  phrases: string[];
  passages: BookPassage[];
  fallbackDefinition?: string;
  fallbackKind?: 'modern-definition';
}

export interface OpeningDefinition {
  description: string;
  character: string | null;
  keyIdeas: string[];
  /** Optional source URL (Wikipedia link, etc.) — present when the
   *  description was fetched from an external CC source. */
  sourceUrl?: string;
  /** Required attribution string for CC-licensed sources. e.g.
   *  "CC BY-SA 4.0 — Wikipedia". */
  sourceAttribution?: string;
}

interface ConceptsBundle {
  generatedAt: string;
  sources: { slug: string; gutenbergId: number; title: string; author: string }[];
  concepts: ConceptEntry[];
  openings: Record<string, BookPassage[]>;
  openingDefinitions?: Record<string, OpeningDefinition>;
  totalTaggedPassages: number;
}

const DATA: ConceptsBundle = conceptsData as unknown as ConceptsBundle;

// Canonical name → openingId mapping. Keep in sync with the OPENINGS
// table in `scripts/parse-chess-books.mjs`. Each entry lists the
// substrings (case-insensitive) we accept for that opening.
const OPENING_NAME_MAP: { id: string; patterns: RegExp[] }[] = [
  { id: 'italian-game', patterns: [/italian game/i, /giuoco/i] },
  { id: 'ruy-lopez', patterns: [/ruy lopez/i, /spanish (?:game|opening)/i, /berlin defen[sc]e/i, /morphy defen[sc]e/i] },
  { id: 'two-knights-defence', patterns: [/two knights/i] },
  { id: 'evans-gambit', patterns: [/evans gambit/i] },
  { id: 'scotch-game', patterns: [/scotch (?:game|opening)/i] },
  { id: 'vienna-game', patterns: [/vienna/i] },
  { id: 'kings-gambit', patterns: [/king'?s gambit/i] },
  { id: 'four-knights-game', patterns: [/four knights/i] },
  { id: 'philidor-defence', patterns: [/philidor/i] },
  { id: 'petrov-defence', patterns: [/petroff/i, /petrov/i, /russian defen[sc]e/i] },
  { id: 'french-defence', patterns: [/french defen[sc]e/i, /french opening/i, /french game/i] },
  { id: 'caro-kann', patterns: [/caro[-\s]kann/i] },
  { id: 'sicilian-najdorf', patterns: [/najdorf/i] },
  { id: 'sicilian-dragon', patterns: [/sicilian.*dragon/i, /dragon variation/i] },
  { id: 'sicilian-sveshnikov', patterns: [/sveshnikov/i, /lasker[-\s]pelikan/i] },
  { id: 'sicilian-alapin', patterns: [/sicilian.*alapin/i, /alapin/i] },
  { id: 'scandinavian-defence', patterns: [/scandinavian/i, /cent[er]e counter/i] },
  { id: 'alekhine-defence', patterns: [/alekhine/i] },
  { id: 'pirc-defence', patterns: [/pirc/i] },
  { id: 'queens-gambit', patterns: [/queen'?s gambit\b(?! (?:declined|accepted))/i] },
  { id: 'qgd', patterns: [/queen'?s gambit declined/i, /\bqgd\b/i, /orthodox defen[sc]e/i, /tarrasch defen[sc]e/i] },
  { id: 'qga', patterns: [/queen'?s gambit accepted/i, /\bqga\b/i] },
  { id: 'slav-defence', patterns: [/slav defen[sc]e/i, /slav opening/i] },
  { id: 'semi-slav', patterns: [/semi[-\s]slav/i, /meran/i] },
  { id: 'london-system', patterns: [/london system/i] },
  { id: 'catalan-opening', patterns: [/catalan/i] },
  { id: 'trompowsky-attack', patterns: [/trompowsky/i, /trompovsky/i] },
  { id: 'kings-indian-defence', patterns: [/king'?s indian defen[sc]e/i, /king'?s indian(?! attack)/i] },
  { id: 'nimzo-indian', patterns: [/nimzo[-\s]indian/i] },
  { id: 'grunfeld-defence', patterns: [/gr[uü]nfeld/i] },
  { id: 'dutch-defence', patterns: [/dutch (?:defen[sc]e|opening)/i, /stonewall dutch/i] },
  { id: 'benoni-defence', patterns: [/benoni/i] },
  { id: 'benko-gambit', patterns: [/benko gambit/i, /volga gambit/i] },
  { id: 'queens-indian', patterns: [/queen'?s indian/i] },
  { id: 'budapest-gambit', patterns: [/budapest/i] },
  { id: 'old-indian-defence', patterns: [/old indian/i] },
  { id: 'english-opening', patterns: [/english opening/i, /english game/i] },
  { id: 'reti-opening', patterns: [/r[eé]ti/i, /zukertort/i] },
  { id: 'kings-indian-attack', patterns: [/king'?s indian attack/i, /\bkia\b/i] },
  { id: 'birds-opening', patterns: [/bird'?s opening/i] },
];

const CONCEPT_BY_ID = new Map(DATA.concepts.map(c => [c.id, c]));

export function resolveOpeningIdFromName(name: string): string | null {
  if (!name) return null;
  for (const entry of OPENING_NAME_MAP) {
    for (const re of entry.patterns) {
      if (re.test(name)) return entry.id;
    }
  }
  return null;
}

export function getOpeningPassages(name: string): BookPassage[] {
  const id = resolveOpeningIdFromName(name);
  if (!id) return [];
  return DATA.openings[id] ?? [];
}

/** Returns the static modern opening definition for a named opening.
 *  Used as the fallback when no book passages match — so the Classic
 *  Wisdom card can render on every opening, not just the 16 the
 *  public-domain books covered. Returns null when the opening name
 *  doesn't resolve to a known opening at all. */
export function getOpeningDefinition(name: string): OpeningDefinition | null {
  const id = resolveOpeningIdFromName(name);
  if (!id) return null;
  return DATA.openingDefinitions?.[id] ?? null;
}

export function getConcept(conceptId: string): ConceptEntry | null {
  return CONCEPT_BY_ID.get(conceptId) ?? null;
}

/** Best single passage for an opening (highest-quality, shortest
 *  source — already pre-ranked at build time). Returns null if no
 *  passage matched the opening during parsing. */
export function getBestOpeningPassage(name: string): BookPassage | null {
  const list = getOpeningPassages(name);
  return list[0] ?? null;
}

/** Detect conceptIds named in arbitrary text via the concept phrase
 *  vocabulary. Used to surface relevant concept passages alongside the
 *  opening passage, e.g. if a coach prompt mentions "isolated pawn"
 *  we inject Capablanca's passage on isolated pawns. */
export function detectConceptsInText(text: string): string[] {
  const lo = text;
  const hits: string[] = [];
  for (const c of DATA.concepts) {
    for (const phrase of c.phrases) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(lo)) {
        hits.push(c.id);
        break;
      }
    }
  }
  return [...new Set(hits)];
}

/** Format a passage as a single-line reference for prompt injection.
 *  Compact form trades quote completeness for token budget. */
function formatPassage(p: BookPassage, maxChars: number = 320): string {
  const author = p.author.split(';')[0].split(',')[0].trim();
  const cite = p.section ? `${author}, "${p.section}"` : author;
  const text = p.text.length > maxChars
    ? p.text.slice(0, maxChars).replace(/\s+\S*$/, '') + '…'
    : p.text;
  return `[${cite}] ${text}`;
}

/** Build a system-prompt block for opening narration. Caller injects
 *  this into the LLM's system prompt so per-move narration grounds in
 *  Capablanca / Lasker / Staunton prose rather than inventing.
 *
 *  Budget: at most 1 opening passage + 2 concept passages, capped to
 *  ~700 chars per passage — total injection ≤ ~2k chars (~500 tokens).
 *  Empty string if we have nothing to add (caller skips injection). */
export function buildOpeningNarrationContext(
  openingName: string,
  conceptIds: string[] = [],
): string {
  const lines: string[] = [];
  const seenPassages = new Set<string>();

  const opPassage = getBestOpeningPassage(openingName);
  if (opPassage) {
    lines.push(formatPassage(opPassage, 600));
    seenPassages.add(`${opPassage.bookSlug}::${opPassage.section ?? ''}`);
  }

  for (const cid of conceptIds.slice(0, 3)) {
    const c = getConcept(cid);
    if (!c) continue;
    if (c.passages.length > 0) {
      const p = c.passages[0];
      const key = `${p.bookSlug}::${p.section ?? ''}`;
      if (seenPassages.has(key)) continue;
      lines.push(formatPassage(p, 500));
      seenPassages.add(key);
    } else if (c.fallbackDefinition) {
      lines.push(`[${c.name} — modern definition] ${c.fallbackDefinition}`);
    }
    if (lines.length >= 4) break;
  }

  if (lines.length === 0) return '';
  return [
    '═══ REFERENCE PASSAGES FROM CHESS CLASSICS ═══',
    'Draw on these to ground your narration in authentic chess ideas.',
    'DO NOT quote verbatim. Use the IDEAS to shape your prose.',
    '',
    ...lines,
    '═══════════════════════════════════════════════',
  ].join('\n');
}

/** Build a system-prompt block for coach chat. Same idea as the
 *  narration version but the trigger is the latest USER MESSAGE —
 *  passages are pulled for any opening + concept named in what the
 *  student just typed. Quiet when nothing matched. */
export function buildCoachChatContext(latestUserText: string): string {
  if (!latestUserText) return '';
  const conceptIds = detectConceptsInText(latestUserText);
  // Try to detect a named opening too. Scan against the same name map.
  const openingId = resolveOpeningIdFromName(latestUserText);
  const openingPassages = openingId ? DATA.openings[openingId] ?? [] : [];

  const lines: string[] = [];
  const seen = new Set<string>();
  if (openingPassages[0]) {
    lines.push(formatPassage(openingPassages[0], 500));
    seen.add(`${openingPassages[0].bookSlug}::${openingPassages[0].section ?? ''}`);
  }
  for (const cid of conceptIds.slice(0, 3)) {
    const c = getConcept(cid);
    if (!c) continue;
    if (c.passages[0]) {
      const p = c.passages[0];
      const key = `${p.bookSlug}::${p.section ?? ''}`;
      if (seen.has(key)) continue;
      lines.push(formatPassage(p, 400));
      seen.add(key);
    } else if (c.fallbackDefinition) {
      lines.push(`[${c.name} — modern definition] ${c.fallbackDefinition}`);
    }
    if (lines.length >= 3) break;
  }
  if (lines.length === 0) return '';
  return [
    '═══ REFERENCE FROM CHESS CLASSICS ═══',
    'Use these to ground your reply, not to quote verbatim.',
    '',
    ...lines,
    '═════════════════════════════════════',
  ].join('\n');
}

/** Total sources count + provenance — used by UI cards on the
 *  opening detail page so users see attribution. */
export function getSourceManifest(): { slug: string; title: string; author: string; gutenbergId: number }[] {
  return DATA.sources;
}

/** Coverage summary — used in tests / debugging. */
export function getCoverageSummary(): {
  concepts: { total: number; bookBacked: number; fallbackBacked: number };
  openings: { total: number; withPassages: number };
  totalPassages: number;
} {
  const bookBacked = DATA.concepts.filter(c => c.passages.length > 0).length;
  const fallbackBacked = DATA.concepts.filter(c => c.fallbackDefinition).length;
  return {
    concepts: {
      total: DATA.concepts.length,
      bookBacked,
      fallbackBacked,
    },
    openings: {
      total: Object.keys(DATA.openings).length,
      withPassages: Object.values(DATA.openings).filter(p => p.length > 0).length,
    },
    totalPassages: DATA.totalTaggedPassages,
  };
}
