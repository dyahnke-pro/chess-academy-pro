/**
 * ONE READER PER RELATION (WO-STORY-MATRIX-01 P1-7, 2026-10-30).
 *
 * The app kept four pin readers, two open-file readers, three king-cover rules
 * and three king zones. Each relation now has one reader (or, for pins and king
 * zones, two NAMED concepts in one module), and this suite holds the readers to
 * one another over the detectors' own fixture boards plus real master games —
 * so a fifth copy that drifts fails here, not on a student's board.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess, type Color, type Square } from 'chess.js';
import modelGames from '../data/model-games.json';
import { absolutePinRay, findPins } from './pinGeometry';
import { detectPin } from './tacticClassifier';
import { isPinnedPiece } from './nextPlans';
import { countKingAttack, kingCover, shieldCount } from './kingSafety';
import { describeStructure } from './boardStructure';
import { findOpenFiles, kingSafetyRead } from './positionReadingService';

const FEN_RE = /[rnbqkpRNBQKP1-8]+(?:\/[rnbqkpRNBQKP1-8]+){7} [wb] [-KQkq]+ [-a-h1-8]+ \d+ \d+/g;

/** The pin detectors' own fixture boards — the boards their tests were
 *  written on — plus every position of three master games. */
function boards(): string[] {
  const out = new Set<string>();
  for (const f of ['tacticsDetector', 'pinGeometry', 'tacticGeometry', 'kingSafety', 'tacticClassifier']) {
    const src = readFileSync(`src/services/${f}.test.ts`, 'utf8');
    for (const m of src.match(FEN_RE) ?? []) out.add(m);
  }
  for (const g of (modelGames as Array<{ pgn: string }>).slice(0, 3)) {
    const c = new Chess();
    for (const san of g.pgn.split(/\s+/).filter(Boolean)) {
      try { c.move(san); } catch { break; }
      out.add(c.fen());
    }
  }
  return [...out].filter((fen) => { try { new Chess(fen); return true; } catch { return false; } });
}

const BOARDS = boards();

function load(fen: string): Chess { return new Chess(fen); }
function pieces(c: Chess): Array<{ square: Square; color: Color; type: string }> {
  return c.board().flat().filter((x): x is NonNullable<typeof x> => !!x);
}

describe('pins: the teaching pin and the legal pin, one module', () => {
  it('runs on real boards (non-vacuous)', () => {
    expect(BOARDS.length).toBeGreaterThan(100);
    const pins = BOARDS.flatMap((fen) => findPins(load(fen)));
    expect(pins.length).toBeGreaterThan(5);
  });

  it('every teaching pin against the king is a legal pin along the same line', () => {
    let kingPins = 0;
    for (const fen of BOARDS) {
      const c = load(fen);
      for (const p of findPins(c)) {
        const [attacker, pinned, behind] = p.involvedSquares as Square[];
        if (c.get(behind)?.type !== 'k') continue;
        kingPins += 1;
        const ray = absolutePinRay(c, pinned);
        expect(ray, `${fen} ${p.description}`).not.toBeNull();
        // The ray runs from the king through the pinned piece — toward the attacker.
        const toward: [number, number] = [
          Math.sign(attacker.charCodeAt(0) - pinned.charCodeAt(0)),
          Math.sign(Number(attacker[1]) - Number(pinned[1])),
        ];
        expect(ray, fen).toEqual(toward);
      }
    }
    expect(kingPins).toBeGreaterThan(0);
  });

  it('the classifier\'s pin for a moved piece is the full scan\'s pin from that square', () => {
    let compared = 0;
    for (const fen of BOARDS) {
      const c = load(fen);
      const all = findPins(c);
      for (const p of pieces(c)) {
        if (!['b', 'r', 'q'].includes(p.type)) continue;
        const mine = detectPin(c, p.square, p.color);
        const theirs = all.find((x) => x.involvedSquares[0] === p.square && x.beneficiary === p.color);
        expect(mine, `${fen} ${p.square}`).toEqual(theirs
          ? { type: 'pin', involvedSquares: theirs.involvedSquares, description: theirs.description }
          : null);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(100);
  });

  it('isPinnedPiece is the legal pin, piece by piece', () => {
    let pinned = 0;
    for (const fen of BOARDS) {
      const c = load(fen);
      for (const p of pieces(c)) {
        const legal = absolutePinRay(c, p.square) !== null;
        expect(isPinnedPiece(c, p.square, p.color), `${fen} ${p.square}`).toBe(legal);
        if (legal) pinned += 1;
      }
    }
    expect(pinned).toBeGreaterThan(0);
  });

  it('a pawn pinned down its own file to the king is a legal pin, not a teaching pin', () => {
    // White's rook on e1 stands behind the e7 pawn and Black's king on e8: the
    // pawn's pushes stay on the file, so there is nothing for a coach to name
    // (no teaching pin), yet any capture it could make off the file is illegal.
    const c = load('4k3/4p3/8/8/8/8/8/4RK2 b - - 0 1');
    expect(findPins(c)).toEqual([]);
    expect(absolutePinRay(c, 'e7')).toEqual([0, -1]);
  });

  it('a piece standing beyond a checking slider is not pinned (kingSafety read it as pinned)', () => {
    // Black's rook on e4 checks the king on e1; White's knight on e6 stands
    // past it on the same file. The knight is not pinned — the rook is in the
    // way — so it really does bear on d8 and f8 next to Black's king. The old
    // private walk in kingSafety removed the knight, met the rook and called
    // the knight pinned, so it never counted as an attacker.
    const c = load('4k3/8/4N3/8/4r3/8/8/4K3 w - - 0 1');
    expect(absolutePinRay(c, 'e6')).toBeNull();
    expect(countKingAttack(c, 'w')?.attackers.has('e6')).toBe(true);
  });
});

describe('open files: one reader', () => {
  it('findOpenFiles is the structure read, board by board', () => {
    for (const fen of BOARDS) {
      const s = describeStructure(fen);
      const f = findOpenFiles(fen);
      expect(f.open, fen).toEqual(s?.pawns.openFiles);
      expect(f.whiteSemiOpen, fen).toEqual(s?.pawns.halfOpenFiles.w);
      expect(f.blackSemiOpen, fen).toEqual(s?.pawns.halfOpenFiles.b);
    }
  });
});

describe('king cover: one rule', () => {
  it('the castled shelter, the structure read and the king-safety note all read kingCover', () => {
    let castled = 0;
    for (const fen of BOARDS) {
      for (const color of ['w', 'b'] as const) {
        const cover = kingCover(fen, color);
        if (!cover) continue;
        const shelter = shieldCount(fen, color);
        if (cover.castled) {
          castled += 1;
          expect(shelter, fen).toEqual({ kingSquare: cover.kingSquare, present: cover.present, of: cover.of });
        } else {
          expect(shelter, fen).toBeNull();
        }
        expect(describeStructure(fen)?.kings.shieldPawns[color], fen).toBe(cover.present);
        expect(kingSafetyRead(fen, color)?.shieldPawns, fen).toBe(cover.present);
      }
    }
    expect(castled).toBeGreaterThan(10);
  });

  it('doubled pawns in front of the king are one file of cover, not two', () => {
    // Kg1, pawns f2 f3 g2 h2: three files covered. The pawn count said four.
    const fen = '6k1/8/8/8/8/5P2/5PPP/6K1 w - - 0 1';
    expect(describeStructure(fen)?.kings.shieldPawns.w).toBe(3);
  });

  it('pawns behind a king that has walked up are no cover', () => {
    // The king on g3 with its pawns still on f2, g2 and h2: nothing in front of
    // it. The second-rank count read it as fully covered.
    const fen = '6k1/8/8/8/8/6K1/5PPP/8 w - - 0 1';
    expect(kingSafetyRead(fen, 'w')?.shieldPawns).toBe(0);
    expect(kingSafetyRead(fen, 'w')?.exposed).toBe(true);
  });
});
