/**
 * Did the selected critical moment reach the student — here, elsewhere, or not
 * at all?
 *
 * WHY THIS IS A MODULE AND NOT FIVE LINES IN THE AUDIT. It was five lines in
 * the audit, and after three prod runs one of its three branches had still
 * never executed. `register=credit` came up every time, so CLAIMED-ELSEWHERE —
 * the branch the whole fix was written for — was unverified by rotation and
 * looked likely to stay that way. A branch that only a rare game can reach is
 * not testable by waiting; it is testable by being a pure function.
 *
 * ── THE JUDGEMENT ───────────────────────────────────────────────────────────
 * `handleWalkForward` suppresses the critical beat when the question plan
 * already stops at that ply: "that card owns the moment — speaking the critical
 * reveal first would hand it the answer." So silence in the critical register
 * is sometimes the CORRECT computed verdict, and a row that hard-fails on it is
 * asserting a contract the product deliberately does not hold — the same class
 * as the retired R2.
 *
 * But "another card owns it" may never be ASSUMED. An unconditional yield to a
 * sibling that never claims it is a real defect and the student gets nothing —
 * measured on a prod tape at ply 64: "the punishment Bd7+ is immediate —
 * another fundamental owns it", and no other fundamental fired. A row that
 * excused itself on the assumption would have blessed exactly that.
 *
 * So: three outcomes, never two, and the excuse is granted only on EVIDENCE
 * that some spoken line actually names the move.
 *
 * ── AND THE MOVE IS NAMED IN TWO REGISTERS ──────────────────────────────────
 * The coach SPEAKS moves and never spells SAN aloud (the TTS sanitiser expands
 * them), so a search for "was this move mentioned" has to look for the spoken
 * form too, or it will call a named move unnamed. Verified on a real tape: the
 * moment was selected at ply 68 with `played=Ke6` and the turning-point reveal
 * said "The game turned at move 34, king to e6".
 */

const PIECE_WORD = { N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

/**
 * "Ke6" -> "king to e6", "Qxa5" -> "queen takes a5", "exd5" -> "pawn takes d5".
 *
 * Tolerates the disambiguator and the capture `x`. A first cut returned null on
 * `Qxa5`, which would have gone blind on captures — exactly the moves a
 * critical moment tends to be about. Castling has no destination square and
 * returns null rather than a guess.
 */
export function sanToWords(san) {
  if (typeof san !== 'string') return null;
  const m = /^([NBRQK])?[a-h]?[1-8]?(x?)([a-h][1-8])/.exec(san.replace(/[+#]$/, ''));
  if (!m) return null;
  return `${PIECE_WORD[m[1] ?? ''] ?? 'pawn'} ${m[2] ? 'takes' : 'to'} ${m[3]}`;
}

/**
 * @param {object} args
 * @param {boolean} args.momentSelected  a critical moment was picked at all
 * @param {string[]} args.criticalLines  lines that speak it in the CRITICAL register
 * @param {string|null} args.playedSan   the move the moment was selected on
 * @param {string[]} args.spoken         every line spoken in the run
 * @returns {{pass: boolean, verdict: 'not-applicable'|'spoken-here'|'claimed-elsewhere'|'silent', detail: string}}
 */
export function judgeCriticalVoice({ momentSelected, criticalLines, playedSan, spoken }) {
  if (!momentSelected) {
    // 🔴 NOT A PASS (WO-STANDARD-01 I4). This used to return pass:true
    // "not-applicable", and the audit's three CRIT rows all went green on a
    // rotation where no moment was selected — a check that can pass on an
    // empty set is worse than no check. A row that asserts nothing about the
    // product says so in red: pin a game with a resolved moment.
    return {
      pass: false,
      verdict: 'no-moment',
      detail: 'no critical moment was selected on this game, so nothing here was verified — '
        + 'pin a game that resolves one (AUDIT_GAME_ID=<id>, or AUDIT_GAME=fixture) rather than reading this as green',
    };
  }
  if (criticalLines.length > 0) {
    return {
      pass: true,
      verdict: 'spoken-here',
      detail: `${criticalLines.length} line(s): "${criticalLines[0].slice(0, 160)}"`,
    };
  }
  const word = playedSan ? sanToWords(playedSan) : null;
  const claim = playedSan
    ? spoken.find((t) => t.includes(playedSan) || (word && t.toLowerCase().includes(word)))
    : undefined;
  if (claim) {
    return {
      pass: true,
      verdict: 'claimed-elsewhere',
      detail: `quiet here BY DESIGN — the question plan owns this ply and spoke it: "${claim.replace(/\s+/g, ' ').slice(0, 150)}"`,
    };
  }
  return {
    pass: false,
    verdict: 'silent',
    detail: `a moment was selected (played=${playedSan ?? '?'}) and NOTHING said it aloud — `
      + 'not in this register and not in any other. That is a yield to a card that never claimed it',
  };
}
