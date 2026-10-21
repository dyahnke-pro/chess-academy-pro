/**
 * WHAT THE FOCUS SAYS (WO-LEARN-FOCUS-01). Every line is a CLUE then a
 * CONCLUSION, built from the chance's own computed facts — the squares, the
 * counts, the engine's line — never read back out of prose. Stems are FIXED
 * and rotated on the ply (never random), so a replay says the same thing and
 * the habit is heard in the same words.
 *
 * LEARN NAMES NO MOVE UNASKED: a question and a clue never name the user's
 * move. Their threat may be named (it is their move); the move that answers a
 * shot is named only once the moment is past (a find, or the second miss).
 */
import type { PieceSymbol } from 'chess.js';
import { PIECE_NAMES } from '../../types/tacticTypes';
import { countWord } from '../../utils/andList';
import type { ChanceKind, FocusChance } from './focusChances';

const pick = <T,>(stems: readonly T[], ply: number): T => stems[((ply % stems.length) + stems.length) % stems.length];

const piece = (t: PieceSymbol | undefined): string => (t ? PIECE_NAMES[t] ?? 'piece' : 'piece');

function times(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${countWord(n)} times`;
}

/** "attacked twice and defended once" / "attacked and not defended". */
function countsWords(c: FocusChance['counts']): string {
  if (!c) return 'attacked';
  if (c.defenders === 0) return 'attacked and not defended';
  return `attacked ${times(c.attackers)} and defended ${times(c.defenders)}`;
}

const MOTIF_VERB: Partial<Record<string, string>> = {
  fork: 'forks', pin: 'pins', skewer: 'skewers', discovery: 'has a discovered attack on', double_check: 'has a discovered attack on',
};

function targetsWords(ch: FocusChance): string {
  const names = (ch.targets ?? []).map((sq) => sq);
  if (names.length === 0) return 'your pieces';
  if (names.length === 1) return `your piece on ${names[0]}`;
  return `your pieces on ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The question asked before the move (the first chance of a teach game). */
const ASK: Record<ChanceKind, readonly string[]> = {
  take: ['Count their defenders — is anything of theirs loose?', 'Is anything of theirs loose?'],
  save: ['Is everything of yours safe?', 'Check your pieces — is anything loose?'],
  leave: ['Is everything of yours safe?'],
  shot: ['Checks and captures first — is there a shot?', 'Is there a forcing move here?'],
  motif: ['What does their last move threaten?', 'What is their last move aiming at?'],
  'mate-threat': ['What is their last move aiming at?', 'How safe is your king right now?'],
  castle: ['How safe is your king right now?'],
  'mate-for-you': ['Look at their king — what do your checks do?'],
};

export function askLine(ch: FocusChance, ply: number): string {
  return pick(ASK[ch.kind], ply);
}

/** THE CLUE, said on a miss before the coach replies (the move is held). For
 *  an exploit seat it is the habit, not the square — the retry should be a
 *  find. For a defend seat it is their threat, which is theirs to name. */
export function clueLine(ch: FocusChance, ply: number): string {
  switch (ch.kind) {
    case 'save':
      return `Hold on — your ${piece(ch.piece?.type)} on ${ch.piece?.square} is ${countsWords(ch.counts)}. It's loose.`;
    case 'leave':
      return `Hold on — that leaves your ${piece(ch.piece?.type)} on ${ch.piece?.square} ${countsWords(ch.counts)}. It's loose.`;
    case 'take':
      return pick([
        'Hold on — one of their pieces has more attackers than defenders. Count them.',
        'Hold on — something of theirs is loose. Count attackers against defenders.',
      ], ply);
    case 'shot':
      return pick([
        'Hold on — there is a forcing move that wins material here. Checks and captures first.',
        'Hold on — a check or a capture wins something here. Look at the forcing moves.',
      ], ply);
    case 'motif':
      return `Hold on — their ${piece(ch.attacker?.type)} on ${ch.attacker?.square} ${MOTIF_VERB[ch.pattern ?? ''] ?? 'hits'} ${targetsWords(ch)}, and that move lets it land.`;
    case 'mate-threat':
      return 'Hold on — they threaten mate, and that move does not stop it.';
    case 'castle':
      return 'Hold on — your king is still in the centre with castling ready, and that move costs you.';
    case 'mate-for-you':
      return 'Hold on — their king can be mated by force. Checks first.';
  }
}

/** THE CONCLUSION, said once the moment is past (a find, or the shown move). */
export function conclusionLine(ch: FocusChance): string {
  switch (ch.kind) {
    case 'save':
      return `your ${piece(ch.piece?.type)} on ${ch.piece?.square} is safe now.`;
    case 'leave':
      return `every piece of yours is covered.`;
    case 'take':
      return `their ${piece(ch.piece?.type)} on ${ch.piece?.square} had ${ch.counts && ch.counts.defenders > 0 ? `only ${countWord(ch.counts.defenders)} defender${ch.counts.defenders === 1 ? '' : 's'}` : 'no defender'}.`;
    case 'shot':
      return ch.answerSan ? `${ch.answerSan} starts the line that wins material.` : 'the forcing line wins material.';
    case 'motif':
      return `their ${MOTIF_VERB[ch.pattern ?? ''] ? (ch.pattern === 'discovery' || ch.pattern === 'double_check' ? 'discovered attack' : ch.pattern) : 'threat'} does not land.`;
    case 'mate-threat':
      return 'their mate is stopped.';
    case 'castle':
      return 'your king is tucked away.';
    case 'mate-for-you':
      return ch.answerSan ? `${ch.answerSan} starts mate in ${countWord(ch.mateIn ?? 0)}.` : `it is mate in ${countWord(ch.mateIn ?? 0)}.`;
  }
}

/** A find, credited (only when the focus is announced). */
export function creditLine(ch: FocusChance, ply: number): string {
  const c = conclusionLine(ch);
  return `${pick(['There it is', 'Good', 'Yes'], ply)} — ${c}`;
}

/** The second miss at one decision: the answer, now that the moment is past
 *  (the arrow is drawn from the board before the miss). */
export function shownLine(ch: FocusChance): string {
  switch (ch.kind) {
    case 'save':
    case 'leave':
      return `The arrow shows a move that keeps your ${piece(ch.piece?.type)} on ${ch.piece?.square}.`;
    case 'take':
      return `Their ${piece(ch.piece?.type)} on ${ch.piece?.square} was free — the arrow takes it.`;
    case 'shot':
      return ch.answerSan ? `${ch.answerSan} was the shot — it wins material.` : 'The arrow shows the shot.';
    case 'motif':
      return 'The arrow shows the move that stops it.';
    case 'mate-threat':
      return 'The arrow shows the move that stops the mate.';
    case 'castle':
      return 'Castling was the move.';
    case 'mate-for-you':
      return ch.answerSan ? `${ch.answerSan} starts mate in ${countWord(ch.mateIn ?? 0)}.` : 'The arrow shows the mate.';
  }
}
