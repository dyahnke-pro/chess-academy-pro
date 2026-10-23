/**
 * WHAT THE FOCUS SAYS (WO-LEARN-FOCUS-01 → WO-FOCUS-TACTICS-01). Every line is a CLUE then a
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
import { MATERIAL_VALUE } from '../../services/pieceValues';
import { MOTIFS, motifOfTag, type MotifId } from '../../data/tacticMotifs';
import { saveAnswer, type ChanceKind, type FocusChance, type FocusMove } from './focusChances';
import { REVIEW_HAS_THE_REST } from './focusCard';
import { unmarked } from '../../utils/sanMark';

const pick = <T,>(stems: readonly T[], ply: number): T => stems[((ply % stems.length) + stems.length) % stems.length];

const piece = (t: PieceSymbol | undefined): string => (t ? PIECE_NAMES[t] ?? 'piece' : 'piece');

/** THEIR motif, said — one row per motif on the master list (WO-MOTIFS-01),
 *  a `Record` so a new motif fails to compile until it has words. `verb` says
 *  what their piece does to yours; `held` closes a find. Null where the motif
 *  is never a "their motif" chance: no reader sees it coming yet, the loose
 *  piece is the save's question and a mate threat is the kings'. (Until
 *  2026-10-22 a double check was said as a discovered attack.) */
const THEIR_MOTIF: Record<MotifId, { verb: string; held: string; lets: string } | null> = {
  'free-piece': null,
  fork: { verb: 'forks', held: 'their fork does not land.', lets: 'lets them fork two of your pieces' },
  pin: { verb: 'pins', held: 'their pin does not land.', lets: 'lets them pin a piece of yours' },
  skewer: { verb: 'skewers', held: 'their skewer does not land.', lets: 'lets them skewer a piece of yours' },
  'discovered-attack': { verb: 'has a discovered attack on', held: 'their discovered attack does not land.', lets: 'lets them uncover an attack on a piece of yours' },
  'discovered-check': null,
  'x-ray': null,
  mate: null,
  promotion: null,
  'double-check': { verb: 'threatens a double check on', held: 'their double check does not land.', lets: 'lets them give a double check' },
  'removing-the-guard': { verb: 'can take the guard of', held: 'nothing of yours falls.', lets: 'lets them take the guard of a piece of yours' },
  overload: { verb: 'hits a piece guarding', held: 'nothing of yours falls.', lets: 'lets them overload one of your defenders' },
  deflection: null,
  zwischenzug: null,
  'trapped-piece': { verb: 'traps', held: 'nothing of yours falls.', lets: 'lets them trap a piece of yours' },
  clearance: null,
  interference: null,
};

/** A motif's word ("fork", "discovered attack"), off the master list. */
const MOTIF_WORD = Object.fromEntries(Object.values(MOTIFS).map((m) => [m.id, m.word])) as Record<MotifId, string>;

const theirMotif = (ch: FocusChance): { verb: string; held: string; lets: string } | null => {
  const m = motifOfTag(ch.tag);
  return m ? THEIR_MOTIF[m] : null;
};

/** "you found two of three chances" — and the zero and one cases English
 *  needs: countWord(0) is "no", so prod tactics game 2 ended "you found no of
 *  three". */
function yoursPart(found: number, chances: number, presented: boolean): string {
  if (chances === 0) return presented ? 'none of your chances was settled' : 'the game ended before your chance came';
  if (chances === 1) return found > 0 ? 'you found your one chance' : 'you missed your one chance';
  if (found === chances) return chances === 2 ? 'you found both chances' : `you found all ${countWord(chances)} chances`;
  if (found === 0) return chances === 2 ? 'you found neither chance' : `you found none of ${countWord(chances)} chances`;
  return `you found ${countWord(found)} of ${countWord(chances)} chances`;
}

/** ", and stopped one of two of theirs" — empty when they set up nothing. */
function theirsPart(stopped: number, tactics: number): string {
  if (tactics === 0) return '';
  if (tactics === 1) return stopped > 0 ? ', and stopped their one tactic' : ', and their one tactic landed';
  if (stopped === tactics) return tactics === 2 ? ', and stopped both of theirs' : `, and stopped all ${countWord(tactics)} of theirs`;
  if (stopped === 0) return tactics === 2 ? ', and stopped neither of theirs' : `, and stopped none of their ${countWord(tactics)}`;
  return `, and stopped ${countWord(stopped)} of ${countWord(tactics)} of theirs`;
}

/** THE END LINE (David 2026-10-22): "Tactics today: you found N of M chances,
 *  and stopped P of Q of theirs. Review has the rest." Your chances are the
 *  exploit seat's settled answers, theirs the defend seat's; `presented` says
 *  a chance at your rung came (so zero settled is never told as the game
 *  ending first). */
export function endLine(t: { yours: { found: number; missed: number }; theirs: { found: number; missed: number }; presented: boolean }): string {
  const yours = yoursPart(t.yours.found, t.yours.found + t.yours.missed, t.presented);
  const theirs = theirsPart(t.theirs.found, t.theirs.found + t.theirs.missed);
  return `Tactics today: ${yours}${theirs}. ${REVIEW_HAS_THE_REST}`;
}

/** The question asked before the move (the first chance of a teach game). */
const ASK: Record<ChanceKind, readonly string[]> = {
  take: ['Count their defenders — is anything of theirs loose?', 'Is anything of theirs loose?'],
  save: ['Is everything of yours safe?', 'Check your pieces — is anything loose?'],
  leave: ['Is everything of yours safe?'],
  shot: ['Checks, captures and threats — is there a shot?', 'Is there a forcing move here?'],
  motif: ['What does their last move threaten?', 'What is their last move aiming at?'],
  'mate-threat': ['What is their last move aiming at?', 'How safe is your king right now?'],
  'mate-for-you': ['Look at their king — what do your checks do?'],
};

export function askLine(ch: FocusChance, ply: number): string {
  return pick(ASK[ch.kind], ply);
}

/** A defended piece attacked by a CHEAPER piece is lost whatever defends it —
 *  the count is the wrong reading there, and saying "attacked twice and
 *  defended twice. It's loose." contradicted itself on David's prod game. */
function cheaperAttacker(ch: FocusChance): boolean {
  return !!ch.attacker && !!ch.piece && (ch.counts?.defenders ?? 0) > 0
    && MATERIAL_VALUE[ch.attacker.type] < MATERIAL_VALUE[ch.piece.type];
}

export const SHOT_CLUE = 'Hold on — there is a forcing move that wins material here. Checks, captures and threats first.';

/** THE CLUE, said on a miss before the coach replies (the move is held) — THE
 *  HABIT, never the answer (David 2026-10-23: "Just say 'a piece' don't name
 *  directly. Switch the alert to the habit."). It says what kind of thing was
 *  missed — a piece, never which one or where — and the habit that finds it,
 *  so the retry is a real find. One fixed line per kind: the same words every
 *  miss is how a habit is built (§ MISSIONS). The square is named only once
 *  the moment is past (the shown answer, the credit, the recap). */
export const CLUE: Record<'save' | 'saveCheaper' | 'leave' | 'leaveCheaper' | 'motif' | 'mateThreat', string> = {
  save: 'Hold on — a piece of yours is loose. Before every move, check each of your pieces: is it attacked, and is it guarded?',
  saveCheaper: 'Hold on — a cheaper piece of theirs is attacking a piece of yours. Before every move, look at what their cheaper pieces hit: a guard does not save a piece from a cheaper attacker.',
  leave: 'Hold on — that move leaves a piece of yours loose. Before you play a move, check that every piece is still guarded after it.',
  leaveCheaper: 'Hold on — that move puts a piece of yours where a cheaper piece of theirs attacks it. Before you play a move, look at what their cheaper pieces can hit after it.',
  motif: 'Hold on — that move lets their tactic land. Before every move, ask what their checks, captures and threats would be.',
  mateThreat: 'Hold on — they threaten mate, and that move does not stop it. Before every move, ask what their last move threatens.',
};
const THEIR_HABIT = 'Before every move, ask what their checks, captures and threats would be.';

export function clueLine(ch: FocusChance, ply: number): string {
  switch (ch.kind) {
    case 'save':
      return cheaperAttacker(ch) ? CLUE.saveCheaper : CLUE.save;
    case 'leave':
      return cheaperAttacker(ch) ? CLUE.leaveCheaper : CLUE.leave;
    case 'take':
      return pick([
        'Hold on — one of their pieces has more attackers than defenders. Count them.',
        'Hold on — something of theirs is loose. Count attackers against defenders.',
      ], ply);
    // ONE fixed clue, true of every shot: a shot's first move is a check, a
    // capture OR a threat (`forcingFirst`). The hand walk's 13.Nd5 was a quiet
    // discovered attack, and the old rotated stem told the student "a check or
    // a capture wins something here".
    case 'shot':
      return SHOT_CLUE;
    case 'motif': {
      const m = theirMotif(ch);
      return m ? `Hold on — that move ${m.lets}. ${THEIR_HABIT}` : CLUE.motif;
    }
    case 'mate-threat':
      return CLUE.mateThreat;
    case 'mate-for-you':
      return 'Hold on — their king can be mated by force. Checks first.';
  }
}

/** A mate, said as what it is: the mating move IS mate ("Qd7 is checkmate",
 *  its "#" taken off so mate is said once); a longer one starts it ("Rxh7+
 *  starts mate in three"). The hand walk 2026-10-23 heard "queen to d7 starts
 *  mate in one". */
function mateWords(ch: FocusChance, bare: string): string {
  const n = ch.mateIn ?? 0;
  if (n === 1 && ch.answerSan) return `${unmarked(ch.answerSan)} is checkmate.`;
  return ch.answerSan ? `${ch.answerSan} starts mate in ${countWord(n)}.` : `${bare} mate in ${countWord(n)}.`;
}

/** THE CONCLUSION, said once the moment is past (a find, or the shown move).
 *  A saved piece is said the way it was saved — stayed and covered, moved to
 *  a safe square, or traded — so "safe now" is never said of a piece that
 *  was traded off. */
export function conclusionLine(ch: FocusChance, m?: FocusMove): string {
  switch (ch.kind) {
    case 'save': {
      const answer = m && ch.piece ? saveAnswer(m.fenBefore, m.san, ch.piece.square, m.student) : null;
      if (answer?.how === 'traded') return answer.net > 0 ? 'that trade wins material.' : 'that trade keeps the material level.';
      if (answer && answer.to !== ch.piece?.square) return `your ${piece(ch.piece?.type)} is safe on ${answer.to} now.`;
      return `your ${piece(ch.piece?.type)} on ${ch.piece?.square} is safe now.`;
    }
    case 'leave':
      return `every piece of yours is covered.`;
    case 'take':
      return `their ${piece(ch.piece?.type)} on ${ch.piece?.square} had ${ch.counts && ch.counts.defenders > 0 ? `only ${countWord(ch.counts.defenders)} defender${ch.counts.defenders === 1 ? '' : 's'}` : 'no defender'}.`;
    case 'shot':
      return ch.answerSan ? `${ch.answerSan} starts the line that wins material.` : 'the forcing line wins material.';
    case 'motif':
      return theirMotif(ch)?.held ?? 'their threat does not land.';
    case 'mate-threat':
      return 'their mate is stopped.';
    case 'mate-for-you':
      return mateWords(ch, 'it is');
  }
}

/** A find, credited — only when it answers a question said out loud (the
 *  opening ask, or a retry after a clue). Every other find is silent. */
export function creditLine(ch: FocusChance, ply: number, m?: FocusMove): string {
  const c = conclusionLine(ch, m);
  return `${pick(['There it is', 'Good', 'Yes'], ply)} — ${c}`;
}

/** SHOW ME — the answer, said only on the student's own tap after a second
 *  miss (rung 0; David 2026-10-22: "Never show the answer! Provide a 'show
 *  me' button after the second miss for beginners"). The arrow is drawn from
 *  the board before the miss. */
export function shownLine(ch: FocusChance): string {
  switch (ch.kind) {
    case 'save':
    case 'leave':
      return `The arrow shows a move that keeps your ${piece(ch.piece?.type)} on ${ch.piece?.square} safe.`;
    case 'take':
      return `Their ${piece(ch.piece?.type)} on ${ch.piece?.square} was free — the arrow takes it.`;
    case 'shot':
      return ch.answerSan ? `${ch.answerSan} was the shot — it wins material.` : 'The arrow shows the shot.';
    case 'motif':
      return 'The arrow shows the move that stops it.';
    case 'mate-threat':
      return 'The arrow shows the move that stops the mate.';
    case 'mate-for-you':
      return ch.answerSan ? mateWords(ch, 'it is') : 'The arrow shows the mate.';
  }
}

/** A missed chance on the recap's list: where it was and what kind — never
 *  the answer (David 2026-10-22: "a quick review on the end game recap can
 *  show where it was with a chance to play out. Never show the answer!"). */
export function recapLabel(ch: FocusChance, ply: number): string {
  const move = `Move ${Math.max(1, Math.ceil(ply / 2))}`;
  switch (ch.kind) {
    case 'take': return `${move} — a loose piece of theirs`;
    case 'shot': return `${move} — a shot that wins material`;
    case 'mate-for-you': return `${move} — a forced mate`;
    case 'save': return `${move} — your ${piece(ch.piece?.type)} on ${ch.piece?.square} was loose`;
    case 'leave': return `${move} — your ${piece(ch.piece?.type)} on ${ch.piece?.square} was left loose`;
    case 'motif': {
      const m = motifOfTag(ch.tag);
      return `${move} — their ${m ? MOTIF_WORD[m] : 'tactic'}`;
    }
    case 'mate-threat': return `${move} — their mate threat`;
  }
}

/** What the recap's Play it out says before the student moves: where it was,
 *  and the job — never the answer. */
export function playOutPrompt(m: { label: string; seat: 'defend' | 'exploit' }): string {
  return m.seat === 'exploit' ? `${m.label}. Your move — find it.` : `${m.label}. Your move — stop it.`;
}
