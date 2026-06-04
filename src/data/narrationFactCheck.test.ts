// Narration fact-check gate (David 2026-05-28, locked after the
// Nb5 narration bug on the Alapin d5-open variation lesson: the
// narration claimed "the knight attacks the queen" but the knight on
// b5 doesn't attack d5 — knight squares from b5 are a3/a7/c3/c7/d4/d6).
//
// This gate scans every authored narration string (lesson beats,
// middlegame plan annotations) for factual claims about chess and
// verifies them against chess.js at the position the claim is made.
//
// Patterns checked (V1):
//   1. "(attacks|threatens|hits) the (queen|rook|bishop|knight|king)"
//      → the LAST-MOVED piece must attack a square holding an enemy
//        piece of that type.
//   2. "eyes <square>" (e.g. "eyes c7")
//      → the LAST-MOVED piece must attack that square.
//   3. "forks?" — the LAST-MOVED piece must attack ≥2 enemy pieces.
//
// Notes:
//   - We check the LAST move in the beat's move sequence (or in the
//     middlegame plan's playable line). Earlier moves in the beat are
//     setup; the narration is ALWAYS about the move that just landed.
//   - We only flag claims about the PIECE THAT JUST MOVED. Other
//     attack claims (e.g. "Black's queen threatens our king") are
//     out of scope for V1.
//   - The same checks run against:
//       * lesson beats (every variation lesson + main lesson .ts file)
//       * middlegame plan playable-line annotations[]
//   - If the chess.js position can't be reached (illegal moves), the
//     gate also flags that — a separate but related class of bug.

import { describe, it, expect } from 'vitest';
import { Chess, type Square } from 'chess.js';
import plansRaw from './middlegame-plans.json';
import { ALL_LESSONS } from './lessons/registry';
import { PRO_NARODITSKY_CARO_KANN_LESSON } from './lessons/proNaroditskyCaroKann';
import { PRO_NARODITSKY_CARO_KANN_VARIATION_LESSONS } from './lessons/proNaroditskyCaroKannVariations';
import { PRO_NAR_ALAPIN_LESSON } from './lessons/proNaroditskyAllRemaining';
import { PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS } from './lessons/proNaroditskyAlapinVariations';
import type { LessonScript, MiddlegamePlan } from '../types';

interface AnyBeat {
  id: string;
  moves: string[];
  say?: string;
  sayShort?: string;
}

// All squares — used to enumerate target squares for attack discovery.
const ALL_SQUARES: Square[] = [];
for (const file of 'abcdefgh') {
  for (let rank = 1; rank <= 8; rank++) ALL_SQUARES.push(`${file}${rank}` as Square);
}

// Return the squares the piece on `from` attacks. Uses chess.js's
// `attackers(target, color)` — for every other square, check if our
// square is in the attackers list with our color.
function attacksFrom(chess: Chess, from: Square): Set<string> {
  const piece = chess.get(from);
  if (!piece) return new Set();
  const out = new Set<string>();
  for (const sq of ALL_SQUARES) {
    if (sq === from) continue;
    try {
      if (chess.attackers(sq, piece.color).includes(from)) out.add(sq);
    } catch {
      // chess.js throws on invalid squares — skip
    }
  }
  return out;
}

// Find squares holding an enemy piece of `type` (chess.js piece code).
function findEnemyPieceSquares(chess: Chess, ourColor: 'w' | 'b', type: 'q' | 'r' | 'b' | 'n' | 'k'): string[] {
  const enemy = ourColor === 'w' ? 'b' : 'w';
  const out: string[] = [];
  for (const sq of ALL_SQUARES) {
    const p = chess.get(sq);
    if (p && p.color === enemy && p.type === type) out.push(sq);
  }
  return out;
}

const PIECE_NAME_TO_TYPE: Record<string, 'q' | 'r' | 'b' | 'n' | 'k'> = {
  queen: 'q', rook: 'r', bishop: 'b', knight: 'n', king: 'k',
};

interface FactCheckResult {
  beatId: string;
  source: string;
  lastMove: { piece: string; from: string; to: string; color: string };
  text: string;
  violation: string;
}

// Run all checks on a single narration unit.
// `position` is the FEN BEFORE the beat's moves are played (so chess.js
// replays them); for plans, position is the criticalPositionFen.
function checkNarrationUnit(
  source: string,
  beatId: string,
  startFen: string | undefined,
  moves: string[],
  text: string | undefined,
): FactCheckResult[] {
  if (!text || moves.length === 0) return [];
  const errors: FactCheckResult[] = [];

  // Reach the position after the beat's moves are played
  const chess = startFen ? new Chess(startFen) : new Chess();
  for (const san of moves) {
    try { chess.move(san); }
    catch {
      errors.push({
        beatId, source, text,
        lastMove: { piece: '?', from: '?', to: '?', color: '?' },
        violation: `illegal move "${san}" in beat moves[] — can't reach the position`,
      });
      return errors;
    }
  }
  const history = chess.history({ verbose: true });
  if (history.length === 0) return [];
  const last = history.at(-1)!;
  const lastSquare = last.to;
  const lastColor = last.color as 'w' | 'b';
  const attackSet = attacksFrom(chess, lastSquare);

  // Check 1: "(attacks|threatens|hits) the (queen|rook|bishop|knight|king)"
  // The verb must be associated with the just-moved piece for the test
  // to apply. To keep this narrow, we look for the moved-piece NAME +
  // the verb (e.g. "the knight attacks the queen" where the moved piece
  // IS a knight). This skips false positives like "Black's queen
  // threatens our king".
  const movedPieceName = (
    { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const
  )[last.piece];

  // Build a regex that requires "the <movedPiece> ... (attacks|...) ... the <enemyPiece>"
  // within a short window. Use a flexible pattern: "the knight" optional
  // modifiers then a verb then "the queen".
  const verbs = '(?:attacks?|threatens?|hits?)';
  const pieceNames = '(queen|rook|bishop|knight|king)';

  // Pattern A: "the <movedPiece> <verb> the <enemyPiece>" with up to ~30 chars between.
  const patternA = new RegExp(
    `\\bthe\\s+${movedPieceName}[^.,;]{0,40}?${verbs}\\s+the\\s+${pieceNames}\\b`,
    'gi',
  );
  for (const m of text.matchAll(patternA)) {
    const enemyName = m[1].toLowerCase();
    const enemyType = PIECE_NAME_TO_TYPE[enemyName];
    const enemySquares = findEnemyPieceSquares(chess, lastColor, enemyType);
    const attacked = enemySquares.filter((sq) => attackSet.has(sq));
    if (attacked.length === 0) {
      errors.push({
        beatId, source, text,
        lastMove: { piece: movedPieceName, from: last.from, to: last.to, color: lastColor },
        violation: `claim "${m[0]}" — ${movedPieceName} on ${last.to} does NOT attack any enemy ${enemyName}. Attacks from ${last.to}: [${[...attackSet].sort().join(', ')}]. Enemy ${enemyName} squares: [${enemySquares.join(', ') || 'none'}].`,
      });
    }
  }

  // Pattern B: "<movedPiece SAN> <verb> the <enemyPiece>" — e.g. "Nb5 attacks the queen"
  const patternB = new RegExp(
    `\\b${last.san.replace(/[+#!?]+$/, '').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b[^.,;]{0,40}?${verbs}\\s+the\\s+${pieceNames}\\b`,
    'gi',
  );
  for (const m of text.matchAll(patternB)) {
    const enemyName = m[1].toLowerCase();
    const enemyType = PIECE_NAME_TO_TYPE[enemyName];
    const enemySquares = findEnemyPieceSquares(chess, lastColor, enemyType);
    const attacked = enemySquares.filter((sq) => attackSet.has(sq));
    if (attacked.length === 0) {
      errors.push({
        beatId, source, text,
        lastMove: { piece: movedPieceName, from: last.from, to: last.to, color: lastColor },
        violation: `claim "${m[0]}" — ${last.san} from ${last.to} does NOT attack any enemy ${enemyName}. Attacks: [${[...attackSet].sort().join(', ')}]. Enemy ${enemyName} squares: [${enemySquares.join(', ') || 'none'}].`,
      });
    }
  }

  // Check 2: "eyes <square>"
  // Only flag if the eyes-claim is associated with the moved piece —
  // we look for "eyes <sq>" after a mention of the moved piece's name
  // or SAN within a 100-char window.
  const eyesPattern = /\beyes\s+([a-h][1-8])/gi;
  for (const m of text.matchAll(eyesPattern)) {
    const targetSq = m[1].toLowerCase();
    // Check whether the moved piece is the subject (within 100 chars before)
    const before = text.slice(0, m.index ?? 0).slice(-100);
    const isSubject = (
      new RegExp(`\\bthe\\s+${movedPieceName}\\b`, 'i').test(before) ||
      new RegExp(`\\b${last.san.replace(/[+#!?]+$/, '').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`).test(before)
    );
    if (!isSubject) continue;
    if (!attackSet.has(targetSq)) {
      errors.push({
        beatId, source, text,
        lastMove: { piece: movedPieceName, from: last.from, to: last.to, color: lastColor },
        violation: `claim "eyes ${targetSq}" — ${movedPieceName} on ${last.to} does NOT attack ${targetSq}. Attacks: [${[...attackSet].sort().join(', ')}].`,
      });
    }
  }

  // Check 3: "fork(s)"
  // If the narration claims a fork by the moved piece, verify ≥2 enemy
  // pieces are attacked.
  const forkPattern = /\bforks?\b/gi;
  for (const m of text.matchAll(forkPattern)) {
    const before = text.slice(0, m.index ?? 0).slice(-100);
    const isSubject = (
      new RegExp(`\\bthe\\s+${movedPieceName}\\b`, 'i').test(before) ||
      new RegExp(`\\b${last.san.replace(/[+#!?]+$/, '').replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`).test(before)
    );
    if (!isSubject) continue;
    const enemyHits = [...attackSet].filter((sq) => {
      const p = chess.get(sq as Square);
      return p && p.color !== lastColor && p.type !== 'p';
    });
    if (enemyHits.length < 2) {
      errors.push({
        beatId, source, text,
        lastMove: { piece: movedPieceName, from: last.from, to: last.to, color: lastColor },
        violation: `claim of "fork" — ${movedPieceName} on ${last.to} attacks only [${enemyHits.join(', ') || 'no pieces'}] (need ≥2 non-pawn enemy pieces).`,
      });
    }
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────
// Discover narration units to check.
// ─────────────────────────────────────────────────────────────────────

function collectLessonBeats(): Array<{ source: string; beat: AnyBeat }> {
  const out: Array<{ source: string; beat: AnyBeat }> = [];

  // Masterclass lessons via registry
  for (const r of ALL_LESSONS) {
    if (!r.lesson.beats) continue;
    for (const beat of r.lesson.beats) {
      out.push({ source: `${r.scope.toUpperCase()} ${r.key}`, beat: beat as AnyBeat });
    }
  }

  // Pro-rep lessons (not in registry — added explicitly here)
  const proLessons: Array<{ key: string; lesson: LessonScript }> = [
    { key: 'pro-naroditsky-caro-kann (main)', lesson: PRO_NARODITSKY_CARO_KANN_LESSON },
    { key: 'pro-naroditsky-alapin (main)', lesson: PRO_NAR_ALAPIN_LESSON },
  ];
  for (const { key, lesson } of proLessons) {
    if (!lesson.beats) continue;
    for (const beat of lesson.beats) {
      out.push({ source: `PRO ${key}`, beat: beat as AnyBeat });
    }
  }
  for (const [varKey, lesson] of Object.entries(PRO_NARODITSKY_CARO_KANN_VARIATION_LESSONS)) {
    if (!lesson.beats) continue;
    for (const beat of lesson.beats) {
      out.push({ source: `PRO VAR ${varKey}`, beat: beat as AnyBeat });
    }
  }
  for (const [varKey, lesson] of Object.entries(PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS)) {
    if (!lesson.beats) continue;
    for (const beat of lesson.beats) {
      out.push({ source: `PRO VAR ${varKey}`, beat: beat as AnyBeat });
    }
  }

  return out;
}

function collectPlanAnnotations(): Array<{ source: string; beat: AnyBeat; startFen: string }> {
  const out: Array<{ source: string; beat: AnyBeat; startFen: string }> = [];
  const plans = plansRaw as MiddlegamePlan[];
  for (const plan of plans) {
    for (let li = 0; li < (plan.playableLines ?? []).length; li++) {
      const line = plan.playableLines![li];
      if (!line.moves || !line.annotations) continue;
      // Per-move annotation: walk moves[0..i] and check annotation[i] against
      // the position AFTER those moves.
      for (let i = 0; i < line.moves.length; i++) {
        if (typeof line.annotations[i] !== 'string') continue;
        out.push({
          source: `PLAN ${plan.id} line[${li}] move ${i + 1}`,
          beat: {
            id: `${plan.id}::${li}::${i}`,
            moves: line.moves.slice(0, i + 1),
            say: line.annotations[i],
          },
          startFen: line.fen,
        });
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// The gate.
// ─────────────────────────────────────────────────────────────────────

// Baseline: pre-existing violations in legacy masterclass content that
// predate this gate (David 2026-05-28). The gate fails on NEW violations
// (i.e. any not in this list). When a baseline entry is fixed, drop it
// from this list — the ceiling only ever shrinks. Keys are
// "<source> :: <beatId>" (the violation summary text is excluded so
// minor wording shifts don't break the baseline).
const BASELINE_VIOLATIONS = new Set<string>([
  // Lessons — existing claims that don't verify under chess.js (legacy
  // masterclass content predating this gate, 2026-05-28).
  'TRAP blackburne-shilling :: b2',
  'TRAP blackburne-shilling :: b2 (short)',
  'TRAP copycat-qg4 :: cq4 (short)',
  'TRAP frankenstein-nxa8 :: fn2',
  'TRAP frankenstein-nxa8 :: fn2 (short)',
  'TRAP karpov-qe2-mate :: ck-w1 (short)',
  'TRAP wurzburger :: wt3 (short)',
  'VARIATION scotch-game::Scotch Gambit (4.Bc4) :: sg2',
  'VARIATION scotch-game::Scotch Gambit (4.Bc4) :: sg2 (short)',
  'VARIATION scotch-game::Scotch: 4...Qh4 (Steinitz Variation) :: st2 (short)',
  'MAIN The French Defence — A Master Class :: d5',
  'VARIATION french-defence::Advance Variation :: adv3',
  'VARIATION french-defence::Winawer Variation :: win4',
  'MAIN The Sicilian Dragon — A Master Class :: dragonbishop (short)',
  'VARIATION sicilian-dragon::Levenfish Variation :: f4 (short)',
  'VARIATION london-system::Jobava London :: j2',
  'VARIATION albin-countergambit::Lasker Trap :: l3',
  'VARIATION albin-countergambit::Lasker Trap :: l3 (short)',
  'VARIATION queens-gambit::Exchange Variation :: battery (short)',
  'VARIATION vienna-game::Falkbeer Variation :: fd-3 (short)',
  'VARIATION vienna-game::Frankenstein-Dracula :: fd-3 (short)',
  'VARIATION vienna-game::Vienna vs 2...Nc6 :: nc6-6',
  // Plans — existing claims that don't verify
  'PLAN mp-frenchdefence-winawer line[0] move 5 :: mp-frenchdefence-winawer::0::4',
  'PLAN mp-italiangame-twoknights line[0] move 1 :: mp-italiangame-twoknights::0::0',
  'PLAN mp-kings-gambit-open-f-file line[0] move 5 :: mp-kings-gambit-open-f-file::0::4',
  'PLAN mp-viennagame-vs-nc6 line[0] move 7 :: mp-viennagame-vs-nc6::0::6',
  // Checker false-positive, NOT a content bug: the text says the knight is
  // "heading for g6 where it eyes f4 and h4" — from g6 a knight DOES attack f4
  // and h4 (the claim is about the destination square, which is correct). The
  // literal checker evaluates it at the e7 landing square and can't see the
  // forward reference. Narration verified correct; baselined. (David 2026-06-04.)
  'PLAN mp-prosamayopene5-d5break line[0] move 2 :: mp-prosamayopene5-d5break::0::1',
]);

function filterNovel(violations: FactCheckResult[]): FactCheckResult[] {
  return violations.filter((v) => !BASELINE_VIOLATIONS.has(`${v.source} :: ${v.beatId}`));
}

describe('narration fact-check — chess.js verifies every authored attack/coverage claim', () => {
  it('every lesson beat\'s narration is consistent with the position it reaches (baseline-protected)', { timeout: 30000 }, () => {
    const violations: FactCheckResult[] = [];
    for (const { source, beat } of collectLessonBeats()) {
      violations.push(...checkNarrationUnit(source, beat.id, undefined, beat.moves, beat.say));
      violations.push(...checkNarrationUnit(source, `${beat.id} (short)`, undefined, beat.moves, beat.sayShort));
    }
    const novel = filterNovel(violations);
    if (novel.length > 0) {
      console.error('\n=== NEW narration violations (not in baseline) ===');
      for (const v of novel) {
        console.error(`[${v.source}] beat ${v.beatId}`);
        console.error(`  text: "${v.text?.slice(0, 120)}…"`);
        console.error(`  violation: ${v.violation}`);
      }
    }
    expect(novel.map((v) => `${v.source} :: ${v.beatId} :: ${v.violation}`)).toEqual([]);
  });

  it('every middlegame plan annotation is consistent with the position it reaches (baseline-protected)', { timeout: 30000 }, () => {
    const violations: FactCheckResult[] = [];
    for (const { source, beat, startFen } of collectPlanAnnotations()) {
      violations.push(...checkNarrationUnit(source, beat.id, startFen, beat.moves, beat.say));
    }
    const novel = filterNovel(violations);
    if (novel.length > 0) {
      console.error('\n=== NEW plan annotation violations (not in baseline) ===');
      for (const v of novel) {
        console.error(`[${v.source}] beat ${v.beatId}`);
        console.error(`  text: "${v.text?.slice(0, 120)}…"`);
        console.error(`  violation: ${v.violation}`);
      }
    }
    expect(novel.map((v) => `${v.source} :: ${v.beatId} :: ${v.violation}`)).toEqual([]);
  });

  it('baseline only ever shrinks — every baseline entry must still violate (no stale exemptions)', { timeout: 30000 }, () => {
    const allViolations: FactCheckResult[] = [];
    for (const { source, beat } of collectLessonBeats()) {
      allViolations.push(...checkNarrationUnit(source, beat.id, undefined, beat.moves, beat.say));
      allViolations.push(...checkNarrationUnit(source, `${beat.id} (short)`, undefined, beat.moves, beat.sayShort));
    }
    for (const { source, beat, startFen } of collectPlanAnnotations()) {
      allViolations.push(...checkNarrationUnit(source, beat.id, startFen, beat.moves, beat.say));
    }
    const activeKeys = new Set(allViolations.map((v) => `${v.source} :: ${v.beatId}`));
    const staleBaseline = [...BASELINE_VIOLATIONS].filter((k) => !activeKeys.has(k));
    expect(
      staleBaseline,
      `Baseline entries that no longer violate (drop them from BASELINE_VIOLATIONS):\n${staleBaseline.join('\n')}`,
    ).toEqual([]);
  });
});
