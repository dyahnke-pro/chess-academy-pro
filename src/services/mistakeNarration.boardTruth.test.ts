// BOARD-TRUTH SWEEP for the mistake narration.
//
// The unit tests above prove the voice rules on three hand-picked positions.
// This proves the narration is TRUE OF THE BOARD across a thousand real ones.
//
// It is the gate that catches the class of defect CLAUDE.md keeps calling out:
// narration that names "the knight on f6" when f6 is empty. Every claim the
// generator makes about a piece standing on a square is replayed against the
// FEN it was generated from. The corpus is `puzzles.json` — 15,000 real Lichess
// positions with real solution lines, so the sweep exercises openings,
// middlegames, endgames, mates and quiet positions without anyone curating it.
//
// It also re-asserts the voice rules across that whole spread, because a rule
// that only holds on three fixtures is not a rule.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { generateMistakeNarration, type NarrationParams } from './mistakeNarration';
import puzzlesRaw from '../data/puzzles.json';
import type { MistakeClassification, MistakeGamePhase } from '../types';

interface RawPuzzle {
  id: string;
  fen: string;
  moves: string;
  themes?: string[];
}

const ALL = (Array.isArray(puzzlesRaw) ? puzzlesRaw : []) as unknown as RawPuzzle[];

/** A deterministic spread across the corpus — every Nth entry, so the sample
 *  spans ratings and themes rather than clustering at one end. No Math.random:
 *  a sweep that samples differently each run cannot be debugged. */
const SAMPLE = ALL.filter((_, i) => i % 15 === 0).slice(0, 1000);

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

/** Every "<piece> on <square>" claim in a line, as [pieceWord, square]. Catches
 *  both narration shapes: "The pawn on b7 is loose" and the tactic
 *  descriptions, "Knight on d5 forks queen on c7 and rook on f6". */
function pieceClaims(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /\b(pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push([m[1].toLowerCase(), m[2].toLowerCase()]);
  return out;
}

function paramsFor(p: RawPuzzle, i: number): NarrationParams {
  const classifications: MistakeClassification[] = ['blunder', 'mistake', 'inaccuracy', 'miss'];
  const phases: MistakeGamePhase[] = ['opening', 'middlegame', 'endgame'];
  const chess = new Chess(p.fen);
  const uci = p.moves.trim().split(/\s+/)[0] ?? '';
  let bestMoveSan = '';
  try {
    const mv = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    bestMoveSan = mv?.san ?? '';
  } catch { /* filtered out below */ }
  return {
    classification: classifications[i % classifications.length],
    gamePhase: phases[i % phases.length],
    playerMoveSan: 'Qh5',
    bestMoveSan,
    cpLoss: 150 + (i % 4) * 100,
    fen: p.fen,
    moves: p.moves,
    opponentName: i % 3 === 0 ? 'Opponent' : null,
    gameDate: null,
    openingName: null,
    evalBefore: i % 2 === 0 ? 1.2 : null,
  };
}

describe('mistake narration is true of the board', () => {
  const cases = SAMPLE.map((p, i) => ({ p, params: paramsFor(p, i) })).filter((c) => c.params.bestMoveSan);

  it('sweeps a real corpus (sanity: the sample is not empty)', () => {
    expect(cases.length).toBeGreaterThan(500);
  }, 120_000);

  /** The position each narration line describes.
   *
   *  This distinction is load-bearing and the first cut of this sweep got it
   *  wrong: `moveNarrations[k]` is generated from the board BEFORE the k-th
   *  STUDENT move, which is 2k plies into the solution — not the puzzle's
   *  starting FEN. Validating a later beat against the start produces
   *  false "square is EMPTY" reports for pieces that were still there when the
   *  claim was made. Replay the line and check each beat against its own board.
   *
   *  The intro / hint are pre-attempt, so they belong to the starting FEN. */
  function fensForLines(p: RawPuzzle, moveCount: number): { intro: string; perMove: string[] } {
    const perMove: string[] = [];
    const chess = new Chess(p.fen);
    const uciMoves = p.moves.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < uciMoves.length && perMove.length < moveCount; i += 1) {
      if (i % 2 === 0) perMove.push(chess.fen()); // a student move is about to be played
      try {
        chess.move({
          from: uciMoves[i].slice(0, 2),
          to: uciMoves[i].slice(2, 4),
          promotion: uciMoves[i].length > 4 ? uciMoves[i][4] : undefined,
        });
      } catch { break; }
    }
    return { intro: p.fen, perMove };
  }

  it('every "<piece> on <square>" claim is TRUE on the board it describes', () => {
    const violations: string[] = [];

    const check = (fen: string, line: string, id: string, where: string): void => {
      if (!line?.trim()) return;
      const board = new Chess(fen);
      for (const [word, square] of pieceClaims(line)) {
        const actual = board.get(square as never) as { type?: string } | undefined;
        const expected = PIECE_LETTER[word];
        if (!actual?.type) {
          violations.push(`${id} (${where}): claims ${word} on ${square}, square is EMPTY — "${line}"`);
        } else if (actual.type !== expected) {
          violations.push(`${id} (${where}): claims ${word} on ${square}, actually ${actual.type} — "${line}"`);
        }
      }
    };

    for (const { p, params } of cases) {
      const n = generateMistakeNarration(params);
      const fens = fensForLines(p, n.moveNarrations.length);
      // Pre-attempt lines describe the starting position.
      check(fens.intro, n.intro, p.id, 'intro');
      check(fens.intro, n.conceptHint, p.id, 'hint');
      check(fens.intro, n.outro, p.id, 'outro');
      // Each played beat describes the board it was played from.
      n.moveNarrations.forEach((line, k) => {
        const fen = fens.perMove[k];
        if (fen) check(fen, line, p.id, `move ${k}`);
      });
    }

    expect(violations.slice(0, 10).join('\n')).toBe('');
    expect(violations).toHaveLength(0);
  }, 120_000);

  it('the deleted template pools never resurface across the corpus', () => {
    const POOLS = [
      /Middlegame positions require checking/i,
      /In the middlegame, always scan for tactical shots/i,
      /In complex middlegame positions, look for forcing moves/i,
      /In the opening, piece development and center control/i,
      /Early in the game, every tempo counts/i,
      /In the endgame, king activity and passed pawns decide/i,
      /Endgame technique requires precision/i,
      /Tactical awareness in the middlegame comes from pattern recognition/i,
      /improves your position\.?$/i,
      /^(that'?s it|correct|nice find|well played|perfect)\b/i,
      /\bThe [pnbrqk] on [a-h][1-8]\b/, // bare piece letter — Polly says "pee"
      /\bdevelops the king\b/i,          // kings do not develop
    ];
    const violations: string[] = [];

    for (const { p, params } of cases) {
      const n = generateMistakeNarration(params);
      for (const line of [n.intro, ...n.moveNarrations, n.outro, n.conceptHint]) {
        if (!line?.trim()) continue;
        for (const pool of POOLS) {
          if (pool.test(line)) violations.push(`${p.id}: ${pool} matched "${line}"`);
        }
      }
    }

    expect(violations.slice(0, 10).join('\n')).toBe('');
    expect(violations).toHaveLength(0);
  }, 120_000);

  it('silence is reached, not papered over', () => {
    // Proof the empty-beats-generic rule is live: across a corpus this wide,
    // some positions must genuinely produce no outro. If EVERY case has one,
    // a fallback pool has crept back in.
    const emptyOutros = cases.filter(({ params }) => !generateMistakeNarration(params).outro.trim());
    expect(emptyOutros.length).toBeGreaterThan(0);
  }, 120_000);
});
