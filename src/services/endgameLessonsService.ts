/**
 * endgameLessonsService
 * ---------------------
 * Loads the hand-authored endgame lesson catalog: principles, pawn
 * endings, drawn patterns, rook endings. Same architectural spine as
 * `endgameService` (the mating-pattern surface) — every position is
 * chess.js-legal, every solution sequence replay-checked, every word
 * of narration hand-authored. The runtime LLM never authors; it only
 * voices the prose via Polly TTS.
 *
 * David's principle: "lines only come from databases." Here the
 * "database" is the JSON files I wrote — curated, source-cited, FEN-
 * verified at build time (see endgameLessonsService.test.ts).
 */
import principlesData from '../data/endgame-principles.json';
import pawnEndingsData from '../data/pawn-endings.json';
import drawnPatternsData from '../data/drawn-patterns.json';
import rookEndingsData from '../data/rook-endings.json';
import type { EndgameLesson } from '../types/endgameLesson';

const PRINCIPLES = principlesData as EndgameLesson[];
const PAWN_ENDINGS = pawnEndingsData as EndgameLesson[];
const DRAWN_PATTERNS = drawnPatternsData as EndgameLesson[];
const ROOK_ENDINGS = rookEndingsData as EndgameLesson[];

/** Every endgame lesson the app knows about — flat list across all
 *  surface tabs. Use the category-specific accessors below for tab
 *  rendering; this exists for the global search / cache key lookup
 *  use cases. */
export function getAllEndgameLessons(): EndgameLesson[] {
  return [...PRINCIPLES, ...PAWN_ENDINGS, ...DRAWN_PATTERNS, ...ROOK_ENDINGS];
}

/** The 7 universal endgame principles — Activate the King, Push
 *  Passed Pawns, Attack Weak Pawns, Two Weaknesses, Don't Rush,
 *  Rooks Behind Passed Pawns, Trade Pieces When Ahead. Every
 *  topical tab can surface its principle subset. */
export function getEndgamePrinciples(): EndgameLesson[] {
  return PRINCIPLES.slice().sort((a, b) => a.order - b.order);
}

/** Pawn ending lessons — Opposition, Key Squares, Rule of the
 *  Square, Outflanking, Breakthrough, Triangulation. Renders in
 *  the Pawn Endings tab. */
export function getPawnEndings(): EndgameLesson[] {
  return PAWN_ENDINGS.slice().sort((a, b) => a.order - b.order);
}

/** Drawing patterns — Wrong-Rook-Pawn Bishop, OCB, Philidor,
 *  Q vs R Fortress, K+P Opposition, Stalemate Stalking,
 *  Perpetual Check, Insufficient Material. Renders in the
 *  Eval Lab → Drawing Patterns sub-tab. */
export function getDrawingPatterns(): EndgameLesson[] {
  return DRAWN_PATTERNS.slice().sort((a, b) => a.order - b.order);
}

/** Rook ending lessons — Lucena, Philidor, Active Rook, Cutting
 *  Off the King. Renders in the Rook Endings tab. */
export function getRookEndings(): EndgameLesson[] {
  return ROOK_ENDINGS.slice().sort((a, b) => a.order - b.order);
}

/** Look up a lesson by ID across all categories. Used for direct-
 *  link routing (URL has the slug). Returns null when the slug
 *  doesn't match any lesson. */
export function getEndgameLessonById(id: string): EndgameLesson | null {
  for (const lesson of getAllEndgameLessons()) {
    if (lesson.id === id) return lesson;
  }
  return null;
}

// ── ENDGAME-TECHNIQUE MATCHER (P-V.1, 2026-09-01) ───────────────────────────
//
// A general endgame-technique ask with no live board — "what's the Lucena",
// "how do I hold a Philidor rook ending", "how do I win king and pawn vs king",
// "how do I use the opposition" — routes here. It matches the ask to one of the
// 27 hand-authored lessons by name + alias keywords, so the coach TEACHES the
// technique from authored, board-verified content (G0/G3: the lesson prose is
// curator-authored; the model only phrases it). Returns null when nothing
// matches (honest decline — never invent an endgame lesson we don't have).
const ENDGAME_ALIASES: Record<string, string[]> = {
  'lucena-position': ['lucena', 'building a bridge', 'build a bridge', 'rook and pawn win', 'winning rook ending'],
  'philidor-rook-ending': ['philidor defen', 'philidor rook', 'defend the draw', 'hold the rook ending', 'third rank defen', 'draw a rook ending', 'hold a rook end'],
  'philidor-position': ['philidor position'],
  'active-rook': ['active rook', 'rook activity'],
  'vancura-position': ['vancura', 'rook pawn draw'],
  'cutting-off-the-king': ['cut off the king', 'cutting off the king', 'cut the king off'],
  'opposition': ['opposition', 'take the opposition', 'gain the opposition'],
  'distant-opposition': ['distant opposition', 'long range opposition'],
  'key-squares': ['key square'],
  'rule-of-the-square': ['rule of the square', 'square of the pawn', 'catch the pawn', 'pawn race'],
  'outflanking': ['outflank'],
  'breakthrough': ['breakthrough', 'pawn breakthrough'],
  'triangulation': ['triangulat', 'lose a tempo', 'waiting move', 'zugzwang the king'],
  'wrong-rook-pawn-bishop': ['wrong rook pawn', 'wrong bishop', 'rook pawn and bishop draw', 'wrong coloured bishop'],
  'opposite-color-bishops': ['opposite color bishop', 'opposite colour bishop', 'ocb', 'opposite-coloured bishop'],
  'queen-vs-rook-fortress': ['queen vs rook', 'queen versus rook', 'q vs r', 'defend queen vs rook'],
  'k-vs-kp-opposition-draw': ['king and pawn vs king', 'k+p vs k', 'k and p vs k', 'pawn vs king', 'hold king and pawn'],
  'stalemate-stalking': ['stalemate', 'stalemate trick', 'stalemate resource'],
  'perpetual-check': ['perpetual check', 'perpetual', 'save with checks'],
  'insufficient-material': ['insufficient material', 'not enough material', 'no mate possible'],
  'activate-the-king': ['activate the king', 'king activity', 'centralize the king', 'centralise the king', 'march the king'],
  'push-passed-pawns': ['push passed pawn', 'passed pawn', 'promote a pawn', 'queen a pawn'],
  'attack-weak-pawns': ['attack weak pawn', 'weak pawn', 'target a pawn'],
  'two-weaknesses': ['two weaknesses', 'principle of two weaknesses', 'second front'],
  'do-not-rush': ["don't rush", 'do not rush', 'take your time', 'no need to hurry'],
  'rooks-behind-passed-pawns': ['rook behind the passed pawn', 'rook behind passed pawn', 'rook behind the pawn', 'tarrasch rule'],
  'trade-when-ahead': ['trade when ahead', 'trade pieces when ahead', 'simplify when ahead', 'trade pawns when behind'],
};

/** Best-matching endgame lesson for a free-text technique ask, or null. Scores
 *  by alias hits (strong) + lesson-name-token overlap; requires a real match so
 *  a vague "how do I win the endgame" returns null and the caller falls back to
 *  the general principle set / honest decline. */
export function matchEndgameLesson(text: string): EndgameLesson | null {
  // Normalize separator words so aliases written with "vs" also match "versus" /
  // "v." (David 2026-09-02: "how do I win king and pawn VERSUS king" missed the
  // 'king and pawn vs king' alias and fell through to the live-board lane).
  const t = (text ?? '').toLowerCase().replace(/\bversus\b/g, 'vs').replace(/\bv\.?\s/g, 'vs ');
  if (!t.trim()) return null;
  const nameStop = new Set(['the', 'of', 'and', 'a', 'vs', 'with', 'your', 'position', 'defensive', 'building', 'bridge']);
  let best: { lesson: EndgameLesson; score: number } | null = null;
  for (const lesson of getAllEndgameLessons()) {
    let score = 0;
    for (const alias of ENDGAME_ALIASES[lesson.id] ?? []) {
      if (t.includes(alias)) score += 5;
    }
    for (const tok of lesson.name.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
      if (tok.length >= 4 && !nameStop.has(tok) && new RegExp(`\\b${tok}`).test(t)) score += 1;
    }
    if (score > (best?.score ?? 0)) best = { lesson, score };
  }
  if (!best || best.score < 2) return null;
  return best.lesson;
}
