// spokenMoveParser — turn a mic transcript into a legal move on a given board
// ("knight to d5", "bishop takes f7", "castle queenside", "e4", "Nd5").
// Completes the voice-answer loop for the coach's board questions (David
// 2026-07-11: guided find-the-move / find-the-shot answered by speaking).
//
// Deterministic: the utterance is matched against chess.js's OWN legal-move
// list for the FEN — the parser never invents a move; ambiguity returns null
// (the caller nudges the student to the board). G0/G3 by construction.

import { Chess, type Move } from 'chess.js';

export interface ParsedSpokenMove {
  san: string;
  from: string;
  to: string;
}

const PIECE_WORDS: Record<string, string> = {
  pawn: 'p', knight: 'n', horse: 'n', bishop: 'b', rook: 'r', castle_rook: 'r',
  queen: 'q', king: 'k',
};
const DIGIT_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
};

function normalize(utterance: string): string {
  let t = ` ${utterance.toLowerCase()} `;
  // Spoken digits → numerals ("d five" → "d 5").
  for (const [w, d] of Object.entries(DIGIT_WORDS)) t = t.replaceAll(` ${w} `, ` ${d} `).replaceAll(` ${w} `, ` ${d} `);
  for (const [w, d] of Object.entries(DIGIT_WORDS)) t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  return t.replace(/[.,!?;:]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse an utterance into a legal move on `fen`. Returns null when nothing
 * matches unambiguously — never guesses.
 */
export function parseSpokenMove(utterance: string, fen: string): ParsedSpokenMove | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;
  const text = normalize(utterance);

  // 1. Castling by name.
  if (/\bcastle|castles|castling\b/.test(text)) {
    const long = /\b(long|queen ?side)\b/.test(text);
    const target = legal.find((m) => (long ? m.san.startsWith('O-O-O') : m.san.startsWith('O-O') && !m.san.startsWith('O-O-O')));
    return target ? { san: target.san, from: target.from, to: target.to } : null;
  }

  const pieceWordEarly = Object.keys(PIECE_WORDS).find((w) => new RegExp(`\\b${w}\\b`).test(text));

  // 2. A literal SAN token anywhere in the utterance ("Nd5", "exf3", "e4").
  //    A BARE SQUARE token ("f3") only counts as a pawn move when no piece
  //    word was spoken — "knight f3" means Nf3, not the pawn push.
  for (const raw of utterance.split(/\s+/)) {
    const token = raw.replace(/[.,!?;:]/g, '');
    if (!/^[NBRQKOa-h]/.test(token)) continue;
    if (pieceWordEarly && /^[a-h][1-8]$/.test(token)) continue;
    const match = legal.find((m) => m.san.replace(/[+#]$/, '') === token.replace(/[+#]$/, ''));
    if (match) return { san: match.san, from: match.from, to: match.to };
  }

  // 3. Piece word + destination square ("knight to d 5", "bishop takes f7").
  //    The LAST square mentioned is the destination ("knight from b1 to d2"
  //    → d2); an earlier square disambiguates the origin.
  const squares = [...text.matchAll(/\b([a-h])\s?([1-8])\b/g)].map((m) => `${m[1]}${m[2]}`);
  if (squares.length === 0) return null;
  const to = squares[squares.length - 1];
  const fromHint = squares.length >= 2 ? squares[squares.length - 2] : null;
  const pieceWord = pieceWordEarly;
  const wantsCapture = /\b(take|takes|capture|captures|x)\b/.test(text);

  let candidates: Move[] = legal.filter((m) => m.to === to);
  if (fromHint) candidates = candidates.filter((m) => m.from === fromHint);
  if (pieceWord) candidates = candidates.filter((m) => m.piece === PIECE_WORDS[pieceWord]);
  if (wantsCapture) {
    const capturing = candidates.filter((m) => !!m.captured);
    if (capturing.length > 0) candidates = capturing;
  }
  // Unambiguous or nothing — the parser never picks among real alternatives.
  if (candidates.length === 1) {
    const m = candidates[0];
    return { san: m.san, from: m.from, to: m.to };
  }
  return null;
}
