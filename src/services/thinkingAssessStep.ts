// thinkingAssessStep — step 1, "Assess the position", its first question:
// WHOSE KING IS IN MORE DANGER? The assessment decides the mode (attack the
// weaker king, defend your own, or improve when both are safe), and king
// safety is the half of it a tap can answer.
//
// The read is the app's ONE king-safety computer (`kingSafetyRead`: castled?,
// pawn shield, open files beside the king, still in the centre). A board is
// fair only when exactly one king is exposed AND the side facing it still has
// its queen — an exposed king in an endgame is not in danger, so asking there
// would teach the wrong thing.
import { Chess, type Color, type Square } from 'chess.js';
import type { FairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { countMaterial, kingSafetyRead, type KingSafetyNote } from './positionReadingService';
import { rotateStem } from '../utils/rotateStem';
import { andList } from '../utils/andList';

function hasQueen(fen: string, color: Color): boolean {
  try {
    return new Chess(fen).board().some((row) => row.some((c) => !!c && c.type === 'q' && c.color === color));
  } catch { return false; }
}

/** The side whose king is in danger on this board, or null when it is not clear-cut. */
export function kingInDanger(fen: string): { color: Color; note: KingSafetyNote } | null {
  const w = kingSafetyRead(fen, 'w');
  const b = kingSafetyRead(fen, 'b');
  if (!w || !b || w.exposed === b.exposed) return null;
  const color: Color = w.exposed ? 'w' : 'b';
  const attacker: Color = color === 'w' ? 'b' : 'w';
  if (!hasQueen(fen, attacker)) return null;
  return { color, note: color === 'w' ? w : b };
}

export function assessKey(fen: string): FairKey | null {
  const d = kingInDanger(fen);
  return d ? { key: [d.note.square], nearMiss: [] } : null;
}

/** Why this king is the one in danger — the computer's own reasons. */
export function kingDangerReason(note: KingSafetyNote): string {
  const why: string[] = [];
  if (note.inCenter) why.push('it is still in the centre');
  if (note.openFilesNearKing.length > 0) {
    why.push(`the ${andList(note.openFilesNearKing)}-file${note.openFilesNearKing.length > 1 ? 's are' : ' is'} open beside it`);
  }
  if (note.shieldPawns <= 1) why.push(note.shieldPawns === 0 ? 'no pawn shields it' : 'only one pawn shields it');
  return why.length > 0 ? andList(why) : 'its cover is thin';
}

function sideWord(fen: string, color: Color): string {
  const toMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  return color === toMove ? 'Your' : 'Their';
}

export function assessReason(fen: string, sq: Square): string | null {
  const d = kingInDanger(fen);
  if (!d || d.note.square !== sq) return null;
  return `${sideWord(fen, d.color)} king on ${sq}: ${kingDangerReason(d.note)}.`;
}

function materialLine(fen: string): string {
  const { advantage } = countMaterial(fen);
  const toMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const mine = toMove === 'w' ? advantage : -advantage;
  if (mine === 0) return 'Material is level.';
  const n = Math.abs(mine);
  return `${mine > 0 ? 'You are' : 'They are'} up ${n} point${n === 1 ? '' : 's'} of material.`;
}

export function assessShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Before you look for a move, assess: count the material, then ask whose king is in more danger. That tells you whether to attack, defend, or quietly improve.',
    'Every decision starts with an assessment — material first, then the kings. The weaker king decides who should be attacking.',
  ], rot);
  const reason = key[0] ? assessReason(fen, key[0]) : null;
  return [open, materialLine(fen), reason ?? ''].filter(Boolean).join(' ');
}

export function assessKit(): StepKit {
  return {
    step: 'assess',
    keyFor: assessKey,
    showLine: assessShowLine,
    prompt: (rot) => rotateStem([
      'Whose king is in more danger? Tap it.',
      'Assess the kings: tap the one in more danger.',
    ], rot),
    wrongTapLine: (fen, sq) => {
      let c: Chess;
      try { c = new Chess(fen); } catch { return 'Look at the two kings: which is still in the centre, or has open files beside it?'; }
      const p = c.get(sq);
      if (p?.type === 'k') return 'That king has its cover — look at the other one: is it in the centre, are files open beside it, how many pawns shield it?';
      return 'Tap a king. Compare the two: castled or still in the centre, open files beside it, pawns in front of it.';
    },
    reasonFor: assessReason,
    intro: 'Today: assessing a position. Before any move, know where you stand — material, then whose king is in more danger. That decides whether you attack, defend or improve.',
  };
}
