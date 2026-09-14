import { describe, it, expect } from 'vitest';
import {
  detectOpposition, detectKeySquares, detectRuleOfSquare, detectRookPawnCorner,
  detectLucena, detectPhilidor, detectCutOff, detectRookBehindPasser,
} from './endgameTechnique';
import { endgameConceptFor } from './conceptEngine';
import pawnEndings from '../data/pawn-endings.json';
import rookEndings from '../data/rook-endings.json';
import drawnPatterns from '../data/drawn-patterns.json';

interface LessonPos { fen: string; title: string; }
interface Lesson { id: string; positions?: LessonPos[]; }
const lessons = (d: unknown): Lesson[] => (Array.isArray(d) ? d : (Object.values(d as Record<string, unknown>)[0] as Lesson[]));
const ALL = [...lessons(pawnEndings), ...lessons(rookEndings), ...lessons(drawnPatterns)];
const posByFen = new Map<string, { lesson: string; title: string }>();
for (const l of ALL) for (const p of l.positions ?? []) posByFen.set(p.fen, { lesson: l.id, title: p.title });

/** THE KNOWN-ANSWER SET (David: "we use the puzzles to test our outcomes because
 *  we already know the solutions"). Every labeled lesson position → the concept
 *  id the engine must produce. A technique that fires on the wrong board is the
 *  one failure this file exists to catch ("never specific-but-wrong"). */
const EXPECTED: Record<string, string> = {
  // pawn-endings
  '8/4k3/8/4K3/4P3/8/8/8 w - - 0 1': 'opposition',            // Black has the opposition — drawn
  '8/3k4/8/4K3/4P3/8/8/8 w - - 1 2': 'key-squares',           // White has the opposition — wins (reach a key square)
  '3k4/8/4K3/4P3/8/8/8/8 w - - 1 2': 'key-squares',           // king on the 6th — wins regardless (ON a key square)
  '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1': 'key-squares',           // king on the key square e6
  '4k3/8/4P3/3K4/8/8/8/8 w - - 0 1': 'key-squares',           // pawn ahead of king — must regroup
  'k7/8/K7/P7/8/8/8/8 b - - 0 1': 'rook-pawn-corner',         // rook pawn — drawn
  '8/8/8/5k2/P7/8/8/2K5 w - - 0 1': 'rule-of-the-square',     // outside the square — queens
  '8/8/8/4k3/P7/8/8/2K5 w - - 0 1': 'rule-of-the-square',     // on the boundary — caught
  '8/8/8/8/8/4k3/P7/2K5 w - - 0 1': 'rule-of-the-square',     // first-move bonus
  '3k4/8/8/3KP3/8/8/8/8 w - - 1 2': 'key-squares',            // outflanking — to reach a key square
  '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1': 'pawn-endgame',       // breakthrough — no false technique
  '8/p7/k7/P7/8/8/3K4/8 w - - 0 1': 'pawn-endgame',           // triangulation — no false technique
  // rook-endings
  '1K6/1P6/8/8/2k5/8/r7/4R3 w - - 0 1': 'lucena',
  '5k2/8/4K3/4P3/8/4r3/8/4R3 w - - 0 1': 'philidor',
  '8/R7/8/pP4p1/7k/7r/5K2/8 w - - 0 53': 'rook-behind-passer',  // active rook — Ra7 also stands behind Black's a5 passer (board-true Tarrasch)
  '8/6k1/P4r2/8/8/8/R7/K7 w - - 0 1': 'rook-behind-passer',    // Vancura setup (rook behind the passer is board-true)
  '8/8/4k3/8/8/2R5/3P4/3K4 w - - 0 1': 'cut-off-king',
  // drawn-patterns
  'k7/8/PK6/8/8/8/8/B7 b - - 0 1': 'wrong-rook-pawn-bishop',
  // DATA DEFECT (found 2026-09-14): the "OCB" lesson's board has BOTH bishops on
  // light squares (Be8 + Bd3) — it is a same-coloured-bishop ending; its own
  // solution trades them on f7. The engine reports the board, not the label.
  // Flagged to David; needs a real OCB game position (never invented, G3).
  '4b3/6k1/8/7p/pP5P/3BK1P1/2P5/8 b - - 0 41': 'same-bishops',
  '5k2/8/4K3/4P3/8/8/r7/4R3 w - - 0 1': 'philidor',
  'k7/r7/8/8/8/8/Q7/2K5 w - - 0 1': 'queen-vs-rook',
  '4k3/8/8/8/3P4/3K4/8/8 b - - 0 1': 'key-squares',            // defender in front — the fight is for the key squares
};

const TECHNIQUE_IDS = new Set(['opposition', 'key-squares', 'rule-of-the-square', 'rook-pawn-corner', 'lucena', 'philidor', 'cut-off-king', 'rook-behind-passer', 'wrong-rook-pawn-bishop']);

describe('endgame techniques — proven on the labeled lesson corpus', () => {
  it('every expected fixture is a real lesson position (the table is not drifting from the data)', () => {
    for (const fen of Object.keys(EXPECTED)) expect(posByFen.has(fen), fen).toBe(true);
  });

  for (const [fen, want] of Object.entries(EXPECTED)) {
    it(`${posByFen.get(fen)?.lesson}: "${posByFen.get(fen)?.title}" → ${want}`, () => {
      const c = endgameConceptFor(fen);
      expect(c?.id).toBe(want);
      if (c) {
        expect(c.full).not.toMatch(/\b(we|our|us)\b/i);
        expect(c.full.length).toBeGreaterThan(40);
        expect(c.short.split(/\s+/).length).toBeLessThanOrEqual(8);
      }
    });
  }

  it('no OTHER lesson position fires a rook/pawn technique it was not labeled for', () => {
    for (const [fen, meta] of posByFen) {
      if (EXPECTED[fen]) continue;
      const c = endgameConceptFor(fen);
      expect(c === null || !TECHNIQUE_IDS.has(c.id), `${meta.lesson}: ${meta.title} fired ${c?.id}`).toBe(true);
    }
  });
});

describe('detectors — geometry, both colours', () => {
  it('rule of the square counts who is to move (defender to move needs one extra step)', () => {
    // Pawn a4, White king far. Black to move on g4 (5 away from a8, 4 to go) → outside; f4 → inside.
    expect(detectRuleOfSquare('8/8/8/8/P5k1/8/8/7K b - - 0 1')?.defenderInside).toBe(false);
    expect(detectRuleOfSquare('8/8/8/8/P4k2/8/8/7K b - - 0 1')?.defenderInside).toBe(true);
    // Same with White to move: the pawn pushes first, so f4 is now outside.
    expect(detectRuleOfSquare('8/8/8/8/P4k2/8/8/7K w - - 0 1')?.defenderInside).toBe(false);
    // Mirrored — a black pawn racing.
    expect(detectRuleOfSquare('7k/8/8/p4K2/8/8/8/8 b - - 0 1')?.defenderInside).toBe(false);
    // King AHEAD of its pawn and close → shepherded, not a race.
    expect(detectRuleOfSquare('8/8/8/1K2k3/P7/8/8/8 w - - 0 1')).toBeNull();
    // King BEHIND its pawn → the square decides (the first-move-bonus lesson).
    expect(detectRuleOfSquare('8/8/8/8/8/4k3/P7/2K5 w - - 0 1')?.defenderInside).toBe(true);
  });

  it('key squares: two ranks ahead below the 5th, one-and-two ranks from the 5th; none for a rook pawn', () => {
    expect(detectKeySquares('4k3/8/8/8/4P3/8/8/4K3 w - - 0 1')?.keySquares).toEqual(['d6', 'e6', 'f6']);
    expect(detectKeySquares('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1')?.keySquares).toEqual(['d6', 'e6', 'f6', 'd7', 'e7', 'f7']);
    expect(detectKeySquares('4k3/8/8/8/7P/8/8/4K3 w - - 0 1')).toBeNull();
    // Mirrored for Black: pawn e5 → key squares e3-rank.
    expect(detectKeySquares('4k3/8/8/4p3/8/8/8/4K3 b - - 0 1')?.keySquares).toEqual(['d3', 'e3', 'f3']);
  });

  it('opposition — direct, distant, and diagonal-free (aligned only), holder is the side NOT to move', () => {
    expect(detectOpposition('8/4k3/8/4K3/4P3/8/8/8 w - - 0 1')).toEqual({ kind: 'direct', holder: 'black' });
    // e2/e8 — five squares between → distant opposition.
    expect(detectOpposition('4k3/8/8/8/8/8/4K3/8 w - - 0 1')).toEqual({ kind: 'distant', holder: 'black' });
    expect(detectOpposition('4k3/8/8/8/8/8/4K3/8 b - - 0 1')).toEqual({ kind: 'distant', holder: 'white' });
    // e1/e8 — SIX squares between → nobody has it yet (the side to move takes it).
    expect(detectOpposition('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBeNull();
    expect(detectOpposition('3k4/8/8/3KP3/8/8/8/8 w - - 1 2')).toBeNull(); // even gap
  });

  it('rook-pawn corner: the lone rook pawn and the WRONG bishop draw; the right bishop does not', () => {
    expect(detectRookPawnCorner('k7/8/K7/P7/8/8/8/8 b - - 0 1')?.kind).toBe('pawn');
    expect(detectRookPawnCorner('k7/8/PK6/8/8/8/8/B7 b - - 0 1')?.kind).toBe('wrong-bishop');
    expect(detectRookPawnCorner('k7/8/PK6/8/8/8/8/1B6 w - - 0 1')).toBeNull();
    // Mirrored: black h-pawn, white king in the h1 corner, black bishop on the wrong colour (h1 is light; b8-square bishop... use a dark bishop on b6? h1 is LIGHT so a DARK bishop is wrong).
    expect(detectRookPawnCorner('8/8/1b6/8/8/7p/6k1/7K w - - 0 1')?.kind).toBe('wrong-bishop');
    // Defender in front of the pawn on its file counts (it reaches the corner).
    expect(detectRookPawnCorner('8/8/8/8/k7/8/P7/K7 w - - 0 1')?.kind).toBe('pawn');
    // Defender far from the corner AND off the file → no claim yet.
    expect(detectRookPawnCorner('8/8/8/8/4k3/8/P7/K7 w - - 0 1')).toBeNull();
  });

  it('Lucena needs the pawn on the 7th, the king on the promotion square, and the defender cut off', () => {
    expect(detectLucena('1K6/1P6/8/8/2k5/8/r7/4R3 w - - 0 1')?.pawn).toBe('b7');
    // Defender king one file over and close (Kc6) → not yet cut off → not Lucena.
    expect(detectLucena('1K6/1P6/2k5/8/8/8/r7/4R3 w - - 0 1')).toBeNull();
    // Classic: Kd8 two files off → Lucena.
    expect(detectLucena('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1')?.pawn).toBe('b7');
    // Rook pawn → not Lucena (a-pawn Lucena is a known exception, taught separately).
    expect(detectLucena('K7/P7/8/8/2k5/8/r7/4R3 w - - 0 1')).toBeNull();
    // Mirrored for Black.
    expect(detectLucena('4r3/R7/8/2K5/8/8/1p6/1k6 b - - 0 1')?.side).toBe('black');
  });

  it('Philidor: defender in front, pawn not past its 5th; reports whether the third rank is already held', () => {
    const setup = detectPhilidor('5k2/8/4K3/4P3/8/8/r7/4R3 w - - 0 1');
    expect(setup).toEqual({ side: 'black', pawn: 'e5', thirdRankSet: false });
    const held = detectPhilidor('4k3/8/r7/4P3/4K3/8/8/4R3 w - - 0 1');
    expect(held).toEqual({ side: 'black', pawn: 'e5', thirdRankSet: true });
    // Pawn already on the 6th → past the Philidor window.
    expect(detectPhilidor('4k3/8/4PK2/8/8/8/r7/4R3 w - - 0 1')).toBeNull();
    // Mirrored for Black's pawn.
    expect(detectPhilidor('4r3/8/8/8/4p3/4k3/R7/4K3 b - - 0 1')?.side).toBe('white');
  });

  it('cutting off the king — a file or rank between the defending king and the lone passer', () => {
    expect(detectCutOff('8/8/4k3/8/8/2R5/3P4/3K4 w - - 0 1')).toEqual({ side: 'white', rook: 'c3', line: '3', pawn: 'd2' });
    // File cut: rook on the d-file, king on e, pawn on b.
    expect(detectCutOff('8/8/4k3/8/1P6/3R4/8/3K4 w - - 0 1')?.line).toBe('d');
    // King already on the pawn's side of the rook → no cut.
    expect(detectCutOff('8/8/8/1k6/1P6/3R4/8/3K4 w - - 0 1')).toBeNull();
  });

  it('rook behind the passed pawn — own or enemy, clear line only', () => {
    expect(detectRookBehindPasser('8/6k1/P4r2/8/8/8/R7/K7 w - - 0 1')).toEqual({ side: 'white', rook: 'a2', pawn: 'a6', ownPawn: true });
    // Enemy rook behind White's passer.
    expect(detectRookBehindPasser('8/6k1/P7/8/8/8/r7/K3R3 w - - 0 1')?.ownPawn).toBe(false);
    // Rook IN FRONT of the pawn → not "behind".
    expect(detectRookBehindPasser('R7/6k1/P7/8/8/8/8/K3r3 w - - 0 1')).toBeNull();
    // Not a passed pawn → nothing.
    expect(detectRookBehindPasser('8/p5k1/8/8/P7/8/R7/K7 w - - 0 1')).toBeNull();
  });
});
