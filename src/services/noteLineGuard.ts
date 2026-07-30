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
// only when it recites an opening sequence that STARTS on the same first move
// the game did, and then diverges from what was actually played. A recitation
// beginning on some other move is treated as a hypothetical and left alone.

const SAN_TOKEN = /^(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?|[a-h](?:x[a-h])?[1-8](?:=[NBRQ])?|O-O(?:-O)?)[+#]?$/;

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
  // Only judge recitations that start where the game started; anything else is
  // a hypothetical continuation, not a claim about the moves played.
  if (historySans.length === 0 || recited[0] !== historySans[0]) return false;
  const compared = Math.min(recited.length, historySans.length);
  for (let i = 0; i < compared; i += 1) {
    if (recited[i] !== historySans[i]) return true;
  }
  // The recitation runs deeper than the game has gone: it is describing a
  // position the student has not reached, so it is not teaching for this ply.
  return recited.length > historySans.length;
}
