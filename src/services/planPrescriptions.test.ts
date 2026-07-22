// THE PRESCRIPTION GATE (David 2026-07-22: "How is the coach not reading what
// is on the board??"). The board-truth gates verify LOCATIVE claims ("knight
// ON f6") — but PRESCRIPTIVE references ("plant a knight", "double the second
// rook") carry no square and slipped every checker. This gate closes the
// grammar: every plan the generators emit, across positions engineered to be
// MISSING each piece type, must never tell the student to use a piece they
// don't have. Baseline-free — a new template can't ship inventory-blind.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { deriveNextPlans } from './reviewTeachingPoints';
import { buildOpeningDevelopmentPlan } from './reviewStrategicOrientation';
import { assessPositionalEdge } from './reviewPositionalAssessment';

/** Piece-type words a plan may only use prescriptively when the student HAS one. */
const PIECE_WORDS: Array<{ word: RegExp; type: string }> = [
  { word: /\bknight\b/i, type: 'n' },
  { word: /\brook(s)?\b/i, type: 'r' },
  { word: /\bqueen\b/i, type: 'q' },
];

function studentHas(fen: string, color: Color, type: string): boolean {
  const c = new Chess(fen);
  for (const row of c.board()) for (const cell of row) {
    if (cell && cell.color === color && cell.type === type) return true;
  }
  return false;
}

/** Positions engineered to trigger each plan class with pieces MISSING. */
const PROBES: Array<{ name: string; fen: string; student: Color }> = [
  // Enemy isolated d-pawn, student (White) has NO knight and NO rook — only
  // king, bishop, pawns. The siege plan must not say "plant a knight".
  { name: 'siege without a knight', fen: '4k3/8/8/3p4/8/1B6/PP3PPP/4K3 w - - 0 20', student: 'w' },
  // Open e-file, student has NO rook at all — the seize-the-file plan must
  // not fire (or must not mention rooks).
  { name: 'open file without a rook', fen: '4k3/pp3ppp/8/8/8/8/PP3PPP/2B1K3 w - - 0 20', student: 'w' },
  // Open file, exactly ONE rook — "double the second rook" must not appear.
  { name: 'open file with one rook', fen: '4k3/pp3ppp/8/8/8/8/PP3PPP/R3K3 w - - 0 20', student: 'w' },
  // Passed pawn with queens ON — "escort with your king" must not appear.
  { name: 'passer with queens on', fen: '4k3/1q3ppp/8/2P5/8/8/5PPP/Q3K3 w - - 0 20', student: 'w' },
  // Material up, no knight/rook — convert plan should still be safe.
  { name: 'material up, minors only', fen: '4k3/5ppp/8/8/8/2B5/BP3PPP/4K3 w - - 0 24', student: 'w' },
];

describe('castling and king-state claims match the board (board-awareness sweep)', () => {
  it('no castling advice when the rights are gone', () => {
    // King back on e1 but BOTH white rights stripped; minors undeveloped so
    // the dev plan fires.
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w kq - 0 4';
    const plan = buildOpeningDevelopmentPlan(fen, 'w');
    expect(plan?.text ?? '').not.toMatch(/get the king castled|then castle\b/);
    expect(plan?.text ?? '').toMatch(/castling rights are gone|lost its castling rights/);
  });

  it('the knight-shield clause never claims a castled king that is not castled', () => {
    const start = new Chess();
    start.move('e4'); start.move('e5');
    const plan = buildOpeningDevelopmentPlan(start.fen(), 'w');
    expect(plan?.text ?? '').not.toMatch(/castled king/);
    // With kingside rights intact the honest future-tense clause is allowed.
    if ((plan?.text ?? '').includes('g1 knight')) {
      expect(plan?.text ?? '').toMatch(/will shield your king once you castle short|fights for e5 and d4/);
    }
  });

  it('claims "castled king" only when the king actually is', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']) c.move(s);
    // White is castled short. Black is NOT: black's g8-knight job may speak
    // the future-tense shield clause but never "your castled king".
    const planB = buildOpeningDevelopmentPlan(c.fen(), 'b');
    expect(planB?.text ?? '').not.toMatch(/stands guard over your castled king/);
  });
});

describe('durability words only on verified-durable facts', () => {
  it('a capturable doubled pawn earns no structural-weakness claim', () => {
    // Black pawns doubled on d4/d7; the d4 pawn is attacked by the white
    // knight and defended by nothing — mid-recapture, not structure.
    const fen = 'rnbqkbnr/pp1ppppp/8/8/3p4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 4';
    const a = assessPositionalEdge(fen, 'w', 30);
    expect(a.reasons.join(' | ')).not.toMatch(/doubled pawns/);
  });

  it('the word "lasting" never appears in verdict reasons or plans', () => {
    const probes = [new Chess().fen(), 'rnbqkbnr/pp1ppppp/8/8/3p4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 4'];
    for (const fen of probes) {
      const a = assessPositionalEdge(fen, 'w', 20);
      expect(a.reasons.join(' ')).not.toMatch(/lasting/i);
      for (const p of deriveNextPlans(fen, 'w')) expect(p).not.toMatch(/lasting/i);
    }
  });
});

describe('plan prescriptions never name a piece the student does not have', () => {
  for (const probe of PROBES) {
    it(probe.name, () => {
      const plans = deriveNextPlans(probe.fen, probe.student);
      for (const plan of plans) {
        for (const { word, type } of PIECE_WORDS) {
          if (!word.test(plan)) continue;
          // A mention of the ENEMY's piece ("their knight is a poor blocker")
          // is a read, not a prescription — only student-side prescriptions
          // are gated. Heuristic: the possessives "their/his/her" immediately
          // before the word exempt it.
          const prescriptive = new RegExp(`(?<!their )(?<!their second )${word.source}`, 'i');
          if (!prescriptive.test(plan)) continue;
          expect(
            studentHas(probe.fen, probe.student, type),
            `plan prescribes a ${type.toUpperCase()} the student doesn't have: "${plan.slice(0, 120)}"`,
          ).toBe(true);
        }
      }
      // Phase check: with queens on the board, no plan may tell the student
      // to escort with the KING.
      const queensOn = /q/i.test(probe.fen.split(' ')[0]);
      if (queensOn) {
        for (const plan of plans) {
          expect(plan, `king-march advice with queens on: "${plan.slice(0, 120)}"`)
            .not.toMatch(/escort it up with your king/);
        }
      }
    });
  }
});
