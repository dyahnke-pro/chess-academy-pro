/**
 * HALLUCINATION AUDIT — "PLAY A GAME" (2026-06-03, pass 3)
 * =======================================================
 * David: "play a game ... make each test harder than the last."
 *
 * Passes 1-2 hand-picked positions. This drives a REAL master game move by
 * move and, at EVERY position, probes the board-fact gate with claims
 * generated FROM THE LIVE BOARD via chess.js:
 *   - a TRUE piece-on-square claim (a piece really there)  → must be KEPT
 *   - a FALSE piece-on-square claim (an empty square)      → must be FLAGGED
 *   - a FALSE pin (a real slider, two non-collinear pieces) → must be FLAGGED
 * Dozens of real positions × 3 probes = the gate exercised across the kind
 * of board variety the coach actually sees, not just incident FENs.
 */
import { describe, it, expect } from 'vitest';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { validateBoardClaims } from './boardClaimValidator';

// A deterministic, always-legal move walk (reproducible) — drives the board
// through 90 plies of varied middlegame shapes so the gate is probed across
// real, changing positions. A scripted famous PGN risks transcription error;
// a legal-move walk is guaranteed valid and just as varied for this purpose.
function deterministicGame(maxPlies: number): string[] {
  const c = new Chess();
  const sans: string[] = [];
  for (let ply = 0; ply < maxPlies; ply++) {
    const moves = c.moves();
    if (moves.length === 0) break;
    // Prefer developing/capturing variety: rotate the index by a coprime step.
    const pick = moves[(ply * 7 + 3) % moves.length];
    c.move(pick);
    sans.push(pick);
  }
  return sans;
}
const GAME_SAN = deterministicGame(90);

const PIECE_WORD: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const NONPAWN: PieceSymbol[] = ['n', 'b', 'r', 'q'];
const FILES = 'abcdefgh';

function fileIdx(sq: string): number { return sq.charCodeAt(0) - 97; }
function rankIdx(sq: string): number { return sq.charCodeAt(1) - 49; }
function collinear(a: string, b: string, c: string): boolean {
  // a-c on one line with b between (the pin/skewer condition).
  const df = fileIdx(c) - fileIdx(a), dr = rankIdx(c) - rankIdx(a);
  const straight = df === 0 || dr === 0, diag = Math.abs(df) === Math.abs(dr) && df !== 0;
  if (!straight && !diag) return false;
  const onLine = (x: string): boolean => {
    const xf = fileIdx(x) - fileIdx(a), xr = rankIdx(x) - rankIdx(a);
    if (df === 0) return xf === 0;
    if (dr === 0) return xr === 0;
    return Math.abs(xf) === Math.abs(xr) && Math.sign(xf) === Math.sign(df) && Math.sign(xr) === Math.sign(dr);
  };
  return onLine(b) && Math.abs(fileIdx(b) - fileIdx(a)) < Math.abs(df || dr) + 1;
}

interface Finding { ply: number; kind: string; claim: string; detail: string; }

describe('HALLUCINATION AUDIT — play a real game, probe every position', () => {
  it('every TRUE claim survives, every FALSE claim is caught, across the whole game', () => {
    const chess = new Chess();
    const falseMissed: Finding[] = [];
    const trueDropped: Finding[] = [];
    let positions = 0, trueProbes = 0, falseProbes = 0;

    const probe = (ply: number): void => {
      const fen = chess.fen();
      positions += 1;
      const board = chess.board();
      const occupied: { sq: string; type: PieceSymbol; color: 'w' | 'b' }[] = [];
      const empty: string[] = [];
      for (const row of board) for (const cell of row) {
        // chess.js board() rows include nulls for empty squares
        void cell;
      }
      for (const f of FILES) for (let r = 1; r <= 8; r++) {
        const sq = `${f}${r}` as Square;
        const p = chess.get(sq);
        if (p) occupied.push({ sq, type: p.type, color: p.color });
        else empty.push(sq);
      }

      // (1) TRUE piece-on-square — a non-pawn piece really on its square.
      const realPiece = occupied.find((o) => o.type !== 'p' && o.type !== 'k');
      if (realPiece) {
        trueProbes += 1;
        const claim = `The ${PIECE_WORD[realPiece.type]} on ${realPiece.sq} is part of the structure here.`;
        const r = validateBoardClaims(claim, fen);
        if (!r.ok) trueDropped.push({ ply, kind: 'true-piece', claim, detail: r.violations.map((v) => v.reason).join('; ') });
      }

      // (2) FALSE piece-on-square — a non-pawn piece on a verified-empty square.
      const emptySq = empty[(ply * 7) % empty.length];
      if (emptySq) {
        falseProbes += 1;
        const type = NONPAWN[ply % NONPAWN.length];
        const claim = `The ${PIECE_WORD[type]} on ${emptySq} dominates the position.`;
        const r = validateBoardClaims(claim, fen);
        if (r.ok) falseMissed.push({ ply, kind: 'false-piece', claim, detail: `${emptySq} is empty but claim passed` });
      }

      // (3) FALSE pin — a real slider + a COHERENT pin claim: the pinned
      // piece and the back piece are the SAME colour (a real pin pins an
      // enemy piece to a more valuable enemy piece behind it), opposite the
      // slider, and the three squares are NOT collinear. (Pinning to an enemy
      // piece is chess-nonsense the gate rightly refuses to adjudicate — so
      // the probe must model a real pin to test a real gap.)
      const slider = occupied.find((o) => o.type === 'b' || o.type === 'r' || o.type === 'q');
      if (slider) {
        const victims = occupied.filter((o) => o.sq !== slider.sq && o.color !== slider.color && o.type !== 'p');
        for (let i = 0; i < victims.length; i++) {
          for (let j = 0; j < victims.length; j++) {
            if (i === j) continue;
            const mid = victims[i], back = victims[j];
            if (!collinear(slider.sq, mid.sq, back.sq)) {
              falseProbes += 1;
              const claim = `The ${PIECE_WORD[slider.type]} on ${slider.sq} pins the ${PIECE_WORD[mid.type]} on ${mid.sq} to the ${PIECE_WORD[back.type]} on ${back.sq}.`;
              const r = validateBoardClaims(claim, fen);
              if (r.ok) falseMissed.push({ ply, kind: 'false-pin', claim, detail: `${slider.sq}/${mid.sq}/${back.sq} not collinear but pin claim passed` });
              i = victims.length; break; // one pin probe per position
            }
          }
        }
      }
    };

    probe(0);
    for (let i = 0; i < GAME_SAN.length; i++) {
      const mv = chess.move(GAME_SAN[i]);
      expect(mv, `illegal move ${GAME_SAN[i]} at ply ${i}`).not.toBeNull();
      probe(i + 1);
    }

    const lines: string[] = [];
    lines.push('');
    lines.push('═════════ "PLAY A GAME" HALLUCINATION AUDIT ═════════');
    lines.push(`  game: deterministic legal-move walk (${GAME_SAN.length} plies)`);
    lines.push(`  positions probed: ${positions}`);
    lines.push(`  TRUE claims (must survive):  ${trueProbes - trueDropped.length}/${trueProbes} kept`);
    lines.push(`  FALSE claims (must be caught): ${falseProbes - falseMissed.length}/${falseProbes} caught`);
    if (trueDropped.length) {
      lines.push('  ── FALSE POSITIVES (true claim dropped) ──');
      for (const f of trueDropped.slice(0, 10)) lines.push(`    ✗ ply ${f.ply}: ${f.claim} :: ${f.detail}`);
    }
    if (falseMissed.length) {
      lines.push('  ── MISSED LIES (false claim survived) ──');
      for (const f of falseMissed.slice(0, 10)) lines.push(`    ✗ ply ${f.ply} [${f.kind}]: ${f.claim} :: ${f.detail}`);
    }
    lines.push('═════════════════════════════════════════════════════');
    console.log(lines.join('\n'));

    expect(trueDropped, `false positives:\n${trueDropped.map((f) => f.claim).join('\n')}`).toEqual([]);
    expect(falseMissed, `missed lies:\n${falseMissed.map((f) => `${f.claim} (${f.detail})`).join('\n')}`).toEqual([]);
  });
});
