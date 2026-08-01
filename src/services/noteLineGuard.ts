// A note may only narrate the line that is actually on the board.
//
// Found by the prod probe (2026-07-30): a corpus note anchored at ["d4"] opens
// with "After d4 d5 c4 e6 Nc3 Nf6, Black plays the Marshall Defense…". Anchored
// one ply deep, it spliced onto EVERY 1.d4 walkthrough — so a Dutch Stonewall
// lesson narrated Queen's Gambit Marshall Defense theory over its first move.
//
// The board-claim validator cannot catch this: every piece-on-square claim in
// the note is true *of the position it describes*, and the note makes no false
// claim about the squares in front of the student — it simply describes a
// DIFFERENT LINE. The lie is in the move order, so the move order is what has
// to be checked. 48 notes across the two shipped corpora recite a line deeper
// than the ply they are anchored at.
//
// The rule is deliberately narrow, because prose also recites hypothetical
// continuations that are not claims about the game so far: a note is rejected
// only when it recites an opening sequence that diverges from what was actually
// played.
//
// 2026-08-01 — the FIRST-MOVE hole. The original rule waved through any
// recitation beginning on a different first move than the game, on the theory
// that it must be a hypothetical. That left an absurd asymmetry: a note
// reciting a SIBLING line was rejected while one reciting an ENTIRELY DIFFERENT
// opening was trusted. Measured on the shipped corpora, a Ruy Lopez at ply 6
// pulled a Grünfeld note and a King's Indian at ply 6 pulled a King's Gambit
// note — both spoken, and (once arrows became note-grounded) both drawing
// another opening's moves on the student's board.
//
// The right discriminator is not WHICH move the recitation opens on but WHERE
// it starts from. A hypothetical continues from where the student IS, so it
// only makes sense on the live board; an opening recitation replays from move
// one. So: replay the recited moves from the STARTING POSITION. If they are
// legal from there it is an opening recitation and gets judged against what was
// actually played; if they are not, it is a continuation and is left alone.
// "After Nf3 Ng5 Bxf7" is illegal from the start (Black has no ...Ng5 on move
// one), so it stays a hypothetical — which is exactly right.

import { Chess } from 'chess.js';

const SAN_TOKEN = /^(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?|[a-h](?:x[a-h])?[1-8](?:=[NBRQ])?|O-O(?:-O)?)[+#]?$/;

/** Does this recitation make sense as an OPENING — i.e. does it replay legally
 *  from the standard start? A hypothetical continuation ("After Nf3 Ng5 Bxf7…")
 *  only makes sense on the live board and fails here, which is how the two are
 *  told apart without guessing from the prose. */
function replaysFromStart(sans: string[]): boolean {
  const chess = new Chess();
  for (const san of sans) {
    try {
      if (!chess.move(san)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** The first opening sequence a note recites, e.g. "After d4 d5 c4 e6 Nc3 Nf6,"
 *  → ['d4','d5','c4','e6','Nc3','Nf6']. Empty when the note recites nothing. */
export function recitedLine(text: string): string[] {
  const m = /\bAfter\s+((?:[A-Za-z0-9x+#=-]+(?:\s+|,))+)/i.exec(text);
  if (!m) return [];
  const tokens: string[] = [];
  for (const raw of m[1].split(/[\s,]+/)) {
    const tok = raw.replace(/^\d+\.+/, '').trim();
    if (!tok) continue;
    if (!SAN_TOKEN.test(tok)) break;
    tokens.push(tok);
  }
  return tokens.length >= 3 ? tokens : [];
}

/** True when the note describes a line the game did not play, so narrating it
 *  here would teach a different opening than the one on the board. */
export function noteContradictsLine(text: string, historySans: string[]): boolean {
  const recited = recitedLine(text);
  if (recited.length === 0) return false;
  if (historySans.length === 0) return false;
  // A recitation that does not replay from the starting position is a
  // continuation of the live board, not a claim about the moves played.
  if (!replaysFromStart(recited)) return false;
  // It IS an opening recitation. Judge it against what was actually played —
  // including when it opens on a different first move, which means it is
  // teaching a different opening entirely.
  const compared = Math.min(recited.length, historySans.length);
  for (let i = 0; i < compared; i += 1) {
    if (recited[i] !== historySans[i]) return true;
  }
  // The recitation runs deeper than the game has gone: it is describing a
  // position the student has not reached, so it is not teaching for this ply.
  return recited.length > historySans.length;
}

/** Is the board actually an endgame? Queens gone, or the position thinned out
 *  enough that endgame technique is what applies. */
function looksLikeEndgame(fen: string): boolean {
  const placement = fen.split(' ')[0] ?? '';
  const pieces = placement.replace(/[^a-zA-Z]/g, '');
  const queens = (placement.match(/[qQ]/g) ?? []).length;
  return queens === 0 || pieces.length <= 14;
}

/** True when a note's phase does not match the board it would be spoken on.
 *
 *  Anchoring places a note at a position its own prose verifies against, but a
 *  speedrun video walks one game from opening to endgame, so an endgame lesson
 *  can land on an opening-depth line: 43 notes across the two shipped corpora
 *  are phase `endgame` yet anchored within 12 plies. Spoken there, the coach
 *  tells a student five moves into the opening to trade queens and push the
 *  connected passers. Middlegame notes at opening depth are NOT filtered — a
 *  plan taught from the tabiya is exactly what the transition ritual wants. */
export function notePhaseMismatchesBoard(
  phase: string,
  fen: string | undefined,
  historyPlies: number,
): boolean {
  if (phase !== 'endgame') return false;
  if (fen) return !looksLikeEndgame(fen);
  return historyPlies < 20;
}
