/**
 * boardClaimValidator — HAMMER battery (David 2026-06-05: "design an audit
 * that hammers it with false claims mixed with real ones to make sure it's
 * 100% accurate" + "the gate must FULLY CLOSE EVERY TIME there is a
 * contradiction").
 *
 * The validator is a PURE function, so the right "audit" is a deterministic
 * battery that cross-checks EVERY claim against chess.js ground truth:
 *
 *   1. EXHAUSTIVE SWEEP — for several real positions, assert a
 *      "<piece> on <square>" claim for EVERY square × EVERY piece type is
 *      flagged IFF chess.js says that square does NOT hold that piece type.
 *      That's 64 × 6 = 384 claims per FEN, each graded against truth. Zero
 *      leaks (false claim passes) AND zero false-positives (true claim
 *      stripped) allowed.
 *   2. COLOR claims — "white/black <piece> on <sq>" graded against color.
 *   3. FUTURE-MARKER LEAK — present-tense falsehoods that ride on a
 *      future-marker word ("the knight on f6 threatens…") MUST be caught;
 *      genuinely-future claims ("after Be2 the knight on f6…") MUST NOT.
 *   4. MIXED NOTES — stripDisprovenSentences drops every false sentence and
 *      keeps every true / principle sentence, in notes that interleave them.
 *   5. PIN/SKEWER geometry — impossible pins flagged, real pins preserved.
 *   6. PRINCIPLE-ONLY — never flagged.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const WORDS = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;
const FILES = 'abcdefgh'.split('');
const RANKS = '12345678'.split('');

// A spread of real, legal positions: start, Italian opening, a sharp
// middlegame, a sparse rook endgame, a queen-vs-rook ending.
const FENS: Record<string, string> = {
  start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  italian: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  middlegame: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP3PPP/RN1Q1RK1 w - - 0 9',
  rookending: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
  qvr: '4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1',
};

function truthType(fen: string, sq: string): string | null {
  const p = new Chess(fen).get(sq as never);
  return p ? p.type : null;
}
function truthColor(fen: string, sq: string): 'w' | 'b' | null {
  const p = new Chess(fen).get(sq as never);
  return p ? p.color : null;
}
const flagged = (text: string, fen: string): boolean => validateBoardClaims(text, fen).violations.length > 0;

describe('boardClaimValidator HAMMER — exhaustive piece-on-square sweep', () => {
  for (const [name, fen] of Object.entries(FENS)) {
    it(`every square × every piece type is graded against chess.js truth (${name})`, () => {
      const leaks: string[] = [];        // false claim that PASSED (gate didn't close)
      const falsePos: string[] = [];     // true claim that was STRIPPED (over-zealous)
      for (const f of FILES) {
        for (const r of RANKS) {
          const sq = f + r;
          const actual = truthType(fen, sq);
          for (const word of WORDS) {
            const claimedType = Object.keys(PIECE_WORD).find((t) => PIECE_WORD[t] === word)!;
            const phrase = `The ${word} on ${sq} is the key piece.`;
            const isTrue = actual === claimedType;
            const got = flagged(phrase, fen);
            if (isTrue && got) falsePos.push(phrase);       // true but flagged → bad
            if (!isTrue && !got) leaks.push(phrase);        // false but passed → LEAK
          }
        }
      }
      expect({ leaks, falsePos }).toEqual({ leaks: [], falsePos: [] });
    });
  }
});

describe('boardClaimValidator HAMMER — color claims', () => {
  for (const [name, fen] of Object.entries(FENS)) {
    it(`white/black <piece> on <sq> graded against color truth (${name})`, () => {
      const wrong: string[] = [];
      for (const f of FILES) {
        for (const r of RANKS) {
          const sq = f + r;
          const t = truthType(fen, sq);
          const c = truthColor(fen, sq);
          if (!t) continue; // empty squares covered by the sweep above
          const word = PIECE_WORD[t];
          for (const color of ['white', 'black'] as const) {
            const phrase = `The ${color} ${word} on ${sq} stands there.`;
            const colorTrue = (color === 'white' ? 'w' : 'b') === c;
            const got = flagged(phrase, fen);
            // correct piece type, correct color → must pass; wrong color → must flag
            if (colorTrue && got) wrong.push(`FALSE-POS ${phrase}`);
            if (!colorTrue && !got) wrong.push(`LEAK ${phrase}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});

describe('boardClaimValidator HAMMER — future-marker leak is closed', () => {
  // Italian: f6 is EMPTY (knight is on g8/c6), f3 holds a WHITE knight.
  const fen = FENS.italian;
  const presentFalsehoodsBehindMarkers = [
    'The knight on f6 threatens your queen.',
    'The knight on f6 should retreat now.',
    'Your rook on d4 will swing over.',          // d4 empty
    'The bishop on a3 is going to attack.',       // a3 empty
    'The queen on h5 then delivers mate.',        // h5 empty
  ];
  for (const s of presentFalsehoodsBehindMarkers) {
    it(`catches present-tense falsehood riding a future marker: "${s}"`, () => {
      expect(flagged(s, fen)).toBe(true);
    });
  }
  const genuinelyFutureClaims = [
    'After Nf6, the knight on f6 will be strong.',  // claim lives AFTER the marker
    'If the rook reaches d4, the rook on d4 dominates.',
    'Once you play Bg5, the bishop on g5 pins.',
  ];
  for (const s of genuinelyFutureClaims) {
    it(`does NOT flag a genuinely-future claim: "${s}"`, () => {
      expect(flagged(s, fen)).toBe(false);
    });
  }
  // The TRUE present-tense head must still pass even with a marker tail.
  it('keeps a true present-tense head before a future marker', () => {
    expect(flagged('The knight on f3 will jump to e5.', fen)).toBe(false); // f3 IS a knight
  });
});

describe('boardClaimValidator HAMMER — mixed notes (strip false, keep true + principle)', () => {
  const fen = FENS.italian; // f6 empty, f3 white knight, c4 white bishop, c5 black bishop
  const cases: Array<{ note: string; mustDrop: string[]; mustKeep: string[] }> = [
    {
      note: 'The knight on f6 is hanging. Develop your pieces before attacking.',
      mustDrop: ['f6'],
      mustKeep: ['Develop your pieces'],
    },
    {
      note: 'The bishop on c4 eyes f7. The rook on d4 is doing nothing. Control the center.',
      mustDrop: ['rook on d4'],
      mustKeep: ['bishop on c4', 'Control the center'],
    },
    {
      note: 'Your queen on h5 is trapped. Your knight on f3 is well placed.',
      mustDrop: ['queen on h5'],
      mustKeep: ['knight on f3'],
    },
    {
      note: 'Trust your development. Coordinate your pieces toward the king.',
      mustDrop: [],
      mustKeep: ['Trust your development', 'Coordinate your pieces'],
    },
  ];
  for (const { note, mustDrop, mustKeep } of cases) {
    it(`grounds: "${note.slice(0, 48)}…"`, () => {
      const { clean, dropped } = stripDisprovenSentences(note, fen);
      const droppedText = dropped.map((d) => d.sentence).join(' ');
      for (const frag of mustDrop) {
        expect(droppedText).toContain(frag);
        expect(clean).not.toContain(frag);
      }
      for (const frag of mustKeep) expect(clean).toContain(frag);
    });
  }
});

describe('boardClaimValidator HAMMER — pin/skewer geometry', () => {
  // Italian after 3...Nc6-less? Use a position with a real pin: Bb5 pinning
  // Nc6 to Ke8 (Ruy Lopez): r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b
  const ruy = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  it('does NOT flag a real bishop pin (Bb5 pins Nc6 to the king)', () => {
    expect(flagged('The bishop on b5 pins the knight on c6 to the king.', ruy)).toBe(false);
  });
  it('flags an impossible knight "pin"', () => {
    expect(flagged('The knight on f3 pins the bishop on c5 to the king.', FENS.italian)).toBe(true);
  });
  it('flags a non-collinear bishop "pin"', () => {
    // Bishop c4, "pins" knight c6 to king e8 — c4/c6/e8 are not one line.
    expect(flagged('The bishop on c4 pins the knight on c6 to the king.', ruy)).toBe(true);
  });
});

describe('boardClaimValidator HAMMER — principle-only notes never flagged', () => {
  const principles = [
    'Knights before bishops in the opening.',
    'Castle early and connect your rooks.',
    'A weakness on the light squares invites pressure.',
    'Trade when ahead in material; keep pieces when attacking.',
    'Control the center before launching a flank attack.',
  ];
  for (const fen of Object.values(FENS)) {
    for (const p of principles) {
      it(`"${p.slice(0, 32)}…" not flagged`, () => {
        expect(flagged(p, fen)).toBe(false);
      });
    }
  }
});
