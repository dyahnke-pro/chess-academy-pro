// PUSH FOR A WIN, OR HOLD (census #14): "Opposite-coloured-bishop endings are
// drawish even a pawn up; the bishops can't challenge each other", "a pawn
// down but holdable — a pawn-down knight ending is often a fortress if the
// pieces are active", "you're playing for a win a pawn up, but…".
//
// The ending's TYPE (the one classifier, `classifyMatchup`) and the pawn count
// say what a pawn up or down is worth here; the engine says whether the
// position is still in the band where that matters — better but not won, worse
// but not lost. Outside the band it says nothing: a won ending is technique
// (`conversionMethod`), a lost one is not a lesson in holding.
import { classifyMatchup, type MatchupClass } from './endgameMatchup';

export interface PushOrHold {
  text: string;
  cls: MatchupClass;
  side: 'up' | 'down';
}

/** Better but not won / worse but not lost, centipawns from the student's side. */
export const PUSH_HOLD_BAND = { min: 40, max: 250 } as const;

type Lines = Partial<Record<MatchupClass, { up: string; down: string; pawns: readonly number[] }>>;

const LINES: Lines = {
  'opposite-bishops': {
    pawns: [1, 2],
    up: 'Opposite-coloured bishops — drawish even with extra pawns, because the bishops can never fight for the same squares. To win you need a second passed pawn, far from the first.',
    down: 'Down material, but opposite-coloured bishops are the most drawish ending there is — blockade their passed pawn on your bishop\'s colour and it holds.',
  },
  'rook-endgame': {
    pawns: [1],
    up: 'A pawn up in a rook ending — the hardest edge to convert. Keep your rook active, behind the passed pawn if you can.',
    down: 'A pawn down in a rook ending is often a draw — keep your rook active; a passive rook is how these get lost.',
  },
  'knight-endgame': {
    pawns: [1],
    up: 'A pawn up in a knight ending plays like a pawn ending — make the extra pawn count; one knight struggles to cover both wings.',
    down: 'A pawn down in a knight ending — often a fortress if your king and knight stay active.',
  },
};

export function pushOrHold(fen: string, student: 'w' | 'b', studentCp: number): PushOrHold | null {
  const m = classifyMatchup(fen);
  const lines = LINES[m.cls];
  if (!lines) return null;
  const mine = student === 'w' ? m.signature.white.P : m.signature.black.P;
  const theirs = student === 'w' ? m.signature.black.P : m.signature.white.P;
  const diff = mine - theirs;
  const abs = Math.abs(studentCp);
  if (abs < PUSH_HOLD_BAND.min || abs > PUSH_HOLD_BAND.max) return null;
  if (diff > 0 && studentCp > 0 && lines.pawns.includes(diff)) return { text: lines.up, cls: m.cls, side: 'up' };
  if (diff < 0 && studentCp < 0 && lines.pawns.includes(-diff)) return { text: lines.down, cls: m.cls, side: 'down' };
  return null;
}
