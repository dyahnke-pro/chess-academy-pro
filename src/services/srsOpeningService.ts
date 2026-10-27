/**
 * srsOpeningService.ts — Spaced repetition opening trainer.
 *
 * One Chessable-style "card" per student-to-move position in an enrolled
 * opening line. Uses SM-2 scheduling (the Anki/SuperMemo classic):
 *
 *   - Card just enrolled: due immediately.
 *   - First correct review: next review in 1 day.
 *   - Second correct: 6 days.
 *   - Subsequent correct: interval × easeFactor.
 *   - Wrong: interval resets to 1 day, ease drops by 0.2 (floored at 1.3).
 *
 * Why SM-2 over FSRS: simpler, proven, no per-user model. With a single-
 * user app and only one card type (opening moves), the FSRS advantage
 * (better calibration from review history) doesn't justify the
 * complexity.
 *
 * Identity: a card's id is `${openingId}::${normalizedFenBefore}`. That
 * way Italian Game transpositions (e2-e4, Nf3, Nc6, Bc4 = e2-e4, Bc4,
 * Nc6, Nf3 — same position) collapse to one card. Re-enrolling an opening
 * is idempotent — existing cards keep their SRS state, new positions get
 * fresh cards.
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { MAIN_LINE_INDEX } from '../utils/wlppLadder';
import type { OpeningRecord, SrsOpeningCard } from '../types';
import type { SublineRef } from './openingCourse';
import { positionOf } from '../utils/samePosition';

/** Normalize a FEN for use as a card-id suffix. Drops the half-move and
 *  fullmove counters at the end (positions are the same chess-wise even
 *  if the move counter differs across transpositions). */
function normalizeFen(fen: string): string {
  return positionOf(fen);
}

/** Strip SAN of decorators so "Nf3+", "Nf3!", "Nf3#" all compare equal
 *  to "Nf3". Promotion piece is kept (Nf3=Q is a different move from
 *  Nf3=R), as is disambiguation (Nbd2 vs Nfd2). */
export function normalizeSan(san: string): string {
  return san.replace(/[+#!?]+$/g, '').trim();
}

function cardId(openingId: string, fenBefore: string): string {
  return `${openingId}::${normalizeFen(fenBefore)}`;
}

/** What a card IS: a position and the move a line plays there. Two lines can
 *  teach different moves at one board (the Italian's main line plays d3 where
 *  its Giuoco Piano plays d4 — 208 such boards in main lines and variations,
 *  1,657 more with the sublines); each answer is its own card, so a line's
 *  branching move is scheduled like every other. The FIRST answer enrolled
 *  keeps the bare position id (every card written before 2026-10-27 is one);
 *  a further answer gets `${id}::${san}`. Review finds cards by this key,
 *  never by id and never by "the N-th move of the group". */
export function answerKey(fenBefore: string, san: string): string {
  return `${normalizeFen(fenBefore)}|${normalizeSan(san)}`;
}
function answerKeyOf(card: SrsOpeningCard): string {
  return answerKey(card.fenBefore, card.expectedSan);
}

/** Line keys carried on every card (`SrsOpeningCard.lineKey`). */
export const MAIN_LINE_KEY = 'main';
export function variationLineKey(variationIndex: number): string {
  return variationIndex === MAIN_LINE_INDEX ? MAIN_LINE_KEY : `var-${variationIndex}`;
}
export function sublineLineKey(subline: SublineRef): string {
  return `sub-${subline.tab}::${subline.triggerMove}@${subline.atPly}`;
}

/** Walk a PGN, emitting one card per ply where it's the student's side
 *  to move. Returns position + expected SAN + the PGN prefix that got
 *  there. Skips opponent moves (those aren't quizzed — student studies
 *  by predicting their OWN next move, not their opponent's). */
function extractCardsFromPgn(
  pgn: string,
  variationName: string,
  studentColor: 'white' | 'black',
  openingId: string,
  createdAt: number,
  lineKey: string,
): SrsOpeningCard[] {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  const cards: SrsOpeningCard[] = [];
  const studentTurn: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const moveHistory: string[] = [];

  for (const san of tokens) {
    const isStudentTurn = chess.turn() === studentTurn;
    if (isStudentTurn) {
      // Capture the FEN before student plays — that's the card position.
      const fenBefore = chess.fen();
      try {
        const move = chess.move(san);
        if (move) {
          cards.push({
            id: cardId(openingId, fenBefore),
            openingId,
            variationName,
            fenBefore,
            expectedSan: normalizeSan(move.san),
            pgnPrefix: moveHistory.join(' '),
            studentColor,
            ease: 2.5,
            intervalDays: 0,
            nextReviewAt: createdAt,
            successes: 0,
            lapses: 0,
            lastReviewedAt: null,
            createdAt,
            lineKey,
          });
          moveHistory.push(move.san);
          continue;
        }
      } catch {
        // Illegal SAN — opening data drift. Stop walking this line.
        return cards;
      }
    } else {
      // Opponent move — just advance the position, no card.
      try {
        const move = chess.move(san);
        if (move) moveHistory.push(move.san);
        else return cards;
      } catch {
        return cards;
      }
    }
  }
  return cards;
}

/** Generate the full set of cards an opening would produce — main line +
 *  every variation. Idempotent — returns cards keyed by stable id so the
 *  caller can dedupe against the DB. */
export function generateCardsForOpening(opening: OpeningRecord): SrsOpeningCard[] {
  const now = Date.now();
  const out: SrsOpeningCard[] = [];

  // Main line — if a PGN is present.
  if (opening.pgn && opening.pgn.trim()) {
    out.push(...extractCardsFromPgn(
      opening.pgn,
      opening.name,
      opening.color,
      opening.id,
      now,
      MAIN_LINE_KEY,
    ));
  }

  // Variations.
  (opening.variations ?? []).forEach((variation, index) => {
    if (!variation.pgn?.trim()) return;
    out.push(...extractCardsFromPgn(
      variation.pgn,
      variation.name,
      opening.color,
      opening.id,
      now,
      variationLineKey(index),
    ));
  });

  return resolveNewCards(out, []);
}

/** The cards from `candidates` that are not already held, with their final
 *  ids. A transposition (same board, same move) collapses into one card; a
 *  second answer at a board gets its own id. */
function resolveNewCards(candidates: SrsOpeningCard[], existing: SrsOpeningCard[]): SrsOpeningCard[] {
  const taken = new Set(existing.map((c) => c.id));
  const answers = new Set(existing.map(answerKeyOf));
  const out: SrsOpeningCard[] = [];
  for (const c of candidates) {
    const key = answerKeyOf(c);
    if (answers.has(key)) continue;
    const id = taken.has(c.id) ? `${c.id}::${c.expectedSan}` : c.id;
    if (taken.has(id)) continue;
    out.push({ ...c, id });
    taken.add(id);
    answers.add(key);
  }
  return out;
}

/** Enroll an opening: write any cards that don't yet exist in the DB.
 *  Existing cards (by id) are left alone so prior SRS state survives a
 *  re-enroll. Returns counts: { added, alreadyEnrolled }. */
export async function enrollOpening(opening: OpeningRecord): Promise<{
  added: number;
  alreadyEnrolled: number;
}> {
  const cards = generateCardsForOpening(opening);
  if (cards.length === 0) return { added: 0, alreadyEnrolled: 0 };
  const added = await addNewCards(cards);
  return { added, alreadyEnrolled: cards.length - added };
}

/** Enroll only ONE line (the main line via MAIN_LINE_INDEX, or a variation
 *  index) into SRS. Used to auto-enroll on Learn completion so spaced review
 *  tracks exactly the lines you've actually learned — NOT every line in the
 *  opening (which would flood "due" with material you've never seen). New
 *  cards only; existing SRS state survives. Returns the count added. */
export async function enrollOpeningLine(
  opening: OpeningRecord,
  variationIndex: number,
): Promise<number> {
  const isMain = variationIndex === MAIN_LINE_INDEX;
  const pgn = isMain ? opening.pgn : opening.variations?.[variationIndex]?.pgn;
  const name = isMain ? opening.name : opening.variations?.[variationIndex]?.name ?? opening.name;
  if (!pgn?.trim()) return 0;
  return addNewCards(
    extractCardsFromPgn(pgn, name, opening.color, opening.id, Date.now(), variationLineKey(variationIndex)),
  );
}

/** Enroll ONE subline — called when its Learn finishes, the same rule as a
 *  main line or variation. Positions it shares with a line already enrolled
 *  keep their card and its schedule; only the new positions get cards. */
export async function enrollSubline(
  opening: OpeningRecord,
  subline: SublineRef & { moves: string[] },
  label: string,
): Promise<number> {
  if (subline.moves.length === 0) return 0;
  return addNewCards(
    extractCardsFromPgn(
      subline.moves.join(' '),
      label,
      opening.color,
      opening.id,
      Date.now(),
      sublineLineKey(subline),
    ),
  );
}

async function addNewCards(cards: SrsOpeningCard[]): Promise<number> {
  if (cards.length === 0) return 0;
  const existing = await db.srsOpeningCards.where('openingId').equals(cards[0].openingId).toArray();
  const toAdd = resolveNewCards(cards, existing);
  if (toAdd.length > 0) await db.srsOpeningCards.bulkAdd(toAdd);
  return toAdd.length;
}

/** Remove all cards for an opening. Used when un-enrolling. */
export async function unenrollOpening(openingId: string): Promise<number> {
  return db.srsOpeningCards.where('openingId').equals(openingId).delete();
}

/** Whether any cards exist for this opening. */
export async function isEnrolled(openingId: string): Promise<boolean> {
  const count = await db.srsOpeningCards.where('openingId').equals(openingId).count();
  return count > 0;
}

/** Cards currently due — nextReviewAt <= now. Sorted by nextReviewAt
 *  ascending so the most-overdue card comes first. The limit caps the
 *  daily session; SRS theory says 20-30 reviews per session is the
 *  retention sweet spot. */
export async function getDueCards(limit = 30): Promise<SrsOpeningCard[]> {
  const now = Date.now();
  return db.srsOpeningCards
    .where('nextReviewAt')
    .belowOrEqual(now)
    .limit(limit)
    .toArray();
}

/** A line for Woodpecker-style review: the cards one line created
 *  (`lineKey`), at least one of them due.
 *
 *  `cards` is sorted by `pgnPrefix` length ascending; the last card's
 *  `pgnPrefix + ' ' + expectedSan` is the full line. `cardsByAnswer` holds
 *  every enrolled card of the opening by `answerKey`, because review grades
 *  each move on the card for that board and that move (`planLineReview`) —
 *  including the opening moves another line enrolled first — never by its
 *  place in the group. */
export interface DueLine {
  openingId: string;
  /** `lineKey` when the cards carry one, else the legacy variation name. */
  lineKey: string;
  variationName: string;
  studentColor: 'white' | 'black';
  /** The full line — every ply from move 1 to the student's last move. */
  fullPgn: string;
  cards: SrsOpeningCard[];
  cardsByAnswer: Map<string, SrsOpeningCard>;
}

/** The group a card reviews in. Cards written before line keys existed group
 *  by their variation name, as they always did. */
function lineGroupOf(card: SrsOpeningCard): string {
  return card.lineKey ?? `name:${card.variationName}`;
}

/** Returns a queue of due *lines* for Woodpecker mode. Each line has at least
 *  one card due; the student plays the whole line move by move and each
 *  position's card is updated from that move (`reviewsToRecord`).
 *
 *  Limit is in lines, not cards. SRS theory still applies — a
 *  Woodpecker session of 5 lines (≈ 30-50 student plies) lines up with
 *  the per-position cap of ~30. */
export async function getDueLines(limit = 5): Promise<DueLine[]> {
  const now = Date.now();
  const due = await db.srsOpeningCards
    .where('nextReviewAt')
    .belowOrEqual(now)
    .toArray();
  if (due.length === 0) return [];

  const groupsByOpening = new Map<string, Set<string>>();
  for (const card of due) {
    const set = groupsByOpening.get(card.openingId) ?? new Set<string>();
    set.add(lineGroupOf(card));
    groupsByOpening.set(card.openingId, set);
  }

  const lines: DueLine[] = [];
  for (const [openingId, groups] of groupsByOpening) {
    const all = await db.srsOpeningCards.where('openingId').equals(openingId).toArray();
    const cardsByAnswer = new Map(all.map((c) => [answerKeyOf(c), c]));
    for (const group of groups) {
      const cards = all.filter((c) => lineGroupOf(c) === group);
      if (cards.length === 0) continue;
      cards.sort((a, b) => a.pgnPrefix.length - b.pgnPrefix.length);
      const last = cards[cards.length - 1];
      const fullPgn = last.pgnPrefix
        ? `${last.pgnPrefix} ${last.expectedSan}`.trim()
        : last.expectedSan;
      lines.push({
        openingId,
        lineKey: last.lineKey ?? last.variationName,
        variationName: last.variationName,
        studentColor: cards[0].studentColor,
        fullPgn,
        cards,
        cardsByAnswer,
      });
    }
  }

  // Most-overdue first, so the line with the hottest review pressure leads.
  return lines
    .sort((a, b) => {
      const aMin = Math.min(...a.cards.map((c) => c.nextReviewAt));
      const bMin = Math.min(...b.cards.map((c) => c.nextReviewAt));
      return aMin - bMin;
    })
    .slice(0, limit);
}

/** One ply of a line under review. */
export interface LineReviewMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  /** The student's turn — only those are asked. */
  isStudent: boolean;
  /** The card for this board and this move. Absent when no line enrolled it. */
  card?: SrsOpeningCard;
}

/** Lay a line out for review, pairing every student move with the card for
 *  its board and move. The pairing used to be by count — the N-th student move
 *  took the N-th card of the group — and a group holds only the positions its
 *  line enrolled first, so every variation (they all share their first moves
 *  with the main line) graded the wrong cards. */
export function planLineReview(
  fullPgn: string,
  studentColor: 'white' | 'black',
  cardsByAnswer: Map<string, SrsOpeningCard>,
): LineReviewMove[] {
  const chess = new Chess();
  const studentTurn = studentColor === 'white' ? 'w' : 'b';
  const out: LineReviewMove[] = [];
  for (const san of fullPgn.trim().split(/\s+/).filter(Boolean)) {
    const isStudent = chess.turn() === studentTurn;
    const before = chess.fen();
    let m: ReturnType<Chess['move']>;
    try {
      m = chess.move(san);
    } catch {
      break;
    }
    const card = isStudent ? cardsByAnswer.get(answerKey(before, m.san)) : undefined;
    out.push({ san: m.san, from: m.from, to: m.to, promotion: m.promotion, isStudent, card });
  }
  return out;
}

/** Which card updates a finished line writes. A miss is always written — it is
 *  real evidence the position is not held. A first-try find is written only on
 *  a card that was DUE: SM-2's interval growth assumes the recall happened at
 *  the due date, so crediting a card replayed early (the shared opening moves
 *  of every line) would push it out faster than the schedule means. */
export function reviewsToRecord(
  moves: LineReviewMove[],
  firstTry: Map<string, boolean>,
  now: number,
): Array<{ id: string; correct: boolean }> {
  const out: Array<{ id: string; correct: boolean }> = [];
  const seen = new Set<string>();
  for (const m of moves) {
    if (!m.card || seen.has(m.card.id)) continue;
    seen.add(m.card.id);
    const correct = firstTry.get(m.card.id) ?? true;
    if (!correct) out.push({ id: m.card.id, correct: false });
    else if (m.card.nextReviewAt <= now) out.push({ id: m.card.id, correct: true });
  }
  return out;
}

/** Count of cards due (no limit). Drives the "X due today" header. */
export async function getDueCount(): Promise<number> {
  const now = Date.now();
  return db.srsOpeningCards.where('nextReviewAt').belowOrEqual(now).count();
}

/** Total enrolled cards across all openings. */
export async function getTotalEnrolled(): Promise<number> {
  return db.srsOpeningCards.count();
}

/** List the openings the student has enrolled, with per-opening counts. */
/** SRS-enrolled openings with at least one card due now, paired with the
 *  opening's display name — the exact `{openingId, name}[]` shape the
 *  Training Plan's `srsDue` reps want. Joins enrolled cards (this service)
 *  to names (openings store) so spaced opening review enters the daily path. */
export async function getSrsDueOpenings(): Promise<{ openingId: string; name: string }[]> {
  const enrolled = await getEnrolledOpenings();
  const due = enrolled.filter((e) => e.dueCards > 0);
  if (due.length === 0) return [];
  const out: { openingId: string; name: string }[] = [];
  for (const e of due) {
    const opening = await db.openings.get(e.openingId);
    out.push({ openingId: e.openingId, name: opening?.name ?? e.openingId });
  }
  return out;
}

export async function getEnrolledOpenings(): Promise<
  { openingId: string; totalCards: number; dueCards: number }[]
> {
  const all = await db.srsOpeningCards.toArray();
  const now = Date.now();
  const byOpening = new Map<string, { totalCards: number; dueCards: number }>();
  for (const c of all) {
    const e = byOpening.get(c.openingId) ?? { totalCards: 0, dueCards: 0 };
    e.totalCards += 1;
    if (c.nextReviewAt <= now) e.dueCards += 1;
    byOpening.set(c.openingId, e);
  }
  return Array.from(byOpening.entries()).map(([openingId, counts]) => ({
    openingId,
    ...counts,
  }));
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** SM-2 update. Returns the new card state — caller persists. */
export function applySm2(card: SrsOpeningCard, correct: boolean): SrsOpeningCard {
  const now = Date.now();
  if (correct) {
    let newInterval: number;
    if (card.successes === 0) {
      newInterval = 1; // first correct → 1 day
    } else if (card.successes === 1) {
      newInterval = 6; // second correct → 6 days
    } else {
      newInterval = Math.round(card.intervalDays * card.ease);
    }
    return {
      ...card,
      ease: card.ease, // ease only changes on lapse in vanilla SM-2
      intervalDays: newInterval,
      nextReviewAt: now + newInterval * ONE_DAY_MS,
      successes: card.successes + 1,
      lastReviewedAt: now,
    };
  } else {
    // Lapse: reset interval to 1 day, decrement ease (floor 1.3).
    const newEase = Math.max(1.3, card.ease - 0.2);
    return {
      ...card,
      ease: newEase,
      intervalDays: 1,
      nextReviewAt: now + ONE_DAY_MS,
      successes: card.successes, // unchanged on lapse
      lapses: card.lapses + 1,
      lastReviewedAt: now,
    };
  }
}

/** Apply a review result to a card and persist. */
export async function recordReview(cardId: string, correct: boolean): Promise<SrsOpeningCard | null> {
  const card = await db.srsOpeningCards.get(cardId);
  if (!card) return null;
  const next = applySm2(card, correct);
  await db.srsOpeningCards.put(next);
  return next;
}
