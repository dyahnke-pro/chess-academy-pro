/**
 * coachsCall — the GREAT-coach prescription (David 2026-07-31: "a GREAT
 * coach tells you what to work on because they already know your game
 * inside and out. They know when you need a win and want to build on a
 * strength! They know when you're running hot and need to shore up a
 * weakness!").
 *
 * Pure policy over signals the app already collects (G0 — code decides,
 * the voice phrases):
 *   temperature — recent W/L trend from the games store
 *   home opening — teaching-ledger visits + favorites + games played
 *   weakness — the stored weakness profile's top item
 *
 * Prescription: rough patch → a STRENGTH session (the home opening — a win
 * you can feel); running hot → invest the momentum in the TOP WEAKNESS;
 * steady → keep building the home opening.
 *
 * SOVEREIGNTY (David): the call is an OFFER — a chip to tap. Whatever the
 * student asks for instead always wins, instantly, no pushback.
 */
import { db } from '../db/schema';
import type { GameRecord } from '../types';
import { getTeachingVisits } from './teachingLedger';

export type StudentTemperature = 'rough' | 'hot' | 'steady';

export interface CoachsCall {
  temperature: StudentTemperature;
  prescription: 'strength' | 'weakness';
  /** The spoken + shown coaching line. */
  line: string;
  /** Tap-to-accept chip text (routes through normal chat submission). */
  chip: string;
}

const AI_NAMES = ['AI Coach', 'Stockfish Bot'];

function playerColor(game: GameRecord): 'white' | 'black' | null {
  if (AI_NAMES.includes(game.white)) return 'black';
  if (AI_NAMES.includes(game.black)) return 'white';
  return null; // imported game with unknown side — skip for temperature
}

/** Recent form from the student's own games: last 6 decided coach games. */
async function computeTemperature(): Promise<StudentTemperature> {
  const games = await db.games.toArray();
  const decided = games
    .filter((g) => !g.isMasterGame && (g.result === '1-0' || g.result === '0-1'))
    .map((g) => ({ g, color: playerColor(g) }))
    .filter((x): x is { g: GameRecord; color: 'white' | 'black' } => x.color !== null)
    .sort((a, b) => (a.g.date < b.g.date ? 1 : -1))
    .slice(0, 6);
  if (decided.length < 3) return 'steady';
  const wins = decided.filter(({ g, color }) =>
    (color === 'white' && g.result === '1-0') || (color === 'black' && g.result === '0-1')).length;
  const losses = decided.length - wins;
  const last3 = decided.slice(0, 3);
  const last3Wins = last3.filter(({ g, color }) =>
    (color === 'white' && g.result === '1-0') || (color === 'black' && g.result === '0-1')).length;
  if (last3Wins === 3 || wins >= Math.ceil(decided.length * 0.7)) return 'hot';
  if (last3Wins === 0 || losses >= Math.ceil(decided.length * 0.7)) return 'rough';
  return 'steady';
}

/** The student's HOME opening: ledger visits weigh heaviest (they keep
 *  coming back), favorites next, games played last. Null when nothing
 *  signals yet. Returns the display-ready name. */
/** ECO FAMILY ROOTS — names that describe which pawn moved, not a system the
 *  student chose. "Queen's Pawn Game" IS the entry for the bare move `d4`
 *  (ECO A40/D00), so every 1.d4 game that doesn't classify any deeper lands
 *  in it. That bucket then aggregates unrelated games and outscores the real
 *  repertoire, which is split across specific names.
 *
 *  David 2026-07-31: "my queen pawn being my main opening statement has got
 *  to be false." He was right — the coach was reporting a classification
 *  artifact as his home opening. A home opening must be something he CHOSE.
 *
 *  Deliberately narrow: `Bird Opening`, `Grob Opening`, `Nimzo-Larsen`,
 *  `Sicilian Defense` and friends are also short-PGN entries but they are
 *  real systems, so ply-count is the wrong test — only bare first-move
 *  descriptors and family umbrellas belong here. */
const ECO_FAMILY_ROOTS = new Set([
  "queen's pawn game",
  "king's pawn game",
  'indian defense',
  'indian game',
  'open game',
  'closed game',
  'semi-open game',
]);

function isFamilyRoot(name: string): boolean {
  return ECO_FAMILY_ROOTS.has(name.trim().toLowerCase());
}

export async function computeHomeOpening(): Promise<string | null> {
  const scores = new Map<string, { score: number; display: string; derived: boolean }>();
  // Ledger keys are lowercased — title-case them for prose; a real store
  // name (favorites/openings rows) always wins over the derived casing.
  const titleCase = (s: string): string =>
    s.replace(/(^|[\s-])([a-z])/g, (_m, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
  const bump = (key: string, display: string, points: number, derived = false): void => {
    const k = key.toLowerCase();
    // A family root is where classification LANDED, not what he plays.
    if (isFamilyRoot(k)) return;
    const shown = derived ? titleCase(display) : display;
    const cur = scores.get(k) ?? { score: 0, display: shown, derived };
    cur.score += points;
    if (cur.derived && !derived) {
      cur.display = shown;
      cur.derived = false;
    }
    scores.set(k, cur);
  };
  try {
    const rec = await db.meta.get('teachingLedger');
    if (rec) {
      const blob = JSON.parse(rec.value) as Record<string, unknown[]>;
      for (const [key, visits] of Object.entries(blob)) bump(key, key, visits.length * 2, true);
    }
  } catch { /* no ledger yet */ }
  try {
    const favs = await db.openings.filter((o) => o.isFavorite).toArray();
    for (const o of favs) bump(o.name, o.name, 3);
  } catch { /* index shape varies — favorites are a bonus signal */ }
  try {
    const games = await db.games.toArray();
    const byOpening = new Map<string, number>();
    for (const g of games) {
      if (g.isMasterGame || !g.openingId) continue;
      byOpening.set(g.openingId, (byOpening.get(g.openingId) ?? 0) + 1);
    }
    for (const [openingId, count] of byOpening) {
      const o = await db.openings.get(openingId);
      if (o) bump(o.name, o.name, Math.min(5, count * 0.5));
    }
  } catch { /* games are a bonus signal */ }
  let best: { key: string; score: number; display: string } | null = null;
  for (const [key, v] of scores) {
    if (!best || v.score > best.score) best = { key, score: v.score, display: v.display };
  }
  return best && best.score > 0 ? best.display : null;
}

/** The coach's call for THIS session. Null when the signals are too thin
 *  to prescribe anything (fresh install — the generic greeting stands). */
export async function computeCoachsCall(
  topWeaknessLabel: string | null,
): Promise<CoachsCall | null> {
  const [temperature, home] = await Promise.all([computeTemperature(), computeHomeOpening()]);
  if (!home && !topWeaknessLabel) return null;

  if (temperature === 'hot' && topWeaknessLabel) {
    return {
      temperature,
      prescription: 'weakness',
      line: `You've been playing well — that's exactly when a good coach spends the momentum. Today let's shore up the thing that's been costing you: ${topWeaknessLabel}.`,
      chip: `Work on: ${topWeaknessLabel}`,
    };
  }
  if (temperature === 'rough' && home) {
    return {
      temperature,
      prescription: 'strength',
      line: `The last few games have been rough — nothing a home game can't fix. Let's build on your strength today: the ${home}. A session you'll feel good about.`,
      chip: `Continue the ${home}`,
    };
  }
  if (home) {
    const visits = await getTeachingVisits(home);
    const depth = visits.length > 0 ? `we're ${visits.length} session${visits.length === 1 ? '' : 's'} deep` : 'your most-played';
    return {
      temperature,
      prescription: 'strength',
      line: `The ${home} is becoming your home opening — ${depth}. I'd keep building it today.`,
      chip: `Continue the ${home}`,
    };
  }
  return {
    temperature,
    prescription: 'weakness',
    line: `Today I'd work on the pattern that's been costing you the most: ${topWeaknessLabel}.`,
    chip: `Work on: ${topWeaknessLabel}`,
  };
}
